export const graphic=Object.freeze({id:'BTS-INERT-RULER-FRAME-01',revision:'1',columns:96,rows:80,rowPitchMm:.125,origin:'center of row 0',marks:Object.freeze({A:16,B:52})});
export const targets=Object.freeze({Cycle_marker_pair:'cycle',Reverse_ruler_endpoints:'reverse'});
const pairs=Object.freeze(['AB','AA']);
export function measureRows(first,second){
 if(![first,second].every(r=>Number.isInteger(r)&&r>=0&&r<graphic.rows))throw new RangeError('Fixed graphic rows range from 0 to 79.');
 const scale=graphic.rowPitchMm,deltaRows=second-first;
 return {firstRow:first,secondRow:second,firstPositionMm:first*scale,secondPositionMm:second*scale,deltaRows,signedMm:deltaRows*scale,separationMm:Math.abs(deltaRows)*scale};
}
export function createStation(){
 let pair='AB',reversed=false,error=null;
 const read=()=>{const [a,b]=reversed?[pair[1],pair[0]]:pair;return {pair,reversed,from:a,to:b,measurement:measureRows(graphic.marks[a],graphic.marks[b]),error};};
 function dispatch(k,p){
  error=null;
  if(k==='cycle')pair=pairs[(pairs.indexOf(pair)+1)%pairs.length];
  if(k==='reverse')reversed=!reversed;
  if(k==='pair'){if(pairs.includes(p))pair=p;else error='Choose a listed fixed pair.';}
  if(k==='reset'){pair='AB';reversed=false;}
  return read();
 }
 return {read,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(targets[n]):read()};
}
export function exportRuler(s){
 return {schema:'bts.vevo3100.detached-static-ruler.v1',equipment:'15-07',graphic,provenance:'authored static stripes, not acquired or simulated signal, imaging or hardware data',measurement:{from:s.from,to:s.to,...s.measurement},units:{length:'mm',index:'dimensionless row'}};
}
