import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createPrimaGeometry, returnBasisSites } from '../src/lib/prima/geometry.mjs';
import { PHYSICS_DEFAULTS, normalizePhysicsConfig, surfaceGreenOhm, mutualResistanceOhm,
  buildTransferModel, makeCircuitModel, advanceCircuit, evaluateFields, returnCurrentsA, solvePhysics } from '../src/lib/prima/physics.mjs';

const reference = JSON.parse(await readFile(new URL('../public/assets/prima/physics-reference.json', import.meta.url)));
function relativePeak(actual, expected, tolerance = 2e-8, floor = 1e-15) {
  const flat = x => Array.from(x).flat(Infinity);
  const a = flat(actual), b = flat(expected);
  assert.equal(a.length, b.length);
  const scale = Math.max(floor, ...b.map(Math.abs));
  const error = Math.max(0, ...a.map((v, i) => Math.abs(v - b[i]))) / scale;
  assert.ok(error <= tolerance, `peak-normalized error ${error} exceeds ${tolerance}`);
  return error;
}
function smallGeometry(fixture) {
  const c = fixture.config, n = fixture.centersUm.length, radius = 100 / Math.sqrt(3);
  return { version: `reference-${fixture.name}`, count: n, activeRadiusUm: c.activeRadiusUm,
    returnWidthUm: c.returnWidthUm, activeAreaUm2: Math.PI * c.activeRadiusUm ** 2,
    returnAreaUm2: fixture.edgeCount * radius * c.returnWidthUm,
    pixels: fixture.centersUm.map(([xUm, yUm], index) => ({ id: `P${index + 1}`, index, xUm, yUm,
      vertices: Array.from({ length: 6 }, (_, k) => ({ xUm: xUm + radius * Math.cos(Math.PI / 6 + k * Math.PI / 3), yUm: yUm + radius * Math.sin(Math.PI / 6 + k * Math.PI / 3) })) })) };
}

test('reconstructed array has378 nonoverlapping complete hexagons, nominalpitch and stableidentities', () => {
  const g = createPrimaGeometry();
  assert.equal(g.pixels.length, 378); assert.equal(g.meshEdges.length, 1205);
  assert.equal(new Set(g.pixels.map(p => p.id)).size, 378);
  assert.ok(g.geometryStatus.includes('reconstruction'));
  let sx = 0, sy = 0, nearest = Infinity;
  for (let i = 0; i < g.pixels.length; i++) {
    const p = g.pixels[i]; sx += p.xUm; sy += p.yUm;
    for (const v of p.vertices) assert.ok(Math.abs(v.xUm) <= 1000 && Math.abs(v.yUm) <= 1000);
    for (let j = 0; j < i; j++) nearest = Math.min(nearest, Math.hypot(p.xUm - g.pixels[j].xUm, p.yUm - g.pixels[j].yUm));
  }
  assert.ok(Math.abs(sx) < 1e-8 && Math.abs(sy) < 1e-8);
  assert.ok(Math.abs(nearest - 100) < 1e-9);
  assert.equal(g.defaultSelectedPixelId, 'P180');
});

test('fullgeometry agrees with independently reconstructed Python lattice', () => {
  const g = createPrimaGeometry();
  relativePeak(g.pixels.map(p => [p.xUm, p.yUm]), reference.fullCircuit.centersUm, 2e-9);
  assert.equal(g.meshEdges.length, reference.fullCircuit.edgeCount);
  assert.equal(returnBasisSites(g.pixels[0]).length, 96);
});

test('half-space potential agrees with independent Hankel-transform integration', () => {
  for (const c of reference.greenCases) {
    const value = surfaceGreenOhm(c.radiusUm, 0, c.zUm, c.sourceWidthUm, c.conductivitySm);
    relativePeak([value], [c.resistanceOhm], 2e-9);
  }
});

