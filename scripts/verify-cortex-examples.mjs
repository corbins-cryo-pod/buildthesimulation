import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { pathToFileURL } from 'node:url';
import { EXAMPLES, getExampleConfig } from '../src/lib/cortex/examples.js';
import { runExperiment } from '../src/lib/cortex/experiment.js';
import { makeWorld } from '../src/lib/cortex/world.js';

const root = new URL('../', import.meta.url);
export const REPORT_PATH = 'docs/cortex/benchmarks/examples-latest.json';
export const EXAMPLE_SOURCE_PATHS = [
  'scripts/verify-cortex-examples.mjs',
  'src/lib/cortex/examples.js',
  'src/lib/cortex/config.js',
  'src/lib/cortex/implants.js',
  'src/lib/cortex/experiment.js',
  'src/lib/cortex/world.js',
  'src/lib/cortex/active-morphology.js',
  'src/lib/cortex/active-cable.js',
  'src/lib/cortex/active-channels.js',
  'src/lib/cortex/passive-cable.js',
  'src/lib/cortex/volume-conductor.js',
  'src/lib/devices/catalog.js',
  'src/lib/devices/implant-contacts.js',
  'src/lib/devices/models-surface.js',
  'src/lib/devices/models-probes.js',
  'src/lib/devices/models-leads.js',
  'src/lib/devices/models-peripheral.js',
  'src/lib/cortex/models/allen571654895.json',
];
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export const sourceHashes = () => Object.fromEntries(
  EXAMPLE_SOURCE_PATHS.map((path) => [path, sha256(readFileSync(new URL(path, root)))]),
);
export const configHash = (config) => sha256(JSON.stringify(config));

const stats = (values) => {
  let min = Infinity, max = -Infinity, square = 0;
  for (const v of values) {
    assert.ok(Number.isFinite(v), 'non-finite signal');
    min = Math.min(min, v);
    max = Math.max(max, v);
    square += v * v;
  }
  return { min, max, peakAbsolute: Math.max(Math.abs(min), Math.abs(max)), rms: Math.sqrt(square / values.length) };
};
const trace = (result, index) => Array.from(result.timeMs,
  (_, frame) => result.membraneMv[frame * result.diagnostics.compartments + index]);
const signalDifference = (a, b, factor = 1) => {
  assert.equal(a.length, b.length);
  let max = 0;
  for (let i = 0; i < a.length; i++) max = Math.max(max, Math.abs(a[i] - factor * b[i]));
  return max;
};

export function assessExample(entry, result) {
  const soma = trace(result, result.somaIndex ?? 0);
  const crossed = result.firstCrossingByCompartment
    ? Array.from(result.firstCrossingByCompartment).filter(Number.isFinite).length : null;
  if (entry.outcome.somaSpikes === null) assert.equal(result.spikes, undefined, 'passive has no spike detector');
  else assert.equal(result.spikes.length, entry.outcome.somaSpikes, `${entry.id}: soma count changed`);
  if (entry.outcome.localCrossings === 'none') assert.equal(crossed, 0, `${entry.id}: unexpected local crossing`);
  if (entry.outcome.localCrossings === 'present') assert.ok(crossed > 0, `${entry.id}: local crossings absent`);
  assert.ok(result.diagnostics.maxConservationResidualNa < 1e-8, `${entry.id}: membrane-current conservation`);
  assert.ok(result.diagnostics.maxKclResidualNa < 1e-8, `${entry.id}: local KCL`);
  assert.ok(result.diagnostics.outputBytes <= 64 * 1024 * 1024, `${entry.id}: output budget`);
  assert.ok(result.membraneMv.every(Number.isFinite), `${entry.id}: finite membrane voltage`);
  assert.ok(result.membraneCurrentNa.every(Number.isFinite), `${entry.id}: finite membrane current`);
  let decompositionResidualUv = 0, differentialResidualUv = 0;
  for (let frame = 0; frame < result.timeMs.length; frame++) {
    for (let ch = 0; ch < 2; ch++) {
      assert.ok(Number.isFinite(result.neuralUv[ch][frame]));
      assert.ok(Number.isFinite(result.appliedUv[ch][frame]));
      assert.ok(Number.isFinite(result.totalUv[ch][frame]));
      decompositionResidualUv = Math.max(decompositionResidualUv,
        Math.abs(result.totalUv[ch][frame] - result.neuralUv[ch][frame] - result.appliedUv[ch][frame]));
    }
    differentialResidualUv = Math.max(differentialResidualUv,
      Math.abs(result.differentialUv[frame] - result.totalUv[0][frame] + result.totalUv[1][frame]));
  }
  assert.ok(decompositionResidualUv < 1e-10, `${entry.id}: neural + applied = total`);
  assert.ok(differentialResidualUv < 1e-10, `${entry.id}: A−B reference`);
  const appliedPeak = Math.max(...result.appliedUv.map((v) => stats(v).peakAbsolute));
  if (entry.outcome.appliedSignal === 'zero') assert.equal(appliedPeak, 0);
  else assert.ok(appliedPeak > 0);
  if (result.config.protocol.mode === 'extracellular-stimulation') {
    const charge = result.config.protocol.amplitudeUa * result.config.protocol.phaseUs / 1000;
    assert.ok(Math.abs(result.diagnostics.signedChargeNc) < 1e-10, 'charge balance');
    assert.ok(Math.abs(result.diagnostics.cathodicChargeNc - charge) < 1e-10, 'cathodic charge');
    assert.ok(Math.abs(result.diagnostics.anodicChargeNc - charge) < 1e-10, 'anodic charge');
  }
  if (entry.id === 'passive-subthreshold') {
    assert.ok(stats(soma).max > result.config.membrane.restMv, 'depolarization');
    assert.ok(result.diagnostics.maxExcursionMv < 10, 'small passive excursion');
  }
  return { status: 'passed', decompositionResidualUv, differentialResidualUv };
}

