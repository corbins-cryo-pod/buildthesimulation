/*
 * Spaces, materials and fields for the v4 core.
 *
 * Geometry is a property of the scenario, not of the engine. Every position in the engine is a
 * 3-vector; a Space decides what is inside, how points are pushed back inside, what the material
 * is at a point, and how fields are discretised. Three spaces ship:
 *   Surface  2-D coverslip (z is held at 0)                                     dim 2
 *   Volume   3-D box, e.g. a hydrogel                                           dim 3
 *   Tube     3-D cylinder along x, e.g. a nerve conduit (wall is impermeable)   dim 3
 * Materials are functions of position (stiffness kPa, adhesion 0-2, matrix density 0-1, fibre
 * direction); dynamic matrix such as fibrin is a Field with no diffusion that cells deposit or degrade.
 * Fields are scalar grids (nz = 1 in 2-D) with diffusion, decay and point or region sources, advanced
 * implicitly (backward Euler, exact line solves split by axis), so they are stable at any update interval.
 */
(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.NE4 = root.NE4 || {}; Object.assign(root.NE4, mod); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ------------------------------------------------------------------ fields
  class Field {
    /** o: { name, label, D (µm²/min), decay (/min), res (µm), max, color, kind: 'chem'|'matrix' } */
    constructor(space, o) {
      this.space = space; this.name = o.name; this.label = o.label || o.name;
      this.D = o.D || 0; this.decay = o.decay || 0; this.h = o.res || space.fieldRes;
      this.color = o.color || '#f2c14e'; this.kind = o.kind || 'chem'; this.max = o.max || 1;
      const b = space.bounds;
      this.nx = Math.max(1, Math.ceil((b.x1 - b.x0) / this.h)); this.ny = Math.max(1, Math.ceil((b.y1 - b.y0) / this.h));
      this.nz = space.dim === 2 ? 1 : Math.max(1, Math.ceil((b.z1 - b.z0) / this.h));
      const n = this.nx * this.ny * this.nz;
      this.c = new Float32Array(n); this.src = new Float32Array(n); this.add = new Float32Array(n);
      this.mask = new Uint8Array(n);
      for (let k = 0; k < this.nz; k++) for (let j = 0; j < this.ny; j++) for (let i = 0; i < this.nx; i++) {
        const q = i + this.nx * (j + this.ny * k);
        this.mask[q] = space.inside(b.x0 + (i + 0.5) * this.h, b.y0 + (j + 0.5) * this.h, space.dim === 2 ? 0 : b.z0 + (k + 0.5) * this.h) ? 1 : 0;
      }
      this.sources = [];   // { x, y, z, rate, r } point/sphere sources, rate in units/min
    }
    idx(x, y, z) {
      const b = this.space.bounds;
      let i = Math.floor((x - b.x0) / this.h), j = Math.floor((y - b.y0) / this.h), k = this.nz > 1 ? Math.floor((z - b.z0) / this.h) : 0;
      if (i < 0) i = 0; else if (i >= this.nx) i = this.nx - 1;
      if (j < 0) j = 0; else if (j >= this.ny) j = this.ny - 1;
      if (k < 0) k = 0; else if (k >= this.nz) k = this.nz - 1;
      return i + this.nx * (j + this.ny * k);
    }
    /** value at a point (nearest cell; fields are smooth on the scale of a growth cone) */
    at(x, y, z) { return this.c[this.idx(x, y, z)]; }
    /** central-difference gradient (per µm) into out[0..2] */
    grad(x, y, z, out) {
      const h = this.h, f = (a, b, c) => this.c[this.idx(a, b, c)];
      out[0] = (f(x + h, y, z) - f(x - h, y, z)) / (2 * h);
      out[1] = (f(x, y + h, z) - f(x, y - h, z)) / (2 * h);
      out[2] = this.nz > 1 ? (f(x, y, z + h) - f(x, y, z - h)) / (2 * h) : 0;
      return out;
    }
    /** deposit an amount (concentration units) at a point; applied at the next update */
    deposit(x, y, z, amount) { this.add[this.idx(x, y, z)] += amount; }
    /** remove up to `amount` at a point now; returns what was removed */
    take(x, y, z, amount) { const q = this.idx(x, y, z), v = Math.min(this.c[q], amount); this.c[q] -= v; return v; }
    fillWhere(fn, v) {
      const b = this.space.bounds;
      for (let k = 0; k < this.nz; k++) for (let j = 0; j < this.ny; j++) for (let i = 0; i < this.nx; i++) {
        const q = i + this.nx * (j + this.ny * k); if (!this.mask[q]) continue;
        const x = b.x0 + (i + 0.5) * this.h, y = b.y0 + (j + 0.5) * this.h, z = this.space.dim === 2 ? 0 : b.z0 + (k + 0.5) * this.h;
        const val = typeof v === 'function' ? v(x, y, z) : v; if (fn(x, y, z)) this.c[q] = val;
      }
    }
    srcWhere(fn, rate) {
      const b = this.space.bounds;
      for (let k = 0; k < this.nz; k++) for (let j = 0; j < this.ny; j++) for (let i = 0; i < this.nx; i++) {
        const q = i + this.nx * (j + this.ny * k); if (!this.mask[q]) continue;
        const x = b.x0 + (i + 0.5) * this.h, y = b.y0 + (j + 0.5) * this.h, z = this.space.dim === 2 ? 0 : b.z0 + (k + 0.5) * this.h;
        if (fn(x, y, z)) this.src[q] = typeof rate === 'function' ? rate(x, y, z) : rate;
      }
    }
    /**
     * advance by dt minutes. Diffusion is implicit and split by axis: a backward-Euler line solve
     * (Thomas algorithm) along x, then y, then z, over each run of voxels inside the space, with
     * no-flux walls. Each linear system is solved directly. Backward-Euler diffusion remains first-order in time;
     * stability is not evidence of transient accuracy. Local constant-source/decay is integrated
     * exactly in half-steps. Engine batches subcycle fields and reactions for temporal accuracy.
     */
    update(dt, sweeps = 1, srcScale = 1, depositRate = null) {
      if (!Number.isFinite(dt) || dt < 0) throw new RangeError('Field interval must be finite and nonnegative');
      if (!Number.isFinite(srcScale) || srcScale < 0) throw new RangeError('Source scale must be finite and nonnegative');
      const c = this.c, s = this.src, a = this.add, m = this.mask, n = c.length;
      // Deposits outside a coupled batch are instantaneous at this update's start.
      for (let q = 0; q < n; q++) { c[q] = m[q] ? Math.max(0, c[q] + a[q]) : 0; a[q] = 0; }
      if (!dt) return;
      const half = dt / 2, fac = Math.exp(-this.decay * half);
      const integral = this.decay ? -Math.expm1(-this.decay * half) / this.decay : half;
      const reactionHalf = () => {
        for (let q = 0; q < n; q++) if (m[q]) c[q] = c[q] * fac + (s[q] * srcScale + (depositRate ? depositRate[q] : 0)) * integral;
      };
      reactionHalf();
      if (this.D > 0) {
        const r = this.D * dt / (this.h * this.h);
        this._lineSolve(r, 0); if (this.ny > 1) this._lineSolve(r, 1); if (this.nz > 1) this._lineSolve(r, 2);
      }
      reactionHalf();
      if (this.kind === 'matrix') for (let q = 0; q < n; q++) c[q] = Math.min(this.max, Math.max(0, c[q]));
    }
    _lineSolve(r, axis) {
      const nx = this.nx, ny = this.ny, nz = this.nz, c = this.c, m = this.mask;
      const len = axis === 0 ? nx : axis === 1 ? ny : nz, stride = axis === 0 ? 1 : axis === 1 ? nx : nx * ny;
      const A = axis === 0 ? ny : nx, B = axis === 2 ? ny : nz;            // the two other axes
      const cp = this._cp && this._cp.length >= len ? this._cp : (this._cp = new Float64Array(Math.max(nx, ny, nz)));
      const dp = this._dp && this._dp.length >= len ? this._dp : (this._dp = new Float64Array(Math.max(nx, ny, nz)));
      for (let v = 0; v < B; v++) for (let u = 0; u < A; u++) {
        const base = axis === 0 ? nx * (u + ny * v) : axis === 1 ? u + nx * ny * v : u + nx * v;
        let s0 = -1;
        for (let t = 0; t <= len; t++) {
          const inside = t < len && m[base + t * stride];
          if (inside && s0 < 0) s0 = t;
          if (!inside && s0 >= 0) {
            const nrun = t - s0;
            if (nrun > 1) {
              // forward sweep
              for (let k = 0; k < nrun; k++) {
                const hasL = k > 0, hasR = k < nrun - 1, aa = hasL ? -r : 0, bb = 1 + r * ((hasL ? 1 : 0) + (hasR ? 1 : 0)), cc = hasR ? -r : 0;
                const d = c[base + (s0 + k) * stride];
                if (k === 0) { cp[0] = cc / bb; dp[0] = d / bb; }
                else { const den = bb - aa * cp[k - 1]; cp[k] = cc / den; dp[k] = (d - aa * dp[k - 1]) / den; }
              }
              // back substitution
              let x = dp[nrun - 1]; c[base + (s0 + nrun - 1) * stride] = x;
              for (let k = nrun - 2; k >= 0; k--) { x = dp[k] - cp[k] * x; c[base + (s0 + k) * stride] = x; }
            }
            s0 = -1;
          }
        }
      }
    }
    total() { let s = 0; for (let q = 0; q < this.c.length; q++) s += this.c[q]; return s * this.h ** (this.nz > 1 ? 3 : 2); }
    /** mean value over the cross-section at axial position x (for tube profiles) */
    profileX(x) { const i = Math.min(this.nx - 1, Math.max(0, Math.floor((x - this.space.bounds.x0) / this.h))); let s = 0, n = 0; for (let k = 0; k < this.nz; k++) for (let j = 0; j < this.ny; j++) { const q = i + this.nx * (j + this.ny * k); if (this.mask[q]) { s += this.c[q]; n++; } } return n ? s / n : 0; }
  }

  // ------------------------------------------------------------------ spaces
  const defaultMaterial = () => ({ stiffness: () => 1e6, adhesion: () => 0.7, density: () => 0, fiber: null, label: 'Glass, poly-lysine' });

  class Space {
    constructor(kind, dim, bounds, o = {}) {
      this.kind = kind; this.dim = dim; this.bounds = bounds; this.fields = []; this.byName = {};
      this.fieldRes = o.fieldRes || 20; this.material = Object.assign(defaultMaterial(), o.material || {});
      this.labels = o.labels || [];
    }
    addField(o) { const f = new Field(this, o); this.fields.push(f); this.byName[f.name] = f; return f; }
    field(name) { return this.byName[name] || null; }
    stiffness(x, y, z) { return this.material.stiffness(x, y, z); }
    adhesion(x, y, z) { return this.material.adhesion(x, y, z); }
    density(x, y, z) { return this.material.density(x, y, z); }
    fiber(x, y, z, out) { return this.material.fiber ? this.material.fiber(x, y, z, out) : false; }
    size() { const b = this.bounds; return [b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0]; }
    describe() { return { kind: this.kind, dim: this.dim, bounds: this.bounds, labels: this.labels, R: this.R, material: this.material.label, regions: this.regions || [] }; }
  }

  class Surface extends Space {
    constructor(W, H, o = {}) { super('surface', 2, { x0: 0, x1: W, y0: 0, y1: H, z0: 0, z1: 0 }, o); }
    inside(x, y) { return x >= 0 && y >= 0 && x <= this.bounds.x1 && y <= this.bounds.y1; }
    /** push node i back inside; returns true if it touched a wall (normal in out) */
    contain(X, Y, Z, i, out) {
      const b = this.bounds, m = 2; let hit = false; Z[i] = 0;
      if (X[i] < b.x0 + m) { X[i] = b.x0 + m; hit = true; out[0] = 1; out[1] = 0; } else if (X[i] > b.x1 - m) { X[i] = b.x1 - m; hit = true; out[0] = -1; out[1] = 0; }
      if (Y[i] < b.y0 + m) { Y[i] = b.y0 + m; hit = true; out[0] = 0; out[1] = 1; } else if (Y[i] > b.y1 - m) { Y[i] = b.y1 - m; hit = true; out[0] = 0; out[1] = -1; }
      out[2] = 0; return hit;
    }
  }

  class Volume extends Space {
    constructor(W, H, D, o = {}) { super('volume', 3, { x0: 0, x1: W, y0: 0, y1: H, z0: 0, z1: D }, o); }
    inside(x, y, z) { const b = this.bounds; return x >= b.x0 && y >= b.y0 && z >= b.z0 && x <= b.x1 && y <= b.y1 && z <= b.z1; }
    contain(X, Y, Z, i, out) {
      const b = this.bounds, m = 2; let hit = false;
      const cl = (A, lo, hi, ax) => { if (A[i] < lo + m) { A[i] = lo + m; hit = true; out[0] = out[1] = out[2] = 0; out[ax] = 1; } else if (A[i] > hi - m) { A[i] = hi - m; hit = true; out[0] = out[1] = out[2] = 0; out[ax] = -1; } };
      cl(X, b.x0, b.x1, 0); cl(Y, b.y0, b.y1, 1); cl(Z, b.z0, b.z1, 2); return hit;
    }
  }

  /** Cylinder of radius R along x from 0 to L, axis at y = z = 0. Ends are open to the scenario (clamped). */
  class Tube extends Space {
    constructor(L, R, o = {}) { super('tube', 3, { x0: 0, x1: L, y0: -R, y1: R, z0: -R, z1: R }, o); this.R = R; this.L = L; this.regions = o.regions || []; }
    inside(x, y, z) { return x >= 0 && x <= this.L && y * y + z * z <= this.R * this.R; }
    contain(X, Y, Z, i, out) {
      let hit = false; const m = 2, R = this.R - m;
      if (X[i] < m) { X[i] = m; hit = true; out[0] = 1; out[1] = out[2] = 0; } else if (X[i] > this.L - m) { X[i] = this.L - m; hit = true; out[0] = -1; out[1] = out[2] = 0; }
      const r = Math.hypot(Y[i], Z[i]);
      if (r > R) { Y[i] *= R / r; Z[i] *= R / r; hit = true; out[0] = 0; out[1] = -Y[i] / R; out[2] = -Z[i] / R; }
      return hit;
    }
  }

  return { Space, Surface, Volume, Tube, Field };
});
