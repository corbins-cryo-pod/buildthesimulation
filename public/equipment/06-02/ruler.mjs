export const card=Object.freeze({id:'BTS-GENERIC-SIGNED-RULER-01',revision:1,originTick:6,tickPitchMm:2,marks:Object.freeze({L:2,R:11})});
export const station=()=>({mark:'L'});
export function act(s,action,value){if(action==='reset')return station();if(action!=='read'||!Object.hasOwn(card.marks,value))throw RangeError('Choose the existing left or right printed mark.');return{mark:value}}
export function read(s){
 const mark=act(station(),'read',s.mark).mark,tick=card.marks[mark],coordinateMm=(tick-card.originTick)*card.tickPitchMm;
 return {schema:'bts.synthetic-ruler.v1',sampleId:card.id,revision:card.revision,source:'Generic immutable author-drawn ruler card, not connected to any instrument or process.',axes:'Ruler X only, millimeters, +X to the right',selected:mark,tick,originTick:card.originTick,tickPitchMm:card.tickPitchMm,coordinateMm,distanceFromOriginMm:Math.abs(coordinateMm),intermarkDistanceMm:Math.abs(card.marks.R-card.marks.L)*card.tickPitchMm};
}
