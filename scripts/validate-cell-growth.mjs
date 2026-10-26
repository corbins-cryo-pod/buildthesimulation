/** Quantitative numerical verification of the production Cell Growth Lab engine. */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  MODEL_VERSION, PRESETS, createSimulation, stepSimulation, getMetrics,
  serializeSimulation, restoreSimulation,
} from '../src/lib/cell-growth/engine.js';
import { signedObstacle } from '../src/lib/cell-growth/mechanics.js';
import { segmentSphereHit, segmentBoxHit, segmentCapsuleHit, closestSegmentPoints, SpatialHash } from '../src/lib/cell-growth/geometry.js';

const sourceFiles = ['src/lib/cell-growth/morphogenesis.js','src/lib/cell-growth/shaft-mechanics.js','src/lib/cell-growth/microscopy-render.js','src/lib/cell-growth/presentation.js','tests/cell-growth-morphogenesis.mjs','src/lib/cell-growth/engine.js', 'src/lib/cell-growth/behavior.js', 'tests/cell-growth-behavior.mjs', 'src/lib/cell-growth/geometry.js', 'src/lib/cell-growth/mechanics.js', 'src/lib/cell-growth/exploration.js', 'src/lib/cell-growth/render-geometry.js', 'tests/cell-growth-mechanics.mjs', 'tests/cell-growth.mjs', 'scripts/validate-cell-growth.mjs'];
const hashSources = async () => Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path,
  createHash('sha256').update(await readFile(new URL(`../${path}`, import.meta.url))).digest('hex')])));
const initialSourceSha256 = await hashSources();

const tolerance = {
  analyticGeometryUm: 1e-9,
  zeroDriverAddedLengthUm: 1e-7,
  deterministicLengthRelativeError: .05,
  refinementRoundoffAllowanceUm: 1e-8,
  playbackChunkPositionUm: 1e-7,
  playbackChunkRelativeLength: 1e-7,
};
const controlled = {
  mode: 'culture', source: 'immature', cellCount: 1, seed: 714,
  branching: 0, noise: 0, guidance: 0, selfAvoidance: 0, fasciculation: 0, growthPulses: 0,
};
const distance = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
const geometricLength = sim => sim.segments.filter(s => s.alive)
  .reduce((sum, s) => sum + distance(s.start, s.end), 0);
const checks = [], timings = [];
function run(id, config, hours, clearObstacles = false, clampedSomata = false) {
  const t = performance.now(), sim = createSimulation(config);
  if (clearObstacles) {
    sim.world.obstacles = [];
    if (sim.world.cue) sim.world.cue.strength = 0;
  }
  if(clampedSomata)for(const cell of sim.cells)cell.membrane.lastSolveHours=720;
  const initialLengthUm = geometricLength(sim);
  stepSimulation(sim, hours);
  const elapsedMs = performance.now() - t;
  timings.push({ id, elapsedMs, simulatedHours: hours, clampedSomata, cellCount: sim.cells.length, segmentCount: sim.segments.length });
  return { sim, initialLengthUm, finalLengthUm: geometricLength(sim), addedLengthUm: geometricLength(sim) - initialLengthUm, metrics: getMetrics(sim) };
}
const summary = r => ({ config: r.sim.config, initialLengthUm: r.initialLengthUm,
  finalLengthUm: r.finalLengthUm, addedLengthUm: r.addedLengthUm, metrics: r.metrics });
