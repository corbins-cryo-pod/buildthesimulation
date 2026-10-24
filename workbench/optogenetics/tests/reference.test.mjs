import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createChR2State,stepChR2,chr2CurrentFactor} from '../src/opsin.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../validation/opsin-reference.json',import.meta.url)));
const gates=JSON.parse(fs.readFileSync(new URL('../validation/ACCEPTANCE_GATES.json',import.meta.url)));
const results=[];
for(const dt of [.01,.005])test(`32 independent ChR2 reference protocols at ${dt} ms`,()=>{
 let maxStateError=0,maxCurrentErrorPerUs=0,maxProbabilityError=0,minProbability=1;
 for(const c of fixture.cases){
  const s=createChR2State(1),edges=c.pulses.flat().sort((a,b)=>a-b);let t=0,edgeIndex=0;
  for(let k=1;k<c.times.length;k++){
   const end=c.times[k];
   while(t<end-1e-10){
    while(edgeIndex<edges.length&&edges[edgeIndex]<=t+1e-10)edgeIndex++;
    const h=Math.min(dt,end-t,(edges[edgeIndex]??Infinity)-t),mid=t+h/2;
    const e=c.pulses.some(([a,b])=>mid>=a&&mid<b)?c.irradianceMwMm2:0;
    stepChR2(s,0,c.voltageMv,e,h,c.temperatureC);t+=h;
   }
   t=end;
   for(let j=0;j<5;j++)maxStateError=Math.max(maxStateError,Math.abs(s[j]-c.states[k][j]));
   maxProbabilityError=Math.max(maxProbabilityError,Math.abs(s[0]+s[1]+s[2]+s[3]-1));
   minProbability=Math.min(minProbability,...s.subarray(0,4));
   maxCurrentErrorPerUs=Math.max(maxCurrentErrorPerUs,Math.abs((s[1]+.1*s[2]-c.states[k][1]-.1*c.states[k][2])*chr2CurrentFactor(c.voltageMv)));
  }
 }
 const report={dtMs:dt,cases:fixture.cases.length,maxStateError,maxCurrentErrorNaPerUs:maxCurrentErrorPerUs,maxProbabilityError,minProbability};results.push(report);
 fs.writeFileSync(new URL('../validation/current-opsin-comparison.json',import.meta.url),JSON.stringify({referenceMethod:fixture.method,scope:'Independent numerical integration of the same published equations, not biological validation.',results},null,2));
 assert.ok(maxStateError<gates[dt===.01?'opsin_maximum_state_error_dt_0p01':'opsin_maximum_state_error_dt_0p005'],JSON.stringify(report));
 assert.ok(maxProbabilityError<gates.markov_probability_sum_error);assert.ok(minProbability>=-1e-14);
});
