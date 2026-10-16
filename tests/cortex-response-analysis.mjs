import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeActiveResponse } from '../src/lib/cortex/response-analysis.js';
import { getExampleConfig } from '../src/lib/cortex/examples.js';
import { makeWorld } from '../src/lib/cortex/world.js';
import { runExperiment, resultBundle } from '../src/lib/cortex/experiment.js';

function fixture(soma, events = [], firstCrossings = [NaN, NaN, NaN]) {
  const world = { neuron: { somaIndex: 0, nodes: [
    { id: 'soma', kind: 'soma', areaUm2: 100 },
    { id: 'dendrite', kind: 'dend', areaUm2: 10 },
    { id: 'junction', kind: 'junction', areaUm2: 0 },
  ] } };
  const result = {
    timeMs: Float64Array.from(soma, (_, i) => i),
    membraneMv: Float64Array.from(soma.flatMap((v, i) => [v, -70 + i, i * 1000])),
    firstCrossingByCompartment: Float64Array.from(firstCrossings),
    spikes: events.map((timeMs) => ({ timeMs, compartmentId: 'soma' })),
    spikeDetection: { thresholdMv: -25, refractoryMs: 2 },
    diagnostics: { compartments: 3 },
    // Applied/recording signals are separate quantities, not membrane events.
    appliedUv: [Float64Array.from(soma, () => 1e9)],
    neuralUv: [Float64Array.from(soma, () => 1e9)],
  };
  return { result, world };
}

test('polarization excludes zero-area junctions and does not infer events from a recording artifact', () => {
  const { result, world } = fixture([-70, -65, -80]);
  const response = analyzeActiveResponse(result, world);
  assert.equal(response.polarization.maxAbsChangeMv, 10);
  assert.equal(response.polarization.maxDepolarizationMv, 5);
  assert.equal(response.polarization.maxHyperpolarizationMv, -10);
  assert.equal(response.membraneThresholdCrossings.compartmentCount, 0);
  assert.equal(response.soma.thresholdEventCount, 0);
  assert.equal(response.propagation.firstCrossingToSomaDelayMs, null);
});

test('local crossings do not become soma events or prove propagation', () => {
  const { result, world } = fixture([-70, -60, -65], [], [NaN, 0.5, 0.1]);
  const response = analyzeActiveResponse(result, world);
  assert.equal(response.membraneThresholdCrossings.compartmentCount, 1);
  assert.equal(response.membraneThresholdCrossings.first.compartmentId, 'dendrite');
  assert.equal(response.soma.thresholdEventCount, 0);
  assert.equal(response.propagation.status, 'not-established');
  assert.equal(response.propagation.firstCrossingToSomaDelayMs, null);
});

test('repeated soma events retain separate waveform windows and a descriptive crossing delay', () => {
  const { result, world } = fixture(
    [-70, -15, 20, -50, -60, -10, 15, -20, -60], [0.8, 4.8], [0.8, 0.5, 0.1],
  );
  const original = structuredClone(result);
  const response = analyzeActiveResponse(result, world);
  assert.equal(response.membraneThresholdCrossings.compartmentCount, 2);
  assert.equal(response.soma.thresholdEventCount, 2);
  assert.equal(response.soma.waveformEvidenceCount, 2);
  assert.deepEqual(response.soma.events.map((e) => e.sampledPeakMv), [20, 15]);
  assert.deepEqual(response.soma.events.map((e) => e.returnBelowThresholdTimeMs), [3, 8]);
  assert.ok(Math.abs(response.propagation.firstCrossingToSomaDelayMs - 0.3) < 1e-12);
  assert.equal(response.propagation.status, 'not-established');
  assert.match(response.soma.convention, /not confirmation/);
  assert.deepEqual(result, original, 'Analysis must not change the solver output or compatibility detector');
});

test('threshold crossing, overshoot and recovery remain distinct observations', () => {
  for (const [trace, peak, recovered] of [
    [[-70, -20, -50], -20, true],
    [[-70, 15, 10], 15, false],
  ]) {
    const { result, world } = fixture(trace, [0.8], [0.8, NaN, NaN]);
    const response = analyzeActiveResponse(result, world);
    assert.equal(response.soma.thresholdEventCount, 1);
    assert.equal(response.soma.waveformEvidenceCount, 0);
    assert.equal(response.soma.events[0].sampledPeakMv, peak);
    assert.equal(response.soma.events[0].returnBelowThresholdTimeMs !== null, recovered);
  }
});

test('coarse output can miss a soma waveform without losing its internally detected event', () => {
  const { result, world } = fixture([-70, -65, -70], [0.2], [0.2, NaN, NaN]);
  result.timeMs = Float64Array.from([0, 5, 10]);
  const response = analyzeActiveResponse(result, world);
  assert.equal(response.soma.thresholdEventCount, 1);
  assert.equal(response.soma.waveformEvidenceCount, 0);
  assert.equal(response.soma.maxOutputIntervalMs, 5);
  assert.match(response.soma.sampling, /does not disprove/);
});

test('old passive or unavailable results have no active response analysis', () => {
  assert.equal(analyzeActiveResponse(null, null), null);
  assert.equal(analyzeActiveResponse({ timeMs: [0] }, { neuron: { nodes: [] } }), null);
});

test('the active solver attaches and exports descriptive analysis without altering its detector', () => {
  const config = getExampleConfig('extracellular-local-crossings');
  config.protocol.amplitudeUa = 1;
  config.solver.durationMs = 20;
  const result = runExperiment(config);
  const world = makeWorld(config);
  assert.deepEqual(result.spikes, [], 'The 1 µA reference placement has no soma threshold events');
  assert.equal(result.responseAnalysis.soma.thresholdEventCount, result.spikes.length);
  assert.equal(result.responseAnalysis.membraneThresholdCrossings.compartmentCount, 0);
  assert.ok(world.neuron.nodes.some((node) => node.areaUm2 === 0));
  const originals = result.firstCrossingByCompartment.slice();
  // Junction voltages have no physical membrane; even bogus legacy detection
  // values on those entries must not contaminate the postprocessed count.
  const copy = { ...result, firstCrossingByCompartment: originals.slice() };
  world.neuron.nodes.forEach((node, i) => { if (node.areaUm2 === 0) copy.firstCrossingByCompartment[i] = 0; });
  assert.equal(analyzeActiveResponse(copy, world).membraneThresholdCrossings.compartmentCount, 0);
  assert.deepEqual(result.firstCrossingByCompartment, originals);
  const bundle = resultBundle(result);
  assert.deepEqual(bundle.responseAnalysis, result.responseAnalysis);
  assert.match(bundle.electricalQuantities.membraneMv, /Transmembrane/);
  assert.match(bundle.electricalQuantities.appliedPotential, /scalar potential/);
  assert.match(bundle.electricalQuantities.electricField, /spatial gradient/);
  assert.match(bundle.electricalQuantities.neuralUv, /transmembrane currents/);
  assert.match(bundle.electricalQuantities.appliedUv, /artifact/);
  assert.match(bundle.electricalQuantities.totalUv, /sum/);
});
