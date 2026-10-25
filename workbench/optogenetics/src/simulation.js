import { createActiveCable, stepActiveCable } from "../vendor/cortex/active-cable.js";
import { createChR2State, stepChR2, effectiveConductance, openFraction, chr2CurrentFactor, chr2SlopeFactor } from "./opsin.js";
import { lightAt, sourceGeometry, opticalCoordinates } from "./optics.js";

 const MODEL_VERSION = 'opto-lab/0.2.0';
 const TEMPERATURE_C = 34;
 const CONDITIONING_MS = 100;
 const SPIKE_THRESHOLD_MV = -25;
 const EVENT_REFRACTORY_MS = 2;
 const DEFAULT_CONFIG = Object.freeze({
  mode: 'neuron',
  protocol: 'train',
  durationMs: 250,
  onsetMs: 30,
  pulseWidthMs: 5,
  frequencyHz: 20,
  trainDurationMs: 150,
  pairGapMs: 50,
  expression: 'all',
  expressionSectionId: null,
  conductanceDensityScm2: 0.00035,
  clampMv: -60,
  dtMs: 0.005,
  sampleMs: 0.25,
  segmentLengthUm: 40,
  light: Object.freeze({
    kind: 'uniform', irradianceMwMm2: 1, powerMw: 0.05,
    positionUm: [-150, 0, 0], targetUm: [0, 0, 0], wavelengthNm: 470,
  }),
});

