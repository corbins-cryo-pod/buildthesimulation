import test from 'node:test';
import assert from 'node:assert/strict';
import { verify,read } from '../scripts/equipment/07-02/verify.mjs';
import { simulate,defaults,exampleSamples,analyze,importCSV,replay,exposureCSV } from '../public/equipment/07-02/solver.mjs';
const reference=replay(read('records/tc180-co2.csv'),'tc');
test('07-02 nominal geometry, analytic, interlock and graph references match the published table',()=>{
  const rows=verify();assert.deepEqual(rows,JSON.parse(read('verification.json')));assert.ok(rows.every(r=>r.pass));
});
test('07-02 recorded excursion is assigned only to occupying samples; handoff example reproducible',()=>{
  const a=analyze(reference,exampleSamples);assert.deepEqual(a,JSON.parse(read('example-result.json')));
  const [early,late]=a.samples;assert.equal(early.glassOpen_s,30);assert.equal(late.glassOpen_s,0);
  assert.ok(early.statistics.co2_pct.below_s>195 && early.statistics.co2_pct.below_s<205);assert.equal(late.statistics.co2_pct.below_s,0);
  assert.equal(early.statistics.temp_C,null);
  for(const s of a.samples)assert.ok(s.readings.every(r=>r.time_s>=s.enter_s&&r.time_s<=s.leave_s));
});
test('07-02 clip edges, revision history, no spurious exposure at half-open endpoint',()=>{
  const input=[{...exampleSamples[0],enter_s:264,leave_s:280,parentRevision:8,history:[{previous:'staged'}],contactIds:['C8']}];
  const before=JSON.stringify(input),result=analyze(reference,input),s=result.samples[0];
  assert.equal(s.revision,9);assert.equal(s.history.length,2);assert.deepEqual(s.contactIds,['C8']);assert.equal(s.glassOpen_s,16);
  assert.equal(s.readings[0].time_s,264);assert.equal(s.readings.at(-1).time_s,280);assert.equal(JSON.stringify(input),before);
  assert.match(exposureCSV(result),/VIOS-A,9,1,280,,[\d.]+,0,0,digitized-replay/);
});
test('07-02 limits reject incompatible samples, switch files, disconnected inputs and discontinuities',()=>{
  assert.throws(()=>analyze(reference,[exampleSamples[0],exampleSamples[0]]),/unique ID/);
  assert.throws(()=>analyze(reference,[exampleSamples[0],{...exampleSamples[1],shelf:1,enter_s:599}]),/same shelf/);
  assert.throws(()=>analyze(reference,[{...exampleSamples[0],leave_s:1900}]),/window/);
  assert.throws(()=>simulate({...defaults,gasConnected:false}),/supply/);
  assert.throws(()=>simulate({...defaults,temp_C:55}),/setpoints/);
  const header='time_s,temp_C,co2_pct,glass_open\n';
  for(const row of ['0,37,5,0\n0,37,4,1','0,37,5,0\n300,37,5,0','0,37,5,1\n10,37,,0','0,37,5,0\n10,37,21,0'])assert.throws(()=>importCSV(header+row,'fixture'));
});
test('07-02 same-shelf transfer at a shared boundary, temperature-only replay and logger import',()=>{
  assert.doesNotThrow(()=>analyze(reference,[exampleSamples[0],{...exampleSamples[1],shelf:1,enter_s:600}]));
  const t=replay(read('records/center-temperature.csv'),'temperature');assert.equal(t.readings[0].co2_pct,null);
  assert.equal(t.events[0].start_s,326);assert.equal(reference.events[0].start_s,255);
  const imported=importCSV(read('example-logger.csv'),'synthetic fixture');assert.equal(imported.events[0].end_s,90);
});
import {fromCabinet,toCabinet} from '../public/equipment/07-02/handoff.mjs';
import {makeExample,simulate as runCabinet} from '../public/equipment/07-01/session.mjs';
test('07-02 releases and receives real 07-01 session files with distinct station clocks',()=>{
  const result=analyze(reference,exampleSamples),file=toCabinet(result,'VIOS-EXAMPLE-TRANSFER');
  assert.deepEqual(file,JSON.parse(read('example-cabinet-replay.json')));
  const received=runCabinet(file);assert.deepEqual(received.sampleHistory.map(s=>[s.sampleId,s.visits[0].enteredS,s.visits[0].removedS]),[['VIOS-A',0,30],['VIOS-B',600,630]]);
  assert.equal(file.incubatorSource.cabinetZeroAtIncubator_s,600);
  const upstream=runCabinet(makeExample()),map=fromCabinet(upstream,1800),output=analyze(reference,map);
  assert.deepEqual(output.samples.map(s=>[s.sampleId,s.history[0].warningDurationS]),[['SEALED-A',9],['SEALED-B',8]]);
  assert.throws(()=>fromCabinet(runCabinet(makeExample(),5),1800),/completed/);
});
