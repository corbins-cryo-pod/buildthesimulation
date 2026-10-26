import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODEL_VERSION, DEFAULT_CONFIG, PRESETS, createSimulation, stepSimulation,
  getMetrics, exportSWC, exportCSV, serializeSimulation, restoreSimulation, motorClutch,
} from '../src/lib/cell-growth/engine.js';
import {
  closestSegmentPoints, pointSegmentDistance, segmentSphereHit,
  segmentBoxHit, segmentCapsuleHit, SpatialHash,
} from '../src/lib/cell-growth/geometry.js';

const close = (actual, expected, tolerance = 1e-9) => assert.ok(
  Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
  `${actual} versus ${expected}; tolerance ${tolerance}`,
);
const dist = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
const length = sim => sim.segments.filter(s => s.alive).reduce((sum, s) => sum + dist(s.start, s.end), 0);
const controlled = {
  cellCount: 1, source: 'immature', seed: 714, branching: 0, noise: 0,
  guidance: 0, selfAvoidance: 0, fasciculation: 0,
};
const grow = (config = {}, hours = 4) => {
  const sim = createSimulation({ ...controlled, ...config });
  sim.world.obstacles = [];
  if (sim.world.cue) sim.world.cue.strength = 0;
  stepSimulation(sim, hours);
  return sim;
};
// Independent projection used for final whole-tree overlap audits.
const pointToSegment = (p, a, b) => {
  const d = b.map((x, i) => x - a[i]), q = p.map((x, i) => x - a[i]);
  const dd = d.reduce((s, x) => s + x * x, 0);
  const t = dd ? Math.max(0, Math.min(1, q.reduce((s, x, i) => s + x * d[i], 0) / dd)) : 0;
  return Math.hypot(...p.map((x, i) => x - a[i] - t * d[i]));
};
function shaftEntersBox(segment, box) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 3; i++) {
    const min = box.position[i] - box.size[i] / 2 - segment.radius + 1e-7;
    const max = box.position[i] + box.size[i] / 2 + segment.radius - 1e-7;
    const velocity = segment.end[i] - segment.start[i];
    if (Math.abs(velocity) < 1e-14) {
      if (segment.start[i] < min || segment.start[i] > max) return false;
    } else {
      const a = (min - segment.start[i]) / velocity, b = (max - segment.start[i]) / velocity;
      lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b));
      if (lo > hi) return false;
    }
  }
  return hi >= lo;
}

test('cell-growth analytic segment distances cover intersection, skew, parallel, disjoint and degenerate cases', () => {
  const cases = [
    [[-2, 0, 0], [2, 0, 0], [0, -2, 0], [0, 2, 0], 0],
    [[-2, 0, 0], [2, 0, 0], [0, -2, 3], [0, 2, 3], 3],
    [[-2, 0, 0], [2, 0, 0], [-1, 2, 0], [4, 2, 0], 2],
    [[-2, 0, 0], [-1, 0, 0], [1, 0, 0], [4, 0, 0], 2],
    [[0, 0, 0], [0, 0, 0], [0, 3, 4], [0, 3, 4], 5],
    [[1, 2, 0], [1, 2, 0], [-4, 0, 0], [4, 0, 0], 2],
    [[0, 0, 0], [1, 0, 0], [2, 1, 0], [2, 2, 0], Math.SQRT2],
  ];
  for (const [a, b, c, d, expected] of cases) {
    const hit = closestSegmentPoints(a, b, c, d);
    close(hit.distance, expected);
    close(dist(hit.p, hit.q), expected);
    assert.ok(hit.s >= 0 && hit.s <= 1 && hit.t >= 0 && hit.t <= 1);
    close(closestSegmentPoints(c, d, a, b).distance, expected);
    close(closestSegmentPoints(b, a, d, c).distance, expected);
  }
});

test('cell-growth point/segment projection clamps to finite endpoints', () => {
  const a = [-1, 0, 0], b = [1, 0, 0];
  close(pointSegmentDistance([0, 3, 4], a, b).distance, 5);
  close(pointSegmentDistance([4, 4, 0], a, b).distance, 5);
  close(pointSegmentDistance([4, 4, 0], a, a).distance, Math.sqrt(41));
});