function pointToSegment(p, a, b) {
  const v = b.map((x, i) => x - a[i]), q = p.map((x, i) => x - a[i]);
  const norm = v.reduce((sum, x) => sum + x * x, 0);
  const t = norm ? Math.max(0, Math.min(1, q.reduce((sum, x, i) => sum + x * v[i], 0) / norm)) : 0;
  return Math.hypot(...p.map((x, i) => x - a[i] - t * v[i]));
}
function entersBox(s, box) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 3; i++) {
    const min = box.position[i] - box.size[i] / 2 - s.radius + 1e-7;
    const max = box.position[i] + box.size[i] / 2 + s.radius - 1e-7;
    const velocity = s.end[i] - s.start[i];
    if (Math.abs(velocity) < 1e-14) { if (s.start[i] < min || s.start[i] > max) return false; }
    else {
      const a = (min - s.start[i]) / velocity, b = (max - s.start[i]) / velocity;
      lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b));
      if (lo > hi) return false;
    }
  }
  return hi >= lo;
}
function auditGeometry(sim) {
  const live = sim.segments.filter(s => s.alive), hash = new SpatialHash(16);
  const result = { liveSegments: live.length, solidPenetrations: 0, somaPenetrations: 0, boundaryViolations: 0,
    unrelatedShaftPenetrations: 0, coneSolidPenetrations: 0, coneSomaPenetrations: 0, coneShaftPenetrations: 0, coneConePenetrations: 0, shaftPairsChecked: 0, maximumMembraneBudgetResidualUm2: 0 };
  for (const s of live) hash.insert(s.id, s.start, s.end, s.radius);
  for (const s of live) {
    for (const o of sim.world.obstacles) {
      if (o.shape === 'sphere' ? pointToSegment(o.position, s.start, s.end) < o.radius + s.radius - 1e-7 : entersBox(s, o)) result.solidPenetrations++;
    }
    for (const c of sim.cells) if (c.id !== s.cellId && pointToSegment(c.position, s.start, s.end) < (c.mechanics?.collisionRadius??c.radius*1.06) + s.radius - 1e-7) result.somaPenetrations++;
    for (const p of [s.start, s.end]) {
      if (sim.world.sphereRadius && Math.hypot(...p) > sim.world.sphereRadius - s.radius + 1e-7) result.boundaryViolations++;
      for (let i = 0; i < 3; i++) if (!(sim.world.planar && i === 1) && (p[i] < sim.world.bounds.min[i] + s.radius - 1e-7 || p[i] > sim.world.bounds.max[i] - s.radius + 1e-7)) result.boundaryViolations++;
    }
    for (const id of hash.query(s.start, s.end, s.radius + 1.2)) {
      const b = sim.segments[id]; if (!b.alive || b.id <= s.id || b.cellId === s.cellId) continue;
      result.shaftPairsChecked++;
      if (closestSegmentPoints(s.start, s.end, b.start, b.end).distance < s.radius + b.radius - 1e-7) result.unrelatedShaftPenetrations++;
    }
  }
  const tips=sim.tips.filter(t=>t.active);
  for(const t of tips){
    const p=sim.segments[t.segmentId].end;
    for(const o of sim.world.obstacles)if(signedObstacle(p,o).gap<t.radius-1e-7)result.coneSolidPenetrations++;
    for(const c of sim.cells)if(c.id!==t.cellId&&distance(p,c.position)<c.mechanics.collisionRadius+t.radius-1e-7)result.coneSomaPenetrations++;
    for(const id of hash.query(p,p,t.radius+1.2)){const n=sim.segments[id];if(n.alive&&n.cellId!==t.cellId&&pointToSegment(p,n.start,n.end)<t.radius+n.radius-1e-7)result.coneShaftPenetrations++;}
    for(const other of tips)if(other.id>t.id&&other.cellId!==t.cellId&&distance(p,sim.segments[other.segmentId].end)<t.radius+other.radius-1e-7)result.coneConePenetrations++;
  }
  for (const c of sim.cells) {
    const m = c.membrane;
    result.maximumMembraneBudgetResidualUm2 = Math.max(result.maximumMembraneBudgetResidualUm2,
      Math.abs(m.reserve * m.reserveCapacity - m.reserveCapacity - m.suppliedArea - m.recycledArea + m.usedArea));
  }
  return result;
}

