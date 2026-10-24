/**
 * Deterministic Rattay (2001) human type-I auditory nerve cable model.
 *
 * Independent implementation of published model equations and numerical
 * parameter facts; no third-party source code is distributed in this file.
 * Parameter cross-check: Bachmaier et al. (2019), doi:10.3389/fnins.2019.01173,
 * and its authors' models/Rattay_2001.py (public GitLab project 37137).
 * Original model: doi:10.1016/S0378-5955(00)00256-2.
 *
 * Internal units: ms, mV, nA, nF, microSiemens. Geometry is returned in mm.
 * Voltage is absolute transmembrane voltage, not extracellular potential.
 * No stochastic channels or added adaptation mechanism are claimed.
 *
 * Each compartment is a truncated cone. Axial half-resistances are integrated
 * along the cone; the same axial conductances couple Vm and Ve, including
 * sealed endpoints. This makes spatially uniform Ve exactly ineffective.
 */

export const NERVE_PROVENANCE = Object.freeze({
  id: 'rattay-2001-deterministic-65',
  name: 'Rattay human auditory nerve (65 compartments)',
  originalDoi: '10.1016/S0378-5955(00)00256-2',
  comparisonDoi: '10.3389/fnins.2019.01173',
  parameterSource: 'https://gitlab.lrz.de/tueibai-public/human-anf-models/-/blob/master/models/Rattay_2001.py',
  scope: 'Deterministic membrane and propagated axonal responses; no validated long-term adaptation or perceptual prediction.',
  geometry: 'Straight compartment chain with a segmented soma; homogeneous-conductor fields are supplied separately.',
});

const REST_MV = -65;
const ENA_MV = 50;
const EK_MV = -77;
const RATE_SCALE = 12;
const TABLE_MIN_MV = -180;
const TABLE_MAX_MV = 180;
const TABLE_STEP_MV = 0.025;
const tables = new Map();

function exprel(x) {
  return Math.abs(x) < 1e-7 ? 1 - x / 2 + x * x / 12 : x / Math.expm1(x);
}

/** Rates per ms, with the removable HH singularities evaluated by a limit. */
export function nerveGateRates(voltageMv) {
  if (!Number.isFinite(voltageMv)) throw new RangeError('Membrane voltage must be finite.');
  const u = voltageMv - REST_MV;
  return {
    am: RATE_SCALE * exprel((25 - u) / 10),
    bm: RATE_SCALE * 4 * Math.exp(-u / 18),
    an: RATE_SCALE * 0.1 * exprel((10 - u) / 10),
    bn: RATE_SCALE * 0.125 * Math.exp(-u / 80),
    ah: RATE_SCALE * 0.07 * Math.exp(-u / 20),
    bh: RATE_SCALE / (1 + Math.exp((30 - u) / 10)),
  };
}

const REST_RATES = nerveGateRates(REST_MV);
const M0 = REST_RATES.am / (REST_RATES.am + REST_RATES.bm);
const N0 = REST_RATES.an / (REST_RATES.an + REST_RATES.bn);
const H0 = REST_RATES.ah / (REST_RATES.ah + REST_RATES.bh);
// Balances the resting sodium and potassium currents exactly in both the
// active neurite and soma, whose conductance-density ratios are identical.
const EL_MV = REST_MV - (1200 * M0 ** 3 * H0 * 115 + 360 * N0 ** 4 * -12) / 3;

function tableFor(dtMs) {
  const key = String(dtMs);
  if (tables.has(key)) return tables.get(key);
  const count = Math.round((TABLE_MAX_MV - TABLE_MIN_MV) / TABLE_STEP_MV) + 1;
  const t = Array.from({ length: 6 }, () => new Float64Array(count));
  for (let i = 0; i < count; i++) {
    const { am, bm, an, bn, ah, bh } = nerveGateRates(TABLE_MIN_MV + i * TABLE_STEP_MV);
    t[0][i] = am / (am + bm);
    t[1][i] = an / (an + bn);
    t[2][i] = ah / (ah + bh);
    t[3][i] = Math.exp(-(am + bm) * dtMs);
    t[4][i] = Math.exp(-(an + bn) * dtMs);
    t[5][i] = Math.exp(-(ah + bh) * dtMs);
  }
  // Common simulation timesteps only. Avoid unbounded caches during sweeps.
  if (tables.size < 8) tables.set(key, t);
  return t;
}

