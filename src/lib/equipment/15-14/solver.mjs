// Dry geometry only. Two detached, unconnected solids with fixed authored diagram positions.
const preset=(label,x,z)=>Object.freeze({label,x,z});
export const poses=Object.freeze({center:preset('Centered',0,0),touch:preset('One edge touched',34,22),overrun:preset('Two sides overrun',50,31)});
export const model=Object.freeze({widthMm:120,depthMm:80,radiusMm:18});
export const initial=()=>({pose:'center',revision:0,result:null,error:''});
export function read(id,version=0){
 if(!Object.hasOwn(poses,id))throw Error('Choose a stored dry gauge position.');
 const {x,z,label}=poses[id],{widthMm,depthMm,radiusMm}=model;
 const w=widthMm/2-radiusMm,d=depthMm/2-radiusMm,marginsMm={left:w+x,right:w-x,rear:d+z,front:d-z};
 const min=Math.min(...Object.values(marginsMm));
 return {schema:'bts.dry-circular-gauge.v1',deviceId:'15-14',kind:'original passive gauge drawing',sourceId:'detached-circle-gauge-01',sourceRevision:0,readRevision:version+1,
  poseId:id,label,frame:'+X right, +Z operator-facing; origin at the center of the rectangular opening',units:{length:'mm'},geometry:{...model},centerMm:{x,z},
  marginsMm,minimumClearanceMm:min,status:min<0?'outside':min===0?'touching':'clear',deviceStateModeled:false};
}
export function act(s,id,p){
 if(id==='reset')return initial();
 if(id==='select')return act({...s,pose:p},'view');
 if(id==='view'){try{const r=read(s.pose,s.revision);return {...s,result:r,revision:r.readRevision,error:''};}catch(e){return {...s,result:null,error:e.message};}}
 throw Error('Unknown detached gauge action.');
}
