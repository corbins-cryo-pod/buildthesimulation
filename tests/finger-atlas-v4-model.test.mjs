import test from 'node:test';
import assert from 'node:assert/strict';
import { createAtlasModel, REGIONS } from '../src/lib/finger-atlas-v4/model.mjs';

const model = createAtlasModel();
const byId = new Map(model.cells.map(cell => [cell.id, cell]));
const equalPoint = (a, b) => a.length === 3 && a.every((v, i) => v === b[i]);
const span = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const axon = cell => cell.branches.find(branch => branch.role === 'axon');
const crosses = points => points.flatMap((point, index) => index && point[0] * points[index - 1][0] < 0 ? [{ before: points[index - 1], after: point }] : []);

test('v4 construction is deterministic and does not return shared cell state', () => {
  const second = createAtlasModel();
  assert.deepEqual(second, model);
  second.cells[0].soma[0] = 10000;
  second.cells[0].branches[0].points[0][0] = 10000;
  assert.notDeepEqual(second.cells[0].soma, model.cells[0].soma);
  assert.notDeepEqual(second.cells[0].branches[0].points, model.cells[0].branches[0].points);
});

test('all selected primary afferents and motor units have explicit unique cells', () => {
  assert.equal(model.version, 4);
  assert.equal(model.units, 'mm');
  assert.equal(byId.size, model.cells.length);
  assert.equal(model.cells.length, 306);
  assert.equal(model.routes.length, 78);
  assert.equal(model.cells.filter(cell => cell.kind === 'sensory').length, 66);
  assert.equal(model.routes.filter(route => route.kind === 'touch').length, 52);
  assert.equal(model.routes.filter(route => route.kind === 'pain').length, 8);
  assert.equal(model.routes.filter(route => route.kind === 'proprioception').length, 6);
  assert.equal(model.routes.filter(route => route.kind === 'motor').length, 12);
  const assignments = model.routes.flatMap(route => route.cellIds);
  assert.equal(assignments.length, model.cells.length);
  assert.equal(new Set(assignments).size, model.cells.length);
  assert.ok(model.scope.includes('not a full biological cell census'));
});

test('all coordinates are finite world millimetres and caliber is biological scale', () => {
  for (const cell of model.cells) {
    assert.ok(cell.somaRadiusMm >= .008 && cell.somaRadiusMm <= .04, cell.id);
    assert.ok(cell.axonRadiusMm >= .0002 && cell.axonRadiusMm <= .007, cell.id);
    assert.ok(cell.branches.length > 0, cell.id);
    for (const point of [cell.soma, ...(cell.terminal ? [cell.terminal] : []), ...cell.branches.flatMap(branch => branch.points)]) {
      assert.equal(point.length, 3, cell.id);
      assert.ok(point.every(Number.isFinite), cell.id);
      assert.ok(point.every(value => Math.abs(value) < 1000), `No local-micrometre coordinates leaked into ${cell.id}`);
    }
    for (const branch of cell.branches) {
      assert.ok(branch.points.length >= 2, branch.id);
      assert.ok(branch.points.some((point, i) => i && span(point, branch.points[i - 1]) > 0), branch.id);
    }
  }
});

test('every route is reachable through explicit synapses and exact geometric attachments', () => {
  for (const route of model.routes) {
    const reachable = new Set([route.cellIds[0]]);
    for (let iteration = 0; iteration < route.cellIds.length; iteration++) {
      for (const edge of route.connections) if (reachable.has(edge.from)) reachable.add(edge.to);
    }
    assert.equal(reachable.size, route.cellIds.length, route.id);
    for (const edge of route.connections) {
      const from = byId.get(edge.from), to = byId.get(edge.to);
      assert.ok(from && to, route.id);
      assert.equal(edge.kind, 'synapse');
      assert.ok(equalPoint(edge.at, to.soma), `${route.id}: graph edge must attach at its target`);
      assert.ok(from.branches.some(branch => equalPoint(branch.points.at(-1), edge.at)), `${from.id}: unconnected output`);
      assert.ok(!equalPoint(from.soma, to.soma), `${route.id}: distinct neurons need distinct somata`);
    }
  }
});

test('DRG neurons have a side stem and uninterrupted peripheral-to-central axon', () => {
  const sensory = model.cells.filter(cell => cell.kind === 'sensory');
  for (const cell of sensory) {
    assert.equal(cell.region, 'drg');
    const stem = cell.branches.find(branch => branch.role === 'stem'), main = axon(cell);
    assert.ok(stem, cell.id);
    assert.ok(equalPoint(stem.points[0], cell.soma), cell.id);
    assert.ok(equalPoint(stem.points.at(-1), cell.tJunction), cell.id);
    const junctionIndex = main.points.findIndex(point => equalPoint(point, cell.tJunction));
    assert.ok(junctionIndex > 0 && junctionIndex < main.points.length - 1, cell.id);
    assert.ok(equalPoint(main.points[0], cell.terminal), cell.id);
    assert.ok(!main.points.some(point => equalPoint(point, cell.soma)), `${cell.id}: soma is not an obligatory inline relay`);
    assert.ok(main.points.every(point => point[0] < 0), `${cell.id}: primary afferent must remain ipsilateral`);
    assert.ok(!model.routes.flatMap(route => route.connections).some(edge => edge.to === cell.id), 'No invented DRG synapse');
  }
  for (let i = 0; i < sensory.length; i++) {
    for (let j = 0; j < i; j++) assert.ok(span(sensory[i].soma, sensory[j].soma) > sensory[i].somaRadiusMm + sensory[j].somaRadiusMm, 'Sensory somata must not overlap');
  }
});

