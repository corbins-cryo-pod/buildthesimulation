import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createAtlasModel } from '../src/lib/finger-atlas-v4/model.mjs';
import {
  PRESERVED_SCALE_MM_PER_UM, V3_CORTICAL_SOURCE_IDS, V3_APICAL_SPINY_SOURCE_IDS,
  getPreservedCellRegistration, createPreservedRegistrations,
  transformPreservedPoint, inversePreservedPoint, originalPreservedPoint,
  registeredCellBranches, registerPreservedModel,
} from '../src/lib/finger-atlas-v4/preserved-registration.mjs';

const model = createAtlasModel();
const dist = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
const close = (a, b, tolerance = 1e-9) => assert.ok(dist(a, b) < tolerance, `${JSON.stringify(a)} != ${JSON.stringify(b)}`);
function source(key, sourceCellId, sourceRegion, metadata = {}) {
  const terminal = key.startsWith('terminal:');
  return {
    key, sourceCellId, sourceRegion,
    sourceAnchorUm: terminal ? [-556,-490,35] : [117,-210,36],
    boundsUm: terminal ? [[-30,-40,-20],[110,550,70]] : [[-160,-100,-80],[130,450,95]],
    ports: terminal ? { inlet: [0,0,0] } : { axonOut: [0,-22,3] },
    metadata,
  };
}
// Anchors are deliberately far from local zero: applying their subtraction a
// second time would create a visible erroneous shift and fail these tests.
const templates = [
  ...Array.from({ length: 52 }, (_, i) => source(`drg:${i + 1}`, i + 1, 'drg')),
  ...Array.from({ length: 8 }, (_, i) => source(`drg:${101 + i}`, 101 + i, 'drg', { subtype: 'free' })),
  ...Array.from({ length: 26 }, (_, i) => source(`spinal:${381 + i}`, 381 + i, 'spinal')),
  ...Array.from({ length: 12 }, (_, i) => source(`spinal:${201 + i}`, 201 + i, 'spinal')),
  ...Array.from({ length: 20 }, (_, i) => source(`medulla:${301 + i}`, 301 + i, 'medulla')),
  ...Array.from({ length: 24 }, (_, i) => source(`thalamus:${341 + i}`, 341 + i, 'thalamus')),
  ...V3_CORTICAL_SOURCE_IDS.map(id => source(`cortex:${id}`, id, 'cell', { sourceSpecies: 'Homo sapiens', sourceRegion: 'original source area' })),
  ...['meissner','merkel','pacinian','free','nmj','spindle','golgi'].map(type => source(`terminal:${type}`, type, type === 'nmj' ? 'nmj' : 'tip')),
];
const manifest = { templates };

test('all 306 V4 identities deterministically receive their original-family morphology', () => {
  const first = createPreservedRegistrations(model, manifest);
  assert.deepEqual(first, createPreservedRegistrations(model, [...templates].reverse()));
  assert.equal(first.length, model.cells.length);
  assert.equal(new Set(first.map(item => item.cellId)).size, model.cells.length);
  assert.equal(first.flatMap(item => item.components).length, 375);
  for (let i = 0; i < first.length; i++) {
    const cell = model.cells[i], components = first[i].components;
    assert.equal(components.filter(component => component.anchor === 'soma').length, 1);
    const unsupported = cell.type === 'sa2' || (cell.type === 'spindle' && /^II\b/.test(cell.sensoryClass || ''));
    assert.equal(components.filter(component => component.anchor === 'terminal').length, cell.terminal && !unsupported ? 1 : 0);
    assert.ok(components.every(component => component.cellId === cell.id));
    assert.ok(components.every(component => templates.some(template => template.key === component.templateKey)));
  }
});

