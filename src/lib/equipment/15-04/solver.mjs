// Fixed, authored graphic points. No tracking, import, inference or biological data.
const fixed=(t,xy)=>Object.freeze({t,coordinateMm:xy?Object.freeze({x:xy[0],y:xy[1]}):null});
export const points=Object.freeze([fixed(0,[0,0]),fixed(.5,[3,4]),fixed(1,[6,0]),fixed(1.5,null),fixed(2,[13,8]),fixed(2.6,[13,14]),fixed(3.4,[9,17])]);
export const source=Object.freeze({id:'geometric-waypoints-01',revision:0,kind:'authored nonbiological illustration',units:{coordinate:'mm (diagram scale)',time:'s (authored time labels)'}});
export function read(i,revision=0){
 if(!Number.isInteger(i)||i<0||i>=points.length)throw Error('Choose a stored index from 0 to 6.');
 const p=points[i],q=points[i-1],has=p.coordinateMm&&q?.coordinateMm;
 const d=has?{x:p.coordinateMm.x-q.coordinateMm.x,y:p.coordinateMm.y-q.coordinateMm.y}:null;
 if(d)d.length=Math.hypot(d.x,d.y);
 return {schema:'bts.authored-waypoint-read.v1',deviceId:'15-04',sourceId:source.id,sourceRevision:source.revision,kind:source.kind,readRevision:revision+1,index:i,tS:p.t,
  coordinateMm:p.coordinateMm?{...p.coordinateMm}:null,deltaMm:d,elapsedS:has?p.t-q.t:null,
  status:p.coordinateMm?(has?'adjacent':'no-adjacent'):'missing',units:{...source.units},frame:'illustration plane; +X right, +Y up',
  gapPolicy:'Never interpolate or compute a segment across a missing point.',videoProcessed:false};
}
export const initial=()=>({index:1,revision:1,result:read(1),error:''});
export function act(s,id,value){
 const i=id==='select'?value:id==='reset'?1:id==='next'?Math.min(points.length-1,s.index+1):id==='previous'?Math.max(0,s.index-1):id==='view'?s.index:null;
 if(i===null)throw Error('Unknown display action.');
 if(i===s.index&&(id==='next'||id==='previous'))return s;
 try{const result=read(i,s.revision);return {...s,index:i,revision:result.readRevision,result,error:''};}catch(e){return {...s,error:e.message};}
}
