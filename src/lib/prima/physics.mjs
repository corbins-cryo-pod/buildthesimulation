import { createPrimaGeometry, returnBasisSites } from './geometry.mjs';

/** Research assumptions, not a clinical PRIMA calibration or operating limits. */
export const PHYSICS_DEFAULTS = Object.freeze({
  irradianceMwMm2: 3.5, pulseDurationMs: 5.6, frequencyHz: 30, cycles: 3,
  timeStepMs: 0.05, conductivitySm: 0.2, gapUm: 35, bipolarLengthUm: 50,
  fieldGridSize: 61, activeRadiusUm: 15, returnWidthUm: 4,
  capacitanceDensityFm2: 20, shuntMohm: 1, responsivityAW: 0.5,
  diodeIdeality: 1.5, diodeSaturationNa: 0.001, selectedPixelId: 'P180',
});
export const PHYSICS_BOUNDS = Object.freeze({
  irradianceMwMm2: [0, 4], pulseDurationMs: [0.7, 9.8], frequencyHz: [1, 40],
  cycles: [1, 8], timeStepMs: [0.025, 0.5], conductivitySm: [0.05, 1],
  gapUm: [10, 100], bipolarLengthUm: [20, 100], activeRadiusUm: [8, 20],
  returnWidthUm: [2, 6], capacitanceDensityFm2: [1, 40], shuntMohm: [0.1, 10],
  responsivityAW: [0.1, 0.65], diodeIdeality: [1, 2], diodeSaturationNa: [0.00001, 0.1],
});
export const PHYSICS_VERSION = 'prima-reduced-halfspace-circuit-1.0.0';
const TWO_PI = 2 * Math.PI;
const K_OVER_Q = 8.617333262145e-5; // V/K; CODATA exact kB/e ratio.
const TEMPERATURE_K = 310;

export function normalizePhysicsConfig(input = {}) {
  const c = { ...PHYSICS_DEFAULTS };
  for (const key of Object.keys(c)) if (input[key] !== undefined) c[key] = input[key];
  for (const [key, [lo, hi]] of Object.entries(PHYSICS_BOUNDS)) {
    if (typeof c[key] !== 'number' || !Number.isFinite(c[key]) || c[key] < lo || c[key] > hi) throw new Error(`${key} must be a finite number from ${lo} to ${hi}.`);
  }
  if (!Number.isInteger(c.cycles)) throw new Error('cycles must be an integer.');
  if (![31, 61, 81].includes(c.fieldGridSize)) throw new Error('fieldGridSize must be 31, 61 or 81.');
  if (!/^P\d{3}$/.test(c.selectedPixelId) || +c.selectedPixelId.slice(1) < 1 || +c.selectedPixelId.slice(1) > 378) throw new Error('Selected pixel must be P001 through P378.');
  const periodMs = 1000 / c.frequencyHz;
  if (c.pulseDurationMs >= periodMs) throw new Error('Each pulse requires a dark recovery interval.');
  let onSteps = Math.ceil(c.pulseDurationMs / c.timeStepMs);
  if (onSteps % 2) onSteps++;
  const offSteps = Math.ceil((periodMs - c.pulseDurationMs) / c.timeStepMs);
  if (c.cycles * (onSteps + offSteps) > 12000) throw new Error('This experiment exceeds 12,000 integration steps.');
  return c;
}

/**
 * Exact half-space potential for a normalized Poisson surface-flux basis:
 * j(r)=I*a/[2π(r²+a²)^(3/2)]. The smoothing length a is a basis parameter,
 * not a tissue gap or electrode depth. Its noncompact tails are a limitation.
 * Inputs in µm and S/m, result Ω. No full-space 1/(4πσr) factor is used.
 */
export function surfaceGreenOhm(dxUm, dyUm, zUm, sourceWidthUm, conductivitySm) {
  if (![dxUm, dyUm, zUm, sourceWidthUm, conductivitySm].every(Number.isFinite) || zUm < 0 || sourceWidthUm <= 0 || conductivitySm <= 0) throw new Error('Invalid half-space Green-function argument.');
  return 1e6 / (TWO_PI * conductivitySm * Math.hypot(dxUm, dyUm, zUm + sourceWidthUm));
}

