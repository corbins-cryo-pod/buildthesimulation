import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const assets = new URL('../public/assets/finger-pathway-atlas/', import.meta.url);
const read = relative => readFileSync(new URL(relative, assets));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const original = JSON.parse(gunzipSync(Buffer.concat([read('v3/anatomy.json.gz.part-1.bin'), read('v3/anatomy.json.gz.part-2.bin')])));
const scaffold = JSON.parse(read('v4/scaffold.json'));
const provenance = JSON.parse(read('v4/scaffold-provenance.json'));

test('overview retains every supplied V3 anatomical mesh within its startup budget', () => {
  assert.deepEqual(scaffold.meshes.map(m => m.id).sort(), original.meshes.map(m => m.id).sort());
  const categories = {};
  for (const mesh of original.meshes) categories[mesh.category] = (categories[mesh.category] || 0) + 1;
  assert.deepEqual(scaffold.stats.categories, categories);
  assert.equal(scaffold.meshes.filter(m => m.category === 'bone').length, 41);
  assert.equal(scaffold.meshes.filter(m => m.category === 'muscle').length, 4);
  assert.ok(scaffold.meshes.some(m => m.name === 'right flexor digitorum profundus'));
  assert.ok(scaffold.meshes.some(m => m.name === 'distal phalanx of right index finger'));
  assert.ok(scaffold.stats.vertices < 80000);
  assert.ok(read('v4/scaffold.json.gz').length < 1024 * 1024);
  assert.deepEqual(gunzipSync(read('v4/scaffold.json.gz')), read('v4/scaffold.json'));
  assert.equal(hash(read('v4/scaffold.json')), provenance.output.sha256);
});

test('every lazy detail preserves the exact V3 positions, triangle topology, frame and provenance', () => {
  let sourceVertices = 0, sourceTriangles = 0;
  for (const source of original.meshes) {
    const overview = scaffold.meshes.find(m => m.id === source.id), descriptor = overview.detail;
    assert.equal(descriptor.encoding, 'base64-float32-uint32-le');
    assert.equal(descriptor.url, `/assets/finger-pathway-atlas/v4/source-meshes/${source.id}.json`);
    assert.equal(descriptor.gzipUrl, `${descriptor.url}.gz`);
    const raw = read(`v4/source-meshes/${source.id}.json`), gz = read(`v4/source-meshes/${source.id}.json.gz`);
    assert.deepEqual(gunzipSync(gz), raw, source.id);
    assert.equal(raw.length, descriptor.bytes, source.id);
    assert.equal(gz.length, descriptor.gzipBytes, source.id);
    assert.equal(hash(raw), descriptor.sha256, source.id);
    const detail = JSON.parse(raw), positions = Buffer.from(detail.p, 'base64'), indices = Buffer.from(detail.i, 'base64');
    assert.equal(detail.p, source.restP || source.p, `${source.id}: positions were changed`);
    assert.equal(detail.i, source.i, `${source.id}: source topology was changed`);
    assert.equal(detail.source, source.source, source.id);
    assert.equal(detail.sourceSha256, source.sha256, source.id);
    assert.equal(detail.license, source.license, source.id);
    assert.equal(detail.category, source.category, source.id);
    assert.equal(detail.units, 'mm');
    assert.equal(positions.length, source.nv * 12, source.id);
    assert.equal(indices.length, source.nf * 12, source.id);
    assert.equal(hash(positions), descriptor.positionSha256, source.id);
    assert.equal(hash(indices), descriptor.indexSha256, source.id);
    for (let i = 0; i < positions.length; i += 4) assert.ok(Number.isFinite(positions.readFloatLE(i)), source.id);
    for (let i = 0; i < indices.length; i += 4) assert.ok(indices.readUInt32LE(i) < source.nv, source.id);
    sourceVertices += detail.nv; sourceTriangles += detail.nf;
  }
  assert.equal(sourceVertices, scaffold.sourceStats.vertices);
  assert.equal(sourceTriangles, scaffold.sourceStats.triangles);
  assert.equal(sourceVertices, provenance.sourceDetail.vertices);
  assert.equal(sourceTriangles, provenance.sourceDetail.triangles);
});
