// Common suprathreshold-local stimulus selected within the predeclared 0–100 µA scan.
import {readFile,writeFile} from 'node:fs/promises';
import {loadFiniteContact,prepareFiniteNodes} from '../src/lib/cortex/finite-contact.js';
import {loadActiveModel} from '../src/lib/cortex/model-library.js';
import {getModelMetadata} from '../src/lib/cortex/model-registry.js';
import {makeWorld} from '../src/lib/cortex/world.js';
import {runFiniteExperiment} from '../src/lib/cortex/finite-experiment.js';
const dir=process.argv[2],read=p=>readFile(new URL('../public'+p,import.meta.url));
const field=await loadFiniteContact(read),report=JSON.parse(await readFile('docs/cortex/finite-neural-rigor.json'));
const inputs=JSON.parse(await readFile(`${dir}/inputs.json`)),traces=JSON.parse(await readFile(`${dir}/browser-traces.json`));
for(const entry of report.cases){
 const c=structuredClone(entry.config);c.protocol.amplitudeUa=70;
 await loadActiveModel(c.neuron.modelId,c.neuron.segmentLengthUm,read);
 const nodes=makeWorld(c).neuron.nodes,r=runFiniteExperiment(c,()=>{},{field}),id=`${entry.key}-ua70`;
 inputs.cases.push({id,specimenId:601927090,config:r.config,nodes,orientationRadians:getModelMetadata(c.neuron.modelId).orientationRadians,unitAppliedMvPerUa:Array.from(prepareFiniteNodes(field,nodes,c).unitFieldMv)});
 traces[id]={classification:{localCount:r.responseAnalysis.membraneThresholdCrossings.compartmentCount},timeMs:Array.from(r.timeMs),voltageMv:Array.from(r.membraneMv),firstCrossingMs:Array.from(r.firstCrossingByCompartment,v=>Number.isFinite(v)?v:null),somaSpikeTimesMs:r.spikes.map(s=>s.timeMs)};
 entry.somaTraceAtSeventyUa=Array.from(r.timeMs,(_,k)=>r.membraneMv[k*nodes.length+r.somaIndex]);
 entry.responseAtSeventyUa=r.responseAnalysis;
}
for(const comp of report.comparisons){const a=report.cases.find(c=>c.key===comp.a),b=report.cases.find(c=>c.key===comp.b);comp.maxSomaWaveformDifferenceAtSeventyUaMv=Math.max(...a.somaTraceAtSeventyUa.map((v,i)=>Math.abs(v-b.somaTraceAtSeventyUa[i])));comp.localClassificationAtSeventyUaMatches=(a.responseAtSeventyUa.membraneThresholdCrossings.compartmentCount>0)===(b.responseAtSeventyUa.membraneThresholdCrossings.compartmentCount>0);}
report.focusScope='70 µA chosen after coarse/intermediate scan to expose classification sensitivity. This exploratory follow-up is not a preselected independent confirmation.';
await writeFile(`${dir}/inputs.json`,JSON.stringify(inputs));await writeFile(`${dir}/browser-traces.json`,JSON.stringify(traces));
await writeFile('docs/cortex/finite-neural-rigor.json',JSON.stringify(report,null,2)+'\n');
