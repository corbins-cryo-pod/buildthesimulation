export const calibration=Object.freeze({widthPx:81,heightPx:61,centerPx:Object.freeze([40,30]),pixelUm:5,focusStepUm:10,contrastSigmaUm:20,visibilityThreshold:.5});
export const coupon=Object.freeze({id:'BTS-ETCH-2PLANE-01',revision:1,targets:Object.freeze([
  Object.freeze({id:'ETCH-A',xUm:-40,yUm:15,zUm:0,kind:'plus'}),
  Object.freeze({id:'ETCH-B',xUm:45,yUm:-20,zUm:80,kind:'diamond'})
])});
export const targets=Object.freeze({Focus_dial:['cycle'],Etched_reference_coupon:['pick'],Stage_home_key:['home']});
export function projection(s){
 const c=calibration;
 return coupon.targets.map(p=>{
  const u=Math.round(c.centerPx[0]+(p.xUm-s.stageXUm)/c.pixelUm),v=Math.round(c.centerPx[1]+(p.yUm-s.stageYUm)/c.pixelUm);
  const visibility=Math.exp(-.5*((s.focusUm-p.zUm)/c.contrastSigmaUm)**2),inside=u>=0&&u<c.widthPx&&v>=0&&v<c.heightPx;
  return {id:p.id,kind:p.kind,u,v,visibility,inside,selectable:inside&&visibility>=c.visibilityThreshold};
 });
}
export const pose=s=>({objectiveY:.285+s.focusUm*1e-6,stageX:-s.stageXUm*1e-6,stageZ:.061-s.stageYUm*1e-6});
function reconstruct(s,p){
 const c=calibration;
 return {id:p.id,pixel:[p.u,p.v],xUm:s.stageXUm+(p.u-c.centerPx[0])*c.pixelUm,yUm:s.stageYUm+(p.v-c.centerPx[1])*c.pixelUm,zUm:s.focusUm,relativeContrast:p.visibility};
}
export function file(s){
 if(!s.capture)throw Error('Capture an in-focus marker first.');
 return {schema:'buildthesimulation.inert-focal-target.v1',couponId:coupon.id,couponRevision:coupon.revision,captureRevision:s.revision,
   source:'synthetic inert calibration coupon only',unit:'um',
   frame:'sample X right, Y toward operator, Z up. Raster column/row zero indexed.',
   calibration:{...calibration,centerPx:[...calibration.centerPx]},stage:{xUm:s.stageXUm,yUm:s.stageYUm,focusUm:s.focusUm},target:s.capture};
}
export function createStation(){
 const initial=()=>({focusUm:0,stageXUm:0,stageYUm:0,revision:0,capture:null,error:null});
 let s=initial();
 const ok=(v,l,h,step)=>Number.isFinite(v)&&v>=l&&v<=h&&v%step===0;
 function change(d){return s={...s,...d,capture:null,error:null};}
 function dispatch(k,p){
  if(k==='reset')return s=initial();
  if(k==='cycle')return change({focusUm:s.focusUm===0?80:0});
  if(k==='home')return change({stageXUm:0,stageYUm:0});
  if(k==='focus'&&ok(p,-20,100,10))return change({focusUm:p});
  if(k==='pan'&&ok(p?.x,-100,100,5)&&ok(p?.y,-100,100,5))return change({stageXUm:p.x,stageYUm:p.y});
  if(k==='pick'){
   let v=projection(s).filter(p=>p.selectable).sort((a,b)=>b.visibility-a.visibility);
   if(p!==undefined){
    if(!Number.isFinite(p?.u)||!Number.isFinite(p?.v))v=[];
    else v=v.filter(t=>Math.hypot(t.u-p.u,t.v-p.v)<=3);
   }
   if(!v.length)return s={...s,capture:null,error:'No in-focus marker at this position.'};
   return s={...s,revision:s.revision+1,capture:reconstruct(s,v[0]),error:null};
  }
  return s={...s,error:'Focus or XY offset is out of the teaching range.'};
 }
 return {read:()=>s,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(...targets[n]):s};
}
export function raster(s){
 const {widthPx:w,heightPx:h}=calibration, v=new Uint8Array(w*h);
 const markers=projection(s);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  let val=32+(17*x+31*y)%13;
  for(const m of markers){
   const dx=Math.abs(x-m.u),dy=Math.abs(y-m.v);
   const etched=m.kind==='plus'?(dx<=1&&dy<=5)||(dy<=1&&dx<=5):Math.abs(dx+dy-5)<=.5;
   if(etched)val+=Math.round(175*m.visibility);
  }
  v[y*w+x]=Math.min(255,val);
 }
 return v;
}
