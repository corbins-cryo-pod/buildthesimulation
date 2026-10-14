/*! Copyright 2020. Allen Institute. All rights reserved.
 * Derived channel equations are distributed under the Allen Institute Software
 * License. Full conditions and disclaimer: /models/cortex/allen571654895/LICENSE.txt.
 */
// Port of the pinned Allen/Mosher 571654895 mechanisms. Allen Institute
// noncommercial software license: /models/cortex/allen571654895/LICENSE.txt.
// Rates retain each mechanism's original temperature convention, including
// the fixed-34°C K_Pst/K_Tst rates. Currents are outward; density S/cm².
export const CHANNELS = ['NaV', 'Ih', 'Im', 'K_Pst', 'K_Tst', 'Kv3_1', 'Ca_HVA', 'Ca_LVA', 'SK'];
const qt = 2.3 ** ((34 - 21) / 10);
const sigmoid = (x) => 1 / (1 + Math.exp(x));
const trap = (x, y) => (Math.abs(x / y) < 1e-6 ? y * (1 - x / y / 2) : x / Math.expm1(x / y));
export function channelRates(v, cai = 1e-4) {
  const aH = 0.001 * 6.43 * trap(v + 154.9, 11.9),
    bH = 0.193 * Math.exp(v / 33.1);
  const aM = 0.0033 * Math.exp(0.1 * (v + 35)),
    bM = 0.0033 * Math.exp(-0.1 * (v + 35));
  const w = v + 10;
  const aCa = 0.055 * trap(-27 - v, 3.8),
    bCa = 0.94 * Math.exp((-75 - v) / 17);
  const ahCa = 0.000457 * Math.exp((-13 - v) / 50),
    bhCa = 0.0065 * sigmoid((-v - 15) / 28);
  const ca = cai < 1e-7 ? cai + 1e-7 : cai;
  return [
    [aH / (aH + bH), 1 / (aH + bH)],
    [aM / (aM + bM), 1 / (aM + bM) / qt],
    [
      sigmoid(-(w + 1) / 12),
      (w < -50 ? 1.25 + 175.03 * Math.exp(w * 0.026) : 1.25 + 13 * Math.exp(-w * 0.026)) / qt,
    ],
    [
      sigmoid((w + 54) / 11),
      (360 + (1010 + 24 * (w + 55)) * Math.exp(-(((w + 75) / 48) ** 2))) / qt,
    ],
    [sigmoid(-w / 19), (0.34 + 0.92 * Math.exp(-(((w + 71) / 59) ** 2))) / qt],
    [sigmoid((w + 66) / 10), (8 + 49 * Math.exp(-(((w + 73) / 23) ** 2))) / qt],
    [sigmoid((v - 18.7) / -9.7), 4 / (1 + Math.exp((v + 46.56) / -44.14))],
    [aCa / (aCa + bCa), 1 / (aCa + bCa)],
    [ahCa / (ahCa + bhCa), 1 / (ahCa + bhCa)],
    [sigmoid(-(w + 30) / 6), (5 + 20 * sigmoid((w + 25) / 5)) / qt],
    [sigmoid((w + 80) / 6.4), (20 + 50 * sigmoid((w + 40) / 7)) / qt],
    [1 / (1 + (0.00043 / ca) ** 4.8), 1],
  ];
}

// Markov order C1,I1,C2,I2,...,C5,I5,O,I6. Block tridiagonal form
// reduces the implicit 12-state solve to six 2×2 blocks per compartment.
export function sodiumTransitions(v) {
  const q = 2.3 ** ((34 - 37) / 10),
    a = q * 400 * Math.exp(v / 24),
    b = q * 12 * Math.exp(-v / 24);
  const horizontal = Array.from({ length: 5 }, (_, k) =>
    k < 4
      ? [(4 - k) * a, (k + 1) * b, (4 - k) * a * 2.51, ((k + 1) * b) / 5.32]
      : [q * 250, q * 60, q * 250, q * 60],
  );
  const vertical = Array.from({ length: 6 }, (_, k) =>
    k < 5 ? [q * 0.01 * 2.51 ** k, (q * 40) / 5.32 ** k] : [q * 8, q * 0.05],
  );
  return { horizontal, vertical };
}