test('cell-growth swept sphere detects complete crossings, tangency and zero-length overlap', () => {
  const crossing = segmentSphereHit([-100, 0, 0], [100, 0, 0], [0, 0, 0], 1);
  close(crossing.t, .495);
  close(crossing.point[0], -1);
  assert.deepEqual(crossing.normal, [-1, 0, 0]);
  const tangent = segmentSphereHit([-10, 1, 0], [10, 1, 0], [0, 0, 0], 1);
  close(tangent.t, .5);
  assert.equal(segmentSphereHit([-10, 1.01, 0], [10, 1.01, 0], [0, 0, 0], 1), null);
  assert.equal(segmentSphereHit([2, 0, 0], [2, 0, 0], [0, 0, 0], 1), null);
  assert.equal(segmentSphereHit([.5, 0, 0], [.5, 0, 0], [0, 0, 0], 1).t, 0);
});

test('cell-growth thin solid and finite-radius clearance cannot be tunneled through', () => {
  const hit = segmentBoxHit([-100, 0, 0], [100, 0, 0], [0, 0, 0], [.1, 8, 8], .5);
  close(hit.t, 99.45 / 200);
  close(hit.point[0], -.55);
  assert.equal(segmentBoxHit([-100, 4.51, 0], [100, 4.51, 0], [0, 0, 0], [.1, 8, 8], .5), null);
  const reverse = segmentBoxHit([100, 0, 0], [-100, 0, 0], [0, 0, 0], [.1, 8, 8], .5);
  close(reverse.point[0], .55);
  assert.deepEqual(reverse.normal, [1, 0, 0]);
});

test('cell-growth swept capsule resolves both shaft collisions and rounded end caps', () => {
  const c = [0, -5, 0], d = [0, 5, 0];
  const shaft = segmentCapsuleHit([-100, 0, 0], [100, 0, 0], c, d, 1);
  close(shaft.t, .495);
  close(shaft.point[0], -1);
  const cap = segmentCapsuleHit([-10, 5.6, 0], [10, 5.6, 0], c, d, 1);
  close(cap.point[0], -.8);
  assert.equal(segmentCapsuleHit([-10, 6.01, 0], [10, 6.01, 0], c, d, 1), null);
  const pointCapsule = segmentCapsuleHit([-10, 0, 0], [10, 0, 0], [0, 0, 0], [0, 0, 0], 2);
  close(pointCapsule.point[0], -2);
});

test('cell-growth swept capsule agrees with independent minimum-distance classification across seeded geometries', () => {
  let state = 71231;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const point = () => Array.from({ length: 3 }, () => random() * 40 - 20);
  for (let i = 0; i < 2000; i++) {
    const a = point(), b = point(), c = point(), d = point(), r = .1 + random() * 5;
    const minimum = closestSegmentPoints(a, b, c, d).distance;
    const hit = segmentCapsuleHit(a, b, c, d, r);
    assert.equal(Boolean(hit), minimum <= r, `capsule classification ${i}`);
    if (hit && hit.t > 0) close(pointSegmentDistance(hit.point, c, d).distance, r, 1e-9);
  }
});

test('cell-growth broad phase indexes whole segments at negative and positive coordinates', () => {
  const hash = new SpatialHash(8);
  hash.insert('long', [-100, 0, 0], [100, 0, 0], 1);
  hash.insert('negative', [-40, -20, -20], [-30, -20, -20], 2);
  assert.ok(hash.query([0, -2, 0], [0, 2, 0], .5).includes('long'));
  assert.ok(hash.query([-35, -21, -20], [-35, -19, -20], .1).includes('negative'));
  assert.deepEqual(hash.query([0, 100, 0], [5, 100, 0], 1), []);
  assert.equal(hash.query([-100, 0, 0], [100, 0, 0], 1).filter(x => x === 'long').length, 1);
});

