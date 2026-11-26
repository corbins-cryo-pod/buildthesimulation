// Reviewed from the individual scope and evidence fields, not the global "first pass" status.
// A movable cover or a separate exercise does not make the represented machine operational.
const groups={
 '03':[5,6,7,8,9,10,11,12],
 '04':[1,2,3,4,5,6,7,8,9,10,11,12],
 '06':[1,2,3,4,5,6,7,8,9,10,11,12],
 '07':[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
 '08':[7,8,10,12],
 '10':[6,8,15,16],
 '11':[1,2,3,4,5,7,8,9,10],
 '12':[11],
 '13':[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
 '14':[7,8,9,11,12],
 '15':[1,2,3,4,5,6,7,8,9,10,11,12,13,14],
 '16':[5,7,8,9,10,14]
};
const documentary=new Set(Object.entries(groups).flatMap(([zone,ns])=>ns.map(n=>zone+'-'+String(n).padStart(2,'0'))));
export function revisionKind(id){return documentary.has(id)?'documentary':'virtual';}
export const revisionKinds={
 documentary:{label:'Documentary model',description:'Inspect the documented or clearly identified custom exterior. There may be simple inspection movement or a separate teaching exhibit. The instrument itself is not operational.'},
 virtual:{label:'Bounded virtual exercise',description:'Run the specific virtual task described for this device. This does not reproduce the full instrument or validate real-world operation.'},
};