const enumValue = (value, allowed, label) => {
  if (!allowed.includes(value)) throw new Error(`${label} must be one of: ${allowed.join(', ')}.`);
  return value;
};
const bounded = (value, min, max, label) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw new Error(`${label} must be a finite number from ${min} to ${max}.`);
  return value;
};
const vector3 = (value, label) => {
  if (!Array.isArray(value) || value.length !== 3 || value.some(x => typeof x !== 'number' || !Number.isFinite(x)))
    throw new Error(`${label} must contain three finite coordinates in micrometers.`);
  return [...value];
};

 function validateConfig(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected an experiment configuration object.');
  if (input.light != null && (typeof input.light !== 'object' || Array.isArray(input.light))) throw new Error('Light must be a configuration object.');
  const c = { ...DEFAULT_CONFIG, ...input, light: { ...DEFAULT_CONFIG.light, ...input.light } };
  enumValue(c.mode, ['neuron', 'clamp'], 'Experiment mode');
  enumValue(c.protocol, ['single', 'train', 'paired', 'step'], 'Pulse protocol');
  enumValue(c.expression, ['all', 'soma', 'dendrites', 'apical', 'basal', 'axon', 'section'], 'Opsin distribution');
  if (c.expression === 'section' && (typeof c.expressionSectionId !== 'string' || !c.expressionSectionId || c.expressionSectionId.length > 120)) throw new Error('Select an anatomical section for restricted expression.');
  bounded(c.durationMs, 10, 1000, 'Recording duration (ms)');
  bounded(c.onsetMs, 0, c.durationMs, 'Light onset (ms)');
  bounded(c.pulseWidthMs, 0.1, 500, 'Pulse width (ms)');
  bounded(c.frequencyHz, 1, 200, 'Pulse frequency (Hz)');
  bounded(c.trainDurationMs, 0.1, 1000, 'Illumination epoch (ms)');
  bounded(c.pairGapMs, 0.1, 500, 'Dark interval between paired pulses (ms)');
  bounded(c.conductanceDensityScm2, 0, 0.01, 'Opsin conductance density (S/cm²)');
  bounded(c.clampMv, -100, 0, 'Ideal clamp voltage (mV)');
  bounded(c.dtMs, 0.0025, 0.05, 'Maximum integration timestep (ms)');
  bounded(c.sampleMs, 0.025, 2, 'Saved sample interval (ms)');
  if (c.sampleMs < c.dtMs) throw new Error('The saved sample interval must be at least the integration timestep.');
  enumValue(c.segmentLengthUm, [20, 40], 'Maximum compartment length (µm)');
  enumValue(c.light.kind, ['uniform', 'fiber'], 'Optical source');
  bounded(c.light.irradianceMwMm2, 0, 20, 'Uniform irradiance (mW/mm²)');
  bounded(c.light.powerMw, 0, 1, 'Fiber optical power (mW)');
  c.light.positionUm = vector3(c.light.positionUm, 'Source position');
  c.light.targetUm = vector3(c.light.targetUm, 'Source target');
  if (c.light.diameterUm !== undefined && c.light.diameterUm !== 100) throw new Error('The optical kernel supports a 100 µm fiber only.');
  if (c.light.na !== undefined && c.light.na !== 0.22) throw new Error('The optical kernel supports NA 0.22 only.');
  if (c.light.wavelengthNm !== 470) throw new Error('This release implements the 470 nm ChR2(H134R) model only.');
  if (c.light.kind === 'fiber' && Math.hypot(...c.light.positionUm.map((x, i) => x - c.light.targetUm[i])) < 1e-6)
    throw new Error('The fiber position and aiming point must be different.');
  if (c.protocol === 'train' && c.pulseWidthMs > 1000 / c.frequencyHz)
    throw new Error('Pulse width exceeds the pulse period. Choose a lower frequency or shorter pulse.');
  const end = c.protocol === 'single' ? c.onsetMs + c.pulseWidthMs
    : c.protocol === 'paired' ? c.onsetMs + 2 * c.pulseWidthMs + c.pairGapMs
      : c.onsetMs + c.trainDurationMs;
  if (end > c.durationMs + 1e-9)
    throw new Error('The complete illumination protocol must fit inside the recording duration.');
  if (c.protocol === 'train' && c.trainDurationMs < c.pulseWidthMs)
    throw new Error('The illumination epoch must contain at least one complete pulse.');
  if (c.mode === 'clamp') { c.light.kind = 'uniform'; c.expression = 'all'; c.expressionSectionId = null; }
  return c;
}

 function pulseIntervals(config) {
  const c = config;
  if (c.protocol === 'single') return [{ startMs: c.onsetMs, endMs: c.onsetMs + c.pulseWidthMs }];
  if (c.protocol === 'paired') return [
    { startMs: c.onsetMs, endMs: c.onsetMs + c.pulseWidthMs },
    { startMs: c.onsetMs + c.pulseWidthMs + c.pairGapMs, endMs: c.onsetMs + 2 * c.pulseWidthMs + c.pairGapMs },
  ];
  if (c.protocol === 'step') return [{ startMs: c.onsetMs, endMs: c.onsetMs + c.trainDurationMs }];
  const period = 1000 / c.frequencyHz, end = c.onsetMs + c.trainDurationMs, pulses = [];
  for (let k = 0; ; k++) {
    const startMs = c.onsetMs + k * period;
    if (startMs + c.pulseWidthMs > end + 1e-9) break;
    pulses.push({ startMs, endMs: startMs + c.pulseWidthMs });
    if (pulses.length > 1000) throw new Error('Too many pulses.');
  }
  return pulses;
}

 function pulseAt(timeMs, pulses) {
  return pulses.some(p => timeMs >= p.startMs - 1e-10 && timeMs < p.endMs - 1e-10) ? 1 : 0;
}

 function resolveNodes(model, config = DEFAULT_CONFIG) {
  const nodes = model?.variants?.[String(config.segmentLengthUm ?? 40)];
  if (!Array.isArray(nodes) || !nodes.length || !model?.fit?.genome)
    throw new Error('The documented cell morphology and fitted channels could not be loaded.');
  if (config.mode === 'clamp') {
    const soma = nodes.find(n => n.sectionType === 'soma' && n.areaUm2 > 0);
    return [{ ...soma, id: 'ideal-clamp-patch', parent: -1, edgeUs: 0, sectionId: 'ideal-clamp-patch', sectionType: 'soma' }];
  }
  return nodes;
}

 function expressionFactor(node, distribution, sectionId = null) {
  if (!(node.areaUm2 > 0)) return 0;
  if (distribution === 'all') return 1;
  if (distribution === 'soma') return node.sectionType === 'soma' ? 1 : 0;
  if (distribution === 'apical') return node.sectionType === 'apic' ? 1 : 0;
  if (distribution === 'basal') return node.sectionType === 'dend' ? 1 : 0;
  if (distribution === 'axon') return node.sectionType === 'axon' ? 1 : 0;
  if (distribution === 'section') return node.sectionId === sectionId ? 1 : 0;
  return distribution === 'dendrites' && (node.sectionType === 'dend' || node.sectionType === 'apic') ? 1 : 0;
}

 function analyzePulses(spikes, pulses, durationMs) {
  const used = new Set(), associations = pulses.map((p, index) => {
    const windowEndMs = Math.min(durationMs, p.startMs + 20, pulses[index + 1]?.startMs ?? Infinity);
    const eligible = spikes.map((s, k) => ({ ...s, index: k }))
      .filter(s => s.timeMs >= p.startMs && s.timeMs < windowEndMs && !used.has(s.index));
    const first = eligible[0];
    if (first) used.add(first.index);
    return { pulse: index + 1, onsetMs: p.startMs, windowEndMs, eventTimeMs: first?.timeMs ?? null,
      latencyMs: first ? first.timeMs - p.startMs : null, matched: Boolean(first), eventCount: eligible.length, extraCount: Math.max(0, eligible.length - 1) };
  });
  const matched = associations.filter(a => a.matched), latencies = matched.map(a => a.latencyMs);
  const meanLatencyMs = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null;
  return {
    pulseCount: pulses.length, matchedPulses: matched.length, missedPulses: pulses.length - matched.length,
    extraEvents: spikes.filter((_, i) => !used.has(i)).length,
    exactlyOnePulses: associations.filter(a => a.eventCount === 1).length,
    exactlyOneFraction: pulses.length ? associations.filter(a => a.eventCount === 1).length / pulses.length : null,
    followingFraction: pulses.length ? matched.length / pulses.length : null,
    meanLatencyMs,
    latencySdMs: latencies.length > 1 ? Math.sqrt(latencies.reduce((s, l) => s + (l - meanLatencyMs) ** 2, 0) / latencies.length) : null,
    associations,
    convention: 'First upward −25 mV soma event in [onset, min(onset + 20 ms, next onset)); one-to-one temporal association, not proof of causation. Other events are extra events.',
  };
}

