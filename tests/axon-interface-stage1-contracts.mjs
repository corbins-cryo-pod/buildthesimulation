import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_STAGE1_SETTINGS, normalizeStage1Settings, STAGE1_PARAMETER_REGISTER, STAGE1_ENUM_REGISTER, validateStage1Budget, STAGE1_BUDGET } from '../src/lib/axon-interface/stage1-settings.mjs';
import { createStage1Cohort, createIdentityLedger, applyB3IdentityMetrics, assertDisconnectedNativeStumps } from '../src/lib/axon-interface/identities.mjs';
import { buildStage1Morphology, stage1PhaseAverage, propagatedArmOutput, initiationRegionEligible, runStage1Protocol, runStage1Study } from '../src/lib/axon-interface/stage1-protocol.mjs';
import { createNativeStumpMorphologies } from '../src/lib/axon-interface/bipolar.mjs';
import { simulateCable } from '../src/lib/axon-interface/mrg.mjs';
import { selectivityMetrics } from '../src/lib/axon-interface/metrics.mjs';

const SMALL=Object.freeze({axonCount:4,channelCount:1,durationMs:2,dtMs:.000625,sampleDtMs:.025});

test('Stage 1: each original identity is distinct from the fixed engineered output and its disconnected remnants',()=>{
  const s=normalizeStage1Settings(SMALL),cohort=createStage1Cohort(s),ledger=createIdentityLedger(s,cohort);
  assert.equal(ledger.originalCensus,4);assert.equal(ledger.original.length,4);assert.equal(ledger.engineered.length,4);assert.equal(ledger.nativeRemnants.length,8);
  assert.ok(ledger.original.every(item=>item.postoperativeContinuity===false));
  assert.ok(ledger.engineered.every(item=>item.originalHostIdentity===null&&item.targetReinnervationValidated===false&&item.survivalYield===null));
  assert.ok(ledger.nativeRemnants.every(item=>item.connectedAcrossResection===false&&item.survivalForecast===null));
  assert.ok(ledger.nativeRemnants.every(item=>item.presentInB3===false&&item.presentInMatchedNoDevice===false));
  assert.equal(ledger.remnantStateAssumption.b3,ledger.remnantStateAssumption.noDevice);assert.equal(ledger.remnantStateAssumption.matched,true);
  assert.equal(new Set([...ledger.original,...ledger.engineered,...ledger.nativeRemnants].map(item=>item.id)).size,16);
  assert.equal(ledger.intactNativeContext.continuousOriginalCount,4);
  const raw=selectivityMetrics([[1,0,0,0]],[[0,0,0,0]],[0,0,0,0],4,{initiationEligible:[[1,0,0,0]]});
  const metric=applyB3IdentityMetrics(raw,ledger);
  assert.equal(metric.originalHostCensus,4);assert.equal(metric.originalHostPreservedCount,0);assert.equal(metric.originalHostY,0);
  assert.equal(metric.noDeviceOriginalY,0);assert.equal(metric.engineeredConditionedExclusiveY,.25);assert.equal(metric.engineeredConditionedCausalY,.25);
  assert.equal(metric.biologicalTargetReinnervationYield,null);assert.equal(metric.biologicalSurvivalYield,null);
  const failed=applyB3IdentityMetrics(selectivityMetrics([[1,0,0,0]],[[0,0,0,0]],[0,0,0,0],4,{auditValid:false}),ledger);
  assert.equal(failed.originalHostY,0);assert.equal(failed.engineeredConditionedExclusiveY,null);
  const invalid={...ledger,engineered:ledger.engineered.map((entry,i)=>i?entry:{...entry,originalHostIdentity:'H0001'})};
  assert.throws(()=>applyB3IdentityMetrics(raw,invalid),/distinct engineered/);
});

test('Stage 1: full physical well array and named anatomy are invariant under drive or conductivity changes',()=>{
  const s=normalizeStage1Settings(),a=createStage1Cohort(s);
  assert.equal(a.cells.length,128);assert.equal(a.wells.length,128);assert.equal(a.channels.length,2);
  assert.equal(a.physicalWellCount,128);assert.equal(a.addressedWellCount,2);
  assert.deepEqual(a,createStage1Cohort({...s,amplitudeUa:0,perineuriumResistivityOhmM:4000,seedingLambda:3}));
  assert.notDeepEqual(a.cells,createStage1Cohort({...s,seed:2049}).cells);
  assert.equal(a.wells[0].contactHalfWidthUm,3);assert.equal(a.wells[0].contactHalfHeightUm,3);
  assert.ok(a.wells.every(w=>w.cellId===a.cells[w.cellIndex].id));
});

