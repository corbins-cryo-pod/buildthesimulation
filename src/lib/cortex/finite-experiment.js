// Finite benchmark orchestration, derived from experiment.js at a028524.
// Shares active/passive cable implementations; keep point-source provenance unchanged.
import { ENGINE_VERSION, ACTIVE_ENGINE_VERSION, validateConfig } from './config.js';
import { makeWorld } from './world.js';
import { createPassiveCable, stepPassiveCable } from './passive-cable.js';
import { createActiveCable, stepActiveCable } from './active-cable.js';
import { getActiveModel } from './model-library.js';
import { resultBuffers } from './buffers.js';
import { modelRegistry } from './model-registry.js';
import { prepareFiniteNodes } from './finite-contact.js';
import { analyzeActiveResponse } from './response-analysis.js';
const conditionedStates = new Map();
import {
  leadField,
  pointTransferUvPerNa,
  pointField,
  distance,
  segmentDistance,
} from './volume-conductor.js';
import { evidenceRegistry, parameterRegistry } from './evidence.js';

export function windowAverage(t, dt, start, duration) {
  return Math.max(0, Math.min(t + dt, start + duration) - Math.max(t, start)) / dt;
}
// Cathodic leading phase at source A; equal/opposite local return B.
export function biphasicAverage(t, dt, p) {
  const phase = p.phaseUs / 1000,
    gap = p.gapUs / 1000;
  return (
    -windowAverage(t, dt, p.startMs, phase) + windowAverage(t, dt, p.startMs + phase + gap, phase)
  );
}
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
export function runFiniteExperiment(input, progress = () => {}, finiteContact) {
  if (!finiteContact?.field) throw new Error('Load the finite disk field before simulation.');
  const started = performance.now(),
    world = makeWorld(input),
    c = world.config;
  const { nodes } = world.neuron,
    n = nodes.length;
  const selected = c.recording.contactIds.map((id) => world.contacts.find((s) => s.id === id));
  const stimulating = c.protocol.sourceContactIds.map((id) =>
    world.contacts.find((s) => s.id === id),
  );
  const active = !!c.neuron.modelId;
  const sigma = c.tissue.conductivitySPerM,
    cable = active
      ? createActiveCable(nodes, getActiveModel(c.neuron.modelId).fit, { kv2TauGuard: getActiveModel(c.neuron.modelId).kv2TauGuard !== false })
      : createPassiveCable(nodes, c.membrane),
    stepCable = active ? stepActiveCable : stepPassiveCable;
  const finite = finiteContact ? prepareFiniteNodes(finiteContact.field, nodes, c, finiteContact.centerUm) : null;
  if (finite && !finite.supported) throw new Error(`Whole neuron excluded: ${finite.issues[0].reason} (${finite.issues[0].id}).`);
  const lead = finite ? [new Float64Array(n).fill(NaN),new Float64Array(n).fill(NaN)] : leadField(nodes, selected, sigma, c.recording.sourceModel, c.recording.exclusionUm);
  const stimulationMode = c.protocol.mode === 'extracellular-stimulation';
  if (stimulationMode && !finite) leadField(nodes, stimulating, sigma, 'point', c.recording.exclusionUm); // explicit near-field rejection
  const unitFieldMv = finite?.unitFieldMv ?? Float64Array.from(nodes, (node) =>
    stimulationMode
      ? pointTransferUvPerNa(node.centerUm, stimulating[0].positionUm, sigma) -
        pointTransferUvPerNa(node.centerUm, stimulating[1].positionUm, sigma)
      : 0,
  );
  const artifactPerUa = selected.map((site) =>
    finite ? NaN : stimulationMode
      ? 1000 *
        (pointTransferUvPerNa(site.positionUm, stimulating[0].positionUm, sigma) -
          pointTransferUvPerNa(site.positionUm, stimulating[1].positionUm, sigma))
      : 0,
  );
  const injectionMode = c.protocol.mode === 'intracellular-current';
  if (injectionMode && active) {
    try {
      leadField(
        nodes,
        [{ id: 'bath-return', positionUm: c.protocol.bathReturnUm }],
        sigma,
        'point',
        c.recording.exclusionUm,
      );
    } catch {
      throw new Error('Move the bath return away from the modeled membrane.');
    }
  }
  if (
    injectionMode &&
    !active &&
    nodes.some(
      (node) =>
        segmentDistance(c.protocol.bathReturnUm, node.startUm, node.endUm) <
        c.recording.exclusionUm + node.diameterUm / 2,
    )
  )
    throw new Error('Move the bath return away from the modeled membrane.');
  if (
    injectionMode &&
    selected.some((s) => distance(s.positionUm, c.protocol.bathReturnUm) < c.recording.exclusionUm)
  )
    throw new Error('Move the bath return away from the recording contacts.');
  const bathPerNa = selected.map((s) =>
    injectionMode ? pointTransferUvPerNa(s.positionUm, c.protocol.bathReturnUm, sigma) : 0,
  );
  const bathAtNodesMvPerNa = Float64Array.from(nodes, (node) =>
    injectionMode ? pointTransferUvPerNa(node.centerUm, c.protocol.bathReturnUm, sigma) / 1000 : 0,
  );
  const steps = Math.ceil(c.solver.durationMs / c.solver.dtMs),
    sampleEvery = active ? Math.round(c.solver.sampleMs / c.solver.dtMs) : 1,
    frames = Math.ceil(steps / sampleEvery) + 1;
  const result = {
    schemaVersion: active ? 'cortex-result/2' : 'cortex-result/1',
    engineVersion: active ? ACTIVE_ENGINE_VERSION : ENGINE_VERSION,
    config: c,
    modelStatus: {
      implemented: true,
      verification:
        'Analytical/convergence tests and fixed NEURON 9.0.1 / LFPykit 0.6.2 reference cases; not a guarantee for arbitrary configurations.',
      experimentalValidation: 'none',
      fidelity: active
        ? 'Human temporal L2 fitted model; reconstructed dendrites, published axon stub, mixed-species kinetics; homogeneous infinite conductor'
        : 'exploratory passive cable; homogeneous infinite conductor',
    },
    timeMs: new Float64Array(frames),
    membraneMv: new Float64Array(frames * n),
    membraneCurrentNa: new Float64Array(frames * n),
    neuralUv: [new Float64Array(frames), new Float64Array(frames)],
    appliedUv: [new Float64Array(frames), new Float64Array(frames)],
    totalUv: [new Float64Array(frames), new Float64Array(frames)],
    differentialUv: new Float64Array(frames),
    drive: new Float64Array(frames),
    compartmentIds: nodes.map((node) => node.id),
    recordingSiteIds: [...c.recording.contactIds],
    diagnostics: {
      maxConservationResidualNa: 0,
      maxKclResidualNa: 0,
      maxExcursionMv: 0,
      signedChargeNc: 0,
      cathodicChargeNc: 0,
      anodicChargeNc: 0,
      elapsedMs: 0,
      outputBytes: 0,
      frames,
      compartments: n,
    },
    warnings: [...world.warnings],
  };
  if (finite) {
    result.fieldModel = finite.metadata;
    result.unitAppliedMvPerUa = unitFieldMv;
    result.recordingSiteIds = [];
    result.warnings = ['Experimental finite disk: recording and electric-field outputs unavailable. Neural convergence and biological selectivity remain unverified.'];
    result.modelStatus.fidelity = 'Human fitted cable model driven by finite disk potential in an insulating half-space; distant grounded return';
    for (const key of ['neuralUv','appliedUv','totalUv']) result[key].forEach(a=>a.fill(NaN));
    result.differentialUv.fill(NaN);
  }
  if (active) {
    result.modelStatus.verification =
      'Active reference comparisons are recorded in docs/cortex/ACTIVE_MODEL.md; limited to specified cases.';
    result.spikeDetection = {
      thresholdMv: -25,
      refractoryMs: 2,
      convention:
        'Upward voltage threshold event, linearly interpolated between internal solver steps; the legacy spikes field does not by itself confirm a regenerative action potential or propagation',
    };
    result.spikes = [];
    result.firstCrossingByCompartment = new Float64Array(n).fill(NaN);
    result.channels = Object.fromEntries(
      [
        'sodiumNa',
        'potassiumNa',
        'calciumNa',
        'hcnNa',
        'leakNa',
        'capacitiveNa',
        'calciumMm',
        'sodiumOpen',
      ].map((key) => [key, new Float64Array(frames * n)]),
    );
    const settlingSteps = Math.round(c.solver.settleMs / c.solver.dtMs),
      key = JSON.stringify([
        c.neuron.modelId,
        c.neuron.segmentLengthUm,
        c.solver.dtMs,
        c.solver.settleMs,
      ]);
    const cached = conditionedStates.get(key),
      fields = [
        'voltageMv',
        'previous',
        'membraneCurrentNa',
        'ionicNa',
        'potassiumNa',
        'calciumNa',
        'hcnNa',
        'leakNa',
        'capacitiveNa',
        'gates',
        'sodium',
        'calciumMm',
      ];
    if (cable.extraGates) fields.push('extraGates');
    if (cached) {
      for (const field of fields) cable[field].set(cached[field]);
      progress({ progress: 0.5, biologicalMs: 0, stage: 'Reusing identical conditioning' });
    } else {
      for (let k = 0; k < settlingSteps; k++) {
        stepCable(cable, c.solver.dtMs);
        if (k % 128 === 0)
          progress({
            progress: (0.5 * (k + 1)) / settlingSteps,
            biologicalMs: 0,
            stage: 'Conditioning',
          });
      }
      if (conditionedStates.size >= 4)
        conditionedStates.delete(conditionedStates.keys().next().value);
      conditionedStates.set(
        key,
        Object.fromEntries(fields.map((field) => [field, cable[field].slice()])),
      );
    }
    result.initialization = {
      startMv: getActiveModel(c.neuron.modelId).fit.conditions[0].v_init,
      settleMs: c.solver.settleMs,
      temperatureC: 34,
      conditioningCache: cached ? 'reused identical state' : 'computed',
      convention:
        'Source JSON initialization, including legacy NaV seqinitial; no-drive conditioning. Frame zero is the conditioned state, not assumed exact equilibrium.',
    };
  }
  result.membraneMv.set(cable.voltageMv);
  const initialVoltages = cable.voltageMv.slice();
  if (active) {
    result.membraneCurrentNa.set(cable.membraneCurrentNa);
    for (const [key, source] of [
      ['sodiumNa', 'ionicNa'],
      ['potassiumNa', 'potassiumNa'],
      ['calciumNa', 'calciumNa'],
      ['hcnNa', 'hcnNa'],
      ['leakNa', 'leakNa'],
      ['capacitiveNa', 'capacitiveNa'],
      ['calciumMm', 'calciumMm'],
    ])
      result.channels[key].set(cable[source]);
    for (let i = 0; i < n; i++) result.channels.sodiumOpen[i] = cable.sodium[i * 12 + 10];
    for (let ch = 0; ch < 2; ch++) {
      result.neuralUv[ch][0] = dot(lead[ch], cable.membraneCurrentNa);
      result.totalUv[ch][0] = result.neuralUv[ch][0];
    }
    result.differentialUv[0] = result.totalUv[0][0] - result.totalUv[1][0];
  }
  const extracellularMv = new Float64Array(n),
    injectionNa = new Float64Array(n),
    synapticUs = new Float64Array(n);
  const axial = new Float64Array(n);
  for (let k = 0; k < steps; k++) {
    const t = k * c.solver.dtMs,
      dt = Math.min(c.solver.dtMs, c.solver.durationMs - t),
      frame = Math.ceil((k + 1) / sampleEvery);
    const gate = windowAverage(t, dt, c.protocol.startMs, c.protocol.durationMs);
    const currentUa = stimulationMode
      ? c.protocol.amplitudeUa * biphasicAverage(t, dt, c.protocol)
      : 0;
    const inject = injectionMode ? c.protocol.injectionNa * gate : 0;
    injectionNa.fill(0);
    injectionNa[world.neuron.somaIndex] = inject;
    for (let i = 0; i < n; i++)
      extracellularMv[i] = unitFieldMv[i] * currentUa - bathAtNodesMvPerNa[i] * inject;
    const synapseUs =
      c.protocol.mode === 'synaptic-recording' ? c.protocol.synapseNs * 0.001 * gate : 0;
    for (let i = 0; i < n; i++) synapticUs[i] = synapseUs * (nodes[i].synapseWeight ?? 0);
    stepCable(cable, dt, {
      extracellularMv,
      injectionNa,
      synapticUs,
      synapseReversalMv: c.protocol.synapseReversalMv,
    });
    if (active)
      for (let i = 0; i < n; i++)
        if (nodes[i].areaUm2 && cable.previous[i] < -25 && cable.voltageMv[i] >= -25) {
          const crossing =
            t + (dt * (-25 - cable.previous[i])) / (cable.voltageMv[i] - cable.previous[i]);
          if (Number.isNaN(result.firstCrossingByCompartment[i]))
            result.firstCrossingByCompartment[i] = crossing;
          if (
            i === world.neuron.somaIndex &&
            (!result.spikes.length || crossing - result.spikes.at(-1).timeMs >= 2)
          )
            result.spikes.push({ timeMs: crossing, compartmentId: nodes[i].id });
        }
    if ((k + 1) % sampleEvery === 0 || k === steps - 1) {
      result.timeMs[frame] = t + dt;
      result.membraneMv.set(cable.voltageMv, frame * n);
      result.membraneCurrentNa.set(cable.membraneCurrentNa, frame * n);
      // Sample at step END; drive/applied potential is the average over that preceding interval.
      result.drive[frame] = stimulationMode ? currentUa : injectionMode ? inject : synapseUs * 1000;
      for (let ch = 0; ch < 2; ch++) {
        result.neuralUv[ch][frame] = dot(lead[ch], cable.membraneCurrentNa);
        result.appliedUv[ch][frame] = artifactPerUa[ch] * currentUa - bathPerNa[ch] * inject;
        result.totalUv[ch][frame] = result.neuralUv[ch][frame] + result.appliedUv[ch][frame];
      }
      result.differentialUv[frame] = result.totalUv[0][frame] - result.totalUv[1][frame];
      if (active) {
        for (const [key, source] of [
          ['sodiumNa', 'ionicNa'],
          ['potassiumNa', 'potassiumNa'],
          ['calciumNa', 'calciumNa'],
          ['hcnNa', 'hcnNa'],
          ['leakNa', 'leakNa'],
          ['capacitiveNa', 'capacitiveNa'],
          ['calciumMm', 'calciumMm'],
        ])
          result.channels[key].set(cable[source], frame * n);
        for (let i = 0; i < n; i++)
          result.channels.sodiumOpen[frame * n + i] = cable.sodium[i * 12 + 10];
      }
    }
    const balance = cable.membraneCurrentNa.reduce((s, x) => s + x, 0) - inject;
    result.diagnostics.maxConservationResidualNa = Math.max(
      result.diagnostics.maxConservationResidualNa,
      Math.abs(balance),
    );
    axial.fill(0);
    for (let i = 0; i < n; i++)
      if (nodes[i].parent >= 0) {
        const p = nodes[i].parent,
          flux =
            cable.edgeUs[i] *
            (cable.voltageMv[p] + extracellularMv[p] - cable.voltageMv[i] - extracellularMv[i]);
        axial[i] += flux;
        axial[p] -= flux;
      }
    for (let i = 0; i < n; i++) {
      result.diagnostics.maxKclResidualNa = Math.max(
        result.diagnostics.maxKclResidualNa,
        Math.abs(cable.membraneCurrentNa[i] - axial[i] - injectionNa[i]),
      );
      if(nodes[i].areaUm2)result.diagnostics.maxExcursionMv = Math.max(
        result.diagnostics.maxExcursionMv,
        Math.abs(cable.voltageMv[i] - initialVoltages[i]),
      );
    }
    // µA × ms = nC. Integrate phase overlaps separately: taking signs after
    // averaging would cancel opposite phases that share a timestep. These are
    // per-contact charge diagnostics, never a tissue-safety threshold.
    result.diagnostics.signedChargeNc += currentUa * dt;
    if (stimulationMode) {
      const phaseMs = c.protocol.phaseUs / 1000;
      result.diagnostics.cathodicChargeNc +=
        c.protocol.amplitudeUa * dt * windowAverage(t, dt, c.protocol.startMs, phaseMs);
      result.diagnostics.anodicChargeNc +=
        c.protocol.amplitudeUa *
        dt *
        windowAverage(t, dt, c.protocol.startMs + phaseMs + c.protocol.gapUs / 1000, phaseMs);
    }
    if (k % 128 === 0)
      progress({
        progress: active ? 0.5 + (0.5 * (k + 1)) / steps : (k + 1) / steps,
        biologicalMs: t + dt,
        stage: 'Simulating',
      });
  }
  if (!active && result.diagnostics.maxExcursionMv > 10)
    result.warnings.push(
      'Membrane excursion exceeds 10 mV. Active channels are absent; the passive solution is a mathematical extrapolation, not a spike prediction.',
    );
  if (c.solver.dtMs > c.protocol.phaseUs / 1000 / 4 && stimulationMode)
    result.warnings.push(
      'Fewer than four timesteps per stimulation phase. Refine dt before interpreting transient polarization.',
    );
  if (active) {
    const first = Array.from(result.firstCrossingByCompartment)
      .map((timeMs, i) => ({ timeMs, compartmentId: nodes[i].id, kind: nodes[i].kind }))
      .filter((x) => Number.isFinite(x.timeMs))
      .sort((a, b) => a.timeMs - b.timeMs)[0];
    result.diagnostics.firstThresholdCrossing = first ?? null;
    result.diagnostics.spikeCount = result.spikes.length;
    result.somaIndex = world.neuron.somaIndex;
    result.responseAnalysis = analyzeActiveResponse(result, world);
    result.modelStatus.spatialThresholdConvergence =
      'Not established across supported meshes: all six extracellular spatial-threshold comparisons in the original 40/20/10 µm study fail the unchanged 2% gate. Independent solver agreement at a fixed mesh does not establish spatial convergence.';
  }
  result.diagnostics.elapsedMs = performance.now() - started;
  result.modelStatus.verification = 'Finite field independently benchmarked; coupling unit/sign and worker tests pass. No independent NEURON comparison for this finite-field configuration; no biological validation.';
  result.diagnostics.wallSecondsPerBiologicalSecond =
    result.diagnostics.elapsedMs / c.solver.durationMs;
  result.diagnostics.outputBytes = resultBuffers(result).reduce(
    (sum, buffer) => sum + buffer.byteLength,
    0,
  );
  progress({ progress: 1, biologicalMs: c.solver.durationMs });
  return result;
}
