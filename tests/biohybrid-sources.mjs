import test from 'node:test';
import assert from 'node:assert/strict';
import {MODEL_VERSION,OBSERVATION_VERSION,runSimulation,prepareFields} from '../src/lib/biohybrid/model.js';
import {runSimulation as runReleasedSimulation} from './fixtures/biohybrid-v1-model.mjs';
import {verifyReleasedFixture,compareReleasedResult} from './helpers/biohybrid-legacy-reference.mjs';

const baseline=runSimulation();
const blocked=runSimulation({synapticWeightUs:0});
const peakToPeak=values=>Math.max(...values)-Math.min(...values);

test('biohybrid sources: observation extension exactly preserves the frozen released solver within this runtime',()=>{
  const provenance=verifyReleasedFixture();
  assert.equal(provenance.passed,true,JSON.stringify(provenance));
  const released=runReleasedSimulation();
  const comparison=compareReleasedResult(baseline,released);
  assert.equal(comparison.passed,true,JSON.stringify(comparison));
  assert.equal(baseline.modelVersion,MODEL_VERSION);
  assert.equal(baseline.observationVersion,OBSERVATION_VERSION);
  assert.equal(baseline.metrics.recruitedHosts,3);
});

test('biohybrid sources: the two physical populations reconstruct every neural-field sample',()=>{
  for(const result of [baseline,blocked])for(const record of result.recordings){
    assert.equal(record.hostUv.length,result.timeMs.length);
    assert.equal(record.graftUv.length,result.timeMs.length);
    for(let i=0;i<result.timeMs.length;i++){
      assert.ok(Number.isFinite(record.hostUv[i])&&Number.isFinite(record.graftUv[i]));
      assert.ok(Math.abs(record.neuralUv[i]-record.graftUv[i]-record.hostUv[i])<1e-10,
        `${record.id}, ${result.timeMs[i]} ms: source decomposition residual`);
      assert.equal(record.totalUv[i],record.neuralUv[i]+record.artifactUv[i]);
    }
  }
});

test('biohybrid sources: conductance removal changes host currents but retains graft currents',()=>{
  assert.equal(blocked.metrics.recruitedHosts,0);
  assert.equal(blocked.metrics.somaSpikeCount,4);
  baseline.recordings.forEach((record,index)=>{
    assert.deepEqual(blocked.recordings[index].graftUv,record.graftUv);
    assert.ok(peakToPeak(blocked.recordings[index].hostUv)>0,
      'A nonspiking host still has field-induced subthreshold membrane currents.');
    assert.ok(peakToPeak(blocked.recordings[index].hostUv)<.1);
    assert.ok(peakToPeak(record.hostUv)>1);
    assert.ok(peakToPeak(blocked.recordings[index].neuralUv)>1,
      'A nonzero distant neural waveform does not establish host firing.');
  });
});

test('biohybrid sources: peak-to-peak components are not falsely treated as additive',()=>{
  const record=baseline.recordings[1];
  const sumOfRanges=peakToPeak(record.graftUv)+peakToPeak(record.hostUv);
  assert.ok(Math.abs(sumOfRanges-peakToPeak(record.neuralUv))>1,
    'Source waveforms can cancel and reach their extrema at different times.');
});

test('biohybrid sources: zero input has no spurious population field or spike',()=>{
  const result=runSimulation({stimAmplitudeUa:0});
  assert.equal(result.spikes.length,0);
  for(const record of result.recordings)for(const key of ['graftUv','hostUv','neuralUv']){
    assert.ok(record[key].every(value=>Math.abs(value)<1e-8));
  }
});

test('biohybrid sources: passive recording translation changes fields without changing electrical activity',()=>{
  const farther=runSimulation({recordDistanceUm:200});
  assert.deepEqual(farther.voltageMv,baseline.voltageMv);
  assert.deepEqual(farther.spikes,baseline.spikes);
  for(let i=0;i<baseline.recordings.length;i++)for(const component of ['graftUv','hostUv']){
    assert.ok(peakToPeak(farther.recordings[i][component])<peakToPeak(baseline.recordings[i][component]));
  }
});

test('biohybrid sources: independently reconstructed axial flux agrees within propagated saved-voltage precision',()=>{
  // The solver records capacitive + ionic + synaptic source currents. Here the
  // same currents are obtained independently from Kirchhoff's axial flux law,
  // using only exported Float32 voltages, geometry and imposed-field values.
  // A provisional fixed 0.001 µV reconstruction diagnostic missed the host
  // component (0.001273569 µV). That result is retained; this check instead
  // verifies the analytically propagated half-ULP uncertainty of the stored
  // voltages. The source waveforms themselves remain Float64 calculations.
  const fields=prepareFields(baseline.geometry,baseline.settings),nodes=baseline.geometry.nodes,n=nodes.length;
  const halfUlp=value=>value===0?2**-150:Math.max(2**-150,2**(Math.floor(Math.log2(Math.abs(value)))-24));
  const projections=fields.lead.flatMap((lead,contact)=>['graft','host'].map(role=>{
    const coefficients=new Float64Array(n);
    for(let i=0;i<n;i++){
      const parent=nodes[i].parent;if(parent<0)continue;
      const here=nodes[i].areaUm2>0&&nodes[i].role===role?lead.coefficients[i]:0;
      const there=nodes[parent].areaUm2>0&&nodes[parent].role===role?lead.coefficients[parent]:0;
      const contribution=nodes[i].edgeUs*(there-here);
      coefficients[i]+=contribution;coefficients[parent]-=contribution;
    }
    return {contact,role,coefficients};
  }));
  for(let frame=0;frame<baseline.timeMs.length;frame++){
    const voltages=baseline.voltageMv.subarray(frame*n,(frame+1)*n),stimulus=baseline.stimulusUa[frame];
    for(const {contact,role,coefficients} of projections){
      let reconstructed=0,bound=0;
      for(let i=0;i<n;i++){
        reconstructed+=coefficients[i]*(voltages[i]+fields.stimulusMvPerUa[i]*stimulus);
        bound+=Math.abs(coefficients[i])*halfUlp(voltages[i]);
      }
      const actual=baseline.recordings[contact][`${role}Uv`][frame];
      assert.ok(Math.abs(reconstructed-actual)<=bound+1e-8,
        `${role}, contact ${contact+1}, ${baseline.timeMs[frame]} ms: error ${Math.abs(reconstructed-actual)} exceeds rounded-state bound ${bound}`);
    }
  }
});
