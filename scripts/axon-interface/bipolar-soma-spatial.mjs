#!/usr/bin/env node
/** Axial soma-band convergence in the actual insulating-well field. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath,pathToFileURL} from 'node:url';
import {createBipolarMorphology,BIPOLAR_VERSION} from '../../src/lib/axon-interface/bipolar.mjs';
import {simulateCable,MRG_VERSION} from '../../src/lib/axon-interface/mrg.mjs';
import {verifyFieldEvidence,registerSource} from './bipolar-validation-utils.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),dir=path.join(root,'docs/axon-interface');
const productionRoot=path.resolve(process.env.STAGE1_PRODUCTION_ROOT||root),fieldPath=path.resolve(process.env.STAGE1_FIELD_MODULE||path.join(productionRoot,'src/lib/axon-interface/field-stage1.mjs'));
const readModule=p=>import(pathToFileURL(p)),prototype=process.env.STAGE1_FIELD_EXPLORATORY!=='false';
const [{normalizeStage1Settings},{createStage1Cohort},{stage1FieldSettings,stage1PhaseAverage,propagatedArmOutput},fieldAPI]=await Promise.all([
  readModule(path.join(productionRoot,'src/lib/axon-interface/stage1-settings.mjs')),readModule(path.join(productionRoot,'src/lib/axon-interface/identities.mjs')),
  readModule(path.join(productionRoot,'src/lib/axon-interface/stage1-protocol.mjs')),readModule(fieldPath)
]);
const acceptance=JSON.parse(fs.readFileSync(path.join(dir,'bipolar-soma-spatial-acceptance.json'))),limits=acceptance.limits;
const input=normalizeStage1Settings({axonCount:4,channelCount:1,amplitudeUa:1,dtMs:acceptance.fixedDtMs,equilibrationMs:acceptance.equilibrationMs,durationMs:acceptance.durationMs,sampleDtMs:.005,somaSegments:1});
const geometry=createStage1Cohort(input),cell=geometry.cells[0],channel=geometry.channels[0],baseMorphology=createBipolarMorphology({...input,somaSegments:1});
const namedPaths={
  'src/lib/axon-interface/mrg.mjs':path.join(root,'src/lib/axon-interface/mrg.mjs'),'src/lib/axon-interface/bipolar.mjs':path.join(root,'src/lib/axon-interface/bipolar.mjs'),
  'src/lib/axon-interface/field-stage1.mjs':fieldPath,'src/lib/axon-interface/field.mjs':path.join(path.dirname(fieldPath),'field.mjs'),
  'scripts/axon-interface/bipolar-validation-utils.mjs':path.join(root,'scripts/axon-interface/bipolar-validation-utils.mjs'),'scripts/axon-interface/bipolar-soma-spatial.mjs':fileURLToPath(import.meta.url),'docs/axon-interface/bipolar-soma-spatial-acceptance.json':path.join(dir,'bipolar-soma-spatial-acceptance.json')};
for(const name of ['stage1-settings.mjs','stage1-protocol.mjs','settings.mjs','identities.mjs','metrics.mjs'])namedPaths['src/lib/axon-interface/'+name]=path.join(productionRoot,'src/lib/axon-interface',name);
const fieldEvidence=verifyFieldEvidence({fieldPath,fieldVersion:fieldAPI.FIELD_STAGE1_VERSION,paths:namedPaths});
if(!prototype&&!fieldEvidence.validated)throw new Error('Authoritative soma study requires current passing field evidence: '+fieldEvidence.failures.join('; '));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),sourceHashes=Object.fromEntries(Object.entries(namedPaths).map(([k,p])=>[k,hash(p)]));
const started=performance.now(),model=fieldAPI.createStage1FieldModel(stage1FieldSettings(input,baseMorphology),{cells:geometry.cells,wells:geometry.wells,morphology:baseMorphology,constructPresent:true});
const solution=fieldAPI.solveStage1Channel(model,channel),levels=[],comparisons=[],allRuns=new Map();
const sum=a=>a.reduce((s,v)=>s+v,0),ptp=a=>Math.max(...a)-Math.min(...a);
const controls=['assigned','soma-only-silenced','initiation-region-silenced','whole-cell-silenced'];
const family=(m,run)=>{if(!run.events.length)return 'none';const first=run.events.reduce((a,b)=>a.timeMs<b.timeMs?a:b),c=m.compartments[first.compartmentIndex];return c.kind==='SOMA'?'soma':c.kind==='STEM'?'stem':m.initiationRegionIndices.includes(c.index)?'heminode':'distal-node';};
const classify=(m,run)=>Object.fromEntries(['peripheral','central'].map(arm=>[arm,propagatedArmOutput(run,m,arm,{notBeforeMs:input.stimulusStartMs})]));
function report(complete=false){
  const changed=Object.entries(namedPaths).filter(([k,p])=>sourceHashes[k]!==hash(p)).map(([k])=>k),passingPairs=comparisons.map(c=>c.passed);
  let supportedSomaSegments=null;for(let i=0;i<passingPairs.length-1;i++)if(passingPairs[i]&&passingPairs[i+1]){supportedSomaSegments=acceptance.somaSubdivisions[i];break;}
  const result={schema:'buildthesimulation.bipolar.soma-spatial.v1',generatedAt:new Date().toISOString(),complete,exploratory:prototype,modelVersion:BIPOLAR_VERSION,membraneVersion:MRG_VERSION,fieldVersion:fieldAPI.FIELD_STAGE1_VERSION,
    fieldValidated:fieldEvidence.validated,fieldEvidence,acceptance,settings:input,cell,channel,fieldSettings:model.settings,fieldDiagnostics:solution.diagnostics,pairArtifactMvPerUa:solution.pairArtifactMvPerUa,
    sourceHashes,sourceChangedDuringRun:changed,levels,comparisons,supportedSomaSegments,numericalComparisonsPassed:complete&&changed.length===0&&supportedSomaSegments!==null,
    authoritative:complete&&!prototype&&fieldEvidence.validated&&changed.length===0&&supportedSomaSegments!==null,elapsedSeconds:(performance.now()-started)/1000,
    limitations:['The soma is split axially into spherical surface bands; circumferential nonlinear membrane polarization is not represented.','The identical field matrix/solution is reused at all soma resolutions; external geometry is fixed.',fieldEvidence.validated?'Field numerical evidence is current; numerical verification does not establish biological calibration.':'Prototype field source is exploratory until its separate numerical reference gates and final source hashes are verified.']};
  const file=prototype?'bipolar-soma-spatial-prototype.json':'bipolar-soma-spatial-report.json';fs.writeFileSync(path.join(dir,file),JSON.stringify(result,null,2)+'\n');
  if(complete)fs.appendFileSync(path.join(dir,'bipolar-soma-spatial-history.jsonl'),JSON.stringify(result)+'\n');return result;
}
for(const somaSegments of acceptance.somaSubdivisions){
  const m=createBipolarMorphology({...input,somaSegments}),T=Array.from(fieldAPI.sampleMembraneTransfer(solution,m,cell));
  if(T.length!==m.compartments.length||!T.every(Number.isFinite))throw new Error('Surface transfer shape or finite-value failure.');
  const common={morphology:m,dtMs:input.dtMs,durationMs:input.durationMs,equilibrationMs:input.equilibrationMs,traceStride:Math.round(input.sampleDtMs/input.dtMs),saveCurrents:true,maxEventsPerNode:8};
  const zero=simulateCable({...common,saveCurrents:false}),cases=[],runs=new Map();
  for(const amplitudeUa of acceptance.amplitudeGridUa){
    const s={...input,amplitudeUa},group=[];
    for(const intervention of controls){
      const silencedCompartments=intervention==='soma-only-silenced'?m.somaIndices:intervention==='initiation-region-silenced'?m.initiationRegionIndices:intervention==='whole-cell-silenced'?m.activeSiteIndices:[];
      try{
        const run=simulateCable({...common,transferMvPerUa:T,waveform:t=>stage1PhaseAverage(s,t),initialState:zero.initialState,silencedCompartments});
        const nodeMv=m.nodeIndices.map(i=>run.membraneMv[run.recordIndices.indexOf(i)]),recordingUv=run.outerCurrentsNa.map(row=>sum(row.map((v,i)=>v*T[i]))),arms=classify(m,run);
        const row={amplitudeUa,intervention,status:'computed',crossings:run.events.length,somaCrossings:run.events.filter(e=>m.somaIndices.includes(e.compartmentIndex)).length,firstCrossingRoleFamily:family(m,run),arms,
          recordingPeakToPeakUv:ptp(recordingUv),minimumMv:run.diagnostics.minMv,maximumMv:run.diagnostics.maxMv,maxCurrentResidualNa:run.diagnostics.maxCurrentResidualNa};
        cases.push(row);group.push(row);runs.set(`${amplitudeUa}/${intervention}`,{row,timesMs:run.timesMs,nodeMv,nodeEventTimes:run.nodeEventTimes,recordingUv});
      }catch(error){const row={amplitudeUa,intervention,status:'failed solve',error:error.message};cases.push(row);group.push(row);runs.set(`${amplitudeUa}/${intervention}`,{row});}
    }
    const assigned=group.find(x=>x.intervention==='assigned'),somaBlock=group.find(x=>x.intervention==='soma-only-silenced');
    for(const row of group)row.somaNecessity=assigned.status==='computed'&&somaBlock.status==='computed'?Object.fromEntries(['peripheral','central'].map(a=>[a,assigned.arms[a].recruited&&!somaBlock.arms[a].recruited])):null;
  }
  const somaArea=sum(m.somaIndices.map(i=>m.compartments[i].areaCm2)),somaMeanTransfer=sum(m.somaIndices.map(i=>T[i]*m.compartments[i].areaCm2))/somaArea;
  levels.push({somaSegments,compartments:m.compartments.length,activeSites:m.activeSiteIndices.length,somaTransferMvPerUa:m.somaIndices.map(i=>T[i]),somaAreaWeightedMeanMvPerUa:somaMeanTransfer,cases});allRuns.set(somaSegments,runs);
  if(levels.length>1){
    const previous=levels.at(-2).somaSegments,prior=allRuns.get(previous),details=[];
    for(const [key,b] of runs){
      const a=prior.get(key);if(a.row.status!=='computed'||b.row.status!=='computed'){details.push({case:key,passed:false,error:'At least one numerical solve failed.',statusA:a.row.status,statusB:b.row.status});continue;}
      const exactTimes=a.timesMs.length===b.timesMs.length&&a.timesMs.every((t,i)=>t===b.timesMs[i]);
      if(!exactTimes)throw new Error('Spatial study observation grids differ; no timestamp changes permitted.');
      const rms=a.nodeMv.map((v,n)=>Math.sqrt(sum(v.map((x,k)=>(x-b.nodeMv[n][k])**2))/v.length)),maxRms=Math.max(...rms);
      const sameCounts=a.nodeEventTimes.every((v,n)=>v.length===b.nodeEventTimes[n].length);let maxTiming=sameCounts?0:null,unmatchedCrossings=0;
      for(let n=0;n<a.nodeEventTimes.length;n++){unmatchedCrossings+=Math.abs(a.nodeEventTimes[n].length-b.nodeEventTimes[n].length);if(sameCounts)for(let k=0;k<a.nodeEventTimes[n].length;k++)maxTiming=Math.max(maxTiming,Math.abs(a.nodeEventTimes[n][k]-b.nodeEventTimes[n][k]));}
      const classificationEqual=['peripheral','central'].every(arm=>a.row.arms[arm].recruited===b.row.arms[arm].recruited),necessityEqual=JSON.stringify(a.row.somaNecessity)===JSON.stringify(b.row.somaNecessity);
      const firstRoleEqual=a.row.firstCrossingRoleFamily===b.row.firstCrossingRoleFamily;
      const delays={};for(const arm of ['peripheral','central'])if(a.row.arms[arm].recruited&&b.row.arms[arm].recruited){const aa=a.row.arms[arm].times,bb=b.row.arms[arm].times;delays[arm]=Math.abs((aa[2]-aa[0])-(bb[2]-bb[0]))/Math.abs(bb[2]-bb[0]);}
      const peakDifference=Math.abs(a.row.recordingPeakToPeakUv-b.row.recordingPeakToPeakUv),peakRelative=peakDifference/Math.max(Math.abs(b.row.recordingPeakToPeakUv),1e-300);
      const passed=classificationEqual&&necessityEqual&&firstRoleEqual&&sameCounts&&maxRms<=limits.commonNodeWaveformRmsMv&&maxTiming<=limits.commonNodeCrossingTimeMs&&Object.values(delays).every(v=>v<=limits.orderedConductionDelayRelative)&&(peakRelative<=limits.recordingPeakToPeakRelative||peakDifference<=limits.recordingAbsoluteToleranceUv);
      details.push({case:key,passed,exactObservationTimestamps:true,classificationEqual,somaNecessityEqual:necessityEqual,firstCrossingRoleFamilyEqual:firstRoleEqual,trueNodeCrossingCountsEqual:sameCounts,unmatchedCrossings,commonNodeMaxRmsMv:maxRms,commonNodeMaxCrossingDeltaMs:maxTiming,conductionRelative:delays,recordingPeakToPeakRelative:peakRelative,recordingPeakDifferenceUv:peakDifference});
    }
    comparisons.push({from:previous,to:somaSegments,passed:details.every(d=>d.passed),details});
  }
  console.log(JSON.stringify({somaSegments,cases:cases.length,failedSolves:cases.filter(x=>x.status!=='computed').length,lastComparison:comparisons.at(-1)?.passed}));report(false);
}
const final=report(true);console.log(JSON.stringify({complete:true,exploratory:prototype,supportedSomaSegments:final.supportedSomaSegments,sourceChangedDuringRun:final.sourceChangedDuringRun,comparisons:comparisons.map(c=>({from:c.from,to:c.to,passed:c.passed,failedCases:c.details.filter(d=>!d.passed).map(d=>d.case)})),seconds:final.elapsedSeconds},null,2));
if(!final.numericalComparisonsPassed)process.exitCode=1;
