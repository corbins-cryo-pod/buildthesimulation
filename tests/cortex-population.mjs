import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import * as THREE from 'three';
import { freshConfig } from '../src/lib/cortex/config.js';
import { getExampleConfig } from '../src/lib/cortex/examples.js';
import { freshPopulation, populationOffsets, populationCapacity, planPopulation, runPopulation, populationCsv, distanceCloudOffsets, distanceShellOffsets } from '../src/lib/cortex/population.js';
import { runExperiment } from '../src/lib/cortex/experiment.js';
import { makeWorld } from '../src/lib/cortex/world.js';
import { buildWorldGroup, updatePopulationOverlay } from '../src/lib/cortex/scene.js';
import { disposeDeviceMesh } from '../src/lib/devices/geometry.js';
import { resultBuffers } from '../src/lib/cortex/buffers.js';

const base = () => getExampleConfig('extracellular-soma-spike');
const grid = count => ({ ...freshPopulation(), layout: 'grid', center: 'target', count });
test('population preflight preserves the source, retains count prefixes, and rejects unsupported work before simulation', () => {
  assert.deepEqual(populationOffsets(8, 100), populationOffsets(64, 100).slice(0, 8));
  assert.throws(() => populationOffsets(65, 100), /1 to 64/);
  assert.throws(() => populationOffsets(1.5, 100), /integer/);
  assert.throws(() => populationOffsets(4, NaN), /spacing/);
  assert.throws(() => planPopulation(freshConfig(), freshPopulation()), /human active model/);
  assert.throws(() => planPopulation(base(), { ...freshPopulation(), invented: true }), /Unsupported population/);
  assert.throws(() => planPopulation(base(), freshPopulation()), /Cell 2:.*within/);
  const c = base();
  assert.equal(populationCapacity(c).maxCells, 64);
  const plan = planPopulation(c, grid(64));
  assert.equal(plan.cells.length, 64);
  const original = makeWorld(c).neuron;
  for (const cell of [plan.cells[1], plan.cells[63]]) {
    const placed = makeWorld(cell.config).neuron;
    for (let i = 0; i < original.nodes.length; i++) {
      assert.equal(placed.nodes[i].areaUm2, original.nodes[i].areaUm2);
      assert.equal(placed.nodes[i].edgeUs, original.nodes[i].edgeUs);
      for (let axis = 0; axis < 3; axis++)
        assert.ok(Math.abs(placed.nodes[i].centerUm[axis] - original.nodes[i].centerUm[axis] - cell.offsetUm[axis]) < 1e-9);
    }
  }
  c.neuron.segmentLengthUm = 10; c.solver.dtMs = 0.00125;
  assert.ok(populationCapacity(c).maxCells < 16);
  assert.throws(() => planPopulation(c, grid(64)), /work budget/);
});

test('the default cloud follows the requested distance ladder in deterministic non-collinear random directions', () => {
  const settings = freshPopulation(), cloud = distanceCloudOffsets(settings);
  assert.equal(settings.layout, 'cloud');
  assert.equal(settings.center, 'stimulus-a');
  const expected = [1, 2, 5, 12, 20, 28, 40, 60, 85, 120, 170, 240, 340, 480, 680, 960];
  for (let i = 0; i < expected.length; i++) {
    assert.ok(Math.abs(cloud.cloudRadiiUm[i] - expected[i]) < 1e-9);
    assert.ok(Math.abs(Math.hypot(...cloud.offsets[i + 1]) - expected[i]) < 1e-9);
  }
  assert.deepEqual(distanceCloudOffsets(settings), cloud);
  const shuffled = distanceCloudOffsets({ ...settings, seed: settings.seed + 1 });
  assert.deepEqual(shuffled.cloudRadiiUm, cloud.cloudRadiiUm);
  assert.notDeepEqual(shuffled.offsets, cloud.offsets);
  const cross = new THREE.Vector3(...cloud.offsets[1]).cross(new THREE.Vector3(...cloud.offsets[2]));
  assert.ok(cross.length() > 0.1);
  const plan = planPopulation(base(), settings, { allowUnsupported: true });
  assert.equal(plan.cells.length, 17);
  assert.equal(plan.supportedCells, 8);
  assert.equal(plan.errors.length, 9);
  assert.ok(plan.cells.slice(1, 6).every(c => c.unsupportedReason));
  for (const cell of plan.cells.slice(1))
    assert.ok(Math.abs(cell.sourceDistancesUm[0] - cell.distanceFromCenterUm) < 1e-9);
  assert.throws(() => distanceCloudOffsets({ ...settings, seed: -1 }), /seed/);
  const shells = distanceShellOffsets({ ...settings, count: 25, nearUm: 100, farUm: 600 });
  for (let i = 1; i < shells.offsets.length; i++)
    assert.ok(Math.abs(Math.hypot(...shells.offsets[i]) - shells.radii[(i - 1) % 3]) < 1e-9);
});