test('Stage 1: obsolete core inputs, malformed settings and intersecting geometries are rejected',()=>{
  for(const value of [null,[],true])assert.throws(()=>normalizeStage1Settings(value));
  for(const value of [{nodeCount:11},{fiberDiameterUm:10},{electrodeRadiusUm:75},{contactAreaUm2:1000},JSON.parse('{"constructor":3}')])assert.throws(()=>normalizeStage1Settings(value),/Unknown Stage 1/);
  assert.throws(()=>normalizeStage1Settings({mode:'straight-cable'}),/Unsupported mode/);
  assert.throws(()=>normalizeStage1Settings({dtMs:'0.000625'}),/finite number/);
  assert.throws(()=>normalizeStage1Settings({peripheralFiberDiameterUm:6}),/tabulated/);
  assert.throws(()=>normalizeStage1Settings({somaDiameterUm:30}),/somaDiameterUm/);
  assert.throws(()=>normalizeStage1Settings({wellInnerRadiusUm:9}),/soma does not fit/);
  assert.throws(()=>normalizeStage1Settings({wellApertureRadiusUm:2}),/aperture/);
  assert.throws(()=>normalizeStage1Settings({wellContactSeparationUm:5}),/overlap/);
  assert.throws(()=>normalizeStage1Settings({stemSegments:2}),/1, 3, or 5/);
  const keys=[...STAGE1_PARAMETER_REGISTER,...STAGE1_ENUM_REGISTER].map(p=>p.key);
  assert.equal(new Set(keys).size,Object.keys(DEFAULT_STAGE1_SETTINGS).length);
  assert.ok(Object.isFrozen(normalizeStage1Settings(SMALL)));
});

test('Stage 1: morphology contains a soma, two distinct stems and two own arms; native stumps cannot conduct across the gap',()=>{
  const s=normalizeStage1Settings(SMALL),m=buildStage1Morphology(s),stumps=createNativeStumpMorphologies(m),gap=assertDisconnectedNativeStumps(stumps);
  assert.equal(m.type,'bipolar-projecting-neuron');assert.equal(m.compartments.length,312+2*s.stemSegments+s.somaSegments);assert.equal(m.nodeIndices.length,12);assert.equal(m.activeSiteIndices.length,12+2*s.stemSegments+s.somaSegments);
  assert.equal(m.somaIndices.length,s.somaSegments);assert.ok(!m.nodeIndices.includes(m.somaIndex));
  assert.equal(m.roleIndices.peripheralStem.length,3);assert.equal(m.roleIndices.centralStem.length,3);
  assert.ok(m.parameters.peripheralStemLengthUm!==m.parameters.centralStemLengthUm);
  for(const arm of ['peripheral','central']){
    const stump=stumps[arm];assert.equal(stump.type,'disconnected-native-stump');assert.equal(stump.compartments.length,156);assert.equal(stump.somaIndex,null);
    assert.equal(stump.sealedBoundaries,true);assert.equal(stump.connectedAcrossRemovedRegion,false);
    assert.ok(stump.compartments.every(c=>c.kind!=='SOMA'&&c.kind!=='STEM'));
    assert.ok(m.armMonitors[arm].compartmentIndices.every(i=>!m.initiationRegionIndices.includes(i)));
  }
  assert.ok(gap.gapUm>0);assert.equal(gap.axialConnectionAcrossGap,false);
  assert.throws(()=>assertDisconnectedNativeStumps({peripheral:stumps.central,central:stumps.central}),/distinct/);
});

