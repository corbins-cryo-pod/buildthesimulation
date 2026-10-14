import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshActiveConfig, freshConfig, validateConfig } from '../src/lib/cortex/config.js';
import { getExampleConfig } from '../src/lib/cortex/examples.js';
import { makeWorld } from '../src/lib/cortex/world.js';
import { runExperiment, parseConfig, encodeJson, resultBundle } from '../src/lib/cortex/experiment.js';
import { currentStepSummary, adjacentSpikeFrame } from '../src/lib/cortex/current-step.js';

test('long-step bounds retain strict preflight memory and complete recovery windows', () => {
  const c = freshActiveConfig();
  Object.assign(c.protocol, { startMs: 50, durationMs: 1000 });
  Object.assign(c.solver, { durationMs: 1200, sampleMs: 0.5 });
  assert.deepEqual(parseConfig(encodeJson(c)), c);
  assert.ok(makeWorld(c));
  const dense = structuredClone(c); dense.solver.sampleMs = 0.05;
  assert.throws(() => makeWorld(dense), /budget|64 MB/);
  const end = structuredClone(c); end.solver.durationMs = 1050;
  assert.throws(() => validateConfig(end), /drive must end/);
  const oversized = structuredClone(c); oversized.solver.durationMs = 1200.005;
  assert.throws(() => validateConfig(oversized), /Experiment duration/);
  const coarse = structuredClone(c); coarse.solver.sampleMs = 0.6;
  assert.throws(() => validateConfig(coarse), /Output sampling/);
  const fractional = structuredClone(c); fractional.solver.sampleMs = 0.123;
  assert.throws(() => validateConfig(fractional), /integer multiple/);
  const passive = freshConfig(); passive.protocol.durationMs = 200;
  assert.throws(() => validateConfig(passive), /Drive duration/);
});

test('step statistics distinguish onset, offset, recovery, no event and single event', () => {
  const r = { config: { protocol: { mode: 'intracellular-current', startMs: 10, durationMs: 40 } },
    spikes: [5, 10, 20, 45, 50, 60].map(timeMs => ({ timeMs })) };
  const s = currentStepSummary(r);
  assert.equal(s.spikeCount, 3); assert.equal(s.countRateHz, 75);
  assert.equal(s.latencyMs, 0); assert.equal(s.firstIsiMs, 10); assert.equal(s.lastIsiMs, 25);
  assert.deepEqual(s.events.map(e => e.duringStep), [false, true, true, true, false, false]);
  r.spikes = []; assert.equal(currentStepSummary(r).latencyMs, null);
  r.spikes = [{ timeMs: 15 }]; assert.equal(currentStepSummary(r).firstIsiMs, null);
  assert.equal(currentStepSummary(null), null);
  assert.equal(currentStepSummary({ ...r, spikes: undefined }), null);
});

test('spike navigation advances across rounded event samples without getting stuck', () => {
  const r = { timeMs: Float64Array.from([0, 1, 2, 3, 4]), spikes: [0.8, 2.2, 3.8].map(timeMs => ({ timeMs })) };
  assert.equal(adjacentSpikeFrame(r, 0, 1), 1);
  assert.equal(adjacentSpikeFrame(r, 1, 1), 2);
  assert.equal(adjacentSpikeFrame(r, 2, -1), 1);
  assert.equal(adjacentSpikeFrame(r, 4, 1), -1);
  assert.equal(adjacentSpikeFrame(r, 1, -1), -1);
});

test('coarser retained sampling preserves every internally detected spike and the injected charge', () => {
  const c = getExampleConfig('active-current-step-200ms');
  c.solver.sampleMs = 0.25;
  const r = runExperiment(c);
  const report = JSON.parse(readFileSync(new URL('../docs/cortex/benchmarks/examples-latest.json', import.meta.url)));
  const fine = report.cases.find(e => e.id === 'active-current-step-200ms');
  assert.deepEqual(r.spikes, fine.somaSpikes);
  assert.equal(currentStepSummary(r).spikeCount, 9);
  assert.equal(currentStepSummary(r).countRateHz, 45);
  assert.ok(currentStepSummary(r).lastIsiMs > currentStepSummary(r).firstIsiMs);
  assert.equal(r.timeMs.at(-1), 250);
  let chargePc = 0;
  for (let i = 1; i < r.timeMs.length; i++) chargePc += r.drive[i] * (r.timeMs[i] - r.timeMs[i - 1]);
  assert.ok(Math.abs(chargePc - 0.3 * 200) < 1e-8);
  assert.equal(r.drive.at(-1), 0);
  assert.ok(r.diagnostics.maxConservationResidualNa < 1e-8);
  assert.ok(r.diagnostics.outputBytes < 64 * 1024 * 1024);
  const bundle = resultBundle(r);
  assert.deepEqual(bundle.config, c);
});