// Analytic entry positions derive directly from sphere/cylinder radii and box planes.
const sphere = segmentSphereHit([-100, 0, 0], [100, 0, 0], [0, 0, 0], 1);
const box = segmentBoxHit([-100, 0, 0], [100, 0, 0], [0, 0, 0], [.1, 8, 8], .5);
const capsule = segmentCapsuleHit([-10, 5.6, 0], [10, 5.6, 0], [0, -5, 0], [0, 5, 0], 1);
const analyticGeometry = [
  { geometry: 'sphere crossing', expectedXUm: -1, actualXUm: sphere?.point[0] ?? null },
  { geometry: '0.1 µm box with 0.5 µm clearance', expectedXUm: -.55, actualXUm: box?.point[0] ?? null },
  { geometry: 'finite capsule end cap', expectedXUm: -.8, actualXUm: capsule?.point[0] ?? null },
].map(row => ({ ...row, absoluteErrorUm: row.actualXUm === null ? null : Math.abs(row.actualXUm - row.expectedXUm) }));
checks.push({ id: 'analytic-swept-collision', passed: analyticGeometry.every(r => r.absoluteErrorUm !== null && r.absoluteErrorUm <= tolerance.analyticGeometryUm) });

const baseline = run('positive-driver', controlled, 8, true, true);
checks.push({ id: 'positive-driver-extension', passed: baseline.addedLengthUm > 1 });
const blocked = [
  ['zero-actin', { actin: 0 }],
  ['zero-microtubules', { microtubules: 0 }],
].map(([id, override]) => ({ id, ...summary(run(id, { ...controlled, ...override }, 8, true, true)) }));
for (const result of blocked) checks.push({ id: result.id, passed: result.addedLengthUm <= tolerance.zeroDriverAddedLengthUm });

const refinement = [.05, .025, .0125].map(dtHours => {
  const r = run(`dt-${dtHours}`, { ...controlled, dtHours }, 4, true);
  return { dtHours, finalLengthUm: r.finalLengthUm, axonLengthUm: r.metrics.totalAxonLength, dendriteLengthUm: r.metrics.totalDendriteLength };
});
const coarseErrorUm = Math.abs(refinement[0].finalLengthUm - refinement[2].finalLengthUm);
const fineErrorUm = Math.abs(refinement[1].finalLengthUm - refinement[2].finalLengthUm);
const relativeError = coarseErrorUm / Math.max(1e-12, refinement[2].finalLengthUm);
checks.push({ id: 'deterministic-timestep-refinement', passed: relativeError <= tolerance.deterministicLengthRelativeError && fineErrorUm <= coarseErrorUm + tolerance.refinementRoundoffAllowanceUm });

const membraneCases = [0, 1].map(membraneSupply => ({ membraneSupply,
  ...summary(run(`membrane-supply-${membraneSupply}`, { ...controlled, membraneSupply }, 24, true)) }));
checks.push({ id: 'finite-membrane-supply-control', passed: membraneCases[1].addedLengthUm > membraneCases[0].addedLengthUm + 1 });
const exhausted = run('zero-supply-zero-tension-area-budget', { ...controlled, actin: 3, tension: 0, membraneSupply: 0 }, 48, true);
const material = exhausted.sim.cells[0].membrane;
const membraneBudget = { conditions: exhausted.sim.config, durationHours: 48, reserveCapacityUm2: material.reserveCapacity,
  suppliedAreaUm2: material.suppliedArea, recycledAreaUm2: material.recycledArea, usedAreaUm2: material.usedArea,
  finalReserve: material.reserve, residualUm2: material.reserve * material.reserveCapacity - material.reserveCapacity - material.suppliedArea - material.recycledArea + material.usedArea };
checks.push({ id: 'zero-supply-zero-tension-material-conservation', passed: Math.abs(membraneBudget.residualUm2) < 1e-7 && material.suppliedArea === 0 && material.usedArea <= material.reserveCapacity + material.recycledArea + 1e-7 && material.reserve < .1 });