const conditionCache = new Map();
const stateKeys = ['voltageMv', 'gates', 'sodium', 'calciumMm', 'membraneCurrentNa', 'extraGates'];
function conditionCable(cable, config, model, progress) {
  const key = [model.id, model.sourceCommit, config.segmentLengthUm, config.dtMs].join(':');
  const cached = conditionCache.get(key);
  if (cached) {
    for (const name of stateKeys) if (cable[name] && cached[name]) cable[name].set(cached[name]);
    progress?.({ progress: 0.15, stage: 'Reused identical dark conditioning', timeMs: 0 });
    return 'reused identical state';
  }
  let t = 0, count = 0;
  while (t < CONDITIONING_MS - 1e-10) {
    const dt = Math.min(config.dtMs, CONDITIONING_MS - t);
    stepActiveCable(cable, dt);
    t += dt; count++;
    if (count % 500 === 0) progress?.({ progress: 0.15 * t / CONDITIONING_MS, stage: 'Conditioning the neuron in darkness', timeMs: 0 });
  }
  const snapshot = {};
  for (const name of stateKeys) if (cable[name]) snapshot[name] = cable[name].slice();
  if (conditionCache.size >= 6) conditionCache.delete(conditionCache.keys().next().value);
  conditionCache.set(key, snapshot);
  return 'computed';
}

