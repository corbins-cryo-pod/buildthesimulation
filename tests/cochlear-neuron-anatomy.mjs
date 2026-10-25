import test from 'node:test';
import assert from 'node:assert/strict';
import { createNeuronAnatomyScene } from '../src/lib/cochlear/neuronAnatomy.js';
import { createNerveModel } from '../src/lib/cochlear/nerve.js';
import { createGeometry } from '../src/lib/cochlear/geometry.js';
import { normalizeSettings } from '../src/lib/cochlear/config.js';

const model = createNerveModel();
const geometry = createGeometry(normalizeSettings());
const selectedFiber = 13;
const scene = createNeuronAnatomyScene(geometry, model, selectedFiber);
const near = (actual, expected, tolerance = 1e-10) => assert.ok(
  Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
  `${actual} differs from ${expected} by more than ${tolerance}`,
);
const vertices = mesh => Array.from({ length: mesh.positions.length / 3 }, (_, i) => mesh.positions.slice(3 * i, 3 * i + 3));
const extentX = mesh => {
  const xs = mesh.positions.filter((_, i) => i % 3 === 0);
  return [Math.min(...xs), Math.max(...xs)];
};
const coreMeshes = scene.meshes.filter(mesh => mesh.compartmentIndex !== undefined);

test('neuron inspection retains the published ten-frustum, 30 µm soma at physical scale', () => {
  const soma = scene.meshes.filter(mesh => mesh.role === 'model-soma');
  assert.equal(scene.units, 'mm');
  assert.equal(scene.physicalScale.artificialMagnification, false);
  assert.equal(soma.length, 10);
  assert.deepEqual(soma.map(mesh => mesh.compartmentIndex), [15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
  near(scene.inspection.somaLengthMm, 0.030);
  near(scene.inspection.somaMaximumDiameterMm, 0.030);
  near(Math.min(...soma.map(mesh => extentX(mesh)[0])), -0.015);
  near(Math.max(...soma.map(mesh => extentX(mesh)[1])), 0.015);
  for (const mesh of soma) {
    const [left, right] = extentX(mesh);
    near(right - left, 0.003);
    assert.equal(mesh.clippedContinuation, false);
    for (const [x, y, z] of vertices(mesh)) {
      const endpoint = Math.abs(x - left) < 1e-12 ? 0 : 1;
      near(x, endpoint ? right : left);
      near(Math.hypot(y, z), model.edgeDiameterMm[mesh.compartmentIndex + endpoint] / 2);
    }
  }
  near(Math.max(...soma.flatMap(mesh => vertices(mesh).map(([, y, z]) => 2 * Math.hypot(y, z)))), 0.030);
  assert.equal(scene.scaleBarMm, 0.010);
  assert.equal(scene.scaleBarLabel, undefined, 'A fixed scale label would become false after camera zoom.');
});

test('neuron inspection crops the cable without shortening the presoma or inventing nodes', () => {
  near(scene.inspection.cropMinMm, -0.150);
  near(scene.inspection.cropMaxMm, 0.085);
  near(scene.inspection.cropMaxMm - scene.inspection.cropMinMm, 0.235);
  const presoma = coreMeshes.filter(mesh => model.type[mesh.compartmentIndex] === 'presoma');
  assert.equal(presoma.length, 3);
  near(Math.min(...presoma.map(mesh => extentX(mesh)[0])), -0.115);
  near(Math.max(...presoma.map(mesh => extentX(mesh)[1])), -0.015);
  for (const mesh of presoma) {
    const [left, right] = extentX(mesh);
    near(right - left, 0.100 / 3);
    for (const [, y, z] of vertices(mesh)) near(2 * Math.hypot(y, z), 0.001);
  }
  const peripheral = coreMeshes.find(mesh => mesh.compartmentIndex === 11);
  const central = coreMeshes.find(mesh => mesh.compartmentIndex === 26);
  assert.equal(peripheral.clippedContinuation, true);
  assert.equal(central.clippedContinuation, true);
  near(extentX(peripheral)[0], -0.150);
  near(extentX(central)[1], 0.085);
  for (const [, y, z] of vertices(central)) near(2 * Math.hypot(y, z), 0.002);
  assert.deepEqual(scene.inspection.visibleNodeIndices, []);
  assert.equal(scene.meshes.some(mesh => mesh.role === 'model-node'), false);
  assert.match(scene.notes.join(' '), /nearest modeled nodes.*outside this local crop/i);
  assert.equal(scene.labels.filter(label => /continuation.*cropped/i.test(label.text)).length, 2);
});

test('neuron surfaces have finite physical coordinates, valid triangles, unit normals and enclosing bounds', () => {
  assert.ok(scene.meshes.length > coreMeshes.length);
  for (const mesh of scene.meshes) {
    assert.ok(mesh.positions.length > 0, mesh.id);
    assert.equal(mesh.positions.length % 3, 0, mesh.id);
    assert.equal(mesh.indices.length % 3, 0, mesh.id);
    assert.equal(mesh.normals.length, mesh.positions.length, mesh.id);
    assert.ok(mesh.positions.every(Number.isFinite), mesh.id);
    assert.ok(mesh.normals.every(Number.isFinite), mesh.id);
    assert.ok(mesh.indices.every(index => Number.isInteger(index) && index >= 0 && index < mesh.positions.length / 3), mesh.id);
    for (let i = 0; i < mesh.normals.length; i += 3) near(Math.hypot(...mesh.normals.slice(i, i + 3)), 1, 1e-8);
    for (const point of vertices(mesh)) point.forEach((value, axis) => {
      assert.ok(value >= scene.bounds.min[axis] - 1e-12 && value <= scene.bounds.max[axis] + 1e-12, mesh.id);
    });
  }
  assert.ok(scene.bounds.min.every((value, axis) => Number.isFinite(value) && value < scene.bounds.max[axis]));
});

test('only the actual selected cable compartments replay voltage; reconstructed context has no replay identity', () => {
  assert.deepEqual(coreMeshes.map(mesh => mesh.compartmentIndex), Array.from({ length: 16 }, (_, i) => i + 11));
  for (const mesh of coreMeshes) {
    assert.equal(mesh.fiberIndex, selectedFiber);
    assert.equal(mesh.actualModelDimensions, true);
    assert.equal(mesh.staticContext, undefined);
    assert.ok(['model-soma', 'model-process', 'model-node'].includes(mesh.role));
    near(mesh.originalLengthMm, model.lengthMm[mesh.compartmentIndex]);
  }
  const context = scene.meshes.filter(mesh => mesh.staticContext);
  for (const role of ['static-nucleus', 'static-nucleolus', 'static-satellite-glia', 'process-myelin']) {
    assert.ok(context.some(mesh => mesh.role === role), role);
  }
  for (const mesh of context) {
    assert.equal(mesh.fiberIndex, undefined, mesh.id);
    assert.equal(mesh.compartmentIndex, undefined, mesh.id);
    assert.equal(mesh.compartmentIndices, undefined, mesh.id);
    assert.equal(mesh.contactIndex, undefined, mesh.id);
  }
  assert.equal(context.length + coreMeshes.length, scene.meshes.length);
  for (const mesh of context.filter(mesh => mesh.role === 'process-myelin')) {
    const [left, right] = extentX(mesh);
    assert.ok(right <= -0.115 + 1e-10 || left >= 0.020 - 1e-10, 'A sheath must not cover the soma or its unmyelinated initial sections.');
    assert.ok(mesh.sheathThicknessMm > 0);
  }
  assert.match(scene.notes.join(' '), /not a measured human g-ratio/);
  assert.match(scene.notes.join(' '), /without a thick compact-myelin coat/);
});

test('preparing a neuron view preserves the solver and survival mask and explains a removed fiber', () => {
  const input = {
    ...geometry,
    fibers: geometry.fibers.map((fiber, index) => index === selectedFiber ? { ...fiber, alive: false } : { ...fiber }),
  };
  const before = JSON.stringify({ model, geometry: input });
  const removed = createNeuronAnatomyScene(input, model, selectedFiber);
  assert.equal(JSON.stringify({ model, geometry: input }), before);
  assert.equal(removed.inspection.fiberIndex, selectedFiber);
  assert.match(removed.notes.join(' '), /removed by the experiment.*survival mask/);
  assert.match(removed.notes.join(' '), /no simulated neural response/);
  const referenceCore = removed.meshes.filter(mesh => mesh.compartmentIndex !== undefined);
  assert.deepEqual(referenceCore.map(mesh => mesh.positions), coreMeshes.map(mesh => mesh.positions));
});
