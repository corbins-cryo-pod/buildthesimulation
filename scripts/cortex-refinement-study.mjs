/** Bounded numerical research; no production model or reference-fixture mutation.
 * Acceptance criteria are declared in docs/cortex/REFINEMENT.md before execution.
 * All comparisons retain physical experiment, section locations and channel totals.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cpus, platform, release } from 'node:os';
import { execFileSync } from 'node:child_process';
import { freshActiveConfig } from '../src/lib/cortex/config.js';
import { runExperiment } from '../src/lib/cortex/experiment.js';
import { makeWorld } from '../src/lib/cortex/world.js';
import { activeModelData } from '../src/lib/cortex/active-morphology.js';
import { createActiveCable } from '../src/lib/cortex/active-cable.js';
import { CHANNELS } from '../src/lib/cortex/active-channels.js';
import { activeReferenceCases } from './cortex-active-reference-input.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const pathHash = (path) => hash(read(path));
const meshes = [40, 20, 10];
const timesteps = [0.005, 0.0025, 0.00125];
const limits = Object.freeze({
  endpointUm: 1e-9,
  invariantRelative: 1e-10,
  eventTimeMs: 0.1,
  voltageRmsMv: 1,
  voltageMaximumMv: 5,
  neuralNormalizedRms: 0.05,
  neuralPeakFloorUv: 0.01,
  artifactMaximumUv: 1e-7,
  currentResidualNa: 1e-8,
  thresholdRelativeWidth: 0.01,
  thresholdEnvelopeRelative: 0.02,
});
const relevantPaths = [
  'scripts/cortex-refinement-study.mjs',
  'src/lib/cortex/config.js',
  'src/lib/cortex/implants.js',
  'src/lib/devices/catalog.js',
  'src/lib/devices/implant-contacts.js',
  'src/lib/devices/models-surface.js',
  'src/lib/devices/models-probes.js',
  'src/lib/devices/models-leads.js',
  'src/lib/devices/models-peripheral.js',
  'src/lib/cortex/world.js',
  'src/lib/cortex/active-morphology.js',
  'src/lib/cortex/active-cable.js',
  'src/lib/cortex/active-channels.js',
  'src/lib/cortex/experiment.js',
  'src/lib/cortex/response-analysis.js',
  'src/lib/cortex/volume-conductor.js',
  'src/lib/cortex/buffers.js',
  'src/lib/cortex/models/allen571654895.json',
  'scripts/cortex-reference-requirements.txt',
];
const start = performance.now();
const report = {
  schemaVersion: 'cortex-refinement-study/1',
  status: 'running',
  generatedAt: new Date().toISOString(),
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim(),
  sourceHashes: Object.fromEntries(relevantPaths.map((p) => [p, pathHash(p)])),
  runtime: { node: process.version, cpu: cpus()[0].model, platform: platform(), release: release() },
  scope: 'Node CPU integration, forward recordings and diagnostics. No rendering, browser timing, GPU memory or independent experimental validation. 20 ms observation plus 100 ms conditioning.',
  acceptanceCriteriaSha256: hash(read('docs/cortex/REFINEMENT.md').toString().split('## Results and interpretation')[0]),
  comparisonConvention: 'Same dt for mesh comparisons, same mesh for dt comparisons. Native odd-segment midpoint probes preserve section x=0.5; no temporal alignment. Errors use finer run as the comparison, not as certified truth.',
  limits,
  meshesUm: meshes,
  timestepsMs: timesteps,
  cases: [],
  thresholds: [],
  comparisons: [],
  thresholdComparisons: [],
};
const write = () => writeFileSync(new URL('docs/cortex/benchmarks/refinement-latest.json', ROOT), JSON.stringify(report, null, 2) + '\n');
const distance = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
const relative = (a, b) => Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-30);
const peak = (a) => a.reduce((m, x) => Math.max(m, Math.abs(x)), 0);

function config(mesh, dt, kind) {
  const c = freshActiveConfig();
  c.neuron.segmentLengthUm = mesh;
  c.solver.dtMs = dt;
  c.solver.durationMs = 20;
  if (kind !== 'intracellular-spike') {
    c.protocol.mode = 'extracellular-stimulation';
    c.protocol.sourceContactIds = ['r4-c4', 'r4-c5'];
    c.recording.contactIds = ['r3-c3', 'r3-c6'];
    c.protocol.amplitudeUa = 25;
    if (kind === 'extracellular-soma-candidate') {
      c.protocol.amplitudeUa = 40;
      c.protocol.phaseUs = 1000;
      c.implant.translationUm = [100, -50, 0];
    }
  }
  return c;
}

function sectionData(nodes) {
  const cable = createActiveCable(nodes, activeModelData.fit);
  const sections = {};
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!n.areaUm2) continue;
    if (!sections[n.sectionId]) {
      let parent = n.parent;
      while (parent >= 0 && nodes[parent].sectionId === n.sectionId) parent = nodes[parent].parent;
      sections[n.sectionId] = {
        sectionType: n.sectionType,
        parentSectionId: parent >= 0 ? nodes[parent].sectionId : null,
        startUm: n.startUm,
        endUm: n.endUm,
        compartments: 0,
        areaUm2: 0,
        arcLengthUm: 0,
        chordLengthUm: 0,
        capacitanceNf: 0,
        leakUs: 0,
        maximumConductanceUs: Object.fromEntries(CHANNELS.map((m) => [m, 0])),
      };
    }
    const s = sections[n.sectionId];
    s.endUm = n.endUm;
    s.compartments++;
    s.areaUm2 += n.areaUm2;
    s.arcLengthUm += n.lengthUm;
    s.chordLengthUm += distance(n.startUm, n.endUm);
    s.capacitanceNf += cable.capacitanceNf[i];
    s.leakUs += cable.leakUs[i];
    CHANNELS.forEach((m, j) => s.maximumConductanceUs[m] += cable.density[j][i]);
  }
  return sections;
}

const physical = meshes.map((mesh) => {
  const w = makeWorld(config(mesh, 0.0025, 'extracellular-local'));
  const sections = sectionData(w.neuron.nodes);
  return { meshUm: mesh, nodes: w.neuron.nodes.length, membraneCompartments: w.neuron.membraneCompartments, sections };
});
const finestSections = physical.at(-1).sections;
report.geometryInvariance = physical.map((p) => {
  let maximumEndpointDifferenceUm = 0, maximumRelativeIntegralDifference = 0;
  const sectionIdentitiesMatch = JSON.stringify(Object.keys(p.sections).sort()) === JSON.stringify(Object.keys(finestSections).sort());
  let topologyMatches = sectionIdentitiesMatch;
  for (const [id, s] of Object.entries(p.sections)) {
    const ref = finestSections[id];
    topologyMatches &&= s.parentSectionId === ref.parentSectionId && s.sectionType === ref.sectionType;
    maximumEndpointDifferenceUm = Math.max(maximumEndpointDifferenceUm, distance(s.startUm, ref.startUm), distance(s.endUm, ref.endUm));
    for (const key of ['areaUm2', 'arcLengthUm', 'capacitanceNf', 'leakUs']) maximumRelativeIntegralDifference = Math.max(maximumRelativeIntegralDifference, relative(s[key], ref[key]));
    for (const key of CHANNELS) maximumRelativeIntegralDifference = Math.max(maximumRelativeIntegralDifference, relative(s.maximumConductanceUs[key], ref.maximumConductanceUs[key]));
  }
  return { ...p, sectionIdentitiesMatch, topologyMatches, maximumEndpointDifferenceUm, maximumRelativeIntegralDifference, pass: topologyMatches && maximumEndpointDifferenceUm <= limits.endpointUm && maximumRelativeIntegralDifference <= limits.invariantRelative };
});
const longest = (type) => Object.entries(finestSections).filter(([, s]) => s.sectionType === type).sort((a, b) => b[1].arcLengthUm - a[1].arcLengthUm)[0][0];
const probeSections = ['soma[0]', 'axon_stub[0]', longest('apic'), longest('dend')];
report.voltageProbeConvention = { sections: probeSections, sectionX: 0.5, zeroAreaJunctionsExcluded: true };

function pointsOfEvent(result, nodes) {
  return Array.from(result.firstCrossingByCompartment, (timeMs, i) => ({ timeMs, compartmentId: nodes[i].id, sectionId: nodes[i].sectionId, sectionX: nodes[i].sectionX, kind: nodes[i].kind, centerUm: nodes[i].centerUm })).filter((e) => Number.isFinite(e.timeMs)).sort((a, b) => a.timeMs - b.timeMs);
}
function compactResult(r) {
  const nodes = makeWorld(r.config).neuron.nodes;
  const n = nodes.length;
  const probes = probeSections.map((sectionId) => {
    const i = nodes.findIndex((node) => node.sectionId === sectionId && node.areaUm2 && Math.abs(node.sectionX - 0.5) < 1e-10);
    if (i < 0) throw new Error(`Missing physically matched probe ${sectionId}`);
    return { sectionId, sectionX: nodes[i].sectionX, centerUm: nodes[i].centerUm, voltageMv: Float64Array.from(r.timeMs, (_, k) => r.membraneMv[k * n + i]) };
  });
  const localCrossings = pointsOfEvent(r, nodes);
  return {
    summary: {
      config: r.config,
      engineVersion: r.engineVersion,
      frames: r.diagnostics.frames,
      compartments: n,
      membraneCompartments: nodes.filter((n) => n.areaUm2 > 0).length,
      elapsedMs: r.diagnostics.elapsedMs,
      outputBytes: r.diagnostics.outputBytes,
      conditioning: r.initialization.conditioningCache,
      spikeCount: r.spikes.length,
      somaSpikes: r.spikes,
      firstLocalCrossing: localCrossings[0] ?? null,
      localCrossings,
      voltageProbes: probes.map(({ voltageMv, ...p }) => ({ ...p, initialMv: voltageMv[0], minimumMv: Math.min(...voltageMv), maximumMv: Math.max(...voltageMv), finalMv: voltageMv.at(-1) })),
      neuralPeakUv: r.neuralUv.map(peak),
      artifactPeakUv: r.appliedUv.map(peak),
      maxConservationResidualNa: r.diagnostics.maxConservationResidualNa,
      maxKclResidualNa: r.diagnostics.maxKclResidualNa,
      currentAccountingPass: r.diagnostics.maxConservationResidualNa <= limits.currentResidualNa && r.diagnostics.maxKclResidualNa <= limits.currentResidualNa,
      phaseChargeNc: { cathodic: r.diagnostics.cathodicChargeNc, anodic: r.diagnostics.anodicChargeNc, signed: r.diagnostics.signedChargeNc },
    },
    timeMs: r.timeMs,
    probes,
    neuralUv: r.neuralUv,
    appliedUv: r.appliedUv,
    totalUv: r.totalUv,
  };
}
function errors(a, b) {
  if (a.length !== b.length) throw new Error('Samples do not match');
  let sum = 0, maximum = 0;
  for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); sum += d * d; maximum = Math.max(maximum, d); }
  return { rms: Math.sqrt(sum / a.length), maximum };
}
function compare(a, b, dimension) {
  const voltage = a.probes.map((p, i) => {
    const e = errors(p.voltageMv, b.probes[i].voltageMv);
    const samePhysicalPosition = distance(p.centerUm, b.probes[i].centerUm) <= limits.endpointUm;
    return { sectionId: p.sectionId, positionDifferenceUm: distance(p.centerUm, b.probes[i].centerUm), rmsMv: e.rms, maximumMv: e.maximum, pass: samePhysicalPosition && e.rms <= limits.voltageRmsMv && e.maximum <= limits.voltageMaximumMv };
  });
  const neural = a.neuralUv.map((trace, i) => {
    const e = errors(trace, b.neuralUv[i]);
    const denominatorUv = Math.max(peak(b.neuralUv[i]), limits.neuralPeakFloorUv);
    return { contactId: a.summary.config.recording.contactIds[i], rmsUv: e.rms, maximumUv: e.maximum, denominatorUv, normalizedRms: e.rms / denominatorUv, pass: e.rms / denominatorUv <= limits.neuralNormalizedRms };
  });
  const artifact = a.appliedUv.map((trace, i) => { const e = errors(trace, b.appliedUv[i]); return { contactId: a.summary.config.recording.contactIds[i], rmsUv: e.rms, maximumUv: e.maximum, pass: e.maximum <= limits.artifactMaximumUv }; });
  const total = a.totalUv.map((trace, i) => { const e = errors(trace, b.totalUv[i]); return { contactId: a.summary.config.recording.contactIds[i], rmsUv: e.rms, maximumUv: e.maximum }; });
  const countMatches = a.summary.spikeCount === b.summary.spikeCount;
  const somaTimingDifferencesMs = countMatches ? a.summary.somaSpikes.map((s, i) => Math.abs(s.timeMs - b.summary.somaSpikes[i].timeMs)) : null;
  const firstA = a.summary.firstLocalCrossing, firstB = b.summary.firstLocalCrossing;
  const localOccurrenceMatches = Boolean(firstA) === Boolean(firstB);
  const localTimingDifferenceMs = firstA && firstB ? Math.abs(firstA.timeMs - firstB.timeMs) : null;
  const events = { spikeCountMatches: countMatches, somaTimingDifferencesMs, localOccurrenceMatches, localTimingDifferenceMs, firstCrossingSectionMatches: firstA && firstB ? firstA.sectionId === firstB.sectionId : null, firstCrossingPositionDifferenceUm: firstA && firstB ? distance(firstA.centerUm, firstB.centerUm) : null, pass: countMatches && somaTimingDifferencesMs.every((x) => x <= limits.eventTimeMs) && localOccurrenceMatches && (localTimingDifferenceMs === null || localTimingDifferenceMs <= limits.eventTimeMs) };
  return { dimension, coarse: a.summary.id, fine: b.summary.id, voltage, neural, artifact, total, events, pass: voltage.every((m) => m.pass) && neural.every((m) => m.pass) && artifact.every((m) => m.pass) && events.pass && a.summary.currentAccountingPass && b.summary.currentAccountingPass };
}

function eventClassification(r, criterion) {
  return criterion === 'soma' ? r.spikes.some((s) => s.timeMs <= 15) : Array.from(r.firstCrossingByCompartment).some((t) => Number.isFinite(t) && t <= 15);
}
function threshold(base, criterion) {
  const c = structuredClone(base);
  const intracellular = c.protocol.mode === 'intracellular-current';
  const key = intracellular ? 'injectionNa' : 'amplitudeUa';
  let low = 0, high = intracellular ? 1.2 : 40;
  const trials = [];
  const evaluate = (amplitude) => {
    c.protocol[key] = amplitude;
    const r = runExperiment(c);
    const crossed = eventClassification(r, criterion);
    const nodes = makeWorld(c).neuron.nodes;
    trials.push({ amplitude, crossed, firstLocalCrossing: pointsOfEvent(r, nodes)[0] ?? null, somaSpikes: r.spikes, maxKclResidualNa: r.diagnostics.maxKclResidualNa, maxConservationResidualNa: r.diagnostics.maxConservationResidualNa, elapsedMs: r.diagnostics.elapsedMs, outputBytes: r.diagnostics.outputBytes, conditioning: r.initialization.conditioningCache });
    return crossed;
  };
  if (evaluate(low) || !evaluate(high)) throw new Error('Initial threshold endpoints do not bracket the specified event');
  for (let i = 0; i < 8; i++) { const mid = (low + high) / 2; if (evaluate(mid)) high = mid; else low = mid; }
  const sorted = trials.toSorted((a, b) => a.amplitude - b.amplitude);
  const sampledMonotonicity = sorted.every((t, i) => !t.crossed || sorted.slice(i).every((next) => next.crossed));
  const relativeWidth = (high - low) / high;
  return { id: `${intracellular ? 'intracellular-soma' : 'extracellular-local'}-${c.neuron.segmentLengthUm}um-${c.solver.dtMs}ms`, baseConfig: base, criterion, criterionMv: -25, windowEndMs: 15, lowerNoCrossing: low, upperCrossing: high, units: intracellular ? 'nA' : 'µA', relativeWidth, sampledMonotonicity, precisionPass: relativeWidth <= limits.thresholdRelativeWidth && sampledMonotonicity, trials };
}

// Arc-vs-chord and center-vs-path calculations diagnose represented geometry;
// they are not a replacement field discretization or a claimed error estimator.
report.geometrySampling = meshes.map((mesh) => {
  const world = makeWorld(config(mesh, 0.0025, 'extracellular-local'));
  const sources = world.config.protocol.sourceContactIds.map((id) => world.contacts.find((s) => s.id === id).positionUm);
  const sigma = world.config.tissue.conductivitySPerM;
  const potential = (point) => 1000 / (4 * Math.PI * sigma) * (1 / distance(point, sources[0]) - 1 / distance(point, sources[1])); // mV per µA
  let maximumCenterMinusArcMeanMvPerUa = 0, maximumPathChordSeparationUm = 0, arcLengthUm = 0, chordLengthUm = 0;
  const localSections = [];
  for (const n of world.neuron.nodes) {
    if (!n.areaUm2 || n.kind === 'soma') continue;
    let length = 0, integral = 0;
    for (let k = 1; k < n.pathUm.length; k++) {
      const a = n.pathUm[k - 1], b = n.pathUm[k], d = distance(a, b);
      length += d;
      for (let q = 0; q < 8; q++) integral += d / 8 * potential(a.map((x, j) => x + (b[j] - x) * (q + 0.5) / 8));
    }
    const chord = n.endUm.map((x, j) => x - n.startUm[j]), chordSquared = chord.reduce((s, x) => s + x * x, 0);
    for (const p of n.pathUm) {
      const fraction = Math.max(0, Math.min(1, chordSquared ? chord.reduce((s, x, j) => s + x * (p[j] - n.startUm[j]), 0) / chordSquared : 0));
      maximumPathChordSeparationUm = Math.max(maximumPathChordSeparationUm, distance(p, n.startUm.map((x, j) => x + fraction * chord[j])));
    }
    const difference = Math.abs(potential(n.centerUm) - integral / length);
    maximumCenterMinusArcMeanMvPerUa = Math.max(maximumCenterMinusArcMeanMvPerUa, difference);
    arcLengthUm += length; chordLengthUm += Math.sqrt(chordSquared);
    if (n.sectionId === 'apic[40]') localSections.push({ id: n.id, sectionX: n.sectionX, centerUm: n.centerUm, centerPotentialMvPerUa: potential(n.centerUm), arcMeanPotentialMvPerUa: integral / length });
  }
  return { meshUm: mesh, reconstructedPathLengthUm: arcLengthUm, recordingChordLengthUm: chordLengthUm, maximumPathChordSeparationUm, maximumCenterMinusArcMeanMvPerUa, interpretation: 'Diagnostic only: conductor forcing uses center potential; neural line sources use uniform endpoint chords. Native membrane areas/axial resistances retain taper and original section arc length.', initiationSectionSamples: localSections };
});

// Check committed independent provenance without rewriting fixtures or requiring
// Python at study runtime. Normal native-comparison tests remain separate gates.
const native = JSON.parse(read('tests/fixtures/cortex-active-neuron.json'));
const thresholdsNative = JSON.parse(read('tests/fixtures/cortex-active-thresholds.json'));
const g = native.generator;
const checks = {
  neuronPinned: /neuron==9\.0\.1\b/.test(read('scripts/cortex-reference-requirements.txt').toString()),
  lfpykitPinned: /LFPykit==0\.6\.2\b/.test(read('scripts/cortex-reference-requirements.txt').toString()),
  activeGeneratorHashMatches: g.scriptSha256 === pathHash('scripts/cortex-active-neuron-reference.py'),
  modelGeneratorHashMatches: g.modelGeneratorSha256 === pathHash('scripts/cortex-active-model.py'),
  activeInputGeneratorHashMatches: g.inputScriptSha256 === pathHash('scripts/cortex-active-reference-input.mjs'),
  activeInputHashMatches: g.inputSha256 === hash(JSON.stringify(activeReferenceCases()) + '\n'),
  thresholdGeneratorHashMatches: thresholdsNative.generator.scriptSha256 === pathHash('scripts/cortex-active-threshold-reference.py'),
  completeTraceHashesMatch: native.cases.every((c) => c.completeTrace.sha256 === pathHash(`tests/fixtures/${c.completeTrace.file}`)),
  originalAssetsMatch: Object.entries(g.sourceHashes).every(([name, expected]) => pathHash(`${name.endsWith('.mod') ? 'scripts/cortex-active-mechanisms' : 'public/models/cortex/allen571654895'}/${name}`) === expected),
};
report.independentReferenceAudit = {
  checks,
  pass: Object.values(checks).every(Boolean),
  pinnedRequirementsSha256: pathHash('scripts/cortex-reference-requirements.txt'),
  fixtures: Object.fromEntries(['cortex-active-neuron.json', 'cortex-active-thresholds.json', 'cortex-neuron-passive.json', 'cortex-neuron-arbor.json', 'cortex-lfpykit-forward.json'].map((name) => [name, pathHash(`tests/fixtures/${name}`)])),
  existingCoverage: native.cases.map((c) => ({ id: c.id, mode: c.config.protocol.mode, meshUm: c.config.neuron.segmentLengthUm, dtMs: c.config.solver.dtMs, amplitudeUa: c.config.protocol.amplitudeUa })),
  limitations: ['Existing native complete-cell fixtures have no 10 µm or 0.00125 ms case, no refined extracellular threshold, and no moved long-phase soma-spike candidate.', 'Active generator records declared simulator versions rather than checking import-time installed versions; run reproduction in the pinned environment.', 'Dependency versions are pinned; package wheel hashes, compiler binary and compiled-mechanism-library hash are not retained in the existing fixture metadata.', 'This Node study compares discretizations in one implementation. It does not replace independent solver regeneration at new configurations.'],
};
// Optional read-only regeneration uses the same pinned offline environment and
// compiled mechanisms as the existing reference generators. It writes no assets.
if (process.env.CORTEX_REFERENCE_PYTHON) {
  const python = String.raw`
import hashlib, importlib.util, importlib.metadata as metadata, json, os, sys
from pathlib import Path
root = Path.cwd()
spec = importlib.util.spec_from_file_location('active', root / 'scripts/cortex-active-model.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.load_mechanisms()
expected = json.loads((root / 'src/lib/cortex/models/allen571654895.json').read_text())
comparisons = []
for length in [40,20,10]:
    sections,soma,stub,center = module.make_cell(length)
    nodes,_ = module.discretize(sections,soma,center)
    ref = expected['variants'][str(length)]
    maxima = {key:0 for key in ['areaUm2','lengthUm','diameterUm','edgeUs','sectionX','startUm','endUm','centerUm']}
    topology = len(nodes) == len(ref)
    for a,b in zip(nodes,ref):
        topology = topology and a['id'] == b['id'] and a['parent'] == b['parent']
        for key in maxima:
            delta = max(abs(x-y) for x,y in zip(a[key],b[key])) if isinstance(a[key],list) else abs(a[key]-b[key])
            maxima[key] = max(maxima[key],delta)
    comparisons.append({'meshUm':length,'nodes':len(nodes),'maximumAbsoluteDifferences':maxima,'topologyMatches':topology})
dependencies = []
for line in (root / 'scripts/cortex-reference-requirements.txt').read_text().splitlines():
    if '==' in line:
        name,version = line.split('==')
        actual = metadata.version(name)
        dependencies.append({'package':name,'expected':version,'actual':actual,'matches':version == actual})
print(json.dumps({'python':sys.version,'neuronBuild':module.h.nrnversion(),'nativeGeometryReproduction':comparisons,'dependencies':dependencies,'mechanismLibrarySha256':hashlib.sha256(Path(os.environ['CORTEX_ACTIVE_MECHANISM_LIBRARY']).read_bytes()).hexdigest(),'scope':'Read-only native morphology regeneration and dependency audit; no new full-cell dynamics fixture generated.'}))
`;
  report.nativeEnvironmentAudit = JSON.parse(execFileSync(process.env.CORTEX_REFERENCE_PYTHON, ['-c', python], { cwd: ROOT, maxBuffer: 1024 * 1024 }).toString());
} else report.nativeEnvironmentAudit = { scope: 'Not requested. Set CORTEX_REFERENCE_PYTHON and CORTEX_ACTIVE_MECHANISM_LIBRARY to run the optional pinned native geometry/environment audit.' };
write();
const retained = new Map();
const keyFor = (kind, mesh, dt) => `${kind}-${mesh}um-${dt}ms`;
for (const mesh of meshes) {
  for (const dt of timesteps) {
    for (const kind of ['intracellular-spike', 'extracellular-local', ...(dt === 0.0025 ? ['extracellular-soma-candidate'] : [])]) {
      const summary = compactResult(runExperiment(config(mesh, dt, kind)));
      summary.summary.id = keyFor(kind, mesh, dt);
      retained.set(summary.summary.id, summary);
      report.cases.push(summary.summary);
      console.log(`${summary.summary.id}: ${summary.summary.spikeCount} soma spikes; first ${summary.summary.firstLocalCrossing?.sectionId ?? 'none'}; ${(summary.summary.elapsedMs / 1000).toFixed(2)} s`);
      write();
    }
    const t = threshold(config(mesh, dt, 'extracellular-local'), 'any membrane');
    report.thresholds.push(t);
    console.log(`${t.id}: ${t.lowerNoCrossing}–${t.upperCrossing} ${t.units}`);
    if (dt === 0.0025) {
      const s = threshold(config(mesh, dt, 'intracellular-spike'), 'soma');
      report.thresholds.push(s);
      console.log(`${s.id}: ${s.lowerNoCrossing}–${s.upperCrossing} ${s.units}`);
    }
    write();
  }
}
for (const kind of ['intracellular-spike', 'extracellular-local']) {
  for (const mesh of meshes) for (let i = 0; i < timesteps.length - 1; i++) report.comparisons.push(compare(retained.get(keyFor(kind, mesh, timesteps[i])), retained.get(keyFor(kind, mesh, timesteps[i + 1])), 'timestep'));
  for (const dt of timesteps) for (let i = 0; i < meshes.length - 1; i++) report.comparisons.push(compare(retained.get(keyFor(kind, meshes[i], dt)), retained.get(keyFor(kind, meshes[i + 1], dt)), 'mesh'));
}
for (let i = 0; i < meshes.length - 1; i++) report.comparisons.push(compare(retained.get(keyFor('extracellular-soma-candidate', meshes[i], 0.0025)), retained.get(keyFor('extracellular-soma-candidate', meshes[i + 1], 0.0025)), 'mesh'));
function compareThreshold(a, b, dimension) {
  const finerMidpoint = (b.lowerNoCrossing + b.upperCrossing) / 2;
  const midpointDifference = Math.abs((a.lowerNoCrossing + a.upperCrossing) / 2 - finerMidpoint);
  const envelopeDifference = Math.max(Math.abs(a.lowerNoCrossing - b.upperCrossing), Math.abs(a.upperCrossing - b.lowerNoCrossing));
  return { dimension, coarse: a.id, fine: b.id, midpointRelativeDifference: midpointDifference / finerMidpoint, conservativeEnvelopeRelativeDifference: envelopeDifference / finerMidpoint, pass: a.precisionPass && b.precisionPass && envelopeDifference / finerMidpoint <= limits.thresholdEnvelopeRelative };
}
for (const a of report.thresholds) for (const dimension of ['mesh', 'timestep']) {
  const mesh = a.baseConfig.neuron.segmentLengthUm, dt = a.baseConfig.solver.dtMs;
  const nextMesh = meshes[meshes.indexOf(mesh) + 1], nextDt = timesteps[timesteps.indexOf(dt) + 1];
  const b = report.thresholds.find((b) => b.criterion === a.criterion && b.baseConfig.neuron.segmentLengthUm === (dimension === 'mesh' ? nextMesh : mesh) && b.baseConfig.solver.dtMs === (dimension === 'timestep' ? nextDt : dt));
  if (b) report.thresholdComparisons.push(compareThreshold(a, b, dimension));
}
report.sourceUnchangedDuringStudy = relevantPaths.every((p) => report.sourceHashes[p] === pathHash(p));
report.status = 'completed';
report.totalWallMs = performance.now() - start;
report.acceptanceSummary = {
  geometryPass: report.geometryInvariance.every((x) => x.pass),
  currentAccountingPass: report.cases.every((c) => c.currentAccountingPass) && report.thresholds.every((t) => t.trials.every((r) => r.maxKclResidualNa <= limits.currentResidualNa && r.maxConservationResidualNa <= limits.currentResidualNa)),
  waveformComparisons: { passed: report.comparisons.filter((c) => c.pass).length, total: report.comparisons.length },
  thresholdComparisons: { passed: report.thresholdComparisons.filter((c) => c.pass).length, total: report.thresholdComparisons.length },
  thresholdPrecisionPass: report.thresholds.every((t) => t.precisionPass),
  independentProvenancePass: report.independentReferenceAudit.pass,
  interpretation: 'A pass means only the stated observable satisfies the predeclared pairwise criterion. Failed comparisons remain unresolved; no convergence or biological threshold is inferred from solver agreement alone.',
};
write();
console.log(JSON.stringify(report.acceptanceSummary, null, 2));
if (!report.sourceUnchangedDuringStudy) throw new Error('Relevant source changed during study; regenerate before interpreting this report.');