/** Galerkin average of source and test Poisson bases; reciprocal and passive. */
export function mutualResistanceOhm(dxUm, dyUm, sourceWidthUm, testWidthUm, conductivitySm) {
  return surfaceGreenOhm(dxUm, dyUm, 0, sourceWidthUm + testWidthUm, conductivitySm);
}

function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function matVec(a, x, n, out = new Float64Array(n)) {
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0, p = i * n; j < n; j++) s += a[p + j] * x[j]; out[i] = s; }
  return out;
}
function cholesky(a, n) {
  const l = new Float64Array(a.length);
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let sum = a[i * n + j];
    for (let k = 0; k < j; k++) sum -= l[i * n + k] * l[j * n + k];
    if (i === j) {
      if (!(sum > 0) || !Number.isFinite(sum)) throw new Error('The transfer matrix failed its positive-definiteness check.');
      l[i * n + j] = Math.sqrt(sum);
    } else l[i * n + j] = sum / l[j * n + j];
  }
  return l;
}
function cholSolve(l, b, n, out = new Float64Array(n)) {
  for (let i = 0; i < n; i++) {
    let v = b[i]; for (let j = 0; j < i; j++) v -= l[i * n + j] * out[j];
    out[i] = v / l[i * n + i];
  }
  for (let i = n - 1; i >= 0; i--) {
    let v = out[i]; for (let j = i + 1; j < n; j++) v -= l[j * n + i] * out[j];
    out[i] = v / l[i * n + i];
  }
  return out;
}

