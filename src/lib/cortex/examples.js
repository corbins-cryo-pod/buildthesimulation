import { validateConfig } from './config.js';
import { ACTIVE_MODEL_ID, PASSIVE_MODEL_ID } from './model-registry.js';

// Curated experiments are full configurations, not patches over mutable UI state.
// Keep these values explicit: changing a future default must not change an example.
const passive = {
  schemaVersion: 'cortex-experiment/1',
  anatomy: { widthUm: 6000, thicknessUm: 4000 },
  implant: {
    deviceId: 'BTSD-0001',
    revision: 1,
    translationUm: [0, 0, 0],
    rotationDeg: [0, 0, 0],
  },
  neuron: { somaUm: [-100, -200, 1500], segmentLengthUm: 40 },
  tissue: { conductivitySPerM: 0.3 },
  membrane: {
    capacitanceUfPerCm2: 1,
    resistanceOhmCm2: 20000,
    axialResistivityOhmCm: 150,
    restMv: -65,
  },
  recording: {
    contactIds: ['r4-c4', 'r4-c5'],
    reference: 'infinity',
    sourceModel: 'line',
    exclusionUm: 25,
  },
  protocol: {
    mode: 'synaptic-recording',
    startMs: 5,
    durationMs: 5,
    synapseNs: 1,
    synapseReversalMv: 0,
    injectionNa: 0.05,
    bathReturnUm: [2000, 2000, -500],
    amplitudeUa: 1,
    phaseUs: 200,
    gapUs: 100,
    sourceContactIds: ['r3-c4', 'r3-c5'],
  },
  solver: { dtMs: 0.025, durationMs: 40 },
};
const active = {
  ...structuredClone(passive),
  schemaVersion: 'cortex-experiment/2',
  neuron: {
    modelId: ACTIVE_MODEL_ID,
    somaUm: [-100, -200, 1500],
    rotationDeg: [0, 0, 0],
    segmentLengthUm: 40,
  },
  membrane: { sourceModelId: ACTIVE_MODEL_ID, temperatureC: 34 },
  protocol: { ...structuredClone(passive.protocol), mode: 'intracellular-current', injectionNa: 1.2 },
  solver: { dtMs: 0.005, durationMs: 40, sampleMs: 0.05, settleMs: 100 },
};
const intracellularBelow = structuredClone(active);
intracellularBelow.protocol.injectionNa = 0.05;
const extracellularLocal = structuredClone(active);
extracellularLocal.protocol.mode = 'extracellular-stimulation';
extracellularLocal.protocol.amplitudeUa = 40;
extracellularLocal.protocol.sourceContactIds = ['r4-c4', 'r4-c5'];
extracellularLocal.recording.contactIds = ['r3-c3', 'r3-c6'];
const extracellularSoma = structuredClone(extracellularLocal);
extracellularSoma.protocol.phaseUs = 1000;
extracellularSoma.implant.translationUm = [100, -50, 0];
const extracellularUnshifted = structuredClone(extracellularSoma);
extracellularUnshifted.implant.translationUm = [0, 0, 0];
const extracellularReversed = structuredClone(extracellularSoma);
extracellularReversed.protocol.sourceContactIds.reverse();

export const EXAMPLE_RESET_DISCLOSURE =
  'Loading replaces the neuron model, anatomy, implant and neuron positions/orientations, tissue, membrane, contacts/reference, input and numerical settings with the complete example. The current result is cleared; run again. A pinned baseline is retained.';
export const EXAMPLE_VERIFICATION_SCOPE =
  'Numerically reproduced with the laboratory solver; exact configurations and measured results are in the examples benchmark. Spiking waveforms and extracellular thresholds are not certified spatially converged; see the refinement report. This is a model-specific calculation, not independent biological validation or a real-device stimulation recommendation.';

