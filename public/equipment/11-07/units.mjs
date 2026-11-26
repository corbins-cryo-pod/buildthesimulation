export const ticksPm=Object.freeze({A:1250000,B:750,U:null});
export const station=()=>({tag:'A',unit:'nm'});
export function act(s,k,v){
 if(k==='reset')return station();
 if(k==='unit')return{...s,unit:s.unit==='nm'?'µm':'nm'};
 if(k!=='read'||!Object.hasOwn(ticksPm,v))throw RangeError('Choose existing printed length tag A, B or U.');
 return{...s,tag:v};
}
export function read(s){
 if(!Object.hasOwn(ticksPm,s.tag)||!['nm','µm'].includes(s.unit))throw RangeError('Choose an existing card and display unit.');
 const pm=ticksPm[s.tag],nm=pm===null?null:pm/1000,um=pm===null?null:pm/1000000;
 return{schema:'bts.abstract-length-units-card.v1',artifactId:'BTS-ABSTRACT-LENGTH-01',revision:1,source:'Synthetic printed lengths. Not sourced from an instrument, optical model or measured signal.',tag:s.tag,canonicalPicometers:pm,nanometers:nm,micrometers:um,displayUnit:s.unit,displayValue:s.unit==='nm'?nm:um};
}