// Geometry matrices are cached at σ=1 and scaled exactly for conductivity.
// Two entries bound memory; each has three n×n arrays (~3.5 MB at n=378).
const transferCache = new Map();
export function buildTransferModel(geometry, { conductivitySm = 0.2, returnSubdivisions = 16 } = {}) {
  if (!Number.isFinite(conductivitySm) || conductivitySm <= 0) throw new Error('Conductivity must be positive.');
  const pixels = geometry.pixels, n = pixels.length;
  if (!n || n > 378) throw new Error('Transfer model requires 1–378 pixels.');
  const key = `${geometry.version}|${pixels.map(p => `${p.xUm},${p.yUm}`).join(';')}|${geometry.activeRadiusUm}|${geometry.returnWidthUm}|${returnSubdivisions}`;
  let base = transferCache.get(key);
  if (!base) {
    // Self resistance of the active Poisson basis matches the spreading
    // resistance 1/(4σr) of an equipotential circular contact.
    const activeWidthUm = geometry.activeRadiusUm / Math.PI;
    const returnWidthUm = geometry.returnWidthUm / 2;
    const offsets = returnBasisSites({ vertices: geometry.pixels[0].vertices.map(v => ({ xUm: v.xUm - pixels[0].xUm, yUm: v.yUm - pixels[0].yUm })) }, returnSubdivisions);
    const weights = offsets.map(p => p.weight);
    const count = offsets.length;
    const raa = new Float64Array(n * n), rar = new Float64Array(n * n), rrr = new Float64Array(n * n);
    const pairCache = new Map();
    for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
      const dx = pixels[i].xUm - pixels[j].xUm, dy = pixels[i].yUm - pixels[j].yUm;
      const pairKey = `${Math.round(dx * 1e5)},${Math.round(dy * 1e5)}`;
      let pair = pairCache.get(pairKey);
      if (!pair) {
        const aa = mutualResistanceOhm(dx, dy, activeWidthUm, activeWidthUm, 1);
        let ar = 0, rr = 0;
        for (let a = 0; a < count; a++) {
          ar += weights[a] * mutualResistanceOhm(dx - offsets[a].xUm, dy - offsets[a].yUm, activeWidthUm, returnWidthUm, 1);
          for (let b = 0; b < count; b++) rr += weights[a] * weights[b] * mutualResistanceOhm(dx + offsets[a].xUm - offsets[b].xUm, dy + offsets[a].yUm - offsets[b].yUm, returnWidthUm, returnWidthUm, 1);
        }
        pair = [aa, ar, rr]; pairCache.set(pairKey, pair);
      }
      raa[i * n + j] = raa[j * n + i] = pair[0];
      rar[i * n + j] = rar[j * n + i] = pair[1];
      rrr[i * n + j] = rrr[j * n + i] = pair[2];
    }
    const l = cholesky(rrr, n), one = new Float64Array(n).fill(1);
    const g = cholSolve(l, one, n), gSum = g.reduce((a, b) => a + b, 0);
    const returnMap = new Float64Array(n * n), returnPotentialPerA = new Float64Array(n), rhs = new Float64Array(n);
    for (let j = 0; j < n; j++) {
      for (let r = 0; r < n; r++) rhs[r] = rar[j * n + r];
      const t = cholSolve(l, rhs, n), w = (t.reduce((a, b) => a + b, 0) - 1) / gSum;
      returnPotentialPerA[j] = w;
      for (let r = 0; r < n; r++) returnMap[r * n + j] = -t[r] + g[r] * w;
    }
    const impedanceOhm = new Float64Array(n * n);
    for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
      let value = raa[i * n + j] - returnPotentialPerA[j];
      for (let r = 0; r < n; r++) value += rar[i * n + r] * returnMap[r * n + j];
      impedanceOhm[i * n + j] = impedanceOhm[j * n + i] = value;
    }
    // Fails loudly if the reconstructed port network is not passive.
    cholesky(impedanceOhm, n);
    base = { n, activeWidthUm, returnWidthUm, offsets, returnSubdivisions, impedanceOhm, returnMap, returnPotentialPerA };
    transferCache.set(key, base);
    if (transferCache.size > 2) transferCache.delete(transferCache.keys().next().value);
  }
  return { ...base, conductivitySm,
    impedanceOhm: Float64Array.from(base.impedanceOhm, v => v / conductivitySm),
    returnPotentialPerA: Float64Array.from(base.returnPotentialPerA, v => v / conductivitySm),
  };
}

function lightCurrentA(c, geometry, illumination) {
  // mW/mm² × µm² × 1e-9 = W. Each series subdiode receives half of the
  // available photosensitive area. Series photocurrents do not add.
  return Float64Array.from(illumination, level => level * c.irradianceMwMm2 * geometry.photosensitiveAreaPerDiodeUm2 * 1e-9 * c.responsivityAW);
}

function diodeTerms(voltage, saturationA, alphaV) {
  const exponent = Math.min(100, voltage / alphaV);
  const exponential = Math.exp(exponent);
  return [saturationA * Math.expm1(exponent), saturationA * exponential / alphaV];
}

/** Monotone scalar solution; Newton is bracketed, never voltage-clipped. */
function solveScalarVoltage(offset, resistance, photoA, c, initial) {
  const saturationA = c.diodeSaturationNa * 1e-9;
  const alphaV = 2 * c.diodeIdeality * K_OVER_Q * TEMPERATURE_K;
  const shuntOhm = c.shuntMohm * 1e6;
  let low = Math.min(offset, 0) - 1, high = Math.max(offset, 1.5) + 1;
  let v = Math.max(low, Math.min(high, initial));
  for (let iter = 0; iter < 50; iter++) {
    const [id, gd] = diodeTerms(v, saturationA, alphaV);
    const f = (v - offset) / resistance - photoA + id + v / shuntOhm;
    if (Math.abs(f) < 1e-15) return v;
    if (f > 0) high = v; else low = v;
    const next = v - f / (1 / resistance + gd + 1 / shuntOhm);
    v = next > low && next < high ? next : (low + high) / 2;
  }
  throw new Error('The photovoltaic scalar equation did not converge.');
}

