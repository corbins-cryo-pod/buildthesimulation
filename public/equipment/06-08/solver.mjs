// Immutable, detached drawing comparison. No Flow EZ interfaces, parameters, specimens or state.
export const witness=Object.freeze({id:'inert-inner-outline',widthMm:72,depthMm:92});
export const frames=Object.freeze({
 roomy:Object.freeze({label:'Roomy outline',widthMm:84,depthMm:102}),
 narrow:Object.freeze({label:'Narrow outline',widthMm:68,depthMm:100}),
 tangent:Object.freeze({label:'Coincident outline',widthMm:72,depthMm:92})
});
export const initial=()=>({frame:'roomy',result:null,error:'',revision:0});
export function compare(frame,rev=0){
 if(!Object.hasOwn(frames,frame))throw Error('Choose one of the stored drawing frames.');
 const f=frames[frame],marginXMm=(f.widthMm-witness.widthMm)/2,marginZMm=(f.depthMm-witness.depthMm)/2;
 return {schema:'bts.inert-rectangle-comparison.v1',deviceId:'06-08',kind:'immutable synthetic drawing',sourceId:'detached-outline-01',sourceRevision:0,readRevision:rev+1,frameId:frame,witness,frame:f,marginXMm,marginZMm,contained:marginXMm>=0&&marginZMm>=0,coordinateFrame:'centered drawing, X horizontal and Z vertical, millimetres',relatedToPhysicalFit:false};
}
export function act(s,id,p){
 if(id==='reset')return initial();
 if(id==='select')return act({...s,frame:p},'view');
 if(id==='view'){try{const r=compare(s.frame,s.revision);return {...s,result:r,error:'',revision:r.readRevision};}catch(e){return {...s,result:null,error:e.message}}}
 throw Error('Unknown documentary drawing action.');
}