test('cell-growth equal seeded runs agree exactly while different seeds change initial geometry', () => {
  const a = grow({ cellCount: 3, branching: 1, noise: .35 }, 8);
  const b = grow({ cellCount: 3, branching: 1, noise: .35 }, 8);
  assert.deepEqual(serializeSimulation(a), serializeSimulation(b));
  const c = createSimulation({ seed: 715, cellCount: 3, source: 'immature' });
  assert.notDeepEqual(a.cells.map(x => x.position), c.cells.map(x => x.position));
});

test('cell-growth metrics reconstruct live geometric length independently', () => {
  const sim = grow({ cellCount: 3, branching: 1, noise: .3 }, 10);
  const metrics = getMetrics(sim);
  close(metrics.totalLength, length(sim), 1e-7);
  for (const kind of ['axon', 'dendrite']) {
    const expected = sim.segments.filter(s => s.alive && s.kind === kind)
      .reduce((sum, s) => sum + dist(s.start, s.end), 0);
    close(metrics[kind === 'axon' ? 'totalAxonLength' : 'totalDendriteLength'], expected, 1e-7);
  }
  close(metrics.totalAxonLength + metrics.totalDendriteLength, metrics.totalLength, 1e-7);
});

test('cell-growth zero actin and zero microtubule support cannot add stable shaft length', () => {
  for (const blocked of [{ actin: 0 }, { microtubules: 0 }]) {
    const sim = createSimulation({ ...controlled, ...blocked });
    // Isolate tip growth: moving membrane anchors can elastically stretch a root.
    for (const c of sim.cells) c.membrane.lastSolveHours = 720;
    const initial = length(sim);
    stepSimulation(sim, 8);
    assert.ok(length(sim) <= initial + 1e-7, `blocked extension: ${JSON.stringify(blocked)}`);
  }
  const baseline = createSimulation(controlled);
  const initial = length(baseline);
  stepSimulation(baseline, 8);
  assert.ok(length(baseline) > initial + 1, 'positive-driver control must extend');
});

test('cell-growth a zero-duration solve leaves the experiment unchanged', () => {
  const sim = createSimulation(controlled), before = serializeSimulation(sim);
  stepSimulation(sim, 0);
  assert.deepEqual(serializeSimulation(sim), before);
});

test('cell-growth saved state preserves continuation including random event state', () => {
  const sim = grow({ cellCount: 3, noise: .35, branching: 1 }, 4);
  const copy = restoreSimulation(JSON.stringify(serializeSimulation(sim)));
  assert.deepEqual(serializeSimulation(copy), serializeSimulation(sim));
  stepSimulation(sim, 6);
  stepSimulation(copy, 6);
  assert.deepEqual(serializeSimulation(copy), serializeSimulation(sim));
});

test('cell-growth playback chunk size preserves trajectories, events and developmental transitions', () => {
  const make = chunk => {
    const sim = createSimulation({ cellCount: 4, seed: 714 });
    for (let i = 0; i < Math.round(24 / chunk); i++) stepSimulation(sim, chunk);
    return sim;
  };
  const reference = make(24), m = getMetrics(reference);
  for (const chunk of [.5, .1, 1]) {
    const sim = make(chunk), metrics = getMetrics(sim);
    assert.equal(sim.stepCount, reference.stepCount);
    assert.equal(sim.segments.length, reference.segments.length);
    assert.equal(metrics.branches, m.branches);
    assert.equal(metrics.contacts, m.contacts);
    assert.deepEqual(sim.cells.map(c => c.stage), reference.cells.map(c => c.stage));
    assert.ok(Math.abs(metrics.totalLength - m.totalLength) / m.totalLength < 1e-7);
    for (let i = 0; i < sim.segments.length; i++) {
      assert.equal(sim.segments[i].parentId, reference.segments[i].parentId);
      assert.ok(dist(sim.segments[i].end, reference.segments[i].end) < 1e-7);
    }
  }
});

