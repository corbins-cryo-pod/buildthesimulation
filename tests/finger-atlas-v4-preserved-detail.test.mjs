import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { Box3, PerspectiveCamera, Vector3 } from 'three';
import { createAtlasModel } from '../src/lib/finger-atlas-v4/model.mjs';
import { computeDetailFocus } from '../src/lib/finger-atlas-v4/focus.mjs';
import { transformPreservedPoint } from '../src/lib/finger-atlas-v4/preserved-registration.mjs';
import { PRESERVED_CELL_MANIFEST, loadPreservedCell, createPreservedCellDetail, preservedAnchorInfo, preservedCellPaths, preservedAssetCacheStats } from '../src/lib/finger-atlas-v4/preserved-morphology.mjs';

const publicRoot = fileURLToPath(new URL('../public', import.meta.url));
const model = createAtlasModel();
const first = type => model.cells.find(cell => cell.type === type);
const fetcher = async url => new Response(fs.readFileSync(publicRoot + url));
const dispose = group => group.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
const bytes = array => Buffer.from(array.buffer, array.byteOffset, array.byteLength);

test('original detail loading coalesces concurrent requests, releases failures, and permits retry', async () => {
  const cell = first('m1');
  let calls = 0;
  const counted = async url => { calls++; return fetcher(url); };
  await Promise.all(Array.from({ length: 5 }, () => loadPreservedCell(cell, { anchors: ['soma'], fetcher: counted })));
  assert.equal(calls, 1, 'Five concurrent requests for one source require one download');
  assert.equal(preservedAnchorInfo(cell, 'soma').loaded, true);
  const failedCell = first('free');
  await assert.rejects(loadPreservedCell(failedCell, { anchors: ['soma'], fetcher: async () => new Response('', { status: 503 }) }), /503/);
  assert.equal(preservedAssetCacheStats().pending, 0, 'Rejected promises must leave the shared pending cache');
  await loadPreservedCell(failedCell, { anchors: ['soma'], fetcher });
  assert.equal(preservedAnchorInfo(failedCell, 'soma').loaded, true);
  await assert.rejects(loadPreservedCell(first('golgi'), { anchors: ['terminal'], fetcher: () => new Promise(() => {}), timeoutMs: 5 }), /timed out/);
  assert.equal(preservedAssetCacheStats().pending, 0, 'A stalled source must not permanently block its cell');
  await loadPreservedCell(first('golgi'), { anchors: ['terminal'], fetcher });
});

test('original gzip assets still load without native DecompressionStream support', async () => {
  const cell = model.cells.find(item => item.type === 's1' && !preservedAnchorInfo(item, 'soma').loaded);
  assert.ok(cell, 'Use an uncached original source for the fallback request');
  const saved = globalThis.DecompressionStream;
  let requests = 0;
  try {
    globalThis.DecompressionStream = undefined;
    await loadPreservedCell(cell, { anchors: ['soma'], fetcher: async url => {
      requests++;
      assert.ok(url.endsWith('.json.gz'), 'Fallback decompresses the same original gzip pack');
      return fetcher(url);
    } });
    assert.equal(preservedAnchorInfo(cell, 'soma').loaded, true);
    assert.equal(requests, 1, 'Compatibility decompression requires no duplicate JSON download');
  } finally { globalThis.DecompressionStream = saved; }
});

test('restored source meshes, normals, connectivity, colors and centerlines survive registration without substitute arbors', async () => {
  const before = structuredClone(model);
  const cases = [
    ...['meissner', 'cuneate', 'vpl', 'dorsal-projection', 'lower-motor', 's1', 'm1'].map(type => [first(type), 'soma']),
    ...['meissner', 'merkel', 'pacinian', 'free', 'spindle', 'golgi', 'lower-motor'].map(type => [first(type), 'terminal']),
  ];
  for (const [cell, anchor] of cases) {
    await loadPreservedCell(cell, { anchors: [anchor], fetcher });
    const info = preservedAnchorInfo(cell, anchor);
    const record = PRESERVED_CELL_MANIFEST.templates.find(item => item.key === info.key);
    const payload = JSON.parse(gunzipSync(fs.readFileSync(publicRoot + record.url)).toString('utf8'));
    const expectedMeshes = payload.meshes.filter(mesh => !mesh.optional);
    const detail = createPreservedCellDetail(cell, { anchors: [anchor] });
    try {
      assert.equal(detail.userData.originalV3, true);
      assert.equal(detail.children.length, 1);
      const part = detail.children[0];
      assert.equal(part.children.length, expectedMeshes.length, `${info.key}: no extra regenerated membranes/arbors`);
      assert.deepEqual(part.scale.toArray(), [.001, .001, .001]);
      detail.updateMatrixWorld(true);
      expectedMeshes.forEach((source, i) => {
        const mesh = part.children[i];
        assert.equal(mesh.userData.originalV3, true);
        assert.equal(mesh.userData.sourceTemplate, info.key);
        assert.deepEqual(bytes(mesh.geometry.attributes.position.array), Buffer.from(source.positions, 'base64'), `${info.key}: original source vertices`);
        assert.deepEqual(bytes(mesh.geometry.index.array), Buffer.from(source.indices, 'base64'), `${info.key}: original triangle topology`);
        if (source.normals) assert.deepEqual(bytes(mesh.geometry.attributes.normal.array), Buffer.from(source.normals, 'base64'), `${info.key}: original normals`);
        assert.equal(mesh.material.color.getHex(), source.color);
        assert.equal(mesh.material.opacity, source.opacity);
        const point = new Vector3().fromBufferAttribute(mesh.geometry.attributes.position, 0);
        const expected = transformPreservedPoint(point.toArray(), info.registration);
        assert.ok(point.applyMatrix4(mesh.matrixWorld).distanceTo(new Vector3(...expected)) < 1e-8, `${info.key}: source placement uses its documented rigid transform`);
      });
      const paths = preservedCellPaths(cell, { anchors: [anchor] });
      const expectedPaths = (payload.paths || []).filter(path => !path.optional);
      assert.equal(paths.length, expectedPaths.length, `${info.key}: only captured original arbors`);
      paths.forEach((path, i) => {
        assert.equal(path.originalV3, true);
        assert.equal(path.points.length, expectedPaths[i].points.length);
        assert.deepEqual(path.points[0], transformPreservedPoint(expectedPaths[i].points[0], info.registration));
      });
      const focus = computeDetailFocus(cell, detail, { ending: anchor === 'terminal' });
      const bounds = new Box3().setFromObject(detail);
      for (const aspect of [.4, 1, 16 / 9]) {
        const camera = new PerspectiveCamera(34, aspect, .00001, 8000), center = new Vector3(...focus.center);
        camera.position.copy(center).add(new Vector3(.18, .10, 1).normalize().multiplyScalar(focus.distance * (aspect < 1 ? 1 / Math.max(.48, aspect) : 1)));
        camera.lookAt(center); camera.setViewOffset(1000 * aspect, 1000, 0, 90, 1000 * aspect, 1000); camera.updateMatrixWorld();
        for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
          const p = new Vector3(x, y, z).project(camera);
          assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && p.z > -1 && p.z < 1, `${info.key}: intact original detail fits aspect ${aspect}`);
        }
      }
    } finally { dispose(detail); }
  }
  assert.deepEqual(model, before, 'Preservation cannot mutate the canonical cell graph');
});