function summarize(entry, result) {
  const world = makeWorld(result.config), nodes = world.neuron.nodes;
  const crossings = result.firstCrossingByCompartment
    ? Array.from(result.firstCrossingByCompartment, (timeMs, index) => ({
        timeMs, compartmentId: nodes[index].id, kind: nodes[index].kind,
        centerUm: nodes[index].centerUm,
      })).filter((item) => Number.isFinite(item.timeMs)).sort((a, b) => a.timeMs - b.timeMs)
    : [];
  const indices = [...new Set([world.neuron.somaIndex, world.neuron.synapseIndex,
    ...(crossings.length ? [nodes.findIndex((n) => n.id === crossings[0].compartmentId)] : [])])]
    .filter((index) => Number.isInteger(index) && index >= 0);
  const p = result.config.protocol, phaseMs = p.phaseUs / 1000, gapMs = p.gapUs / 1000;
  const times = p.mode === 'extracellular-stimulation'
    ? [0, p.startMs + 0.05, p.startMs + phaseMs,
        p.startMs + phaseMs + gapMs / 2, p.startMs + phaseMs + gapMs + 0.05,
        p.startMs + 2 * phaseMs + gapMs + 0.05, 15, result.config.solver.durationMs]
    : [0, p.startMs, p.startMs + 1, p.startMs + p.durationMs, 15, result.config.solver.durationMs];
  const frames = [...new Set(times.map((time) => {
    let closest = 0;
    for (let i = 1; i < result.timeMs.length; i++)
      if (Math.abs(result.timeMs[i] - time) < Math.abs(result.timeMs[closest] - time)) closest = i;
    return closest;
  }))];
  return {
    id: entry.id,
    title: entry.title,
    status: assessExample(entry, result),
    engineVersion: result.engineVersion,
    config: result.config,
    configSha256: configHash(result.config),
    modelId: world.neuron.id,
    geometry: {
      somaCenterUm: nodes[world.neuron.somaIndex].centerUm,
      stimulatingContacts: result.config.protocol.sourceContactIds.map((id) => {
        const contact = world.contacts.find((c) => c.id === id);
        return { id, positionUm: contact.positionUm };
      }),
      recordingContacts: result.recordingSiteIds.map((id) => {
        const contact = world.contacts.find((c) => c.id === id);
        return { id, positionUm: contact.positionUm };
      }),
    },
    expectedBehavior: entry.expectedBehavior,
    somaSpikes: result.spikes ?? null,
    somaMv: stats(trace(result, world.neuron.somaIndex)),
    crossingCriterion: result.spikeDetection ?? 'Not defined for the passive model',
    localCrossingCount: result.firstCrossingByCompartment ? crossings.length : null,
    localCrossings: crossings,
    selectedCompartments: indices.map((index) => ({
      compartmentId: nodes[index].id, kind: nodes[index].kind,
      centerUm: nodes[index].centerUm, membraneMv: stats(trace(result, index)),
    })),
    recordings: result.recordingSiteIds.map((contactId, ch) => ({
      contactId, reference: 'infinity', units: 'µV',
      neural: stats(result.neuralUv[ch]), applied: stats(result.appliedUv[ch]), total: stats(result.totalUv[ch]),
    })),
    bipolarRecordings: Object.fromEntries(['neural', 'applied', 'total'].map((component) => [component,
      stats(result[`${component}Uv`][0].map((v, i) => v - result[`${component}Uv`][1][i])),
    ])),
    snapshots: frames.map((frame) => ({
      timeMs: result.timeMs[frame],
      driveIntervalAverage: result.drive[frame],
      driveUnits: p.mode === 'extracellular-stimulation' ? 'µA' : p.mode === 'intracellular-current' ? 'nA' : 'nS',
      somaMv: result.membraneMv[frame * nodes.length + world.neuron.somaIndex],
      neuralUv: result.neuralUv.map((v) => v[frame]),
      appliedUv: result.appliedUv.map((v) => v[frame]),
      totalUv: result.totalUv.map((v) => v[frame]),
    })),
    diagnostics: result.diagnostics,
    conditioning: result.initialization?.conditioningCache ?? 'passive equilibrium',
    warnings: result.warnings,
  };
}