/**
 * Return the published 65-compartment morphology and membrane parameters.
 * positionsMm is a signed distance along the fiber, with dendritic node 3 at 0.
 * It can be used as the y coordinate of an unrolled population model.
 */
export function createNerveModel() {
  const type = ['terminal'];
  const lengthUm = [10];
  for (let j = 0; j < 5; j++) {
    type.push('dendrite-internode', 'dendrite-node');
    lengthUm.push(430, 2.5);
  }
  type.push('dendrite-internode'); lengthUm.push(360);
  for (let j = 0; j < 3; j++) { type.push('presoma'); lengthUm.push(100 / 3); }
  for (let j = 0; j < 10; j++) { type.push('soma'); lengthUm.push(3); }
  type.push('postsoma'); lengthUm.push(5);
  for (let j = 0; j < 19; j++) {
    type.push('axon-internode', 'axon-node'); lengthUm.push(500, 2.5);
  }
  type.push('axon-internode'); lengthUm.push(500);
  const count = type.length;
  const edgeDiameterUm = new Float64Array(count + 1).fill(2);
  edgeDiameterUm.fill(1, 0, 16);
  for (let k = 0; k <= 10; k++) {
    const radius = Math.sqrt(Math.max(0, 15 ** 2 - (3 * k - 15) ** 2));
    edgeDiameterUm[15 + k] = Math.max(k < 5 ? 1 : 2, 2 * radius);
  }
  const positionsMm = new Float64Array(count);
  const areaUm2 = new Float64Array(count);
  const capacitanceNf = new Float64Array(count);
  const gNaUs = new Float64Array(count);
  const gKUs = new Float64Array(count);
  const gLeakUs = new Float64Array(count);
  const gMyelinUs = new Float64Array(count);
  const halfLeftOhm = new Float64Array(count);
  const halfRightOhm = new Float64Array(count);
  const axialUs = new Float64Array(count - 1);
  const nodeIndices = [];
  const dendriticNodeIndices = [];
  const axonalNodeIndices = [];
  const activeIndices = [];
  let length = 0;
  for (let i = 0; i < count; i++) {
    const r0 = edgeDiameterUm[i] / 2;
    const r1 = edgeDiameterUm[i + 1] / 2;
    const rm = (r0 + r1) / 2;
    positionsMm[i] = (length + lengthUm[i] / 2) / 1000;
    length += lengthUm[i];
    areaUm2[i] = Math.PI * (r0 + r1) * Math.hypot(lengthUm[i], r1 - r0);
    // rho=50 ohm cm; um -> cm gives factor 1e4 in L/(r*r).
    halfLeftOhm[i] = 50 * 1e4 * lengthUm[i] / (2 * Math.PI * r0 * rm);
    halfRightOhm[i] = 50 * 1e4 * lengthUm[i] / (2 * Math.PI * rm * r1);
    const internode = type[i].endsWith('internode');
    const soma = type[i] === 'soma';
    const layers = internode ? (i < 15 ? 40 : 80) : (soma ? 3 : 0);
    capacitanceNf[i] = areaUm2[i] * 1e-5 / (1 + layers);
    if (internode) {
      gMyelinUs[i] = areaUm2[i] * 1e-5 / (1 + layers);
    } else {
      const factor = areaUm2[i] * 1e-5 * (soma ? 0.1 : 1);
      gNaUs[i] = 1200 * factor;
      gKUs[i] = 360 * factor;
      gLeakUs[i] = 3 * factor;
      activeIndices.push(i);
    }
    if (type[i].endsWith('-node')) nodeIndices.push(i);
    if (type[i] === 'dendrite-node') dendriticNodeIndices.push(i);
    if (type[i] === 'axon-node') axonalNodeIndices.push(i);
  }
  const stimulationNodeIndex = dendriticNodeIndices[2];
  const origin = positionsMm[stimulationNodeIndex];
  for (let i = 0; i < count; i++) positionsMm[i] -= origin;
  for (let i = 0; i < count - 1; i++) axialUs[i] = 1e6 / (halfRightOhm[i] + halfLeftOhm[i + 1]);
  return {
    id: NERVE_PROVENANCE.id, compartmentCount: count, type,
    positionsMm, lengthMm: Float64Array.from(lengthUm, x => x / 1000),
    edgeDiameterMm: Float64Array.from(edgeDiameterUm, x => x / 1000),
    totalLengthMm: length / 1000, areaUm2, capacitanceNf,
    gNaUs, gKUs, gLeakUs, gMyelinUs, axialUs,
    activeIndices, nodeIndices, dendriticNodeIndices, axonalNodeIndices,
    stimulationNodeIndex, somaIndex: 20, somaIndices: Array.from({ length: 10 }, (_, i) => 15 + i),
    detectionIndex: axonalNodeIndices[9], proximalDetectionIndex: axonalNodeIndices[6],
    restingMv: REST_MV, sodiumReversalMv: ENA_MV, potassiumReversalMv: EK_MV,
    leakReversalMv: EL_MV, initialGates: { m: M0, n: N0, h: H0 },
  };
}