test('two displayed instances own independent original arrays and disposal cannot alter the shared source', async () => {
  const cell = first('meissner');
  await loadPreservedCell(cell, { anchors: ['soma'], fetcher });
  const a = createPreservedCellDetail(cell, { anchors: ['soma'] });
  const b = createPreservedCellDetail(cell, { anchors: ['soma'] });
  const ap = a.children[0].children[0].geometry.attributes.position.array;
  const bp = b.children[0].children[0].geometry.attributes.position.array;
  assert.notEqual(ap, bp);
  const original = bp[0]; ap[0] += 100;
  assert.equal(bp[0], original);
  dispose(a);
  const c = createPreservedCellDetail(cell, { anchors: ['soma'] });
  assert.equal(c.children[0].children[0].geometry.attributes.position.array[0], original);
  dispose(b); dispose(c);
});

test('organ inspection frames original receptor support while retaining the complete proximal source arbor', async () => {
  for (const type of ['meissner', 'merkel', 'pacinian', 'spindle', 'golgi', 'lower-motor']) {
    const cell = first(type);
    await loadPreservedCell(cell, { anchors: ['terminal'], fetcher });
    const detail = createPreservedCellDetail(cell, { anchors: ['terminal'] });
    try {
      detail.updateMatrixWorld(true);
      const meshes = [], capsules = [], support = [];
      detail.traverse(object => {
        if (!object.isMesh) return;
        meshes.push(object);
        if (object.userData.layer === 'support') support.push(object);
        if (object.userData.layer === 'skin' && /capsule/i.test(object.userData.structure || object.name)) capsules.push(object);
      });
      const targetMeshes = capsules.length ? capsules : support;
      assert.ok(targetMeshes.length, `${type}: retained receptor support must be available`);
      const bounds = new Box3();
      targetMeshes.forEach(mesh => bounds.expandByObject(mesh));
      const originalTriangles = detail.userData.triangleCount;
      const full = computeDetailFocus(cell, detail, { ending: true });
      const organ = computeDetailFocus(cell, detail, { ending: true, organ: true });
      assert.ok(new Vector3(...organ.center).distanceTo(bounds.getCenter(new Vector3())) < 1e-10);
      if (type === 'meissner') assert.ok(organ.distance < full.distance / 3, 'Meissner corpuscle framing must not be dominated by its long proximal shaft');
      for (const aspect of [.4, .6, 1, 16 / 9, 2.4]) {
        const camera = new PerspectiveCamera(34, aspect, .00001, 8000), center = new Vector3(...organ.center);
        camera.position.copy(center).add(new Vector3(.18, .10, 1).normalize().multiplyScalar(organ.distance * (aspect < 1 ? 1 / Math.max(.48, aspect) : 1)));
        camera.lookAt(center); camera.setViewOffset(1000 * aspect, 1000, 0, 90, 1000 * aspect, 1000); camera.updateMatrixWorld();
        for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
          const p = new Vector3(x, y, z).project(camera);
          assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && p.z > -1 && p.z < 1, `${type}: intact support fits aspect ${aspect}`);
        }
      }
      assert.ok(meshes.every(mesh => mesh.visible && mesh.parent), 'Focusing must not hide or remove original neural/support meshes');
      assert.equal(detail.userData.triangleCount, originalTriangles);
    } finally { dispose(detail); }
  }
  const cell = first('free');
  await loadPreservedCell(cell, { anchors: ['terminal'], fetcher });
  const detail = createPreservedCellDetail(cell, { anchors: ['terminal'] });
  try {
    assert.deepEqual(computeDetailFocus(cell, detail, { ending: true, organ: true }), computeDetailFocus(cell, detail, { ending: true }), 'Unencapsulated free endings keep complete original-arbor framing');
  } finally { dispose(detail); }
});
