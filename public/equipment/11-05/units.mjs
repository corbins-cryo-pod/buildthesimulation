export const fixed=Object.freeze({id:'BTS-NUMERICAL-POWER-REFERENCE-01',revision:'1',valuesW:Object.freeze({reference:.001,tenth:.0001,quarter:.00025,zero:0})});
export const units=Object.freeze(['µW','mW','W','dBm']);
export const targets=Object.freeze({Cycle_fixed_value:'cycleValue',Cycle_display_units:'cycleUnit'});
const valueIds=Object.keys(fixed.valuesW);
export function convert(w,unit){
 if(!Number.isFinite(w)||w<0||!units.includes(unit))throw new RangeError('Use nonnegative finite power and one of the listed units.');
 let value;
 if(unit==='dBm')value=w===0?null:10*(Math.log10(w)+3);
 else value=w*(unit==='µW'?1e6:unit==='mW'?1e3:1);
 if(value!==null&&!Number.isFinite(value))throw new RangeError('The chosen unit overflows JavaScript numeric range.');
 return {value,unit,inputW:w,logReferenceW:unit==='dBm'?.001:null,finite:value!==null,reason:value===null?'Zero has no finite dBm value.':null};
}
export function createStation(){
 let id='tenth',unit='µW',error=null;
 const read=()=>({id,unit,reading:convert(fixed.valuesW[id],unit),error});
 function dispatch(k,p){
  error=null;
  if(k==='cycleValue')id=valueIds[(valueIds.indexOf(id)+1)%valueIds.length];
  if(k==='cycleUnit')unit=units[(units.indexOf(unit)+1)%units.length];
  if(k==='value'){if(valueIds.includes(p))id=p;else error='Choose an entry from the fixed reference set.';}
  if(k==='unit'){if(units.includes(p))unit=p;else error='Choose a listed display unit.';}
  if(k==='reset'){id='tenth';unit='µW';}
  return read();
 }
 return {read,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(targets[n]):read()};
}
export function exportReading(s){
 return {schema:'bts.pm100d.detached-numeric-units.v1',equipment:'11-05',fixed,source:'authored arithmetic examples, no power or detector measurements',selectedId:s.id,reading:s.reading};
}
