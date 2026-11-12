#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createMorphology,simulateCable,MRG_VERSION} from '../../src/lib/axon-interface/mrg.mjs';
import {createBipolarMorphology,createNativeStumpMorphologies,BIPOLAR_VERSION} from '../../src/lib/axon-interface/bipolar.mjs';
import * as baselineMotor from './mrg-motor-baseline.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..'),dir=path.join(root,'docs/axon-interface'),raw=path.join(dir,'bipolar-reference-data');fs.mkdirSync(raw,{recursive:true});
const acceptance=JSON.parse(fs.readFileSync(path.join(dir,'bipolar-acceptance.json'))),limits=acceptance.limits;
const correction=JSON.parse(fs.readFileSync(path.join(dir,'bipolar-resolution-correction.json'))),BASE_DT=correction.productionCandidateDtMs;
const sources=['src/lib/axon-interface/mrg.mjs','src/lib/axon-interface/bipolar.mjs','scripts/axon-interface/bipolar-validate.mjs','scripts/axon-interface/bipolar-reference.py','scripts/axon-interface/mrg-motor-baseline.mjs','scripts/axon-interface/mrg-modeldb/AXNODE.mod','docs/axon-interface/bipolar-acceptance.json','docs/axon-interface/bipolar-resolution-correction.json'];
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex'),sourceHashes=Object.fromEntries(sources.map(p=>[p,sha(p)]));
const tests=[],sensitivity=[],thresholdGrid=[],nativeComparisons=[],errors=[],started=performance.now();let finished=false;
for(const failed of correction.retainedFailedStudy)tests.push({...failed,required:false,retainedFailureId:correction.failureId});
const sum=a=>a.reduce((s,v)=>s+v,0),ptp=a=>Math.max(...a)-Math.min(...a);
function add(name,value,limit,unit,details={},required=true){const pass=typeof limit==='number'?Number.isFinite(value)&&value<=limit:value===limit;tests.push({name,status:pass?'pass':'fail',measured:typeof value==='number'&&!Number.isFinite(value)?null:value,nonFinite:typeof value==='number'&&!Number.isFinite(value),limit,unit,required,...details});}
function save(){
  const changed=sources.filter(p=>sourceHashes[p]!==sha(p));
  const report={schema:'buildthesimulation.bipolar.numerical.v1',modelVersion:BIPOLAR_VERSION,membraneVersion:MRG_VERSION,generatedAt:new Date().toISOString(),complete:finished,acceptance,resolutionCorrection:correction,supportedDtMs:BASE_DT,retainedFailures:[correction],sourceHashes,sourceChangedDuringRun:changed,tests,sensitivity,thresholdGrid,nativeComparisons,errors,
    summary:{requiredPass:tests.filter(t=>t.required&&t.status==='pass').length,requiredFail:tests.filter(t=>t.required&&t.status==='fail').length,numericalGatePassed:finished&&errors.length===0&&changed.length===0&&tests.every(t=>!t.required||t.status==='pass'),biologicalValidation:false,humanSgCalibration:false},
    runtime:{node:process.version,platform:os.platform(),cpu:os.cpus()[0]?.model,elapsedSeconds:(performance.now()-started)/1000},
    limitations:['Soma/stem geometry and channel densities are explicit hypothetical choices, not human or engineered-cell fits.','The soma is a lumped equivalent cylinder with exposed spherical-band area; circumferential nonlinear membrane polarization is unresolved.','Native NEURON agreement verifies the stated equations; negative sensitivity or causal outcomes are not suppressed.','Analytic extracellular coefficients in this component test do not replace the separate insulating-well/FEM reference fixture.']};
  fs.writeFileSync(path.join(dir,'bipolar-numerical-report.json'),JSON.stringify(report,null,2)+'\n');
  if(finished||errors.length)fs.appendFileSync(path.join(dir,'bipolar-validation-history.jsonl'),JSON.stringify(report)+'\n');
  return report;
}
function waveform(t){const a=.5,w=.1,g=.025;return t>=a&&t<a+w?-10:t>=a+w+g&&t<a+2*w+g?10:0;}
function transfer(m){return m.compartments.map(c=>1000/(4*Math.PI*.3)*(1/Math.hypot(30,c.zUm)-1/Math.hypot(600,c.zUm)));}
function run(m,dt=BASE_DT,{mode='injected',amplitudeNa=10,silencedCompartments=[],initialState,saveCurrents=true,durationMs=6,recordIndices=m.activeSiteIndices}={}){
  return simulateCable({morphology:m,dtMs:dt,durationMs,equilibrationMs:50,traceStride:Math.round(.005/dt),recordIndices,saveCurrents,initialState,silencedCompartments,
    ...(mode==='injected'?{injectedCurrentNa:(t,i)=>i===m.somaIndex&&t>=.5&&t<.6?amplitudeNa:0}:mode==='field'?{transferMvPerUa:transfer(m),waveform}:{}),maxEventsPerNode:8});
}
function compare(a,b){
  const exactObservationTimestamps=a.timesMs.length===b.timesMs.length&&a.timesMs.every((t,i)=>t===b.timesMs[i]);
  if(!exactObservationTimestamps)throw new Error('Reference grids differ; no interpolation, alignment or timestamp transformation is allowed.');
  const rms=a.membraneMv.map((v,n)=>Math.sqrt(sum(v.map((x,k)=>(x-b.membraneMv[n][k])**2))/v.length));
  const aa=a.activeSiteEventTimes??a.nodeEventTimes,bb=b.activeSiteEventTimes??b.nodeEventTimes,counts=aa.length===bb.length&&aa.every((v,n)=>v.length===bb[n].length);
  let timing=0;for(let n=0;n<aa.length;n++)for(let k=0;k<aa[n].length;k++)timing=Math.max(timing,Math.abs(aa[n][k]-(bb[n]?.[k]??1e99)));
  return {exactObservationTimestamps,maximumSiteRmsMv:Math.max(...rms),rmsPerSiteMv:rms,identicalCrossingCounts:counts,maximumCrossingTimeErrorMs:timing};
}
function recording(m,r){const weights=m.compartments.map(c=>1000/(4*Math.PI*.3*Math.hypot(100,c.zUm-1000)));return r.outerCurrentsNa.map(a=>sum(a.map((v,i)=>v*weights[i])));}
function drift(r){return Math.max(...r.membraneMv.map(a=>Math.max(...a.map(v=>Math.abs(v-a[0])))));}
function armResult(m,r,arm){const ordinals=m.armMonitors[arm]?.nodeOrdinals??[],times=ordinals.map(n=>r.nodeEventTimes[n][0]??null),ordered=times.length===3&&times.every(Number.isFinite)&&times.every((t,i)=>!i||t>times[i-1]);return {ordered,timesMs:times,delayMs:ordered?times[2]-times[0]:null};}
try{
  // Exact regression against the immutable, freshly verified motor source.
  const oldM=baselineMotor.createMorphology(),newM=createMorphology();
  const motorOptions=m=>({morphology:m,dtMs:.00125,durationMs:3,traceStride:4,equilibrationMs:20,injectedCurrentNa:(t,i)=>i===m.nodeIndices[5]&&t>=.5&&t<.6?2:0,saveCurrents:true});
  const old=baselineMotor.simulateCable(motorOptions(oldM)),current=simulateCable(motorOptions(newM));
  add('Original motor membrane/current/event outputs remain bit-for-bit unchanged',JSON.stringify([old.membraneMv,old.outerCurrentsNa,old.nodeEventTimes,old.initialState])===JSON.stringify([current.membraneMv,current.outerCurrentsNa,current.nodeEventTimes,current.initialState]),true,'boolean',{baselineSha256:sha('scripts/axon-interface/mrg-motor-baseline.mjs')});
  const m=createBipolarMorphology(),rest=run(m,BASE_DT,{mode:'zero',saveCurrents:false}),nominal=run(m);
  add('Nominal bipolar zero-input drift',drift(rest),limits.zeroInputDriftMv,'mV',{preparationMs:50});add('Nominal bipolar zero-input crossings at all active sites',rest.events.length,0,'crossings');
  add('Nominal cable current balance',nominal.diagnostics.maxCurrentResidualNa,limits.chargeConservationNa,'nA');
  for(const arm of ['peripheral','central'])add(`Somatic 10 nA benchmark has ordered ${arm} propagation`,armResult(m,nominal,arm).ordered,true,'boolean',{diagnostic:armResult(m,nominal,arm)});
  const temporal=[nominal,run(m,BASE_DT/2),run(m,BASE_DT/4)];
  for(let k=1;k<temporal.length;k++){
    const q=compare(temporal[k-1],temporal[k]);add(`Temporal ${temporal[k-1].dtMs}→${temporal[k].dtMs}: maximum active-site RMS`,q.maximumSiteRmsMv,limits.timeHalvingMaxSiteRmsMv,'mV',{rmsPerSiteMv:q.rmsPerSiteMv});
    add(`Temporal level ${k}: identical all-site crossing counts`,q.identicalCrossingCounts,true,'boolean');add(`Temporal level ${k}: crossing timing`,q.maximumCrossingTimeErrorMs,limits.timeHalvingCrossingTimeMs,'ms');
  }
  const spatial=[3,5,7].map(n=>{const morphology=createBipolarMorphology({passiveSegments:n,stemSegments:n});return {m:morphology,r:run(morphology,.000625)}});
  for(let k=1;k<spatial.length;k++){
    const a=spatial[k-1],b=spatial[k];
    for(const arm of ['peripheral','central']){const da=armResult(a.m,a.r,arm),db=armResult(b.m,b.r,arm),error=da.ordered&&db.ordered?Math.abs(da.delayMs-db.delayMs)/Math.abs(db.delayMs):Infinity;
      add(`Spatial ${a.m.passiveSegments}→${b.m.passiveSegments}: ${arm} conduction delay`,error,limits.spatialConductionRelative,'fraction',{delaysMs:[da.delayMs,db.delayMs]});}
    const pa=ptp(recording(a.m,a.r)),pb=ptp(recording(b.m,b.r));add(`Spatial ${a.m.passiveSegments}→${b.m.passiveSegments}: reciprocal recording`,Math.abs(pa-pb)/Math.abs(pb),limits.spatialRecordingPeakToPeakRelative,'fraction',{peaksUv:[pa,pb]});
  }
  for(const amplitudeNa of acceptance.numericalStudies.somaCurrentGridNa){const r=run(m,BASE_DT,{amplitudeNa,saveCurrents:false,initialState:rest.initialState});thresholdGrid.push({amplitudeNa,central:armResult(m,r,'central'),peripheral:armResult(m,r,'peripheral'),crossings:r.events.length,somaCrossings:r.events.filter(e=>e.compartmentIndex===m.somaIndex).length,firstEventRole:r.events.length?r.events.reduce((a,b)=>a.timeMs<b.timeMs?a:b).role:null});}
  const hypotheses=[];
  for(const key of ['somaDiameterUm','somaActiveScale','stemActiveScale'])for(const value of acceptance.sensitivity[key])if(value!==m.parameters[key])hypotheses.push({key,value,settings:{[key]:value}});
  for(const mult of acceptance.sensitivity.stemLengthMultiplier)if(mult!==1)hypotheses.push({key:'stemLengthMultiplier',value:mult,settings:{peripheralStemLengthUm:30*mult,centralStemLengthUm:50*mult}});
  for(const mult of acceptance.sensitivity.stemDiameterMultiplier)if(mult!==1)hypotheses.push({key:'stemDiameterMultiplier',value:mult,settings:{peripheralStemDiameterUm:1.5*mult,centralStemDiameterUm:2.5*mult}});
  for(const hypothesis of hypotheses){
    try{const mh=createBipolarMorphology(hypothesis.settings),zero=run(mh,BASE_DT,{mode:'zero',saveCurrents:false}),drive=run(mh,BASE_DT,{initialState:zero.initialState,saveCurrents:false});
      sensitivity.push({...hypothesis,zeroInputDriftMv:drift(zero),zeroInputCrossings:zero.events.length,quiescent:drift(zero)<=limits.zeroInputDriftMv&&zero.events.length===0,central:armResult(mh,drive,'central'),peripheral:armResult(mh,drive,'peripheral'),drivenCrossings:drive.events.length,somaCrossings:drive.events.filter(e=>e.compartmentIndex===mh.somaIndex).length,status:'computed'});
    }catch(error){sensitivity.push({...hypothesis,status:'failed hypothesis',error:error.message});}
    save();
  }
  const stumps=createNativeStumpMorphologies(m);
  for(const [arm,stump] of Object.entries(stumps)){const zero=run(stump,BASE_DT,{mode:'zero',saveCurrents:false});add(`No-construct ${arm} stump zero-input drift`,drift(zero),limits.zeroInputDriftMv,'mV');add(`No-construct ${arm} stump zero-input crossings`,zero.events.length,0,'crossings');add(`No-construct ${arm} stump has no connection across removed region`,stump.connectedAcrossRemovedRegion,false,'boolean');}
  const referenceCases=[{id:'nominal-soma-injected',m,mode:'injected'},{id:'nominal-extracellular',m,mode:'field'},
    {id:'initiation-region-silenced',m,mode:'injected',silencedCompartments:m.initiationRegionIndices},
    {id:'whole-cell-silenced',m,mode:'injected',silencedCompartments:m.activeSiteIndices},
    {id:'passive-soma',m:createBipolarMorphology({somaActiveScale:0}),mode:'injected'},
    {id:'native-central-stump',m:stumps.central,mode:'field',nativeStump:'central'}];
  for(const rc of referenceCases){
    const dt=BASE_DT,durationMs=6,fixture={parameters:rc.m.parameters,dtMs:dt,durationMs,equilibrationMs:50,traceStride:Math.round(.005/dt),saveCurrents:true,recordIndices:rc.m.activeSiteIndices,silencedCompartments:rc.silencedCompartments??[],...(rc.nativeStump?{nativeStump:rc.nativeStump}:{})};
    if(rc.mode==='injected'){fixture.injectedCompartment=rc.m.somaIndex;fixture.injectedWaveformNa=Array.from({length:durationMs/dt},(_,k)=>k*dt>=.5&&k*dt<.6?10:0);}
    else{fixture.transferMvPerUa=transfer(rc.m);fixture.waveformUa=Array.from({length:durationMs/dt},(_,k)=>waveform(k*dt));}
    const input=path.join(raw,rc.id+'-input.json'),output=path.join(raw,rc.id+'-neuron.json');fs.writeFileSync(input,JSON.stringify(fixture));
    const child=spawnSync(process.env.MRG_PYTHON||'python3',[path.join(here,'bipolar-reference.py'),input,output],{encoding:'utf8',timeout:120000});
    if(child.status!==0){add(`Native NEURON ${rc.id} executed`,false,true,'boolean',{error:child.stderr||child.error?.message||child.stdout});continue;}
    const native=JSON.parse(fs.readFileSync(output)),js=run(rc.m,dt,{mode:rc.mode,silencedCompartments:rc.silencedCompartments??[]}),q=compare(js,native),a=recording(rc.m,js),b=recording(rc.m,native),recordingError=Math.max(...a.map((v,k)=>Math.abs(v-b[k])));
    add(`Native NEURON ${rc.id}: all-site RMS`,q.maximumSiteRmsMv,limits.nativeMaxSiteRmsMv,'mV');add(`Native NEURON ${rc.id}: all-site crossing counts`,q.identicalCrossingCounts,true,'boolean');add(`Native NEURON ${rc.id}: crossing times`,q.maximumCrossingTimeErrorMs,limits.nativeCrossingTimeMs,'ms');add(`Native NEURON ${rc.id}: reciprocal recording`,recordingError,limits.nativeRecordingMaxErrorUv,'uV');
    nativeComparisons.push({id:rc.id,...q,maxRecordingErrorUv:recordingError,jsCrossings:js.events.length,nativeCrossings:sum(native.activeSiteEventTimes.map(a=>a.length)),runtime:native.runtime,silencedCompartments:fixture.silencedCompartments});
    fs.writeFileSync(path.join(raw,rc.id+'-comparison.json'),JSON.stringify({timesMs:js.timesMs,recordIndices:js.recordIndices,jsMembraneMv:js.membraneMv,nativeMembraneMv:native.membraneMv,jsRecordingUv:a,nativeRecordingUv:b}));save();
  }
  finished=true;
}catch(error){errors.push({message:error.message,stack:error.stack});finished=true;}
const report=save();console.log(JSON.stringify({summary:report.summary,tests:report.tests,sensitivity:report.sensitivity,thresholdGrid:report.thresholdGrid,errors:report.errors,elapsedSeconds:report.runtime.elapsedSeconds},null,2));if(!report.summary.numericalGatePassed)process.exitCode=1;
