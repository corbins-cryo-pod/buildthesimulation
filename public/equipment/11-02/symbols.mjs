export const legend=Object.freeze(['circle','square','triangle']);
export const cards=Object.freeze({A:Object.freeze(['square','triangle','circle']),B:Object.freeze(['circle','triangle','triangle']),U:null});
export const station=()=>({id:'A'});
export function act(s,key,value){if(key==='reset')return station();if(key!=='read'||!Object.hasOwn(cards,value))throw RangeError('Choose a fixed symbol card A, B or U.');return{id:value}}
export function read(s){
 const id=act(s,'read',s.id).id,card=cards[id],present=card!==null;
 const missing=present?legend.filter(x=>!card.includes(x)):null,duplicates=present?legend.filter(x=>card.filter(k=>k===x).length>1):null;
 return{schema:'bts.abstract-symbol-review.v1',artifactId:'BTS-GENERIC-SYMBOL-CARD-01',revision:1,source:'Original printed-style shape legend, not device telemetry or a physical signal.',id,legend:[...legend],shapes:present?[...card]:null,missing,duplicates,matches:present?missing.length===0&&duplicates.length===0:null};
}
