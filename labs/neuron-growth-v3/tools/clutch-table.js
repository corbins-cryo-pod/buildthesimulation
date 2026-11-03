// Motor-clutch model of growth-cone traction (Chan & Odde 2008; Bangasser et al. 2013).
// Stochastic simulation over a grid of substrate stiffness x ligand (binding-rate) scale.
// Output: mean traction (pN) and mean retrograde actin flow (nm/s) per grid point.
function simulate(kSub, onScale, P, seconds = 30, rng = Math.random) {
  const { nm, Fm, vu, nc, kon, koff, Fb, kc, dt } = P;
  const x = new Float64Array(nc), eng = new Uint8Array(nc);
  let xs = 0, sumF = 0, sumV = 0, n = 0;
  const steps = Math.round(seconds / dt), warm = Math.round(5 / dt);
  const pOn = 1 - Math.exp(-kon * onScale * dt);
  for (let s = 0; s < steps; s++) {
    let neng = 0, sx = 0;
    for (let i = 0; i < nc; i++) if (eng[i]) { neng++; sx += x[i]; }
    xs = neng ? kc * sx / (kSub + neng * kc) : 0;
    const Fsub = kSub * xs;
    let vf = vu * (1 - Fsub / (nm * Fm)); if (vf < 0) vf = 0;
    for (let i = 0; i < nc; i++) {
      if (eng[i]) {
        x[i] += vf * dt;
        const F = kc * (x[i] - xs);
        if (rng() < 1 - Math.exp(-koff * Math.exp(Math.abs(F) / Fb) * dt)) eng[i] = 0;
      } else if (rng() < pOn) { eng[i] = 1; x[i] = xs; }
    }
    if (s >= warm) { sumF += Fsub; sumV += vf; n++; }
  }
  return [sumF / n, sumV / n];
}
const P = { nm: 75, Fm: 2, vu: 120, nc: 75, kon: 1, koff: 0.1, Fb: 2, kc: 0.8, dt: 0.002 };
const logK = []; for (let v = -2; v <= 3.001; v += 0.25) logK.push(+v.toFixed(2));
const ons = [0.05, 0.15, 0.35, 0.7, 1.0, 1.6, 2.5];
const F = [], V = [];
const t0 = Date.now();
for (const on of ons) { const fr = [], vr = []; for (const lk of logK) { const [f, v] = simulate(10 ** lk, on, P); fr.push(+f.toFixed(1)); vr.push(+v.toFixed(1)); } F.push(fr); V.push(vr); }
const out = { params: P, logKsub: logK, onScale: ons, traction: F, flow: V };
require('fs').writeFileSync(__dirname + '/../engine/clutch-table.json', JSON.stringify(out));
console.log('ms', Date.now() - t0);
for (let j = 0; j < ons.length; j++) console.log('on', ons[j], 'F', F[j].join(' '), '\n      V', V[j].join(' '));
