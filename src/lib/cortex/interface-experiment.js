import { freshActiveConfig } from './config.js';
import { makeActiveMorphology } from './active-morphology.js';
import { createActiveCable, stepActiveCable } from './active-cable.js';
import { getActiveModel, loadActiveModels } from './model-library.js';
import { getModelMetadata } from './model-registry.js';
import { createInterfaceField, INTERFACE_DESIGN } from './interface-field.js';
import { INTERFACE_PRESETS } from './interface-presets.js';
import { INTERFACE_VERSION, freshInterfaceConfig } from './interface-contract.js';
export { INTERFACE_VERSION, INTERFACE_DEFAULT, freshInterfaceConfig } from './interface-contract.js';

export function validateInterfaceConfig(input) {
  const config = { ...freshInterfaceConfig(), ...input };
  if (config.version !== INTERFACE_VERSION) throw new Error('Unsupported interface experiment version.');
  const range = (key, low, high) => {
    if (!Number.isFinite(config[key]) || config[key] < low || config[key] > high)
      throw new Error(`${key} must be between ${low} and ${high}.`);
  };
  range('count', 1, INTERFACE_PRESETS.length);
  if (!Number.isInteger(config.count)) throw new Error('Select a whole number of cells.');
  if (!['recording', 'evoked', 'combined'].includes(config.mode)) throw new Error('Unknown experiment mode.');
  range('amplitudeUa', 0, 100); range('phaseUs', 100, 1000); range('gapUs', 0, 1000);
  range('frequencyHz', 1, 100); range('startMs', 0, 200); range('durationMs', 20, 300);
  range('conductivitySm', .1, 1); range('clearanceUm', 25, 200);
  // Preset calibration and replay sizes are bound to these numerical settings.
  if (config.dtMs !== .005 || config.sampleMs !== .1 || config.settleMs !== 100 ||
      config.segmentLengthUm !== 40 || config.panelDivisions !== 4)
    throw new Error('This experiment requires the documented calibrated solver and field resolution.');
  if (!Array.isArray(config.activeContacts) || config.activeContacts.some(i => !Number.isInteger(i) || i < 0 || i > 7))
    throw new Error('Contact indices must be between 0 and 7.');
  config.activeContacts = [...new Set(config.activeContacts)].sort((a, b) => a - b);
  if (config.mode !== 'recording' && !config.activeContacts.length) throw new Error('Select at least one stimulation contact.');
  for (const key of ['phaseUs', 'gapUs'])
    if (Math.abs(config[key] / (config.dtMs * 1000) - Math.round(config[key] / (config.dtMs * 1000))) > 1e-7)
      throw new Error('Pulse edges must align to the 5 µs integration step.');
  return config;
}

export async function loadInterfaceModels(config, readAsset) {
  await loadActiveModels(INTERFACE_PRESETS.slice(0, config.count).map(p => p.modelId), config.segmentLengthUm, readAsset);
}

/** Rigid placement of complete reconstructions. No pruning, rescaling or hidden exclusions. */
export function makeInterfaceCells(input) {
  const config = validateInterfaceConfig(input);
  return INTERFACE_PRESETS.slice(0, config.count).map((preset, index) => {
    const c = freshActiveConfig();
    c.neuron.modelId = preset.modelId; c.membrane.sourceModelId = preset.modelId;
    c.neuron.segmentLengthUm = config.segmentLengthUm;
    c.neuron.somaUm = [0, 0, 0]; c.neuron.rotationDeg = [0, 0, 0];
    const local = makeActiveMorphology(c);
    let minimumY = Infinity;
    for (const node of local.nodes) for (let j = 0; j < node.pathUm.length; j++)
      minimumY = Math.min(minimumY, node.pathUm[j][1] - (node.pathDiameterUm?.[j] ?? node.diameterUm) / 2);
    // Six depths, one cell on each side. Positions are a test layout, not an anatomical census.
    const somaUm = [(index % 2 ? 1 : -1) * (100 + 35 * (Math.floor(index / 2) % 2)),
      config.clearanceUm - minimumY, 270 + Math.floor(index / 2) * 225];
    c.neuron.somaUm = somaUm;
    const world = makeActiveMorphology(c), metadata = getModelMetadata(preset.modelId);
    return { ...world, id: preset.modelId, label: `Cell ${index + 1}`, specimenId: metadata.specimenId,
      cellType: metadata.cellType, layer: metadata.layer, somaUm, preset,
      source: metadata.source, citation: metadata.citation, sourceScope: metadata.scope };
  });
}

