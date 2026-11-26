export const card=Object.freeze({id:'GENERIC-INTENSITY-CARD-01',revision:1,axisCeilingAu:50,cards:Object.freeze({A:Object.freeze([10,20,30,40]),B:Object.freeze([18,70,50,55]),U:null})});
export const station=()=>({tag:'A'});
export function act(s,k,v){if(k==='reset')return station();if(k!=='read'||!Object.hasOwn(card.cards,v))throw RangeError('Choose a fixed published graphic A, B, or U.');return{tag:v}}
export function read(s){
 const tag=act(s,'read',s.tag).tag,raw=card.cards[tag],present=raw!==null;
 return {schema:'bts.abstract-intensity-card.v1',artifactId:card.id,revision:card.revision,source:'Original fixed abstract chart. No physical sample, instrument signal or measured data.',axis:'Four dimensionless categories (not time), intensity in arbitrary units',tag,present,axisCeilingAu:card.axisCeilingAu,authoredAu:present?[...raw]:null,meanAuthoredAu:present?raw.reduce((a,b)=>a+b,0)/raw.length:null,displayAu:present?raw.map(v=>Math.min(v,card.axisCeilingAu)):null,aboveDisplayCount:present?raw.filter(v=>v>card.axisCeilingAu).length:null};
}
