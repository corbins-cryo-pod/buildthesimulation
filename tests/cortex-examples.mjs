import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EXAMPLES, getExampleConfig } from '../src/lib/cortex/examples.js';
import { validateConfig } from '../src/lib/cortex/config.js';
import { runExperiment } from '../src/lib/cortex/experiment.js';
import { assessExample, configHash, sourceHashes } from '../scripts/verify-cortex-examples.mjs';

const report = JSON.parse(readFileSync(new URL('../docs/cortex/benchmarks/examples-latest.json', import.meta.url)));

test('curated experiments retain exact complete configs and current executable verification provenance', () => {
  assert.equal(report.status, 'passed');
  assert.deepEqual(report.sourceHashes, sourceHashes(),
    'Example source changed: rerun node scripts/verify-cortex-examples.mjs and review measured outcomes.');
  assert.deepEqual(report.cases.map((c) => c.id), EXAMPLES.map((e) => e.id));
  for (const entry of EXAMPLES) {
    const config = getExampleConfig(entry.id);
    const stored = report.cases.find((c) => c.id === entry.id);
    assert.deepEqual(validateConfig(config), stored.config);
    assert.equal(configHash(config), stored.configSha256);
    assert.equal(stored.status.status, 'passed');
    assert.ok(entry.purpose && entry.expectedBehavior && entry.resetDisclosure && entry.verification);
    assert.ok(!entry.view.baselineExampleId || EXAMPLES.some((e) => e.id === entry.view.baselineExampleId));
  }
  const changed = getExampleConfig('extracellular-soma-spike');
  changed.implant.translationUm[0] = 999;
  assert.equal(getExampleConfig('extracellular-soma-spike').implant.translationUm[0], 100);
  assert.throws(() => getExampleConfig('not-an-example'), /Unknown cortex example/);
});

test('placement and polarity comparisons change only the stated physical setting', () => {
  const shifted = getExampleConfig('extracellular-soma-spike');
  const unshifted = getExampleConfig('extracellular-unshifted');
  unshifted.implant.translationUm = [...shifted.implant.translationUm];
  assert.deepEqual(unshifted, shifted);
  const reversed = getExampleConfig('extracellular-reversed-polarity');
  reversed.protocol.sourceContactIds.reverse();
  assert.deepEqual(reversed, shifted);
  assert.deepEqual(getExampleConfig('recording-components'), getExampleConfig('extracellular-local-crossings'));
});

test('array soma-spike candidate, rigid placement and reversed polarity reproduce calculated outcomes', () => {
  const results = [];
  for (const id of ['extracellular-soma-spike', 'extracellular-unshifted', 'extracellular-reversed-polarity']) {
    const entry = EXAMPLES.find((e) => e.id === id);
    const result = runExperiment(getExampleConfig(id));
    const measured = report.cases.find((c) => c.id === id);
    assert.equal(assessExample(entry, result).status, 'passed');
    assert.equal(result.spikes.length, measured.somaSpikes.length);
    for (let i = 0; i < result.spikes.length; i++)
      assert.ok(Math.abs(result.spikes[i].timeMs - measured.somaSpikes[i].timeMs) < 1e-9);
    assert.equal(Array.from(result.firstCrossingByCompartment).filter(Number.isFinite).length,
      measured.localCrossingCount);
    results.push(result);
  }
  const [shifted, unshifted, reversed] = results;
  for (let ch = 0; ch < 2; ch++)
    for (let frame = 0; frame < shifted.timeMs.length; frame++) {
      assert.ok(Math.abs(shifted.appliedUv[ch][frame] - unshifted.appliedUv[ch][frame]) < 1e-10);
      assert.ok(Math.abs(shifted.appliedUv[ch][frame] + reversed.appliedUv[ch][frame]) < 1e-10);
    }
});