function freezeDeep(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

const example = (entry) => ({
  ...entry,
  modelId: entry.config.neuron.modelId ?? PASSIVE_MODEL_ID,
  config: validateConfig(entry.config),
  resetDisclosure: EXAMPLE_RESET_DISCLOSURE,
  verification: EXAMPLE_VERIFICATION_SCOPE,
  verificationReport: '/cortex/methods/#examples',
});

export const EXAMPLES = freezeDeep([
  example({
    id: 'passive-subthreshold',
    title: 'Passive · small synaptic response',
    purpose: 'Begin with a small response in the synthetic passive arbor.',
    description: 'A 1 nS, 5 ms conductance input begins at 5 ms on the fixed distal apical patch. No external stimulating current is applied.',
    expectedBehavior: 'A small depolarization spreads to the soma and produces a neural contact signal. This model has no active channels and cannot predict spikes; its applied contact potential is zero.',
    config: passive,
    view: { recordingComponent: 'neural' },
    outcome: { somaSpikes: null, localCrossings: 'not-defined', appliedSignal: 'zero' },
  }),
  example({
    id: 'active-intracellular-subthreshold',
    title: 'Human cell · subthreshold current',
    purpose: 'Inspect a small somatic current input in the published active model.',
    description: 'A +0.05 nA intracellular input runs from 5 to 10 ms, with an equal/opposite point bath return at [2000, 2000, −500] µm.',
    expectedBehavior: 'The soma depolarizes without an upward −25 mV crossing. The ideal recording includes neural membrane-current potential and a small separate bath-return contribution.',
    config: intracellularBelow,
    view: { recordingComponent: 'neural', baselineExampleId: 'active-intracellular-spike' },
    outcome: { somaSpikes: 0, localCrossings: 'none', appliedSignal: 'nonzero' },
  }),
  example({
    id: 'active-intracellular-spike',
    title: 'Human cell · intracellular soma spike',
    purpose: 'Follow a soma spike and its separately calculated extracellular recording.',
    description: 'The same 5 ms input is increased to +1.2 nA; all other settings match the subthreshold intracellular example.',
    expectedBehavior: 'One upward soma crossing of −25 mV is detected in this 40 ms experiment. Earlier crossings can occur in the synthetic axon stub. These event criteria do not identify a measured biological initiation site.',
    config: active,
    view: { recordingComponent: 'neural', baselineExampleId: 'active-intracellular-subthreshold' },
    outcome: { somaSpikes: 1, localCrossings: 'present', appliedSignal: 'nonzero' },
  }),
  example({
    id: 'extracellular-local-crossings',
    title: 'Array · local crossings without soma spike',
    purpose: 'Distinguish local membrane threshold crossings from a soma event.',
    description: 'At the unshifted implant pose, r4-c4 is cathodic-leading and r4-c5 its equal/opposite return: 40 µA, 200 µs phases, 100 µs gap, beginning at 5 ms.',
    expectedBehavior: 'Some dendritic compartments cross −25 mV, while the soma does not. The large applied stimulation artifact at the ideal recording contacts is separate from the much smaller neural signal.',
    config: extracellularLocal,
    view: { recordingComponent: 'neural' },
    outcome: { somaSpikes: 0, localCrossings: 'present', appliedSignal: 'nonzero' },
  }),
  example({
    id: 'extracellular-soma-spike',
    title: 'Array · calculated soma spike',
    purpose: 'Reproduce the array-driven soma-spike candidate with a fully specified geometry.',
    description: 'Human cell; r4-c4/r4-c5; 40 µA; 1000 µs phases; 100 µs gap; implant translation [100, −50, 0] µm; recordings r3-c3/r3-c6. Soma position remains [−100, −200, 1500] µm.',
    expectedBehavior: 'One soma event occurs during this experiment. Strong depolarization and hyperpolarization are consequences of this idealized model and input, not a safe or selective real-brain stimulation prescription.',
    config: extracellularSoma,
    view: { recordingComponent: 'neural', baselineExampleId: 'extracellular-unshifted' },
    outcome: { somaSpikes: 1, localCrossings: 'present', appliedSignal: 'nonzero' },
  }),
  example({
    id: 'extracellular-unshifted',
    title: 'Placement comparison · unshifted array',
    purpose: 'Compare placement while holding the cell, waveform, conductor and numerical settings fixed.',
    description: 'This is the 40 µA, 1000 µs soma-spike experiment with only implant translation changed to [0, 0, 0] µm. Recording contacts move with the array.',
    expectedBehavior: 'Local compartments cross −25 mV, but the soma does not. Relative stimulating/recording contact geometry is unchanged, so the applied recording artifact is identical to the shifted-array example; neural signals differ.',
    config: extracellularUnshifted,
    view: { recordingComponent: 'neural', baselineExampleId: 'extracellular-soma-spike' },
    outcome: { somaSpikes: 0, localCrossings: 'present', appliedSignal: 'nonzero' },
  }),
  example({
    id: 'extracellular-reversed-polarity',
    title: 'Polarity comparison · reversed leading phase',
    purpose: 'Inspect how reversing the source/return order changes membrane response.',
    description: 'All settings match the shifted-array soma-spike example, except r4-c5 is now cathodic-leading and r4-c4 is its return. Both phases reverse sign at each physical contact.',
    expectedBehavior: 'One soma event still occurs, but at a different time and with different earlier local crossings. Applied contact potentials reverse sign exactly; the nonlinear neural response need not do so.',
    config: extracellularReversed,
    view: { recordingComponent: 'neural', baselineExampleId: 'extracellular-soma-spike' },
    outcome: { somaSpikes: 1, localCrossings: 'present', appliedSignal: 'nonzero' },
  }),
  example({
    id: 'recording-components',
    title: 'Recordings · neural, artifact and total',
    purpose: 'Learn why a stimulation artifact is not a neuronal spike recording.',
    description: 'Uses the local-crossing 40 µA, 200 µs experiment. Switch the recording display among neural, applied and total; compare individual contacts against infinity and the A−B difference.',
    expectedBehavior: 'Total equals neural plus applied at every retained sample. Applied potential dominates during the pulse and vanishes in the gap and after the pulse; neural potential can persist. Each contact is referenced to infinity, while A−B is their algebraic difference.',
    config: extracellularLocal,
    view: { recordingComponent: 'total', baselineExampleId: 'extracellular-local-crossings' },
    outcome: { somaSpikes: 0, localCrossings: 'present', appliedSignal: 'nonzero' },
  }),
]);

export function getExampleConfig(id) {
  const selected = EXAMPLES.find((entry) => entry.id === id);
  if (!selected) throw new Error(`Unknown cortex example: ${id}`);
  return validateConfig(structuredClone(selected.config));
}
