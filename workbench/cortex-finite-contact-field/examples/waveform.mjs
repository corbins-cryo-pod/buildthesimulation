// Node demonstration; identical imported sampler runs in browsers and Web Workers.
import {readFile} from 'node:fs/promises';
import {loadFieldPackage,transformMicrometersToField,units,STATUS_NAMES} from '../js/field-sampler.js';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('artifacts/disk-v1/field.json',root),'utf8'));
const binary=await readFile(new URL('artifacts/disk-v1/'+manifest.data.file,root));
const field=await loadFieldPackage(manifest,binary);
// Coordinate arrays use compartment centers; they do NOT establish segment/membrane clearance.
const compartmentsMicrometers=new Float64Array([0,0,30, 0,0,40, 10,0,50, -10,0,50, 20,0,60, -20,0,60]);
const pointsMeters=transformMicrometersToField(compartmentsMicrometers);
const cache=field.cacheUnitPotentials(pointsMeters); // One interpolation pass for stationary neurons.
if(cache.status.some(s=>s!==0))throw new Error('Invalid compartment: '+Array.from(cache.status,s=>STATUS_NAMES[s]).join(','));
const rows=[];
for(const timeMilliseconds of [0,.05,.1,.15,.2,.25]) {
  const currentMicroamps=timeMilliseconds<.1?-2:timeMilliseconds>=.15&&timeMilliseconds<.25?2:0;
  const sample=field.combineCached(cache,new Float64Array([units.microampsToAmps(currentMicroamps)]));
  rows.push({timeMilliseconds,timeSeconds:units.millisecondsToSeconds(timeMilliseconds),currentMicroamps,extracellularMillivolts:Array.from(sample.values,units.voltsToMillivolts)});
}
console.log(JSON.stringify({note:'Field interface demonstration only. No cable equation or firing validation. Equal 0.1 ms phases give zero net injected waveform charge.',rows},null,2));
