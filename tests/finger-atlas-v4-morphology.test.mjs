import test from 'node:test';
import assert from 'node:assert/strict';
import { createAtlasModel } from '../src/lib/finger-atlas-v4/model.mjs';
import { morphologyPaths, morphologyStats, createCellDetail, MORPHOLOGY_EVIDENCE } from '../src/lib/finger-atlas-v4/morphology.mjs';

const model = createAtlasModel();
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const equal = (a, b) => distance(a, b) < 1e-9;
const types = [...new Set(model.cells.map(cell => cell.type))];
const examples = types.map(type => model.cells.find(cell => cell.type === type));
function dispose(group) { group.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); }); }

test('cell detail is deterministic across visits and unique for each cell identity', () => {
  for (const cell of examples) {
    assert.deepEqual(morphologyPaths(cell), morphologyPaths(structuredClone(cell)), cell.id);
    const different = { ...structuredClone(cell), id: `${cell.id}-different` };
    assert.notDeepEqual(morphologyPaths(cell), morphologyPaths(different), cell.id);
  }
});

test('all morphology paths remain at their registered soma or terminal in millimetres', () => {
  for (const cell of model.cells) {
    for (const path of morphologyPaths(cell)) {
      assert.equal(path.points.length, path.radii.length, cell.id);
      assert.ok(path.points.length >= 2, cell.id);
      assert.ok(path.radii.every(r => Number.isFinite(r) && r > 0 && r < .01), cell.id);
      const anchor = path.anchor === 'terminal' ? cell.terminal : cell.soma;
      for (const p of path.points) {
        assert.equal(p.length, 3);
        assert.ok(p.every(Number.isFinite), cell.id);
        assert.ok(distance(p, anchor) < 1.5, `${cell.id}: displaced specimen or incorrect units`);
      }
    }
  }
});

test('every local arbor is connected to its parent soma or its registered axon endpoint', () => {
  for (const cell of model.cells) {
    const paths = morphologyPaths(cell);
    const available = [];
    for (const path of paths) {
      const root = path.points[0];
      const parentIsSoma = path.anchor === 'soma' && distance(root, cell.soma) <= cell.somaRadiusMm;
      const parentIsTerminal = path.anchor === 'terminal' && equal(root, cell.terminal);
      const parentIsArbor = available.some(point => equal(root, point));
      assert.ok(parentIsSoma || parentIsTerminal || parentIsArbor, `${cell.id}: floating ${path.role}`);
      available.push(...path.points);
    }
    if (cell.terminal) {
      const terminalPaths = paths.filter(p => p.anchor === 'terminal');
      assert.ok(terminalPaths.length > 0, cell.id);
      assert.ok(terminalPaths.some(p => equal(p.points[0], cell.terminal)), cell.id);
      assert.ok(cell.branches.some(b => equal(b.points[0], cell.terminal) || equal(b.points.at(-1), cell.terminal)), cell.id);
    }
  }
});

test('pseudounipolar ganglion cells have no dendrites and cortical trees remain simplified', () => {
  for (const cell of model.cells.filter(cell => cell.kind === 'sensory')) {
    assert.equal(morphologyStats(cell).dendrites, 0, cell.id);
    assert.ok(cell.branches.some(b => b.role === 'stem'), cell.id);
  }
  for (const cell of model.cells.filter(cell => cell.type === 's1' || cell.type === 'm1')) {
    assert.ok(morphologyStats(cell).dendrites <= 24, cell.id);
    const ys = morphologyPaths(cell).flatMap(p => p.points.map(point => point[1] - cell.soma[1]));
    assert.ok(Math.max(...ys) > .15, 'Apical tree follows superior +Y in the integrated atlas');
  }
});

test('spindle primary and secondary endings use different connected terminal topologies', () => {
  const primary = model.cells.find(cell => cell.type === 'spindle' && /^Ia\b/.test(cell.sensoryClass));
  const secondary = model.cells.find(cell => cell.type === 'spindle' && /^II\b/.test(cell.sensoryClass));
  assert.ok(primary && secondary);
  const a = morphologyStats(primary), b = morphologyStats(secondary);
  assert.ok(a.points > b.points, 'Primary ending carries long annular wraps');
  assert.ok(b.terminalBranches > a.terminalBranches, 'Secondary ending carries short flower-spray branches');
});

test('detail surfaces are finite, bounded and kept local to registered anchors', () => {
  for (const cell of examples) {
    const detail = createCellDetail(cell, { quality: 'high' });
    let triangleCount = 0;
    let drawCalls = 0;
    assert.equal(detail.userData.cellId, cell.id);
    assert.deepEqual(detail.position.toArray(), [0, 0, 0]);
    for (const anchor of detail.children) {
      assert.deepEqual(anchor.position.toArray(), anchor.userData.anchor === 'terminal' ? cell.terminal : cell.soma);
    }
    detail.traverse(object => {
      if (!object.isMesh) return;
      drawCalls++;
      const { position, normal } = object.geometry.attributes;
      assert.ok(position.array.every(Number.isFinite), object.name);
      assert.ok(normal.array.every(Number.isFinite), object.name);
      assert.ok(position.array.every(value => Math.abs(value) < 1.5), `${object.name}: local coordinates preserve submicron precision`);
      assert.equal(position.count, normal.count, object.name);
      triangleCount += object.geometry.index.count / 3;
      assert.ok(object.geometry.boundingSphere.radius > 0, object.name);
    });
    assert.equal(triangleCount, detail.userData.triangleCount);
    assert.ok(triangleCount < 30000, `${cell.type}: bounded high-detail surface budget`);
    assert.ok(drawCalls <= 10, `${cell.type}: merge by material and anchor`);
    const low = createCellDetail(cell, { quality: 'low' });
    assert.ok(low.userData.triangleCount < triangleCount, cell.id);
    assert.equal(low.userData.pathCount, detail.userData.pathCount, 'LOD must not alter arbor topology');
    dispose(detail);
    dispose(low);
  }
});

test('support is intact and source claims distinguish priors from segmented human tissue', () => {
  assert.match(MORPHOLOGY_EVIDENCE.basis, /not an EM segmentation/);
  assert.match(MORPHOLOGY_EVIDENCE.proprioception, /sheep/);
  assert.match(MORPHOLOGY_EVIDENCE.nmj, /human/);
  const sa2 = createCellDetail(model.cells.find(cell => cell.type === 'sa2'));
  assert.ok(!sa2.children.flatMap(child => child.children).some(mesh => mesh.userData.structure === 'capsule'), 'Unresolved SA-II identity must not create a definitive Ruffini capsule');
  dispose(sa2);
});
