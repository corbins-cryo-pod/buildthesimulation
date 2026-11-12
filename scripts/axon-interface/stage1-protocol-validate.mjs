#!/usr/bin/env node
/** Actual Stage 1 protocol validation. No field or membrane surrogate is used.
 * Each fixture runs in a separate process so its measured peak RSS is attributable
 * to that fixture. Full regenerable results are written outside the repository.
 * This script does not inherit acceptance from the retained motor benchmark. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { runStage1Protocol, buildStage1Morphology, stage1PhaseAverage } from '../../src/lib/axon-interface/stage1-protocol.mjs';
import { normalizeStage1Settings, STAGE1_MODEL_VERSION } from '../../src/lib/axon-interface/stage1-settings.mjs';
import { createNativeStumpMorphologies } from '../../src/lib/axon-interface/bipolar.mjs';
import { validateStage1Budget } from '../../src/lib/axon-interface/stage1-settings.mjs';
import { resultJSON, importSettings, matrixCSV, eventCSV, timeSeriesCSV, cascadeCSV } from '../../src/lib/axon-interface/export.mjs';
import { gzipSync } from 'node:zlib';

const script=fileURLToPath(import.meta.url),root=path.resolve(path.dirname(script),'../..');
const defaultReport=path.join(root,'docs/axon-interface/stage1-protocol-validation.json');
const fixtures=Object.freeze({
  small:Object.freeze({axonCount:4,channelCount:1,fascicleRadiusUm:250,amplitudeUa:.5}),
  full:Object.freeze({axonCount:256,channelCount:1,fascicleRadiusUm:350,amplitudeUa:.5})
});
const interventions=Object.freeze(['assigned','localSilenced','wholeSilenced','somaSilenced']);
const sourcePaths=Object.freeze([
  'src/lib/axon-interface/stage1-settings.mjs','src/lib/axon-interface/identities.mjs','src/lib/axon-interface/stage1-protocol.mjs',
  'src/lib/axon-interface/settings.mjs','src/lib/axon-interface/geometry.mjs','src/lib/axon-interface/metrics.mjs',
  'src/lib/axon-interface/mrg.mjs','src/lib/axon-interface/bipolar.mjs','src/lib/axon-interface/field.mjs','src/lib/axon-interface/field-stage1.mjs',
  'src/lib/axon-interface/vendor/cdt2d.mjs','src/lib/axon-interface/vendor/cdt2d-source-pins.json','src/lib/axon-interface/vendor/THIRD_PARTY_LICENSES.md',
  'src/lib/axon-interface/export.mjs','tests/axon-interface-stage1-contracts.mjs','scripts/axon-interface/stage1-protocol-validate.mjs'
]);
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const hashSources=()=>Object.fromEntries(sourcePaths.map(name=>[name,sha(fs.readFileSync(path.join(root,name)))]));
const changed=(a,b)=>Object.keys(a).filter(key=>a[key]!==b[key]);
const json=value=>JSON.stringify(value,(_key,item)=>ArrayBuffer.isView(item)?Array.from(item):item,2)+'\n';
function writeJSON(filename,value){fs.mkdirSync(path.dirname(filename),{recursive:true});const temporary=filename+'.tmp-'+process.pid;fs.writeFileSync(temporary,json(value));fs.renameSync(temporary,filename);}
function parsedArgs(){const result={};for(let i=2;i<process.argv.length;i++){const key=process.argv[i];if(key==='--small-only'){result.smallOnly=true;continue;}if(!['--fixture','--child-report','--report','--artifacts-dir'].includes(key)||!process.argv[i+1])throw new Error('Supported flags: --small-only, --report PATH, --artifacts-dir PATH; internal --fixture NAME --child-report PATH.');result[key.slice(2)]=process.argv[++i];}return result;}
function checksFor(result,name){
  const tests=[];
  const check=(id,details,fn)=>{try{fn();tests.push({id:name+'.'+id,status:'pass',details});}catch(error){tests.push({id:name+'.'+id,status:'fail',details,error:String(error.message)});}};
  const s=result.settings,N=s.axonCount,C=s.channelCount;
  check('declared-population','All declared cells, physical wells, contact pairs and isolated input rows are present; no population screening.',()=>{
    assert.equal(result.geometry.cells.length,N);assert.equal(result.geometry.wells.length,N);assert.equal(result.geometry.channels.length,C);
    assert.equal(result.diagnostics.sampledCells,N);assert.equal(result.geometryDiagnostics.physicalWellCount,N);
    assert.equal(new Set(result.geometry.cells.map(c=>c.id)).size,N);assert.equal(new Set(result.geometry.wells.map(w=>w.id)).size,N);
    for(const d of result.field.diagnostics){assert.equal(d.explicitCells,N);assert.equal(d.explicitWells,N);}
  });
  check('complete-four-intervention-matrix','Every isolated channel has every declared cell in each of the four named intervention matrices.',()=>{
    assert.deepEqual(Object.keys(result.matrices).sort(),[...interventions].sort());
    for(const matrix of Object.values(result.matrices)){assert.equal(matrix.length,C);for(const row of matrix){assert.equal(row.length,N);assert.ok(row.every(v=>typeof v==='boolean'));}}
    assert.equal(result.pairTraces.length,N*C);assert.equal(new Set(result.pairTraces.map(p=>p.channel+':'+p.cell)).size,N*C);
    for(const p of result.pairTraces){assert.ok(p.channel>=0&&p.channel<C&&p.cell>=0&&p.cell<N);for(const key of interventions)assert.ok(p[key]?.armPropagation?.central&&p[key]?.armPropagation?.peripheral);}
  });
  check('fixed-original-identity','Original census survives bookkeeping; no introduced identity is counted as an original; strict original yield remains structural zero.',()=>{
    const ledger=result.identities;assert.equal(ledger.originalCensus,N);assert.equal(ledger.original.length,N);assert.equal(ledger.engineered.length,N);
    assert.equal(new Set([...ledger.original,...ledger.engineered].map(x=>x.id)).size,2*N);
    assert.ok(ledger.original.every(x=>x.postoperativeContinuity===false));assert.ok(ledger.engineered.every(x=>x.originalHostIdentity===null&&x.ownsBothProjections));
    assert.equal(result.metrics.originalHostCensus,N);assert.equal(result.metrics.originalHostPreservedCount,0);assert.equal(result.metrics.originalHostY,0);
    assert.equal(result.metrics.biologicalTargetReinnervationYield,null);assert.equal(result.metrics.biologicalSurvivalYield,null);
  });
  check('matched-empty-no-device','The same absent-original-remnant assumption is held; only the construct and implant drive are removed; no membrane recording is invented.',()=>{
    const d=result.comparators.noDevice;assert.equal(result.identities.remnantStateAssumption.b3,result.identities.remnantStateAssumption.noDevice);
    assert.equal(result.identities.remnantStateAssumption.matched,true);assert.equal(d.originalCensus,N);assert.equal(d.continuousOriginalCount,0);assert.equal(d.originalHostY,0);
    for(const key of ['implantedCellIds','wellIds','contactIds','nativeRemnantIds','membraneTraces'])assert.deepEqual(d[key],[]);
    for(const key of ['implantDriveUa','excitablePopulationCount','sourceCurrentNa','fieldPotentialMv','evokedOutputCount'])assert.equal(d[key],0);
    assert.equal(d.recording,null);assert.equal(d.field.diagnostics.constructPresent,false);assert.equal(d.field.diagnostics.explicitCells,0);assert.equal(d.field.diagnostics.explicitWells,0);
  });
  check('viable-stumps-separate','Two executed sealed stump trajectories remain a separately labeled alternative population and never the matched no-device condition.',()=>{
    const d=result.comparators.viableStumpDiagnostic;assert.equal(d.isMatchedNoDevice,false);assert.equal(d.usedToEstimateImplantBenefit,false);assert.equal(d.disconnected.axialConnectionAcrossGap,false);assert.ok(d.disconnected.gapUm>0);
    assert.equal(d.nativeRemnantIds.length,2*N);assert.equal(d.baselineValid,true);
    for(const arm of ['peripheral','central']){assert.equal(d.baselineTraces[arm].events.length,0);assert.equal(d.baselineTraces[arm].timeMs.at(-1),s.durationMs);assert.ok(d.baselineDriftMv[arm]<=result.numericalContract.baselineMaximumDriftMv);}
    assert.ok(result.identities.nativeRemnants.every(x=>x.presentInB3===false&&x.presentInMatchedNoDevice===false));
  });
  check('matched-state-and-all-soma-bands','All four conditions begin at the same equilibrated state; soma-only intervention covers every somatic band.',()=>{
    const state=result.sharedInitialState.engineered.v;
    for(const p of result.pairTraces)for(const key of interventions){const t=p[key];for(let i=0;i<t.indices.length;i++)assert.equal(t.voltageMv[i][0],state[t.indices[i]]);}
    const soma=result.controls.find(c=>c.id==='soma');assert.deepEqual(soma.compartmentIndices,result.morphology.somaIndices);assert.equal(soma.compartmentIndices.length,s.somaSegments);
    const local=result.controls.find(c=>c.id==='local');assert.ok(soma.compartmentIndices.every(index=>local.compartmentIndices.includes(index)));
  });
  check('fixed-observation-window-and-no-clipping','Every retained trajectory spans the requested window, and required current residuals remain finite without clipping.',()=>{
    const traces=[result.baseline,result.localSilencedBaseline,result.wholeSilencedBaseline,result.somaSilencedBaseline,...result.pairTraces.flatMap(p=>interventions.map(k=>p[k]))];
    for(const t of traces){assert.equal(t.timeMs[0],0);assert.equal(t.timeMs.at(-1),s.durationMs);assert.equal(t.timeMs.length,result.workBudget.samplesPerTrace);assert.equal(t.diagnostics.voltageClipping,false);assert.ok(Number.isFinite(t.diagnostics.minMv)&&Number.isFinite(t.diagnostics.maxMv));}
    for(const p of result.pairTraces){assert.ok(Number.isFinite(p.assigned.diagnostics.maxCurrentResidualNa));for(const key of interventions.slice(1))assert.equal(p[key].diagnostics.maxCurrentResidualNa,null);}
  });
  check('controls-and-positive-fixture','The declared positive operating point produces output, zero input is stable, whole-cell intervention removes qualifying propagation, and junction block stays not applicable.',()=>{
    assert.equal(result.auditComplete,true);assert.equal(result.auditValid,true);
    const controls=new Map(result.controls.map(c=>[c.id,c]));for(const id of ['zero','isolation','local','whole','soma','junction','no-construct'])assert.ok(controls.has(id));
    assert.equal(controls.get('junction').status,'not applicable');assert.equal(controls.get('zero').status,'passed');assert.equal(controls.get('whole').status,'passed');assert.equal(controls.get('no-construct').status,'passed');
    assert.ok(result.matrices.assigned.some(row=>row.some(Boolean)));assert.ok(result.matrices.wholeSilenced.every(row=>row.every(v=>!v)));
  });
  check('output-meaning-and-distal-propagation','Reported outputs follow three unsilenced true distal nodes; reported first crossings are observations, not proof of their depolarization source.',()=>{
    for(const pair of result.pairTraces)for(const key of interventions)for(const [arm,p] of Object.entries(pair[key].armPropagation))if(p.recruited){
      assert.equal(p.times.length,3);assert.ok(p.times[0]>=s.stimulusStartMs&&p.times[0]<p.times[1]&&p.times[1]<p.times[2]);
      assert.ok(p.compartmentIndices.every(index=>!result.morphology.initiationRegionIndices.includes(index)));
      assert.deepEqual(p.compartmentIndices,result.morphology.armMonitors[arm].compartmentIndices);
      assert.ok(p.segmentVelocityMps.every(v=>v>=result.numericalContract.propagationMinSegmentVelocityMps&&v<=result.numericalContract.propagationMaxSegmentVelocityMps));
    }
    for(const pair of result.pairTraces)assert.equal(pair.somaActiveConductanceNecessary,pair.assigned.propagation.recruited&&!pair.somaSilenced.propagation.recruited);
    const unique=new Set(result.matrices.assigned.flatMap(row=>{const a=row.flatMap((v,i)=>v?[i]:[]);return a.length===1?a:[];}));assert.equal(result.metrics.engineeredExclusiveCount,unique.size);
  });
  check('recording-window-source-partition','Artifact, known engineered currents and explicitly absent host currents sum instantaneously on the actual preceding solver interval.',()=>{
    for(const r of result.recordings)for(let i=0;i<r.timeMs.length;i++){
      const t=r.timeMs[i],previous=Math.max(0,Math.round(t/s.dtMs)-1)*s.dtMs;assert.equal(r.appliedStepStartMs[i],previous);assert.equal(r.appliedStepEndMs[i],t);
      assert.equal(r.stimulusUa[i],t===0?0:stage1PhaseAverage(s,previous));assert.equal(r.hostUv[i],0);assert.equal(r.totalUv[i],r.artifactUv[i]+r.engineeredUv[i]+r.hostUv[i]);
    }
    assert.equal(result.recordings.length,C);
  });
  check('actual-resource-accounting','Every requested solve is budgeted and every retained scalar is counted; no event, cell, intervention or resolution was dropped.',()=>{
    assert.equal(result.workBudget.engineeredSolves,4*N*C+4);assert.equal(result.workBudget.nativeStumpSolves,2);assert.equal(result.workBudget.cableSolves,4*N*C+6);
    assert.ok(result.workBudget.compartmentSteps<=result.workBudget.caps.maxCompartmentSteps);assert.ok(result.workBudget.actualRetainedValues<=result.workBudget.retainedValues);assert.ok(result.workBudget.savedValues<=result.workBudget.caps.maxSavedValues);
    for(const d of result.field.diagnostics){assert.ok(d.nodes<=result.field.limits.maxNodes);assert.ok(d.tetrahedra<=result.field.limits.maxTetrahedra);assert.ok(d.nonzeros<=result.field.limits.maxNonzeros);assert.ok(d.estimatedBytes<=result.field.limits.maxEstimatedBytes);}
    for(const p of result.pairTraces)for(const key of interventions){const count=new Map();for(const event of p[key].events)count.set(event.compartmentIndex,(count.get(event.compartmentIndex)??0)+1);assert.ok([...count.values()].every(v=>v<=result.workBudget.caps.maxEventsPerNodePerSolve));}
  });
  return tests;
}
function pairSummary(r){return r.pairTraces.map(p=>({channelId:r.geometry.channels[p.channel].id,engineeredId:r.geometry.cells[p.cell].id,
  initiationRegionEligible:p.initiationRegionEligible,somaActiveConductanceNecessary:p.somaActiveConductanceNecessary,
  interventions:Object.fromEntries(interventions.map(key=>[key,{central:p[key].armPropagation.central,peripheral:p[key].armPropagation.peripheral,firstObservedCrossing:p[key].initiatingSite,activeSiteCrossingCount:p[key].events.length}]))}));}
async function childFixture(name,reportPath,artifacts){
  if(!Object.hasOwn(fixtures,name))throw new Error('Unknown fixed protocol fixture.');
  const started=performance.now(),before=hashSources(),settings=normalizeStage1Settings(fixtures[name]),tests=[];
  const summary={status:'running',fixture:name,modelVersion:STAGE1_MODEL_VERSION,settings,sourceHashes:before,tests,startedAt:new Date().toISOString()};
  try{
    const m=buildStage1Morphology(settings),plan=validateStage1Budget(settings,m,createNativeStumpMorphologies(m));
    console.log(JSON.stringify({fixture:name,declaredSettings:fixtures[name],membraneCompartments:m.compartments.length,activeSites:m.activeSiteIndices.length,plan}));
    let last=-Infinity;
    const result=await runStage1Protocol(settings,{onProgress:p=>{if(performance.now()-last>10000||p.fraction===1){last=performance.now();console.log(JSON.stringify({fixture:name,progress:p.fraction,phase:p.phase}));}}});
    tests.push(...checksFor(result,name));
    const exported=resultJSON(result),parsed=JSON.parse(exported);assert.deepEqual(importSettings(exported),settings);assert.deepEqual(parsed.matrices,result.matrices);assert.deepEqual(parsed.identities,JSON.parse(json(result.identities)));
    const csvOutputs={matrix:matrixCSV(result),events:eventCSV(result),timeseries:timeSeriesCSV(result),cascade:cascadeCSV(result)};
    assert.equal(csvOutputs.matrix.split('\n').length-1,4*settings.channelCount);
    assert.equal(csvOutputs.timeseries.split('\n').length-1,settings.channelCount*result.workBudget.samplesPerTrace);
    tests.push({id:name+'.exports',status:'pass',details:'Complete JSON preserves identities and matrices, imported settings are exact, and CSV rows retain every intervention and fixed-window sample.'});
    fs.mkdirSync(artifacts,{recursive:true});const rawPath=path.join(artifacts,name+'-cohort-result.json.gz'),compressed=gzipSync(exported);fs.writeFileSync(rawPath,compressed);
    for(const [key,value] of Object.entries(csvOutputs))fs.writeFileSync(path.join(artifacts,name+'-'+key+'.csv'),value);
    Object.assign(summary,{cohortCount:settings.axonCount,physicalWellCount:result.geometry.wells.length,channelCount:settings.channelCount,
      membraneCompartmentCount:result.morphology.compartments.length,activeSiteCount:result.morphology.activeSiteIndices.length,
      resolvedCellChannelPairs:result.pairTraces.length,completedInterventionSolves:result.pairTraces.length*4,
      noSkippedCells:result.pairTraces.length===settings.axonCount*settings.channelCount,noSkippedControls:result.pairTraces.every(p=>interventions.every(k=>p[k]?.timeMs?.length)),
      auditValid:result.auditValid,modelComponents:result.modelComponents,metrics:result.metrics,matrices:result.matrices,initiationEligibility:result.initiationEligibility,
      matrixCounts:Object.fromEntries(Object.entries(result.matrices).map(([key,rows])=>[key,rows.map(row=>row.filter(Boolean).length)])),
      identitySummary:{originalCensus:result.identities.originalCensus,originalContinuousCount:result.metrics.originalHostPreservedCount,originalHostY:result.metrics.originalHostY,
        originalIds:result.identities.original.map(x=>x.id),engineeredIds:result.identities.engineered.map(x=>x.id),engineeredOriginalIdentities:result.identities.engineered.map(x=>x.originalHostIdentity),
        originalRemnantState:result.identities.remnantStateAssumption,biologicalGrowthSolved:result.identities.biologicalGrowthSolved,targetReinnervationYield:null,survivalYield:null},
      controls:result.controls,perChannelCellControlSummary:pairSummary(result),
      noDevice:result.comparators.noDevice,viableStumpDiagnostic:{isMatchedNoDevice:false,usedToEstimateImplantBenefit:false,baselineValid:result.comparators.viableStumpDiagnostic.baselineValid,baselineDriftMv:result.comparators.viableStumpDiagnostic.baselineDriftMv,disconnected:result.comparators.viableStumpDiagnostic.disconnected},
      workBudget:result.workBudget,field:{limits:result.field.limits,settings:result.field.settings,diagnostics:result.field.diagnostics,contacts:result.field.contacts},
      numericalContract:result.numericalContract,diagnostics:result.diagnostics,limitations:result.limitations,
      rawResult:{path:rawPath,compression:'gzip',sha256:sha(compressed),uncompressedSha256:sha(exported),compressedBytes:compressed.length,uncompressedBytes:Buffer.byteLength(exported),committed:false,regeneration:'Run this validator with the same source hashes and settings.'},
      csvExports:Object.fromEntries(Object.entries(csvOutputs).map(([key,value])=>[key,{sha256:sha(value),bytes:Buffer.byteLength(value),dataRows:value.split('\n').length-1}]))});
  }catch(error){tests.push({id:name+'.execution',status:'fail',details:'The requested fixture failed without downsampling, clipping, dropped controls or replacement data.',error:String(error?.stack??error)});summary.failure=String(error?.message??error);}
  const after=hashSources(),paths=changed(before,after);summary.sourceHashesAfter=after;summary.changedSourcePaths=paths;summary.sourceChangedDuringRun=paths.length>0;
  tests.push({id:name+'.source-stability',status:paths.length?'fail':'pass',details:paths.length?paths:'All declared source files retained their exact hashes during this execution.'});
  summary.runtimeMs=performance.now()-started;summary.peakRSSKiB=process.resourceUsage().maxRSS;summary.peakRSSBytes=summary.peakRSSKiB*1024;
  summary.resourceScope='Measured peak resident set of this isolated Node fixture process, including FEM assembly/solve, all membrane interventions and complete-result export.';
  summary.completedAt=new Date().toISOString();summary.status=tests.every(t=>t.status==='pass')?'pass':'fail';writeJSON(reportPath,summary);
  console.log(JSON.stringify({fixture:name,status:summary.status,runtimeMs:summary.runtimeMs,peakRSSKiB:summary.peakRSSKiB,failedTests:tests.filter(t=>t.status!=='pass').map(t=>t.id)}));
  return summary.status==='pass'?0:1;
}
function spawnProcess(args,{capture=false}={}){return new Promise(resolve=>{const child=spawn(process.execPath,args,{cwd:root,stdio:capture?['ignore','pipe','pipe']:'inherit'});let stdout='',stderr='';if(capture){child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);}child.on('error',error=>resolve({code:null,error:String(error),stdout,stderr}));child.on('close',(code,signal)=>resolve({code,signal,stdout,stderr}));});}
async function main(args){
  const reportPath=path.resolve(args.report??defaultReport),artifacts=path.resolve(args['artifacts-dir']??fs.mkdtempSync(path.join(os.tmpdir(),'axon-stage1-protocol-'))),before=hashSources(),started=performance.now();
  const report={schema:'buildthesimulation.axon-interface.stage1-protocol-validation.v1',status:'running',modelVersion:STAGE1_MODEL_VERSION,startedAt:new Date().toISOString(),sourceHashes:before,
    executionEnvironment:{node:process.version,platform:process.platform,arch:process.arch,cpuModel:os.cpus()[0]?.model??null},
    scope:'Actual explicit-well FEM and four matched membrane interventions on a declared fixed-topology B3 population. No simulation surrogate, screening or biological repair/survival forecast.',
    declaredFixtures:fixtures,tests:[],smallCohort:null,fullCohort:null,artifactDirectory:artifacts};writeJSON(reportPath,report);
  const contracts=await spawnProcess(['--test','--test-reporter=tap','tests/axon-interface-stage1-contracts.mjs'],{capture:true});
  report.contracts={status:contracts.code===0?'pass':'fail',exitCode:contracts.code,stdout:contracts.stdout,stderr:contracts.stderr};report.tests.push({id:'protocol-contracts',status:report.contracts.status,details:'Independent settings/identity/propagation/budget/study-failure and disconnected-stump contract tests.'});writeJSON(reportPath,report);
  for(const name of args.smallOnly?['small']:['small','full']){
    const childReport=path.join(artifacts,name+'-fixture-summary.json'),outcome=await spawnProcess([script,'--fixture',name,'--child-report',childReport,'--artifacts-dir',artifacts]);
    const summary=fs.existsSync(childReport)?JSON.parse(fs.readFileSync(childReport,'utf8')):{status:'fail',fixture:name,failure:'Fixture process ended without a completed report.',exitCode:outcome.code,signal:outcome.signal,tests:[{id:name+'.missing-result',status:'fail',details:'No replacement or reduced-population result was inserted.'}]};
    report[name==='small'?'smallCohort':'fullCohort']=summary;report.tests.push(...summary.tests);writeJSON(reportPath,report);
  }
  const after=hashSources(),paths=changed(before,after);report.sourceHashesAfter=after;report.changedSourcePaths=paths;report.sourceChangedDuringRun=paths.length>0;
  report.tests.push({id:'complete-run-source-stability',status:paths.length?'fail':'pass',details:paths.length?paths:'All declared sources remained unchanged across contracts and both requested fixture executions.'});
  if(args.smallOnly)report.tests.push({id:'full-population-omitted',status:'not run',details:'Explicit --small-only diagnostic invocation; this report cannot certify full Stage 1.'});
  report.status=report.tests.every(t=>t.status==='pass')&&report.fullCohort?.status==='pass'?'pass':'fail';report.runtimeMs=performance.now()-started;report.completedAt=new Date().toISOString();
  report.summary={passed:report.tests.filter(t=>t.status==='pass').length,failed:report.tests.filter(t=>t.status==='fail').length,notRun:report.tests.filter(t=>t.status==='not run').length};writeJSON(reportPath,report);
  console.log(JSON.stringify({report:reportPath,status:report.status,summary:report.summary,fullCohort:report.fullCohort?{cells:report.fullCohort.cohortCount,channels:report.fullCohort.channelCount,runtimeMs:report.fullCohort.runtimeMs,peakRSSKiB:report.fullCohort.peakRSSKiB}:null}));
  return report.status==='pass'?0:1;
}
const args=parsedArgs();
process.exitCode=args.fixture?await childFixture(args.fixture,path.resolve(args['child-report']),path.resolve(args['artifacts-dir'])):await main(args);