/**
 * Backward-Euler step solves q+=h*i and i=Iphoto-Id(v)-v/Rsh,
 * v=Z*i+q/Cactive+sum(q)/Creturn. Nonlinear Gauss-Seidel uses exact
 * scalar solves and verifies every diode KCL residual before accepting.
 */
export function advanceCircuit(model, config, state, photoA, hSeconds) {
  const c = config, n = model.n;
  if (!Number.isFinite(hSeconds) || hSeconds < 0) throw new Error('Time increment must be non-negative.');
  const ca = model.activeCapacitanceF, cr = model.returnCapacitanceF;
  const q = state.chargeC, current = Float64Array.from(state.currentA || new Float64Array(n));
  model.stepMatrices ??= new Map();
  let a = model.stepMatrices.get(hSeconds);
  if (!a) {
    a = Float64Array.from(model.impedanceOhm, v => v + hSeconds / cr);
    for (let i = 0; i < n; i++) a[i * n + i] += hSeconds / ca;
    model.stepMatrices.set(hSeconds, a);
    if (model.stepMatrices.size > 5) model.stepMatrices.delete(model.stepMatrices.keys().next().value);
  }
  const sumQ = q.reduce((x, y) => x + y, 0);
  const offset = Float64Array.from(q, qi => qi / ca + sumQ / cr);
  const v = matVec(a, current, n); for (let i = 0; i < n; i++) v[i] += offset[i];
  const is = c.diodeSaturationNa * 1e-9, alpha = 2 * c.diodeIdeality * K_OVER_Q * TEMPERATURE_K, rsh = c.shuntMohm * 1e6;
  let residualA = Infinity, sweeps = 0;
  const toleranceA = 2e-13;
  for (; sweeps < 100; sweeps++) {
    for (let i = 0; i < n; i++) {
      const diagonal = a[i * n + i], other = v[i] - diagonal * current[i];
      const nextV = solveScalarVoltage(other, diagonal, photoA[i], c, v[i]);
      const nextI = (nextV - other) / diagonal, delta = nextI - current[i];
      current[i] = nextI;
      // The matrix is symmetric; use its contiguous row instead of a strided
      // column to avoid a large cache penalty in browser workers.
      if (delta !== 0) for (let j = 0, row = i * n; j < n; j++) v[j] += a[row + j] * delta;
    }
    residualA = 0;
    for (let i = 0; i < n; i++) {
      const id = diodeTerms(v[i], is, alpha)[0];
      residualA = Math.max(residualA, Math.abs(current[i] - photoA[i] + id + v[i] / rsh));
    }
    if (residualA <= toleranceA) break;
  }
  if (residualA > toleranceA || !Number.isFinite(residualA)) throw new Error(`Photovoltaic network failed KCL tolerance (${residualA} A).`);
  const chargeC = Float64Array.from(q, (qi, i) => qi + hSeconds * current[i]);
  return { chargeC, currentA: current, voltageV: v, residualA, sweeps: sweeps + 1 };
}

export function makeCircuitModel(config, geometry = createPrimaGeometry(config), options = {}) {
  const c = normalizePhysicsConfig(config), transfer = buildTransferModel(geometry, { conductivitySm: c.conductivitySm, ...options });
  return { ...transfer, activeCapacitanceF: c.capacitanceDensityFm2 * geometry.activeAreaUm2 * 1e-12,
    returnCapacitanceF: c.capacitanceDensityFm2 * geometry.returnAreaUm2 * 1e-12 };
}

export function returnCurrentsA(model, activeCurrentsA) {
  const returns = matVec(model.returnMap, activeCurrentsA, model.n);
  const before = activeCurrentsA.reduce((a, b) => a + b, 0) + returns.reduce((a, b) => a + b, 0);
  // Correct only floating-point summation error, never a physical residual.
  if (Math.abs(before) > 1e-10 * Math.max(1e-12, activeCurrentsA.reduce((a, b) => a + Math.abs(b), 0))) throw new Error('Shared-return current conservation failed.');
  returns[returns.length - 1] -= before;
  return returns;
}

