// Passive cable explorer: a uniform sealed cylinder solved with the Cortex
// Laboratory finite-volume integrator (createPassiveCable/stepPassiveCable),
// shown against the analytic steady state of the same cable. Units mV, ms,
// nA, µm; theory in Ω·cm / Ω·cm² / µF·cm⁻² after Rall's cable conventions.
import { createPassiveCable, stepPassiveCable } from './passive-cable.js';

export const CABLE_DEFAULTS = {
  diameterUm: 2,
  lengthUm: 1000,
  resistanceOhmCm2: 20000,
  axialResistivityOhmCm: 150,
  capacitanceUfPerCm2: 1,
  restMv: -65,
  injectionNa: 0.1,
  segments: 128,
  dtMs: 0.025,
  stepStartMs: 5,
  settleTauMult: 6,
};

// Continuous theory for a finite sealed cable with point current at x = 0.
export function cableTheory({
  diameterUm,
  lengthUm,
  resistanceOhmCm2,
  axialResistivityOhmCm,
  capacitanceUfPerCm2,
}) {
  const d = diameterUm * 1e-4; // cm
  const axialOhmPerCm = (4 * axialResistivityOhmCm) / (Math.PI * d * d);
  const membraneOhmCm = resistanceOhmCm2 / (Math.PI * d); // r_m: resistance x length
  const lambdaUm = Math.sqrt(membraneOhmCm / axialOhmPerCm) * 1e4;
  const tauMs = (resistanceOhmCm2 * capacitanceUfPerCm2) / 1000;
  const rInfinityOhm = Math.sqrt(membraneOhmCm * axialOhmPerCm);
  const electrotonicLength = lengthUm / lambdaUm;
  // Sealed far end: R_in = R_inf coth(L/lambda).
  const inputResistanceMOhm = rInfinityOhm / Math.tanh(electrotonicLength) / 1e6;
  // First equalization constant of the finite sealed cable (Rall).
  const tau1Ms = tauMs / (1 + (Math.PI / electrotonicLength) ** 2);
  return { lambdaUm, tauMs, tau1Ms, rInfinityOhm, inputResistanceMOhm, electrotonicLength };
}

// Analytic steady-state departure from rest, mV, at position xUm.
export function analyticSteadyStateMv(xUm, { lengthUm, injectionNa }, theory) {
  const lam = theory.lambdaUm;
  return (
    ((injectionNa * 1e-9 * theory.rInfinityOhm *
      Math.cosh((lengthUm - xUm) / lam)) /
      Math.sinh(lengthUm / lam)) *
    1000
  );
}

function buildNodes({ diameterUm, lengthUm, segments }) {
  const seg = lengthUm / segments;
  const nodes = [];
  for (let i = 0; i < segments; i++)
    nodes.push({
      id: i,
      parent: i - 1,
      lengthUm: seg,
      diameterUm,
      areaUm2: Math.PI * diameterUm * seg, // lateral membrane only, like the continuum cable
    });
  return nodes;
}

// Full run: current step into compartment 0, transient samples at three
// positions, then the steady-state profile compared against the analytic one.
export function runCableExperiment(options = {}) {
  const cfg = { ...CABLE_DEFAULTS, ...options };
  const theory = cableTheory(cfg);
  const nodes = buildNodes(cfg);
  const membrane = {
    restMv: cfg.restMv,
    capacitanceUfPerCm2: cfg.capacitanceUfPerCm2,
    resistanceOhmCm2: cfg.resistanceOhmCm2,
    axialResistivityOhmCm: cfg.axialResistivityOhmCm,
  };
  const c = createPassiveCable(nodes, membrane);
  const totalMs = cfg.stepStartMs + Math.max(cfg.settleTauMult * theory.tauMs, 30);
  const steps = Math.round(totalMs / cfg.dtMs);
  const sampleEvery = Math.max(1, Math.round(0.25 / cfg.dtMs));
  const probeIndices = [0, Math.floor(cfg.segments / 2), cfg.segments - 1];
  const timeMs = [];
  const traces = probeIndices.map(() => []);
  const injection = new Float64Array(cfg.segments);
  for (let k = 1; k <= steps; k++) {
    const t = k * cfg.dtMs;
    injection[0] = t >= cfg.stepStartMs ? cfg.injectionNa : 0;
    stepPassiveCable(c, cfg.dtMs, { injectionNa: injection });
    if (!Number.isFinite(c.voltageMv[0])) throw new Error('Non-finite cable voltage.');
    if (k % sampleEvery === 0) {
      timeMs.push(t);
      probeIndices.forEach((idx, j) => traces[j].push(c.voltageMv[idx]));
    }
  }
  const seg = cfg.lengthUm / cfg.segments;
  const profile = nodes.map((_, i) => {
    const x = (i + 0.5) * seg;
    return {
      xUm: x,
      numericMv: c.voltageMv[i] - cfg.restMv,
      analyticMv: analyticSteadyStateMv(x, cfg, theory),
    };
  });
  const v0 = analyticSteadyStateMv(0, cfg, theory);
  const maxAbsErrorMv = Math.max(...profile.map((p) => Math.abs(p.numericMv - p.analyticMv)));
  const numericInputResistanceMOhm =
    cfg.injectionNa !== 0
      ? Math.abs((c.voltageMv[0] - cfg.restMv) / cfg.injectionNa) // mV per nA = MOhm
      : null;
  return {
    theory,
    timeMs,
    probes: probeIndices.map((idx, j) => ({ xUm: (idx + 0.5) * seg, voltageMv: traces[j] })),
    profile,
    comparison: {
      steadyStateErrorPct: v0 !== 0 ? (100 * maxAbsErrorMv) / Math.abs(v0) : 0,
      numericInputResistanceMOhm,
      analyticInputResistanceMOhm: theory.inputResistanceMOhm,
    },
    config: { ...cfg, totalMs },
  };
}
