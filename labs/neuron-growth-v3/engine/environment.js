/*
 * Environment — what lies under and around the cells.
 *   coat      per-pixel coating id: glass, PDL, laminin, repellent (sets clutch binding / probe adhesion)
 *   stiffness per-pixel Young's modulus in kPa (glass ≈ 1e6)
 *   wall      PDMS walls (cells and probes cannot enter); escape vectors push nodes back out
 *   fields    diffusing guidance cues solved as a screened Poisson problem (length scale λ),
 *             fed by point sources (pipettes), painted sources (stripes) and walls as no-flux boundaries
 *   fibers    scaffolds (radial glia): strongly adhesive tracks that steer cones along their tangent
 *   astro     astrocyte coverage, rasterised by the engine from glial cells
 * Coordinates are µm. One grid (res µm per pixel) carries the substrate; fields use a coarser grid.
 */
(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.NE2 = root.NE2 || {}; Object.assign(root.NE2, mod); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const COATS = [
    { id: 0, key: 'glass', label: 'Bare glass', on: 0.35, color: '#1b2733' },
    { id: 1, key: 'pdl', label: 'Poly-D-lysine', on: 0.7, color: '#1d2c39' },
    { id: 2, key: 'laminin', label: 'Laminin', on: 1.0, color: '#2a2f1f' },
    { id: 3, key: 'repellent', label: 'Repellent (PEG)', on: 0.05, color: '#2b1c22' },
  ];
  const GLASS_KPA = 1e6;

  class Field {
    constructor(env, name, o = {}) {
      this.name = name; this.label = o.label || name;
      this.lambda = o.lambda || 120;           // decay length (µm)
      this.res = o.res || 8;
      this.gw = Math.ceil(env.W / this.res) + 2; this.gh = Math.ceil(env.H / this.res) + 2;
      this.c = new Float32Array(this.gw * this.gh);
      this.src = new Float32Array(this.gw * this.gh);
      this.effect = Object.assign({ axon: 1, dendrite: 0, minor: 0.5 }, o.effect || {});
      this.gain = o.gain != null ? o.gain : 1.2;
      this.color = o.color || '#ffcc66';
      this.start = o.start || 0;               // min: the cue is sensed only from this time on
      this.env = env; this.dirty = true;
    }
    addSource(x, y, rate) { const i = this.idx(x, y); this.src[i] += rate; this.dirty = true; }
    paintSource(x0, y0, x1, y1, rate) {
      for (let y = y0; y < y1; y += this.res) for (let x = x0; x < x1; x += this.res) this.src[this.idx(x, y)] += rate;
      this.dirty = true;
    }
    idx(x, y) {
      const i = Math.min(this.gw - 2, Math.max(1, Math.floor(x / this.res) + 1));
      const j = Math.min(this.gh - 2, Math.max(1, Math.floor(y / this.res) + 1));
      return i + j * this.gw;
    }
    // Gauss–Seidel sweeps of  (Σneighbours − 4c)/h² − c/λ² + s = 0 ; walls are no-flux
    solve(iters) {
      const gw = this.gw, gh = this.gh, c = this.c, s = this.src, h = this.res, k = h * h / (this.lambda * this.lambda);
      const wall = this.env.fieldWall(this);
      for (let it = 0; it < iters; it++) {
        for (let j = 1; j < gh - 1; j++) for (let i = 1; i < gw - 1; i++) {
          const q = i + j * gw; if (wall[q]) { c[q] = 0; continue; }
          // missing or walled neighbours reflect (no-flux boundary)
          const cq = c[q], a = q - 1, b = q + 1, u = q - gw, d = q + gw;
          const sum = (i > 1 && !wall[a] ? c[a] : cq) + (i < gw - 2 && !wall[b] ? c[b] : cq) +
                      (j > 1 && !wall[u] ? c[u] : cq) + (j < gh - 2 && !wall[d] ? c[d] : cq);
          c[q] = (sum + s[q] * h * h) / (4 + k);
        }
      }
      this.dirty = false;
    }
    // value and gradient (per µm) by bilinear interpolation
    sample(x, y, out) {
      const r = this.res, fx = x / r + 0.5, fy = y / r + 0.5;
      let i = Math.floor(fx), j = Math.floor(fy);
      i = Math.min(this.gw - 2, Math.max(0, i)); j = Math.min(this.gh - 2, Math.max(0, j));
      const tx = Math.min(1, Math.max(0, fx - i)), ty = Math.min(1, Math.max(0, fy - j));
      const gw = this.gw, c = this.c, q = i + j * gw;
      const c00 = c[q], c10 = c[q + 1], c01 = c[q + gw], c11 = c[q + gw + 1];
      out[0] = c00 * (1 - tx) * (1 - ty) + c10 * tx * (1 - ty) + c01 * (1 - tx) * ty + c11 * tx * ty;
      out[1] = ((c10 - c00) * (1 - ty) + (c11 - c01) * ty) / r;
      out[2] = ((c01 - c00) * (1 - tx) + (c11 - c10) * tx) / r;
      return out;
    }
    max() { let m = 0; for (let i = 0; i < this.c.length; i++) if (this.c[i] > m) m = this.c[i]; return m; }
  }

  class Environment {
    constructor(W, H, o = {}) {
      this.W = W; this.H = H; this.res = o.res || 4;
      this.gw = Math.ceil(W / this.res) + 1; this.gh = Math.ceil(H / this.res) + 1;
      const n = this.gw * this.gh;
      this.coat = new Uint8Array(n).fill(o.coat != null ? o.coat : 1);
      this.stiff = new Float32Array(n).fill(o.stiffness || GLASS_KPA);
      this.wall = new Uint8Array(n);
      this.escX = null; this.escY = null;
      this.fiberDir = null;           // Float32 pairs (tangent) where fibers lie, 0,0 elsewhere
      this.fibers = [];
      this.fields = [];
      this.astro = new Float32Array(n);
      this.zones = [];                // named regions, e.g. { key:'stop', y0, y1 } for migration stop
      this.spawners = [];             // neurogenesis sources { x, y, w, rate, type }
      this.version = 1;
      this._wallsDirty = false;
    }
    static get COATS() { return COATS; }
    static get GLASS_KPA() { return GLASS_KPA; }
    id(x, y) {
      let i = (x / this.res) | 0, j = (y / this.res) | 0;
      if (i < 0) i = 0; else if (i >= this.gw) i = this.gw - 1;
      if (j < 0) j = 0; else if (j >= this.gh) j = this.gh - 1;
      return i + j * this.gw;
    }
    // ---------- painting
    paint(fn, val) {
      for (let j = 0; j < this.gh; j++) for (let i = 0; i < this.gw; i++) {
        const x = (i + 0.5) * this.res, y = (j + 0.5) * this.res;
        if (!fn(x, y)) continue;
        const q = i + j * this.gw;
        if (val.coat != null) this.coat[q] = val.coat;
        if (val.stiffness != null) this.stiff[q] = typeof val.stiffness === 'function' ? val.stiffness(x, y) : val.stiffness;
        if (val.wall != null) { this.wall[q] = val.wall ? 1 : 0; this._wallsDirty = true; }
      }
      this.version++;
      return this;
    }
    rect(x0, y0, x1, y1, val) { return this.paint((x, y) => x >= x0 && x < x1 && y >= y0 && y < y1, val); }
    circle(cx, cy, r, val) { return this.paint((x, y) => (x - cx) ** 2 + (y - cy) ** 2 < r * r, val); }
    stripes(width, period, angle, val) {
      const ca = Math.cos(angle), sa = Math.sin(angle);
      return this.paint((x, y) => { const u = x * ca + y * sa; return ((u % period) + period) % period < width; }, val);
    }
    stiffnessGradient(x0, x1, k0, k1) {
      const l0 = Math.log10(k0), l1 = Math.log10(k1);
      return this.paint(() => true, { stiffness: (x) => 10 ** (l0 + (l1 - l0) * Math.min(1, Math.max(0, (x - x0) / (x1 - x0)))) });
    }
    addField(name, o) { const f = new Field(this, name, o); this.fields.push(f); return f; }
    field(name) { return this.fields.find((f) => f.name === name) || null; }
    addFiber(pts, o = {}) { this.fibers.push({ pts, width: o.width || 4, adhesion: o.adhesion || 2.0 }); this._rasterFibers(); return this; }
    addZone(z) { this.zones.push(z); return this; }
    addSpawner(s) { this.spawners.push(Object.assign({ acc: 0 }, s)); return this; }

    // ---------- queries used by the engine
    coatOn(x, y) { return COATS[this.coat[this.id(x, y)]].on; }
    coatAt(x, y) { return this.coat[this.id(x, y)]; }
    stiffnessAt(x, y) { return this.stiff[this.id(x, y)]; }
    isWall(x, y) { return this.wall[this.id(x, y)] === 1; }
    astroAt(x, y) { return this.astro[this.id(x, y)]; }
    fiberAt(x, y, out) {
      if (!this.fiberDir) return false;
      const q = this.id(x, y) * 2; out[0] = this.fiberDir[q]; out[1] = this.fiberDir[q + 1];
      return out[0] !== 0 || out[1] !== 0;
    }
    inZone(key, x, y) { for (const z of this.zones) if (z.key === key && x >= z.x0 && x < z.x1 && y >= z.y0 && y < z.y1) return true; return false; }

    // ---------- walls: escape vectors toward the nearest free pixel (two-pass chamfer transform)
    prepare() {
      if (this._wallsDirty) this._buildEscape();
      for (const f of this.fields) if (f.dirty) f.solve(Math.max(400, Math.round(6 * (f.lambda / f.res) ** 2)));
    }
    _buildEscape() {
      const gw = this.gw, gh = this.gh, n = gw * gh, INF = 1e9;
      const d = new Float32Array(n), nx = new Int32Array(n), ny = new Int32Array(n);
      for (let q = 0; q < n; q++) { if (this.wall[q]) { d[q] = INF; nx[q] = -1; } else { d[q] = 0; nx[q] = q % gw; ny[q] = (q / gw) | 0; } }
      const relax = (q, p) => {
        if (nx[p] < 0) return;
        const i = q % gw, j = (q / gw) | 0;
        const dd = (nx[p] - i) ** 2 + (ny[p] - j) ** 2;
        if (dd < d[q]) { d[q] = dd; nx[q] = nx[p]; ny[q] = ny[p]; }
      };
      for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const q = i + j * gw; if (!this.wall[q]) continue; if (i > 0) relax(q, q - 1); if (j > 0) relax(q, q - gw); if (i > 0 && j > 0) relax(q, q - gw - 1); if (i < gw - 1 && j > 0) relax(q, q - gw + 1); }
      for (let j = gh - 1; j >= 0; j--) for (let i = gw - 1; i >= 0; i--) { const q = i + j * gw; if (!this.wall[q]) continue; if (i < gw - 1) relax(q, q + 1); if (j < gh - 1) relax(q, q + gw); if (i < gw - 1 && j < gh - 1) relax(q, q + gw + 1); if (i > 0 && j < gh - 1) relax(q, q + gw - 1); }
      this.escX = new Float32Array(n); this.escY = new Float32Array(n);
      for (let q = 0; q < n; q++) {
        if (!this.wall[q] || nx[q] < 0) continue;
        const i = q % gw, j = (q / gw) | 0;
        // target = centre of nearest free pixel, nudged half a pixel further out
        const tx = (nx[q] + 0.5) * this.res, ty = (ny[q] + 0.5) * this.res;
        this.escX[q] = tx; this.escY[q] = ty;
      }
      this._wallsDirty = false;
      this._fieldWallCache = null;
    }
    // resolve a point that is inside a wall: returns the free point to move to
    escape(x, y, out) {
      const q = this.id(x, y);
      if (!this.wall[q] || !this.escX) return false;
      out[0] = this.escX[q]; out[1] = this.escY[q];
      return true;
    }
    fieldWall(f) {
      if (this._fieldWallCache && this._fieldWallCache.f === f.res) return this._fieldWallCache.w;
      const w = new Uint8Array(f.gw * f.gh);
      for (let j = 1; j < f.gh - 1; j++) for (let i = 1; i < f.gw - 1; i++) {
        const x = (i - 0.5) * f.res, y = (j - 0.5) * f.res;
        if (x >= 0 && y >= 0 && x < this.W && y < this.H && this.isWall(x, y)) w[i + j * f.gw] = 1;
      }
      this._fieldWallCache = { f: f.res, w };
      return w;
    }
    _rasterFibers() {
      const n = this.gw * this.gh; this.fiberDir = new Float32Array(n * 2);
      for (const fb of this.fibers) {
        for (let k = 1; k < fb.pts.length; k++) {
          const [x0, y0] = fb.pts[k - 1], [x1, y1] = fb.pts[k];
          const L = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L;
          for (let s = 0; s <= L; s += this.res * 0.5) {
            const cx = x0 + ux * s, cy = y0 + uy * s;
            for (let oy = -fb.width; oy <= fb.width; oy += this.res) for (let ox = -fb.width; ox <= fb.width; ox += this.res) {
              if (ox * ox + oy * oy > fb.width * fb.width) continue;
              const q = this.id(cx + ox, cy + oy) * 2; this.fiberDir[q] = ux; this.fiberDir[q + 1] = uy;
            }
          }
        }
      }
      this.version++;
    }
    // ---------- serialisation for the renderer (static layers)
    describe() {
      return {
        W: this.W, H: this.H, res: this.res, gw: this.gw, gh: this.gh, version: this.version,
        coat: this.coat, stiff: this.stiff, wall: this.wall,
        fibers: this.fibers.map((f) => ({ pts: f.pts, width: f.width })),
        zones: this.zones,
        fields: this.fields.map((f) => ({ name: f.name, label: f.label, res: f.res, gw: f.gw, gh: f.gh, c: f.c, max: f.max(), color: f.color, start: f.start })),
        coats: COATS,
      };
    }
  }

  return { Environment, Field, COATS };
});
