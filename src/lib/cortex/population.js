import { ACTIVE_MODEL_ID, ACTIVE_SCHEMA_VERSION } from './config.js';
import { makeWorld } from './world.js';
import { placementReport } from './placement.js';
import { runExperiment } from './experiment.js';
import { resultBuffers } from './buffers.js';
import { activeModelData } from './active-morphology.js';
import { modelRegistry } from './model-registry.js';
import { distance, pointField } from './volume-conductor.js';
import { getExampleConfig } from './examples.js';

export const POPULATION_SCHEMA = 'cortex-population/1';
export const POPULATION_LIMITS = Object.freeze({ maxCells: 64, nodeSteps: 200_000_000, summaryBytes: 16 * 1024 * 1024 });
export const freshPopulation = () => ({ schemaVersion: POPULATION_SCHEMA, count: 17, layout: 'cloud',
  center: 'stimulus-a', spacingUm: 100, nearUm: 1, farUm: 960, levels: 3, seed: 20261018 });
export function populationExampleConfig() {
  return getExampleConfig('extracellular-soma-spike');
}

// A placement experiment, not sampled cortical anatomy. Prefixes retain the
// same cells, dimensions, orientation and source specimen when count increases.
export function populationOffsets(count, spacingUm) {
  if (!Number.isInteger(count) || count < 1 || count > POPULATION_LIMITS.maxCells)
    throw new Error('Population count must be an integer from 1 to 64.');
  if (!Number.isFinite(spacingUm) || spacingUm < 75 || spacingUm > 400)
    throw new Error('Population spacing must be between 75 and 400 µm.');
  const offsets = [[0, 0, 0]];
  for (let ring = 1; offsets.length < count; ring++)
    for (let z = -ring; z <= ring; z++)
      for (let y = -ring; y <= ring; y++)
        for (let x = -ring; x <= ring; x++)
          if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) === ring && offsets.length < count)
            offsets.push([x * spacingUm, y * spacingUm, z * spacingUm]);
  return offsets;
}

export function distanceShellOffsets(settings) {
  const { count, nearUm, farUm, levels } = settings;
  populationOffsets(count, settings.spacingUm); // Shared count/spacing contract.
  if (!Number.isInteger(levels) || levels < 2 || levels > 5 ||
      !Number.isFinite(nearUm) || !Number.isFinite(farUm) || nearUm < 75 || farUm > 1000 || farUm <= nearUm)
    throw new Error('Choose 2–5 shells with 75 ≤ near radius < far radius ≤ 1000 µm.');
  const radii = Array.from({ length: levels }, (_, i) => nearUm * (farUm / nearUm) ** (i / (levels - 1)));
  const offsets = [[0, 0, 0]];
  // Fibonacci directions are placement samples only; no morphology is generated.
  for (let i = 0; i < count - 1; i++) {
    const level = i % levels, j = Math.floor(i / levels);
    const points = Math.ceil((count - 1 - level) / levels);
    const z = 1 - 2 * (j + 0.5) / points, angle = j * Math.PI * (3 - Math.sqrt(5));
    const radial = Math.sqrt(1 - z * z);
    offsets.push([radial * Math.cos(angle), radial * Math.sin(angle), z].map(v => v * radii[level]));
  }
  return { offsets, radii };
}

export function distanceCloudOffsets(settings) {
  const { count, nearUm, farUm, seed } = settings;
  populationOffsets(count, settings.spacingUm);
  if (!Number.isFinite(nearUm) || !Number.isFinite(farUm) || nearUm < 1 || farUm > 1500 || farUm <= nearUm)
    throw new Error('Choose cloud distances with 1 ≤ near < far ≤ 1500 µm.');
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error('Angle seed must be an integer from 0 to 4294967295.');
  // Seeded uniform directions on the sphere. This generates placements only.
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const ladder = [1, 2, 5, 12, 20, 28, 40, 60, 85, 120, 170, 240, 340, 480, 680, 960];
  const offsets = [[0, 0, 0]], radii = [];
  for (let i = 0; i < count - 1; i++) {
    const fraction = count <= 2 ? 0 : i / (count - 2);
    const position = fraction * (ladder.length - 1), lower = Math.floor(position), upper = Math.min(lower + 1, ladder.length - 1);
    const logRadius = Math.log(ladder[lower]) + (position - lower) * Math.log(ladder[upper] / ladder[lower]);
    const radius = nearUm * (farUm / nearUm) ** (logRadius / Math.log(960));
    const z = 2 * random() - 1, angle = 2 * Math.PI * random(), radial = Math.sqrt(1 - z * z);
    offsets.push([radial * Math.cos(angle), radial * Math.sin(angle), z].map(v => v * radius));
    radii.push(radius);
  }
  return { offsets, radii: [], cloudRadiiUm: radii };
}

