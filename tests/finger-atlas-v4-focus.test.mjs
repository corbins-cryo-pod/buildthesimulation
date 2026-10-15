import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, Vector3 } from 'three';
import { createAtlasModel } from '../src/lib/finger-atlas-v4/model.mjs';
import { createCellDetail } from '../src/lib/finger-atlas-v4/morphology.mjs';
import { computeCellFocus, computeDetailFocus } from '../src/lib/finger-atlas-v4/focus.mjs';

const model = createAtlasModel();
const dispose = group => group.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
const representatives = new Map();
const include = cell => representatives.set(cell.id, cell);
for (const type of new Set(model.cells.map(cell => cell.type))) include(model.cells.find(cell => cell.type === type));
for (const nerve of ['median', 'radial', 'ulnar']) include(model.cells.find(cell => cell.type === 'lower-motor' && cell.nerve === nerve));
include(model.cells.find(cell => cell.type === 'spindle' && /^II\b/.test(cell.sensoryClass)));
include(model.cells.reduce((smallest, cell) => cell.somaRadiusMm < smallest.somaRadiusMm ? cell : smallest));
include(model.cells.reduce((largest, cell) => cell.somaRadiusMm > largest.somaRadiusMm ? cell : largest));

test('every cell class, receptor, soma-size extreme and motor target fits portrait and landscape', () => {
  assert.ok(representatives.size <= 25, 'Keep geometric framing regression bounded');
  for (const cell of representatives.values()) {
    // Check high-detail envelopes against a focus fitted using low detail.
    const detail = createCellDetail(cell, { quality: 'high' });
    try {
      for (const ending of cell.terminal ? [false, true] : [false]) {
        const focus = computeCellFocus(cell, { ending });
        const anchor = ending ? 'terminal' : 'soma';
        const bounds = new Box3().setFromObject(detail.children.find(child => child.userData.anchor === anchor));
        for (const aspect of [.4, .6, 1, 16 / 9, 2.4]) {
          const camera = new PerspectiveCamera(34, aspect, .00001, 8000);
          const center = new Vector3(...focus.center);
          const distance = focus.distance * (aspect < 1 ? 1 / Math.max(.48, aspect) : 1);
          camera.position.copy(center).add(new Vector3(.18, .10, 1).normalize().multiplyScalar(distance));
          camera.lookAt(center);
          // Match the viewer's offset, which reserves space below the model.
          camera.setViewOffset(1000 * aspect, 1000, 0, 90, 1000 * aspect, 1000);
          camera.updateProjectionMatrix();
          camera.updateMatrixWorld();
          for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
            const p = new Vector3(x, y, z).project(camera);
            assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && p.z > -1 && p.z < 1,
              `${cell.id} ${anchor} must fit at aspect ${aspect}: ${p.toArray()}`);
          }
        }
      }
    } finally { dispose(detail); }
  }
});

test('focusing preserves the single model and returns its existing anatomical regions', () => {
  const before = structuredClone(model);
  for (const type of ['pacinian', 'spindle', 'golgi', 'lower-motor', 's1']) {
    const cell = model.cells.find(item => item.type === type);
    const soma = computeCellFocus(cell);
    assert.equal(soma.region, cell.region);
    assert.ok(soma.center.every(Number.isFinite));
    if (cell.terminal) {
      const ending = computeCellFocus(cell, { ending: true });
      assert.equal(ending.region, type === 'lower-motor' ? 'nmj' : ['spindle', 'golgi'].includes(type) ? 'proprio' : 'tip');
      assert.ok(Math.hypot(...ending.center.map((n, i) => n - cell.terminal[i])) < 1.5);
      assert.ok(ending.distance > 0 && Number.isFinite(ending.distance));
    }
  }
  assert.deepEqual(model, before, 'Focus must not translate or regenerate registered cells in another coordinate system');
});

test('source-derived focus includes every intact group at the selected anchor and preserves caller ownership', () => {
  const cell = model.cells.find(item => item.type === 'pacinian');
  const detail = new Group();
  let disposals = 0;
  for (const offset of [-2, 3]) {
    const part = new Group();
    part.userData.anchor = 'terminal';
    part.position.fromArray(cell.terminal);
    const geometry = new BoxGeometry(1, .5, .3);
    const material = new MeshBasicMaterial();
    geometry.addEventListener('dispose', () => disposals++);
    material.addEventListener('dispose', () => disposals++);
    const mesh = new Mesh(geometry, material);
    mesh.position.x = offset;
    part.add(mesh);
    detail.add(part);
  }
  const before = detail.children.map(part => Array.from(part.children[0].geometry.attributes.position.array));
  const focus = computeDetailFocus(cell, detail, { ending: true });
  assert.deepEqual(focus.center, [cell.terminal[0] + .5, cell.terminal[1], cell.terminal[2]]);
  assert.ok(focus.distance > 10, 'Preserved large geometry must not inherit a small synthetic closeup distance');
  assert.equal(disposals, 0, 'Focusing cannot dispose cached source geometry');
  assert.deepEqual(detail.children.map(part => Array.from(part.children[0].geometry.attributes.position.array)), before);
  dispose(detail);
  assert.equal(disposals, 4);
});
