export const card=Object.freeze({sampleId:'GENERIC-DIMENSION-CARD-01',revision:1,openingMm:Object.freeze([28,17]),sectionsMm:Object.freeze({A:Object.freeze([24,15]),B:Object.freeze([28,17]),C:Object.freeze([29,16])})});
export const station=()=>({tag:'A'});
export function act(s,action,v){if(action==='reset')return station();if(action!=='read'||!Object.hasOwn(card.sectionsMm,v))throw RangeError('Read an existing printed section A, B or C.');return{tag:v}}
export function compare(s){
 const tag=act(station(),'read',s.tag).tag,sectionMm=[...card.sectionsMm[tag]],clearancePerSideMm=card.openingMm.map((x,k)=>(x-sectionMm[k])/2),min=Math.min(...clearancePerSideMm);
 return{schema:'bts.synthetic-envelope-comparison.v1',sampleId:card.sampleId,revision:card.revision,origin:'Original immutable printed 2D dimension card. Not associated with hardware, processes or physical measurements.',axes:'Card XY; +X right, +Y up, millimeters',tag,sectionMm,openingMm:[...card.openingMm],clearancePerSideMm,status:min<0?'interference':min===0?'boundary':'clear'};
}