export function populationCapacity(config) {
  if (config?.schemaVersion !== ACTIVE_SCHEMA_VERSION || config?.neuron?.modelId !== ACTIVE_MODEL_ID)
    throw new Error('Populations require the published human active model.');
  const world = makeWorld(config);
  const nodes = world.neuron.nodes.length;
  const steps = Math.ceil(config.solver.durationMs / config.solver.dtMs);
  const conditioningSteps = Math.round(config.solver.settleMs / config.solver.dtMs);
  const frames = Math.ceil(config.solver.durationMs / config.solver.sampleMs) + 1;
  const maxCells = Math.max(0, Math.min(POPULATION_LIMITS.maxCells,
    Math.floor((POPULATION_LIMITS.nodeSteps - nodes * conditioningSteps) / (nodes * steps)),
    Math.floor((POPULATION_LIMITS.summaryBytes / 8 / frames) - 8)));
  return { maxCells, nodesPerCell: nodes, membraneCompartmentsPerCell: world.neuron.membraneCompartments,
    steps, conditioningSteps, frames,
    // Exact retained typed arrays in runExperiment, excluding JS objects.
    detailedOutputBytes: ((nodes * 10 + 9) * frames + nodes) * 8,
    scope: 'CPU work and retained numeric arrays; excludes browser/GPU memory and rendering. No real-time guarantee.' };
}

export function planPopulation(config, settings, { allowUnsupported = false } = {}) {
  if (!settings || settings.schemaVersion !== POPULATION_SCHEMA ||
      Object.keys(settings).some(key => !['schemaVersion', 'count', 'spacingUm', 'layout', 'center', 'nearUm', 'farUm', 'levels', 'seed'].includes(key)) ||
      !['grid', 'shells', 'cloud'].includes(settings.layout) || !['target', 'stimulus-midpoint', 'stimulus-a'].includes(settings.center))
    throw new Error('Unsupported population configuration.');
  const layout = settings.layout === 'cloud' ? distanceCloudOffsets(settings) : settings.layout === 'shells' ? distanceShellOffsets(settings) : { offsets: populationOffsets(settings.count, settings.spacingUm), radii: [] };
  const capacity = populationCapacity(config);
  if (config.protocol.mode !== 'extracellular-stimulation')
    throw new Error('Population recruitment uses extracellular stimulation. Single-cell current clamp remains available above.');
  if (settings.count > capacity.maxCells)
    throw new Error(`These solver settings support at most ${capacity.maxCells} cells within the population work budget. Reduce count or explicitly adjust duration/resolution.`);
  const targetWorld = makeWorld(config);
  const sources = config.protocol.sourceContactIds.map(id => targetWorld.contacts.find(c => c.id === id));
  const centerUm = settings.center === 'target' ? config.neuron.somaUm : settings.center === 'stimulus-a' ? sources[0].positionUm : [0, 1, 2].map(axis => (sources[0].positionUm[axis] + sources[1].positionUm[axis]) / 2);
  const errors = [];
  const cells = layout.offsets.map((relativeUm, index) => {
    const offsetUm = index === 0 ? [0, 0, 0] : relativeUm.map((v, axis) => v + centerUm[axis] - config.neuron.somaUm[axis]);
    const cellConfig = structuredClone(config);
    cellConfig.neuron.somaUm = config.neuron.somaUm.map((value, axis) => value + offsetUm[axis]);
    let unsupportedReason = null, nearestMembraneUm = null;
    try {
      const world = makeWorld(cellConfig);
      const placement = placementReport(world);
      nearestMembraneUm = Math.min(...placement.rows.filter(row => row.role === 'Stimulating').map(row => row.nearestUm));
      const invalid = placement.rows.find(row => !row.supported);
      if (invalid) throw new Error(`${invalid.id} is within ${config.recording.exclusionUm} µm of its membrane. Change spacing, placement or contacts.`);
    } catch (error) {
      unsupportedReason = `Cell ${index + 1}: ${error.message}`;
      if (!allowUnsupported) throw new Error(unsupportedReason);
      errors.push(unsupportedReason);
    }
    const sourceDistancesUm = sources.map(source => distance(cellConfig.neuron.somaUm, source.positionUm));
    let leadingPotentialMv = null, leadingFieldVPerM = null;
    if (Math.min(...sourceDistancesUm) >= config.recording.exclusionUm) {
      const fields = sources.map((source, i) => pointField(cellConfig.neuron.somaUm, source.positionUm, (i ? 1 : -1) * 1000 * config.protocol.amplitudeUa, config.tissue.conductivitySPerM));
      leadingPotentialMv = fields[0].voltageMv + fields[1].voltageMv;
      leadingFieldVPerM = Math.hypot(...fields[0].fieldVPerM.map((value, axis) => value + fields[1].fieldVPerM[axis]));
    }
    return { id: `cell-${index + 1}`, index, offsetUm, somaUm: cellConfig.neuron.somaUm, config: cellConfig,
      unsupportedReason, distanceFromCenterUm: distance(cellConfig.neuron.somaUm, centerUm),
      sourceDistancesUm, nearestMembraneUm, leadingPotentialMv, leadingFieldVPerM,
      shell: index && settings.layout === 'shells' ? (index - 1) % settings.levels + 1 : null };
  });
  const summaryOutputBytes = (settings.count + 8) * capacity.frames * 8;
  const supportedCells = cells.filter(c => !c.unsupportedReason).length;
  return { cells, errors, supportedCells, centerUm, shellRadiiUm: layout.radii, cloudRadiiUm: layout.cloudRadiiUm ?? [], capacity, summaryOutputBytes,
    retainedOutputUpperBytes: capacity.detailedOutputBytes + summaryOutputBytes,
    liveNumericWorkingUpperBytes: 2 * capacity.detailedOutputBytes + summaryOutputBytes,
    nodeSteps: capacity.nodesPerCell * (capacity.conditioningSteps + settings.count * capacity.steps),
    // Rounded planning estimate from the 2026-10-18 Node measurement. The UI
    // replaces it with actual elapsed time/progress; it is not a browser benchmark.
    estimatedSeconds: capacity.nodesPerCell * (capacity.conditioningSteps + supportedCells * capacity.steps) * 0.00000067 };
}

