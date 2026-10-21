import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CABLE_DEFAULTS,
  cableTheory,
  analyticSteadyStateMv,
  runCableExperiment,
} from '../src/lib/cortex/cable-explorer.js';

const REFERENCE = {
  diameterUm: 1,
  lengthUm: 1000,
  resistanceOhmCm2: 10000,
  axialResistivityOhmCm: 100,
  capacitanceUfPerCm2: 1,
  injectionNa: 0.1,
};

test('cable theory reproduces the hand-computed reference values', () => {
  const t = cableTheory(REFERENCE);
  // lambda = sqrt(d Rm / 4 Ri) = sqrt(1e-4 * 1e4 / 400) cm = 500 um
  assert.ok(Math.abs(t.lambdaUm - 500) < 1e-9, `lambda ${t.lambdaUm}`);
  assert.ok(Math.abs(t.tauMs - 10) < 1e-9, `tau ${t.tauMs}`);
  assert.ok(Math.abs(t.electrotonicLength - 2) < 1e-9, `L/lambda ${t.electrotonicLength}`);
  // R_in = R_inf coth(2); R_inf = sqrt(r_m r_i) = 636.6 MOhm
  assert.ok(Math.abs(t.inputResistanceMOhm - 660.375) < 0.01, `Rin ${t.inputResistanceMOhm}`);
  // First equalization constant: tau / (1 + (pi/2)^2)
  assert.ok(Math.abs(t.tau1Ms - 10 / (1 + (Math.PI / 2) ** 2)) < 1e-9, `tau1 ${t.tau1Ms}`);
});

test('analytic sealed-cable profile decays from the injection site', () => {
  const t = cableTheory(REFERENCE);
  const v0 = analyticSteadyStateMv(0, REFERENCE, t);
  const vL = analyticSteadyStateMv(1000, REFERENCE, t);
  assert.ok(v0 > 0 && vL > 0);
  assert.ok(v0 > vL);
  // Sealed end: V(L) / V(0) = 1 / cosh(L/lambda) = 1 / cosh(2)
  assert.ok(Math.abs(vL / v0 - 1 / Math.cosh(2)) < 1e-9, `ratio ${vL / v0}`);
});

test('numeric steady state matches the analytic profile within 0.5%', () => {
  const r = runCableExperiment(REFERENCE);
  assert.ok(
    r.comparison.steadyStateErrorPct < 0.5,
    `error ${r.comparison.steadyStateErrorPct}%`,
  );
  const ratio = r.comparison.numericInputResistanceMOhm / r.comparison.analyticInputResistanceMOhm;
  assert.ok(ratio > 0.98 && ratio < 1.02, `Rin ratio ${ratio}`);
});

test('spatial refinement reduces the steady-state discretization error', () => {
  const coarse = runCableExperiment({ ...REFERENCE, segments: 32, settleTauMult: 10 });
  const fine = runCableExperiment({ ...REFERENCE, segments: 256, settleTauMult: 10 });
  assert.ok(
    fine.comparison.steadyStateErrorPct < coarse.comparison.steadyStateErrorPct,
    `coarse ${coarse.comparison.steadyStateErrorPct} fine ${fine.comparison.steadyStateErrorPct}`,
  );
});

test('a cable much longer than lambda barely reaches the sealed end', () => {
  const r = runCableExperiment({ ...REFERENCE, lengthUm: 2500 }); // L = 5 lambda
  const first = r.profile[0].numericMv;
  const last = r.profile.at(-1).numericMv;
  assert.ok(Math.abs(last / first) < 0.02, `end ratio ${last / first}`);
});

test('zero current leaves the cable at rest', () => {
  const r = runCableExperiment({ ...REFERENCE, injectionNa: 0 });
  const maxDeflection = Math.max(...r.profile.map((p) => Math.abs(p.numericMv)));
  assert.ok(maxDeflection < 1e-9, `deflection ${maxDeflection}`);
});

test('membrane time constant scales with Rm and Cm', () => {
  const base = cableTheory(REFERENCE).tauMs;
  const doubledRm = cableTheory({ ...REFERENCE, resistanceOhmCm2: 20000 }).tauMs;
  const doubledCm = cableTheory({ ...REFERENCE, capacitanceUfPerCm2: 2 }).tauMs;
  assert.ok(Math.abs(doubledRm - 2 * base) < 1e-9);
  assert.ok(Math.abs(doubledCm - 2 * base) < 1e-9);
});

test('defaults match the Cortex Laboratory passive membrane', () => {
  assert.equal(CABLE_DEFAULTS.resistanceOhmCm2, 20000);
  assert.equal(CABLE_DEFAULTS.axialResistivityOhmCm, 150);
  assert.equal(CABLE_DEFAULTS.capacitanceUfPerCm2, 1);
  assert.equal(CABLE_DEFAULTS.restMv, -65);
});