test('surfacebasis enforces correct half-space factor and reciprocal averaging', () => {
  const r = surfaceGreenOhm(0, 0, 100, 10, .2);
  assert.ok(Math.abs(r - 1 / (2 * Math.PI * .2 * 110e-6)) < 1e-9);
  assert.equal(mutualResistanceOhm(30, -40, 3, 8, .2), mutualResistanceOhm(-30, 40, 8, 3, .2));
  assert.equal(surfaceGreenOhm(5, 7, 20, 3, .1), 2 * surfaceGreenOhm(5, 7, 20, 3, .2));
  assert.throws(() => surfaceGreenOhm(0, 0, -1, 3, .2));
});

for (const fixture of reference.smallCircuits) {
  test(`${fixture.name}: portimpedance and sharedreturns agree with augmented SciPy solve`, () => {
    const g = smallGeometry(fixture), m = makeCircuitModel(fixture.config, g);
    relativePeak(m.impedanceOhm, fixture.impedanceOhm, 3e-9);
    relativePeak(m.returnMap, fixture.returnMap, 3e-9);
    for (let j = 0; j < m.n; j++) {
      let total = 0; for (let i = 0; i < m.n; i++) total += m.returnMap[i * m.n + j];
      assert.ok(Math.abs(total + 1) < 1e-10);
    }
  });
  test(`${fixture.name}: nonlinear circuit agrees with independent global Newton solution`, () => {
    const g = smallGeometry(fixture), m = makeCircuitModel(fixture.config, g), truth = fixture.adaptive.snapshot;
    const state = advanceCircuit(m, fixture.config, { chargeC: Float64Array.from(truth.chargeC), currentA: new Float64Array(m.n) }, Float64Array.from(fixture.photocurrentA), 0);
    // Normalize to the physical drive scale, not an almost-zero late current.
    // The absolute circuit residual budget is independently asserted below.
    relativePeak(state.currentA, truth.currentA, 5e-8, Math.max(...fixture.photocurrentA));
    relativePeak(state.voltageV, truth.voltageV, 2e-8);
    assert.ok(state.residualA <= 2e-13);
  });
}

test('port network is passive for independent excitations and redistributes return current', () => {
  const fixture = reference.smallCircuits[0], m = makeCircuitModel(fixture.config, smallGeometry(fixture));
  for (let k = 0; k < 12; k++) {
    const current = Float64Array.from({ length: m.n }, (_, i) => Math.sin((i + 1) * (k + 1)) * 1e-6);
    let power = 0;
    for (let i = 0; i < m.n; i++) for (let j = 0; j < m.n; j++) power += current[i] * m.impedanceOhm[i * m.n + j] * current[j];
    assert.ok(power > 0);
    const returns = returnCurrentsA(m, current);
    assert.ok(Math.abs(current.reduce((a, b) => a + b, 0) + returns.reduce((a, b) => a + b, 0)) < 1e-19);
  }
  assert.ok(Math.abs(m.returnMap[1]) > .001, 'shared mesh must distribute current beyond one paired return');
});

test('field and analytical derivatives agree with independent full-array values and finite differences', () => {
  const f = reference.fullCircuit, g = createPrimaGeometry(f.config), m = makeCircuitModel(f.config, g);
  const currents = Float64Array.from(f.backwardEuler.snapshot.currentA);
  const points = f.fieldPointsUm.map(([xUm, yUm, zUm]) => ({ xUm, yUm, zUm }));
  const calculated = evaluateFields(m, g, currents, points);
  relativePeak(calculated.map(p => [p.potentialMv, p.exVm, p.eyVm, p.ezVm]), f.fieldValuesMvVm, 3e-8);
  relativePeak(returnCurrentsA(m, currents), f.returnCurrentsA, 3e-8);
  const p = { xUm: -250, yUm: 125, zUm: 35 }, epsilonUm = .01;
  const at = evaluateFields(m, g, currents, [p])[0];
  for (const [coord, key] of [['xUm', 'exVm'], ['yUm', 'eyVm'], ['zUm', 'ezVm']]) {
    const plus = { ...p, [coord]: p[coord] + epsilonUm }, minus = { ...p, [coord]: p[coord] - epsilonUm };
    const both = evaluateFields(m, g, currents, [plus, minus]);
    const numeric = -(both[0].potentialMv - both[1].potentialMv) * 1e-3 / (2 * epsilonUm * 1e-6);
    relativePeak([at[key]], [numeric], 3e-6);
  }
});

