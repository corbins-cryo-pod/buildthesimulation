import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { freshInterfaceConfig, validateInterfaceConfig, interfacePulse, loadInterfaceModels, makeInterfaceCells, runInterfaceExperiment } from '../src/lib/cortex/interface-experiment.js';
import { createInterfaceField } from '../src/lib/cortex/interface-field.js';
import { getActiveModel } from '../src/lib/cortex/model-library.js';

const readAsset = path => fs.readFile(new URL(`../public${path}`, import.meta.url));

test('biphasic current balances sampled charge, shares selected contacts and suppresses incomplete pulses', () => {
  const config = validateInterfaceConfig({ ...freshInterfaceConfig(), count: 1, mode: 'evoked', activeContacts: [2, 0, 2],
    durationMs: 60, startMs: 5.03, frequencyHz: 37, amplitudeUa: 7, phaseUs: 200, gapUs: 100 });
  assert.deepEqual(config.activeContacts, [0, 2]);
  let charge = 0, positive = 0, negative = 0;
  for (let i = 0; i < Math.round(config.durationMs / config.dtMs); i++) {
    const value = interfacePulse(config, (i + .5) * config.dtMs);
    charge += value * config.dtMs;
    if (value > 0) positive++;
    if (value < 0) negative++;
  }
  assert.ok(positive > 0);
  assert.equal(positive, negative);
  assert.ok(Math.abs(charge) < 1e-12);
  assert.equal(interfacePulse({ ...config, startMs: 59.8 }, 59.81), 0);
  assert.equal(interfacePulse({ ...config, mode: 'recording' }, 5.1), 0);
  assert.throws(() => validateInterfaceConfig({ ...config, activeContacts: [] }));
  assert.throws(() => validateInterfaceConfig({ ...config, phaseUs: 202 }));
});

test('all selected complete morphologies stay on the supported side of the contact plane', async () => {
  const config = freshInterfaceConfig();
  await loadInterfaceModels(config, readAsset);
  const cells = makeInterfaceCells(config), field = createInterfaceField();
  assert.equal(cells.length, 12);
  for (const cell of cells) {
    const original = getActiveModel(cell.id).variants[String(config.segmentLengthUm)];
    assert.equal(cell.nodes.length, original.length, 'placement must preserve every original compartment');
    let clearance = Infinity;
    for (const [index, node] of cell.nodes.entries()) {
      assert.equal(node.pathUm.length, original[index].pathUm.length);
      assert.equal(node.areaUm2, original[index].areaUm2);
      assert.equal(node.lengthUm, original[index].lengthUm);
      for (let p = 0; p < node.pathUm.length; p++) {
      const radius = (node.pathDiameterUm?.[p] ?? node.diameterUm) / 2;
      clearance = Math.min(clearance, node.pathUm[p][1] - radius);
      assert.ok(field.supportsPoint(node.pathUm[p], radius));
      }
    }
    assert.ok(Math.abs(clearance - config.clearanceUm) < 1e-9, `${cell.id} clearance ${clearance}`);
  }
});

test('recording is the reciprocal projection of total membrane current, with separate interval-aligned stimulus artifact', async () => {
  const config = validateInterfaceConfig({ ...freshInterfaceConfig(), count: 1, mode: 'evoked', activeContacts: [0, 2],
    durationMs: 20, startMs: 5, amplitudeUa: 1, phaseUs: 200, gapUs: 100 });
  await loadInterfaceModels(config, readAsset);
  const result = runInterfaceExperiment(config), field = createInterfaceField(), nc = field.contacts.length;
  const cell = result.cells[0], n = cell.nodes.length;
  const coefficients = field.prepare(cell.nodes.map(node => node.centerUm)).coefficients;
  const unitExtracellular = new Float64Array(n);
  for (let i = 0; i < n; i++) for (const c of config.activeContacts) unitExtracellular[i] += coefficients[i * nc + c] / config.activeContacts.length;
  for (const time of [5.1, 5.2, 5.3, 5.4, 5.5, 10]) {
    const frame = Math.round(time / config.sampleMs), total = interfacePulse(config, time - config.dtMs / 2);
    const share = total / config.activeContacts.length;
    for (let c = 0; c < nc; c++) {
      assert.equal(result.currentUa[frame * nc + c], config.activeContacts.includes(c) ? share : 0);
      const expectedArtifact = config.activeContacts.reduce((sum, a) => sum + field.contactTransferMvPerUa[c * nc + a] * share * 1000, 0);
      assert.ok(Math.abs(result.artifactUv[frame * nc + c] - expectedArtifact) < 1e-8);
    }
    // Independent KCL reconstruction from stored Vm, applied Ve and edge
    // conductances, rather than access to the engine's membrane-current array.
    const outwardNa = new Float64Array(n);
    outwardNa[cell.somaIndex] += cell.somaInjectionNa[frame];
    for (let i = 0; i < n; i++) {
      const parent = cell.nodes[i].parent;
      if (parent < 0) continue;
      const axialNa = cell.nodes[i].edgeUs * (cell.membraneMv[frame * n + parent] - cell.membraneMv[frame * n + i]
        + total * (unitExtracellular[parent] - unitExtracellular[i]));
      outwardNa[i] += axialNa; outwardNa[parent] -= axialNa;
    }
    const expectedUv = new Float64Array(nc);
    for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) expectedUv[c] += outwardNa[i] * coefficients[i * nc + c];
    for (let c = 0; c < nc; c++)
      assert.ok(Math.abs(result.neuralUv[frame * nc + c] - expectedUv[c]) < .002,
        `frame ${frame} contact ${c}: recorded ${result.neuralUv[frame * nc + c]}, KCL ${expectedUv[c]}`);
  }
  assert.ok(result.currentUa.slice(0, nc).every(v => v === 0));
  assert.ok(result.artifactUv.slice(0, nc).every(v => v === 0));
  assert.ok(cell.membraneMv.every(Number.isFinite));
  assert.ok(result.neuralUv.every(Number.isFinite));
  assert.ok(cell.spikeTimesMs.length === 0, 'small-current control must not claim stimulation-evoked somatic spikes');
});