/** Convert Ve in mV (or mV/uA) to an axial driving current in nA (or nA/uA). */
export function extracellularDrive(model, potentialMv) {
  const count = model.compartmentCount;
  if (potentialMv.length !== count) throw new RangeError('Extracellular field must have one value per compartment.');
  const drive = new Float64Array(count);
  for (let i = 0; i < count - 1; i++) {
    const flux = model.axialUs[i] * (potentialMv[i + 1] - potentialMv[i]);
    drive[i] += flux;
    drive[i + 1] -= flux;
  }
  return drive;
}

function finitePositive(value, label, allowZero = false) {
  if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) {
    throw new RangeError(`${label} must be ${allowZero ? 'nonnegative' : 'positive'} and finite.`);
  }
}

/**
 * Run one complete active cable fiber. Fields are [contact][compartment], mV/uA.
 * Events: {onsetUs, contactIndex, amplitudeUA, [phaseWidthUs], [gapUs],
 *          [polarity:'cathodic'|'anodic'], [pulseForm:'bi'|'mono']}.
 * Monophasic pulses exist only for reference experiments; the lab schedules bi.
 * Optional per-event parameters override the common pulse metadata.
 *
 * Recorded arrays are typed and transferable: membraneMv[trace][sample].
 * replayMv is Float32Array, frame-major, all compartments; replayTimesMs gives
 * its frame times. Setting replayEveryUs=0 disables replay. Trace/replay are
 * samples of the solver, never the solver timestep or a replacement for it.
 */