test('full378 backward-Euler train agrees with independent global Newton time integration', () => {
  const f = reference.fullCircuit, r = solvePhysics({ ...f.config, fieldGridSize: 31 }, f.illumination);
  relativePeak(r.pixelMetrics.map(p => p.snapshotCurrentUa * 1e-6), f.backwardEuler.snapshot.currentA, 2e-6);
  relativePeak(r.pixelMetrics.map(p => p.phaseChargeNc * 1e-9), f.backwardEuler.phaseChargeC, 2e-6);
  relativePeak(r.pixelMetrics.map(p => p.residualChargeNc * 1e-9), f.backwardEuler.finalChargeC, 5e-6);
  assert.ok(r.metrics.maxKclResidualPa <= .2);
  assert.ok(Math.abs(r.metrics.currentBalanceUa) < 1e-9);
  assert.equal(r.field.snapshotTimeMs, f.config.pulseDurationMs / 2);
  assert.ok(r.metrics.maxPixelResidualChargeNc > 0, 'finite-window residual must not be artificially zeroed');
  assert.ok(r.pixelMetrics.some(p => p.illumination === 0 && p.snapshotCurrentUa < 0), 'dark pixels should carry coupled return current');
  assert.equal(r.metrics.residualActiveChargeNc, -r.metrics.returnInterfaceChargeNc);
});

test('zero illumination is exactly zero despite nonlinear circuit and interface states', () => {
  const r = solvePhysics({ cycles: 1, fieldGridSize: 31 }, new Float64Array(378));
  for (const key of ['currentUa', 'polarizationMv', 'diodeVoltageV', 'arrayCurrentUa', 'returnCurrentUa']) assert.ok(r.waveform[key].every(v => v === 0));
  assert.ok(r.field.potentialMv.every(v => v === 0)); assert.ok(r.field.bcDeltaMv.every(v => v === 0));
  assert.equal(r.metrics.averageIncidentPowerMw, 0);
});

test('photocurrent dimensions use the area of each series photodiode and incident duty cycle', () => {
  const f = reference.fullCircuit, g = createPrimaGeometry(f.config);
  const expected = f.config.irradianceMwMm2 * g.photosensitiveAreaPerDiodeUm2 * 1e-9 * f.config.responsivityAW;
  const lit = f.illumination.findIndex(v => v === 1);
  relativePeak([expected], [f.photocurrentA[lit]], 3e-9);
  assert.ok(g.photosensitiveAreaPerDiodeUm2 < g.pixelAreaUm2 / 2);
});

test('invalid physics inputs and excessive run duration fail explicitly', () => {
  for (const patch of [{ conductivitySm: 0 }, { gapUm: NaN }, { selectedPixelId: 'P379' }, { cycles: 1.5 }, { cycles: 8, frequencyHz: 1, timeStepMs: .025 }]) assert.throws(() => normalizePhysicsConfig(patch));
  assert.throws(() => solvePhysics({}, [1]));
  const invalid = new Float64Array(378); invalid[0] = -1; assert.throws(() => solvePhysics({}, invalid));
  assert.equal(normalizePhysicsConfig().selectedPixelId, PHYSICS_DEFAULTS.selectedPixelId);
});

test('stored convergence report resolves temporal and return-basis errors separately', () => {
  assert.equal(reference.convergence.time.length, 16);
  for (const name of reference.smallCircuits.map(c => c.name)) {
    const sweep = reference.convergence.time.filter(c => c.case === name);
    assert.ok(sweep.at(-1).maxPhaseChargeErrorRelativeToPeak < sweep[0].maxPhaseChargeErrorRelativeToPeak);
  }
  assert.ok(reference.fullCircuit.minPortResistanceEigenvalueOhm > 0);
  assert.equal(reference.convergence.returnBasis.at(-1).returnSegmentsPerSide, 32);
});
