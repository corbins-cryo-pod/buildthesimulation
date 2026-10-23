import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SETTINGS} from '../src/lib/biohybrid/model.js';
import {PROTOCOL_VERSION,PROTOCOL_AXES,PROTOCOL_LIMITS,normalizeProtocol,runProtocol,compareControls,summarizeProtocol,stimulationDose} from '../src/lib/biohybrid/protocols.js';

const audit=runProtocol();
const short={pulseCount:1,durationMs:25};
const sweep=runProtocol(short,{kind:'sweep',axis:'stimAmplitudeUa',values:[-6,-12,-18,-24,-30],paired:false});

test('biohybrid protocols: intact, blocked and zero-stimulus audit reports calculated outcomes',()=>{
  assert.equal(audit.schemaVersion,PROTOCOL_VERSION);
  assert.equal(audit.protocol.estimatedRuns,3);
  assert.equal(audit.summary.totalRuns,3);
  assert.equal(audit.summary.failedRuns,0);
  assert.equal(audit.summary.allControlsQuiet,true);
  const item=audit.cases[0];
  assert.equal(item.status,'ok');
  assert.equal(item.baseline.metrics.recruitedHosts,3);
  assert.equal(item.synapsesOff.metrics.recruitedHosts,0);
  assert.equal(item.noStimulus.metrics.totalMonitoredSpikes,0);
  assert.equal(item.comparison.lostHosts,3);
  assert.equal(item.comparison.persistentHosts,0);
  for(const host of item.comparison.hosts){
    assert.equal(host.classification,'lost-with-block');
    assert.equal(host.baselineSpikes,2);
    assert.equal(host.blockedSpikes,0);
    assert.equal(host.blockedFirstMs,null);
  }
});

test('biohybrid protocols: matched controls alter only their declared physical intervention',()=>{
  const {baseline,synapsesOff,noStimulus}=audit.cases[0];
  assert.deepEqual({...synapsesOff.settings,synapticWeightUs:baseline.settings.synapticWeightUs},baseline.settings);
  assert.deepEqual({...noStimulus.settings,stimAmplitudeUa:baseline.settings.stimAmplitudeUa},baseline.settings);
  assert.deepEqual(synapsesOff.grafts,baseline.grafts);
  assert.equal(synapsesOff.metrics.compartments,baseline.metrics.compartments);
  assert.equal(synapsesOff.metrics.membraneCompartments,baseline.metrics.membraneCompartments);
  assert.throws(()=>compareControls(baseline,{...synapsesOff,settings:{...synapsesOff.settings,stimAmplitudeUa:-12}}),/only synapticWeightUs/);
  assert.throws(()=>compareControls(baseline,baseline),/must remove/);
});

test('biohybrid protocols: per-host timing and source evidence remain distinct from spike counts',()=>{
  const {baseline,synapsesOff}=audit.cases[0];
  for(const host of baseline.hosts){
    assert.equal(host.somaSpikes,host.spikeTimesMs.length);
    assert.equal(host.firstSpikeMs,host.spikeTimesMs[0]);
    assert.equal(host.relayConsistentSpikes,2);
    assert.equal(host.earlySpikes,0);
  }
  assert.ok(synapsesOff.recordings[1].neuralPeakToPeakUv>5);
  assert.ok(synapsesOff.recordings[1].hostPeakToPeakUv>0);
  assert.equal(synapsesOff.hosts.reduce((sum,host)=>sum+host.somaSpikes,0),0);
  for(const record of baseline.recordings)assert.ok(record.sourceResidualMaxUv<1e-10);
});

test('biohybrid protocols: direct host activation persists with synapses removed',()=>{
  // A separate electrode placement/short construct deliberately activates the
  // host electrically. A successful chronological sequence is not sufficient.
  const result=runProtocol({...short,graftCount:1,hostCount:1,connectedHosts:1,axonLengthUm:300,
    stimXUm:300,stimDistanceUm:70,stimAmplitudeUa:-40});
  const item=result.cases[0];
  assert.equal(item.status,'ok');
  assert.equal(item.baseline.metrics.recruitedHosts,1);
  assert.equal(item.synapsesOff.metrics.recruitedHosts,1);
  assert.equal(item.comparison.persistentHosts,1);
  assert.equal(item.comparison.lostHosts,0);
  assert.equal(item.comparison.hosts[0].classification,'persists-with-block');
  assert.ok(Math.abs(item.synapsesOff.hosts[0].firstSpikeMs-6.171500649363141)<1e-9);
  assert.equal(item.synapsesOff.metrics.synapticEvents,0);
  assert.equal(result.summary.allControlsQuiet,true);
});

