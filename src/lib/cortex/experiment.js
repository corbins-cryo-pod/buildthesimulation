import { ENGINE_VERSION, validateConfig } from './config.js';
import { makeWorld } from './world.js';
import { createPassiveCable, stepPassiveCable } from './passive-cable.js';
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
export function runExperiment(input, progress = () => {}) {
  const started = performance.now(),
    world = makeWorld(input),
    c = world.config;
  const { nodes } = world.neuron,
    n = nodes.length;
  const selected = c.recording.contactIds.map((id) => world.contacts.find((s) => s.id === id));
  const stimulating = c.protocol.sourceContactIds.map((id) =>
    world.contacts.find((s) => s.id === id),
  );
  const sigma = c.tissue.conductivitySPerM,
    cable = createPassiveCable(nodes, c.membrane);
  const lead = leadField(nodes, selected, sigma, c.recording.sourceModel, c.recording.exclusionUm);
  const stimulationMode = c.protocol.mode === 'extracellular-stimulation';
  if (stimulationMode) leadField(nodes, stimulating, sigma, 'point', c.recording.exclusionUm); // explicit near-field rejection
  const unitFieldMv = Float64Array.from(nodes, (node) =>
    stimulationMode
      ? pointTransferUvPerNa(node.centerUm, stimulating[0].positionUm, sigma) -
        pointTransferUvPerNa(node.centerUm, stimulating[1].positionUm, sigma)
      : 0,
  );
  const artifactPerUa = selected.map((site) =>
    stimulationMode
      ? 1000 *
        (pointTransferUvPerNa(site.positionUm, stimulating[0].positionUm, sigma) -
          pointTransferUvPerNa(site.positionUm, stimulating[1].positionUm, sigma))
      : 0,
  );
  const injectionMode = c.protocol.mode === 'intracellular-current';
  if (
    injectionMode &&
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
    frames = steps + 1;
  const result = {
    schemaVersion: 'cortex-result/1',
    engineVersion: ENGINE_VERSION,
    config: c,
    modelStatus: {
      implemented: true,
      verification:
        'Analytical/convergence tests and fixed NEURON 9.0.1 / LFPykit 0.6.2 reference cases; not a guarantee for arbitrary configurations.',
      experimentalValidation: 'none',
      fidelity: 'exploratory passive cable; homogeneous infinite conductor',
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
  result.membraneMv.set(cable.voltageMv);
  const extracellularMv = new Float64Array(n),
    injectionNa = new Float64Array(n),
    synapticUs = new Float64Array(n);
  for (let k = 0; k < steps; k++) {
    const t = k * c.solver.dtMs,
      dt = Math.min(c.solver.dtMs, c.solver.durationMs - t),
      frame = k + 1;
    const gate = windowAverage(t, dt, c.protocol.startMs, c.protocol.durationMs);
    const currentUa = stimulationMode
      ? c.protocol.amplitudeUa * biphasicAverage(t, dt, c.protocol)
      : 0;
    const inject = injectionMode ? c.protocol.injectionNa * gate : 0;
    injectionNa.fill(0);
    injectionNa[0] = inject;
    for (let i = 0; i < n; i++)
      extracellularMv[i] = unitFieldMv[i] * currentUa - bathAtNodesMvPerNa[i] * inject;
    const synapseUs =
      c.protocol.mode === 'synaptic-recording' ? c.protocol.synapseNs * 0.001 * gate : 0;
    for (let i = 0; i < n; i++) synapticUs[i] = synapseUs * (nodes[i].synapseWeight ?? 0);
    stepPassiveCable(cable, dt, {
      extracellularMv,
      injectionNa,
      synapticUs,
      synapseReversalMv: c.protocol.synapseReversalMv,
    });
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
    const balance = cable.membraneCurrentNa.reduce((s, x) => s + x, 0) - inject;
    result.diagnostics.maxConservationResidualNa = Math.max(
      result.diagnostics.maxConservationResidualNa,
      Math.abs(balance),
    );
    const axial = new Float64Array(n);
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
      result.diagnostics.maxExcursionMv = Math.max(
        result.diagnostics.maxExcursionMv,
        Math.abs(cable.voltageMv[i] - c.membrane.restMv),
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
    if (k % 128 === 0) progress({ progress: (k + 1) / steps, biologicalMs: t + dt });
  }
  if (result.diagnostics.maxExcursionMv > 10)
    result.warnings.push(
      'Membrane excursion exceeds 10 mV. Active channels are absent; the passive solution is a mathematical extrapolation, not a spike prediction.',
    );
  if (c.solver.dtMs > c.protocol.phaseUs / 1000 / 4 && stimulationMode)
    result.warnings.push(
      'Fewer than four timesteps per stimulation phase. Refine dt before interpreting transient polarization.',
    );
  result.diagnostics.elapsedMs = performance.now() - started;
  result.diagnostics.wallSecondsPerBiologicalSecond =
    result.diagnostics.elapsedMs / c.solver.durationMs;
  for (const value of Object.values(result)) {
    if (ArrayBuffer.isView(value)) result.diagnostics.outputBytes += value.byteLength;
    else if (Array.isArray(value))
      for (const v of value)
        if (ArrayBuffer.isView(v)) result.diagnostics.outputBytes += v.byteLength;
  }
  progress({ progress: 1, biologicalMs: c.solver.durationMs });
  return result;
}

export function fieldSection(world, size = 45) {
  const c = world.config,
    sources = c.protocol.sourceContactIds.map((id) => world.contacts.find((s) => s.id === id));
  const widthUm = 1600,
    xCenter = c.neuron.somaUm[0],
    yUm = c.neuron.somaUm[1],
    zCenter = c.neuron.somaUm[2],
    values = [];
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++) {
      const pointUm = [
        xCenter + (col / (size - 1) - 0.5) * widthUm,
        yUm,
        zCenter + (row / (size - 1) - 0.5) * widthUm,
      ];
      if (sources.some((s) => distance(pointUm, s.positionUm) < c.recording.exclusionUm)) {
        values.push(null);
        continue;
      }
      const a = pointField(
          pointUm,
          sources[0].positionUm,
          -1000 * c.protocol.amplitudeUa,
          c.tissue.conductivitySPerM,
        ),
        b = pointField(
          pointUm,
          sources[1].positionUm,
          1000 * c.protocol.amplitudeUa,
          c.tissue.conductivitySPerM,
        );
      values.push({
        pointUm,
        potentialMv: a.voltageMv + b.voltageMv,
        fieldVPerM: a.fieldVPerM.map((v, i) => v + b.fieldVPerM[i]),
      });
    }
  return {
    size,
    widthUm,
    xCenter,
    yUm,
    zCenter,
    values,
    label: 'Leading-phase field, infinite homogeneous conductor; no tissue boundaries',
  };
}

export function resultCsv(result, component = 'total') {
  if (!['total', 'neural', 'applied'].includes(component))
    throw new Error('Unknown signal component.');
  const series = result[`${component}Uv`],
    n = result.diagnostics.compartments;
  const driveUnit =
    result.config.protocol.mode === 'extracellular-stimulation'
      ? 'uA'
      : result.config.protocol.mode === 'intracellular-current'
        ? 'nA'
        : 'nS';
  const header = [
    'time_ms',
    ...result.recordingSiteIds.map((id) => `${id}_${component}_uV`),
    `${component}_A_minus_B_uV`,
    'soma_mV',
    `drive_interval_average_${driveUnit}`,
    ...result.compartmentIds.map((id) => `${id}_outward_membrane_nA`),
  ];
  return [
    header.join(','),
    ...Array.from(result.timeMs, (t, k) =>
      [
        t,
        series[0][k],
        series[1][k],
        series[0][k] - series[1][k],
        result.membraneMv[k * n],
        result.drive[k],
        ...result.membraneCurrentNa.subarray(k * n, (k + 1) * n),
      ].join(','),
    ),
  ].join('\n');
}
export function resultBundle(result) {
  const world = makeWorld(result.config);
  return {
    ...result,
    units: {
      time: 'ms',
      membrane: 'mV',
      electrode: 'µV',
      membraneCurrent: 'nA',
      geometry: 'µm',
      drive:
        result.config.protocol.mode === 'extracellular-stimulation'
          ? 'µA'
          : result.config.protocol.mode === 'intracellular-current'
            ? 'nA'
            : 'nS',
    },
    coordinateSystem:
      'right-handed; +Z depth below pia; rotations X then Y then Z about the center of the tissue-facing substrate surface; all model positions µm',
    sampling:
      'frame 0 equilibrium; subsequent frames are step-end values, with interval-averaged drive/applied field; no ADC/filter model',
    assumptions: [
      'canonical synthetic arbor and layer fractions',
      'infinite homogeneous isotropic conductor',
      'passive sealed tree',
      'point sensing at Utah apices; exposed contact area unknown',
      'implant displacement and conductivity contrast omitted',
      'one-way applied field → membrane → ideal recording; no ephaptic feedback',
      'no action potentials, acquisition electronics, mechanics or experimental validation',
    ],
    anatomy: { layers: world.layers, sourceIds: ['wagstyl2020'] },
    implant: {
      ...result.config.implant,
      modelId: world.model.id,
      physicalContacts: world.model.physicalSites,
      simultaneousChannels: world.model.simultaneousChannels,
      channelMap: null,
      contacts: world.contacts,
      sources: world.model.sources,
      geometryNotes: world.model.notes,
    },
    morphology: world.neuron,
    evidenceRegistry,
    parameterDefaults: {
      role: 'Default evidence metadata; actual experiment values are in config',
      parameters: parameterRegistry,
    },
    sourceIds: [
      'linden2014',
      'anastassiou2010',
      'lfpy-api',
      'neuron-reference',
      'lfpykit-reference',
      'blackrock-utah',
    ],
  };
}
export const encodeJson = (data) =>
  JSON.stringify(data, (_key, v) => (ArrayBuffer.isView(v) ? Array.from(v) : v), 2);
export function parseConfig(text) {
  if (text.length > 100000)
    throw new Error('Import the configuration JSON (maximum 100 KB), not the full results file.');
  return validateConfig(JSON.parse(text));
}