export function sodiumMatrix(v, dt) {
  const { horizontal, vertical } = sodiumTransitions(v),
    a = new Float64Array(144);
  if (dt !== null) for (let i = 0; i < 12; i++) a[i * 12 + i] = 1;
  const scale = dt ?? 1;
  const connect = (i, j, forward, backward) => {
    a[i * 12 + i] += scale * forward;
    a[j * 12 + j] += scale * backward;
    a[j * 12 + i] -= scale * forward;
    a[i * 12 + j] -= scale * backward;
  };
  vertical.forEach(([f, b], k) => connect(2 * k, 2 * k + 1, f, b));
  horizontal.forEach(([f, b, fi, bi], k) => {
    connect(2 * k, 2 * k + 2, f, b);
    connect(2 * k + 1, 2 * k + 3, fi, bi);
  });
  return a;
}

export function denseSolve(matrix, rhs) {
  const n = rhs.length,
    a = Float64Array.from(matrix),
    b = Float64Array.from(rhs);
  for (let k = 0; k < n; k++) {
    let pivot = k;
    for (let i = k + 1; i < n; i++)
      if (Math.abs(a[i * n + k]) > Math.abs(a[pivot * n + k])) pivot = i;
    if (Math.abs(a[pivot * n + k]) < 1e-30) throw new Error('Singular channel system');
    if (pivot !== k) {
      for (let j = k; j < n; j++)
        [a[k * n + j], a[pivot * n + j]] = [a[pivot * n + j], a[k * n + j]];
      [b[k], b[pivot]] = [b[pivot], b[k]];
    }
    for (let i = k + 1; i < n; i++) {
      const f = a[i * n + k] / a[k * n + k];
      for (let j = k + 1; j < n; j++) a[i * n + j] -= f * a[k * n + j];
      b[i] -= f * b[k];
    }
  }
  for (let i = n - 1; i >= 0; i--) {
    for (let j = i + 1; j < n; j++) b[i] -= a[i * n + j] * b[j];
    b[i] /= a[i * n + i];
  }
  return b;
}

export function initialSodium(v) {
  const a = sodiumMatrix(v, null),
    b = new Float64Array(12),
    { horizontal, vertical } = sodiumTransitions(v);
  // Literal upstream seqinitial I3 discrepancy: I4*bi3 instead of I4*b13.
  // Preserve it for reproducibility; subsequent KINETIC transitions are correct.
  a[5 * 12 + 7] = -vertical[2][1];
  for (let j = 0; j < 12; j++) a[11 * 12 + j] = 1;
  b[11] = 1;
  return denseSolve(a, b);
}

export function stepSodium(state, offset, v, dt, scratch) {
  const { d, upper, r } = scratch;
  const temperature = 2.3 ** ((34 - 37) / 10),
    a = temperature * 400 * Math.exp(v / 24),
    b = temperature * 12 * Math.exp(-v / 24);
  for (let k = 0; k < 6; k++) {
    const lf = k === 0 ? 0 : k === 5 ? temperature * 250 : (5 - k) * a;
    const lb = k === 0 ? 0 : k === 5 ? temperature * 60 : k * b;
    const lif = k === 5 ? lf : lf * 2.51,
      lib = k === 5 ? lb : lb / 5.32;
    const uf = k === 5 ? 0 : k === 4 ? temperature * 250 : (4 - k) * a;
    const ub = k === 5 ? 0 : k === 4 ? temperature * 60 : (k + 1) * b;
    const uif = k === 4 ? uf : uf * 2.51,
      uib = k === 4 ? ub : ub / 5.32;
    const vf = k < 5 ? temperature * 0.01 * 2.51 ** k : temperature * 8,
      vb = k < 5 ? (temperature * 40) / 5.32 ** k : temperature * 0.05,
      p = k * 4;
    d[p] = 1 + dt * (vf + lb + uf);
    d[p + 1] = -dt * vb;
    d[p + 2] = -dt * vf;
    d[p + 3] = 1 + dt * (vb + lib + uif);
    upper[k * 2] = -dt * ub;
    upper[k * 2 + 1] = -dt * uib;
    r[k * 2] = state[offset + k * 2];
    r[k * 2 + 1] = state[offset + k * 2 + 1];
    if (k) {
      const prev = (k - 1) * 4,
        f0 = -dt * lf,
        f1 = -dt * lif;
      d[p] -= f0 * d[prev] * upper[(k - 1) * 2];
      d[p + 1] -= f0 * d[prev + 1] * upper[(k - 1) * 2 + 1];
      d[p + 2] -= f1 * d[prev + 2] * upper[(k - 1) * 2];
      d[p + 3] -= f1 * d[prev + 3] * upper[(k - 1) * 2 + 1];
      r[k * 2] -= f0 * r[(k - 1) * 2];
      r[k * 2 + 1] -= f1 * r[(k - 1) * 2 + 1];
    }
    const aa = d[p],
      bb = d[p + 1],
      cc = d[p + 2],
      dd = d[p + 3],
      det = aa * dd - bb * cc;
    d[p] = dd / det;
    d[p + 1] = -bb / det;
    d[p + 2] = -cc / det;
    d[p + 3] = aa / det;
    const x = r[k * 2],
      y = r[k * 2 + 1];
    r[k * 2] = d[p] * x + d[p + 1] * y;
    r[k * 2 + 1] = d[p + 2] * x + d[p + 3] * y;
  }
  for (let k = 5; k >= 0; k--) {
    let x = r[k * 2],
      y = r[k * 2 + 1];
    if (k < 5) {
      const p = k * 4,
        a = upper[k * 2] * state[offset + (k + 1) * 2],
        b = upper[k * 2 + 1] * state[offset + (k + 1) * 2 + 1];
      x -= d[p] * a + d[p + 1] * b;
      y -= d[p + 2] * a + d[p + 3] * b;
    }
    state[offset + k * 2] = x;
    state[offset + k * 2 + 1] = y;
  }
}