test('cell-growth source/configuration metadata remain explicit in exports', () => {
  const sim = grow({}, 2);
  const saved = serializeSimulation(sim);
  assert.ok(JSON.stringify(saved).includes(MODEL_VERSION));
  assert.ok(JSON.stringify(saved).includes('immature'));
  const csv = exportCSV(sim);
  assert.equal(typeof csv, 'string');
  assert.ok(csv.length > 30);
  const swc = exportSWC(sim, sim.cells[0].id);
  const rows = swc.split(/\r?\n/).filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.trim().split(/\s+/).map(Number));
  assert.ok(rows.length > 1);
  const ids = new Set();
  for (const row of rows) {
    assert.equal(row.length, 7);
    assert.ok(row.every(Number.isFinite));
    assert.ok(row[0] > 0 && !ids.has(row[0]));
    assert.ok(row[5] > 0);
    assert.ok(row[6] === -1 || ids.has(row[6]), 'SWC parents precede children');
    ids.add(row[0]);
  }
});

test('cell-growth deterministic free growth converges under timestep refinement', () => {
  const steps = [.05, .025, .0125];
  const runs = steps.map(dtHours => grow({ dtHours }, 4));
  const lengths = runs.map(length), coarseError = Math.abs(lengths[0] - lengths[2]);
  const fineError = Math.abs(lengths[1] - lengths[2]);
  assert.ok(coarseError / lengths[2] < .05, `coarse/fine relative length error: ${coarseError / lengths[2]}`);
  assert.ok(fineError <= coarseError + 1e-8, `refinement errors: ${coarseError}, ${fineError}`);
});

test('cell-growth each environment maintains finite state and valid neurite topology', () => {
  for (const mode of ['culture', 'organoid', 'regeneration', 'biohybrid']) {
    const sim = createSimulation({ mode, source: 'immature', cellCount: 4, seed: 314 });
    stepSimulation(sim, 24);
    const ids = new Set(sim.segments.map(s => s.id));
    const cellIds = new Set(sim.cells.map(c => c.id));
    for (const s of sim.segments) {
      assert.ok(s.start.every(Number.isFinite) && s.end.every(Number.isFinite));
      assert.ok(s.radius > 0 && Number.isFinite(s.radius));
      assert.ok(cellIds.has(s.cellId));
      assert.ok(s.parentId === null || s.parentId === -1 || ids.has(s.parentId));
      assert.notEqual(s.id, s.parentId);
    }
    for (const t of sim.tips) {
      assert.ok(cellIds.has(t.cellId) && ids.has(t.segmentId));
      assert.ok(t.direction.every(Number.isFinite));
      for (const value of Object.values(t.forces)) assert.ok(Number.isFinite(value));
    }
    assert.ok(Number.isFinite(getMetrics(sim).totalLength));
    close(sim.timeHours, 24, 1e-9);
  }
});

test('cell-growth rewriting a short shaft preserves an obstacle-avoiding corner', () => {
  const sim = createSimulation({ ...controlled, actin: 3, tension: 0 });
  for (const tip of sim.tips) tip.active = false;
  for (const segment of sim.segments) segment.alive = false;
  const segment = sim.segments[0], tip = sim.tips[0], cell = sim.cells[0];
  Object.assign(segment, { start: [0, 0, 0], end: [2, 0, 0], radius: .23, kind: 'axon', alive: true });
  Object.assign(tip, { direction: [0, 0, 1], kind: 'axon', active: true, mt: 1, radius: .23 });
  cell.ageHours = 20; cell.axonRootId = 0; cell.position = [-100, 0, 0];
  // Freeze the deliberately relocated diagnostic soma; this test isolates a
  // short-shaft chord rewrite, not membrane reattachment to the original mesh.
  cell.membrane.lastSolveHours = 1e6; sim.world.obstacles = [];
  const free = serializeSimulation(sim);
  stepSimulation(free, .05);
  const proposed = free.segments[free.tips[0].segmentId].end;
  const obstacle = { id: 'corner-regression', shape: 'sphere', position: proposed.map(x => x / 2), radius: .08 };
  assert.ok(pointToSegment(obstacle.position, segment.start, segment.end) > segment.radius + obstacle.radius);
  assert.ok(pointToSegment(obstacle.position, segment.end, proposed) > segment.radius + obstacle.radius);
  sim.world.obstacles = [obstacle];
  stepSimulation(sim, .05);
  for (const s of sim.segments.filter(s => s.alive)) {
    assert.ok(pointToSegment(obstacle.position, s.start, s.end) >= s.radius + obstacle.radius - 1e-7);
  }
});

