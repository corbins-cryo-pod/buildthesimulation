// Ideal quadrature coherence-envelope scanner. No Vision64 or hardware calibration claim.
export const schema='bts.optical-heightmap.v1',nx=64,ny=48;
export const optics={5:{fieldUm:[1280,960],coherenceSigmaUm:1},20:{fieldUm:[320,240],coherenceSigmaUm:.8}};
const spacing=.1,visibilityMin=.12;
export const initial=()=>({loaded:true,stage:'scan',result:null,error:'',revision:0,config:{sampleId:'step-standard-01',objective:5,type:'step',sx:.001,sy:-.0005,stepUm:5,roughUm:0,mask:true,contrast:.8,focusUm:0,halfSpanUm:15,noise:false}});
const inside=(v,lo,hi)=>Number.isFinite(v)&&v>=lo&&v<=hi,need=(ok,t)=>{if(!ok)throw Error(t)};
export function valid(c){
 need(c&&optics[c.objective]&&['flat','step','texture'].includes(c.type),'Select a known objective and a supported coupon.');
 need(typeof c.sampleId==='string'&&c.sampleId.trim().length&&c.sampleId.length<=96,'Enter a specimen ID (up to 96 characters).');
 need(inside(c.sx,-.06,.06)&&inside(c.sy,-.06,.06),'Coupon slope must be ±0.06 µm/µm per axis.');
 need(inside(c.stepUm,0,25)&&inside(c.roughUm,0,2),'Use a step height of 0–25 µm and roughness amplitude of 0–2 µm.');
 need(inside(c.focusUm,-40,40)&&inside(c.halfSpanUm,1,40),'Focus center −40 to +40 µm; half-span 1–40 µm.');
 need(inside(c.contrast,0,1)&&typeof c.mask==='boolean'&&typeof c.noise==='boolean','Visibility must be 0–1 and mask/noise selections valid.');
 return c;
}
export function carrier(delta,sigma,visibility,wavelength=.55){return visibility*Math.exp(-.5*(delta/sigma)**2)*Math.cos(4*Math.PI*delta/wavelength);}
export function envelopePeak(height,sigma,contrast,z0,zMax,noiseValue=()=>0){
 if(height<z0+spacing||height>zMax-spacing)return {reason:'outside-scan',heightUm:null};
 if(contrast<visibilityMin)return {reason:'low-contrast',heightUm:null};
 const k=Math.round((height-z0)/spacing);
 // Local exact quadrature amplitude channel: far samples are smaller in the noiseless model.
 const amplitude=i=>Math.max(1e-30,contrast*Math.exp(-.5*((z0+i*spacing-height)/sigma)**2)+noiseValue());
 const values=new Map();for(let i=k-4;i<=k+4;i++)if(z0+i*spacing>=z0-1e-10&&z0+i*spacing<=zMax+1e-10)values.set(i,amplitude(i));
 let p=k;for(const [i,a] of values)if(a>values.get(p))p=i;
 if(!values.has(p-1)||!values.has(p+1))return {reason:'outside-scan',heightUm:null};
 const a=values.get(p-1),b=values.get(p),c=values.get(p+1);
 if(b<visibilityMin)return {reason:'low-contrast',heightUm:null};
 const v0=Math.log(a),v1=Math.log(b),v2=Math.log(c),den=v0-2*v1+v2,offset=den<0?Math.min(.5,Math.max(-.5,.5*(v0-v2)/den)):0;
 return {reason:null,heightUm:z0+(p+offset)*spacing};
}
function moments(rows){return rows.reduce((a,p)=>[a[0]+p.x,a[1]+p.y,a[2]+p.z],[0,0,0]).map(q=>q/rows.length);}
export function characterize(points,kind){
 const data=points.filter(p=>p.z!==null&&!(kind==='step'&&(p.i===31||p.i===32)));
 const groups=kind==='step'?[data.filter(p=>p.i<32),data.filter(p=>p.i>=32)]:[data];
 const usable=groups.filter(rows=>rows.length>=3).map(rows=>({rows,m:moments(rows)}));if(!usable.length)return null;
 let xx=0,yy=0,xy=0,xz=0,yz=0;
 for(const {rows,m:[mx,my,mz]} of usable)for(const p of rows){const x=p.x-mx,y=p.y-my,z=p.z-mz;xx+=x*x;yy+=y*y;xy+=x*y;xz+=x*z;yz+=y*z;}
 const d=xx*yy-xy*xy;if(!(d>1e-14))return null;
 const sx=(xz*yy-yz*xy)/d,sy=(yz*xx-xz*xy)/d,offsets=usable.map(({m:[mx,my,mz]})=>mz-sx*mx-sy*my);
 let l1=0,l2=0,n=0;for(let i=0;i<usable.length;i++)for(const p of usable[i].rows){const z=p.z-sx*p.x-sy*p.y-offsets[i];l1+=Math.abs(z);l2+=z*z;n++}
 const angle=x=>Math.atan(x)*180/Math.PI;
 return {sx,sy,tiltXDeg:angle(sx),tiltYDeg:angle(sy),SaUm:l1/n,SqUm:Math.sqrt(l2/n),fitCount:n,stepUm:kind==='step'&&offsets.length===2?offsets[1]-offsets[0]:null};
}
export function solve(c,revision=0){
 valid(c);need(Number.isSafeInteger(revision)&&revision>=0,'Invalid revision.');
 const o=optics[c.objective],dx=o.fieldUm[0]/nx,dy=o.fieldUm[1]/ny,z0=c.focusUm-c.halfSpanUm,z1=c.focusUm+c.halfSpanUm,points=[];
 let seed=520;const noise=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return c.noise?(seed/4294967296-.5)*.001:0;};
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
  const x=(i+.5-nx/2)*dx,y=(j+.5-ny/2)*dy;
  const h=c.sx*x+c.sy*y+(c.type==='step'&&i>=nx/2?c.stepUm:0)+(c.type==='texture'?c.roughUm*Math.cos(2*Math.PI*(i+.5)*8/nx):0);
  const r=c.mask&&i>=26&&i<=34&&j>=19&&j<=25?{heightUm:null,reason:'prescribed-dropout'}:envelopePeak(h,o.coherenceSigmaUm,c.contrast,z0,z1,noise);
  points.push({i,j,x,y,z:r.heightUm,reason:r.reason});
 }
 const metrics=characterize(points,c.type),invalidCount=points.filter(p=>p.z===null).length,rangeCount=points.filter(p=>p.reason==='outside-scan').length;
 return {schema,deviceId:'05-02',model:'Bruker ContourGT-K / 5× and 20×',kind:'simulated',sampleId:c.sampleId,inputRevision:revision,revision:revision+1,units:{x:'µm',y:'µm',z:'µm',tilt:'degrees',slope:'µm/µm'},grid:{nx,ny,dxUm:dx,dyUm:dy,originUm:[points[0].x,points[0].y],frame:'Object plane, row-major x right, y away, z toward objective; coordinates at pixel centers'},configuration:{...c},scan:{zStartUm:z0,zStopUm:z1,zSpacingUm:spacing,coherenceSigmaUm:o.coherenceSigmaUm,visibilityMin},invalidCount,rangeCount,mask:points.map(p=>p.z===null),heightsUm:points.map(p=>p.z),flags:points.map(p=>p.reason),metrics,provenance:{solver:'ideal quadrature coherence envelope v1',history:[{deviceId:'05-02',operation:'optical height map',parentRevision:revision,resultRevision:revision+1}],physicalData:false}};
}
export function act(s,id,payload){
 const idle={...s,result:null,error:''};
 if(id==='reset')return initial();
 if(id==='flatDemo')return act(initial(),'set',{type:'flat',sampleId:'tilt-flat-01'});
 if(id==='roughDemo')return act(initial(),'set',{type:'texture',sampleId:'roughness-reference-01',sx:0,sy:0,roughUm:.2,mask:false});
 if(id==='stage')return {...idle,stage:s.stage==='scan'?'load':'scan'};
 if(id==='load')return s.stage==='load'?{...idle,loaded:!s.loaded}:{...s,error:'Move stage to load position first.'};
 if(id==='objective')return {...idle,config:{...s.config,objective:s.config.objective===5?20:5}};
 if(id==='set')return {...idle,revision:payload.sampleId!==undefined&&payload.sampleId!==s.config.sampleId?0:s.revision,config:{...s.config,...payload}};
 if(id==='run'){
  try{need(s.loaded,'No scan: load a coupon.');need(s.stage==='scan','Move stage under the objective before scanning.');const result=solve(s.config,s.revision);return {...s,result,revision:result.revision,error:''};}catch(e){return {...idle,error:e.message};}
 }throw Error('Unknown profiler action');
}
export function csv(r){
 const esc=s=>'"'+String(s).replace(/"/g,'""')+'"';const f=r.grid,lines=['sampleId,revision,kind,i,j,x_um,y_um,height_um,invalid,reason'];
 for(let j=0;j<f.ny;j++)for(let i=0;i<f.nx;i++){const k=j*f.nx+i;lines.push([esc(r.sampleId),r.revision,r.kind,i,j,f.originUm[0]+i*f.dxUm,f.originUm[1]+j*f.dyUm,r.heightsUm[k]??'',r.mask[k],r.flags[k]??''].join(','));}
 return lines.join('\n')+'\n';
}
