/**
 * ChR2(H134R): Williams et al., PLoS Comput Biol 9:e1003220 (2013).
 * DOI 10.1371/journal.pcbi.1003220. Equations checked against ModelDB 244414,
 * ChR2H134R.mod by Michele Giugliano (2018), original MATLAB by J. C. Williams.
 * This implementation is newly written from the published equations.
 * Units: mV, ms, mW/mm^2, degrees C. State order: C1,O1,O2,C2,p.
 * The full current is evaluated analytically, avoiding the removable current
 * singularity of the published rectification-factor representation at V=0.
 */

 const CHR2_MODEL = Object.freeze({
  id: 'williams-2013-h134r',
  name: 'ChR2(H134R)',
  wavelengthNm: 470,
  gamma: 0.1,
  tauActivationMs: 1.3,
  referenceTemperatureC: 22,
  characterizationVoltageMv: [-80, -10],
  characterizationIrradianceMwMm2: [0.34, 5.5],
  doi: '10.1371/journal.pcbi.1003220',
  reference: 'https://modeldb.science/244414',
  stateNames: ['C1', 'O1', 'O2', 'C2', 'p'],
});

const A = 10.6408, B = -14.6408, C = -42.7671;
const PHOTON_RATE_PER_IRRADIANCE = (470e-9 * 12e-20) / (1.986446e-25 * 1.3);
const thermalCache = new Map();

function thermal(tempC) {
  let t = thermalCache.get(tempC);
  if (!t) {
    const x = (tempC - 22) / 10;
    t = {
      d1: 1.97 ** x, d2: 0.05 * 1.77 ** x,
      recovery: 2.56 ** x,
      e12dark: 0.011 * 1.1 ** x, e21dark: 0.008 * 1.95 ** x,
      epsilon1: 0.8535 * 1.46 ** x, epsilon2: 0.14 * 2.77 ** x,
    };
    thermalCache.set(tempC, t);
  }
  return t;
}

 function createChR2State(count) {
  if (!Number.isInteger(count) || count < 1) throw new Error('Opsin state count must be positive.');
  const state = new Float64Array(5 * count);
  for (let i = 0; i < count; i++) state[5 * i] = 1;
  return state;
}

 function effectiveConductance(state, index = 0) {
  return state[5 * index + 1] + 0.1 * state[5 * index + 2];
}

 function openFraction(state, index = 0) {
  return state[5 * index + 1] + state[5 * index + 2];
}

/** Multiply by gbar in microSiemens and effectiveConductance to obtain nA,
 * positive outward. This is exactly R(V)*(V-E) in the published model, E=0.
 */
 function chr2CurrentFactor(voltageMv) {
  return A + B * Math.exp(voltageMv / C);
}

/** Derivative of currentFactor with respect to voltage, always positive. */
 function chr2SlopeFactor(voltageMv) {
  return (B / C) * Math.exp(voltageMv / C);
}

/** Diagnostic only. The original fitted R(V) is undefined at exactly 0 mV.
 * Solvers must use chr2CurrentFactor/chr2SlopeFactor, not this quotient.
 */
 function chr2Rectification(voltageMv) {
  return voltageMv === 0 ? NaN : chr2CurrentFactor(voltageMv) / voltageMv;
}

 function chr2Rates(voltageMv, irradianceMwMm2, tempC = 34, activation = 1) {
  const t = thermal(tempC), E = irradianceMwMm2;
  if (!(E >= 0) || !Number.isFinite(E + voltageMv + tempC)) throw new Error('Invalid opsin input.');
  const F = E * PHOTON_RATE_PER_IRRADIANCE;
  const logLight = Math.log1p(E / 0.024);
  return {
    a1: t.epsilon1 * F * activation,
    a2: t.epsilon2 * F * activation,
    d1: (0.075 + 0.043 * Math.tanh(-(voltageMv + 20) / 20)) * t.d1,
    d2: t.d2,
    recovery: 0.0000434587 * Math.exp(-0.0211539274 * voltageMv) * t.recovery,
    e12: t.e12dark + 0.005 * logLight,
    e21: t.e21dark + 0.004 * logLight,
    activationTarget: 0.5 * (1 + Math.tanh(120 * (100 * E - 0.1))),
  };
}