test('cell-growth finite membrane budget is conserved even with no supply and zero tension', () => {
  const sim = createSimulation({ ...controlled, actin: 3, tension: 0, membraneSupply: 0 });
  sim.world.obstacles = [];
  stepSimulation(sim, 48);
  const m = sim.cells[0].membrane;
  close(m.suppliedArea, 0);
  close(m.reserve * m.reserveCapacity, m.reserveCapacity + m.suppliedArea + m.recycledArea - m.usedArea, 1e-7);
  assert.ok(m.usedArea <= m.reserveCapacity + m.recycledArea + 1e-7);
  assert.ok(m.reserve < .1, 'the finite membrane pool must deplete');
});

test('cell-growth replenishment and retraction keep a closed membrane-area ledger', () => {
  const sim = createSimulation({ source: 'immature', cellCount: 3, actin: 2, branching: 2 });
  stepSimulation(sim, 16);
  sim.config.actin = 0;
  stepSimulation(sim, 8);
  for (const c of sim.cells) {
    const m = c.membrane;
    close(m.reserve * m.reserveCapacity, m.reserveCapacity + m.suppliedArea + m.recycledArea - m.usedArea, 1e-6);
    assert.ok(m.reserve >= 0 && m.reserve <= 1);
    assert.ok(m.suppliedArea >= 0 && m.recycledArea >= 0 && m.usedArea >= 0);
  }
  assert.ok(sim.counters.retractions > 0);
});

test('cell-growth high-driver extension does not depend on a per-step distance ceiling', () => {
  const coarse = grow({ actin: 3, tension: 0, dtHours: .05 }, 1);
  const fine = grow({ actin: 3, tension: 0, dtHours: .025 }, 1);
  const relative = Math.abs(length(coarse) - length(fine)) / length(fine);
  assert.ok(relative < .05, `high-driver refinement error ${relative}`);
});

test('cell-growth motor-clutch closure has a physically defined zero-adhesion limit', () => {
  const zero = motorClutch({ ...DEFAULT_CONFIG, adhesion: 0 });
  close(zero.traction, 0); close(zero.retrograde, 66);
  for (const stiffness of [1, 10, 100, 1000, 10000]) {
    const result = motorClutch({ ...DEFAULT_CONFIG, stiffness });
    assert.ok(Object.values(result).every(Number.isFinite));
    assert.ok(result.occupancy >= 0 && result.occupancy <= 1);
    assert.ok(result.traction >= 0 && result.retrograde >= 0 && result.retrograde <= 66);
  }
});

test('cell-growth developmental clock delays stem-cell neurites and assigns one axon lineage', () => {
  const sim = createSimulation({ ...controlled, source: 'stem' });
  stepSimulation(sim, 47);
  assert.equal(sim.cells[0].stage, 'stem'); assert.equal(sim.segments.length, 0);
  stepSimulation(sim, 2);
  assert.equal(sim.cells[0].stage, 'precursor'); assert.equal(sim.segments.length, 0);
  stepSimulation(sim, 8);
  assert.equal(sim.cells[0].stage, 'immature'); assert.ok(sim.segments.length > 0);
  assert.equal(sim.cells[0].axonRootId, null);
  stepSimulation(sim, 10);
  assert.equal(sim.cells[0].stage, 'polarized');
  const axonRoots = sim.segments.filter(s => s.kind === 'axon' && s.parentId === -1);
  assert.equal(axonRoots.length, 1);
  assert.equal(sim.cells[0].axonRootId, axonRoots[0].id);
  assert.ok(sim.segments.filter(s => s.kind === 'axon').every(s => s.rootId === axonRoots[0].id));
});

