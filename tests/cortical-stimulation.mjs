import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, electrode, normalizeConfig, presetConfig } from '../src/lib/stimulation/config.js';
import { contactArea, contactNodes, contactField, fieldAt, pointPotential, accessMatrix, interfaceStep } from '../src/lib/stimulation/field.js';
import { createPopulation, samplePopulation, createMorphology } from '../src/lib/stimulation/anatomy.js';
import { compileCable, stepCable, gateRates } from '../src/lib/stimulation/membrane.js';
import { pulseAverage, runExperiment } from '../src/lib/stimulation/experiment.js';
const sigma = [.276, .276, .276];
const close = (a, b, tolerance = 1e-8) => assert(Math.abs(a - b) <= tolerance, `${a} differs from ${b} by ${Math.abs(a - b)} (limit ${tolerance})`);

test('volume conductor matches SI point-source and finite-disk analytical solutions', () => {
  close(pointPotential([0, 0, 100], [0, 0, 0], 10, sigma), 28.832417226248072, 1e-8);
  const disk = electrode('E1', { z: 0, diameter: 50, tilt: 0 });
  for (const z of [10, 30, 100]) {
    const oracle = 10 * 1000 / (2 * Math.PI * .276 * 25 ** 2) * (Math.sqrt(z * z + 25 ** 2) - z);
    const coarse = 10 * contactField([0, 0, z], contactNodes(disk, 144), sigma), fine = 10 * contactField([0, 0, z], contactNodes(disk, 400), sigma);
    assert(Math.abs(coarse / oracle - 1) < .003); assert(Math.abs(fine - oracle) < Math.abs(coarse - oracle));
  }
  const sphere = contactNodes(electrode('E1', { z: 0, diameter: 10, shape: 'sphere' }), 400);
  const v = fieldAt([0, 0, 100], [sphere], [10], sigma);
  close(v.potential, 28.832417226248072, .02); close(v.field[2], 288.3241722624807, .2);
});

test('superposition, anisotropic tensor, and bipolar far-field cancellation', () => {
  close(pointPotential([100, 0, 0], [0, 0, 0], 1, [.276, .276, .552]) / pointPotential([100, 0, 0], [0, 0, 0], 1, sigma), 1 / Math.sqrt(2));
  close(pointPotential([0, 0, 100], [0, 0, 0], 1, [.276, .276, .552]), pointPotential([0, 0, 100], [0, 0, 0], 1, sigma));
  const contacts = [-50, 50].map(x => contactNodes(electrode('E1', { x, z: 0, shape: 'sphere', diameter: 10 }), 144));
  const p = [300, 120, 30], a = fieldAt(p, contacts, [10, 0], sigma), b = fieldAt(p, contacts, [0, -10], sigma), both = fieldAt(p, contacts, [10, -10], sigma);
  close(both.potential, a.potential + b.potential); both.field.forEach((v, i) => close(v, a.field[i] + b.field[i]));
  const near = fieldAt([1000, 0, 0], contacts, [10, -10], sigma), far = fieldAt([2000, 0, 0], contacts, [10, -10], sigma);
  assert(Math.abs(far.potential / near.potential - .25) < .002);
});

test('field is material-independent for matched delivered currents', () => {
  const a = contactNodes(electrode(), 144), b = contactNodes(electrode('E1', { material: 'ptir', capacitance: 30, resistance: 100 }), 144);
  assert.deepEqual(fieldAt([40, 70, 610], [a], [20], sigma), fieldAt([40, 70, 610], [b], [20], sigma));
});

test('interface has correct area scaling and exact RC polarization, with balanced compliance clipping', () => {
  const e = electrode('E1', { diameter: 50, material: 'ptir', capacitance: 30, resistance: 100 }), contact = contactNodes(e), area = contactArea(e) * 1e-8;
  close(area, 2 * Math.PI * 25 ** 2 * 1e-8);
  const eta = [0], result = interfaceStep(eta, [10], [contact], [[0]], .2, 30, true);
  const R = 100 / area, C = 30e-6 * area;
  close(eta[0], 10e-6 * R * (1 - Math.exp(-.0002 / (R * C))), 1e-12); close(result.delivered[0], 10);
  const contacts = [contact, contactNodes({ ...e, x: 100 })], matrix = accessMatrix(contacts, sigma), v = [0, 0];
  let clipped = false;
  for (let i = 0; i < 200; i++) { const sign = i < 100 ? 1 : -1, step = interfaceStep(v, [-100 * sign, 100 * sign], contacts, matrix, .005, 1, true); close(step.delivered[0] + step.delivered[1], 0); assert([...step.terminal, ...step.initialTerminal].every(n => Math.abs(n) < 1.00000001)); clipped ||= step.scale < 1; }
  assert(clipped);
});

test('fractional pulse boundaries conserve commanded charge and trains cannot overlap', () => {
  const c = normalizeConfig({ ...DEFAULT_CONFIG, phaseWidth: 233.7, gap: 62.3, recoveryRatio: 2.7, pulses: 4, frequency: 117 });
  let charge = 0, leading = 0;
  for (let t = 0; t < 40; t += .005) { const x = pulseAverage(t, .005, c); charge += x * .005; leading += Math.max(0, x) * .005; }
  close(charge, 0, 1e-10); close(leading, 4 * .2337, 1e-10);
  const constrained = normalizeConfig({ phaseWidth: 1000, recoveryRatio: 5, gap: 500, frequency: 200 }); assert(1000 / constrained.frequency > 6.5);
});