export function evaluateFields(model, geometry, activeCurrentsA, points) {
  const returns = returnCurrentsA(model, activeCurrentsA), source = [], meshSources = new Map();
  for (let i = 0; i < geometry.pixels.length; i++) {
    const p = geometry.pixels[i];
    source.push({ x: p.xUm, y: p.yUm, a: model.activeWidthUm, i: activeCurrentsA[i] });
    for (const d of model.offsets) {
      const x = p.xUm + d.xUm, y = p.yUm + d.yUm;
      const key = `${Math.round(x * 1e6)},${Math.round(y * 1e6)}`;
      if (!meshSources.has(key)) meshSources.set(key, { x, y, a: model.returnWidthUm, i: 0 });
      meshSources.get(key).i += returns[i] * d.weight;
    }
  }
  source.push(...meshSources.values());
  const factorV = 1e6 / (TWO_PI * model.conductivitySm);
  return points.map(point => {
    if (![point.xUm, point.yUm, point.zUm].every(Number.isFinite) || point.zUm < 0) throw new Error('Field points must be finite and on or above the tissue plane.');
    let v = 0, ex = 0, ey = 0, ez = 0;
    for (const s of source) {
      if (s.i === 0) continue;
      const dx = point.xUm - s.x, dy = point.yUm - s.y, dz = point.zUm + s.a;
      const distance2 = dx * dx + dy * dy + dz * dz, inverse = 1 / Math.sqrt(distance2);
      const q = factorV * s.i, gradient = q * inverse / distance2 * 1e6;
      v += q * inverse; ex += gradient * dx; ey += gradient * dy; ez += gradient * dz;
    }
    return { potentialMv: v * 1e3, exVm: ex, eyVm: ey, ezVm: ez };
  });
}