export function runPopulation(config, settings, progress = () => {}) {
  const started = performance.now();
  const plan = planPopulation(config, settings, { allowUnsupported: true });
  // The existing target remains the detailed reference for the main workbench.
  // Near-source cloud samples stay visible/exported with explicit exclusion.
  if (plan.cells[0].unsupportedReason) throw new Error(plan.cells[0].unsupportedReason);
  const result = { schemaVersion: 'cortex-population-result/1', config: structuredClone(config),
    population: structuredClone(settings), centerUm: plan.centerUm, shellRadiiUm: plan.shellRadiiUm,
    cloudRadiiUm: plan.cloudRadiiUm, cells: [], timeMs: null, targetResult: null,
    neuralUv: null, appliedUv: null, totalUv: null, differentialUv: null,
    provenance: { uniqueSpecimens: 1, modelId: ACTIVE_MODEL_ID, specimenId: 571654895,
      sourceCommit: activeModelData.sourceCommit, sourceHashes: activeModelData.sourceHashes,
      source: modelRegistry[0].source, citation: modelRegistry[0].citation,
      placement: 'Same reconstructed/fitted source cell, rigid translations in a seeded distance cloud, 3D grid or concentric shells; fixed cell orientation; no generated morphologies or randomized conductances.',
      morphologyLimit: 'Published reconstructed human temporal L2 dendrites and synthetic 60 µm axon stub; not complete measured axons or distinct biological cells.' },
    interpretation: {
      coupling: 'Independent active cables under the same prescribed field and time grid. No synaptic or ephaptic coupling. Serial integration is equivalent to concurrent uncoupled integration.',
      recording: 'Sum of successfully simulated cell neural potentials only. Unsupported placements are excluded explicitly, not treated as inactive. Applied stimulation artifact added once. No acquisition electronics.',
      classification: 'Local crossings, soma threshold events, and sampled overshoot/recovery evidence are separate; propagation is not established.',
      spatialConvergence: 'Unresolved: six historical extracellular spatial-threshold comparisons fail the unchanged 2% gate. Population size does not validate selectivity.',
      retention: 'Full compartment/channel histories for cell 1 only; sampled soma voltages and response evidence for every cell. Integration dt and compartment resolution are unchanged.' },
    diagnostics: { elapsedMs: 0, outputBytes: 0, ...plan.capacity, nodeSteps: plan.nodeSteps,
      requestedCells: settings.count, simulatedCells: plan.supportedCells, excludedCells: settings.count - plan.supportedCells,
      liveNumericWorkingUpperBytes: plan.liveNumericWorkingUpperBytes } };
  for (const cell of plan.cells) {
    const metadata = { id: cell.id, offsetUm: cell.offsetUm, somaUm: cell.somaUm,
      distanceFromCenterUm: cell.distanceFromCenterUm, sourceDistancesUm: cell.sourceDistancesUm,
      nearestMembraneUm: cell.nearestMembraneUm, leadingPotentialMv: cell.leadingPotentialMv,
      leadingFieldVPerM: cell.leadingFieldVPerM, shell: cell.shell };
    if (cell.unsupportedReason) {
      result.cells.push({ ...metadata, status: 'excluded', reason: cell.unsupportedReason, somaMv: null, response: null });
      progress({ progress: (cell.index + 1) / settings.count, stage: `Cell ${cell.index + 1} excluded · unsupported placement`, completedCells: cell.index + 1 });
      continue;
    }
    // Deliberately keep one neighbor result at a time. Do not accumulate full
    // histories or clone a waveform from another cell.
    let detail;
    try { detail = runExperiment(cell.config, status => {
      if (status.progress === 1 || status.stage !== 'Simulating' || status.biologicalMs % 2 < config.solver.dtMs * 128)
        progress({ progress: (cell.index + status.progress) / settings.count,
          stage: `Cell ${cell.index + 1} of ${settings.count} · ${status.stage ?? 'complete'}`,
          completedCells: cell.index, biologicalMs: status.biologicalMs });
    }); } catch (error) {
      throw new Error(`Cell ${cell.index + 1} of ${settings.count}: ${error.message} No complete population result was produced.`);
    }
    if (cell.index === 0) {
      result.targetResult = detail;
      result.timeMs = detail.timeMs; // Intentional aliases; transfer accounting deduplicates buffers.
      result.appliedUv = detail.appliedUv;
      result.neuralUv = detail.neuralUv.map(values => new Float64Array(values.length));
    }
    const somaMv = Float64Array.from(detail.timeMs, (_, frame) =>
      detail.membraneMv[frame * detail.diagnostics.compartments + detail.somaIndex]);
    result.cells.push({ ...metadata, status: 'simulated',
      modelId: ACTIVE_MODEL_ID, somaMv, response: detail.responseAnalysis,
      elapsedMs: detail.diagnostics.elapsedMs, maxKclResidualNa: detail.diagnostics.maxKclResidualNa });
    for (let channel = 0; channel < 2; channel++)
      for (let frame = 0; frame < result.timeMs.length; frame++)
        result.neuralUv[channel][frame] += detail.neuralUv[channel][frame];
  }
  result.totalUv = result.neuralUv.map((values, channel) =>
    Float64Array.from(values, (value, frame) => value + result.appliedUv[channel][frame]));
  result.differentialUv = Float64Array.from(result.timeMs, (_, frame) => result.totalUv[0][frame] - result.totalUv[1][frame]);
  result.diagnostics.elapsedMs = performance.now() - started;
  result.diagnostics.outputBytes = resultBuffers(result).reduce((sum, buffer) => sum + buffer.byteLength, 0);
  progress({ progress: 1, stage: 'Population complete', completedCells: settings.count, biologicalMs: config.solver.durationMs });
  return result;
}

export function populationCsv(result) {
  const header = ['time_ms', 'neural_A_uV', 'neural_B_uV', 'applied_A_uV', 'applied_B_uV', 'total_A_uV', 'total_B_uV', ...result.cells.map(c => `${c.id}_soma_mV`)];
  return [header.join(','), ...Array.from(result.timeMs, (t, i) => [t,
    result.neuralUv[0][i], result.neuralUv[1][i], result.appliedUv[0][i], result.appliedUv[1][i],
    result.totalUv[0][i], result.totalUv[1][i], ...result.cells.map(c => c.somaMv?.[i] ?? '')].join(','))].join('\n');
}
