import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { decodeInterfaceArchive } from '../src/lib/cortex/interface-archive.js';
import { INTERFACE_PRESETS } from '../src/lib/cortex/interface-presets.js';
for (const name of ['default', 'evoked']) test(`saved ${name} replay matches its protocol, source fingerprints and event claims`, async () => {
  const root = new URL('../', import.meta.url), path = `public/models/cortex/interface/${name}`;
  const bytes = await readFile(new URL(path + '.bin.gz', root));
  const summary = JSON.parse(await readFile(new URL(path + '.json', root)));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), summary.sha256);
  assert.ok(bytes.length < 24 * 1024 ** 2, 'Replay exceeds static-host file size budget');
  const result = decodeInterfaceArchive(gunzipSync(bytes));
  assert.equal(result.cells.length, 12); assert.equal(result.compartments, 3428);
  assert.equal(result.replayPrecisionMv, .01);
  for (const [path, hash] of Object.entries(result.solverSourceHashes))
    assert.equal(createHash('sha256').update(await readFile(new URL(path, root))).digest('hex'), hash, `Stale saved example: ${path}`);
  for (const [i, cell] of result.cells.entries()) {
    assert.equal(cell.id, INTERFACE_PRESETS[i].modelId);
    assert.equal(cell.membraneMv.length, cell.nodes.length * result.timeMs.length);
    assert.ok(cell.membraneMv.every(Number.isFinite));
    assert.equal(cell.backgroundNa, name === 'default' ? INTERFACE_PRESETS[i].backgroundNa : 0);
    if (name === 'default') assert.ok(cell.spikeTimesMs.length >= 2, `Cell ${i+1} does not repeatedly fire`);
    else assert.equal(cell.spikeTimesMs.length, cell.specimenId === 601927090 ? 2 : 0);
  }
  assert.ok(result.neuralUv.every(Number.isFinite));
  assert.ok(result.artifactUv.every(Number.isFinite));
  if (name === 'default') assert.ok(result.artifactUv.every(v => v === 0));
  else {
    assert.deepEqual(result.config.activeContacts, [4]); assert.equal(result.config.amplitudeUa, 40);
    assert.equal(result.config.mode, 'evoked'); assert.equal(result.config.durationMs, 100);
    const cell = result.cells.find(c => c.specimenId === 601927090);
    assert.ok(Math.abs(cell.spikeTimesMs[0] - 20.8709137) < 1e-5);
    assert.ok(Math.abs(cell.spikeTimesMs[1] - 70.7938081) < 1e-5);
  }
});
