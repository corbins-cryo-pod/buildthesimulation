// Public experiment contract. Geometry µm; time ms; voltage mV; current nA.
export const SCHEMA_VERSION = 'cortex-experiment/1';
export const ENGINE_VERSION = 'cortex-passive/0.1.0';
export const DEFAULT_CONFIG = {
  schemaVersion: SCHEMA_VERSION,
  anatomy: { widthUm: 6000, thicknessUm: 4000 },
  implant: { deviceId: 'BTSD-0001', revision: 1, translationUm: [0, 0, 0], rotationDeg: [0, 0, 0] },
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
export const freshConfig = () => structuredClone(DEFAULT_CONFIG);
const finiteRange = (value, min, max, name) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw new Error(`${name} must be between ${min} and ${max}.`);
};
const vector = (v, min, max, name) => {
  if (!Array.isArray(v) || v.length !== 3) throw new Error(`${name} needs three coordinates.`);
  v.forEach((x) => finiteRange(x, min, max, name));
};
export function validateConfig(input) {
  if (!input || input.schemaVersion !== SCHEMA_VERSION)
    throw new Error(
      `Expected ${SCHEMA_VERSION}; incompatible configurations are not silently migrated.`,
    );
  const c = structuredClone(input);
  for (const key of Object.keys(c))
    if (!Object.hasOwn(DEFAULT_CONFIG, key)) throw new Error(`Unknown configuration field ${key}.`);
  for (const key of [
    'anatomy',
    'implant',
    'neuron',
    'tissue',
    'membrane',
    'recording',
    'protocol',
    'solver',
  ])
    if (!c[key] || typeof c[key] !== 'object') throw new Error(`Missing ${key} configuration.`);
  for (const key of [
    'anatomy',
    'implant',
    'neuron',
    'tissue',
    'membrane',
    'recording',
    'protocol',
    'solver',
  ])
    for (const field of Object.keys(c[key]))
      if (!Object.hasOwn(DEFAULT_CONFIG[key], field))
        throw new Error(`Unknown configuration field ${key}.${field}.`);
  finiteRange(c.anatomy.widthUm, 5000, 10000, 'Patch width (µm)');
  finiteRange(c.anatomy.thicknessUm, 3000, 5000, 'Cortical thickness (µm)');
  if (c.implant.deviceId !== 'BTSD-0001' || c.implant.revision !== 1)
    throw new Error('This experiment supports the catalog Utah 1.5 mm reference, revision 1.');
  vector(c.implant.translationUm, -2000, 2000, 'Implant translation (µm)');
  vector(c.implant.rotationDeg, -180, 180, 'Implant rotation (degrees)');
  vector(c.neuron.somaUm, -2500, 4500, 'Soma position (µm)');
  finiteRange(c.neuron.segmentLengthUm, 10, 100, 'Maximum compartment length (µm)');
  finiteRange(c.tissue.conductivitySPerM, 0.1, 1, 'Conductivity (S/m)');
  finiteRange(c.membrane.capacitanceUfPerCm2, 0.2, 2, 'Membrane capacitance (µF/cm²)');
  finiteRange(c.membrane.resistanceOhmCm2, 5000, 100000, 'Membrane resistance (Ω cm²)');
  finiteRange(c.membrane.axialResistivityOhmCm, 50, 300, 'Axial resistivity (Ω cm)');
  finiteRange(c.membrane.restMv, -90, -40, 'Rest potential (mV)');
  if (!['infinity', 'bipolar'].includes(c.recording.reference))
    throw new Error('Unsupported recording reference.');
  if (!['line', 'point'].includes(c.recording.sourceModel))
    throw new Error('Unsupported current-source approximation.');
  finiteRange(c.recording.exclusionUm, 25, 100, 'Source exclusion distance (µm)');
  for (const ids of [c.recording.contactIds, c.protocol.sourceContactIds])
    if (
      !Array.isArray(ids) ||
      ids.length !== 2 ||
      new Set(ids).size !== 2 ||
      ids.some((id) => typeof id !== 'string')
    )
      throw new Error('Choose two distinct contact IDs.');
  if (
    !['synaptic-recording', 'extracellular-stimulation', 'intracellular-current'].includes(
      c.protocol.mode,
    )
  )
    throw new Error('Unsupported experiment mode.');
  finiteRange(c.protocol.startMs, 1, 10, 'Drive start (ms)');
  finiteRange(c.protocol.durationMs, 0.1, 10, 'Drive duration (ms)');
  finiteRange(c.protocol.synapseNs, 0, 5, 'Synaptic conductance (nS)');
  finiteRange(c.protocol.synapseReversalMv, -90, 20, 'Synapse reversal (mV)');
  finiteRange(c.protocol.injectionNa, -0.2, 0.2, 'Intracellular current (nA)');
  vector(c.protocol.bathReturnUm, -10000, 10000, 'Bath return (µm)');
  finiteRange(c.protocol.amplitudeUa, 0, 10, 'Stimulation amplitude (µA)');
  finiteRange(c.protocol.phaseUs, 50, 1000, 'Phase duration (µs)');
  finiteRange(c.protocol.gapUs, 0, 1000, 'Interphase gap (µs)');
  finiteRange(c.solver.dtMs, 0.0025, 0.1, 'Timestep (ms)');
  finiteRange(c.solver.durationMs, 20, 100, 'Experiment duration (ms)');
  if (c.protocol.startMs + c.protocol.durationMs >= c.solver.durationMs)
    throw new Error('The drive must end before the experiment ends.');
  if (
    c.protocol.mode === 'extracellular-stimulation' &&
    c.recording.contactIds.some((id) => c.protocol.sourceContactIds.includes(id))
  )
    throw new Error(
      'An ideal point source has undefined voltage at itself. Choose recording sites separate from the stimulating sites.',
    );
  return c;
}