test('touch and conscious proprioception cross only after an ipsilateral cuneate relay', () => {
  for (const route of model.routes.filter(route => ['touch', 'proprioception'].includes(route.kind))) {
    const [primary, cuneate, vpl, s1] = route.cellIds.map(id => byId.get(id));
    assert.equal(cuneate.type, 'cuneate');
    assert.equal(vpl.type, 'vpl');
    assert.equal(s1.type, 's1');
    assert.ok(primary.soma[0] < 0 && cuneate.soma[0] < 0 && vpl.soma[0] > 0 && s1.soma[0] > 0);
    const crossing = crosses(axon(cuneate).points);
    assert.equal(crossing.length, 1);
    assert.ok(crossing[0].before[1] > 245 && crossing[0].after[1] < 265, 'Sensory crossing belongs in the medulla');
    assert.ok(axon(vpl).points.every(point => point[0] > 0), 'Thalamocortical projection stays on the contralateral side');
    assert.ok(route.landmarks.some(mark => mark.region === 'pons'));
    assert.ok(route.landmarks.some(mark => mark.region === 'midbrain'));
  }
});

test('nociceptive examples relay and cross in the spinal cord, not the cuneate', () => {
  for (const route of model.routes.filter(route => route.kind === 'pain')) {
    const cells = route.cellIds.map(id => byId.get(id));
    assert.deepEqual(cells.map(cell => cell.type), ['free', 'dorsal-projection', 'vpl', 's1']);
    assert.equal(cells[1].region, 'spinal');
    const crossing = crosses(axon(cells[1]).points);
    assert.equal(crossing.length, 1);
    assert.ok(crossing[0].before[1] < 180 && crossing[0].after[1] < 180, 'Anterolateral crossing must occur in the cervical spinal cord');
    assert.ok(cells[2].soma[0] > 0);
  }
});

test('motor routes cross caudally, use separate interneuron and LMN, and bypass DRG', () => {
  for (const route of model.routes.filter(route => route.kind === 'motor')) {
    const [m1, local, lower] = route.cellIds.map(id => byId.get(id));
    assert.deepEqual([m1.type, local.type, lower.type], ['m1', 'spinal-interneuron', 'lower-motor']);
    assert.ok(m1.soma[0] > 0 && local.soma[0] < 0 && lower.soma[0] < 0);
    assert.ok(!route.landmarks.some(mark => mark.region === 'drg'));
    const crossing = crosses(axon(m1).points);
    assert.equal(crossing.length, 1);
    assert.ok(crossing[0].before[1] < 245 && crossing[0].after[1] < 245, 'Motor crossing is caudal to cuneate sensory crossing');
    assert.ok(axon(lower).points.every(point => point[0] < 0));
    assert.ok(equalPoint(axon(lower).points[0], lower.soma));
    assert.ok(equalPoint(axon(lower).points.at(-1), lower.terminal));
    assert.ok(lower.terminal[1] < -200, 'LMN must reach a peripheral muscle target');
    assert.ok(!lower.branches.some(branch => branch.role === 'stem'));
    assert.ok(['median', 'radial', 'ulnar'].includes(lower.nerve));
  }
});

test('proprioceptive collaterals originate on their parent axons and reach distinct local cells', () => {
  for (const route of model.routes.filter(route => route.kind === 'proprioception')) {
    const primary = byId.get(route.cellIds[0]);
    const collateral = primary.branches.find(branch => branch.role === 'collateral');
    const local = byId.get(route.cellIds.at(-1));
    assert.equal(local.type, 'spinal-interneuron');
    assert.ok(axon(primary).points.some(point => equalPoint(point, collateral.points[0])));
    assert.ok(equalPoint(collateral.points.at(-1), local.soma));
    assert.ok(primary.terminal[1] > -400 && primary.terminal[1] < -230, 'Spindles and tendon organs stay in the forearm');
    assert.ok(['spindle', 'golgi'].includes(primary.type));
  }
  const spindleClasses = new Set(model.cells.filter(cell => cell.type === 'spindle').map(cell => cell.sensoryClass));
  assert.equal(spindleClasses.size, 2, 'Distinct Ia and II examples');
});

test('every navigation landmark resolves into this same cell model and region set', () => {
  const regions = new Set(REGIONS.map(region => region.id));
  for (const id of ['overview','tip','nerve','drg','spinal','medulla','pons','midbrain','thalamus','cortex','nmj','proprio','hand','arm']) assert.ok(regions.has(id));
  for (const region of REGIONS) {
    assert.ok(region.center.every(Number.isFinite));
    assert.ok(region.distance > 0);
  }
  for (const route of model.routes) {
    for (const mark of route.landmarks) {
      assert.ok(regions.has(mark.region), mark.region);
      assert.ok(route.cellIds.includes(mark.cellId), `${route.id}: unrelated landmark cell`);
      assert.ok(mark.point.every(Number.isFinite));
    }
  }
});
