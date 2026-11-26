// Independent static coordinate marks. No clocks, voltages, events or device inputs.
const points=Object.freeze({diagonal:Object.freeze([4,3]),left:Object.freeze([-3,0]),origin:Object.freeze([0,0])});
const ids=Object.freeze(Object.keys(points));
export const picks=Object.freeze({Offline_locator_marker:{action:'next',label:'Switch the detached coordinate readout'}});
export const initial=()=>({id:'diagonal',revision:0});
export function reduce(s,a,v){
 if(a==='next')v=ids[(ids.indexOf(s.id)+1)%ids.length];else if(a!=='mark')throw Error('Unknown offline readout action.');
 if(!Object.hasOwn(points,v))throw Error('Unknown fixed readout marker.');
 return v===s.id?s:{id:v,revision:s.revision+1};
}
export function report(s){
 if(!Object.hasOwn(points,s.id))throw Error('Unknown fixed readout marker.');
 const [column,row]=points[s.id];
 return {schema:'bts.11-03.offline-coordinate.v1',source:'physically separate authored diagram',revision:s.revision,id:s.id,column,row,straightDistance:Math.hypot(column,row),axisDistance:Math.abs(column)+Math.abs(row),units:'fictional grid units',deviceConnection:false};
}
