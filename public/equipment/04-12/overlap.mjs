// Disconnected unit-free square diagrams; no equipment, masks, or material.
const stops=Object.freeze([0,.5,1]);
export const picks=Object.freeze({Offline_gold_square:{action:'next',label:'Cycle the offset on the detached board'}});
export const initial=()=>({offset:0,revision:0});
export function reduce(s,a,v){
 if(a==='next')v=stops[(stops.indexOf(s.offset)+1)%stops.length];else if(a!=='offset')throw Error('Unknown offline diagram action.');
 if(!stops.includes(v))throw Error('Unknown diagram offset.');
 return v===s.offset?s:{offset:v,revision:s.revision+1};
}
export function report(s){
 if(!stops.includes(s.offset))throw Error('Unknown diagram offset.');
 return {schema:'bts.04-12.square-overlap.v1',source:'detached unit-free geometry exercise',revision:s.revision,squareSide:1,horizontalOffset:s.offset,sharedAreaFraction:Math.max(0,1-s.offset),deviceConnection:false};
}
