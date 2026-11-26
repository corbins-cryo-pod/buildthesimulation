export const camera=Object.freeze({sensorPixelUm:7.3,widthPx:400,heightPx:256,relay:1});
export const chart=Object.freeze({id:'BTS-SEALED-RETICLE-36P5',revision:1,pitchUm:36.5,kind:'synthetic etched square reference'});
export const targets=Object.freeze({Controller_magnification_dial:'toggle',Controller_capture_key:'measure',Sealed_reticle:'measure'});
export function scale(mag){
 if(![10,20].includes(mag))throw Error('Choose 10× or 20×.');
 const pixelUm=camera.sensorPixelUm/(camera.relay*mag);
 return {pixelUm,fovWidthUm:camera.widthPx*pixelUm,fovHeightUm:camera.heightPx*pixelUm};
}
export function image(s){
 const {widthPx:w,heightPx:h}=camera,{pixelUm:p}=scale(s.mag),n=new Uint8Array(w*h),q=chart.pitchUm;
 const a=Math.exp(-(s.defocusUm**2)/18),sigma=.72+.43*Math.abs(s.defocusUm);
 function e(v){const d=v-Math.round(v/q)*q;return Math.exp(-d*d/(2*sigma*sigma));}
 const X=Array.from({length:w},(_,x)=>e((x-w/2)*p)),Y=Array.from({length:h},(_,y)=>e((y-h/2)*p));
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)n[y*w+x]=Math.max(0,Math.round(222-176*a*Math.max(X[x],Y[y])));
 return n;
}
function locate(data){
 const w=camera.widthPx,r=117,a=data.slice(r*w,(r+1)*w);
 const min=Math.min(...a),max=Math.max(...a);
 if(max-min<60)throw Error('Low contrast. Bring the inert reticle into focus first.');
 const threshold=(min+max)/2, groups=[];let sum=0,count=0,start=-1;
 for(let i=0;i<=w;i++){
  if(i<w&&a[i]<threshold){if(start===-1)start=i;sum+=i;count++;}
  else if(count>0){
   if(start!==0&&i!==w)groups.push(sum/count);
   sum=0;count=0;start=-1;
  }
 }
 if(groups.length<2)throw Error('There are fewer than two complete dark lines in frame.');
 return {row:r,peakColumnsPx:groups,meanSpacingPx:(groups.at(-1)-groups[0])/(groups.length-1)};
}
export function measure(s){
 if(Math.abs(s.defocusUm)>2)throw Error('Outside the reticle teaching focus band (±2 µm).');
 const f=scale(s.mag),p=locate(image(s));
 return {...p,measuredPitchUm:p.meanSpacingPx*f.pixelUm,...f,objectiveMagnification:s.mag,focusOffsetUm:s.defocusUm};
}
export const pose=s=>({nosepieceRotationRad:s.mag===10?0:-2*Math.PI/3,nosepieceY:.252+s.defocusUm*1e-6});
export function save(s){
 if(!s.result)throw Error('Measure the reticle first.');
 return {schema:'buildthesimulation.inert-reticle-pitch.v1',instrument:'Nikon ECLIPSE Ti2-E',couponId:chart.id,couponRevision:chart.revision,measurementRevision:s.revision,
   provenance:'Synthetic reticle raster; nominal sensor sampling, no optical bench calibration.',axis:'image X column index increases right',camera:{...camera},result:{...s.result,peakColumnsPx:[...s.result.peakColumnsPx]}};
}
export function createStation(){
 const initial=()=>({mag:10,defocusUm:0,result:null,revision:0,error:null});let s=initial();
 function dispatch(k,p){
  if(k==='reset')return s=initial();
  if(k==='toggle')return s={...s,mag:s.mag===10?20:10,result:null,error:null};
  if(k==='objective'&&[10,20].includes(p))return s={...s,mag:p,result:null,error:null};
  if(k==='focus'&&Number.isInteger(p)&&p>=-10&&p<=10)return s={...s,defocusUm:p,result:null,error:null};
  if(k==='measure'){
   try{return s={...s,result:measure(s),revision:s.revision+1,error:null};}
   catch(e){return s={...s,result:null,error:e.message};}
  }
  return s={...s,error:'Choose a supported objective or focus offset.'};
 }
 return {read:()=>s,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(targets[n]):s};
}
