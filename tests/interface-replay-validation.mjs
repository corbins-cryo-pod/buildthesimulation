import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync, gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { decodeInterfaceArchive, encodeInterfaceArchive } from '../src/lib/cortex/interface-archive.js';
import { validateInterfaceReplay, readInterfaceReplayFile, MAX_INTERFACE_FILE_BYTES } from '../src/lib/cortex/interface-replay-validation.js';
import { INTERFACE_ENGINE_MANIFEST } from '../src/lib/cortex/interface-build-manifest.js';

test('bundled engine manifest identifies exact numerical sources', async () => {
  for (const [path, expected] of Object.entries(INTERFACE_ENGINE_MANIFEST.sourceHashes))
    assert.equal(createHash('sha256').update(await readFile(new URL('../' + path, import.meta.url))).digest('hex'), expected,
      `Regenerate the interface manifest after changing ${path}`);
});

test('existing full replay validates junctions and rejects mismatched geometry, events and buffers', async () => {
  const bytes = gunzipSync(await readFile(new URL('../public/models/cortex/interface/evoked.bin.gz', import.meta.url)));
  const run = decodeInterfaceArchive(bytes);
  assert.equal(validateInterfaceReplay(run).config.contactGeometry, null);
  assert.ok(run.cells.some(cell => cell.nodes.some(node => node.kind === 'junction' && !node.pathUm.length)));
  const pad = run.design.contacts[0], width = pad.widthUm;
  pad.widthUm = 999; assert.throws(() => validateInterfaceReplay(run), /geometry/); pad.widthUm = width;
  const cell = run.cells[0], samples = cell.membraneMv;
  cell.membraneMv = samples.subarray(1); assert.throws(() => validateInterfaceReplay(run), /shape/); cell.membraneMv = samples;
  const value = samples[0]; samples[0] = NaN; assert.throws(() => validateInterfaceReplay(run), /nonfinite/); samples[0] = value;
  const events = cell.spikeTimesMs;
  cell.spikeTimesMs = [1]; assert.throws(() => validateInterfaceReplay(run), /classification/); cell.spikeTimesMs = events;
  const parent = cell.nodes[0].parent;
  cell.nodes[0].parent = 0; assert.throws(() => validateInterfaceReplay(run), /geometry/); cell.nodes[0].parent = parent;
  const active = run.config.activeContacts; delete run.config.activeContacts;
  assert.throws(() => validateInterfaceReplay(run), /protocol fields/); run.config.activeContacts = active;
  run.currentUa[0] = 123; assert.throws(() => validateInterfaceReplay(run), /pulse protocol/); run.currentUa[0] = 0;
  const injection = cell.somaInjectionNa[0]; cell.somaInjectionNa[0] = 1;
  assert.throws(() => validateInterfaceReplay(run), /background protocol/); cell.somaInjectionNa[0] = injection;
  const soma = cell.somaMv[0]; cell.somaMv[0] += 1;
  assert.throws(() => validateInterfaceReplay(run), /soma trace/); cell.somaMv[0] = soma;
  assert.equal(validateInterfaceReplay(run).cells[0], cell);
});

test('archive reader bounds headers, constructor names and overlapping allocation', () => {
  const make = header => {
    const json = new TextEncoder().encode(JSON.stringify(header)), bytes = new Uint8Array(8 + json.length + 16);
    bytes.set([67,73,70,49]); new DataView(bytes.buffer).setUint32(4, json.length, true); bytes.set(json, 8); return bytes;
  };
  assert.throws(() => decodeInterfaceArchive(new Uint8Array(7)), /Incomplete/);
  assert.throws(() => decodeInterfaceArchive(make({ a: { $array:'constructor', offset:0, length:1 } })), /Invalid/);
  assert.throws(() => decodeInterfaceArchive(make({ a:{ $array:'Float64Array', offset:0, length:2 }, b:{ $array:'Float64Array', offset:0, length:2 } })), /Overlapping/);
  assert.throws(() => decodeInterfaceArchive(make({ a:{ $array:'Float64Array', offset:0, length:2, scale:.01 } })), /scaled/);
  const oversized = new Uint8Array([67,73,70,49,0,0,0,0]); new DataView(oversized.buffer).setUint32(4, 25 * 1024 ** 2, true);
  assert.throws(() => decodeInterfaceArchive(oversized), /header/);
});

test('user file import supports gzip and raw CIF1 and rejects unsupported files before allocation', async () => {
  const compressed = await readFile(new URL('../public/models/cortex/interface/evoked.bin.gz', import.meta.url));
  const gzip = await readInterfaceReplayFile(new Blob([compressed]));
  assert.equal(gzip.cells.length, 12);
  const raw = await readInterfaceReplayFile(new Blob([encodeInterfaceArchive(gzip)]));
  assert.deepEqual(raw.cells[7].spikeTimesMs, gzip.cells[7].spikeTimesMs);
  assert.deepEqual(raw.neuralUv, gzip.neuralUv);
  await assert.rejects(readInterfaceReplayFile({ size: MAX_INTERFACE_FILE_BYTES + 1 }), /64 MiB/);
  await assert.rejects(readInterfaceReplayFile(new Blob(['not a replay'])), /Invalid/);
  await assert.rejects(readInterfaceReplayFile(new Blob([gzipSync(Buffer.from('not a replay'))])), /Invalid/);
});
