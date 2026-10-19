import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, presetConfig } from '../src/lib/stimulation/config.js';
import { compileCable, stepCable, MEMBRANE_DOMAIN_LIMIT_MV } from '../src/lib/stimulation/membrane.js';
import { qualifyResponse, measureRecruitment, runExperiment, RECRUITMENT_VALIDITY } from '../src/lib/stimulation/experiment.js';

const cell = (overrides = {}) => ({ firstSpike: 1.3, firstNode: 3, firstKind: 'axon', somaSpike: 1.6, axonSpike: 1.3, extreme: false, somaDistance: 90, ...overrides });

test('a later voltage-domain violation invalidates earlier crossings and preserves their diagnostics', () => {
  const raw = cell({ extreme: true, domainViolation: { timeMs: 2, compartment: 7, voltageMv: -205 }, peakAbsVoltageMv: 205 });
  const qualified = qualifyResponse(raw);
  assert.equal(qualified.responseStatus, 'invalid');
  assert.equal(qualified.valid, false);
  assert.equal(qualified.firstSpike, -1);
  assert.equal(qualified.somaSpike, -1);
  assert.equal(qualified.axonSpike, -1);
  assert.equal(qualified.firstNode, -1);
  assert.equal(qualified.diagnosticCrossings.firstSpike, 1.3);
  assert.equal(qualified.diagnosticCrossings.firstNode, 3);
  assert.equal(qualified.diagnosticCrossings.somaSpike, 1.6);
  assert.equal(raw.firstSpike, 1.3, 'source diagnostics must not be mutated');
  assert.deepEqual(qualified.domainViolation, raw.domainViolation);
});

test('invalid spiking and invalid nonspiking cells affect neither recruitment denominators nor distance extents', () => {
  const samples = [cell(), cell({ firstSpike: -1, somaSpike: -1, axonSpike: -1, firstNode: -1, firstKind: '', somaDistance: 120 }), cell({ extreme: true, somaDistance: 590 }), cell({ extreme: true, firstSpike: -1, somaSpike: -1, axonSpike: -1, somaDistance: 5 })].map(qualifyResponse);
  const { summary, bins } = measureRecruitment(samples);
  assert.deepEqual(summary, { activated: 1, valid: 2, invalid: 2, silent: 1, axonal: 1, somatic: 1, firstAxonal: 1, medianDistance: 90, p90Distance: 90 });
  assert.equal(bins.reduce((sum, b) => sum + b.total, 0), 2);
  assert.equal(bins.reduce((sum, b) => sum + b.activated, 0), 1);
  assert.equal(bins.reduce((sum, b) => sum + b.invalid, 0), 2);
  const empty = measureRecruitment(samples.filter(n => !n.valid));
  assert.equal(empty.summary.valid, 0);
  assert.equal(empty.summary.activated, 0);
  assert.equal(empty.summary.p90Distance, 0);
  assert(empty.bins.every(b => b.total === 0 && b.activated === 0));
});

test('diagnostic instrumentation leaves within-domain membrane trajectories unchanged', () => {
  const nodes = Array.from({ length: 5 }, (_, i) => ({ position: [i * 20, 0, 0], diameter: 1, length: 20, area: 20 * Math.PI, kind: 'axon', parent: i - 1 }));
  const morphology = [{ cell: { inhibitory: false }, nodes, ais: 0 }];
  const a = compileCable(morphology, DEFAULT_CONFIG, [0, 1, 2, 3, 4]);
  const b = compileCable(morphology, DEFAULT_CONFIG, [0, 1, 2, 3, 4]);
  const state = { firstSpike: [-1], somaSpike: [-1], axonSpike: [-1], firstNode: [-1], extreme: [0], invalidAt: [-1], invalidNode: [-1], invalidVoltage: [0], peakAbsVoltage: [70] };
  for (let step = 0; step < 100; step++) {
    stepCable(a, .2, step * a.dt);
    stepCable(b, .2, step * b.dt, state);
  }
  assert.deepEqual(a.voltage, b.voltage);
  assert.equal(state.extreme[0], 0);
  assert.equal(state.invalidAt[0], -1);
  assert.equal(qualifyResponse(cell({ firstSpike: -1, somaSpike: -1, axonSpike: -1 })).responseStatus, 'silent');
  assert.equal(qualifyResponse(cell()).firstSpike, 1.3);
});

test('real suprathreshold run excludes flagged cells while keeping unclipped diagnostics', () => {
  const result = runExperiment(presetConfig('bipolar', { ...DEFAULT_CONFIG, width: 300, depth: 300, sampleCount: 64, amplitude: 20, quadrature: 64 }));
  assert.equal(result.summary.solved, 63);
  assert.equal(result.summary.invalid, 2);
  assert.equal(result.summary.valid, 61);
  assert.equal(result.summary.activated, 7);
  const invalid = result.samples.filter(n => !n.valid);
  assert.equal(invalid.filter(n => n.diagnosticCrossings.firstSpike >= 0).length, 1);
  assert(invalid.every(n => n.firstSpike === -1 && n.somaSpike === -1 && n.axonSpike === -1));
  assert(invalid.every(n => n.peakAbsVoltageMv > MEMBRANE_DOMAIN_LIMIT_MV && Math.abs(n.domainViolation.voltageMv) > MEMBRANE_DOMAIN_LIMIT_MV && n.domainViolation.timeMs > 0));
  assert.equal(result.bins.reduce((sum, b) => sum + b.total, 0), result.summary.valid);
  assert.equal(result.bins.reduce((sum, b) => sum + b.invalid, 0), result.summary.invalid);
  assert.equal(result.traces.count, result.summary.solved, 'diagnostic traces retain every simulated cell');
  assert(result.traces.soma.every(Number.isFinite));
  assert.deepEqual(result.recruitmentValidity, RECRUITMENT_VALIDITY);
});