test('biohybrid protocols: a mixed host response preserves cell-specific causal classifications',()=>{
  const result=runProtocol({...short,axonLengthUm:300,stimXUm:300,stimAmplitudeUa:-30});
  const item=result.cases[0];
  assert.equal(item.baseline.metrics.recruitedHosts,3);
  assert.equal(item.synapsesOff.metrics.recruitedHosts,1);
  assert.equal(item.comparison.lostHosts,2);
  assert.equal(item.comparison.persistentHosts,1);
  assert.deepEqual(item.comparison.hosts.map(host=>host.classification),['lost-with-block','persists-with-block','lost-with-block']);
  assert.match(item.comparison.interpretation,/2 hosts lost/);
  assert.match(item.comparison.interpretation,/1 host still spiked/);
});

test('biohybrid protocols: paired sweep controls are recalculated separately at every sampled value',()=>{
  const result=runProtocol({...short,graftCount:1,hostCount:1,connectedHosts:1},
    {kind:'sweep',axis:'stimAmplitudeUa',values:[-6,-24],paired:true});
  assert.equal(result.summary.totalRuns,4);
  assert.equal(result.summary.successfulRuns,4);
  assert.equal(result.summary.allControlsQuiet,null);
  assert.equal(result.cases[0].comparison.silentHosts,1);
  assert.equal(result.cases[1].comparison.lostHosts,1);
  for(const item of result.cases){
    assert.equal(item.noStimulus,null);
    assert.equal(item.baseline.settings.stimAmplitudeUa,item.value);
    assert.equal(item.synapsesOff.settings.stimAmplitudeUa,item.value);
    assert.equal(item.synapsesOff.settings.synapticWeightUs,0);
  }
});

test('biohybrid protocols: a finite current sweep reports sampled changes, not an interpolated threshold',()=>{
  assert.deepEqual(sweep.cases.map(item=>item.value),[-6,-12,-18,-24,-30]);
  assert.deepEqual(sweep.cases.map(item=>item.baseline.metrics.recruitedHosts),[0,0,3,3,3]);
  assert.deepEqual(sweep.summary.transitions,[{from:-12,to:-18,fromRecruitedHosts:0,toRecruitedHosts:3,direction:'gain'}]);
  assert.equal(sweep.summary.responsePattern,'nondecreasing');
  assert.equal(sweep.summary.allControlsQuiet,null);
  assert.equal('thresholdUa' in sweep.summary,false);
  assert.equal('activationProbability' in sweep.summary,false);
  for(const item of sweep.cases)assert.equal(item.settings.stimAmplitudeUa,item.value);
});

test('biohybrid protocols: invalid geometry is retained as an error and does not create a zero response',()=>{
  const result=runProtocol({...short,recordXOffsetUm:-100},
    {kind:'sweep',axis:'recordDistanceUm',values:[45,60,150],paired:false});
  assert.deepEqual(result.cases.map(item=>item.status),['ok','error','ok']);
  const failed=result.cases[1].baseline;
  assert.match(failed.error,/clearance/);
  assert.equal(failed.metrics,undefined);
  assert.equal(failed.recordings,undefined);
  assert.equal(result.summary.failedRuns,1);
  assert.equal(result.summary.successfulRuns,2);
  assert.equal(result.summary.responsePattern,'incomplete');
  assert.deepEqual(result.summary.transitions,[]);
});

test('biohybrid protocols: failed points break transition brackets and nonmonotonic responses remain visible',()=>{
  const point=(value,recruitedHosts)=>({value,status:'ok',baseline:{status:'ok',metrics:{recruitedHosts}},synapsesOff:null,noStimulus:null});
  const protocol={kind:'sweep'};
  const nonmonotone=summarizeProtocol([point(1,0),point(2,3),point(3,1)],protocol);
  assert.equal(nonmonotone.responsePattern,'nonmonotonic');
  assert.deepEqual(nonmonotone.transitions.map(item=>item.direction),['gain','loss']);
  const broken=summarizeProtocol([point(1,0),{value:2,status:'error',baseline:{status:'error',error:'Unsupported placement'}},point(3,3)],protocol);
  assert.equal(broken.responsePattern,'incomplete');
  assert.deepEqual(broken.transitions,[]);
});

test('biohybrid protocols: every registered sweep axis has units and an explicit computational bound',()=>{
  assert.equal(PROTOCOL_AXES.length,5);
  for(const axis of PROTOCOL_AXES){
    assert.ok(axis.label&&axis.unit);
    const normalized=normalizeProtocol({kind:'sweep',axis:axis.id,values:axis.values,paired:true});
    assert.equal(normalized.estimatedRuns,10);
    assert.ok(normalized.estimatedNodeSteps<=PROTOCOL_LIMITS.maxNodeSteps);
    assert.equal(normalized.values.length,5);
  }
});

