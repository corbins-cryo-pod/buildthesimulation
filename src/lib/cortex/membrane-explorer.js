// Read-only views of Cortex Laboratory's pinned 34 °C channel functions.
import { CHANNELS, channelRates, sodiumMatrix, denseSolve } from './active-channels.js';
export const mechanisms = CHANNELS;
export const gateSpecs = [[], [['m',0]], [['m',1]], [['m',2],['h',3]], [['m',4],['h',5]], [['m',6]], [['m',7],['h',8]], [['m',9],['h',10]], [['z',11]]];
export function sodiumEquilibrium(v) {
 const a=sodiumMatrix(v,null), b=new Float64Array(12);
 for(let j=0;j<12;j++)a[11*12+j]=1;
 b[11]=1;
 return denseSolve(a,b);
}
export function inspectMechanism(index,v,cai=1e-4) {
 if(index===0)return {open:sodiumEquilibrium(v)[10],gates:[]};
 const rates=channelRates(v,cai),gates=gateSpecs[index].map(([name,j])=>({name,inf:rates[j][0],tau:rates[j][1]}));
 const x=gates.map(g=>g.inf);
 const open=[null,x[0],x[0],x[0]**2*x[1],x[0]**4*x[1],x[0],x[0]**2*x[1],x[0]**2*x[1],x[0]][index];
 return {open,gates};
}
export function stepGates(index,hold,step,cai,t) {
 return inspectMechanism(index,step,cai).gates.map((g,j)=>({...g,value:g.inf+(inspectMechanism(index,hold,cai).gates[j].inf-g.inf)*Math.exp(-t/g.tau)}));
}
