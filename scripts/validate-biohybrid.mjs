import {runSimulation} from '../src/lib/biohybrid/model.js';
import fs from 'node:fs';
const base=runSimulation(),half=runSimulation({dtMs:.0025}),quarter=runSimulation({dtMs:.00125}),fine=runSimulation({segmentLengthUm:12.5}),finer=runSimulation({segmentLengthUm:6.25}),zero=runSimulation({stimAmplitudeUa:0}),disconnected=runSimulation({synapticWeightUs:0});
const rms=(a,b)=>Math.sqrt(a.reduce((s,v,i)=>s+(v-b[i])**2,0)/a.length);
const acceptance={restDriftMv:.1,timeRmsMv:1,spikeShiftMs:.1,spatialConductionRelative:.05,spatialRecordingRelative:.1};
function compareTimeSteps(coarse,refined){
  const sampleGridIdentical=coarse.timeMs.length===refined.timeMs.length&&coarse.timeMs.every((t,i)=>Math.abs(t-refined.timeMs[i])<1e-10);
  const refinedTraces=new Map(refined.traces.map(t=>[t.id,t]));
  const rmsByTrace=coarse.traces.map(t=>{const other=refinedTraces.get(t.id);return{id:t.id,rmsMv:sampleGridIdentical&&other&&t.values.length===other.values.length?rms(t.values,other.values):null};});
  // Match the nth event of each neuron/monitor, rather than unrelated events
  // whose global ordering may exchange when the temporal grid is refined.
  const groupSpikes=result=>{const groups=new Map();for(const spike of result.spikes){const key=JSON.stringify([spike.neuronId,spike.kind]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(spike.timeMs);}for(const times of groups.values())times.sort((a,b)=>a-b);return groups;};
  const a=groupSpikes(coarse),b=groupSpikes(refined),keys=new Set([...a.keys(),...b.keys()]);
  const spikeEventCountsMatch=[...keys].every(key=>(a.get(key)?.length||0)===(b.get(key)?.length||0));
  const maxSpikeShiftMs=spikeEventCountsMatch?Math.max(0,...[...keys].flatMap(key=>a.get(key).map((t,i)=>Math.abs(t-b.get(key)[i])))):null;
  const passed=sampleGridIdentical&&coarse.traces.length===refined.traces.length&&rmsByTrace.every(t=>Number.isFinite(t.rmsMv)&&t.rmsMv<=acceptance.timeRmsMv)&&spikeEventCountsMatch&&maxSpikeShiftMs<=acceptance.spikeShiftMs;
  return{dtMs:[coarse.settings.dtMs,refined.settings.dtMs],sampleDtMs:coarse.settings.sampleDtMs,sampleGridIdentical,spikeMatching:'Ordinal within each neuronId and monitor kind',spikeEventCountsMatch,spikeCounts:[coarse.spikes.length,refined.spikes.length],rmsByTrace,maxSpikeShiftMs,passed};
}
const adjacentComparisons=[compareTimeSteps(base,half),compareTimeSteps(half,quarter)];
const empiricalRmsConvergence={
  definition:'differenceRatio = RMS(dt,dt/2) / RMS(dt/2,dt/4); differenceScalingExponent = log2(differenceRatio).',
  interpretation:'Observed scaling of differences between these three discrete solutions for this stimulus and morphology. It is not a measured error against an exact solution or a claim of formal/asymptotic solver order; nonlinear spike timing and delayed-event discretization contribute.',
  byTrace:adjacentComparisons[0].rmsByTrace.map((trace,i)=>{
    const refined=adjacentComparisons[1].rmsByTrace[i];
    const ratio=Number.isFinite(trace.rmsMv)&&refined?.id===trace.id&&refined.rmsMv>0?trace.rmsMv/refined.rmsMv:null;
    return{id:trace.id,coarseToHalfRmsMv:trace.rmsMv,halfToQuarterRmsMv:refined?.rmsMv??null,differenceRatio:ratio,differenceScalingExponent:ratio>0?Math.log2(ratio):null};
  })
};
const report={modelVersion:base.modelVersion,date:'2026-10-23',scope:'Numerical verification of a generic uncalibrated canonical HH graph; not validation against graft experiments',
  acceptance,
  default:{settings:base.settings,metrics:base.metrics,diagnostics:base.diagnostics},
  checks:{zeroInput:{passed:false,spikes:zero.spikes.length,maxDriftMv:Math.max(...zero.traces.map(t=>Math.max(...t.values.map(v=>Math.abs(v-zero.diagnostics.restMv)))))},
  disconnected:{passed:disconnected.metrics.recruitedHosts===0,metrics:disconnected.metrics},
  timeRefinement:{passed:adjacentComparisons.every(check=>check.passed),dtMs:[base.settings.dtMs,half.settings.dtMs,quarter.settings.dtMs],rmsByTrace:adjacentComparisons[0].rmsByTrace,maxSpikeShiftMs:adjacentComparisons[0].maxSpikeShiftMs,adjacentComparisons,empiricalRmsConvergence},
  spatialRefinement:{passed:false,segmentLengthUm:[25,12.5,6.25],conductionDelayMs:[base,fine,finer].map(r=>r.metrics.conductionDelayMs),recordingPeakToPeakUv:[base,fine,finer].map(r=>r.metrics.recordingPeakToPeakUv),delayRelative25to12_5:Math.abs(base.metrics.conductionDelayMs-fine.metrics.conductionDelayMs)/fine.metrics.conductionDelayMs,recordingRelative25to12_5:base.metrics.recordingPeakToPeakUv.map((v,i)=>Math.abs(v-fine.metrics.recordingPeakToPeakUv[i])/fine.metrics.recordingPeakToPeakUv[i])}},
  historicalFailures:[{stage:'Initial synaptic-target discretization',criterion:'Remote EAP p2p change <=10% under 25 to12.5µm refinement',observed:'17.6% relative coarse,21.3% relative refined at recording contact1',status:'Failed. Corrected anatomical-site switching; tolerance unchanged.',cause:'Nearest compartment to an x coordinate switched dendritic branches under spatial refinement.',correction:'Fixed6µm dendritic landing branch defines physical target independently of mesh spacing.'}],
  independentReference:'Run native NEURON verification separately; this file does not claim independent-solver agreement'};
report.checks.zeroInput.passed=report.checks.zeroInput.spikes===0&&report.checks.zeroInput.maxDriftMv<=report.acceptance.restDriftMv;
report.checks.spatialRefinement.passed=report.checks.spatialRefinement.delayRelative25to12_5<=report.acceptance.spatialConductionRelative&&report.checks.spatialRefinement.recordingRelative25to12_5.every(x=>x<=report.acceptance.spatialRecordingRelative);
report.passed=Object.values(report.checks).every(x=>x.passed);
fs.writeFileSync(new URL('../docs/biohybrid/numerical-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
if(!report.passed)process.exitCode=1;
console.log(JSON.stringify({passed:report.passed,default:base.metrics,zero:report.checks.zeroInput,dt:report.checks.timeRefinement,dx:report.checks.spatialRefinement},null,2));
