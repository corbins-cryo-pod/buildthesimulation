#!/usr/bin/env node
/** Production well-surface field -> independently constructed native NEURON cable. */
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {fileURLToPath,pathToFileURL} from 'node:url';import {spawnSync} from 'node:child_process';
import {createBipolarMorphology,BIPOLAR_VERSION} from '../../src/lib/axon-interface/bipolar.mjs';
import {simulateCable,MRG_VERSION,MRG_SOURCE} from '../../src/lib/axon-interface/mrg.mjs';
import {fileSha256,snapshotSources,changedSources,verifyFieldEvidence,compareTraces,registerSource} from './bipolar-validation-utils.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..'),dir=path.join(root,'docs/axon-interface'),raw=path.join(dir,'bipolar-coupled-data');fs.mkdirSync(raw,{recursive:true});
const productionRoot=path.resolve(process.env.STAGE1_PRODUCTION_ROOT||root),fieldPath=path.resolve(process.env.STAGE1_FIELD_MODULE||path.join(productionRoot,'src/lib/axon-interface/field-stage1.mjs'));
const readModule=p=>import(pathToFileURL(p)),prototype=process.env.STAGE1_FIELD_EXPLORATORY==='true';
const [{normalizeStage1Settings},{createStage1Cohort},{stage1FieldSettings,stage1PhaseAverage,propagatedArmOutput},fieldAPI]=await Promise.all([
  readModule(path.join(productionRoot,'src/lib/axon-interface/stage1-settings.mjs')),readModule(path.join(productionRoot,'src/lib/axon-interface/identities.mjs')),
  readModule(path.join(productionRoot,'src/lib/axon-interface/stage1-protocol.mjs')),readModule(fieldPath)
]);
const acceptance=JSON.parse(fs.readFileSync(path.join(dir,'bipolar-coupled-acceptance.json'))),L=acceptance.limits,f=acceptance.fixture;
const settings=normalizeStage1Settings({seed:f.seed,axonCount:f.axonCount,channelCount:f.channelCount,somaSegments:f.somaSegments,equilibrationMs:f.equilibrationMs,durationMs:f.durationMs,sampleDtMs:f.sampleDtMs,
  dtMs:acceptance.timeStepsMs[0],stimulusStartMs:f.onsetMs,phaseWidthMs:f.phaseWidthMs,phaseGapMs:f.phaseGapMs,amplitudeUa:1});
