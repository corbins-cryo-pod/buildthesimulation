import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { advanceDueEvents } from '../src/lib/peripheral/events.js';

function intervalGenerator() {
  let state = 12345;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return .2 - Math.log(1 - state / 4294967296) * .25; };
}
function collect(times, maxEvents = 4000) {
  const axons = [{ nextFire: .1 }, { nextFire: .1 }, { nextFire: .25 }, { nextFire: .07 }], interval = intervalGenerator(), events = [];
  for (const time of times) {
    let batch;
    do { batch = advanceDueEvents(axons, time, interval, maxEvents); events.push(...batch.events); } while (batch.pending);
  }
  return { events, axons };
}

test('peripheral firing schedule and random draw assignment do not depend on render batches', () => {
  const regular = collect(Array.from({ length: 101 }, (_, i) => i / 10));
  const irregular = collect([0, .13, .14, .8, 2.4, 2.5, 6, 10]);
  const oneFrame = collect([10]);
  assert.deepEqual(irregular, regular);
  assert.deepEqual(oneFrame, regular);
  assert.deepEqual(regular.events.filter(e => e.timeS === .1).map(e => e.axonIndex), [0, 1]);
  assert(regular.events.every(e => e.type === 'neural'));
  for (let i = 1; i < regular.events.length; i++) assert(regular.events[i].timeS >= regular.events[i - 1].timeS);
});

test('work cap retains pending scheduled events without dropping or retiming them', () => {
  assert.deepEqual(collect([10], 3), collect([10]));
  const axons = [{ nextFire: 0 }];
  const batch = advanceDueEvents(axons, 100, () => .2, 2);
  assert.equal(batch.events.length, 2);
  assert.equal(batch.pending, true);
  assert.equal(batch.nextTimeS, .4);
  assert.deepEqual(batch.events.map(e => e.timeS), [0, .2]);
  assert.throws(() => advanceDueEvents(axons, 100, () => 0), /advance time/);
});

test('peripheral page has one duration control and separates stimulus markers from neural events', () => {
  const source = fs.readFileSync(new URL('../src/pages/sim.astro', import.meta.url), 'utf8');
  for (const id of ['dur', 'durVal', 'durMin', 'durMax']) assert.equal((source.match(new RegExp(`id="${id}"`, 'g')) ?? []).length, 1);
  const stimulation = source.slice(source.indexOf('function applyStimToAxons'), source.indexOf('function drawMain'));
  assert(!stimulation.includes('pushRecEvent'));
  assert(source.includes('type: "stimulus-start"'));
  assert(source.includes('ev.type !== "neural"'));
  assert(source.includes('pushRecEvent(e.id, timeS,'));
  assert(source.includes('pending events are retained'));
});
