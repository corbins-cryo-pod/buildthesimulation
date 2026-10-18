import {readFile,writeFile} from 'node:fs/promises';
import os from 'node:os';
import {performance} from 'node:perf_hooks';
import {loadFieldPackage,STATUS} from '../js/field-sampler.js';
const root=new URL('../',import.meta.url);
const json=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const tolerances=await json('validation/tolerances.json');
const m=await json('artifacts/disk-v1/field.json'),bytes=await readFile(new URL('artifacts/disk-v1/'+m.data.file,root));
if(global.gc)global.gc();const memBefore=process.memoryUsage(),t0=performance.now();
const f=await loadFieldPackage(m,bytes),loadMs=performance.now()-t0,memAfter=process.memoryUsage();
const h=await json('validation/heldout.json'),sample=f.sampleUnitPotential(new Float64Array(h.pointsMeters.flat()));
const error=sample.values.map((v,i)=>v-h.sourcePotentialVoltsPerAmp[i]);
const relative=error.map((v,i)=>Math.abs(v)/Math.max(Math.abs(h.sourcePotentialVoltsPerAmp[i]),1));
const interpolationPass=error.every((e,i)=>Number.isFinite(e)&&Math.abs(e)<=tolerances.export_relative*Math.abs(h.sourcePotentialVoltsPerAmp[i])+tolerances.export_absolute_volts_per_amp);
const runs=[];
for(const n of [1000,10000,100000]){
  const points=new Float64Array(n*3);for(let i=0;i<n;i++){const q=h.pointsMeters[i%h.pointsMeters.length];points.set(q,3*i);}
  for(let i=0;i<3;i++)f.sampleUnitPotential(points);
  const times=[];let values;
  for(let i=0;i<7;i++){const start=performance.now();values=f.sampleUnitPotential(points);times.push(performance.now()-start);}
  times.sort((a,b)=>a-b);const ms=times[3];
  runs.push({pointCount:n,medianMilliseconds:ms,pointsPerSecond:n/ms*1000,repetitions:7,inputArrayBytes:points.byteLength,outputArrayBytes:values.values.byteLength+values.status.byteLength,invalidCount:Array.from(values.status).filter(s=>s!==STATUS.OK).length});
}
const fixture=await json('validation/neuron-fixture.json');
const cache=f.cacheUnitPotentials(new Float64Array(fixture.pointsMeters.flat()));
const differences=fixture.parents.map((p,i)=>p<0?null:cache.unitPotentials[i]-cache.unitPotentials[p]);
const referenceDifferences=fixture.parents.map((p,i)=>p<0?null:fixture.analyticPotentialVoltsPerAmp[i]-fixture.analyticPotentialVoltsPerAmp[p]);
const deltaErrors=differences.map((v,i)=>v===null?null:v-referenceDifferences[i]);
const neuronDiffPass=deltaErrors.every((e,i)=>e===null || Number.isFinite(e)&&Math.abs(e)<=tolerances.neuron_delta_relative*Math.abs(referenceDifferences[i])+tolerances.neuron_delta_absolute_volts_per_amp);
const waveform=[];
for(const tMs of [-.01,0,.05,.1,.15,.2,.25,.3]) {
  const currentAmps=tMs>=0&&tMs<.1?-2e-6:tMs>=.15&&tMs<.25?2e-6:0;
  const result=f.combineCached(cache,new Float64Array([currentAmps]));
  waveform.push({timeMilliseconds:tMs,currentAmps,potentialMillivolts:Array.from(result.values,v=>v*1000)});
}
const report={schemaVersion:'finite-contact-validation-js/1.0',runtime:{name:'Node.js',version:process.version,platform:process.platform,architecture:process.arch,cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,totalMemoryBytes:os.totalmem()},loading:{milliseconds:loadMs,retainedFieldTypedArrayBytes:f.storageBytes,inputBinaryBytes:bytes.byteLength,processMemoryBefore:memBefore,processMemoryAfter:memAfter,memoryNote:'Process deltas are noisy; retainedFieldTypedArrayBytes is exact and input buffer ownership is separate.'},performance:runs,interpolation:{tolerance:`abs(error) <= ${tolerances.export_relative}*abs(source) + ${tolerances.export_absolute_volts_per_amp} V/A`,passed:interpolationPass,pointCount:error.length,maxAbsoluteErrorVoltsPerAmp:Math.max(...error.map(Math.abs)),maxRelativeError:Math.max(...relative),sampledUnitPotential:Array.from(sample.values),status:Array.from(sample.status),errorsVoltsPerAmp:Array.from(error),labels:h.labels},neuron:{passed:neuronDiffPass,tolerance:`abs(delta_error) <= ${tolerances.neuron_delta_relative}*abs(delta_reference) + ${tolerances.neuron_delta_absolute_volts_per_amp} V/A`,unitPotentialVoltsPerAmp:Array.from(cache.unitPotentials),status:Array.from(cache.status),neighborDifferencesVoltsPerAmp:differences,analyticNeighborDifferencesVoltsPerAmp:referenceDifferences,neighborErrorsVoltsPerAmp:deltaErrors,maxAbsoluteNeighborErrorVoltsPerAmp:Math.max(...deltaErrors.filter(x=>x!==null).map(Math.abs)),waveform},failedGates:[]};
if(!interpolationPass)report.failedGates.push('export_interpolation');if(!neuronDiffPass)report.failedGates.push('neuron_neighbor_differences');
await writeFile(new URL('validation/js-results.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({loadMs,storageBytes:f.storageBytes,interpolation:report.interpolation.maxAbsoluteErrorVoltsPerAmp,failedGates:report.failedGates,performance:runs},null,2));
if(report.failedGates.length)process.exitCode=1;
