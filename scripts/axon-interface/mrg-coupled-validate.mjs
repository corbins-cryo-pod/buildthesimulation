#!/usr/bin/env node
/** Actual production FEM coefficients and waveform, independently run in NEURON. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
const productionRoot=path.resolve(process.env.MRG_PRODUCTION_ROOT||root);
const importProduction=relative=>import(pathToFileURL(path.join(productionRoot,relative)));
const [{normalizeSettings,MODEL_VERSION},{createCohort},{buildMorphology,fieldSettings,phaseAverage,propagatedOutput},{createFieldModel,solveChannel,sampleTransfer,FIELD_VERSION},{simulateCable,MRG_VERSION}]=await Promise.all([
  importProduction('src/lib/axon-interface/settings.mjs'),importProduction('src/lib/axon-interface/geometry.mjs'),
  importProduction('src/lib/axon-interface/protocol.mjs'),importProduction('src/lib/axon-interface/field.mjs'),importProduction('src/lib/axon-interface/mrg.mjs')
]);
const productionFiles=['src/lib/axon-interface/settings.mjs','src/lib/axon-interface/geometry.mjs','src/lib/axon-interface/protocol.mjs','src/lib/axon-interface/field.mjs','src/lib/axon-interface/mrg.mjs'];
const referenceFiles=['scripts/axon-interface/mrg-coupled-validate.mjs','scripts/axon-interface/mrg-reference.py','scripts/axon-interface/mrg-modeldb/AXNODE.mod','scripts/axon-interface/mrg-modeldb/MRGaxon.hoc','docs/axon-interface/mrg-acceptance.json'];
const sourcePaths=Object.fromEntries([...productionFiles.map(p=>[p,path.join(productionRoot,p)]),...referenceFiles.map(p=>[p,path.join(root,p)])]);
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const sourceHashes=Object.fromEntries(Object.entries(sourcePaths).map(([k,p])=>[k,hash(p)]));
const reportDir=path.join(root,'docs/axon-interface'),artifacts=path.join(reportDir,'mrg-reference-data');fs.mkdirSync(artifacts,{recursive:true});
const acceptance=JSON.parse(fs.readFileSync(path.join(reportDir,'mrg-acceptance.json'))),limits=acceptance.limits;
const settings=normalizeSettings({axonCount:4,channelCount:1,seed:2048,amplitudeUa:1000,nodeCount:11,passiveSegments:3,dtMs:.00125,durationMs:4,phaseWidthMs:.1,phaseGapMs:.025,stimulusStartMs:.5,somaDiameterUm:0,somaActiveScale:0,sampleDtMs:.005});
const started=performance.now(),morphology=buildMorphology(settings),geometry=createCohort(settings),cell=geometry.cells[0],channel=geometry.channels[0];
const field=createFieldModel(fieldSettings(settings,morphology)),solution=solveChannel(field,channel);
const transfer=Array.from(sampleTransfer(solution,morphology.compartments.map(c=>[cell.xUm,cell.yUm,c.zUm])));
const dt=settings.dtMs,durationMs=settings.durationMs,steps=Math.round(durationMs/dt),waveformUa=Array.from({length:steps},(_,k)=>phaseAverage(settings,k*dt));
const chargeNc=waveformUa.reduce((s,v)=>s+v*dt,0);if(Math.abs(chargeNc)>1e-8)throw new Error('Production reference waveform is not charge balanced.');
const baseline=simulateCable({morphology,dtMs:dt,durationMs,traceStride:4,saveCurrents:false});
const middle=Math.floor(morphology.nodes/2),local=[middle-1,middle,middle+1].map(n=>morphology.nodeIndices[n]);
const interventions=[['assigned',[]],['proximal-silenced',local],['whole-silenced',morphology.nodeIndices]];
const rows=[],python=process.env.MRG_PYTHON||'python3';
const recording=run=>run.outerCurrentsNa.map(sample=>sample.reduce((sum,current,i)=>sum+current*transfer[i],0));
for(const [intervention,silencedCompartments] of interventions){
  const prefix=`production-${intervention}`,input=path.join(artifacts,`${prefix}-input.json`),output=path.join(artifacts,`${prefix}-neuron.json`);
  const fixture={fiberDiameterUm:morphology.fiberDiameterUm,nodes:morphology.nodes,passiveSegments:morphology.passiveSegments,somaDiameterUm:morphology.somaDiameterUm,somaActiveScale:morphology.somaActiveScale,
    dtMs:dt,durationMs,equilibrationMs:20,traceStride:4,saveCurrents:true,silencedCompartments,transferMvPerUa:transfer,waveformUa};
  fs.writeFileSync(input,JSON.stringify(fixture));
  const execution=spawnSync(python,[path.join(here,'mrg-reference.py'),input,output],{encoding:'utf8',timeout:120000});
  if(execution.status!==0){rows.push({intervention,status:'fail',error:execution.stderr||execution.error?.message||execution.stdout});continue;}
  const native=JSON.parse(fs.readFileSync(output));
  const js=simulateCable({morphology,dtMs:dt,durationMs,traceStride:4,saveCurrents:true,transferMvPerUa:transfer,waveform:t=>phaseAverage(settings,t),initialState:baseline.initialState,silencedCompartments});
  const exactObservationTimestamps=js.timesMs.length===native.timesMs.length&&js.timesMs.every((t,k)=>t===native.timesMs[k]);
  if(!exactObservationTimestamps){rows.push({intervention,status:'fail',exactObservationTimestamps,error:'Observation grids differ; no alignment, interpolation or timestamp transformation is permitted.'});continue;}
  const rms=js.membraneMv.map((values,n)=>Math.sqrt(values.reduce((sum,v,k)=>sum+(v-native.membraneMv[n][k])**2,0)/values.length));
  const identicalCrossingCounts=js.nodeEventTimes.every((times,n)=>times.length===native.nodeEventTimes[n].length);
  let maxCrossingTimeErrorMs=0;for(let n=0;n<js.nodeEventTimes.length;n++)for(let k=0;k<js.nodeEventTimes[n].length;k++)maxCrossingTimeErrorMs=Math.max(maxCrossingTimeErrorMs,Math.abs(js.nodeEventTimes[n][k]-(native.nodeEventTimes[n][k]??1e99)));
  const jsRecordingUv=recording(js),nativeRecordingUv=recording(native),maxRecordingErrorUv=Math.max(...jsRecordingUv.map((v,k)=>Math.abs(v-nativeRecordingUv[k])));
  const membraneMaxNodeRmsMv=Math.max(...rms),jsCrossings=js.events.length,neuronCrossings=native.nodeEventTimes.reduce((sum,a)=>sum+a.length,0);
  const propagation=propagatedOutput(js,morphology,{notBeforeMs:settings.stimulusStartMs});
  const expectedControl=intervention==='assigned'?propagation.recruited:jsCrossings===0&&!propagation.recruited;
  const passed=membraneMaxNodeRmsMv<=limits.nativeMaxNodeRmsMv&&identicalCrossingCounts&&maxCrossingTimeErrorMs<=limits.nativeCrossingTimeMs&&maxRecordingErrorUv<=limits.nativeRecordingMaxErrorUv&&expectedControl;
  rows.push({intervention,status:passed?'pass':'fail',exactObservationTimestamps,membraneMaxNodeRmsMv,rmsPerNodeMv:rms,identicalCrossingCounts,maxCrossingTimeErrorMs,maxRecordingErrorUv,jsCrossings,neuronCrossings,propagation,expectedControl,
    transformations:{timeShiftMs:0,baselineSubtraction:false,amplitudeScaling:false,timestampTransformation:false},runtime:native.runtime});
  fs.writeFileSync(path.join(artifacts,`${prefix}-comparison.json`),JSON.stringify({timesMs:js.timesMs,jsMembraneMv:js.membraneMv,neuronMembraneMv:native.membraneMv,jsRecordingUv,nativeRecordingUv,jsNodeEventTimes:js.nodeEventTimes,neuronNodeEventTimes:native.nodeEventTimes}));
}
const sourceChangedDuringRun=Object.entries(sourcePaths).filter(([k,p])=>sourceHashes[k]!==hash(p)).map(([k])=>k);
const report={schema:'buildthesimulation.mrg.production-coupled.v2-recovery',generatedAt:new Date().toISOString(),modelVersion:MODEL_VERSION,modelComponents:{membrane:MRG_VERSION,field:FIELD_VERSION},
  passed:rows.length===3&&rows.every(r=>r.status==='pass')&&sourceChangedDuringRun.length===0,settings,cell,channel,compartmentCount:morphology.compartments.length,
  fieldSettings:field.settings,fieldDiagnostics:solution.diagnostics,chargeNc,transferMvPerUa:transfer,rows,limits,sourceHashes,sourceChangedDuringRun,
  runtime:{node:process.version,platform:os.platform(),cpu:os.cpus()[0]?.model,elapsedSeconds:(performance.now()-started)/1000},
  recovery:{exactFormerScriptRecovered:false,freshlyExecuted:true},
  limitations:['This 1000 uA stress stimulus is a numerical fixture, not an implant operating recommendation.','Only the seeded first resolved cable is independently replayed in this fixture; the full production cohort has separate integration checks.','Numerical agreement does not establish ganglion physiology, complete Stage 1 architecture, electrode safety or original-host preservation.']};
fs.writeFileSync(path.join(reportDir,'mrg-coupled-report.json'),JSON.stringify(report,null,2)+'\n');
fs.appendFileSync(path.join(reportDir,'mrg-coupled-history.jsonl'),JSON.stringify(report)+'\n');
console.log(JSON.stringify({passed:report.passed,rows,sourceChangedDuringRun,seconds:report.runtime.elapsedSeconds},null,2));
if(!report.passed)process.exitCode=1;
