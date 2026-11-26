// Detached immutable geometry diagram only. No input data, population membership or operating state.
export const vertices=Object.freeze({A:Object.freeze([-3,4]),B:Object.freeze([5,4]),C:Object.freeze([5,-2])});
export const sides=Object.freeze({AB:Object.freeze(['A','B']),BC:Object.freeze(['B','C']),CA:Object.freeze(['C','A'])});
export const initial=()=>({side:'CA',result:null,error:'',revision:0});
export function read(side,rev=0){
 if(!Object.hasOwn(sides,side))throw Error('Choose a listed side of the abstract triangle.');
 const [a,b]=sides[side],start=vertices[a],end=vertices[b],dx=end[0]-start[0],dy=end[1]-start[1];
 return {schema:'bts.abstract-segment-length.v1',deviceId:'07-10',sourceId:'inert-triangle-01',sourceRevision:0,readRevision:rev+1,kind:'detached immutable diagram',side,from:{id:a,x:start[0],y:start[1]},to:{id:b,x:end[0],y:end[1]},dx,dy,length:Math.hypot(dx,dy),units:'abstract drawing units',deviceStateModeled:false};
}
export function act(s,id,p){
 if(id==='reset')return initial();
 if(id==='select')return act({...s,side:p},'view');
 if(id==='view'){try{const r=read(s.side,s.revision);return {...s,result:r,error:'',revision:r.readRevision};}catch(e){return {...s,result:null,error:e.message}}}
 throw Error('Unknown detached triangle action');
}