test('two independent active cells match isolated runs and sum neural signals while adding artifact only once', () => {
  const config = base(), settings = grid(2);
  const progress = [];
  const population = runPopulation(config, settings, p => progress.push(p.progress));
  const plan = planPopulation(config, settings);
  const isolated = plan.cells.map(cell => runExperiment(cell.config));
  assert.deepEqual(population.targetResult.membraneMv, isolated[0].membraneMv);
  assert.notDeepEqual(population.cells[0].somaMv, population.cells[1].somaMv);
  for (let i = 0; i < 2; i++) {
    const expected = isolated[i];
    assert.deepEqual(population.cells[i].response, expected.responseAnalysis);
    assert.deepEqual(population.cells[i].somaMv, Float64Array.from(expected.timeMs, (_, k) => expected.membraneMv[k * expected.diagnostics.compartments]));
    assert.equal(population.cells[i].membraneMv, undefined);
  }
  for (let channel = 0; channel < 2; channel++)
    for (let frame = 0; frame < population.timeMs.length; frame++) {
      assert.equal(population.neuralUv[channel][frame], isolated[0].neuralUv[channel][frame] + isolated[1].neuralUv[channel][frame]);
      assert.equal(population.appliedUv[channel][frame], isolated[0].appliedUv[channel][frame]);
      assert.equal(population.totalUv[channel][frame], population.neuralUv[channel][frame] + isolated[0].appliedUv[channel][frame]);
    }
  assert.equal(population.provenance.uniqueSpecimens, 1);
  assert.match(population.interpretation.spatialConvergence, /Unresolved/);
  assert.equal(population.cells[0].response.propagation.status, 'not-established');
  assert.ok(population.diagnostics.outputBytes < 19_000_000);
  assert.equal(population.diagnostics.outputBytes, resultBuffers(population).reduce((sum, b) => sum + b.byteLength, 0));
  assert.ok(progress.every((value, i) => !i || value >= progress[i - 1]));
  assert.equal(progress.at(-1), 1);
  const csv = populationCsv(population).split('\n');
  assert.match(csv[0], /cell-2_soma_mV/);
  assert.equal(csv.length, population.timeMs.length + 1);
  assert.equal(Number(csv[112].split(',')[7]), population.cells[0].somaMv[111]);
});

test('unsupported near-source positions remain explicit unknowns and never contribute zero-valued fake traces', () => {
  const settings = { ...freshPopulation(), count: 2 };
  const result = runPopulation(base(), settings);
  assert.equal(result.diagnostics.requestedCells, 2);
  assert.equal(result.diagnostics.simulatedCells, 1);
  assert.equal(result.diagnostics.excludedCells, 1);
  assert.equal(result.cells[1].status, 'excluded');
  assert.equal(result.cells[1].somaMv, null);
  assert.equal(result.cells[1].response, null);
  assert.match(result.cells[1].reason, /within 25/);
  assert.deepEqual(result.neuralUv, result.targetResult.neuralUv);
  assert.deepEqual(result.totalUv, result.targetResult.totalUv);
  assert.equal(populationCsv(result).split('\n')[1].split(',').at(-1), '');
});

test('population rendering instances exact source cylinders with rigid translations and releases only owned GPU resources', () => {
  const objects = buildWorldGroup(makeWorld(base()));
  const cells = populationOffsets(4, 100).map((offsetUm, i) => ({ id: `cell-${i + 1}`, offsetUm }));
  updatePopulationOverlay(objects, { cells });
  const source = objects.nodeMeshes.filter(Boolean);
  assert.equal(objects.populationMeshes.length, source.length);
  for (const [i, mesh] of objects.populationMeshes.entries()) {
    assert.equal(mesh.geometry, source[i].geometry);
    assert.equal(mesh.count, 3);
    const matrix = new THREE.Matrix4(); mesh.getMatrixAt(0, matrix);
    const expected = new THREE.Matrix4().makeTranslation(...cells[1].offsetUm.map(v => v / 1000)).multiply(source[i].matrix);
    for (let j = 0; j < 16; j++) assert.ok(Math.abs(matrix.elements[j] - expected.elements[j]) < 1e-6);
  }
  let disposed = false;
  source[0].geometry.addEventListener('dispose', () => { disposed = true; });
  updatePopulationOverlay(objects, null);
  assert.equal(objects.populationMeshes.length, 0);
  assert.equal(disposed, false);
  disposeDeviceMesh(objects.root);
  assert.equal(disposed, true);
});

test('population worker transfers nested typed arrays and cancellation stops an unfinished batch', async () => {
  const worker = new Worker(new URL('./fixtures/cortex-worker-adapter.mjs', import.meta.url));
  try {
    const result = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Population worker timed out')), 60000);
      worker.on('error', error => { clearTimeout(timer); reject(error); });
      worker.on('message', message => {
        if (message.type === 'error') { clearTimeout(timer); reject(new Error(message.message)); }
        if (message.type === 'result') { clearTimeout(timer); resolve(message.result); }
      });
      worker.postMessage({ id: 81, config: base(), population: grid(2) });
    });
    assert.ok(result.cells[1].somaMv instanceof Float64Array);
    assert.ok(result.targetResult.channels.sodiumNa instanceof Float64Array);
    assert.equal(result.diagnostics.outputBytes, resultBuffers(result).reduce((s, b) => s + b.byteLength, 0));
    let complete = false;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Batch did not start')), 60000);
      worker.on('message', message => {
        if (message.id !== 82) return;
        if (message.type === 'result') complete = true;
        if (message.type === 'progress' && message.stage.includes('Simulating')) { clearTimeout(timer); resolve(); }
      });
      worker.postMessage({ id: 82, config: base(), population: grid(64) });
    });
    await worker.terminate();
    assert.equal(complete, false);
  } finally { await worker.terminate(); }
});
