import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { decodeInterfaceArchive, encodeInterfaceArchive } from '../src/lib/cortex/interface-archive.js';
import { validateInterfaceReplay } from '../src/lib/cortex/interface-replay-validation.js';
import { INTERFACE_ENGINE_MANIFEST } from '../src/lib/cortex/interface-build-manifest.js';

for (const name of ['geometry','stimulation']) test(`saved ${name} comparison preserves paired evidence and reopens with recomputed metrics`, async () => {
  const base = new URL(`../public/models/cortex/interface/${name}`, import.meta.url);
  const bytes = await readFile(new URL(base.href + '.bin.gz'));
  const summary = JSON.parse(await readFile(new URL(base.href + '.json')));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), summary.sha256);
  assert.ok(bytes.length < 24 * 1024 ** 2);
  const stored = decodeInterfaceArchive(gunzipSync(bytes));
  stored.analysis = { forgedMetric: 999 };
  const pair = validateInterfaceReplay(stored);
  assert.equal(pair.spec.kind, name);
  assert.equal(pair.analysis.forgedMetric, undefined);
  assert.deepEqual(pair.analysis, summary.analysis);
  for (const run of [pair.baseline, pair.variant]) {
    assert.equal(run.cells.length, 12); assert.equal(run.compartments, 3428);
    assert.deepEqual(run.solverSourceHashes, INTERFACE_ENGINE_MANIFEST.sourceHashes);
  }
  if (name === 'geometry') {
    for (let ci = 0; ci < 12; ci++) {
      assert.deepEqual(pair.baseline.cells[ci].membraneMv, pair.variant.cells[ci].membraneMv);
      assert.deepEqual(pair.baseline.cells[ci].spikeTimesMs, pair.variant.cells[ci].spikeTimesMs);
    }
    assert.ok(pair.analysis.contacts[4].neural.maximumAbsoluteDeltaUv > 0);
    assert.deepEqual(pair.analysis.inputChanges.map(change => change.path), ['contactGeometry.variantId']);
    const hashes = { ...pair.variant.solverSourceHashes };
    hashes[Object.keys(hashes)[0]] = '0'.repeat(64);
    assert.throws(() => validateInterfaceReplay({ ...pair, variant: { ...pair.variant, solverSourceHashes: hashes } }), /different engine/);
    assert.throws(() => validateInterfaceReplay({ ...pair, baseline: { ...pair.baseline, solverSourceHashes: undefined } }), /provenance/);
  } else {
    assert.ok(pair.baseline.cells.every(cell => cell.spikeTimesMs.length === 0));
    assert.deepEqual(pair.analysis.inputChanges.map(change => change.path), ['amplitudeUa']);
    assert.equal(pair.variant.cells[7].specimenId, 601927090);
    assert.equal(pair.variant.cells[7].spikeTimesMs.length, 2);
    assert.ok(pair.variant.cells.every((cell, ci) => ci === 7 || cell.spikeTimesMs.length === 0));
    assert.equal(pair.analysis.cells[7].added.length, 2);
    const reopened = validateInterfaceReplay(decodeInterfaceArchive(encodeInterfaceArchive(pair)));
    assert.deepEqual(reopened.analysis, pair.analysis);
    assert.deepEqual(reopened.variant.cells[7].membraneMv, pair.variant.cells[7].membraneMv);
  }
});