export function advanceChannelGates(gates, index, v, dt, cai, density) {
  const k = index * 12,
    w = v + 10;
  const advance = (j, inf, tau) => {
    gates[k + j] = inf + (gates[k + j] - inf) * Math.exp(-dt / tau);
  };
  if (density[1][index]) {
    const a = 0.001 * 6.43 * trap(v + 154.9, 11.9),
      b = 0.193 * Math.exp(v / 33.1);
    advance(0, a / (a + b), 1 / (a + b));
  }
  if (density[2][index]) {
    const a = 0.0033 * Math.exp(0.1 * (v + 35)),
      b = 0.0033 * Math.exp(-0.1 * (v + 35));
    advance(1, a / (a + b), 1 / (a + b) / qt);
  }
  if (density[3][index]) {
    advance(
      2,
      sigmoid(-(w + 1) / 12),
      (w < -50 ? 1.25 + 175.03 * Math.exp(w * 0.026) : 1.25 + 13 * Math.exp(-w * 0.026)) / qt,
    );
    advance(
      3,
      sigmoid((w + 54) / 11),
      (360 + (1010 + 24 * (w + 55)) * Math.exp(-(((w + 75) / 48) ** 2))) / qt,
    );
  }
  if (density[4][index]) {
    advance(4, sigmoid(-w / 19), (0.34 + 0.92 * Math.exp(-(((w + 71) / 59) ** 2))) / qt);
    advance(5, sigmoid((w + 66) / 10), (8 + 49 * Math.exp(-(((w + 73) / 23) ** 2))) / qt);
  }
  if (density[5][index])
    advance(6, sigmoid((v - 18.7) / -9.7), 4 / (1 + Math.exp((v + 46.56) / -44.14)));
  if (density[6][index]) {
    const a = 0.055 * trap(-27 - v, 3.8),
      b = 0.94 * Math.exp((-75 - v) / 17),
      ah = 0.000457 * Math.exp((-13 - v) / 50),
      bh = 0.0065 * sigmoid((-v - 15) / 28);
    advance(7, a / (a + b), 1 / (a + b));
    advance(8, ah / (ah + bh), 1 / (ah + bh));
  }
  if (density[7][index]) {
    advance(9, sigmoid(-(w + 30) / 6), (5 + 20 * sigmoid((w + 25) / 5)) / qt);
    advance(10, sigmoid((w + 80) / 6.4), (20 + 50 * sigmoid((w + 40) / 7)) / qt);
  }
  if (density[8][index]) {
    const ca = cai < 1e-7 ? cai + 1e-7 : cai;
    advance(11, 1 / (1 + (0.00043 / ca) ** 4.8), 1);
  }
}

export function channelOpen(gates, i, sodium) {
  const k = i * 12;
  return [
    sodium[k + 10],
    gates[k],
    gates[k + 1],
    gates[k + 2] ** 2 * gates[k + 3],
    gates[k + 4] ** 4 * gates[k + 5],
    gates[k + 6],
    gates[k + 7] ** 2 * gates[k + 8],
    gates[k + 9] ** 2 * gates[k + 10],
    gates[k + 11],
  ];
}
