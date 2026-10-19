import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../public/scripts/cortex-v2/engine.js';

const config = { seed: 1337, nNeurons: 20, bounds: { min: [-100, -100, 0], max: [100, 100, 200] },
  sampleRateHz: 8000, traceWindowS: 2, baseUv: 1800, r0Um: 45, noiseUv: 0,
  burstSeedProb: 0, recruitRadiusUm: 80, modStrength: 0 };
const contacts = [{ id: 'near', x: 0, y: 0, z: 100 }, { id: 'far', x: 1000, y: 1000, z: 1400 }];
const advance = (engine, sites, steps = 100) => { for (let i = 0; i < steps; i++) engine.step(4, sites); };

test('synthetic recording is reproducible, finite and preserves its declared source visibility', () => {
  const a = createEngine({ ...config }), b = createEngine({ ...config });
  advance(a, contacts, 300); advance(b, contacts, 300);
  assert.deepEqual(a.state.tracesByElectrode, b.state.tracesByElectrode);
  assert.ok(a.state.tracesByElectrode.every(t => t.length === 16000 && t.every(Number.isFinite)));
  assert.ok(a.state.detectedSpikes.some(s => s.electrodeIndex === 0));
  assert.ok(!a.state.detectedSpikes.some(s => s.electrodeIndex === 1));
  a.clearRecording();
  assert.equal(a.state.detectedSpikes.length, 0);
  a.step(4, [contacts[0]]);
  assert.equal(a.state.tracesByElectrode.length, 1);
});

test('passive contact count, order, positions and noise settings cannot change source events', () => {
  // Includes active stochastic modulation/recruitment, not just a quiet baseline.
  const physiology = { ...config, modStrength: 1.3, burstSeedProb: .2 };
  const baseline = createEngine({ ...physiology });
  advance(baseline, [contacts[0]]);
  assert.ok(baseline.state.recentSpikes.length > 0);
  const variants = [
    { sites: contacts, noiseUv: 0 },
    { sites: [...contacts].reverse(), noiseUv: 5 },
    { sites: [{ ...contacts[0], x: 800 }], noiseUv: 12 },
    { sites: [], noiseUv: 3 },
  ];
  for (const { sites, noiseUv } of variants) {
    const candidate = createEngine({ ...physiology, noiseUv });
    advance(candidate, sites);
    assert.deepEqual(candidate.state.recentSpikes, baseline.state.recentSpikes);
    assert.deepEqual(candidate.state.neuronActivity, baseline.state.neuronActivity);
    assert.equal(candidate.state.networkMod, baseline.state.networkMod);
  }
  const edited = createEngine({ ...physiology });
  for (let i = 0; i < 100; i++) {
    edited.cfg.noiseUv = i % 3 ? 0 : 9;
    if (i % 19 === 0) edited.clearRecording();
    edited.step(4, i % 2 ? contacts : [contacts[1]]);
  }
  assert.deepEqual(edited.state.recentSpikes, baseline.state.recentSpikes);
});

test('a contact keeps its noise, trace and pending waveform when other contacts change or reorder', () => {
  const a = createEngine({ ...config, noiseUv: 4 }), b = createEngine({ ...config, noiseUv: 4 });
  advance(a, contacts, 40); advance(b, contacts, 40);
  advance(a, contacts, 60); advance(b, [...contacts].reverse(), 60);
  assert.deepEqual(a.state.tracesByElectrode[0], b.state.tracesByElectrode[1]);
  assert.deepEqual(a.state.tracesByElectrode[1], b.state.tracesByElectrode[0]);
  assert.equal(a.state.noiseByElectrode[0], b.state.noiseByElectrode[1]);
  const events = (engine, index) => engine.state.detectedSpikes.filter(e => e.electrodeIndex === index)
    .map(({ tMs, idx, alignMs }) => ({ tMs, idx, alignMs }));
  assert.deepEqual(events(a, 0), events(b, 1));
  const single = createEngine({ ...config, noiseUv: 4 });
  advance(single, [contacts[0]]);
  assert.deepEqual(single.state.tracesByElectrode[0], a.state.tracesByElectrode[0]);
});

test('anonymous geometry identities are deterministic and explicit IDs survive coordinate changes', () => {
  const anonymous = contacts.map(({ id, ...position }) => position);
  const a = createEngine({ ...config, noiseUv: 3 }), b = createEngine({ ...config, noiseUv: 3 });
  advance(a, anonymous); advance(b, anonymous.map(site => ({ ...site })).reverse());
  assert.deepEqual(a.state.tracesByElectrode[0], b.state.tracesByElectrode[1]);
  // With no sources, moving an identified contact cannot reassign instrument noise.
  const c = createEngine({ ...config, nNeurons: 0, noiseUv: 3 });
  const d = createEngine({ ...config, nNeurons: 0, noiseUv: 3 });
  advance(c, [contacts[0]]); advance(d, [{ ...contacts[0], x: 900 }]);
  assert.deepEqual(c.state.tracesByElectrode[0], d.state.tracesByElectrode[0]);
  advance(c, [contacts[0]], 20); advance(d, [{ ...contacts[0], x: -800 }], 20);
  assert.deepEqual(c.state.tracesByElectrode[0], d.state.tracesByElectrode[0]);
  const independent = createEngine({ ...config, nNeurons: 0, noiseUv: 3 });
  advance(independent, contacts);
  assert.notDeepEqual(independent.state.tracesByElectrode[0], independent.state.tracesByElectrode[1]);
});

test('source waveform timing has no contact-distance transit delay and carries across blocks', () => {
  const e = createEngine({ ...config, nNeurons: 1, rasterPeakUv: 0, closeDipBoost: 0 });
  e.state.neurons[0].hz = 1e8;
  e.step(4, contacts);
  e.state.neurons[0].hz = 0;
  e.step(4, contacts);
  assert.ok(e.state.tracesByElectrode[0].slice(-32).some(v => v !== 0), 'waveform tail must survive the block boundary');
  const firstNonzero = values => values.findIndex(v => v !== 0);
  const trough = values => values.indexOf(Math.min(...values));
  assert.equal(firstNonzero(e.state.tracesByElectrode[0]), firstNonzero(e.state.tracesByElectrode[1]));
  assert.equal(trough(e.state.tracesByElectrode[0]), trough(e.state.tracesByElectrode[1]));
  assert.equal(e.state.detectedSpikes.length, 2);
  assert.ok(e.state.detectedSpikes.every(event => event.alignMs === .55));
});
