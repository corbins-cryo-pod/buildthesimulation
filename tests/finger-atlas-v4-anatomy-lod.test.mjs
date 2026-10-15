import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Box3, Group, PerspectiveCamera, Vector3 } from 'three';
import { createAnatomyLOD, decodeSourceGeometry } from '../src/lib/finger-atlas-v4/anatomy-lod.mjs';

const publicRoot = fileURLToPath(new URL('../public', import.meta.url));
const scaffold = JSON.parse(fs.readFileSync(`${publicRoot}/assets/finger-pathway-atlas/v4/scaffold.json`, 'utf8'));

test('source decoder retains every original encoded vertex and triangle index', () => {
  const entry = scaffold.meshes.find(mesh => mesh.category === 'cns');
  const source = JSON.parse(fs.readFileSync(publicRoot + entry.detail.url, 'utf8'));
  const geometry = decodeSourceGeometry(source);
  try {
    const expectedPositions = Buffer.from(source.p, 'base64');
    const expectedIndices = Buffer.from(source.i, 'base64');
    const positions = geometry.attributes.position.array;
    const indices = geometry.index.array;
    assert.deepEqual(Buffer.from(positions.buffer, positions.byteOffset, positions.byteLength), expectedPositions);
    assert.deepEqual(Buffer.from(indices.buffer, indices.byteOffset, indices.byteLength), expectedIndices);
    assert.equal(indices.length / 3, entry.detail.triangles);
    assert.ok(geometry.attributes.normal.array.every(Number.isFinite));
  } finally { geometry.dispose(); }
});

test('intact original skin loads once nearby, replaces overview geometry, and follows its visibility control', async t => {
  const entry = scaffold.meshes.find(mesh => mesh.category === 'skin');
  const group = new Group(), camera = new PerspectiveCamera(34, 1.6, .00001, 8000);
  const bounds = new Box3(new Vector3(...entry.bounds[0]), new Vector3(...entry.bounds[1]));
  const target = bounds.getCenter(new Vector3());
  camera.position.copy(target).add(new Vector3(0, 0, 50));
  camera.lookAt(target);
  camera.updateMatrixWorld();
  const state = { skin: true, envelopes: true, quality: 'balanced' };
  let fetches = 0, wake;
  const loaded = new Promise(resolve => { wake = resolve; });
  t.mock.method(globalThis, 'fetch', async url => {
    fetches++;
    assert.ok(url === entry.detail.url || url === entry.detail.gzipUrl);
    return new Response(fs.readFileSync(publicRoot + url));
  });
  const lod = createAnatomyLOD({ group, camera, controls: { target }, state, requestDraw: wake, reportError: error => { throw error; } });
  lod.add(entry);
  const mesh = group.children[0], overview = mesh.geometry;
  const material = mesh.material;
  lod.update();
  await loaded;
  lod.update();
  const original = mesh.geometry;
  try {
    assert.notEqual(original, overview);
    assert.equal(original.index.count / 3, entry.detail.triangles);
    assert.equal(mesh.material, material, 'LOD keeps the same intact anatomical surface');
    assert.equal(fetches, 1);
    state.skin = false;
    lod.update();
    assert.equal(mesh.visible, false);
    assert.equal(mesh.geometry, overview);
    state.skin = true;
    lod.update();
    assert.equal(mesh.visible, true);
    assert.equal(mesh.geometry, original);
    assert.equal(fetches, 1, 'Returning to a retained source surface uses its cache');
    camera.position.copy(target).add(new Vector3(0, 0, 600));
    camera.updateMatrixWorld();
    lod.update();
    assert.equal(mesh.geometry, overview);
    assert.equal(lod.diagnostics.originalSurfacesCached, 1);
  } finally {
    overview.dispose(); original.dispose(); material.dispose();
  }
});
