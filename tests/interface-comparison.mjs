import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { freshInterfaceConfig, validateInterfaceConfig, INTERFACE_COMPARISON_VERSION } from '../src/lib/cortex/interface-contract.js';
import { loadInterfaceModels } from '../src/lib/cortex/interface-experiment.js';
import { runInterfaceComparison } from '../src/lib/cortex/interface-comparison.js';
import { validateInterfaceComparisonSpec, makeInterfaceComparisonConfigs, matchInterfaceEvents,
  canonicalInterfaceInput, analyzeInterfaceComparison } from '../src/lib/cortex/interface-comparison-analysis.js';

const readAsset = path => fs.readFile(new URL(`../public${path}`, import.meta.url));
const geometrySpec = { version: INTERFACE_COMPARISON_VERSION, kind: 'geometry', contactIndex: 0,
  baselineVariantId: '12x12', variantVariantId: '30x30', eventMatchWindowMs: 5 };
const stimulusSpec = { version: INTERFACE_COMPARISON_VERSION, kind: 'stimulation', eventMatchWindowMs: 5 };

// One cell and 20 ms bound the actual solver work. Source invariance compares
// complete computed Vm arrays and event lists, not only a summary spike count.
let geometry;
test('recording geometry comparison preserves every source trajectory while changing the contact projection', async () => {
  const config = { ...freshInterfaceConfig(), count: 1, mode: 'recording', durationMs: 20 };
  await loadInterfaceModels(config, readAsset);
  const progress = [];
  geometry = runInterfaceComparison(config, geometrySpec, status => progress.push(status));
  const { baseline, variant, analysis } = geometry;
  assert.deepEqual(baseline.cells[0].membraneMv, variant.cells[0].membraneMv);
  assert.deepEqual(baseline.cells[0].somaMv, variant.cells[0].somaMv);
  assert.deepEqual(baseline.cells[0].spikeTimesMs, variant.cells[0].spikeTimesMs);
  assert.deepEqual(baseline.cells[0].somaInjectionNa, variant.cells[0].somaInjectionNa);
  assert.deepEqual(baseline.cells[0].nodes, variant.cells[0].nodes);
  assert.deepEqual(baseline.timeMs, variant.timeMs);
  assert.equal(baseline.design.contacts[0].widthUm, 12);
  assert.equal(variant.design.contacts[0].widthUm, 30);
  assert.deepEqual(baseline.design.contacts[0].centerUm, variant.design.contacts[0].centerUm);
  assert.notDeepEqual(baseline.neuralUv, variant.neuralUv, 'field cache must include geometry');
  assert.deepEqual(analysis.inputChanges, [{ path: 'contactGeometry.variantId', baseline: '12x12', variant: '30x30' }]);
  for (const result of [baseline, variant]) {
    assert.ok(result.cells[0].neuralUv instanceof Float64Array);
    assert.equal(result.cells[0].neuralUv.length, result.timeMs.length * 8);
    for (let i = 0; i < result.neuralUv.length; i++) {
      const sum = result.cells.reduce((s, cell) => s + cell.neuralUv[i], 0);
      assert.ok(Math.abs(sum - result.neuralUv[i]) <= 1e-10 * Math.max(1, Math.abs(sum)));
    }
  }
  assert.equal(analysis.cells[0].added.length, 0);
  assert.equal(analysis.cells[0].lost.length, 0);
  assert.ok(analysis.cells[0].matched.every(event => event.deltaMs === 0));
  const contact = analysis.contacts[0].neural;
  const values = baseline.neuralUv.filter((_, i) => i % 8 === 0);
  assert.equal(contact.baselinePeakToPeakUv, Math.max(...values) - Math.min(...values));
  assert.ok(contact.maximumAbsoluteDeltaUv > 0);
  assert.equal(progress.at(-1).comparisonProgress, 1);
  assert.deepEqual(analyzeInterfaceComparison(baseline, variant, geometry.spec), analysis);
});