export function verifyExamples(onCase = () => {}) {
  const inputs = sourceHashes();
  const results = new Map(), cases = [];
  for (const entry of EXAMPLES) {
    const result = runExperiment(getExampleConfig(entry.id));
    results.set(entry.id, result);
    const summary = summarize(entry, result);
    cases.push(summary);
    onCase(summary);
  }
  const shifted = results.get('extracellular-soma-spike');
  const unshifted = results.get('extracellular-unshifted');
  const reversed = results.get('extracellular-reversed-polarity');
  const local = results.get('extracellular-local-crossings');
  const components = results.get('recording-components');
  const placementArtifactMaxErrorUv = Math.max(...shifted.appliedUv.map((v, ch) =>
    signalDifference(v, unshifted.appliedUv[ch])));
  const polarityArtifactMaxErrorUv = Math.max(...shifted.appliedUv.map((v, ch) =>
    signalDifference(v, reversed.appliedUv[ch], -1)));
  assert.ok(placementArtifactMaxErrorUv < 1e-10, 'rigid array translation preserves source/probe artifact geometry');
  assert.ok(polarityArtifactMaxErrorUv < 1e-10, 'reversed source order negates applied potential');
  assert.equal(signalDifference(local.membraneMv, components.membraneMv), 0,
    'recording-components view does not change the physical experiment');
  assert.deepEqual(sourceHashes(), inputs, 'Sources changed during verification; rerun on a stable checkout.');
  return {
    schemaVersion: 'cortex-examples-verification/1',
    generatedAt: new Date().toISOString(),
    status: 'passed',
    runtime: { node: process.version, cpu: cpus()[0]?.model ?? 'unknown' },
    scope: 'Reproducible solver calculations and regression checks, not a new independent NEURON/LFPykit comparison or biological validation. Elapsed times include solver and any uncached conditioning, exclude rendering, and are machine-specific. Output bytes count retained numerical buffers, not peak process memory.',
    acceptanceCriteria: {
      eventClassification: 'The qualitative outcome recorded with each curated configuration must hold; active crossings are upward −25 mV with the solver-defined soma detector.',
      currentConservationAndKclNa: 1e-8,
      signalDecompositionAndReferenceUv: 1e-10,
      outputBytesMaximum: 64 * 1024 * 1024,
      perContactChargeErrorNc: 1e-10,
      analyticalArtifactComparisonUv: 1e-10,
      finite: 'All retained membrane voltages/currents and recording components must be finite.',
    },
    sourceHashes: inputs,
    comparisons: { placementArtifactMaxErrorUv, polarityArtifactMaxErrorUv,
      recordingComponentViewChangesPhysics: false },
    cases,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = verifyExamples((entry) => console.log(JSON.stringify({
    id: entry.id,
    somaSpikes: entry.somaSpikes?.map((s) => s.timeMs) ?? null,
    localCrossings: entry.localCrossingCount,
    peakSomaMv: entry.somaMv.max,
    solverMs: entry.diagnostics.elapsedMs,
    outputBytes: entry.diagnostics.outputBytes,
  })));
  writeFileSync(new URL(REPORT_PATH, root), JSON.stringify(report, null, 2) + '\n');
  console.log(`Verified ${report.cases.length} curated examples; wrote ${REPORT_PATH}`);
}