/** Charge-balanced, cathodic-first train. Total current is shared equally between selected pads. */
export function interfacePulse(config, timeMs) {
  if (config.mode === 'recording' || timeMs < config.startMs) return 0;
  const period = 1000 / config.frequencyHz, phase = config.phaseUs / 1000, gap = config.gapUs / 1000;
  const pulseIndex = Math.floor((timeMs - config.startMs + 1e-10) / period);
  const pulseStart = config.startMs + pulseIndex * period;
  // Do not start a partial biphasic pulse at the end of the recording window.
  if (pulseStart + 2 * phase + gap > config.durationMs + 1e-9) return 0;
  const age = timeMs - pulseStart;
  return age < phase - 1e-9 ? -config.amplitudeUa : age < phase + gap - 1e-9 ? 0
    : age < 2 * phase + gap - 1e-9 ? config.amplitudeUa : 0;
}

const stateFields = ['voltageMv', 'previous', 'membraneCurrentNa', 'ionicNa', 'potassiumNa',
  'calciumNa', 'hcnNa', 'leakNa', 'capacitiveNa', 'gates', 'sodium', 'calciumMm', 'extraGates'];
const conditionedStates = new Map();
let cachedField;
export function runInterfaceExperiment(input, progress = () => {}) {
  const config = validateInterfaceConfig(input), started = performance.now();
  const cells = makeInterfaceCells(config), nc = INTERFACE_DESIGN.contacts.length;
  const fieldKey = `${config.conductivitySm}:${config.panelDivisions}`;
  if (cachedField?.key !== fieldKey) cachedField = { key: fieldKey, value: createInterfaceField(config) };
  const field = cachedField.value;
  const sampleEvery = Math.round(config.sampleMs / config.dtMs), steps = Math.round(config.durationMs / config.dtMs);
  const frames = Math.floor(steps / sampleEvery) + 1;
  const timeMs = Float64Array.from({ length: frames }, (_, i) => i * config.sampleMs);
  const neuralUv = new Float64Array(frames * nc), artifactUv = new Float64Array(frames * nc);
  const currentUa = new Float64Array(frames * nc);
  for (let f = 0; f < frames; f++) {
    // Samples describe the just-completed integration interval, including its
    // drive/artifact. Frame zero is the conditioned, pre-protocol state.
    const total = f === 0 ? 0 : interfacePulse(config, timeMs[f] - config.dtMs / 2);
    const share = total / Math.max(1, config.activeContacts.length);
    for (const k of config.activeContacts) currentUa[f * nc + k] = share;
    for (let k = 0; k < nc; k++) for (const j of config.activeContacts)
      artifactUv[f * nc + k] += field.contactTransferMvPerUa[k * nc + j] * share * 1000;
  }
  const outputCells = [];
  const totalNodes = cells.reduce((s, c) => s + c.nodes.length, 0);
  if (totalNodes * frames * 4 > 160 * 1024 ** 2) throw new Error('The full compartment replay exceeds the 160 MB memory budget.');
  for (let ci = 0; ci < cells.length; ci++) {
    const cell = cells[ci], model = getActiveModel(cell.id), n = cell.nodes.length;
    progress({ stage: 'cell', cell: ci + 1, count: cells.length, message: `Solving cell ${ci + 1} of ${cells.length} · ${cell.specimenId}` });
    for (const node of cell.nodes) for (let j = 0; j < node.pathUm.length; j++)
      if (!field.supportsPoint(node.pathUm[j], (node.pathDiameterUm?.[j] ?? node.diameterUm) / 2))
        throw new Error(`Cell ${ci + 1} crosses the supported tissue half-space. No cells were omitted.`);
    const prepared = field.prepare(cell.nodes.map(node => node.centerUm));
    if (!prepared.supported) throw new Error(`Cell ${ci + 1}: finite-contact sampling failed.`);
    const coefficients = prepared.coefficients, unitExtracellular = new Float64Array(n);
    for (let i = 0; i < n; i++) for (const k of config.activeContacts)
      unitExtracellular[i] += coefficients[i * nc + k] / Math.max(1, config.activeContacts.length);
    const cable = createActiveCable(cell.nodes, model.fit, { kv2TauGuard: model.kv2TauGuard !== false });
    const cached = conditionedStates.get(cell.id);
    if (cached) for (const [key, values] of Object.entries(cached)) cable[key].set(values);
    else {
      for (let s = 0; s < Math.round(config.settleMs / config.dtMs); s++) stepActiveCable(cable, config.dtMs);
      conditionedStates.set(cell.id, Object.fromEntries(stateFields.filter(k => cable[k]).map(k => [k, cable[k].slice()])));
    }
    const membraneMv = new Float32Array(frames * n), somaMv = new Float32Array(frames);
    const somaSodiumNa = new Float32Array(frames), somaPotassiumNa = new Float32Array(frames);
    const somaCalciumNa = new Float32Array(frames), somaInjectionNa = new Float32Array(frames);
    const injectionNa = new Float64Array(n), extracellularMv = new Float64Array(n);
    const events = [];
    let lastCrossing = -Infinity, minMv = Infinity, maxMv = -Infinity, applied = NaN;
    const onsetMs = cell.preset.phaseMs ?? ci * 2;
    const drive = config.mode === 'evoked' ? 0 : cell.preset.backgroundNa;
    const sample = (frame) => {
      membraneMv.set(cable.voltageMv, frame * n); somaMv[frame] = cable.voltageMv[cell.somaIndex];
      somaSodiumNa[frame] = cable.ionicNa[cell.somaIndex]; somaPotassiumNa[frame] = cable.potassiumNa[cell.somaIndex];
      somaCalciumNa[frame] = cable.calciumNa[cell.somaIndex]; somaInjectionNa[frame] = injectionNa[cell.somaIndex];
      for (let i = 0; i < n; i++) {
        const current = cable.membraneCurrentNa[i];
        for (let k = 0; k < nc; k++) neuralUv[frame * nc + k] += current * coefficients[i * nc + k];
      }
    };
    sample(0);
    for (let s = 0; s < steps; s++) {
      const time = s * config.dtMs, nextTime = (s + 1) * config.dtMs;
      const total = interfacePulse(config, time + config.dtMs / 2);
      if (total !== applied) {
        for (let i = 0; i < n; i++) extracellularMv[i] = total * unitExtracellular[i];
        applied = total;
      }
      injectionNa[cell.somaIndex] = time + 1e-9 >= onsetMs ? drive : 0;
      const previous = cable.voltageMv[cell.somaIndex];
      stepActiveCable(cable, config.dtMs, { extracellularMv, injectionNa });
      const voltage = cable.voltageMv[cell.somaIndex];
      minMv = Math.min(minMv, voltage); maxMv = Math.max(maxMv, voltage);
      if (previous < -25 && voltage >= -25 && nextTime - lastCrossing >= 2) {
        lastCrossing = time + config.dtMs * (-25 - previous) / (voltage - previous);
        events.push({ timeMs: lastCrossing, peakMv: voltage, repolarized: false });
      }
      for (let e = events.length - 1; e >= 0 && nextTime - events[e].timeMs < 20; e--) {
        if (nextTime - events[e].timeMs <= 3) events[e].peakMv = Math.max(events[e].peakMv, voltage);
        if (voltage < -40) events[e].repolarized = true;
      }
      if ((s + 1) % sampleEvery === 0) sample((s + 1) / sampleEvery);
    }
    outputCells.push({ id: cell.id, specimenId: cell.specimenId, label: cell.label, nodes: cell.nodes,
      somaIndex: cell.somaIndex, somaUm: cell.somaUm, cellType: cell.cellType, layer: cell.layer,
      source: cell.source, sourceHashes: cell.sourceHashes, sourceScope: cell.sourceScope,
      backgroundNa: drive, backgroundStartMs: onsetMs, membraneMv, somaMv,
      somaSodiumNa, somaPotassiumNa, somaCalciumNa, somaInjectionNa,
      events, spikeTimesMs: events.filter(e => e.peakMv >= 0 && e.repolarized).map(e => e.timeMs),
      somaRangeMv: [minMv, maxMv] });
  }
  return { version: INTERFACE_VERSION, config, design: INTERFACE_DESIGN, timeMs,
    currentUa, neuralUv, artifactUv, cells: outputCells, fieldMetadata: field.metadata,
    elapsedSeconds: (performance.now() - started) / 1000, compartments: totalNodes,
    provenance: { cable: 'Original Cortex Laboratory active-cable.js, source-fitted human channels and morphology',
      field: 'Joint finite rectangular contact BEM, infinite insulating backing, isotropic half-space, distant return',
      recording: 'Reciprocal lead field × outward total compartment membrane current; point source per compartment; ideal infinite-impedance sensing',
      drive: 'Explicit calibrated somatic intracellular current; independent cells, no synaptic network',
      scope: 'Exploratory model. This complete interface configuration has not been independently validated against native NEURON, FEM, or tissue.' } };
}

export function interfaceBuffers(result) {
  const buffers = new Set();
  const visit = value => {
    if (ArrayBuffer.isView(value)) buffers.add(value.buffer);
    else if (value && typeof value === 'object') for (const child of Object.values(value)) visit(child);
  };
  visit(result); return [...buffers];
}