test('cell-growth Sholl crossings use geometric intersections rather than view projections', () => {
  const sim = createSimulation(controlled);
  sim.cells[0].position = [0, 0, 0]; sim.tips = [];
  sim.segments = [{ id: 0, cellId: 0, parentId: -1, start: [-100, 10, 0], end: [100, 10, 0], radius: 1, kind: 'dendrite', alive: true }];
  const profile = getMetrics(sim).perCell[0].sholl;
  for (const row of profile) assert.equal(row.intersections, row.radius < Math.sqrt(10100) ? 2 : 0);
  const cell = getMetrics(grow({}, 14)).perCell[0];
  for (let i = 0; i < cell.sholl.length; i++) assert.equal(cell.sholl[i].intersections, cell.shollAxon[i].intersections + cell.shollDendrite[i].intersections);
});

test('cell-growth membrane is a closed deforming surface with independently reconstructed area', () => {
  const sim = createSimulation(controlled), before = structuredClone(sim.cells[0].membrane.vertices);
  stepSimulation(sim, 2);
  const m = sim.cells[0].membrane, edges = new Map(); let area = 0;
  for (const triangle of m.triangles) {
    const [a, b, c] = triangle.map(i => m.vertices[i]);
    const u = b.map((x, i) => x - a[i]), v = c.map((x, i) => x - a[i]);
    area += .5 * Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]);
    for (let i = 0; i < 3; i++) {
      const key = [triangle[i], triangle[(i + 1) % 3]].sort((a, b) => a - b).join(':');
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  }
  assert.ok([...edges.values()].every(count => count === 2), 'every shell edge has two incident faces');
  assert.equal(m.vertices.length - edges.size + m.triangles.length, 2);
  close(area, m.area, 1e-8);
  assert.ok(m.volume > 0 && m.elasticEnergy >= 0);
  assert.notDeepEqual(m.vertices, before);
});

function controlledApposition(targetKind = 'dendrite', sameCell = false) {
  const sim = createSimulation({ ...controlled, cellCount: 2, actin: 3, tension: 0 });
  for (const tip of sim.tips) tip.active = false;
  for (const segment of sim.segments) segment.alive = false;
  const a = sim.segments[0], b = sim.segments.find(s => s.cellId === 1), tip = sim.tips[0];
  Object.assign(a, { start: [-3, 0, 0], end: [-1.05, 0, 0], radius: .5, kind: 'axon', alive: true });
  Object.assign(b, { start: [0, 0, -10], end: [0, 0, 10], radius: .5, kind: targetKind, alive: true });
  if (sameCell) b.cellId = 0;
  Object.assign(tip, { active: true, kind: 'axon', direction: [1, 0, 0], mt: 1 });
  for (const [i, cell] of sim.cells.entries()) {
    cell.ageHours = 20; cell.position = [i ? 100 : -100, 0, 0];
    cell.axonRootId = i ? b.id : a.id; cell.membrane.lastSolveHours = 100;
  }
  sim.world.obstacles = [];
  const advance = () => { tip.direction = [1, 0, 0]; stepSimulation(sim, .05); };
  return { sim, target: b, advance };
}

test('cell-growth candidate connection requires sustained heterocellular apposition and is lost on separation', () => {
  const { sim, target, advance } = controlledApposition();
  for (let i = 0; i < 5; i++) advance();
  assert.equal(sim.contacts.length, 1);
  assert.equal(sim.contacts[0].candidate, false);
  assert.equal(getMetrics(sim).contacts, 0);
  advance();
  assert.equal(sim.contacts[0].candidate, true);
  close(sim.contacts[0].dwellHours, .3);
  assert.equal(getMetrics(sim).contacts, 1);
  target.start[0] = target.end[0] = 100;
  advance();
  assert.equal(sim.contacts[0].candidate, false);
  assert.equal(sim.contacts[0].status, 'lost');
  assert.equal(getMetrics(sim).contacts, 0);
});

test('cell-growth homotypic or same-cell contact cannot be counted as an axodendritic candidate', () => {
  for (const [kind, sameCell] of [['axon', false], ['dendrite', true]]) {
    const { sim, advance } = controlledApposition(kind, sameCell);
    for (let i = 0; i < 8; i++) advance();
    assert.equal(sim.contacts.length, 0);
    assert.equal(getMetrics(sim).contacts, 0);
  }
});