export function simulateFiber({
  model = createNerveModel(), events = [], leadFields = [], durationMs = 10,
  dtUs = 1, traceEveryUs = 20, replayEveryUs = 0,
  phaseWidthUs = 45, gapUs = 8, polarity = 'cathodic', pulseForm = 'bi',
  recordCompartments = [model.stimulationNodeIndex, model.somaIndex, model.detectionIndex],
  useLookup = true, spikeThresholdMv = -5,
} = {}) {
  finitePositive(durationMs, 'Duration'); finitePositive(dtUs, 'Timestep');
  finitePositive(traceEveryUs, 'Trace interval'); finitePositive(replayEveryUs, 'Replay interval', true);
  if (durationMs > 1000 || dtUs < 0.05 || dtUs > 10) throw new RangeError('Use a duration ≤1000 ms and timestep 0.05–10 us.');
  const count = model.compartmentCount;
  for (const index of recordCompartments) {
    if (!Number.isInteger(index) || index < 0 || index >= count) throw new RangeError('Invalid recording compartment.');
  }
  const drives = leadFields.map(field => {
    if (field.length !== count || Array.from(field).some(x => !Number.isFinite(x))) throw new RangeError('Invalid lead field.');
    return extracellularDrive(model, field);
  });
  const edges = [];
  let lastPulseEndUs = 0;
  for (const event of events) {
    const onset = event.onsetUs;
    const width = event.phaseWidthUs ?? phaseWidthUs;
    const gap = event.gapUs ?? gapUs;
    const form = event.pulseForm ?? pulseForm;
    const pol = event.polarity ?? polarity;
    const amplitude = event.amplitudeUA;
    finitePositive(onset, 'Pulse onset', true); finitePositive(width, 'Phase width');
    finitePositive(gap, 'Interphase gap', true); finitePositive(amplitude, 'Current amplitude', true);
    if (!['bi', 'mono'].includes(form) || !['cathodic', 'anodic'].includes(pol)) throw new RangeError('Invalid pulse waveform.');
    if (!Number.isInteger(event.contactIndex) || !drives[event.contactIndex]) throw new RangeError('Pulse contact has no lead field.');
    const first = pol === 'cathodic' ? -amplitude : amplitude;
    edges.push({ time: onset, contact: event.contactIndex, delta: first });
    edges.push({ time: onset + width, contact: event.contactIndex, delta: -first });
    let end = onset + width;
    if (form === 'bi') {
      edges.push({ time: onset + width + gap, contact: event.contactIndex, delta: -first });
      edges.push({ time: onset + 2 * width + gap, contact: event.contactIndex, delta: first });
      end = onset + 2 * width + gap;
    }
    lastPulseEndUs = Math.max(lastPulseEndUs, end);
  }
  edges.sort((a, b) => a.time - b.time);
  const durationUs = durationMs * 1000;
  if (lastPulseEndUs > durationUs + 1e-7) throw new RangeError('Simulation duration must include every complete pulse.');
  const v = new Float64Array(count).fill(REST_MV);
  const m = new Float64Array(count).fill(M0);
  const n = new Float64Array(count).fill(N0);
  const h = new Float64Array(count).fill(H0);
  const forcing = new Float64Array(count);
  const forward = new Float64Array(count);
  const rhs = new Float64Array(count);
  const maxMv = new Float64Array(count).fill(REST_MV);
  const minMv = new Float64Array(count).fill(REST_MV);
  const samples = Math.floor(durationUs / traceEveryUs + 1e-8) + 1;
  const timeMs = new Float64Array(samples);
  const membraneMv = recordCompartments.map(() => new Float32Array(samples));
  const frames = replayEveryUs ? Math.floor(durationUs / replayEveryUs + 1e-8) + 1 : 0;
  const replayTimesMs = new Float64Array(frames);
  const replayMv = new Float32Array(frames * count);
  const spikeTimesMs = [];
  const proximalSpikeTimesMs = [];
  let armed = true; let proximalArmed = true;
  const lookup = useLookup ? tableFor(dtUs / 1000) : null;
  let timeUs = 0; let edgeIndex = 0; let traceIndex = 0; let frameIndex = 0;
  let steps = 0; let outsideLookupSteps = 0;
  const record = () => {
    if (traceIndex < samples && timeUs + 1e-7 >= traceIndex * traceEveryUs) {
      timeMs[traceIndex] = timeUs / 1000;
      for (let k = 0; k < recordCompartments.length; k++) membraneMv[k][traceIndex] = v[recordCompartments[k]];
      traceIndex++;
    }
    if (frameIndex < frames && timeUs + 1e-7 >= frameIndex * replayEveryUs) {
      replayTimesMs[frameIndex] = timeUs / 1000;
      replayMv.set(v, frameIndex * count); frameIndex++;
    }
  };
  record();
  while (timeUs < durationUs - 1e-7) {
    while (edgeIndex < edges.length && edges[edgeIndex].time <= timeUs + 1e-7) {
      const edge = edges[edgeIndex++]; const drive = drives[edge.contact];
      for (let i = 0; i < count; i++) forcing[i] += edge.delta * drive[i];
    }
    const nextEdgeUs = edgeIndex < edges.length ? edges[edgeIndex].time : Infinity;
    const nextTraceUs = traceIndex < samples ? traceIndex * traceEveryUs : Infinity;
    const nextReplayUs = frameIndex < frames ? frameIndex * replayEveryUs : Infinity;
    const stepUs = Math.min(dtUs, durationUs - timeUs, nextEdgeUs - timeUs, nextTraceUs - timeUs, nextReplayUs - timeUs);
    if (!(stepUs > 1e-8)) throw new Error('Unable to advance the nerve solver clock.');
    const stepMs = stepUs / 1000;
    const fullStep = Math.abs(stepUs - dtUs) < 1e-7;
    const previousDistal = v[model.detectionIndex];
    const previousProximal = v[model.proximalDetectionIndex];
    // Gates use exact exponential updates with voltage held at the start of
    // this step. Interpolation table spacing is independently convergence tested.
    for (const i of model.activeIndices) {
      const voltage = v[i];
      if (lookup && fullStep && voltage >= TABLE_MIN_MV && voltage < TABLE_MAX_MV) {
        const pos = (voltage - TABLE_MIN_MV) / TABLE_STEP_MV;
        const k = Math.floor(pos); const f = pos - k;
        const mi = lookup[0][k] + f * (lookup[0][k + 1] - lookup[0][k]);
        const ni = lookup[1][k] + f * (lookup[1][k + 1] - lookup[1][k]);
        const hi = lookup[2][k] + f * (lookup[2][k + 1] - lookup[2][k]);
        m[i] = mi + (m[i] - mi) * (lookup[3][k] + f * (lookup[3][k + 1] - lookup[3][k]));
        n[i] = ni + (n[i] - ni) * (lookup[4][k] + f * (lookup[4][k + 1] - lookup[4][k]));
        h[i] = hi + (h[i] - hi) * (lookup[5][k] + f * (lookup[5][k + 1] - lookup[5][k]));
      } else {
        if (voltage < TABLE_MIN_MV || voltage >= TABLE_MAX_MV) outsideLookupSteps++;
        const { am, bm, an, bn, ah, bh } = nerveGateRates(voltage);
        const mi = am / (am + bm); const ni = an / (an + bn); const hi = ah / (ah + bh);
        m[i] = mi + (m[i] - mi) * Math.exp(-(am + bm) * stepMs);
        n[i] = ni + (n[i] - ni) * Math.exp(-(an + bn) * stepMs);
        h[i] = hi + (h[i] - hi) * Math.exp(-(ah + bh) * stepMs);
      }
    }
    // Backward Euler for the stiff passive cable and linear membrane current
    // at the updated gates. O(N) tridiagonal solve, no spatial smoothing.
    for (let i = 0; i < count; i++) {
      const left = i ? model.axialUs[i - 1] : 0;
      const right = i + 1 < count ? model.axialUs[i] : 0;
      const mi = m[i]; const ni = n[i]; const n2 = ni * ni;
      const gn = model.gNaUs[i] * mi * mi * mi * h[i];
      const gk = model.gKUs[i] * n2 * n2;
      const gl = model.gLeakUs[i]; const gm = model.gMyelinUs[i];
      const cdt = model.capacitanceNf[i] / stepMs;
      const diagonal = cdt + left + right + gn + gk + gl + gm;
      const value = cdt * v[i] + gn * ENA_MV + gk * EK_MV + gl * EL_MV + gm * REST_MV + forcing[i];
      const inverse = 1 / (diagonal - (i ? left * forward[i - 1] : 0));
      forward[i] = right * inverse;
      rhs[i] = (value + (i ? left * rhs[i - 1] : 0)) * inverse;
    }
    for (let i = count - 1; i >= 0; i--) {
      v[i] = rhs[i] + (i + 1 < count ? forward[i] * v[i + 1] : 0);
      if (!Number.isFinite(v[i]) || Math.abs(v[i]) > 1e6) throw new Error('Nerve voltage diverged; reduce current or timestep.');
      if (v[i] > maxMv[i]) maxMv[i] = v[i];
      if (v[i] < minMv[i]) minMv[i] = v[i];
    }
    const distal = v[model.detectionIndex];
    const proximal = v[model.proximalDetectionIndex];
    if (armed && previousDistal < spikeThresholdMv && distal >= spikeThresholdMv) {
      spikeTimesMs.push((timeUs + stepUs * (spikeThresholdMv - previousDistal) / (distal - previousDistal)) / 1000);
      armed = false;
    }
    if (!armed && distal < -40) armed = true;
    if (proximalArmed && previousProximal < spikeThresholdMv && proximal >= spikeThresholdMv) {
      proximalSpikeTimesMs.push((timeUs + stepUs * (spikeThresholdMv - previousProximal) / (proximal - previousProximal)) / 1000);
      proximalArmed = false;
    }
    if (!proximalArmed && proximal < -40) proximalArmed = true;
    timeUs += stepUs; steps++; record();
  }
  return {
    modelId: model.id, timeMs, recordCompartments: [...recordCompartments], membraneMv,
    spikeTimesMs, proximalSpikeTimesMs, maxMv, minMv, finalMv: v,
    replayTimesMs, replayMv, compartmentCount: count,
    durationMs, dtUs, steps, lastPulseEndMs: lastPulseEndUs / 1000,
    numericalMethod: 'Backward-Euler cable with exponential gate updates',
    gateLookupSpacingMv: useLookup ? TABLE_STEP_MV : 0, outsideLookupSteps,
  };
}
