// Detached fixed reference drawing; no machinery, samples, material changes or settings.
export const stations=Object.freeze({
 left:Object.freeze({label:'Left witness',xMm:10,lowerMm:8,upperMm:20}),
 center:Object.freeze({label:'Center witness',xMm:30,lowerMm:9,upperMm:24}),
 right:Object.freeze({label:'Right witness',xMm:50,lowerMm:10,upperMm:28})
});
export const initial=()=>({station:'center',result:null,error:'',revision:0});
export function read(id,rev=0){
 if(!Object.hasOwn(stations,id))throw Error('Choose a labeled drawing station.');
 const {xMm,lowerMm,upperMm}=stations[id];
 return {schema:'bts.readonly-drawing-spacing.v1',deviceId:'04-08',kind:'synthetic drawing coordinates',sourceId:'inert-line-drawing-01',sourceRevision:0,readRevision:rev+1,station:id,xMm,lowerMm,upperMm,spacingMm:upperMm-lowerMm,frame:'drawing X right and Y up, millimetres',physicalStateModelled:false};
}
export function act(s,id,p){
 if(id==='reset')return initial();
 if(id==='select')return act({...s,station:p},'view');
 if(id==='view'){try{const r=read(s.station,s.revision);return {...s,result:r,error:'',revision:r.readRevision};}catch(e){return {...s,result:null,error:e.message}}}
 throw Error('Unknown detached drawing action');
}