/**
 * Advance one compartment. p is advanced exactly; its exact midpoint value
 * drives a frozen-rate Markov matrix exponential. Uniformization evaluates
 * that exponential as a sum of nonnegative stochastic matrix powers, so the
 * four probabilities remain nonnegative and normalized without clipping.
 * For time-dependent voltage this is a local frozen-voltage split step.
 */
 function stepChR2(state, index, voltageMv, irradianceMwMm2, dtMs, tempC = 34) {
  if (!(dtMs > 0) || !Number.isFinite(dtMs + voltageMv + irradianceMwMm2 + tempC) || irradianceMwMm2 < 0)
    throw new Error('Invalid ChR2 step input.');
  const j = index * 5;
  const E = irradianceMwMm2, t = thermal(tempC);
  const target = 0.5 * (1 + Math.tanh(120 * (100 * E - 0.1)));
  const halfDecay = Math.exp(-0.5 * dtMs / 1.3);
  const pMid = target + (state[j + 4] - target) * halfDecay;
  const pEnd = target + (pMid - target) * halfDecay;
  const flux = E * PHOTON_RATE_PER_IRRADIANCE;
  const a1 = t.epsilon1 * flux * pMid, a2 = t.epsilon2 * flux * pMid;
  const d1 = (0.075 + 0.043 * Math.tanh(-(voltageMv + 20) / 20)) * t.d1;
  const d2 = t.d2;
  const gr = 0.0000434587 * Math.exp(-0.0211539274 * voltageMv) * t.recovery;
  const ll = Math.log1p(E / 0.024);
  const e12 = t.e12dark + 0.005 * ll, e21 = t.e21dark + 0.004 * ll;
  const q = Math.max(a1, d1 + e12, d2 + e21, a2 + gr);
  const divisions = Math.max(1, Math.ceil(q * dtMs / 0.5));
  const z = q * dtMs / divisions;
  const a1q = a1 / q, a2q = a2 / q, d1q = d1 / q, d2q = d2 / q;
  const grq = gr / q, e12q = e12 / q, e21q = e21 / q;
  let c1 = state[j], o1 = state[j + 1], o2 = state[j + 2], c2 = state[j + 3];
  for (let sub = 0; sub < divisions; sub++) {
    let u0 = c1, u1 = o1, u2 = o2, u3 = c2;
    let weight = Math.exp(-z);
    let r0 = weight * u0, r1 = weight * u1, r2 = weight * u2, r3 = weight * u3;
    for (let k = 1; k <= 18; k++) {
      const v0 = (1 - a1q) * u0 + d1q * u1 + grq * u3;
      const v1 = a1q * u0 + ((q - (d1 + e12)) / q) * u1 + e21q * u2;
      const v2 = e12q * u1 + ((q - (d2 + e21)) / q) * u2 + a2q * u3;
      const v3 = d2q * u2 + ((q - (a2 + gr)) / q) * u3;
      u0 = v0; u1 = v1; u2 = v2; u3 = v3;
      weight *= z / k;
      r0 += weight * u0; r1 += weight * u1; r2 += weight * u2; r3 += weight * u3;
      if (weight < 1e-15 && k >= 3) break;
    }
    // Truncation is <1e-15; normalize roundoff only, never clip probabilities.
    const sum = r0 + r1 + r2 + r3;
    c1 = r0 / sum; o1 = r1 / sum; o2 = r2 / sum; c2 = r3 / sum;
  }
  state[j] = c1; state[j + 1] = o1; state[j + 2] = o2; state[j + 3] = c2;
  state[j + 4] = pEnd;
  return o1 + 0.1 * o2;
}

 function photocurrentNa(state, index, voltageMv, maximalConductanceUs) {
  return maximalConductanceUs * effectiveConductance(state, index) * chr2CurrentFactor(voltageMv);
}













export { CHR2_MODEL, createChR2State, effectiveConductance, openFraction, chr2CurrentFactor, chr2SlopeFactor, chr2Rectification, chr2Rates, stepChR2, photocurrentNa };