test('human cortical, brainstem, spinal and DRG templates retain distinct source families', () => {
  for (const cell of model.cells) {
    const registrations = getPreservedCellRegistration(cell, manifest), soma = registrations[0];
    if (cell.kind === 'sensory') assert.ok(soma.templateKey.startsWith('drg:'));
    if (cell.type === 'free') assert.ok(soma.sourceCellId >= 101 && soma.sourceCellId <= 108);
    if (['spindle','golgi'].includes(cell.type)) assert.ok(soma.sourceCellId >= 1 && soma.sourceCellId <= 52);
    if (cell.type === 'cuneate') assert.ok(soma.templateKey.startsWith('medulla:'));
    if (cell.type === 'vpl') assert.ok(soma.templateKey.startsWith('thalamus:'));
    if (cell.type === 'm1') {
      assert.ok(V3_APICAL_SPINY_SOURCE_IDS.includes(soma.sourceCellId));
      assert.ok(soma.provenance.qualification.includes('not a verified layer-V corticospinal'));
    }
    if (cell.type === 's1') assert.ok(V3_CORTICAL_SOURCE_IDS.includes(soma.sourceCellId));
    if (cell.type === 'lower-motor') assert.ok(soma.sourceCellId >= 201 && soma.sourceCellId <= 212);
    if (['spinal-interneuron','dorsal-projection'].includes(cell.type)) assert.ok(soma.sourceCellId >= 381 && soma.sourceCellId <= 406);
    if (cell.type === 'sa2') assert.ok(soma.terminalNotice.includes('no separately reconstructed SA-II end organ'));
    if (cell.type === 'spindle' && /^II\b/.test(cell.sensoryClass || '')) assert.ok(soma.terminalNotice.includes('not a separately reconstructed group-II'));
  }
});

test('fixed micrometre conversion preserves shape and exactly registers local anchors', () => {
  assert.equal(PRESERVED_SCALE_MM_PER_UM, .001);
  for (const { components } of createPreservedRegistrations(model, manifest)) {
    for (const registration of components) {
      assert.equal(registration.scaleMmPerUm, .001);
      assert.equal(registration.coordinateConvention, 'normalized-local-micrometres');
      assert.ok(Math.abs(Math.hypot(...registration.rotation) - 1) < 1e-12);
      close(transformPreservedPoint([0,0,0], registration), registration.worldAnchorMm);
      const a = [100,-30,17], b = [-42,56,210];
      const A = transformPreservedPoint(a, registration), B = transformPreservedPoint(b, registration);
      assert.ok(Math.abs(dist(A,B) - dist(a,b) * .001) < 1e-10);
      close(inversePreservedPoint(A, registration), a, 1e-7);
      close(originalPreservedPoint([0,0,0], registration), registration.sourceAnchorUm);
      close(originalPreservedPoint(inversePreservedPoint(A, registration), registration), a.map((n, i) => n + registration.sourceAnchorUm[i]), 1e-7);
    }
  }
});

test('display connectors meet preserved original ports without mutating the canonical graph', () => {
  const before = JSON.stringify(model);
  for (const cell of model.cells) {
    const registrations = getPreservedCellRegistration(cell, manifest);
    const branches = registeredCellBranches(cell, registrations);
    for (const registration of registrations) {
      for (const port of Object.values(registration.ports)) {
        if (!port.branchId || cell.type === 's1') continue;
        const branch = branches.find(item => item.id === port.branchId);
        assert.ok(branch);
        close(branch.points[port.endpoint === 'end' ? branch.points.length - 1 : 0], port.worldPointMm);
        close(port.worldPointMm, transformPreservedPoint(port.sourcePointUm, registration));
      }
    }
    if (cell.kind === 'sensory') {
      const stem = branches.find(branch => branch.role === 'stem');
      close(stem.points.at(-1), cell.tJunction);
      close(stem.points[0], registrations[0].ports.axonOut.worldPointMm);
      const main = branches.find(branch => branch.role === 'axon');
      assert.ok(main.points.some(point => dist(point, cell.tJunction) < 1e-12));
    }
  }
  assert.equal(JSON.stringify(model), before);
});

test('restoring a cortical receiver suppresses its replaced synthetic local stub only', () => {
  for (const cell of model.cells) {
    const branches = registeredCellBranches(cell, getPreservedCellRegistration(cell, manifest));
    if (cell.type === 's1') assert.equal(branches.length, 0);
    else assert.equal(branches.length, cell.branches.length);
  }
});

test('restored paths preserve all intercellular graph attachments at the targets', () => {
  const lookup = new Map(model.cells.map(cell => [cell.id, cell]));
  for (const route of model.routes) {
    for (const edge of route.connections) {
      const from = lookup.get(edge.from), target = lookup.get(edge.to);
      const branches = registeredCellBranches(from, getPreservedCellRegistration(from, manifest));
      assert.ok(branches.some(branch => dist(branch.points.at(-1), target.soma) < 1e-12), edge.from);
    }
  }
});

test('missing source families fail explicitly instead of silently substituting primitive neurons', () => {
  assert.throws(() => getPreservedCellRegistration(model.cells[0], []), /Missing preserved V3/);
  const meissner = model.cells.find(cell => cell.type === 'meissner');
  assert.throws(() => getPreservedCellRegistration(meissner, { templates: templates.filter(template => template.key !== 'terminal:meissner') }), /Missing preserved V3 terminal/);
  assert.throws(() => getPreservedCellRegistration(meissner, {}), /templates array/);
});