const seededA = run('seeded-replay-a', { ...controlled, cellCount: 3, noise: .35, branching: 1 }, 8, true);
const seededB = run('seeded-replay-b', { ...controlled, cellCount: 3, noise: .35, branching: 1 }, 8, true);
checks.push({ id: 'same-seed-replay', passed: JSON.stringify(serializeSimulation(seededA.sim)) === JSON.stringify(serializeSimulation(seededB.sim)) });
const resumed = restoreSimulation(JSON.stringify(serializeSimulation(seededA.sim)));
stepSimulation(seededA.sim, 2);
stepSimulation(resumed, 2);
checks.push({ id: 'save-resume-random-state', passed: JSON.stringify(serializeSimulation(seededA.sim)) === JSON.stringify(serializeSimulation(resumed)) });

const chunkConfig = { cellCount: 4, seed: 714 };
function chunkRun(chunkHours) {
  const sim = createSimulation(chunkConfig);
  for (let i = 0; i < Math.round(24 / chunkHours); i++) stepSimulation(sim, chunkHours);
  return sim;
}
const chunkReference = chunkRun(24), chunkReferenceMetrics = getMetrics(chunkReference);
const playbackChunks = [.1, .5, 1].map(chunkHours => {
  const sim = chunkRun(chunkHours), metrics = getMetrics(sim);
  let maximumEndpointDifferenceUm = 0;
  const sameSegmentCount = sim.segments.length === chunkReference.segments.length;
  if (sameSegmentCount) for (let i = 0; i < sim.segments.length; i++) maximumEndpointDifferenceUm = Math.max(maximumEndpointDifferenceUm, distance(sim.segments[i].end, chunkReference.segments[i].end));
  const relativeLengthError = Math.abs(metrics.totalLength - chunkReferenceMetrics.totalLength) / chunkReferenceMetrics.totalLength;
  return { chunkHours, calls: Math.round(24 / chunkHours), simulatedHours: sim.timeHours, steps: sim.stepCount,
    segments: sim.segments.length, branches: metrics.branches, relativeLengthError,
    maximumEndpointDifferenceUm: sameSegmentCount ? maximumEndpointDifferenceUm : null,
    passed: sameSegmentCount && metrics.branches === chunkReferenceMetrics.branches && metrics.contacts === chunkReferenceMetrics.contacts && sim.stepCount === chunkReference.stepCount && relativeLengthError < tolerance.playbackChunkRelativeLength && maximumEndpointDifferenceUm < tolerance.playbackChunkPositionUm };
});
checks.push({ id: 'playback-chunk-invariance', passed: playbackChunks.every(c => c.passed) });

// Synthetic controlled apposition isolates the geometric dwell classifier.
const contactSim = createSimulation({ ...controlled, cellCount: 2, actin: 3, tension: 0 });
for (const tip of contactSim.tips) tip.active = false;
for (const segment of contactSim.segments) segment.alive = false;
const contactAxon = contactSim.segments[0], contactDendrite = contactSim.segments.find(s => s.cellId === 1), cone = contactSim.tips[0];
Object.assign(contactAxon, { start: [-3, 0, 0], end: [-1.05, 0, 0], radius: .5, kind: 'axon', alive: true });
Object.assign(contactDendrite, { start: [0, 0, -10], end: [0, 0, 10], radius: .5, kind: 'dendrite', alive: true });
Object.assign(cone, { active: true, kind: 'axon', direction: [1, 0, 0], mt: 1 });
for (const [i, cell] of contactSim.cells.entries()) {
  cell.ageHours = 20; cell.position = [i ? 100 : -100, 0, 0]; cell.axonRootId = i ? contactDendrite.id : contactAxon.id; cell.membrane.lastSolveHours = 100;
}
contactSim.world.obstacles = [];
const advanceContact = () => { cone.direction = [1, 0, 0]; stepSimulation(contactSim, .05); };
for (let i = 0; i < 5; i++) advanceContact();
const beforeThreshold = getMetrics(contactSim).contacts;
advanceContact();
const atThreshold = getMetrics(contactSim).contacts, dwellHours = contactSim.contacts[0]?.dwellHours ?? null;
contactDendrite.start[0] = contactDendrite.end[0] = 100;
advanceContact();
const contactClassification = { beforeThreshold, atThreshold, dwellHours, afterSeparation: getMetrics(contactSim).contacts,
  statusAfterSeparation: contactSim.contacts[0]?.status ?? null,
  interpretation: 'Synthetic continuously driven apposition fixture verifies the 0.3 h model threshold and loss on separation; no functional synapse is demonstrated.' };
