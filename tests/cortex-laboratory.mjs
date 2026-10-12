import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3, Euler, Box3 } from 'three';
import { freshConfig, validateConfig } from '../src/lib/cortex/config.js';
import {
  makeWorld,
  rotateVector,
  transformPoint,
  makeMorphology,
} from '../src/lib/cortex/world.js';
import {
  pointTransferUvPerNa,
  lineTransferUvPerNa,
  pointField,
  leadField,
} from '../src/lib/cortex/volume-conductor.js';
import { createPassiveCable, stepPassiveCable } from '../src/lib/cortex/passive-cable.js';
import {
  runExperiment,
  biphasicAverage,
  resultCsv,
  resultBundle,
  encodeJson,
  parseConfig,
  fieldSection,
} from '../src/lib/cortex/experiment.js';
import { buildWorldGroup } from '../src/lib/cortex/scene.js';
import { disposeDeviceMesh } from '../src/lib/devices/geometry.js';
import { evidenceRegistry, parameterRegistry } from '../src/lib/cortex/evidence.js';

const close = (actual, expected, tolerance = 1e-10) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected} (tol ${tolerance})`);
const peak = (values) => values.reduce((p, v) => Math.max(p, Math.abs(v)), 0);
const node = (parent = -1) => ({
  id: `n${parent + 1}`,
  parent,
  lengthUm: 20,
  diameterUm: 20,
  areaUm2: Math.PI * 400,
});
const membrane = freshConfig().membrane;

test('point-source units, scaling, conductivity and reciprocity match SI oracle', () => {
  const expected = (1e-9 / (4 * Math.PI * 0.3 * 100e-6)) * 1e6;
  close(pointTransferUvPerNa([100, 0, 0], [0, 0, 0], 0.3), expected);
  close(pointTransferUvPerNa([200, 0, 0], [0, 0, 0], 0.3), expected / 2);
  close(pointTransferUvPerNa([100, 0, 0], [0, 0, 0], 0.6), expected / 2);
  close(pointTransferUvPerNa([0, 0, 0], [100, 0, 0], 0.3), expected);
  assert.throws(() => pointTransferUvPerNa([0, 0, 0], [0, 0, 0], 0.3));
  assert.throws(() => pointTransferUvPerNa([1, 0, 0], [0, 0, 0], 0));
});
test('electric field equals negative spatial derivative, with correct V/m units', () => {
  const p = [100, 50, -30],
    h = 0.01,
    f = pointField(p, [0, 0, 0], 1000, 0.3);
  for (let axis = 0; axis < 3; axis++) {
    const a = p.slice(),
      b = p.slice();
    a[axis] += h;
    b[axis] -= h;
    const derivative =
      (-(
        pointField(a, [0, 0, 0], 1000, 0.3).voltageMv -
        pointField(b, [0, 0, 0], 1000, 0.3).voltageMv
      ) /
        (2 * h)) *
      1000;
    close(f.fieldVPerM[axis], derivative, 1e-6);
  }
});
test('line-source closed form agrees with independent midpoint quadrature', () => {
  for (const p of [
    [60, 70, 80],
    [0, 0, 300],
    [0, 0, -300],
    [0.01, 0, 300],
  ]) {
    const a = [0, 0, -50],
      b = [0, 0, 50],
      count = 10000;
    let sum = 0;
    for (let i = 0; i < count; i++)
      sum += pointTransferUvPerNa(p, [0, 0, -50 + ((i + 0.5) * 100) / count], 0.3) / count;
    close(lineTransferUvPerNa(p, a, b, 0.3), sum, 1e-8);
  }
  assert.throws(() => lineTransferUvPerNa([0, 0, 0], [0, 0, -50], [0, 0, 50], 0.3));
});
test('balanced far field decays as dipole and line source approaches point source', () => {
  const dipole = (r) =>
    pointTransferUvPerNa([r, 0, 0], [5, 0, 0], 0.3) -
    pointTransferUvPerNa([r, 0, 0], [-5, 0, 0], 0.3);
  close(dipole(10000) / dipole(20000), 4, 1e-5);
  const line = lineTransferUvPerNa([10000, 0, 0], [0, 0, -50], [0, 0, 50], 0.3),
    point = pointTransferUvPerNa([10000, 0, 0], [0, 0, 0], 0.3);
  assert.ok(Math.abs(line / point - 1) < 1e-5);
});
test('catalog contacts retain physical pitch, unknown channel map, and rigid transforms', () => {
  const c = freshConfig(),
    a = makeWorld(c);
  assert.equal(a.contacts.length, 100);
  assert.equal(a.model.simultaneousChannels, 96);
  assert.ok(a.contacts.every((s) => s.channel === null && s.contactAreaMm2 === null));
  close(a.contacts[1].positionUm[0] - a.contacts[0].positionUm[0], 400);
  c.implant.translationUm = [150, -75, 200];
  c.implant.rotationDeg = [30, -45, 10];
  const b = makeWorld(c);
  for (let i = 0; i < a.contacts.length; i++) {
    const expected = transformPoint(a.contacts[i].positionUm, c.implant);
    b.contacts[i].positionUm.forEach((v, j) => close(v, expected[j]));
  }
  const v = new Vector3(100, 200, 300).applyEuler(
    new Euler(...c.implant.rotationDeg.map((x) => (x * Math.PI) / 180), 'ZYX'),
  );
  rotateVector([100, 200, 300], c.implant.rotationDeg).forEach((x, i) => close(x, v.toArray()[i]));
});
test('one-compartment RC converges with first-order timestep refinement', () => {
  function run(dt) {
    const c = createPassiveCable([node()], membrane),
      injected = 0.01;
    for (let i = 0; i < Math.round(20 / dt); i++)
      stepPassiveCable(c, dt, { injectionNa: [injected] });
    const exact =
      membrane.restMv +
      (injected / c.leakUs[0]) * (1 - Math.exp((-20 * c.leakUs[0]) / c.capacitanceNf[0]));
    return Math.abs(c.voltageMv[0] - exact);
  }
  const coarse = run(0.1),
    fine = run(0.05);
  assert.ok(coarse / fine > 1.99 && coarse / fine < 2.01);
  assert.ok(fine < 0.02);
});
test('two-compartment antisymmetric relaxation agrees with exact eigenmode', () => {
  const c = createPassiveCable([node(), node(0)], membrane),
    dt = 0.0001,
    duration = 0.02;
  c.voltageMv[0] += 1;
  c.voltageMv[1] -= 1;
  const rate = (c.leakUs[0] + 2 * c.edgeUs[1]) / c.capacitanceNf[0];
  for (let i = 0; i < Math.round(duration / dt); i++) stepPassiveCable(c, dt);
  close(c.voltageMv[0] - c.restMv, Math.exp(-rate * duration), 0.0003);
  close(c.voltageMv[0] + c.voltageMv[1], 2 * c.restMv);
});
test('uniform extracellular offsets do not polarize membrane; gradients do', () => {
  const nodes = makeMorphology([0, 0, 1500]).nodes,
    a = createPassiveCable(nodes, membrane),
    b = createPassiveCable(nodes, membrane);
  for (let i = 0; i < 100; i++) {
    stepPassiveCable(a, 0.025, { extracellularMv: nodes.map(() => 100 * Math.sin(i)) });
    stepPassiveCable(b, 0.025, { extracellularMv: nodes.map((n) => n.centerUm[2] * 0.001) });
  }
  assert.ok(a.voltageMv.every((v) => Math.abs(v - membrane.restMv) < 1e-9));
  assert.ok(b.voltageMv.some((v) => Math.abs(v - membrane.restMv) > 0.01));
});
test('adding time-varying gauge to nonuniform field preserves the solution', () => {
  const nodes = makeMorphology([0, 0, 1500]).nodes,
    a = createPassiveCable(nodes, membrane),
    b = createPassiveCable(nodes, membrane);
  for (let i = 0; i < 50; i++) {
    const e = nodes.map((n) => n.centerUm[2] * 0.001 * Math.sin(i));
    stepPassiveCable(a, 0.025, { extracellularMv: e });
    stepPassiveCable(b, 0.025, { extracellularMv: e.map((x) => x + 50 * Math.cos(i)) });
  }
  a.voltageMv.forEach((v, i) => close(v, b.voltageMv[i], 1e-10));
});
test('sealed cable steady polarization converges to analytical uniform-field solution', () => {
  function error(count) {
    const length = 1000,
      diameter = 2,
      dx = length / count,
      E = 0.001;
    const nodes = Array.from({ length: count }, (_, i) => ({
      ...node(i - 1),
      lengthUm: dx,
      diameterUm: diameter,
      areaUm2: Math.PI * diameter * dx,
    }));
    const c = createPassiveCable(nodes, membrane),
      centers = nodes.map((_, i) => (i + 0.5) * dx - length / 2);
    for (let i = 0; i < 500; i++)
      stepPassiveCable(c, 2, { extracellularMv: centers.map((x) => -E * x) });
    const lambda =
      Math.sqrt(
        (diameter * 1e-4 * membrane.resistanceOhmCm2) / (4 * membrane.axialResistivityOhmCm),
      ) * 1e4;
    return Math.max(
      ...centers.map((x, i) =>
        Math.abs(
          c.voltageMv[i] -
            membrane.restMv -
            (E * lambda * Math.sinh(x / lambda)) / Math.cosh(length / (2 * lambda)),
        ),
      ),
    );
  }
  const coarse = error(20),
    fine = error(40);
  assert.ok(fine < coarse / 3.5);
  assert.ok(fine < 0.0002);
});
test('separated charge-balanced phases preserve charge with non-aligned timesteps', () => {
  const p = freshConfig().protocol;
  for (const dt of [0.025, 0.033, 0.007]) {
    let sum = 0,
      positive = 0,
      negative = 0;
    for (let t = 0; t < 10; t += dt) {
      const q = biphasicAverage(t, dt, p) * dt;
      sum += q;
      positive += Math.max(0, q);
      negative += Math.max(0, -q);
    }
    close(sum, 0, 1e-12);
    close(positive, 0.2, 1e-12);
    close(negative, 0.2, 1e-12);
  }
});
test('phase-charge diagnostics do not cancel opposite phases within one timestep', () => {
  for (const [startMs, phaseUs, dtMs] of [
    [5.0125, 200, 0.025],
    [5, 50, 0.1],
  ]) {
    const config = freshConfig();
    Object.assign(config.protocol, {
      mode: 'extracellular-stimulation',
      startMs,
      phaseUs,
      gapUs: 0,
    });
    config.solver.dtMs = dtMs;
    const result = runExperiment(config);
    const expectedChargeNc = (config.protocol.amplitudeUa * phaseUs) / 1000;
    close(result.diagnostics.cathodicChargeNc, expectedChargeNc, 1e-12);
    close(result.diagnostics.anodicChargeNc, expectedChargeNc, 1e-12);
    close(result.diagnostics.signedChargeNc, 0, 1e-12);
    if (dtMs > phaseUs / 1000 / 4)
      assert.ok(result.warnings.some((warning) => warning.includes('Refine dt')));
  }
});
for (const mode of ['synaptic-recording', 'extracellular-stimulation', 'intracellular-current'])
  test(`${mode}: finite outputs, conservation, deterministic simulation and exact export`, () => {
    const c = freshConfig();
    c.protocol.mode = mode;
    const r = runExperiment(c),
      repeat = runExperiment(c);
    assert.deepEqual(r.totalUv, repeat.totalUv);
    assert.ok(r.membraneMv.every(Number.isFinite));
    assert.ok(r.diagnostics.maxConservationResidualNa < 1e-10);
    assert.ok(r.diagnostics.maxKclResidualNa < 1e-10);
    assert.ok(peak(r.totalUv[0]) > 0);
    assert.equal(r.timeMs.at(-1), c.solver.durationMs);
    const json = JSON.parse(encodeJson(resultBundle(r)));
    assert.deepEqual(json.config, c);
    assert.equal(json.implant.channelMap, null);
    assert.deepEqual(json.totalUv[0], Array.from(r.totalUv[0]));
    const csv = resultCsv(r).split('\n'),
      frame = 237,
      row = csv[frame + 1].split(',').map(Number);
    assert.equal(row[0], r.timeMs[frame]);
    assert.equal(row[1], r.totalUv[0][frame]);
    assert.equal(row[3], r.totalUv[0][frame] - r.totalUv[1][frame]);
    assert.equal(row[6], r.membraneCurrentNa[frame * r.diagnostics.compartments]);
  });
test('refining timestep and compartments changes default peak membrane and recording by less than 1%', () => {
  const c = freshConfig(),
    coarse = runExperiment(c);
  c.solver.dtMs /= 2;
  const temporal = runExperiment(c);
  c.neuron.segmentLengthUm /= 2;
  const spatial = runExperiment(c);
  for (const [a, b] of [
    [coarse, temporal],
    [temporal, spatial],
  ]) {
    assert.ok(Math.abs(a.diagnostics.maxExcursionMv / b.diagnostics.maxExcursionMv - 1) < 0.01);
    assert.ok(Math.abs(peak(a.neuralUv[0]) / peak(b.neuralUv[0]) - 1) < 0.01);
  }
});
test('moving implant 100 µm changes lead field but not synaptic membrane dynamics', () => {
  const c = freshConfig(),
    a = runExperiment(c);
  c.implant.translationUm[0] = -100;
  const b = runExperiment(c);
  assert.deepEqual(a.membraneMv, b.membraneMv);
  assert.notDeepEqual(a.neuralUv, b.neuralUv);
});
test('doubling conductivity halves recording while leaving unforced membrane unchanged', () => {
  const c = freshConfig(),
    a = runExperiment(c);
  c.tissue.conductivitySPerM *= 2;
  const b = runExperiment(c);
  assert.deepEqual(a.membraneMv, b.membraneMv);
  a.neuralUv[0].forEach((v, i) => close(v / 2, b.neuralUv[0][i], 1e-12));
});
test('near-source singularities are rejected, not visually clamped', () => {
  const c = freshConfig();
  c.implant.translationUm[0] = 100;
  assert.throws(() => runExperiment(c), /within 25/);
  const w = makeWorld(freshConfig());
  assert.throws(
    () =>
      leadField(w.neuron.nodes, [{ id: 'inside', positionUm: w.neuron.nodes[1].centerUm }], 0.3),
    /within/,
  );
});
test('configuration imports reject invalid and incompatible data rather than silently changing it', () => {
  assert.deepEqual(parseConfig(encodeJson(freshConfig())), freshConfig());
  const c = freshConfig();
  c.solver.dtMs = NaN;
  assert.throws(() => validateConfig(c));
  c.solver.dtMs = 0;
  assert.throws(() => validateConfig(c));
  assert.throws(() => parseConfig('{"schemaVersion":"future"}'));
  assert.throws(() => parseConfig('x'.repeat(100001)));
  const d = freshConfig();
  d.protocol.mode = 'extracellular-stimulation';
  d.recording.contactIds = [...d.protocol.sourceContactIds];
  assert.throws(() => validateConfig(d), /undefined voltage/);
});
test('field section uses transformed source positions and returns defined physical units', () => {
  const c = freshConfig(),
    a = fieldSection(makeWorld(c), 9);
  assert.equal(a.values.length, 81);
  assert.ok(
    a.values
      .filter(Boolean)
      .every((v) => Number.isFinite(v.potentialMv) && v.fieldVPerM.every(Number.isFinite)),
  );
  c.implant.translationUm[0] = 100;
  assert.notDeepEqual(fieldSection(makeWorld(c), 9).values, a.values);
});
test('Three scene uses the same physical coordinates and true soma dimensions as the kernel', () => {
  const config = freshConfig();
  config.implant.translationUm = [150, -25, 125];
  config.implant.rotationDeg = [10, 20, 30];
  const world = makeWorld(config),
    objects = buildWorldGroup(world);
  const box = new Box3().setFromObject(objects.nodeMeshes[0]),
    extent = box.getSize(new Vector3());
  close(extent.x, 0.02, 0.0001);
  close(extent.z, 0.02, 0.0001);
  for (const [index, id] of config.recording.contactIds.entries()) {
    const meshMarker = objects.markers.children[index].getWorldPosition(new Vector3());
    const point = world.contacts.find((s) => s.id === id).positionUm;
    meshMarker.toArray().forEach((v, k) => close(v * 1000, point[k]));
  }
  for (const site of world.contacts) {
    const transformed = objects.device.group
      .localToWorld(new Vector3(...site.positionMm))
      .toArray();
    transformed.forEach((v, k) => close(v * 1000, site.positionUm[k], 1e-9));
  }
  disposeDeviceMesh(objects.root);
});
test('physical synaptic region is fixed and conserves total conductance across meshes', () => {
  for (const dx of [10, 20, 40, 60, 100]) {
    const morphology = makeMorphology([0, 0, 1500], dx);
    close(
      morphology.nodes.reduce((sum, n) => sum + (n.synapseWeight ?? 0), 0),
      1,
    );
    for (const n of morphology.nodes.filter((n) => n.synapseWeight > 0))
      assert.ok(n.endUm[2] < 990 && n.startUm[2] >= 890 - 1e-10);
  }
});
test('unknown config fields, unsupported revisions and out-of-patch neurons are rejected', () => {
  const c = freshConfig();
  c.tissue.experimentalLayeredSolver = true;
  assert.throws(() => validateConfig(c), /Unknown configuration/);
  const d = freshConfig();
  d.implant.revision = 2;
  assert.throws(() => makeWorld(d), /revision/);
  const e = freshConfig();
  e.neuron.somaUm[2] = 100;
  assert.throws(() => makeWorld(e), /inside/);
});
test('zero drive gives zero recording and noninteger final steps end exactly at duration', () => {
  const c = freshConfig();
  c.protocol.synapseNs = 0;
  c.solver.durationMs = 20.031;
  c.solver.dtMs = 0.033;
  const r = runExperiment(c);
  close(r.timeMs.at(-1), 20.031, 1e-12);
  assert.ok(peak(r.totalUv[0]) < 1e-10);
  assert.ok(r.membraneMv.every((v) => Math.abs(v - c.membrane.restMv) < 1e-9));
});
test('provenance references resolve, defaults agree, and edited values are not mislabeled defaults', () => {
  const ids = new Set(evidenceRegistry.sources.map((s) => s.id));
  assert.equal(ids.size, evidenceRegistry.sources.length);
  assert.ok(parameterRegistry.every((p) => p.source === null || ids.has(p.source)));
  const c = freshConfig();
  c.tissue.conductivitySPerM = 0.6;
  const bundle = resultBundle(runExperiment(c));
  assert.ok(bundle.sourceIds.every((id) => ids.has(id)));
  assert.equal(bundle.config.tissue.conductivitySPerM, 0.6);
  assert.equal(bundle.parameterDefaults.parameters.find((p) => p.id === 'conductivity').value, 0.3);
  assert.match(resultCsv(runExperiment(c)), /drive_interval_average_nS/);
});
test('bounded output storage rejects expensive combinations without changing resolution', () => {
  const c = freshConfig();
  c.neuron.segmentLengthUm = 10;
  c.solver.dtMs = 0.0025;
  c.solver.durationMs = 100;
  assert.throws(() => makeWorld(c), /storage budget/);
  assert.equal(c.solver.dtMs, 0.0025);
  assert.equal(c.neuron.segmentLengthUm, 10);
  assert.throws(
    () => parseConfig(encodeJson({ ...freshConfig(), toString: 'unknown' })),
    /Unknown configuration/,
  );
});