test('biohybrid protocols: malformed, duplicate, unordered and excessive workloads are rejected before calculation',()=>{
  const base={kind:'sweep',axis:'stimAmplitudeUa',paired:false};
  for(const values of [[-24],[-12,-12],[-12,-24,-18],[-12,NaN],[-12,'-24'],[-12,-200],Array.from({length:8},(_,i)=>-i-1)]){
    assert.throws(()=>normalizeProtocol({...base,values}));
  }
  assert.throws(()=>normalizeProtocol({...base,axis:'temperatureC',values:[6.3,23]}),/Unsupported/);
  assert.throws(()=>normalizeProtocol({...base,values:[-12,-24],paired:'yes'}),/true or false/);
  assert.throws(()=>normalizeProtocol({kind:'unknown'}),/causal or sweep/);
  assert.throws(()=>normalizeProtocol(null),/object/);
  assert.throws(()=>normalizeProtocol({...base,values:[-6,-12,-18,-24,-30,-36,-42],paired:true},{dtMs:.00125}),/work budget/);
});

test('biohybrid protocols: normalized inputs are copied and duration, mesh and step are preserved',()=>{
  const input=Object.freeze({...short,dtMs:.005,segmentLengthUm:25});
  const values=Object.freeze([-6,-12]);
  const normalized=normalizeProtocol(Object.freeze({kind:'sweep',axis:'stimAmplitudeUa',values,paired:false}),input);
  assert.deepEqual(values,[-6,-12]);
  assert.notEqual(normalized.values,values);
  for(const item of sweep.cases){
    assert.equal(item.baseline.settings.durationMs,25);
    assert.equal(item.baseline.settings.dtMs,DEFAULT_SETTINGS.dtMs);
    assert.equal(item.baseline.settings.segmentLengthUm,DEFAULT_SETTINGS.segmentLengthUm);
  }
});

test('biohybrid protocols: deterministic replay and progress have no wall-clock-dependent scientific values',()=>{
  const updates=[];
  const small={...short,graftCount:1,hostCount:1,connectedHosts:1};
  const protocol={kind:'sweep',axis:'stimAmplitudeUa',values:[-12,-24],paired:false};
  const first=runProtocol(small,protocol,{onProgress:update=>updates.push(update)});
  const second=runProtocol(small,protocol);
  assert.deepEqual(first,second);
  assert.equal(updates[0].progress,0);
  assert.equal(updates.at(-1).progress,1);
  assert.equal(updates.at(-1).completed,2);
  for(let i=1;i<updates.length;i++)assert.ok(updates[i].progress>=updates[i-1].progress&&updates[i].progress<=1);
  assert.deepEqual(JSON.parse(JSON.stringify(first)),first);
});

test('biohybrid protocols: charge quantities use nC, signed first phase and the full biphasic train',()=>{
  const dose=audit.cases[0].baseline.dose;
  assert.equal(dose.firstPhaseChargeNc,-9.600000000000001);
  assert.equal(dose.absolutePhaseChargeNc,9.600000000000001);
  assert.equal(dose.totalAbsoluteChargeNc,38.400000000000006);
  assert.equal(dose.netChargeNc,0);
  assert.equal(audit.cases[0].noStimulus.dose.totalAbsoluteChargeNc,0);
  assert.equal(audit.units.charge,'nC');
});

test('biohybrid protocols: nominal charge density has correct area units and inverse-radius-squared scaling',()=>{
  // Independent unit conversion: µA*ms=nC; 1000 nC=1 µC; 1e8 µm²=1 cm².
  const s={...DEFAULT_SETTINGS,stimAmplitudeUa:-10,pulseWidthMs:1,contactRadiusUm:10};
  const dose=stimulationDose(s),larger=stimulationDose({...s,contactRadiusUm:20});
  const areaCm2=Math.PI*10**2/1e8,chargeUc=10/1000;
  assert.equal(dose.geometricContactAreaUm2,Math.PI*100);
  assert.ok(Math.abs(dose.absolutePhaseChargeDensityUcPerCm2-chargeUc/areaCm2)<1e-9);
  assert.equal(larger.geometricContactAreaUm2/dose.geometricContactAreaUm2,4);
  assert.equal(dose.absolutePhaseChargeDensityUcPerCm2/larger.absolutePhaseChargeDensityUcPerCm2,4);
  assert.equal(stimulationDose({...s,stimAmplitudeUa:10}).absolutePhaseChargeDensityUcPerCm2,dose.absolutePhaseChargeDensityUcPerCm2);
  assert.equal(stimulationDose({...s,stimAmplitudeUa:0}).absolutePhaseChargeDensityUcPerCm2,0);
  assert.equal(audit.units.chargeDensity,'µC/cm²');
  assert.equal('safe' in dose,false);
});
