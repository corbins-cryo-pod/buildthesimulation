/** Research-only extension of the original unresolved convergence experiment.
 * Criteria are predeclared in docs/cortex/TARGETED_REFINEMENT.md.
 * No public configuration/schema, solver equation, or original report changes.
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir, cpus } from 'node:os';
import { join } from 'node:path';
import { freshActiveConfig } from '../src/lib/cortex/config.js';
import { makeWorld } from '../src/lib/cortex/world.js';
import { activeModelData, makeActiveMorphology } from '../src/lib/cortex/active-morphology.js';
import { createActiveCable, stepActiveCable } from '../src/lib/cortex/active-cable.js';
import { CHANNELS } from '../src/lib/cortex/active-channels.js';
import { runExperiment, windowAverage, biphasicAverage } from '../src/lib/cortex/experiment.js';
import { pointTransferUvPerNa, leadField, distance } from '../src/lib/cortex/volume-conductor.js';

const ROOT = new URL('../', import.meta.url);
const path = (p) => new URL(p, ROOT);
const sha = (data) => createHash('sha256').update(data).digest('hex');
const fileSha = (p) => sha(readFileSync(path(p)));
const limits = Object.freeze({ endpointUm: 1e-9, invariantRelative: 1e-10,
  thresholdRelativeWidth: 0.01, thresholdEnvelopeRelative: 0.02,
  eventTimeMs: 0.1, voltageRmsMv: 1, voltageMaximumMv: 5,
  neuralNormalizedRms: 0.05, neuralPeakFloorUv: 0.01,
  artifactMaximumUv: 1e-7, currentResidualNa: 1e-8 });
const matrix = [[40, .00125], [20, .00125], [10, .00125], [5, .00125],
  [10, .000625], [5, .000625], [2.5, .000625]];
const sourceFiles = ['scripts/cortex-targeted-refinement-study.mjs',
  'scripts/cortex-active-model.py', 'src/lib/cortex/active-cable.js',
  'src/lib/cortex/active-channels.js', 'src/lib/cortex/active-morphology.js',
  'src/lib/cortex/volume-conductor.js', 'src/lib/cortex/models/allen571654895.json'];
const report = { schemaVersion: 'cortex-targeted-refinement/1', status: 'running',
  generatedAt: new Date().toISOString(),
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim(),
  runtime: { node: process.version, cpu: cpus()[0].model },
  sourceHashes: Object.fromEntries(sourceFiles.map((p) => [p, fileSha(p)])),
  criteriaSha256: fileSha('docs/cortex/TARGETED_REFINEMENT.md'), limits,
  scope: 'Research-only mesh/timestep extension. Legacy -25 mV crossings; not a biological AP or population-selectivity certification.',
  matrix: matrix.map(([meshUm, dtMs]) => ({ meshUm, dtMs })),
  geometryInvariants: [], fixedCases: [], thresholds: [], comparisons: [], thresholdComparisons: [] };
const output = path('docs/cortex/benchmarks/targeted-refinement-latest.json');
const write = () => writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
const started = performance.now();
write();

function nativeMeshes() {
  if (process.env.CORTEX_RESEARCH_MESHES) {
    const raw = readFileSync(process.env.CORTEX_RESEARCH_MESHES);
    return { ...JSON.parse(raw), fileSha256: sha(raw) };
  }
  if (!process.env.CORTEX_REFERENCE_PYTHON || !process.env.CORTEX_ACTIVE_MECHANISM_LIBRARY)
    throw new Error('Provide pinned CORTEX_REFERENCE_PYTHON and CORTEX_ACTIVE_MECHANISM_LIBRARY, or CORTEX_RESEARCH_MESHES.');
  const dir = mkdtempSync(join(tmpdir(), 'cortex-research-meshes-'));
  const target = join(dir, 'meshes.json');
  const script = String.raw`
import hashlib, importlib.util, importlib.metadata as metadata, json, os, sys
from pathlib import Path
root=Path.cwd()
spec=importlib.util.spec_from_file_location('model',root/'scripts/cortex-active-model.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);m.load_mechanisms()
variants={}
for size in [5,2.5]:
    sections,soma,stub,center=m.make_cell(size)
    variants[str(size)]=m.discretize(sections,soma,center)[0]
versions={}
for line in (root/'scripts/cortex-reference-requirements.txt').read_text().splitlines():
    if '==' in line:
        name,expected=line.split('==');actual=metadata.version(name)
        if expected!=actual:raise RuntimeError(f'Version mismatch {name}: {actual} != {expected}')
        versions[name]=actual
generator={'python':sys.version,'neuronBuild':m.h.nrnversion(),'versions':versions,
 'modelGeneratorSha256':m.sha(root/'scripts/cortex-active-model.py'),
 'mechanismLibrarySha256':m.sha(os.environ['CORTEX_ACTIVE_MECHANISM_LIBRARY']),
 'sourceHashes':{p.name:m.sha(p) for p in [m.ASSETS/'571654895.swc',m.ASSETS/'optim_param_571654895.json',*[m.KINETICS/f'{x}.mod' for x in m.MECHANISMS]]}}
Path(sys.argv[1]).write_text(json.dumps({'generator':generator,'variants':variants},separators=(',',':'))+'\n')
`;
  try {
    execFileSync(process.env.CORTEX_REFERENCE_PYTHON, ['-c', script, target], { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });
    const raw = readFileSync(target);
    return { ...JSON.parse(raw), fileSha256: sha(raw) };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const native = nativeMeshes();
report.nativeMeshProvenance = { fileSha256: native.fileSha256, generator: native.generator };
// This process-only adapter adds raw native geometries to the exact production
// transform, never serializes the additions into the public model asset, and
// never sends unsupported resolutions through the website configuration schema.
for (const [key, nodes] of Object.entries(native.variants)) activeModelData.variants[key] = nodes;

function config(mesh, dt, kind, amplitude = 19) {
  const c = freshActiveConfig();
  c.neuron.segmentLengthUm = mesh;
  Object.assign(c.solver, { dtMs: dt, durationMs: 20, sampleMs: .05 });
  if (kind !== 'intracellular') {
    Object.assign(c.protocol, { mode: 'extracellular-stimulation',
      sourceContactIds: ['r4-c4', 'r4-c5'], amplitudeUa: amplitude });
    c.recording.contactIds = ['r3-c3', 'r3-c6'];
    if (kind === 'moved-soma') {
      Object.assign(c.protocol, { amplitudeUa: 40, phaseUs: 1000 });
      c.implant.translationUm = [100, -50, 0];
    }
  }
  return c;
}
const nodesByMesh = new Map();
const physical = (mesh) => {
  if (!nodesByMesh.has(mesh)) nodesByMesh.set(mesh, makeActiveMorphology(config(mesh, .00125, 'local')).nodes);
  return nodesByMesh.get(mesh);
};
function sectionInvariants(nodes) {
  const cable = createActiveCable(nodes, activeModelData.fit), sections = {};
  nodes.forEach((n, i) => {
    if (!n.areaUm2) return;
    let parent = n.parent;
    while (parent >= 0 && nodes[parent].sectionId === n.sectionId) parent = nodes[parent].parent;
    const s = sections[n.sectionId] ??= { parentSectionId: parent < 0 ? null : nodes[parent].sectionId,
      startUm: n.startUm, endUm: n.endUm, areaUm2: 0, lengthUm: 0,
      capacitanceNf: 0, leakUs: 0, channelUs: Array(9).fill(0) };
    s.endUm = n.endUm; s.areaUm2 += n.areaUm2; s.lengthUm += n.lengthUm;
    s.capacitanceNf += cable.capacitanceNf[i]; s.leakUs += cable.leakUs[i];
    CHANNELS.forEach((_, j) => s.channelUs[j] += cable.density[j][i]);
  });
  return sections;
}
const baseSections = sectionInvariants(physical(40));
for (const mesh of [...new Set(matrix.map(([m]) => m))]) {
  const sections = sectionInvariants(physical(mesh));
  let maxRelativeIntegralDifference = 0, maxEndpointDifferenceUm = 0;
  let topologyMatches = JSON.stringify(Object.keys(sections)) === JSON.stringify(Object.keys(baseSections));
  for (const [key, s] of Object.entries(sections)) {
    const b = baseSections[key];
    topologyMatches &&= s.parentSectionId === b.parentSectionId;
    maxEndpointDifferenceUm = Math.max(maxEndpointDifferenceUm, distance(s.startUm, b.startUm), distance(s.endUm, b.endUm));
    const a = [s.areaUm2, s.lengthUm, s.capacitanceNf, s.leakUs, ...s.channelUs];
    const v = [b.areaUm2, b.lengthUm, b.capacitanceNf, b.leakUs, ...b.channelUs];
    a.forEach((x, i) => maxRelativeIntegralDifference = Math.max(maxRelativeIntegralDifference, Math.abs(x - v[i]) / Math.max(Math.abs(x), Math.abs(v[i]), 1e-30)));
  }
  const pass = topologyMatches && maxRelativeIntegralDifference <= limits.invariantRelative && maxEndpointDifferenceUm <= limits.endpointUm;
  report.geometryInvariants.push({ meshUm: mesh, nodes: physical(mesh).length,
    membraneNodes: physical(mesh).filter((n) => n.areaUm2).length,
    topologyMatches, maxRelativeIntegralDifference, maxEndpointDifferenceUm, pass });
  if (!pass) throw new Error(`Geometry invariants failed for ${mesh} µm`);
}
const probeSections = ['soma[0]', 'axon_stub[0]', 'apic[8]', 'dend[11]'];
const fields = ['voltageMv', 'previous', 'membraneCurrentNa', 'ionicNa', 'potassiumNa',
  'calciumNa', 'hcnNa', 'leakNa', 'capacitiveNa', 'gates', 'sodium', 'calciumMm'];
const cache = new Map();
function run(c, thresholdOnly = false) {
  const begin = performance.now(), mesh = c.neuron.segmentLengthUm, dt = c.solver.dtMs;
  // Valid public configuration supplies the identical physical contact geometry;
  // research-only morphology and dt are used exclusively by the compact kernel.
  const template = structuredClone(c);
  template.neuron.segmentLengthUm = 40; template.solver.dtMs = .00125;
  const world = makeWorld(template), nodes = physical(mesh), n = nodes.length;
  const cable = createActiveCable(nodes, activeModelData.fit);
  const key = `${mesh}:${dt}`, saved = cache.get(key);
  if (saved) fields.forEach((f) => cable[f].set(saved[f]));
  else {
    for (let k = 0; k < Math.round(100 / dt); k++) stepActiveCable(cable, dt);
    cache.set(key, Object.fromEntries(fields.map((f) => [f, cable[f].slice()])));
  }
  const sources = c.protocol.sourceContactIds.map((id) => world.contacts.find((s) => s.id === id));
  const sites = c.recording.contactIds.map((id) => world.contacts.find((s) => s.id === id));
  const sigma = c.tissue.conductivitySPerM, isStim = c.protocol.mode === 'extracellular-stimulation';
  const unit = nodes.map((node) => pointTransferUvPerNa(node.centerUm, sources[0].positionUm, sigma) - pointTransferUvPerNa(node.centerUm, sources[1].positionUm, sigma));
  const bath = nodes.map((node) => pointTransferUvPerNa(node.centerUm, c.protocol.bathReturnUm, sigma) / 1000);
  const lead = leadField(nodes, sites, sigma, c.recording.sourceModel, c.recording.exclusionUm);
  if (isStim) leadField(nodes, sources, sigma, 'point', c.recording.exclusionUm);
  const artifact = sites.map((site) => 1000 * (pointTransferUvPerNa(site.positionUm, sources[0].positionUm, sigma) - pointTransferUvPerNa(site.positionUm, sources[1].positionUm, sigma)));
  const bathArtifact = sites.map((site) => pointTransferUvPerNa(site.positionUm, c.protocol.bathReturnUm, sigma));
  const probes = probeSections.map((sectionId) => {
    const i = nodes.findIndex((node) => node.areaUm2 && node.sectionId === sectionId && Math.abs(node.sectionX - .5) < 1e-10);
    if (i < 0) throw new Error(`Missing fixed midpoint ${sectionId}`);
    return { sectionId, sectionX: .5, centerUm: nodes[i].centerUm, index: i, voltageMv: [cable.voltageMv[i]] };
  });
  const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  const neuralUv = lead.map((l) => [dot(l, cable.membraneCurrentNa)]), appliedUv = [[0], [0]];
  const firstTimes = new Float64Array(n).fill(NaN), spikes = [], timeMs = [0];
  const injectionNa = new Float64Array(n), extracellularMv = new Float64Array(n), axial = new Float64Array(n);
  let peakSomaMv = cable.voltageMv[0], maxKclResidualNa = 0, maxConservationResidualNa = 0;
  const duration = thresholdOnly ? 15 : 20, steps = Math.round(duration / dt), stride = Math.round(.05 / dt);
  let first = null;
  for (let k = 0; k < steps; k++) {
    const t = k * dt;
    const drive = isStim ? c.protocol.amplitudeUa * biphasicAverage(t, dt, c.protocol) : 0;
    const inject = isStim ? 0 : c.protocol.injectionNa * windowAverage(t, dt, c.protocol.startMs, c.protocol.durationMs);
    injectionNa[0] = inject;
    for (let i = 0; i < n; i++) extracellularMv[i] = unit[i] * drive - bath[i] * inject;
    stepActiveCable(cable, dt, { extracellularMv, injectionNa });
    peakSomaMv = Math.max(peakSomaMv, cable.voltageMv[0]);
    for (let i = 0; i < n; i++) if (nodes[i].areaUm2 && cable.previous[i] < -25 && cable.voltageMv[i] >= -25) {
      const time = t + dt * (-25 - cable.previous[i]) / (cable.voltageMv[i] - cable.previous[i]);
      if (Number.isNaN(firstTimes[i])) firstTimes[i] = time;
      if (!first || time < first.timeMs) first = { timeMs: time, compartmentId: nodes[i].id, sectionId: nodes[i].sectionId, sectionX: nodes[i].sectionX, centerUm: nodes[i].centerUm };
      if (i === 0 && (!spikes.length || time - spikes.at(-1) >= 2)) spikes.push(time);
    }
    maxConservationResidualNa = Math.max(maxConservationResidualNa, Math.abs(cable.membraneCurrentNa.reduce((s, x) => s + x, 0) - inject));
    axial.fill(0);
    for (let i = 0; i < n; i++) if (nodes[i].parent >= 0) {
      const p = nodes[i].parent;
      const flux = cable.edgeUs[i] * (cable.voltageMv[p] + extracellularMv[p] - cable.voltageMv[i] - extracellularMv[i]);
      axial[i] += flux; axial[p] -= flux;
    }
    for (let i = 0; i < n; i++) maxKclResidualNa = Math.max(maxKclResidualNa, Math.abs(cable.membraneCurrentNa[i] - axial[i] - injectionNa[i]));
    if (!thresholdOnly && (k + 1) % stride === 0) {
      timeMs.push((k + 1) * dt);
      probes.forEach((p) => p.voltageMv.push(cable.voltageMv[p.index]));
      lead.forEach((l, ch) => { neuralUv[ch].push(dot(l, cable.membraneCurrentNa)); appliedUv[ch].push(artifact[ch] * drive - bathArtifact[ch] * inject); });
    }
    // Threshold-only trials measure the existence of this one event by15ms.
    // Once observed, later trajectory cannot change that classification.
    if (thresholdOnly && first) break;
  }
  return { config: c, elapsedMs: performance.now() - begin, conditioning: saved ? 'reused' : 'computed',
    anyLocalCrossing: Boolean(first), firstLocalCrossing: first, somaCrossingTimesMs: spikes,
    peakSomaMv, maxKclResidualNa, maxConservationResidualNa,
    currentAccountingPass: maxKclResidualNa <= limits.currentResidualNa && maxConservationResidualNa <= limits.currentResidualNa,
    timeMs, probes, neuralUv, appliedUv };
}
const compact = (r) => {
  const { timeMs, probes, neuralUv, appliedUv, ...rest } = r;
  return { ...rest, frames: timeMs.length,
    probes: probes.map(({ voltageMv, index, ...p }) => ({ ...p, initialMv: voltageMv[0], peakMv: Math.max(...voltageMv), minimumMv: Math.min(...voltageMv), finalMv: voltageMv.at(-1) })) };
};
function errors(a, b) {
  if (a.length !== b.length) throw new Error('Comparison sample counts differ');
  let square = 0, maximum = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; square += d * d; maximum = Math.max(maximum, Math.abs(d)); }
  return { rms: Math.sqrt(square / a.length), maximum };
}

// Exact match proves the compact harness did not silently change conditioning,
// pulse forcing, sign conventions, interpolation, recording, or sample times.
const verificationConfig = config(40, .00125, 'local', 19);
const compactCheck = run(verificationConfig), production = runExperiment(verificationConfig);
const sourceNodes = physical(40), count = sourceNodes.length;
const probeErrors = compactCheck.probes.map((p) => ({ sectionId: p.sectionId, ...errors(p.voltageMv, Array.from(production.timeMs, (_, k) => production.membraneMv[k * count + p.index])) }));
const neuralErrors = compactCheck.neuralUv.map((v, i) => errors(v, production.neuralUv[i]));
const appliedErrors = compactCheck.appliedUv.map((v, i) => errors(v, production.appliedUv[i]));
const timingError = errors(compactCheck.timeMs, production.timeMs);
const somaMatches = JSON.stringify(compactCheck.somaCrossingTimesMs) === JSON.stringify(production.spikes.map((s) => s.timeMs));
report.harnessProductionCheck = { config: verificationConfig, probeErrors, neuralErrors, appliedErrors,
  timingError, somaMatches, pass: [...probeErrors, ...neuralErrors, ...appliedErrors].every((e) => e.maximum < 1e-10) && timingError.maximum < 1e-10 && somaMatches };
if (!report.harnessProductionCheck.pass) throw new Error('Compact research harness differs from production');
write();
const retained = new Map();
function retain(kind, mesh, dt, existing) {
  const id = `${kind}-${mesh}um-${dt}ms`, result = existing ?? run(config(mesh, dt, kind));
  result.id = id; retained.set(id, result); report.fixedCases.push({ id, kind, ...compact(result) });
  console.log(`${id}: local=${result.anyLocalCrossing}, soma crossings=${result.somaCrossingTimesMs.length}, ${(result.elapsedMs / 1000).toFixed(1)} s`);
  write();
}
for (const [mesh, dt] of matrix) {
  retain('local', mesh, dt, mesh === 40 ? compactCheck : undefined);
  if ([10, 5].includes(mesh)) for (const kind of ['intracellular', 'moved-soma']) retain(kind, mesh, dt);
  const base = config(mesh, dt, 'local'), trials = [];
  const evaluate = (amplitude) => {
    const c = structuredClone(base); c.protocol.amplitudeUa = amplitude;
    const result = run(c, true);
    trials.push({ amplitudeUa: amplitude, ...compact(result) });
    return result.anyLocalCrossing;
  };
  let low = 0, high = 40;
  if (evaluate(low) || !evaluate(high)) throw new Error(`Initial event bracket invalid for ${mesh},${dt}`);
  for (let k = 0; k < 11; k++) { const mid = (low + high) / 2; if (evaluate(mid)) high = mid; else low = mid; }
  const sorted = [...trials].sort((a, b) => a.amplitudeUa - b.amplitudeUa);
  const sampledMonotonicity = sorted.every((r, i) => !r.anyLocalCrossing || sorted.slice(i).every((next) => next.anyLocalCrossing));
  const relativeWidth = (high - low) / high;
  report.thresholds.push({ id: `local-${mesh}um-${dt}ms`, config: base,
    criterion: 'Any physical membrane upward crossing of -25mV by15ms; not AP/propagation',
    lowerNoCrossingUa: low, upperCrossingUa: high, relativeWidth, sampledMonotonicity,
    precisionPass: sampledMonotonicity && relativeWidth <= limits.thresholdRelativeWidth, trials });
  console.log(`threshold ${mesh} µm / ${dt} ms: ${low}–${high} µA`);
  write();
}
function compare(a, b, dimension) {
  const voltage = a.probes.map((p, i) => {
    const e = errors(p.voltageMv, b.probes[i].voltageMv), positionDifferenceUm = distance(p.centerUm, b.probes[i].centerUm);
    return { sectionId: p.sectionId, positionDifferenceUm, rmsMv: e.rms, maximumMv: e.maximum,
      pass: e.rms <= limits.voltageRmsMv && e.maximum <= limits.voltageMaximumMv && positionDifferenceUm <= limits.endpointUm };
  });
  const neural = a.neuralUv.map((v, i) => {
    const e = errors(v, b.neuralUv[i]);
    const denominatorUv = Math.max(...b.neuralUv[i].map(Math.abs), limits.neuralPeakFloorUv);
    return { rmsUv: e.rms, maximumUv: e.maximum, denominatorUv, normalizedRms: e.rms / denominatorUv, pass: e.rms / denominatorUv <= limits.neuralNormalizedRms };
  });
  const artifact = a.appliedUv.map((v, i) => { const e = errors(v, b.appliedUv[i]); return { ...e, pass: e.maximum <= limits.artifactMaximumUv }; });
  const countsMatch = a.somaCrossingTimesMs.length === b.somaCrossingTimesMs.length;
  const somaTimingDifferencesMs = countsMatch ? a.somaCrossingTimesMs.map((v, i) => Math.abs(v - b.somaCrossingTimesMs[i])) : [];
  const localMatches = a.anyLocalCrossing === b.anyLocalCrossing;
  const firstTimingDifferenceMs = a.firstLocalCrossing && b.firstLocalCrossing ? Math.abs(a.firstLocalCrossing.timeMs - b.firstLocalCrossing.timeMs) : null;
  const events = { countsMatch, localMatches, somaTimingDifferencesMs, firstTimingDifferenceMs,
    pass: countsMatch && localMatches && somaTimingDifferencesMs.every((v) => v <= limits.eventTimeMs) && (firstTimingDifferenceMs === null || firstTimingDifferenceMs <= limits.eventTimeMs) };
  return { coarse: a.id, fine: b.id, dimension, voltage, neural, artifact, events,
    pass: voltage.every((v) => v.pass) && neural.every((v) => v.pass) && artifact.every((v) => v.pass) && events.pass && a.currentAccountingPass && b.currentAccountingPass };
}
const meshNext = new Map([[40, 20], [20, 10], [10, 5], [5, 2.5]]);
for (const a of retained.values()) for (const dimension of ['mesh', 'timestep']) {
  const kind = a.id.split('-').slice(0, -2).join('-');
  const mesh = a.config.neuron.segmentLengthUm, dt = a.config.solver.dtMs;
  const id = `${kind}-${dimension === 'mesh' ? meshNext.get(mesh) : mesh}um-${dimension === 'timestep' ? dt / 2 : dt}ms`;
  const b = retained.get(id);
  if (b) report.comparisons.push(compare(a, b, dimension));
}
for (const a of report.thresholds) for (const dimension of ['mesh', 'timestep']) {
  const mesh = a.config.neuron.segmentLengthUm, dt = a.config.solver.dtMs;
  const b = report.thresholds.find((b) => b.config.neuron.segmentLengthUm === (dimension === 'mesh' ? meshNext.get(mesh) : mesh) && b.config.solver.dtMs === (dimension === 'timestep' ? dt / 2 : dt));
  if (!b) continue;
  const midpoint = (b.lowerNoCrossingUa + b.upperCrossingUa) / 2;
  const envelope = Math.max(Math.abs(a.lowerNoCrossingUa - b.upperCrossingUa), Math.abs(a.upperCrossingUa - b.lowerNoCrossingUa));
  report.thresholdComparisons.push({ coarse: a.id, fine: b.id, dimension,
    midpointRelativeDifference: Math.abs((a.lowerNoCrossingUa + a.upperCrossingUa) / 2 - midpoint) / midpoint,
    conservativeEnvelopeRelativeDifference: envelope / midpoint,
    pass: a.precisionPass && b.precisionPass && envelope / midpoint <= limits.thresholdEnvelopeRelative });
}
report.sourceUnchangedDuringStudy = sourceFiles.every((p) => fileSha(p) === report.sourceHashes[p]);
report.status = 'completed'; report.totalWallMs = performance.now() - started;
report.summary = { geometryPass: report.geometryInvariants.every((x) => x.pass),
  harnessProductionPass: report.harnessProductionCheck.pass,
  fixedCases: report.fixedCases.length, thresholdTrials: report.thresholds.reduce((s, t) => s + t.trials.length, 0),
  currentAccountingPass: [...report.fixedCases, ...report.thresholds.flatMap((t) => t.trials)].every((r) => r.currentAccountingPass),
  waveformComparisons: { passed: report.comparisons.filter((c) => c.pass).length, total: report.comparisons.length },
  thresholdComparisons: { passed: report.thresholdComparisons.filter((c) => c.pass).length, total: report.thresholdComparisons.length },
  interpretation: 'Passing finer pairs does not erase coarser failures or validate untested geometries, biological AP initiation, propagation, or spatial selectivity.' };
write(); console.log(JSON.stringify(report.summary, null, 2));
if (!report.sourceUnchangedDuringStudy) throw new Error('Source changed during study; rerun before interpreting.');
