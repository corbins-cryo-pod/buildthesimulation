// Synthetic passive overlap fixture only: no laser controls, bonding, or process recipe.
const good=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
const fail=(code,message)=>({ok:false,code,message});
const pair=(a,min,max)=>Array.isArray(a)&&a.length===2&&a.every(v=>good(v,min,max));
const id=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(s);
export function fixture(){return {schema:'bts.fl300-fixture.v1',sampleId:'FL300-OPTICAL-WITNESS',revision:1,emitterAxisUm:[0,0],receiverAxisUm:[0,0],modeRadiusUm:5,peakFraction:.8,pads:[{emitterId:'DIE_PAD_A',receiverId:'SUB_PAD_A',emitterUm:[0,0],receiverUm:[0,0],sizeUm:[20,20]}],provenance:'Synthetic inert alignment coupon'};}
export function validate(r){
 if(!r||r.schema!=='bts.fl300-fixture.v1'||!id(r.sampleId)||!Number.isInteger(r.revision)||r.revision<0||!pair(r.emitterAxisUm,-10,10)||!pair(r.receiverAxisUm,-10,10)||!good(r.modeRadiusUm,1,25)||!good(r.peakFraction,.01,1)||!Array.isArray(r.pads)||r.pads.length>16||r.pads.some(p=>!p||!id(p.emitterId)||!id(p.receiverId)||!pair(p.emitterUm,-100,100)||!pair(p.receiverUm,-100,100)||!pair(p.sizeUm,1,100))||new Set(r.pads.map(p=>p.emitterId)).size!==r.pads.length||new Set(r.pads.map(p=>p.receiverId)).size!==r.pads.length)return fail('fixture','Use a consistent synthetic fixture with valid optical axes, bounded Gaussian mode and unique pad-pair IDs.');
 return {ok:true,value:{schema:r.schema,sampleId:r.sampleId,revision:r.revision,emitterAxisUm:r.emitterAxisUm.slice(),receiverAxisUm:r.receiverAxisUm.slice(),modeRadiusUm:r.modeRadiusUm,peakFraction:r.peakFraction,pads:r.pads.map(({emitterId,receiverId,emitterUm,receiverUm,sizeUm})=>({emitterId,receiverId,emitterUm,receiverUm,sizeUm})),provenance:'Synthetic passive alignment witness'}};
}
export const initial=()=>({power:true,closed:true,loaded:true,headDown:false,fixture:fixture(),dx:-5,dy:0,revision:0});
export function powerFraction(r,x,y){
 const dx=x+r.receiverAxisUm[0]-r.emitterAxisUm[0],dy=y+r.receiverAxisUm[1]-r.emitterAxisUm[1];
 return r.peakFraction*Math.exp(-(dx*dx+dy*dy)/r.modeRadiusUm**2);
}
export function overlaps(r,x,y){return r.pads.map(p=>{const dx=x+p.receiverUm[0]-p.emitterUm[0],dy=y+p.receiverUm[1]-p.emitterUm[1],a=Math.max(0,p.sizeUm[0]-Math.abs(dx))*Math.max(0,p.sizeUm[1]-Math.abs(dy)),fraction=a/(p.sizeUm[0]*p.sizeUm[1]);return {emitterId:p.emitterId,receiverId:p.receiverId,areaUm2:a,fraction,geometricCandidate:fraction>=.75,classification:'projected geometric overlap only; no bond or conductivity asserted'};});}
export function dispatch(s,a,v){
 if(a==='reset')return {ok:true,state:{...initial(),revision:s.revision}};
 if(a==='power')return {ok:true,state:{...s,power:!s.power,headDown:false}};
 if(a==='cover')return {ok:true,state:{...s,closed:!s.closed,headDown:false}};
 if(a==='head')return s.power&&s.closed&&s.loaded?{ok:true,state:{...s,headDown:!s.headDown}}:fail('guard','Close the guard and load a virtual die before moving the pick head.');
 if(a==='load'||a==='import'){
  if(s.closed)return fail('guard','Open the virtual guard before changing the witness.');
  if(a==='load')return {ok:true,state:{...s,loaded:!s.loaded}};
  const q=validate(v);return q.ok?{ok:true,state:{...s,loaded:true,fixture:q.value,dx:0,dy:0}}:q;
 }
 if(a==='settings')return {ok:true,state:{...s,...v}};
 if(a==='center')return {ok:true,state:{...s,dx:s.fixture.emitterAxisUm[0]-s.fixture.receiverAxisUm[0],dy:s.fixture.emitterAxisUm[1]-s.fixture.receiverAxisUm[1]}};
 if(a==='sweep')return sweep(s);
 return fail('control','Unknown virtual action.');
}
export function sweep(s){
 if(!s.power||!s.closed||!s.loaded||s.headDown)return fail('guard','Power on, install the witness, close the guard and park the pick head.');
 if(!good(s.dx,-25,25)||!good(s.dy,-25,25))return fail('range','The witness example supports relative stage positions from −25 to +25 µm.');
 const q=validate(s.fixture);if(!q.ok)return q;const f=q.value,xc=f.emitterAxisUm[0]-f.receiverAxisUm[0],yc=f.emitterAxisUm[1]-f.receiverAxisUm[1];
 const data=Array.from({length:41},(_,i)=>{const x=xc-20+i;return {stageXUm:x,stageYUm:s.dy,powerFraction:powerFraction(f,x,s.dy)};});
 const best=data.reduce((a,b)=>a.powerFraction>=b.powerFraction?a:b);
 const revision=s.revision+1;
 return {ok:true,state:{...s,revision},result:{schema:'bts.fl300-alignment.v1',classification:'synthetic analytic',sampleId:f.sampleId,sampleRevision:f.revision,runRevision:revision,frame:'stage X lateral positive right; Y transverse positive up; nominal optical propagation along +Z',model:'coaxial Gaussian power overlap plus planar rectangular intersection',pose:{stageXUm:s.dx,stageYUm:s.dy,opticalDeltaXUm:s.dx-xc,opticalDeltaYUm:s.dy-yc,powerFraction:powerFraction(f,s.dx,s.dy)},registeredStageCenterUm:[xc,yc],reference:f,peakAtCurrentY:best,pads:overlaps(f,s.dx,s.dy),data,units:{stageXUm:'µm',stageYUm:'µm',powerFraction:'1',areaUm2:'µm²'}}};
}
export function csv(o){return ['sampleId,sampleRevision,runRevision,stageX_um,stageY_um,power_fraction',...o.data.map(p=>[o.sampleId,o.sampleRevision,o.runRevision,p.stageXUm,p.stageYUm,p.powerFraction].join(','))].join('\n')+'\n';}
