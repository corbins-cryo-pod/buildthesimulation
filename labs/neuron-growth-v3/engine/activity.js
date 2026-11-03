/*
 * Activity — electrical life of the culture.
 *
 * Multi-rate scheme: structure moves in steps of p.dt minutes, far too slow for spikes. Each
 * structural step therefore runs one contiguous WINDOW (p.ephysWindow ms, default 200) of
 * electrical time at 1 ms resolution, continuing from the previous window's state. Structural
 * rules then use rates averaged over many windows. Electrical time is compressed relative to
 * structural time; document-level: "one window per step".
 *
 * Neurons: Izhikevich (2003) model, regular spiking (excitatory) or fast spiking (inhibitory).
 * Synapses: current-based, exponential decay, presynaptic short-term depression
 * (Tsodyks–Markram style resources), pair-based STDP within a window.
 * Excitability ramps up with culture age (DIV), so young networks are quiet and mature ones burst.
 */
(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.NE2 = root.NE2 || {}; Object.assign(root.NE2, mod); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const CLASSES = {
    RS: { a: 0.02, b: 0.2, c: -65, d: 8 },
    FS: { a: 0.1, b: 0.2, c: -65, d: 2 },
  };

  class Activity {
    constructor(engine) {
      this.e = engine; this.cap = 0; this._grow(64);
      this.dirty = true; this.outB = []; this.inB = [];
      this.spikeCell = new Int32Array(4096); this.spikeT = new Float32Array(4096); this.nSpikes = 0;
      this.bursts = 0; this.lastBurstT = -1e9; this.windows = 0; this.activeCount = 0; this.meanRate = 0;
      this.active = new Int32Array(64); this.mat = new Float32Array(64);
    }
    _grow(n) {
      const mk = (T, k, fill) => { const a = new T(n); if (this[k]) a.set(this[k]); else if (fill) a.fill(fill); this[k] = a; };
      mk(Float32Array, 'v', -65); mk(Float32Array, 'u', -13); mk(Float32Array, 'ge'); mk(Float32Array, 'gi');
      mk(Float32Array, 'res', 1); mk(Float32Array, 'lastSp', -1e6); mk(Int32Array, 'cnt');
      if (this.cap) { this.v.fill(-65, this.cap); this.u.fill(-13, this.cap); this.res.fill(1, this.cap); this.lastSp.fill(-1e6, this.cap); }
      this.cap = n;
    }
    ensure() { const n = this.e.cells.length; if (n > this.cap) { let c = this.cap; while (c < n) c *= 2; this._grow(c); } if (this.active.length < n) { this.active = new Int32Array(this.cap); this.mat = new Float32Array(this.cap); } }
    rebuild() {
      const n = this.e.cells.length; this.outB = new Array(n); this.inB = new Array(n);
      for (let i = 0; i < n; i++) { this.outB[i] = []; this.inB[i] = []; }
      for (const b of this.e.bonds) if (b && b.alive) { this.outB[b.ca].push(b); this.inB[b.cb].push(b); }
      this.dirty = false;
    }

    step(dt) {
      const e = this.e, p = e.p, cells = e.cells;
      this.nSpikes = 0;
      if (!p.activity) { this.activeCount = 0; return; }
      this.ensure();
      // who is electrically alive, and how mature
      let na = 0;
      for (const c of cells) {
        if (!c.alive || c.dying >= 0 || c.T.glia || c.T.ephys === 'none' || c.stage < 3) continue;
        const div = p.startDIV + c.age / 1440;
        const m = Math.min(1, Math.max(0, (div - p.matureDIV0) / Math.max(0.1, p.matureDIV1 - p.matureDIV0)));
        if (m <= 0) continue;
        this.active[na] = c.id; this.mat[na] = m; na++;
      }
      this.activeCount = na;
      if (!na) { for (const c of cells) if (c.alive) { c.rate *= Math.exp(-dt / p.rateTau); c.spk = 0; } return; }
      if (this.dirty) this.rebuild();
      const W = p.ephysWindow | 0, V = this.v, U = this.u, GE = this.ge, GI = this.gi, RES = this.res, LS = this.lastSp, CNT = this.cnt;
      const I0 = p.ephysDrive, SIG = p.ephysNoise, gain = p.synGain, Uuse = 0.2;
      const dE = Math.exp(-1 / 5), dI = Math.exp(-1 / 10), rec = 1 / 500;
      const Ap = p.stdp * 0.004, Am = p.stdp * 0.0045, rnd = e.rand;
      for (let k = 0; k < na; k++) CNT[this.active[k]] = 0;
      for (let t = 0; t < W; t++) {
        for (let k = 0; k < na; k++) {
          const i = this.active[k], m = this.mat[k], c = cells[i];
          const cls = CLASSES[c.T.ephys] || CLASSES.RS;
          const noise = (rnd() + rnd() + rnd() - 1.5) * 2;
          const I = m * (I0 + SIG * noise) + GE[i] - GI[i];
          let v = V[i], u = U[i];
          v += 0.5 * (0.04 * v * v + 5 * v + 140 - u + I);
          v += 0.5 * (0.04 * v * v + 5 * v + 140 - u + I);
          u += cls.a * (cls.b * v - u);
          if (v >= 30) {
            v = cls.c; u += cls.d; CNT[i]++; LS[i] = t;
            if (this.nSpikes < this.spikeCell.length) { this.spikeCell[this.nSpikes] = i; this.spikeT[this.nSpikes] = t; this.nSpikes++; }
            const amp = gain * RES[i];
            for (const b of this.outB[i] || []) {
              if (!b.alive) continue;
              if (b.inhib) GI[b.cb] += amp * b.w * 1.5; else GE[b.cb] += amp * b.w;
              const dtp = t - LS[b.cb]; if (dtp > 0 && dtp < 20) b.w = Math.max(0, b.w - Am * Math.exp(-dtp / 10));
            }
            for (const b of this.inB[i] || []) {
              if (!b.alive) continue;
              const dtp = t - LS[b.ca]; if (dtp > 0 && dtp < 20) b.w = Math.min(1, b.w + Ap * Math.exp(-dtp / 10));
            }
            RES[i] *= 1 - Uuse;
          }
          V[i] = v; U[i] = u;
        }
        for (let k = 0; k < na; k++) { const i = this.active[k]; GE[i] *= dE; GI[i] *= dI; RES[i] += (1 - RES[i]) * rec; }
      }
      // carry spike times across windows
      for (let k = 0; k < na; k++) LS[this.active[k]] -= W;
      // rates, calcium and burst detection
      const dec = Math.min(1, dt / p.rateTau); let sum = 0;
      for (const c of cells) { if (!c.alive) continue; c.spk = 0; }
      for (let k = 0; k < na; k++) {
        const i = this.active[k], c = cells[i], inst = CNT[i] * 1000 / W;
        c.rate += (inst - c.rate) * dec; c.spk = CNT[i]; c.ca += (Math.min(1, CNT[i] / 4) - c.ca) * 0.6; sum += c.rate;
      }
      this.meanRate = sum / na; this.windows++;
      if (this.nSpikes) {
        const bins = new Int32Array(Math.ceil(W / 25));
        for (let s = 0; s < this.nSpikes; s++) bins[(this.spikeT[s] / 25) | 0]++;
        let mx = 0; for (const b of bins) if (b > mx) mx = b;
        if (na >= 8 && mx >= Math.max(5, 0.35 * na) && e.t - this.lastBurstT > 1) { this.bursts++; this.lastBurstT = e.t; e.events.push({ type: 'burst', t: e.t, n: mx }); }
      }
    }
  }
  return { Activity, EPHYS_CLASSES: CLASSES };
});