test('stimulation comparison changes only amplitude while retaining combined background and source placement', async () => {
  const config = { ...freshInterfaceConfig(), count: 1, mode: 'combined', durationMs: 20, startMs: 5,
    amplitudeUa: 1, activeContacts: [0], contactGeometry: { contactIndex: 0, variantId: '20x20' } };
  await loadInterfaceModels(config, readAsset);
  const result = runInterfaceComparison(config, stimulusSpec), { baseline, variant, analysis } = result;
  assert.equal(baseline.config.mode, 'combined');
  assert.equal(variant.config.mode, 'combined');
  assert.equal(baseline.cells[0].backgroundNa, variant.cells[0].backgroundNa);
  assert.ok(baseline.cells[0].backgroundNa > 0);
  assert.deepEqual(baseline.cells[0].somaInjectionNa, variant.cells[0].somaInjectionNa);
  assert.deepEqual(baseline.cells[0].nodes, variant.cells[0].nodes);
  assert.deepEqual(baseline.design, variant.design);
  assert.deepEqual(analysis.inputChanges, [{ path: 'amplitudeUa', baseline: 0, variant: 1 }]);
  assert.ok(baseline.currentUa.every(value => value === 0));
  assert.ok(variant.currentUa.some(value => value !== 0));
  assert.notDeepEqual(baseline.cells[0].membraneMv, variant.cells[0].membraneMv, 'both conditions must be solved under their own forcing');
});

test('analysis rejects changed source identity, pose, drive, timebase and unrelated inputs', () => {
  const { baseline, variant, spec } = geometry;
  for (const change of [
    value => { value.cells[0].id = 'different'; },
    value => { value.cells[0].somaUm[0] += 1; },
    value => { value.cells[0].nodes[0].areaUm2 += 1; },
    value => { value.cells[0].backgroundNa += .1; },
    value => { value.timeMs[1] += .01; },
    value => { value.config.conductivitySm += .1; },
    value => { value.cells[0].neuralUv[0] += 1; },
  ]) {
    const changed = structuredClone(variant); change(changed);
    assert.throws(() => analyzeInterfaceComparison(baseline, changed, spec));
  }
});

test('comparison configuration validation rejects ambiguous, ineffective and unsupported controls', () => {
  assert.equal(validateInterfaceConfig(freshInterfaceConfig()).contactGeometry, null);
  assert.throws(() => validateInterfaceConfig({ ...freshInterfaceConfig(), contactGeometry: { contactIndex: 8, variantId: '12x12' } }));
  assert.throws(() => validateInterfaceComparisonSpec({ ...geometrySpec, variantVariantId: '12x12' }));
  assert.throws(() => validateInterfaceComparisonSpec({ ...geometrySpec, variantVariantId: 'imaginary' }));
  assert.throws(() => validateInterfaceComparisonSpec({ ...geometrySpec, eventMatchWindowMs: 10 }));
  assert.throws(() => validateInterfaceComparisonSpec({ ...stimulusSpec, contactIndex: 0 }));
  assert.throws(() => makeInterfaceComparisonConfigs(freshInterfaceConfig(), stimulusSpec));
  assert.throws(() => makeInterfaceComparisonConfigs({ ...freshInterfaceConfig(), mode: 'evoked', amplitudeUa: 0 }, stimulusSpec));
  assert.throws(() => makeInterfaceComparisonConfigs({ ...freshInterfaceConfig(), mode: 'evoked', durationMs: 20, startMs: 19.9 }, stimulusSpec));
  assert.equal(canonicalInterfaceInput({ b: [2, 1], a: 3 }), canonicalInterfaceInput({ a: 3, b: [2, 1] }));
  assert.throws(() => canonicalInterfaceInput({ value: NaN }));
});

test('event matching uses inclusive boundaries, ordered maximum cardinality and minimum timing displacement', () => {
  assert.deepEqual(matchInterfaceEvents([], []), { matched: [], added: [], lost: [] });
  const edge = matchInterfaceEvents([10, 30, 50], [5, 35, 55.00001]);
  assert.deepEqual(edge.matched.map(e => e.deltaMs), [-5, 5]);
  assert.deepEqual(edge.matched.map(e => e.classification), ['advanced', 'delayed']);
  assert.deepEqual(edge.lost, [{ baselineIndex: 2, timeMs: 50 }]);
  assert.deepEqual(edge.added, [{ variantIndex: 2, timeMs: 55.00001 }]);
  // Greedy nearest-neighbor at t=4 could steal the only candidate for t=8.
  const cardinality = matchInterfaceEvents([4, 8], [0, 5]);
  assert.equal(cardinality.matched.length, 2);
  assert.deepEqual(cardinality.matched.map(e => e.deltaMs), [-4, -3]);
  const nearest = matchInterfaceEvents([0, 4], [3]);
  assert.equal(nearest.matched[0].baselineIndex, 1);
  assert.equal(matchInterfaceEvents([1], [1]).matched[0].classification, 'unchanged');
  assert.throws(() => matchInterfaceEvents([2, 1], [1]));
  assert.throws(() => matchInterfaceEvents([1, 1], [1]));
  assert.throws(() => matchInterfaceEvents([NaN], []));
});
