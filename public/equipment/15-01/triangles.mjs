const fixedValues={right:Object.freeze([6,8,10]),wide:Object.freeze([6,8,12]),flat:Object.freeze([6,8,14]),impossible:Object.freeze([6,8,15])};
export const card=Object.freeze({id:'BTS-PLAIN-TRIANGLES-01',revision:'1',lengths:Object.freeze(fixedValues)});
const ids=Object.keys(card.lengths);
export const targets=Object.freeze({Cycle_triangle_artwork:'cycle',Toggle_triangle_side_labels:'labels'});
export function compare(id){
 if(!Object.hasOwn(card.lengths,id))throw new RangeError('Choose a listed triangle illustration.');
 const [a,b,c]=card.lengths[id],deficit=a+b-c,totalSideLength=a+b+c,s=totalSideLength/2;
 const kind=deficit<0?'impossible':deficit===0?'flat':'closed';
 return {id,sides:[a,b,c],kind,totalSideLength,gapLength:Math.max(0,-deficit),area:kind==='impossible'?null:Math.sqrt(Math.max(0,s*(s-a)*(s-b)*(s-c)))};
}
export function createStation(){
 let id='right',labels=true,error=null;
 const read=()=>({...compare(id),labels,error});
 function dispatch(k,p){error=null;
  if(k==='cycle')id=ids[(ids.indexOf(id)+1)%ids.length];
  if(k==='labels')labels=!labels;
  if(k==='select'){if(ids.includes(p))id=p;else error='Choose a listed illustration.';}
  if(k==='reset'){id='right';labels=true;}return read();
 }
 return {read,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(targets[n]):read()};
}
export function exportIllustration(s){
 return {schema:'bts.kopf940.detached-triangles.v1',equipment:'15-01',card,units:{length:'illustration units',area:'illustration units squared'},provenance:'unrelated synthetic mathematics graphic; no coordinates, measurements or anatomical scene',illustration:Object.fromEntries(Object.entries(s).filter(([k])=>k!=='error'))};
}
