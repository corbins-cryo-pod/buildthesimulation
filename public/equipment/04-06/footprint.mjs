// Detached desk puzzle. Dimensions do not describe or relate to the cabinet or its working area.
const opening=Object.freeze([160,110]),footprint=Object.freeze([105,145]);
export const picks=Object.freeze({Footprint_gold_token:{action:'turn',label:'Turn detached teaching tile by a quarter turn'}});
export const initial=()=>({orientationDeg:0,revision:0});
export function reduce(s,action){
 if(action==='reset')return {...initial(),revision:s.revision+1};
 if(action==='turn')return {orientationDeg:s.orientationDeg===0?90:0,revision:s.revision+1};
 throw Error('Unknown offline diagram action.');
}
export function report(s){
 if(s.orientationDeg!==0&&s.orientationDeg!==90)throw Error('Unknown fixed diagram orientation.');
 const dims=s.orientationDeg===0?[...footprint]:[...footprint].reverse(), margin=opening.map((v,i)=>v-dims[i]);
 return {schema:'bts.04-06.offline-footprint.v1',source:'independent inert training diagram',deviceConnection:false,revision:s.revision,orientationDeg:s.orientationDeg,units:'mm',openingMm:[...opening],projectedTileMm:dims,totalClearanceMm:margin,fits:margin.every(v=>v>=0)};
}