const geometry=createStage1Cohort(settings),cell=geometry.cells.find(c=>c.id===f.cellId),channel=geometry.channels.find(c=>c.id===f.channelId),m=createBipolarMorphology(settings);
if(!cell||!channel||channel.targetCellId!==cell.id)throw new Error('Declared production cell/channel identity not found.');
const namedPaths={};
for(const relative of ['src/lib/axon-interface/mrg.mjs','src/lib/axon-interface/bipolar.mjs','scripts/axon-interface/bipolar-coupled-validate.mjs','scripts/axon-interface/bipolar-validation-utils.mjs','scripts/axon-interface/bipolar-reference.py','scripts/axon-interface/mrg-modeldb/AXNODE.mod','scripts/axon-interface/mrg-modeldb/MRGaxon.hoc','docs/axon-interface/bipolar-coupled-acceptance.json'])namedPaths[relative]=path.join(root,relative);
namedPaths['src/lib/axon-interface/field-stage1.mjs']=fieldPath;
for(const name of ['stage1-settings.mjs','stage1-protocol.mjs','settings.mjs','identities.mjs','metrics.mjs'])namedPaths['src/lib/axon-interface/'+name]=path.join(productionRoot,'src/lib/axon-interface',name);
const fieldEvidence=verifyFieldEvidence({fieldPath,fieldVersion:fieldAPI.FIELD_STAGE1_VERSION,paths:namedPaths}),sourceHashes=snapshotSources(namedPaths);
const started=performance.now(),nativeRows=[],temporalRows=[],zeroRows=[],outcomes=[],errors=[],runs=new Map(),equilibria=new Map();let complete=false,solution=null,model=null,transfer=null;
const sum=a=>a.reduce((s,v)=>s+v,0),ptp=a=>Math.max(...a)-Math.min(...a),rms=a=>Math.sqrt(sum(a.map(v=>v*v))/a.length);
const interventions=acceptance.controls;
const silence=control=>control==='soma-only-silenced'?m.somaIndices:control==='initiation-region-silenced'?m.initiationRegionIndices:control==='whole-cell-silenced'?m.activeSiteIndices:[];
const classify=run=>Object.fromEntries(['peripheral','central'].map(arm=>[arm,propagatedArmOutput(run,m,arm,{notBeforeMs:settings.stimulusStartMs})]));
const crossingSummary=run=>{
  const events=run.events??(run.activeSiteEventTimes.flatMap((times,k)=>times.map(timeMs=>({compartmentIndex:run.activeSiteIndices[k],timeMs}))));
  const first=events.length?events.reduce((a,b)=>a.timeMs<=b.timeMs?a:b):null,c=first?m.compartments[first.compartmentIndex]:null;
  return {crossings:events.length,somaCrossings:events.filter(e=>m.somaIndices.includes(e.compartmentIndex)).length,firstCrossing:first?{compartmentIndex:first.compartmentIndex,timeMs:first.timeMs,role:c.role,kind:c.kind}:null,
    firstCrossingRoleFamily:!c?'none':c.kind==='SOMA'?'soma':c.kind==='STEM'?'stem':m.initiationRegionIndices.includes(c.index)?'heminode':'distal-node'};
};
function common(dtMs){return {morphology:m,dtMs,durationMs:settings.durationMs,equilibrationMs:settings.equilibrationMs,recordIndices:m.activeSiteIndices,traceStride:Math.round(settings.sampleDtMs/dtMs),saveCurrents:true,maxEventsPerNode:8};}
function recording(run){return run.outerCurrentsNa.map(row=>sum(row.map((current,i)=>current*transfer[i])));}
function runCase(amplitudeUa,intervention,dtMs){
  const key=`${amplitudeUa}/${intervention}/${dtMs}`;if(runs.has(key))return runs.get(key);
  if(!equilibria.has(dtMs)){
    const rest=simulateCable({...common(dtMs),saveCurrents:false}),zeroDriftMv=Math.max(...rest.membraneMv.map(row=>Math.max(...row.map(v=>Math.abs(v-row[0])))));
    zeroRows.push({dtMs,status:zeroDriftMv<=L.zeroInputDriftMv&&rest.events.length===L.zeroInputCrossings?'pass':'fail',zeroInputDriftMv:zeroDriftMv,crossings:rest.events.length,preparationMs:settings.equilibrationMs});equilibria.set(dtMs,rest.initialState);
  }
  const initialState=equilibria.get(dtMs),s={...settings,amplitudeUa,dtMs},run=simulateCable({...common(dtMs),initialState,transferMvPerUa:transfer,waveform:t=>stage1PhaseAverage(s,t),silencedCompartments:silence(intervention)});
  const exactSharedInitialState=JSON.stringify(run.initialState)===JSON.stringify(initialState),recordingUv=recording(run),arms=classify(run),crossings=crossingSummary(run);
  const compact={timesMs:run.timesMs,recordIndices:run.recordIndices,membraneMv:run.membraneMv,activeSiteEventTimes:run.activeSiteEventTimes,nodeEventTimes:run.nodeEventTimes,
    diagnostics:run.diagnostics,recordingUv,arms,...crossings,exactSharedInitialState,initialStateSha256:undefined};
  runs.set(key,compact);return compact;
}
function save(){
  const changed=changedSources(namedPaths,sourceHashes),rows=[...zeroRows,...nativeRows,...temporalRows],numericalPassed=complete&&errors.length===0&&rows.length>0&&rows.every(r=>r.status==='pass')&&changed.length===0;
  const report={schema:'buildthesimulation.bipolar.coupled.v1',generatedAt:new Date().toISOString(),complete,exploratory:prototype,status:numericalPassed&&fieldEvidence.validated&&!prototype?'pass':'fail',passed:numericalPassed&&fieldEvidence.validated&&!prototype,numericalComparisonsPassed:numericalPassed,
    modelVersion:BIPOLAR_VERSION,membraneVersion:MRG_VERSION,fieldVersion:fieldAPI.FIELD_STAGE1_VERSION,modelDbSource:MRG_SOURCE,fieldValidated:fieldEvidence.validated,fieldEvidence,
    acceptance,settings,morphology:{parameters:m.parameters,compartments:m.compartments.length,activeSites:m.activeSiteIndices.length,trueNodes:m.nodeIndices.length,somaIndices:m.somaIndices,armMonitors:m.armMonitors},
    cell,channel,fieldSettings:model?.settings??null,fieldDiagnostics:solution?.diagnostics??null,transferSummary:transfer?{length:transfer.length,rmsMvPerUa:rms(transfer),minimumMvPerUa:Math.min(...transfer),maximumMvPerUa:Math.max(...transfer),somaBandsMvPerUa:m.somaIndices.map(i=>transfer[i]),sha256:fileSha256(path.join(raw,'production-transfer.json'))}:null,
    pairArtifactMvPerUa:solution?.pairArtifactMvPerUa??null,zeroRows,rows:nativeRows,temporalRows,outcomes,errors,sourceHashes,sourceChangedDuringRun:changed,
    summary:{nativePass:nativeRows.filter(r=>r.status==='pass').length,nativeFail:nativeRows.filter(r=>r.status!=='pass').length,timePass:temporalRows.filter(r=>r.status==='pass').length,timeFail:temporalRows.filter(r=>r.status!=='pass').length,numericalGatePassed:numericalPassed,biologicalValidation:false,humanSgCalibration:false},
    runtime:{node:process.version,platform:os.platform(),cpu:os.cpus()[0]?.model,elapsedSeconds:(performance.now()-started)/1000},
    limitations:['Native NEURON agreement verifies the declared equations and production transfer units; it is not human SG or engineered-cell calibration.','The soma has five axial spherical surface bands but no independent circumferential nonlinear membrane patches.','A raw upward 0 mV crossing may be passive; the separately reported three-node propagation classification is a temporal criterion, not proof of one traveling event.','The soma-only matched intervention tests active-soma necessity, not exclusive causal origin. A negative result remains visible.','The reciprocal source recording uses each model own computed outer currents. The finite contact artifact is a separate linear voltage.']};
  fs.writeFileSync(path.join(dir,prototype?'bipolar-coupled-prototype.json':'bipolar-coupled-report.json'),JSON.stringify(report,null,2)+'\n');
  if(complete)fs.appendFileSync(path.join(dir,'bipolar-coupled-history.jsonl'),JSON.stringify(report)+'\n');return report;
}
try{
  if(!prototype&&!fieldEvidence.validated)throw new Error('Current passing field evidence is required: '+fieldEvidence.failures.join('; '));
  model=fieldAPI.createStage1FieldModel(stage1FieldSettings(settings,m),{cells:geometry.cells,wells:geometry.wells,morphology:m,constructPresent:true});solution=fieldAPI.solveStage1Channel(model,channel);transfer=Array.from(fieldAPI.sampleMembraneTransfer(solution,m,cell));
  if(transfer.length!==m.compartments.length||!transfer.every(Number.isFinite))throw new Error('Production membrane transfer length/finite-value failure.');
  fs.writeFileSync(path.join(raw,'production-transfer.json'),JSON.stringify({cell,channel,parameters:m.parameters,transferMvPerUa:transfer,surfaces:m.compartments.map(c=>c.samplingSurface)}));
  for(const amplitudeUa of acceptance.nativeAmplitudeGridUa){
    const dtMs=acceptance.timeStepsMs[0],s={...settings,amplitudeUa,dtMs};
    for(const intervention of interventions){
      const js=runCase(amplitudeUa,intervention,dtMs),id=`${amplitudeUa}-${intervention}`,input=path.join(raw,id+'-input.json'),output=path.join(raw,id+'-neuron.json');
      const fixture={parameters:m.parameters,dtMs,durationMs:settings.durationMs,equilibrationMs:settings.equilibrationMs,traceStride:Math.round(settings.sampleDtMs/dtMs),saveCurrents:true,
        recordIndices:m.activeSiteIndices,silencedCompartments:silence(intervention),transferMvPerUa:transfer,waveformUa:Array.from({length:Math.round(settings.durationMs/dtMs)},(_,k)=>stage1PhaseAverage(s,k*dtMs))};
      fs.writeFileSync(input,JSON.stringify(fixture));const py=spawnSync(process.env.MRG_PYTHON||'python3',[path.join(here,'bipolar-reference.py'),input,output],{encoding:'utf8',timeout:120000,maxBuffer:10e6});
      if(py.status!==0){nativeRows.push({amplitudeUa,intervention,status:'fail',error:py.stderr||py.error?.message||py.stdout});save();continue;}
      const native=JSON.parse(fs.readFileSync(output)),q=compareTraces(js,native),nr=recording(native),maximumRecordingErrorUv=Math.max(...js.recordingUv.map((v,k)=>Math.abs(v-nr[k]))),maximumGeometryErrorUm=Math.max(...native.positionsUm.map((v,k)=>Math.abs(v-m.compartments[k].zUm)));
      const geometryCorrespondence=JSON.stringify([native.recordIndices,native.activeSiteIndices,native.nodeIndices])===JSON.stringify([m.activeSiteIndices,m.activeSiteIndices,m.nodeIndices]);
      const nativeArms=classify(native),classificationEqual=['peripheral','central'].every(arm=>js.arms[arm].recruited===nativeArms[arm].recruited);
      const passed=q.maximumSiteRmsMv<=L.nativeMaximumSiteRmsMv&&q.identicalCrossingCounts&&q.maximumCrossingTimeErrorMs<=L.nativeMaximumCrossingTimeMs&&maximumRecordingErrorUv<=L.nativeRecordingMaximumErrorUv&&maximumGeometryErrorUm<=L.independentGeometryErrorUm&&geometryCorrespondence&&classificationEqual&&js.exactSharedInitialState&&js.diagnostics.maxCurrentResidualNa<=L.currentBalanceNa;
      const row={amplitudeUa,intervention,status:passed?'pass':'fail',dtMs,...q,maximumRecordingErrorUv,maximumGeometryErrorUm,geometryCorrespondence,exactSharedInitialState:js.exactSharedInitialState,maxCurrentResidualNa:js.diagnostics.maxCurrentResidualNa,
        classificationEqual,js:{...crossingSummary({events:null,activeSiteIndices:m.activeSiteIndices,activeSiteEventTimes:js.activeSiteEventTimes}),arms:js.arms,recordingPeakToPeakUv:ptp(js.recordingUv)},native:{...crossingSummary(native),arms:nativeArms,recordingPeakToPeakUv:ptp(nr)},runtime:native.runtime};
      nativeRows.push(row);fs.writeFileSync(path.join(raw,id+'-comparison.json'),JSON.stringify({timesMs:js.timesMs,recordIndices:js.recordIndices,jsMembraneMv:js.membraneMv,nativeMembraneMv:native.membraneMv,jsRecordingUv:js.recordingUv,nativeRecordingUv:nr}));
      console.log(JSON.stringify({phase:'native',amplitudeUa,intervention,status:row.status,maxRmsMv:row.maximumSiteRmsMv,maxRecordingUv:row.maximumRecordingErrorUv}));save();
    }
  }
  for(const amplitudeUa of acceptance.temporalAmplitudeGridUa)for(const intervention of interventions){
    for(let k=1;k<acceptance.timeStepsMs.length;k++){
      const from=acceptance.timeStepsMs[k-1],to=acceptance.timeStepsMs[k],a=runCase(amplitudeUa,intervention,from),b=runCase(amplitudeUa,intervention,to),q=compareTraces(a,b);
      const classificationEqual=['peripheral','central'].every(arm=>a.arms[arm].recruited===b.arms[arm].recruited),passed=q.maximumSiteRmsMv<=L.timeHalvingMaximumSiteRmsMv&&q.identicalCrossingCounts&&q.maximumCrossingTimeErrorMs<=L.timeHalvingMaximumCrossingTimeMs&&classificationEqual&&a.exactSharedInitialState&&b.exactSharedInitialState;
      const row={amplitudeUa,intervention,fromDtMs:from,toDtMs:to,status:passed?'pass':'fail',...q,classificationEqual,coarseArms:a.arms,fineArms:b.arms,recordingPeakToPeakUv:[ptp(a.recordingUv),ptp(b.recordingUv)]};temporalRows.push(row);
      console.log(JSON.stringify({phase:'time',amplitudeUa,intervention,from,to,status:row.status,maxRmsMv:row.maximumSiteRmsMv,crossingDeltaMs:row.maximumCrossingTimeErrorMs}));save();
    }
  }
  for(const amplitudeUa of acceptance.nativeAmplitudeGridUa){
    const dtMs=acceptance.timeStepsMs[0],assigned=runCase(amplitudeUa,'assigned',dtMs),soma=runCase(amplitudeUa,'soma-only-silenced',dtMs),local=runCase(amplitudeUa,'initiation-region-silenced',dtMs),whole=runCase(amplitudeUa,'whole-cell-silenced',dtMs);
    outcomes.push({amplitudeUa,arms:Object.fromEntries(['peripheral','central'].map(arm=>[arm,{assignedRecruited:assigned.arms[arm].recruited,somaSilencedRecruited:soma.arms[arm].recruited,localSilencedRecruited:local.arms[arm].recruited,wholeSilencedRecruited:whole.arms[arm].recruited,somaActiveNecessary:assigned.arms[arm].recruited&&!soma.arms[arm].recruited,initiationRegionActiveNecessary:assigned.arms[arm].recruited&&!local.arms[arm].recruited,wholeCellActiveNecessary:assigned.arms[arm].recruited&&!whole.arms[arm].recruited}])),
      firstCrossingRoleFamily:{assigned:assigned.firstCrossingRoleFamily,somaSilenced:soma.firstCrossingRoleFamily,localSilenced:local.firstCrossingRoleFamily,wholeSilenced:whole.firstCrossingRoleFamily},meaning:'Necessity is specific to this matched active-conductance intervention and fixed field. Raw crossings and temporal propagation criteria do not prove the exclusive causal source.'});
  }
}catch(error){errors.push({message:error.message,stack:error.stack});}
complete=true;const report=save();console.log(JSON.stringify({status:report.status,summary:report.summary,fieldValidated:report.fieldValidated,sourceChangedDuringRun:report.sourceChangedDuringRun,outcomes:report.outcomes,errors:report.errors,seconds:report.runtime.elapsedSeconds},null,2));if(!report.passed&&!prototype)process.exitCode=1;if(!report.numericalComparisonsPassed)process.exitCode=1;
