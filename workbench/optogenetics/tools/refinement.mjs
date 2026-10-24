import fs from 'node:fs';
import {DEFAULT_CONFIG,runExperiment} from '../src/simulation.js';
const model=JSON.parse(fs.readFileSync(new URL('../data/cell-data.json',import.meta.url)));
const runs=[];
for(const [segmentLengthUm,dtMs]of[[40,.01],[40,.005],[20,.005]]){
 const r=runExperiment(model,{...DEFAULT_CONFIG,protocol:'single',durationMs:80,onsetMs:20,segmentLengthUm,dtMs});
 runs.push(r);console.log('refinement',segmentLengthUm,dtMs,r.spikes.map(s=>s.timeMs));
}
const pairs=[[0,1,'Timestep 0.01 → 0.005 ms, 40 µm mesh'],[1,2,'Mesh 40 → 20 µm, 0.005 ms timestep']];
function rms(a,b){return Math.sqrt(a.reduce((s,x,i)=>s+(x-b[i])**2,0)/a.length)}
const comparisons=pairs.map(([ai,bi,label])=>{const a=runs[ai],b=runs[bi];return{label,spikeCounts:[a.spikes.length,b.spikes.length],spikeTimeDifferenceMs:b.spikes.map((s,i)=>s.timeMs-(a.spikes[i]?.timeMs??NaN)),somaVoltageRmsDifferenceMv:rms(a.somaVoltageMv,b.somaVoltageMv),somaVoltageMaxDifferenceMv:Math.max(...a.somaVoltageMv.map((x,i)=>Math.abs(x-b.somaVoltageMv[i]))),totalPhotocurrentRmsDifferenceNa:rms(a.totalPhotocurrentNa,b.totalPhotocurrentNa),totalPhotocurrentRelativeRmsPercent:100*rms(a.totalPhotocurrentNa,b.totalPhotocurrentNa)/Math.sqrt(b.totalPhotocurrentNa.reduce((s,x)=>s+x*x,0)/b.frames)}});
fs.writeFileSync(new URL('../validation/current-refinement.json',import.meta.url),JSON.stringify({scope:'Selected single 5 ms uniform 1 mW/mm² pulse, 0.35 mS/cm² assumed whole-cell expression. Not global convergence or experimental validation.',runs:runs.map(r=>({config:r.config,spikes:r.spikes,timeMs:[...r.timeMs],somaVoltageMv:[...r.somaVoltageMv],totalPhotocurrentNa:[...r.totalPhotocurrentNa],diagnostics:r.diagnostics})),comparisons},null,2));
console.log(JSON.stringify(comparisons,null,2));
