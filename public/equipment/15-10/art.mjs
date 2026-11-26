// Authored abstract diagram. Not acquired, calibrated or related to the equipment.
export const columns=Object.freeze([
 Object.freeze({id:'A',top:3,bottom:8}),Object.freeze({id:'B',top:3,bottom:8}),Object.freeze({id:'C',top:3,bottom:8}),
 Object.freeze({id:'D',top:3,bottom:null}),Object.freeze({id:'E',top:3,bottom:8}),Object.freeze({id:'F',top:3,bottom:8}),
]);
const idx=Object.freeze([0,3,5]);const unitPerStep=4;
export const picks=Object.freeze({Offline_column_tab:{action:'next',label:'Change the selected column of the detached art card'}});
export const initial=()=>({index:0,revision:0});
export function reduce(s,a,v){
 if(a==='next')v=idx[(idx.indexOf(s.index)+1)%idx.length];else if(a!=='column')throw Error('Unknown offline art action.');
 if(!idx.includes(v))throw Error('Unknown fixed art selection.');
 return v===s.index?s:{index:v,revision:s.revision+1};
}
export function report(s){
 if(!idx.includes(s.index))throw Error('Unknown fixed art selection.');
 const {id,top,bottom}=columns[s.index],steps=top===null||bottom===null?null:Math.abs(bottom-top);
 return {schema:'bts.15-10.offline-art-separation.v1',source:'authored straight-mark classroom diagram',revision:s.revision,column:id,status:steps===null?'missing-mark':'two-marks',rowSteps:steps,unitsPerStep:unitPerStep,separationGraphicUnits:steps===null?null:steps*unitPerStep,deviceConnection:false};
}