checks.push({ id: 'candidate-apposition-threshold-and-loss', passed: beforeThreshold === 0 && atThreshold === 1 && Math.abs(dwellHours - .3) < 1e-9 && contactClassification.afterSeparation === 0 && contactClassification.statusAfterSeparation === 'lost' });

const environments = PRESETS.map(preset => {
  const mode = preset.id;
  const r = run(`environment-${mode}-72h`, { ...preset.config, seed: 314 }, 72);
  const finite = r.sim.segments.every(s => s.start.every(Number.isFinite) && s.end.every(Number.isFinite) && Number.isFinite(s.radius) && s.radius > 0);
  const lengthReconstructionErrorUm = Math.abs(r.finalLengthUm - r.metrics.totalLength);
  const geometryAudit = auditGeometry(r.sim);
  console.log(`${mode}: ${r.sim.timeHours.toFixed(2)} h; ${r.sim.segments.length} segments; solid/soma/shaft penetrations ${geometryAudit.solidPenetrations}/${geometryAudit.somaPenetrations}/${geometryAudit.unrelatedShaftPenetrations}${r.sim.limits.reached ? '; explicit budget stop' : ''}`);
  return { mode, ...summary(r), requestedHours: 72, simulatedHours: r.sim.timeHours, finite, lengthReconstructionErrorUm, geometryAudit, limits: r.sim.limits };
});
checks.push({ id: 'four-environment-finite-state', passed: environments.every(r => r.finite && r.lengthReconstructionErrorUm < 1e-7) });
checks.push({ id: '72h-presets-complete-or-explicitly-capped', passed: environments.every(r => Math.abs(r.simulatedHours - 72) < 1e-7 || (r.simulatedHours < 72 && r.limits.reached && r.metrics.totalSegments <= r.config.maxSegments)) });
checks.push({ id: 'full-tree-solid-soma-boundary-separation', passed: environments.every(r => r.geometryAudit.solidPenetrations === 0 && r.geometryAudit.somaPenetrations === 0 && r.geometryAudit.boundaryViolations === 0) });
checks.push({ id: 'full-tree-unrelated-shaft-separation', passed: environments.every(r => r.geometryAudit.unrelatedShaftPenetrations === 0) });
checks.push({ id: 'growth-cone-envelope-separation', passed: environments.every(r => ['coneSolidPenetrations','coneSomaPenetrations','coneShaftPenetrations','coneConePenetrations'].every(key=>r.geometryAudit[key]===0)) });
checks.push({ id: 'four-environment-membrane-budget', passed: environments.every(r => r.geometryAudit.maximumMembraneBudgetResidualUm2 < 1e-6) });

// Independent seeds characterize model variability; they are not biological confidence intervals.
const seeds = [101, 202, 303, 404, 505];
const interventions = [
  { id: 'baseline', override: {} }, { id: 'no-actin', override: { actin: 0 } },
  { id: 'no-microtubules', override: { microtubules: 0 } },
  { id: 'no-membrane-supply', override: { membraneSupply: 0 } },
  { id: 'high-membrane-tension', override: { tension: 3 } },
  { id: 'no-branching', override: { branching: 0 } },
];
const interventionCases = interventions.map(intervention => ({ ...intervention, cases: seeds.map(seed => {
  const r = run(`ensemble-${intervention.id}-${seed}`, { mode: 'culture', source: 'immature', cellCount: 4, seed, ...intervention.override }, 24, false, true);
  return { seed, initialLengthUm: r.initialLengthUm, finalLengthUm: r.finalLengthUm, addedLengthUm: r.addedLengthUm,
    totalAxonLengthUm: r.metrics.totalAxonLength, totalDendriteLengthUm: r.metrics.totalDendriteLength,
    branches: r.metrics.branches, contacts: r.metrics.contacts, collisionEvents: r.metrics.collisionEvents, retractionSteps: r.metrics.retractionSteps };
}) }));
const ensemble = interventionCases[0].cases;
const mean = values => values.reduce((a, b) => a + b, 0) / values.length;
const ensembleSummary = Object.fromEntries(['finalLengthUm', 'totalAxonLengthUm', 'totalDendriteLengthUm', 'branches', 'contacts'].map(key => {
  const values = ensemble.map(row => row[key]);
  return [key, { mean: mean(values), min: Math.min(...values), max: Math.max(...values) }];
}));

