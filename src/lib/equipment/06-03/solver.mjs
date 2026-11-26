// Detached immutable abstract paper diagram. No equipment state, cells, optics, samples or printing.
export const points=Object.freeze({'P-01':Object.freeze([3,4]),'P-02':Object.freeze([-6,8]),'P-03':Object.freeze([0,-9])});
export const initial=()=>({point:'P-01',result:null,error:'',revision:0});
export function read(p,rev=0){
 if(!Object.hasOwn(points,p))throw Error('Choose a labeled drawing point.');
 const [x,y]=points[p];
 return {schema:'bts.abstract-point-readout.v1',deviceId:'06-03',kind:'inert diagram readout',sourceId:'origin-diagram-01',sourceRevision:0,readRevision:rev+1,pointId:p,x,y,distance:Math.hypot(x,y),units:'abstract diagram units',origin:[0,0],instrumentStateModeled:false};
}
export function act(s,id,p){
 if(id==='reset')return initial();
 if(id==='select')return act({...s,point:p},'view');
 if(id==='view'){try{const r=read(s.point,s.revision);return {...s,result:r,error:'',revision:r.readRevision};}catch(e){return {...s,result:null,error:e.message}}}
 throw Error('Unknown abstract diagram action.');
}