export function solvePhysics(input = {}, illumination, onProgress, { onSample } = {}) {
  const c = normalizePhysicsConfig(input), geometry = createPrimaGeometry(c), n = geometry.count;
  if (!(Array.isArray(illumination) || ArrayBuffer.isView(illumination)) || illumination.length !== n || !Array.from(illumination).every(x => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1)) throw new Error('Illumination must contain 378 finite values from 0 to 1.');
  onProgress?.({ stage: 'physics', progress: 0.05, message: 'Constructing the shared-return circuit' });
  const model = makeCircuitModel(c, geometry), photo = lightCurrentA(c, geometry, illumination), dark = new Float64Array(n);
  const selectedIndex = +c.selectedPixelId.slice(1) - 1, periodMs = 1000 / c.frequencyHz;
  let onSteps = Math.ceil(c.pulseDurationMs / c.timeStepMs); if (onSteps % 2) onSteps++;
  const offSteps = Math.ceil((periodMs - c.pulseDurationMs) / c.timeStepMs), onDt = c.pulseDurationMs / onSteps, offDt = (periodMs - c.pulseDurationMs) / offSteps;
  let state = { chargeC: new Float64Array(n), currentA: new Float64Array(n), voltageV: new Float64Array(n) };
  let snapshot, phaseStart, phaseEnd, maxResidualA = 0, maxSweeps = 0;
  const peakCurrentA = new Float64Array(n), waveform = { timeMs: [], irradianceMwMm2: [], currentUa: [], polarizationMv: [], diodeVoltageV: [], arrayCurrentUa: [], returnCurrentUa: [] };
  const capture = (t, lit) => {
    // Optional read-only observer for the unified retinal cable coupling.
    // Copying is the observer's responsibility; the numerical equations are unchanged.
    onSample?.(t, state.currentA, lit);
    const total = state.currentA.reduce((a, b) => a + b, 0);
    waveform.timeMs.push(t); waveform.irradianceMwMm2.push(lit ? c.irradianceMwMm2 * illumination[selectedIndex] : 0);
    waveform.currentUa.push(state.currentA[selectedIndex] * 1e6);
    waveform.polarizationMv.push(state.chargeC[selectedIndex] / model.activeCapacitanceF * 1e3);
    waveform.diodeVoltageV.push(state.voltageV[selectedIndex]); waveform.arrayCurrentUa.push(total * 1e6); waveform.returnCurrentUa.push(-total * 1e6);
    maxResidualA = Math.max(maxResidualA, state.residualA || 0); maxSweeps = Math.max(maxSweeps, state.sweeps || 0);
    for (let i = 0; i < n; i++) peakCurrentA[i] = Math.max(peakCurrentA[i], Math.abs(state.currentA[i]));
  };
  for (let cycle = 0; cycle < c.cycles; cycle++) {
    if (cycle === c.cycles - 1) phaseStart = Float64Array.from(state.chargeC);
    state = advanceCircuit(model, c, state, photo, 0); capture(cycle * periodMs, true);
    for (let step = 1; step <= onSteps; step++) {
      state = advanceCircuit(model, c, state, photo, onDt * 1e-3);
      capture(cycle * periodMs + step * onDt, true);
      if (cycle === c.cycles - 1 && step === onSteps / 2) snapshot = { currentA: Float64Array.from(state.currentA), chargeC: Float64Array.from(state.chargeC), voltageV: Float64Array.from(state.voltageV), timeMs: cycle * periodMs + c.pulseDurationMs / 2 };
    }
    if (cycle === c.cycles - 1) phaseEnd = Float64Array.from(state.chargeC);
    state = advanceCircuit(model, c, state, dark, 0); capture(cycle * periodMs + c.pulseDurationMs, false);
    for (let step = 1; step <= offSteps; step++) {
      state = advanceCircuit(model, c, state, dark, offDt * 1e-3);
      capture(cycle * periodMs + c.pulseDurationMs + step * offDt, false);
    }
    onProgress?.({ stage: 'physics', progress: 0.15 + 0.55 * (cycle + 1) / c.cycles, message: `Calculated optical period ${cycle + 1} of ${c.cycles}` });
  }
  onProgress?.({ stage: 'physics', progress: 0.75, message: 'Evaluating the subretinal field' });
  const size = c.fieldGridSize, axis = Array.from({ length: size }, (_, i) => -1000 + 2000 * i / (size - 1));
  const points = []; for (let y = size - 1; y >= 0; y--) for (let x = 0; x < size; x++) points.push({ xUm: axis[x], yUm: axis[y], zUm: c.gapUm });
  const low = evaluateFields(model, geometry, snapshot.currentA, points);
  const upper = evaluateFields(model, geometry, snapshot.currentA, points.map(p => ({ ...p, zUm: c.gapUm + c.bipolarLengthUm })));
  const centerLow = evaluateFields(model, geometry, snapshot.currentA, geometry.pixels.map(p => ({ ...p, zUm: c.gapUm })));
  const centerHigh = evaluateFields(model, geometry, snapshot.currentA, geometry.pixels.map(p => ({ ...p, zUm: c.gapUm + c.bipolarLengthUm })));
  const returns = returnCurrentsA(model, snapshot.currentA);
  const field = { width: size, height: size, xUm: axis, yUm: [...axis].reverse(), zUm: c.gapUm, upperZUm: c.gapUm + c.bipolarLengthUm,
    potentialMv: low.map(v => v.potentialMv), bcDeltaMv: low.map((v, i) => v.potentialMv - upper[i].potentialMv), ezVm: low.map(v => v.ezVm),
    snapshotTimeMs: snapshot.timeMs, snapshotDescription: 'Midpoint of the final optical pulse', units: { potentialMv: 'mV', bcDeltaMv: 'mV', ezVm: 'V/m' } };
  const pixelMetrics = geometry.pixels.map((p, i) => ({ id: p.id, index: i, illumination: illumination[i], photocurrentUa: photo[i] * 1e6,
    snapshotCurrentUa: snapshot.currentA[i] * 1e6, returnCurrentUa: returns[i] * 1e6, peakCurrentUa: peakCurrentA[i] * 1e6,
    phaseChargeNc: (phaseEnd[i] - phaseStart[i]) * 1e9, residualChargeNc: state.chargeC[i] * 1e9,
    voltageV: snapshot.voltageV[i], polarizationMv: snapshot.chargeC[i] / model.activeCapacitanceF * 1e3,
    bcDeltaMv: centerLow[i].potentialMv - centerHigh[i].potentialMv }));
  const sumQ = state.chargeC.reduce((a, b) => a + b, 0), dutyCycle = c.pulseDurationMs / periodMs;
  const peakIncidentPowerMw = illumination.reduce((a, b) => a + b, 0) * c.irradianceMwMm2 * geometry.pixelAreaUm2 * 1e-6;
  const metrics = {
    illuminatedPixels: Array.from(illumination).filter(v => v > 0).length,
    dutyCycle, peakIncidentPowerMw, averageIncidentPowerMw: peakIncidentPowerMw * dutyCycle,
    peakArrayCurrentUa: Math.max(...waveform.arrayCurrentUa.map(Math.abs)),
    peakPotentialMv: Math.max(...field.potentialMv.map(Math.abs)), peakBcDeltaMv: Math.max(...field.bcDeltaMv.map(Math.abs)),
    peakEzVm: Math.max(...field.ezVm.map(Math.abs)),
    selectedPhaseChargeNc: pixelMetrics[selectedIndex].phaseChargeNc,
    residualActiveChargeNc: sumQ * 1e9, returnInterfaceChargeNc: -sumQ * 1e9,
    maxPixelResidualChargeNc: Math.max(...pixelMetrics.map(p => Math.abs(p.residualChargeNc))),
    returnPolarizationMv: -sumQ / model.returnCapacitanceF * 1e3,
    currentBalanceUa: (snapshot.currentA.reduce((a, b) => a + b, 0) + returns.reduce((a, b) => a + b, 0)) * 1e6,
    maxKclResidualPa: maxResidualA * 1e12, maxNonlinearSweeps: maxSweeps,
    timeSteps: c.cycles * (onSteps + offSteps), actualOnStepMs: onDt, actualOffStepMs: offDt,
    activeCapacitanceNf: model.activeCapacitanceF * 1e9, returnCapacitanceNf: model.returnCapacitanceF * 1e9,
    endTimeMs: c.cycles * periodMs, snapshotTimeMs: snapshot.timeMs,
  };
  onProgress?.({ stage: 'physics', progress: 1, message: 'Physics calculation complete' });
  return { config: c, geometry, pixelMetrics, waveform, field, metrics,
    provenance: { version: PHYSICS_VERSION, geometryVersion: geometry.version, solver: 'Backward Euler with verified nonlinear KCL; shared return potential in the Galerkin basis',
      tissue: 'Homogeneous isotropic conductive half-space; regularized Poisson surface-flux basis',
      interface: 'Individual constant active capacitors and one lumped capacitor for the shared return mesh',
      temperatureK: TEMPERATURE_K, diodeCount: 2, geometryStatus: geometry.geometryStatus,
      returnSegmentsPerHexSide: model.returnSubdivisions,
      scope: 'Exploratory device physics; not a clinical calibration, spike model, thermal calculation or patient-specific visual prediction',
      sources: ['https://doi.org/10.1109/TBCAS.2014.2376528', 'https://doi.org/10.1088/1741-2552/ac8ed8', 'https://doi.org/10.1088/1741-2552/ae6d77'] },
    warnings: ['Circuit and electrode defaults are exploratory assumptions, not a manufacturer-issued electrical specification.', 'The return interface is lumped; the tissue is homogeneous and the reconstructed source basis has noncompact tails.', 'Bipolar-cell potential difference is an extracellular surrogate, not membrane voltage or activation probability.', 'Optical power is reported; temperature and clinical exposure limits are not calculated.'],
  };
}