checks.push({ id: 'five-seed-zero-actin', passed: interventionCases.find(r => r.id === 'no-actin').cases.every(r => r.addedLengthUm <= 1e-7) });
checks.push({ id: 'five-seed-zero-microtubules', passed: interventionCases.find(r => r.id === 'no-microtubules').cases.every(r => r.addedLengthUm <= 1e-7) });
checks.push({ id: 'five-seed-no-branching', passed: interventionCases.find(r => r.id === 'no-branching').cases.every(r => r.branches === 0) && ensemble.some(r => r.branches > 0) });
const sourceSha256 = await hashSources();
const sourceUnchangedDuringRun = JSON.stringify(sourceSha256) === JSON.stringify(initialSourceSha256);
checks.push({ id: 'source-unchanged-during-verification', passed: sourceUnchangedDuringRun });
const report = {
  schema: 'cell-growth-verification/2', modelVersion: MODEL_VERSION,
  generator: 'node scripts/validate-cell-growth.mjs', runtime: process.version,
  scope: 'Numerical and causal verification of an exploratory coarse-grained model; not an empirical fit or validation of human cell development.',
  empiricalCalibration: false, functionalConnectivityValidated: false,
  sourceSha256, sourceUnchangedDuringRun, acceptance: tolerance, checks, allAcceptancePassed: checks.every(c => c.passed),
  analyticGeometry, positiveDriver: summary(baseline), blockedDrivers: blocked,
  timestepRefinement: { conditions: controlled, durationHours: 4, cases: refinement, coarseErrorUm, fineErrorUm, relativeError,
    interpretation: 'Deterministic uncrowded continuous-growth test. Does not establish convergence of individual stochastic branching trajectories or every collision event.' },
  membraneCases, membraneBudget, playback: { configuration: chunkConfig, referenceHours: 24, cases: playbackChunks }, contactClassification,
  environments, ensemble: { seeds, durationHours: 24, cellCount: 4, cases: ensemble, summary: ensembleSummary,
    interpretation: 'Seed-to-seed variation inside this model, not a biological or clinical confidence interval.' },
  interventions: { durationHours: 24, cellCount: 4, seeds, cases: interventionCases,
    interpretation: 'Matched initial seeds and clamped soma surfaces isolate growth-cone interventions from elastic root stretching. Event streams may diverge after interventions; these are model causal controls, not biological effect estimates.' },
  performance: { scope: 'Actual Node engine wall time excluding browser rendering, page load and network. Hardware dependent.', measurements: timings },
  knownLimits: [
    'Human differentiation timing, growth velocities and model force parameters have not been fitted to a specified cell protocol.',
    'Organoid mode samples neurons in a constrained volume; it does not reproduce full organogenesis, cell proliferation or tissue metabolism.',
    'Persistent candidate contacts are not demonstrated functional synapses.',
    'Myelination and detailed electrophysiology are outside this release.',
  ],
};
await writeFile(new URL('../src/data/cell-growth-validation.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ modelVersion: MODEL_VERSION, checks, allAcceptancePassed: report.allAcceptancePassed, timestepRefinement: report.timestepRefinement,
  ensembleSummary, maximumRunWallTimeMs: Math.max(...timings.map(t => t.elapsedMs)) }, null, 2));
if (!report.allAcceptancePassed) process.exitCode = 1;
