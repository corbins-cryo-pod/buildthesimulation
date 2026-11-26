import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { CONFIG, makeExample, positionAt, simulate } from '../public/equipment/07-01/session.mjs';

const asset = file => new URL(`../public/equipment/07-01/${file}.json`, import.meta.url);
const read = file => JSON.parse(readFileSync(asset(file), 'utf8'));
const example = makeExample();
const run = simulate(example);
const verification = read('verification');
const noExcursion = makeExample();
noExcursion.events[1].heightMm = CONFIG.nominalMm;
const empty = {sessionId: 'EMPTY', durationS: 0, initialSashMm: 0, events: []};

function checkOvertravel() {
  try { simulate({...empty, initialSashMm: 536}); }
  catch (error) {
    assert.match(error.message, /0 to 535 mm/);
    return 'rejected';
  }
  return 'accepted';
}

const actuals = {
  'cabinet-time': run.summary.warningDurationS,
  'overlap-a': run.sampleHistory.find(row => row.sampleId === 'SEALED-A').warningDurationS,
  'overlap-b': run.sampleHistory.find(row => row.sampleId === 'SEALED-B').warningDurationS,
  'total-sample-time': run.summary.sampleWarningSeconds,
  'boundary': [9.999, 10, 21.999, 22].map(t => simulate(example, t).state.warning),
  'affected-ids': run.summary.affectedSampleIds,
  'control-change': simulate(noExcursion).summary.sampleWarningSeconds,
  'closed-position': simulate(empty).state.position,
  'invalid-travel': checkOvertravel(),
  'marked-band': [184.14, 184.15, 209.55, 209.56].map(positionAt)
};

if (process.argv.includes('--record')) {
  for (const row of verification.tests) {
    assert.deepEqual(actuals[row.id], row.expected);
    row.actual = actuals[row.id];
    row.outcome = 'Pass';
  }
  writeFileSync(asset('verification'), JSON.stringify(verification, null, 2) + '\n');
}

for (const row of verification.tests) {
  test(`07-01 / ${row.id}`, () => {
    assert.deepEqual(actuals[row.id], row.expected);
    assert.deepEqual(row.actual, actuals[row.id]);
    assert.equal(row.outcome, 'Pass');
  });
}

test('published input and output reproduce the example exactly', () => {
  assert.deepEqual(read('example-input'), example);
  assert.deepEqual(read('example-session'), run);
  assert.deepEqual(simulate(run.input), run);
  assert.equal(run.complete, true);
  assert.equal(run.eventHistory.at(-1).state.presentSampleIds.length, 0);
});

test('replay cursor clips an open visit at the requested millisecond', () => {
  const clipped = simulate(example, 15.123);
  assert.equal(clipped.complete, false);
  assert.deepEqual(clipped.state.presentSampleIds, ['SEALED-A', 'SEALED-B']);
  assert.deepEqual(clipped.sampleHistory.map(s => s.warningDurationS), [5.123, 1.123]);
  assert.equal(clipped.sampleHistory[1].visits[0].observedUntilS, 15.123);
  assert.equal(clipped.sampleHistory[1].visits[0].removedS, null);
  assert.equal(clipped.intervals.at(-1).endS, 15.123);
});

test('stable ordering, re-entry and zero-length visits', () => {
  const job = {sessionId:'EDGE', initialSashMm:100, durationS:2, events:[
    {timeS:0, type:'load', sampleId:'A'},
    {timeS:1, type:'remove', sampleId:'A'},
    {timeS:1, type:'load', sampleId:'B'},
    {timeS:1, type:'remove', sampleId:'B'},
    {timeS:2, type:'load', sampleId:'A'}
  ]};
  const result = simulate(job);
  assert.deepEqual(result.summary, {warningDurationS:2, sampleWarningSeconds:1, affectedSampleIds:['A']});
  assert.deepEqual(result.sampleHistory[0].visits.map(v => v.warningDurationS), [1, 0]);
  assert.equal(result.eventHistory.length, 5);
  assert.deepEqual(result.intervals.map(row => row.durationS), [1, 1]);
  assert.deepEqual(result.state.presentSampleIds, ['A']);
});

test('closed, zero-duration manual session and maximum travel', () => {
  assert.deepEqual(simulate(empty).intervals, []);
  assert.equal(simulate(empty).state.qualitativeFlag, 'closed-reduced-mode');
  assert.equal(simulate(empty).state.warning, false);
  const upper = simulate({...empty, events:[{timeS:0, type:'sash', heightMm:535}]});
  assert.equal(upper.state.warning, true);
  assert.equal(upper.state.position, 'above-work');
});

test('invalid configurations and physically incompatible handling events give actionable errors', () => {
  const load = {timeS:0, type:'load', sampleId:'A'};
  const nominal = {...empty, initialSashMm:203.2};
  for (const [job, pattern] of [
    [{...empty, deviceId:'07-02'}, /Incompatible deviceId/],
    [{...empty, initialSashMm:null}, /mm/],
    [{...empty, events:[load]}, /closed sash/],
    [{...nominal, events:[{...load,sampleKind:'open-sample'}]}, /sealed-token/],
    [{...nominal, events:[load,load]}, /already on/],
    [{...nominal, events:[{...load,type:'remove'}]}, /absent/],
    [{...nominal, events:[{...load,sampleId:'AB C'}]}, /Sample ID|sample ID/],
    [{...nominal, durationS:1, events:[{...load,timeS:0.0001}]}, /millisecond/],
    [{...nominal, durationS:1, events:[{...load,timeS:0.1},{timeS:0,type:'sash',heightMm:20}]}, /time order/],
    [{...nominal, durationS:1, events:[{...load,timeS:2}]}, /within the session/],
    [{...nominal, events:Array.from({length:17},(_,i)=>({...load,sampleId:`A${i}`}))}, /16 concurrent/]
  ]) assert.throws(() => simulate(job), pattern);
  assert.throws(() => simulate(example,32), /cursor exceeds/i);
});

test('clipped export rejects an invalid future event and leaves caller-owned objects untouched', () => {
  const original = makeExample();
  original.events.push({timeS:30,type:'remove',sampleId:'absent'});
  assert.throws(() => simulate(original,0), /absent/);
  const initial = JSON.stringify(example);
  const copy = simulate(example);
  copy.input.events[0].sampleId = 'mutated-in-export';
  assert.equal(JSON.stringify(example), initial);
});
