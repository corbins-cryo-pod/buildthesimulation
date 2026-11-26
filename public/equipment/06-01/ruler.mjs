export const drawing=Object.freeze({id:'BTS-GT2-RULER-01',revision:'1',units:'µm',stepUm:5,widthUm:80,heightUm:60,marks:Object.freeze({A:Object.freeze([10,10]),B:Object.freeze([40,50]),C:Object.freeze([45,10])})});
export const targets=Object.freeze({Ruler_pair_button:'cycle',Ruler_reverse_button:'reverse'});
export const pairs=Object.freeze(['AB','AC','AA']);
export function measure(from,to){const m=drawing.marks;
 if(!Object.hasOwn(m,from)||!Object.hasOwn(m,to))throw new RangeError('Select a labeled illustration mark A, B, or C.');
 const deltaUm=m[to].map((v,i)=>v-m[from][i]);
 return {from,to,fromUm:[...m[from]],toUm:[...m[to]],deltaUm,distanceUm:Math.hypot(...deltaUm)};
}
export function createStation(){
 let pair='AB',rev=false,error=null;
 const read=()=>({pair,reversed:rev,measurement:measure(pair[rev?1:0],pair[rev?0:1]),error});
 function dispatch(k,value){error=null;switch(k){
  case 'cycle':pair=pairs[(pairs.indexOf(pair)+1)%pairs.length];break;
  case 'reverse':rev=!rev;break;
  case 'pair':if(pairs.includes(value)){pair=value;}else error='Choose a listed pair.';break;
  case 'reset':pair='AB';rev=false;break;
 }return read();}
 return {read,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(targets[n]):read()};
}
export function exportReading(s){return {schema:'bts.gt2.detached-ruler.v1',equipment:'06-01',drawing,provenance:'read-only synthetic coordinate geometry; no instrument output',measurement:s.measurement};}