const testCell = { id: 0, position: [0, 70, 550], diameter: 14, radii: [6.3, 6.3, 7.7778], inhibitory: false, morphologySeed: 44 };
function makeCable(options = {}, offset = 0) {
  const c = { ...DEFAULT_CONFIG, ...options }, m = createMorphology(testCell, c), contact = contactNodes(c.electrodes[0]);
  const field = m.nodes.map(n => -contactField(n.position, contact, sigma) + offset);
  return { c, m, cable: compileCable([m], c, field) };
}
function response(dt, segmentLength, amplitude = 50) {
  const { c, cable } = makeCable({ dt, segmentLength }), state = { firstSpike: [-1], somaSpike: [-1], axonSpike: [-1], firstNode: [-1], extreme: [0] }; let peak = -70;
  for (let i = 0; i < 10 / dt; i++) { stepCable(cable, amplitude * pulseAverage(i * dt, dt, c), (i + 1) * dt, state); peak = Math.max(peak, cable.voltage[0]); }
  return { state, peak, cable };
}

test('gating singularities are removable; resting neurons remain quiescent', () => {
  for (const v of [-42, -15, -40, -70, 0, 40]) gateRates(v).forEach(([inf, tau]) => { assert(Number.isFinite(inf) && inf >= 0 && inf <= 1); assert(Number.isFinite(tau) && tau > 0); });
  const quiet = response(.005, 20, 0); assert.equal(quiet.state.firstSpike[0], -1); quiet.cable.voltage.forEach(v => close(v, -70, 1e-8));
});

test('extracellular common-mode voltage leaves membrane dynamics unchanged', () => {
  const a = makeCable(), b = makeCable({}, 1234);
  for (let i = 0; i < 1000; i++) { const drive = 50 * pulseAverage(i * a.c.dt, a.c.dt, a.c); stepCable(a.cable, drive, i * a.c.dt); stepCable(b.cable, drive, i * b.c.dt); }
  a.cable.voltage.forEach((v, i) => close(v, b.cable.voltage[i], 1e-7));
});

test('a uniform field polarizes sealed terminals, rather than using local field magnitude as a spike rule', () => {
  const c = DEFAULT_CONFIG, cell = { ...testCell }, nodes = Array.from({ length: 5 }, (_, i) => ({ position: [i * 20, 0, 0], diameter: 1, length: 20, area: 20 * Math.PI, kind: 'axon', parent: i - 1 }));
  const cable = compileCable([{ cell, nodes, ais: 0 }], c, [0, 1, 2, 3, 4]);
  assert(cable.drive[0] > 0); close(cable.drive[2], 0); assert(cable.drive[4] < 0);
  for (let i = 0; i < 10; i++) stepCable(cable, 1, i * .005);
  assert(cable.voltage[0] > -70); assert(cable.voltage[4] < -70);
});

test('axon-first response propagates to soma and converges under timestep and spatial refinement', () => {
  const standard = response(.005, 20), fineTime = response(.0025, 20), fineSpace = response(.005, 10);
  for (const r of [standard, fineTime, fineSpace]) { assert(r.state.axonSpike[0] >= 1); assert(r.state.somaSpike[0] > r.state.axonSpike[0]); assert(r.peak > 20 && r.peak < 50); }
  close(standard.state.somaSpike[0], fineTime.state.somaSpike[0], .02); close(standard.peak, fineTime.peak, .1);
  close(standard.state.somaSpike[0], fineSpace.state.somaSpike[0], .05); close(standard.peak, fineSpace.peak, 1.5);
});

test('seeded anatomical count and physical soma exclusion are reproducible', () => {
  const c = normalizeConfig({ width: 300, depth: 300 }), a = createPopulation(c), b = createPopulation(c);
  assert.equal(a.cells.length, Math.round(c.density * .027)); assert.deepEqual(a.cells, b.cells);
  assert(Math.abs(a.inhibitoryFraction - c.inhibitoryFraction) < .025);
  close(a.meanDiameter, c.somaDiameter * (1 - .15 * c.inhibitoryFraction), .3);
  assert.deepEqual(samplePopulation(a, 64, c.seed), samplePopulation(a, 128, c.seed).slice(0, 64));
  for (const cell of a.cells.slice(0, 30)) for (const other of a.cells) if (cell.id !== other.id) assert(Math.hypot(...cell.position.map((v, i) => v - other.position[i])) >= cell.radius + other.radius + .5 - 1e-10);
  close(a.characteristicSpacing, 1000 / Math.cbrt(a.cells.length / .027));
});

test('end-to-end local-return experiment returns finite traces and conserved delivered charge', () => {
  const c = presetConfig('bipolar', { ...DEFAULT_CONFIG, width: 300, depth: 300, sampleCount: 64, amplitude: 20, quadrature: 64 });
  const r = runExperiment(c);
  assert(r.summary.solved > 0 && r.summary.solved <= 64); assert.equal(r.summary.netWeight, 0);
  for (const key of ['time', 'soma', 'ais', 'current', 'voltage', 'polarization']) assert(r.traces[key].every(Number.isFinite));
  for (let k = 0; k < r.traces.time.length; k++) close(r.traces.current[k * 2] + r.traces.current[k * 2 + 1], 0, 1e-8);
  close(r.interfaces.reduce((sum, e) => sum + e.net, 0), 0, 1e-8);
  assert.equal(r.bins.reduce((sum, b) => sum + b.total, 0), r.summary.solved); assert.equal(r.bins.reduce((sum, b) => sum + b.activated, 0), r.summary.activated);
});