const realManifest = JSON.parse(fs.readFileSync(new URL('../public/assets/finger-pathway-atlas/v4/cells/manifest.json', import.meta.url), 'utf8'));

test('every actual preserved V3 template is instantiated in the retained 306-cell model', () => {
  const registrations = createPreservedRegistrations(model, realManifest);
  const used = new Set(registrations.flatMap(item => item.components.map(component => component.templateKey)));
  assert.equal(used.size, realManifest.templates.length);
  for (const template of realManifest.templates) assert.ok(used.has(template.key), template.key);
  const primary = registrations.filter(item => model.cells.find(cell => cell.id === item.cellId).kind === 'sensory');
  assert.equal(new Set(primary.slice(0,60).map(item => item.components[0].templateKey)).size, 60);
  const spinal = registrations.filter(item => ['spinal-interneuron','dorsal-projection'].includes(model.cells.find(cell => cell.id === item.cellId).type));
  assert.equal(new Set(spinal.map(item => item.components[0].templateKey)).size, 26);
  const corticalTemplates = registrations.flatMap(item => item.components).filter(component => component.templateKey.startsWith('cortex:'));
  assert.equal(new Set(corticalTemplates.map(component => component.templateKey)).size, 10);
  assert.ok(corticalTemplates.every(component => component.rotation.join(',') === '0,0,0,1'), 'Original display-oriented cortical apical direction is preserved');
});

test('source-aware DRG registration prevents original surface overlap without shrinking any template', () => {
  const before = JSON.stringify(model);
  const registered = registerPreservedModel(model, realManifest);
  assert.equal(JSON.stringify(model), before, 'Registration must not mutate the canonical input');
  assert.deepEqual(registerPreservedModel(model, realManifest), registered, 'Packing is deterministic');
  assert.deepEqual(registerPreservedModel(registered, realManifest), registered, 'Re-registering is idempotent');
  const sensory = registered.cells.filter(cell => cell.kind === 'sensory');
  for (let i = 0; i < sensory.length; i++) {
    const cell = sensory[i];
    for (let j = 0; j < i; j++) {
      assert.ok(dist(cell.soma, sensory[j].soma) > cell.preservedMorphology.separationRadiusMm + sensory[j].preservedMorphology.separationRadiusMm, `${cell.id} overlaps ${sensory[j].id}`);
    }
    const stem = cell.branches.find(branch => branch.role === 'stem');
    close(stem.points[0], cell.soma);
    close(stem.points.at(-1), cell.tJunction);
    const drgMark = registered.routes.flatMap(route => route.landmarks).find(mark => mark.region === 'drg' && mark.cellId === cell.id);
    close(drgMark.point, cell.soma);
    const components = getPreservedCellRegistration(cell, realManifest);
    assert.ok(components.every(component => component.scaleMmPerUm === .001));
  }
  assert.equal(registered.preservedMorphology.templatesUsed, realManifest.templates.length);
  assert.equal(registered.preservedMorphology.registeredCells, model.cells.length);
  const cells = new Map(registered.cells.map(cell => [cell.id, cell]));
  for (const edge of registered.routes.flatMap(route => route.connections)) {
    close(edge.at, cells.get(edge.to).soma);
    assert.ok(cells.get(edge.from).branches.some(branch => dist(branch.points.at(-1), edge.at) < 1e-12));
  }
});

test('actual end organs stay at anatomical targets while original inlet stubs join the long-range fibers', () => {
  for (const cell of model.cells.filter(cell => cell.terminal)) {
    const components = getPreservedCellRegistration(cell, realManifest);
    const terminal = components.find(component => component.anchor === 'terminal');
    if (!terminal) continue;
    close(transformPreservedPoint(terminal.organCenterUm, terminal), cell.terminal);
    close(terminal.anatomicalAnchorMm, cell.terminal);
    const record = realManifest.templates.find(template => template.key === terminal.templateKey);
    if (record.organCenterUm) close(terminal.organCenterUm, record.organCenterUm);
    const inlet = terminal.ports.inlet;
    assert.ok(dist(inlet.worldPointMm, cell.terminal) > .01, 'Original inlet and end-organ location remain distinct');
    const rendered = registeredCellBranches(cell, components).find(branch => branch.id === inlet.branchId);
    close(rendered.points[inlet.endpoint === 'start' ? 0 : rendered.points.length - 1], inlet.worldPointMm);
    close(transformPreservedPoint(inlet.sourcePointUm, terminal), inlet.worldPointMm);
  }
});