test('cell-growth final shafts do not penetrate solids, other somata or world boundaries', () => {
  for (const mode of ['culture', 'organoid', 'regeneration', 'biohybrid']) {
    const sim = createSimulation({ mode, source: 'immature', cellCount: 8, seed: 314 });
    stepSimulation(sim, 36);
    for (const s of sim.segments.filter(s => s.alive)) {
      for (const o of sim.world.obstacles) {
        if (o.shape === 'sphere') assert.ok(pointToSegment(o.position, s.start, s.end) >= o.radius + s.radius - 1e-7, `${mode}: segment ${s.id} enters ${o.id}`);
        else assert.equal(shaftEntersBox(s, o), false, `${mode}: segment ${s.id} enters ${o.id}`);
      }
      for (const c of sim.cells) if (c.id !== s.cellId) {
        assert.ok(pointToSegment(c.position, s.start, s.end) >= c.radius * 1.06 + s.radius - 1e-7, `${mode}: segment ${s.id} enters soma ${c.id}`);
      }
      for (const p of [s.start, s.end]) {
        if (sim.world.sphereRadius) assert.ok(Math.hypot(...p) <= sim.world.sphereRadius - s.radius + 1e-7);
        for (let i = 0; i < 3; i++) if (!(sim.world.planar && i === 1)) {
          assert.ok(p[i] >= sim.world.bounds.min[i] + s.radius - 1e-7 && p[i] <= sim.world.bounds.max[i] - s.radius + 1e-7);
        }
      }
    }
  }
});

test('cell-growth unrelated cell shafts retain finite-radius separation after turning', () => {
  const sim = createSimulation({ mode: 'culture', source: 'immature', cellCount: 8, seed: 314 });
  stepSimulation(sim, 36);
  const live = sim.segments.filter(s => s.alive), hash = new SpatialHash(16);
  for (const s of live) hash.insert(s.id, s.start, s.end, s.radius);
  for (const s of live) for (const id of hash.query(s.start, s.end, s.radius + 1.2)) {
    const other = sim.segments[id];
    if (!other.alive || other.id <= s.id || other.cellId === s.cellId) continue;
    const d = closestSegmentPoints(s.start, s.end, other.start, other.end).distance;
    assert.ok(d >= s.radius + other.radius - 1e-7, `segments ${s.id} and ${other.id}: gap ${d - s.radius - other.radius} µm`);
  }
});

test('cell-growth a reached segment budget stops time and remains explicitly flagged', () => {
  const sim = createSimulation({ ...controlled, actin: 3, maxSegments: 100 });
  stepSimulation(sim, 72);
  assert.equal(sim.limits.reached, true);
  assert.ok(sim.segments.length <= 100 && sim.timeHours < 72);
  assert.match(sim.limits.reason, /budget/i);
  const before = serializeSimulation(sim); stepSimulation(sim, 1);
  assert.deepEqual(serializeSimulation(sim), before);
});

test('cell-growth imported state rejects invalid geometry, topology, counters and versions', () => {
  const saved = serializeSimulation(grow({}, 1));
  const mutations = [
    s => { s.version = 'unrecognized'; },
    s => { s.segments[0].end[0] = null; },
    s => { s.segments[0].radius = -1; },
    s => { s.segments[0].parentId = 0; },
    s => { s.tips[0].segmentId = s.segments.length; },
    s => { s.cells[0].membrane.reserve = -1; },
    s => { s.world.bounds.min[0] = s.world.bounds.max[0] + 1; },
    s => { s.cells[0].membrane.vertices[0][0] = Infinity; },
    s => { s.config.dtHours = 0; },
    s => { s.counters.collisions = -1; },
    s => { s.tips[0].mt = -2; },
    s => { s.segments[0].mt = -2; },
    s => { s.tips[0].ageHours = -1; },
  ];
  for (const mutate of mutations) {
    const invalid = structuredClone(saved); mutate(invalid);
    assert.throws(() => restoreSimulation(invalid));
  }
});