test('Stage 1: three-node outward propagation and soma/stem initiation are separate diagnostics',()=>{
  const m=buildStage1Morphology(SMALL);
  const eventCase=(arm,times)=>{const nodeEventTimes=Array.from({length:m.nodes},()=>[]);m.armMonitors[arm].nodeOrdinals.forEach((n,i)=>nodeEventTimes[n]=[times[i]]);return {nodeEventTimes};};
  for(const arm of ['peripheral','central']){
    assert.equal(propagatedArmOutput(eventCase(arm,[1,1,1]),m,arm).recruited,false);
    assert.equal(propagatedArmOutput(eventCase(arm,[1,1.000001,1.000002]),m,arm).recruited,false);
    assert.equal(propagatedArmOutput(eventCase(arm,[1,1.02,1.04]),m,arm).recruited,true);
  }
  const run={dtMs:.000625,events:[{timeMs:.6,compartmentIndex:m.somaIndex}]};
  assert.equal(initiationRegionEligible(run,m,.5),true);
  assert.equal(initiationRegionEligible({...run,events:[{timeMs:.6,compartmentIndex:m.armMonitors.central.compartmentIndices[0]}]},m,.5),false);
  assert.equal(initiationRegionEligible({...run,events:[{timeMs:.4,compartmentIndex:m.somaIndex}]},m,.5),false);
  assert.equal(initiationRegionEligible({...run,events:[...run.events,{timeMs:.6001,compartmentIndex:m.armMonitors.central.compartmentIndices[0]}]},m,.5),false);
});

test('Stage 1: budgets explicitly include independent stump preparation and every requested condition',async()=>{
  const s=normalizeStage1Settings(),m=buildStage1Morphology(s),stumps=createNativeStumpMorphologies(m),budget=validateStage1Budget(s,m,stumps);
  assert.equal(budget.engineeredSolves,1028);assert.equal(budget.nativeStumpSolves,2);assert.equal(budget.cableSolves,1030);
  assert.ok(budget.compartmentSteps>1.2e9&&budget.compartmentSteps<STAGE1_BUDGET.maxCompartmentSteps);
  assert.throws(()=>validateStage1Budget({...s,includeElectrodeOnlyControl:true},m,stumps),/work budget/);
  const small=normalizeStage1Settings(SMALL),baseSmall=validateStage1Budget(small,m,stumps),extra=validateStage1Budget({...small,includeElectrodeOnlyControl:true},m,stumps);
  assert.equal(extra.nativeStumpSolves,10);assert.ok(extra.compartmentSteps>baseSmall.compartmentSteps);assert.ok(extra.savedValues>baseSmall.savedValues);
  await assert.rejects(runStage1Protocol(SMALL,{shouldCancel:()=>true}),/cancelled/);
  let began=false;await assert.rejects(runStage1Study(s,'amplitude',{onProgress:()=>began=true}),/budget/);assert.equal(began,false);
});

test('Stage 1: phase integration remains charge balanced on the actual solver grid',()=>{
  const s=normalizeStage1Settings({...SMALL,stimulusStartMs:.5002,phaseWidthMs:.1007,phaseGapMs:.0253});let positive=0,negative=0;
  for(let k=0;k<Math.round(s.durationMs/s.dtMs);k++){const q=stage1PhaseAverage(s,k*s.dtMs)*s.dtMs;if(q<0)negative+=q;else positive+=q;}
  assert.ok(Math.abs(positive-s.amplitudeUa*s.phaseWidthMs)<1e-12);assert.ok(Math.abs(negative+s.amplitudeUa*s.phaseWidthMs)<1e-12);
});

test('Stage 1: actual disconnected native stump baselines are simulated with no stimulus and remain quiescent',()=>{
  const s=normalizeStage1Settings(SMALL),m=buildStage1Morphology(s),stumps=createNativeStumpMorphologies(m);
  for(const arm of ['peripheral','central']){
    const stump=stumps[arm],run=simulateCable({morphology:stump,dtMs:s.dtMs,durationMs:s.durationMs,equilibrationMs:s.equilibrationMs,traceStride:40,recordIndices:stump.activeSiteIndices,saveCurrents:false,maxEventsPerNode:8});
    assert.equal(run.events.length,0);assert.equal(propagatedArmOutput(run,stump,arm).recruited,false);
    assert.equal(run.timesMs[0],0);assert.equal(run.timesMs.at(-1),s.durationMs);
    const drift=Math.max(...run.membraneMv.flatMap(row=>row.map(value=>Math.abs(value-row[0]))));assert.ok(drift<=.1,`${arm} drift ${drift}`);
  }
});