function prepareResult(model, config, nodes, light, pulses) {
  const time = [];
  for (let k = 0; k * config.sampleMs < config.durationMs - 1e-9; k++) time.push(k * config.sampleMs);
  time.push(config.durationMs);
  const n = nodes.length, frames = time.length;
  const bytes = frames * n * 4 * 4 + frames * 8 * 4 + n * 8 * 3 + (config.mode === 'clamp' ? frames * 5 * 8 : 0);
  if (bytes > 64 * 1024 * 1024) throw new Error('This experiment would exceed 64 MiB of output. Shorten the recording or increase the saved sample interval.');
  return {
    version: MODEL_VERSION, config, modelId: model.id, specimenId: model.specimenId,
    sourceCommit: model.sourceCommit, sourceHashes: model.sourceHashes,
    nodes, n, frames, somaIndex: nodes.findIndex(node => node.areaUm2 > 0 && node.sectionType === 'soma'),
    timeMs: Float64Array.from(time),
    voltageMv: new Float32Array(n * frames), photocurrentNa: new Float32Array(n * frames),
    openFraction: new Float32Array(n * frames), effectiveOpen: new Float32Array(n * frames),
    somaVoltageMv: new Float64Array(frames), totalPhotocurrentNa: new Float64Array(frames),
    lightDrive: new Float64Array(frames), lightMwMm2: light,
    sourceGeometry: sourceGeometry(config.mode === 'clamp' ? { ...config.light, kind: 'uniform' } : config.light),
    expressionDensityScm2: Float64Array.from(nodes, node => config.conductanceDensityScm2 * (config.mode === 'clamp' ? 1 : expressionFactor(node, config.expression, config.expressionSectionId))),
    pulses, spikes: [], pulseMetrics: null,
    opsinStates: config.mode === 'clamp' ? new Float64Array(frames * 5) : null,
    localDoseUjMm2: Float64Array.from(light, value => value * pulses.reduce((s,p)=>s+p.endMs-p.startMs,0)),
    diagnostics: {
      temperatureC: TEMPERATURE_C, conditioningMs: config.mode === 'clamp' ? 0 : CONDITIONING_MS,
      outputBytes: bytes, integrationSteps: 0, maximumKclResidualNa: 0,
      maximumLinearizedCurrentErrorNa: 0, maximumTruePhotocurrentNa: 0,
      peakVoltageMv: -Infinity, minVoltageMv: Infinity, peakInwardPhotocurrentNa: 0,
      sourceEnergyUj: config.mode === 'neuron' && config.light.kind === 'fiber' ? config.light.powerMw * pulses.reduce((s,p)=>s+p.endMs-p.startMs,0) : null,
      photonDoseScaleMs: pulses.reduce((sum, p) => sum + p.endMs - p.startMs, 0),
      clampPatchAreaUm2: config.mode === 'clamp' ? nodes[0].areaUm2 : null,
      opticalKernelOutsideCount: config.mode === 'neuron' && config.light.kind === 'fiber'
        ? nodes.filter(node => node.areaUm2 > 0 && !opticalCoordinates(node.centerUm, config.light).insideKernel).length : 0,
      limitations: [
        'Published human dendrites and fitted membrane channels; synthetic 60 µm axon stub. No complete human axon or independent optical-response validation.',
        'ChR2 expression density and localization are user assumptions, not measurements from this specimen.',
        'Selected mesh refinement (40 → 20 µm) shifted a single-pulse spike by 0.220 ms and changed soma waveform RMS by 2.80 mV. Thresholds and full traces are not globally mesh-converged.',
        'Fixed 34 °C membrane mechanisms; one-photon 470 nm ChR2(H134R) only. No heating, synapses, detector electronics, or trial noise.',
        'The Williams fit was characterized at −80 to −10 mV and 0.34–5.5 mW/mm², with temperature scaling fitted at 22 and 37 °C. This neuron\'s resting and action-potential voltages include mathematical extrapolation outside that voltage range.',
      ],
    },
  };
}

 function runExperiment(model, input = {}, onProgress) {
  const started = globalThis.performance?.now?.() ?? Date.now();
  const config = validateConfig(input), nodes = resolveNodes(model, config), n = nodes.length;
  if (config.expression === 'section' && !nodes.some(n => n.areaUm2 > 0 && n.sectionId === config.expressionSectionId)) throw new Error('The selected expression section is absent from this morphology.');
  const pulses = pulseIntervals(config), light = Float64Array.from(nodes, node => {
    if (!(node.areaUm2 > 0)) return 0;
    const value = config.mode === 'clamp' ? config.light.irradianceMwMm2 : lightAt(node.centerUm, config.light);
    if (!Number.isFinite(value) || value < 0) throw new Error('Optical calculation returned invalid local exposure.');
    if (value > 100) throw new Error('Local optical exposure exceeds the supported numerical range of 100 mW/mm². Reduce source power or increase source distance.');
    return value;
  });
  const result = prepareResult(model, config, nodes, light, pulses);
  const state = createChR2State(n);
  const gbar = Float64Array.from(nodes, (node, i) => result.expressionDensityScm2[i] * node.areaUm2 * 0.01);
  const activeIndices = nodes.map((_, i) => i).filter(i => gbar[i] > 0);
  const cable = config.mode === 'neuron' ? createActiveCable(nodes, model.fit) : null;
  const voltage = cable?.voltageMv ?? new Float64Array(1).fill(config.clampMv);
  if (cable) result.diagnostics.conditioning = conditionCable(cable, config, model, onProgress);
  const tangent = new Float64Array(n), offset = new Float64Array(n), oldBase = new Float64Array(n), kcl = new Float64Array(n);
  const soma = result.somaIndex;
  result.diagnostics.initialSomaVoltageMv = voltage[soma];
  const edges = [...new Set(pulses.flatMap(p => [p.startMs, p.endMs]))].sort((a, b) => a - b);
  let edgeIndex = 0, t = 0, lastEvent = -Infinity, count = 0;

  function save(frame) {
    const at = frame * n;
    if (result.opsinStates) result.opsinStates.set(state.subarray(0,5),frame * 5);
    result.voltageMv.set(voltage, at);
    result.somaVoltageMv[frame] = voltage[soma];
    result.lightDrive[frame] = pulseAt(result.timeMs[frame], pulses);
    let whole = 0;
    for (const i of activeIndices) {
      const effective = effectiveConductance(state, i), current = gbar[i] * effective * chr2CurrentFactor(voltage[i]);
      result.photocurrentNa[at + i] = current;
      result.openFraction[at + i] = openFraction(state, i);
      result.effectiveOpen[at + i] = effective;
      whole += current;
    }
    result.totalPhotocurrentNa[frame] = whole;
    result.diagnostics.peakInwardPhotocurrentNa = Math.min(result.diagnostics.peakInwardPhotocurrentNa, whole);
  }
  save(0);
  for (let frame = 1; frame < result.frames; frame++) {
    const nextSample = result.timeMs[frame];
    while (t < nextSample - 1e-9) {
      while (edgeIndex < edges.length && edges[edgeIndex] <= t + 1e-9) edgeIndex++;
      const dt = Math.min(config.dtMs, nextSample - t, (edges[edgeIndex] ?? Infinity) - t);
      if (!(dt > 0)) throw new Error('Pulse timing could not be resolved.');
      const drive = pulseAt(t + dt * 0.5, pulses);
      const previousSoma = voltage[soma];
      if (cable) {
        for (const i of activeIndices) {
          const base = gbar[i] * effectiveConductance(state, i), v = voltage[i];
          oldBase[i] = base;
          tangent[i] = base * chr2SlopeFactor(v);
          offset[i] = base * chr2CurrentFactor(v) - tangent[i] * v;
        }
        stepActiveCable(cable, dt, { synapticUs: tangent, synapseReversalMv: 0, membraneOffsetNa: offset });
        // Discrete conservation uses the exact linearized current included in
        // the implicit voltage matrix. The instantaneous saved current below
        // evaluates the published nonlinear function at each saved state.
        kcl.set(cable.membraneCurrentNa);
        for (let i = 0; i < n; i++) if (nodes[i].parent >= 0) {
          const p = nodes[i].parent, outward = nodes[i].edgeUs * (voltage[i] - voltage[p]);
          kcl[i] += outward; kcl[p] -= outward;
        }
        for (let i = 0; i < n; i++) result.diagnostics.maximumKclResidualNa = Math.max(result.diagnostics.maximumKclResidualNa, Math.abs(kcl[i]));
        for (const i of activeIndices) {
          const trueCurrent = oldBase[i] * chr2CurrentFactor(voltage[i]);
          result.diagnostics.maximumTruePhotocurrentNa = Math.max(result.diagnostics.maximumTruePhotocurrentNa, Math.abs(trueCurrent));
          result.diagnostics.maximumLinearizedCurrentErrorNa = Math.max(result.diagnostics.maximumLinearizedCurrentErrorNa,
            Math.abs(trueCurrent - (tangent[i] * voltage[i] + offset[i])));
        }
      }
      let wholeCurrent = 0;
      for (const i of activeIndices) {
        const effective = stepChR2(state, i, voltage[i], light[i] * drive, dt, TEMPERATURE_C);
        const current = gbar[i] * effective * chr2CurrentFactor(voltage[i]);
        if (!Number.isFinite(current)) throw new Error('The optical membrane current is not finite. Reduce exposure or refine the integration timestep.');
        wholeCurrent += current;
        result.diagnostics.maximumTruePhotocurrentNa = Math.max(result.diagnostics.maximumTruePhotocurrentNa, Math.abs(current));
      }
      result.diagnostics.peakInwardPhotocurrentNa = Math.min(result.diagnostics.peakInwardPhotocurrentNa, wholeCurrent);
      const newTime = t + dt, vSoma = voltage[soma];
      if (cable && previousSoma < SPIKE_THRESHOLD_MV && vSoma >= SPIKE_THRESHOLD_MV) {
        const crossing = t + dt * (SPIKE_THRESHOLD_MV - previousSoma) / (vSoma - previousSoma);
        if (crossing - lastEvent >= EVENT_REFRACTORY_MS) {
          result.spikes.push({ timeMs: crossing, compartmentId: nodes[soma].id }); lastEvent = crossing;
        }
      }
      result.diagnostics.peakVoltageMv = Math.max(result.diagnostics.peakVoltageMv, vSoma);
      result.diagnostics.minVoltageMv = Math.min(result.diagnostics.minVoltageMv, vSoma);
      t = newTime; count++;
    }
    t = nextSample;
    save(frame);
    if (frame % 20 === 0 || frame === result.frames - 1)
      onProgress?.({ progress: 0.15 + 0.85 * t / config.durationMs, stage: config.mode === 'clamp' ? 'Solving the ideal channel clamp' : 'Solving light-sensitive membrane currents', timeMs: t });
  }
  result.pulseMetrics = config.mode === 'clamp' ? null : analyzePulses(result.spikes, pulses, config.durationMs);
  result.diagnostics.integrationSteps = count;
  result.diagnostics.spikeCount = result.spikes.length;
  result.diagnostics.maxLocalLightMwMm2 = Math.max(...light);
  result.diagnostics.outputBytes=Object.values(result).filter(ArrayBuffer.isView).reduce((total,array)=>total+array.byteLength,0);
  result.diagnostics.computationMs = (globalThis.performance?.now?.() ?? Date.now()) - started;
  result.diagnostics.minimumProbability = Infinity;
  result.diagnostics.maximumProbabilitySumError = 0;
  for (const i of activeIndices) {
    const j=5*i; const sum=state[j]+state[j+1]+state[j+2]+state[j+3];
    result.diagnostics.minimumProbability=Math.min(result.diagnostics.minimumProbability,...state.subarray(j,j+4));
    result.diagnostics.maximumProbabilitySumError=Math.max(result.diagnostics.maximumProbabilitySumError,Math.abs(sum-1));
  }
  if (!activeIndices.length) result.diagnostics.minimumProbability=0;
  result.diagnostics.opsinExtrapolation = {voltageFitRangeMv: [-80,-10], irradianceFitRangeMwMm2: [0.34,5.5], appliedCurrentFactorAtZeroMv: chr2CurrentFactor(0), statement:'Fit retained exactly, including voltage extrapolation and photon-loss factor 1.3. Not an experimentally calibrated optical threshold.'};
  result.diagnostics.eventDefinition = 'Upward soma crossing of −25 mV, interpolated at integration resolution, with a 2 ms event refractory interval.';
  result.diagnostics.outputConvention = 'States at saved physical times; lightDrive is right-continuous. Pulses split integration timesteps at their exact boundaries. Instantaneous nonlinear photocurrent is evaluated from saved channel state and voltage.';
  result.diagnostics.operatorConvention = 'Native membrane state at t drives backward-Euler voltage at t+dt; opsin and native gates then advance using new voltage. ChR2 current is tangent-linearized at old voltage; its maximum current discrepancy is reported.';
  if (config.mode === 'clamp') result.diagnostics.limitations.unshift('Ideal isopotential membrane patch with the source soma area; not a space-clamped branched cell. Clamp irradiance is uniform and expression is uniform within this patch.');
  return result;
}
















export { MODEL_VERSION, TEMPERATURE_C, CONDITIONING_MS, SPIKE_THRESHOLD_MV, EVENT_REFRACTORY_MS, DEFAULT_CONFIG, validateConfig, pulseIntervals, pulseAt, resolveNodes, expressionFactor, analyzePulses, runExperiment, conditionCable };
