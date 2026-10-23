import {runSimulation} from '../src/lib/biohybrid/model.js';
import fs from 'node:fs';
const base=runSimulation(),half=runSimulation({dtMs:.0025}),fine=runSimulation({segmentLengthUm:12.5}),finer=runSimulation({segmentLengthUm:6.25}),zero=runSimulation({stimAmplitudeUa:0}),disconnected=runSimulation({synapticWeightUs:0});
const rms=(a,b)=>Math.sqrt(a.reduce((s,v,i)=>s+(v-b[i])**2,0)/a.length);
const report={modelVersion:base.modelVersion,date:'2026-10-23',scope:'Numerical verification of a generic uncalibrated canonical HH graph; not validation against graft experiments',
  acceptance:{restDriftMv:.1,timeRmsMv:1,spikeShiftMs:.1,spatialConductionRelative:.05,spatialRecordingRelative:.1},
  default:{settings:base.settings,metrics:base.metrics,diagnostics:base.diagnostics},
  checks:{zeroInput:{passed:false,spikes:zero.spikes.length,maxDriftMv:Math.max(...zero.traces.map(t=>Math.max(...t.values.map(v=>Math.abs(v-zero.diagnostics.restMv)))))},
  disconnected:{passed:disconnected.metrics.recruitedHosts===0,metrics:disconnected.metrics},
  timeRefinement:{passed:false,dtMs:[base.settings.dtMs,half.settings.dtMs],rmsByTrace:base.traces.map((t,i)=>({id:t.id,rmsMv:rms(t.values,half.traces[i].values)})),maxSpikeShiftMs:Math.max(...base.spikes.map((s,i)=>Math.abs(s.timeMs-half.spikes[i].timeMs)))},
  spatialRefinement:{passed:false,segmentLengthUm:[25,12.5,6.25],conductionDelayMs:[base,fine,finer].map(r=>r.metrics.conductionDelayMs),recordingPeakToPeakUv:[base,fine,finer].map(r=>r.metrics.recordingPeakToPeakUv),delayRelative25to12_5:Math.abs(base.metrics.conductionDelayMs-fine.metrics.conductionDelayMs)/fine.metrics.conductionDelayMs,recordingRelative25to12_5:base.metrics.recordingPeakToPeakUv.map((v,i)=>Math.abs(v-fine.metrics.recordingPeakToPeakUv[i])/fine.metrics.recordingPeakToPeakUv[i])}},
  historicalFailures:[{stage:'Initial synaptic-target discretization',criterion:'Remote EAP p2p change <=10% under 25 to12.5µm refinement',observed:'17.6% relative coarse,21.3% relative refined at recording contact1',status:'Failed. Corrected anatomical-site switching; tolerance unchanged.',cause:'Nearest compartment to an x coordinate switched dendritic branches under spatial refinement.',correction:'Fixed6µm dendritic landing branch defines physical target independently of mesh spacing.'}],
  independentReference:'Run native NEURON verification separately; this file does not claim independent-solver agreement'};
report.checks.zeroInput.passed=report.checks.zeroInput.spikes===0&&report.checks.zeroInput.maxDriftMv<=report.acceptance.restDriftMv;
report.checks.timeRefinement.passed=report.checks.timeRefinement.rmsByTrace.every(x=>x.rmsMv<=report.acceptance.timeRmsMv)&&report.checks.timeRefinement.maxSpikeShiftMs<=report.acceptance.spikeShiftMs;
report.checks.spatialRefinement.passed=report.checks.spatialRefinement.delayRelative25to12_5<=report.acceptance.spatialConductionRelative&&report.checks.spatialRefinement.recordingRelative25to12_5.every(x=>x<=report.acceptance.spatialRecordingRelative);
report.passed=Object.values(report.checks).every(x=>x.passed);
fs.writeFileSync(new URL('../docs/biohybrid/numerical-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
if(!report.passed)process.exitCode=1;
console.log(JSON.stringify({passed:report.passed,default:base.metrics,zero:report.checks.zeroInput,dt:report.checks.timeRefinement,dx:report.checks.spatialRefinement},null,2));
