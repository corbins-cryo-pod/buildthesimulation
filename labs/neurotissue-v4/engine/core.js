/*
 * NeuroTissue engine v4 — one core for dishes, gels and tissues.
 *
 * The geometry comes from a Space (2-D surface, 3-D volume, tube); the engine itself is
 * dimension-agnostic: positions are 3-vectors, and a 2-D space simply holds z at 0.
 *
 * Agents
 *   cells      soma agents with a type genome and behaviours (neurites, migrate, divide, secrete,
 *              consume, survive)
 *   neurites   chains of nodes with a kinematic growth cone at the tip (tubulin supply and
 *              competition, promoter feedback, actin waves, identity and Dotti stages from v3)
 *   fields     diffusing chemicals and depositable matrix on the Space's grid; reactions couple them
 * Mechanics are quasi-static: each step, after growth, segment-length, bending, anchoring, overlap
 * and containment constraints are relaxed. Mechanics are far faster than growth, so this is
 * a reduced approximation; minute-scale steps still require convergence tests on each scenario.
 * Storage is data-oriented: node state lives in typed arrays; cells are looked up through a
 * uniform spatial hash rebuilt every step.
 */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const dep = (file, name) => (isNode ? require(file) : root.NE4)[name];
  const mod = factory(dep('./space.js', 'Field'), dep('./types.js', 'CellTypes4'), dep('./clutch.js', 'Clutch'));
  if (isNode) module.exports = Object.assign(mod, require('./space.js'), require('./types.js'));
  else { root.NE4 = root.NE4 || {}; Object.assign(root.NE4, mod); }
})(typeof self !== 'undefined' ? self : this, function (Field, CellTypes, Clutch) {
  'use strict';
  const TAU = Math.PI * 2;
  const I_MINOR = 1, I_AXON = 2, I_DEND = 3;
  const N_GROW = 0, N_RETRACT = 1, N_PAUSE = 2;
  const K_SOMA = 1, K_SHAFT = 2, K_TIP = 3;
  const TIPCAP = 6;

  const DEFAULTS = {
    dt: 0.05, iters: 2, segLen: 3.5, fieldEvery: 20, fieldSweeps: 3, fieldMaxStep: 5, hashSize: 30,
    supply: 1, tubDiff: 6, tubActive: 0.45, polarity: 0.75, promoterBack: 1.0,
    waveRate: 1.6, waveSpeed: 2.5, growthSpeed: 1, retractSpeed: 0.3, retractDelay: 35,
    contractility: 0.002, viscosity: 3, bend: 0.06, turnNoise: 1, branchRate: 1, stickiness: 1,
    fieldGain: 1, senseNoise: 0.6, senseThreshold: 0.02, gripScale: 1, migrationSpeed: 1,
    serum: 1, deathThreshold: 0.25, deathDelay: 600, deathGrace: 360, apoptosis: true, division: true,
    maxAxons: 1, maxCells: 5000, maxCellRecords: 100000,
  };

  function makeRng(seed) {
    const st = { a: seed | 0 };
    const f = function () {
      let a = st.a = (st.a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.state = st; return f;
  }

  class Nodes {
    constructor(cap) { this.cap = 0; this.n = 0; this.free = []; this._grow(Math.max(1024, cap | 0)); }
    _grow(cap) {
      const mk = (T, k) => { const a = new T(cap); if (this[k]) a.set(this[k]); this[k] = a; };
      for (const k of ['x', 'y', 'z', 'ax', 'ay', 'az']) mk(Float64Array, k);
      for (const k of ['rl', 'w']) mk(Float32Array, k);
      for (const k of ['kind', 'anc', 'alive', 'ident']) mk(Uint8Array, k);
      for (const k of ['cell', 'neu']) mk(Int32Array, k);
      mk(Uint32Array, 'gen'); this.cap = cap;
    }
    alloc(x, y, z, kind, cell, neu) {
      let i; if (this.free.length) i = this.free.pop(); else { if (this.n >= this.cap) this._grow(this.cap * 2); i = this.n++; }
      this.x[i] = x; this.y[i] = y; this.z[i] = z; this.ax[i] = x; this.ay[i] = y; this.az[i] = z; this.anc[i] = 0;
      this.kind[i] = kind; this.cell[i] = cell; this.neu[i] = neu; this.ident[i] = 0; this.rl[i] = 1; this.w[i] = 0.8; this.alive[i] = 1;
      return i;
    }
    release(i) { this.alive[i] = 0; this.gen[i]++; this.anc[i] = 0; this.free.push(i); }
  }

  const norm3 = (v) => { const L = Math.hypot(v[0], v[1], v[2]) || 1; v[0] /= L; v[1] /= L; v[2] /= L; return v; };

  class Engine {
    constructor(opts = {}) {
      this.p = Object.assign({}, DEFAULTS); this.setParams(opts.params || {});
      this.space = opts.space; this.dim = this.space.dim;
      this.rand = makeRng(opts.seed != null ? opts.seed : 1234); this._spare = null;
      this.t = 0; this.steps = 0; this.deaths = 0; this.divisions = 0;
      this.N = new Nodes(opts.capacity || 8192);
      this.cells = []; this.liveCells = 0; this.neurites = []; this._freeNeu = [];
      this.events = []; this.hooks = []; this.reactions = []; this.spawners = [];
      this.metricsFns = {};
      this._v = [0, 0, 0]; this._w = [0, 0, 0]; this._g = [0, 0, 0]; this._n = [0, 0, 0];
      this._initHash();
    }
    static get DEFAULTS() { return Object.assign({}, DEFAULTS); }
    static get IDENT() { return { MINOR: I_MINOR, AXON: I_AXON, DENDRITE: I_DEND }; }
    setParams(o) {
      for (const [key, value] of Object.entries(o)) {
        if (!(key in DEFAULTS)) throw new TypeError('Unknown engine parameter: ' + key);
        if (typeof DEFAULTS[key] === 'boolean' ? typeof value !== 'boolean' : typeof value !== 'number' || !Number.isFinite(value) || value < 0)
          throw new TypeError('Invalid engine parameter: ' + key);
        if (['dt', 'segLen', 'hashSize', 'fieldMaxStep'].includes(key) && value <= 0) throw new RangeError(key + ' must be positive');
        if (['fieldEvery', 'fieldSweeps', 'iters', 'maxCells', 'maxCellRecords'].includes(key) && (!Number.isInteger(value) || value < 1)) throw new RangeError(key + ' must be a positive integer');
      }
      Object.assign(this.p, o);
    }
    gauss() {
      if (this._spare !== null) { const s = this._spare; this._spare = null; return s; }
      let u = 0; while (u === 0) u = this.rand(); const v = this.rand();
      const r = Math.sqrt(-2 * Math.log(u)); this._spare = r * Math.sin(TAU * v); return r * Math.cos(TAU * v);
    }
    /** random unit vector (in-plane for 2-D spaces) */
    randDir(out) {
      if (this.dim === 2) { const a = this.rand() * TAU; out[0] = Math.cos(a); out[1] = Math.sin(a); out[2] = 0; return out; }
      const z = 2 * this.rand() - 1, a = this.rand() * TAU, r = Math.sqrt(1 - z * z); out[0] = r * Math.cos(a); out[1] = r * Math.sin(a); out[2] = z; return out;
    }
    /** add Gaussian noise of size s perpendicular to unit vector h, then renormalise (in place) */
    jitterDir(h, s) {
      let gx = this.gauss() * s, gy = this.gauss() * s, gz = this.dim === 2 ? 0 : this.gauss() * s;
      const d = gx * h[0] + gy * h[1] + gz * h[2]; gx -= d * h[0]; gy -= d * h[1]; gz -= d * h[2];
      h[0] += gx; h[1] += gy; h[2] += gz; if (this.dim === 2) h[2] = 0; return norm3(h);
    }
    addHook(h) { this.hooks.push(Object.assign({ once: true }, h)); return h; }
    addReaction(fn) { this.reactions.push(fn); return fn; }
    /** { type, every (min), count(e) -> n, where(e, out) -> fills out[0..2], from, until } */
    addSpawner(s) { this.spawners.push(Object.assign({ next: s.from || 0, from: 0, until: Infinity }, s)); return s; }

    // ------------------------------------------------------------ spatial hash over cells
    _initHash() {
      const b = this.space.bounds, H = this.p.hashSize;
      this.hx = Math.max(1, Math.ceil((b.x1 - b.x0) / H) + 1); this.hy = Math.max(1, Math.ceil((b.y1 - b.y0) / H) + 1); this.hz = this.dim === 2 ? 1 : Math.max(1, Math.ceil((b.z1 - b.z0) / H) + 1);
      this.hHead = new Int32Array(this.hx * this.hy * this.hz).fill(-1); this.hNext = new Int32Array(256); this.hUsed = [];
    }
    _hkey(x, y, z) {
      const b = this.space.bounds, H = this.p.hashSize;
      let i = ((x - b.x0) / H) | 0, j = ((y - b.y0) / H) | 0, k = this.dim === 2 ? 0 : ((z - b.z0) / H) | 0;
      if (i < 0) i = 0; else if (i >= this.hx) i = this.hx - 1; if (j < 0) j = 0; else if (j >= this.hy) j = this.hy - 1; if (k < 0) k = 0; else if (k >= this.hz) k = this.hz - 1;
      return i + this.hx * (j + this.hy * k);
    }
    _buildHash() {
      for (const q of this.hUsed) this.hHead[q] = -1; this.hUsed.length = 0;
      if (this.hNext.length < this.cells.length) { const nn = new Int32Array(this.cells.length * 2).fill(-1); nn.set(this.hNext); this.hNext = nn; }
      const N = this.N;
      for (const c of this.cells) {
        if (!c.alive) continue; const s = c.node; c.x = N.x[s]; c.y = N.y[s]; c.z = N.z[s];
        const q = this._hkey(c.x, c.y, c.z); if (this.hHead[q] < 0) this.hUsed.push(q); this.hNext[c.id] = this.hHead[q]; this.hHead[q] = c.id;
      }
    }
    /** call fn(cell, dx, dy, dz, d2) for cells within r of (x, y, z) */
    near(x, y, z, r, fn, skip = -1) {
      // visit only the bins the query box overlaps (not a fixed 3x3x3 block)
      const b = this.space.bounds, H = this.p.hashSize, r2 = r * r;
      const ia = Math.max(0, Math.floor((x - r - b.x0) / H)), ib = Math.min(this.hx - 1, Math.floor((x + r - b.x0) / H));
      const ja = Math.max(0, Math.floor((y - r - b.y0) / H)), jb = Math.min(this.hy - 1, Math.floor((y + r - b.y0) / H));
      const ka = this.dim === 2 ? 0 : Math.max(0, Math.floor((z - r - b.z0) / H)), kb = this.dim === 2 ? 0 : Math.min(this.hz - 1, Math.floor((z + r - b.z0) / H));
      for (let k = ka; k <= kb; k++)
        for (let j = ja; j <= jb; j++)
          for (let i = ia; i <= ib; i++) {
            for (let id = this.hHead[i + this.hx * (j + this.hy * k)]; id >= 0; id = this.hNext[id]) {
              if (id === skip) continue; const o = this.cells[id];
              const dx = o.x - x, dy = o.y - y, dz = o.z - z, d2 = dx * dx + dy * dy + dz * dz;
              if (d2 <= r2) fn(o, dx, dy, dz, d2);
            }
          }
    }
    regionAt(x, y, z) { const rs = this.space.regions; if (!rs) return null; for (const r of rs) if (x >= r.x0 && x < r.x1) return r.name; return null; }

    // ------------------------------------------------------------ creation
    addCell(x, y, z, opts = {}) {
      if (this.cells.length >= this.p.maxCellRecords) throw new RangeError('Cell record memory guard reached (maxCellRecords); export and start a new run');
      const p = this.p, N = this.N, T = CellTypes.getType(opts.type || 'hippocampal'), id = this.cells.length;
      const lo = T.primaries[0], hi = T.primaries[1];
      const c = {
        id, T, alive: true, r: (opts.radius || T.radius) * (0.92 + 0.16 * this.rand()), x, y, z, node: -1,
        age: opts.age || 0, born: this.t, neur: [], nPrim: 0, layoutIdx: 0,
        maxNeurites: opts.maxNeurites != null ? opts.maxNeurites : lo + Math.floor(this.rand() * (hi - lo + 1)),
        stage: T.kind === 'neuron' ? 1 : 0, stageT: [-1, this.t, -1, -1, -1, -1], axonId: -1, leadT: 0, leadId: -1, leadStart: -1, switchT: 0, switches: 0, axonDecided: -1, extraT: 0, lesions: 0, dendLen: 0,
        Q: T.somaCap * 0.5, totalLen: 0, troph: 0.5, lowT: 0, dying: -1,
        stage1T: T.stage1Time * (T.stage1Jitter > 0 ? Math.exp(T.stage1Jitter * this.gauss()) : 1),
        dendThr: T.dendriteAxonLen * (0.8 + 0.4 * this.rand()), spineThr: T.spineDendLen * (0.8 + 0.4 * this.rand()),
        sproutAt: T.sproutDelay * (0.7 + 0.6 * this.rand()),
        cycleT: this.rand() * (T.cycle || 1), cycleLen: (T.cycle || 0) * (1 + T.cycleJitter * (this.rand() - 0.5) * 2), lifeEnd: T.life ? T.life * (0.6 + 0.8 * this.rand()) : 0,
        hx: 0, hy: 0, hz: 0, ox: 1, oy: 0, oz: 0, fixed: !!opts.fixed, region: opts.region || null, spawned: !!opts.spawned,
        activeAt: opts.activeAt != null ? opts.activeAt : (T.migrate && T.migrate.after ? this.t + T.migrate.after * (1 + (T.migrate.afterJitter != null ? T.migrate.afterJitter : 0.3) * (2 * this.rand() - 1)) : 0),   // e.g. Schwann cells turning into repair cells
      };
      const d = this.randDir(this._v); c.hx = d[0]; c.hy = d[1]; c.hz = d[2];
      if (opts.orient) { c.ox = opts.orient[0]; c.oy = opts.orient[1]; c.oz = opts.orient[2]; } else { c.ox = d[0]; c.oy = d[1]; c.oz = d[2]; }
      c.node = N.alloc(x, y, this.dim === 2 ? 0 : z, K_SOMA, id, -1); N.w[c.node] = c.r;
      this.cells.push(c); this.liveCells++;
      if (this.hNext.length < this.cells.length) { const nn = new Int32Array(this.cells.length * 2).fill(-1); nn.set(this.hNext); this.hNext = nn; }   // keep links: the hash is live mid-step
      return c;
    }
    _newNeurite(c, parentId, baseNode, tipNode, h, ident) {
      const N = this.N; let id; if (this._freeNeu.length) id = this._freeNeu.pop(); else { id = this.neurites.length; this.neurites.push(null); }
      const par = parentId >= 0 ? this.neurites[parentId] : null;
      const nr = {
        id, cell: c.id, alive: true, parent: parentId, base: baseNode, baseGen: N.gen[baseNode], nodes: [tipNode], children: [],
        hx: h[0], hy: h[1], hz: h[2], drive: 1, T: par ? 1 : 2, S: par ? par.S * 0.3 : 0.3, waves: [], lastWave: this.t, born: this.t,
        state: N_GROW, ident: ident != null ? ident : I_MINOR, order: par ? par.order + 1 : 1, depth: par ? par.depth + 1 : 0,
        len: 0, path: 0, starveT: 0, retractUntil: 0, lastSplitLen: 0, adv: 0.5, F: 0, vNow: 0, perm: 1, fx: 0, fy: 0, fz: 0, sx: 0, sy: 0, sz: 0, fad: 0, dying: false,
      };
      this.neurites[id] = nr; N.neu[tipNode] = id; N.kind[tipNode] = K_TIP; N.ident[tipNode] = nr.ident; c.neur.push(id);
      return nr;
    }
    /** grow a pre-formed neurite along a polyline (used for stump axons); returns the neurite */
    addNeuriteAlong(c, pts, ident, opts = {}) {
      const N = this.N, last = pts[pts.length - 1], prev = pts[pts.length - 2] || [c.x, c.y, c.z];
      const tip = N.alloc(last[0], last[1], last[2], K_TIP, c.id, -1);
      const h = norm3([last[0] - prev[0], last[1] - prev[1], last[2] - prev[2]]);
      const nr = this._newNeurite(c, -1, c.node, tip, h, ident); c.nPrim++;
      const nodes = [];
      for (let k = 0; k < pts.length - 1; k++) { const q = pts[k]; const i = N.alloc(q[0], q[1], q[2], K_SHAFT, c.id, nr.id); N.ident[i] = ident; if (opts.anchor) { N.anc[i] = 1; } nodes.push(i); }
      nodes.push(tip); nr.nodes = nodes;
      let a = c.node; for (const i of nodes) { N.rl[i] = Math.hypot(N.x[i] - N.x[a], N.y[i] - N.y[a], N.z[i] - N.z[a]); a = i; }
      if (ident === I_AXON) c.axonId = nr.id;
      return nr;
    }
    _removeNeurite(nr) {
      if (!nr.alive) return;
      for (const ch of nr.children.slice()) this._removeNeurite(this.neurites[ch]);
      for (const i of nr.nodes) this.N.release(i);
      const c = this.cells[nr.cell]; const k = c.neur.indexOf(nr.id); if (k >= 0) c.neur.splice(k, 1);
      if (nr.parent >= 0) { const par = this.neurites[nr.parent]; const j = par.children.indexOf(nr.id); if (j >= 0) par.children.splice(j, 1); } else c.nPrim--;
      if (c.axonId === nr.id) c.axonId = -1;
      nr.alive = false; nr.nodes = []; nr.waves = []; this._freeNeu.push(nr.id);
    }
    removeCell(c) {
      if (!c.alive) return;
      for (const id of c.neur.slice()) { const nr = this.neurites[id]; if (nr && nr.alive && nr.parent < 0) this._removeNeurite(nr); }
      this.N.release(c.node); c.alive = false; this.liveCells--;
    }

    // ------------------------------------------------------------ main loop
    step(n = 1) { for (let k = 0; k < n; k++) this._step(); }
    _step() {
      const p = this.p, dt = p.dt;
      this.t += dt; this.steps++;
      if (this.hooks.length && this.steps % 10 === 5) this._runHooks();
      if (this.spawners.length) this._spawn();
      this._buildHash();
      this._cellsBio(dt);
      this._neuritesBio(dt);
      this._mechanics(dt);
      if (this.steps % p.fieldEvery === 0 && this.space.fields.length) {
        const dtF = dt * p.fieldEvery, count = Math.max(1, Math.ceil(dtF / p.fieldMaxStep)), h = dtF / count;
        const rates = this.space.fields.map(f => {
          const rate = f._depositRate || (f._depositRate = new Float32Array(f.c.length));
          for (let i = 0; i < rate.length; i++) { rate[i] = f.add[i] / dtF; f.add[i] = 0; }
          return rate;
        });
        // Secretion accumulated since the last field batch is a piecewise-constant rate.
        // Cell motion/sensing is not subcycled here; coupled convergence is reported separately.
        for (let k = 0; k < count; k++) {
          const mid = this.t - dtF + (k + 0.5) * h;
          for (let i = 0; i < this.space.fields.length; i++) {
            const f = this.space.fields[i]; f.update(h, 1, f.srcScaleFn ? f.srcScaleFn(mid) : 1, rates[i]);
          }
          for (const reaction of this.reactions) reaction(this, h);
        }
      }
    }
    _runHooks() { for (let k = this.hooks.length - 1; k >= 0; k--) { const h = this.hooks[k]; if (h.when(this)) { h.run(this); if (h.once) this.hooks.splice(k, 1); } } }
    _spawn() {
      for (const s of this.spawners) {
        while (this.t >= s.next && s.next <= s.until) {
          const n = typeof s.count === 'function' ? s.count(this) : s.count;
          for (let k = 0; k < n; k++) { if (s.where(this, this._w) === false) continue; if (this.liveCells >= this.p.maxCells) break; this.addCell(this._w[0], this._w[1], this._w[2], { type: s.type, spawned: true }); }
          s.next += s.every;
        }
      }
    }

    // ------------------------------------------------------------ cells
    _cellsBio(dt) {
      const p = this.p, N = this.N, sp = this.space;
      const nCells = this.cells.length;
      for (let ci = 0; ci < nCells; ci++) {
        const c = this.cells[ci];
        if (!c.alive) continue;
        const T = c.T; c.age += dt;
        if (c.dying >= 0) { c.dying += dt; if (c.dying > 90) { this.removeCell(c); this.deaths++; this.events.push({ type: 'death', t: this.t, cell: c.id }); } continue; }
        if (c.lifeEnd && c.age > c.lifeEnd) { this.removeCell(c); this.events.push({ type: 'leave', t: this.t, cell: c.id }); continue; }
        // survival (neurons): trophic support, hazard of death
        if (T.kind === 'neuron' && !c.fixed) {
          let supply = p.serum * 0.35;
          if (T.trophic) for (const f in T.trophic) { const F = sp.field(f); if (F) supply += T.trophic[f] * F.at(c.x, c.y, c.z); }
          c.troph += (supply - c.troph) * dt / 360;
          const def = Math.max(0, 1 - c.troph / p.deathThreshold);
          if (p.apoptosis && c.age > p.deathGrace && def > 0 && this.rand() < def * def * dt / Math.max(1, p.deathDelay)) { this._beginDeath(c); continue; }
        }
        // secretion and consumption
        if (T.secrete && this.t >= c.activeAt) for (const f in T.secrete) { const F = sp.field(f); if (F) F.deposit(c.x, c.y, c.z, T.secrete[f] * dt); }
        if (T.consume) for (const f in T.consume) { const F = sp.field(f); if (F) F.take(c.x, c.y, c.z, T.consume[f] * dt); }
        if (T.migrate && !c.fixed && this.t >= c.activeAt) this._migrate(c, dt);
        if (T.cycle > 0 && p.division && !c.fixed && this.t >= c.activeAt) this._cycle(c, dt);
        if (T.kind === 'neuron') {
          // tubulin production and turnover, stages, sprouting, actin waves
          c.Q += T.production * p.supply * (1 - c.Q / T.somaCap) * dt;
          c.Q -= T.upkeep * c.totalLen * dt; if (c.Q < 0) c.Q = 0;
          this._stageUpdate(c);
          if (c.nPrim < c.maxNeurites && c.age > c.stage1T && (!T.layout || c.layoutIdx < T.layout.length || T.axonRule !== 'layout') && this.rand() < T.initRate / 60 * dt * (c.nPrim === 0 ? 3 : 1)) this._sprout(c);
          let nprim = 0; for (const id of c.neur) { const nr = this.neurites[id]; if (nr.parent < 0 && !nr.dying) nprim++; }
          if (nprim > 0 && T.waves !== false && this.rand() < p.waveRate / 60 * dt * nprim) {
            let k = (this.rand() * nprim) | 0;
            for (const id of c.neur) { const nr = this.neurites[id]; if (nr.parent >= 0 || nr.dying) continue; if (k-- === 0) { this._emitWave(nr, 0.8 + 0.4 * this.rand(), 0); break; } }
          }
        }
      }
    }
    _beginDeath(c) { c.dying = 0; this.events.push({ type: 'dying', t: this.t, cell: c.id }); for (const id of c.neur) { const nr = this.neurites[id]; nr.dying = true; nr.state = N_RETRACT; } }

    _migrate(c, dt) {
      const m = c.T.migrate, p = this.p, sp = this.space, g = this._g;
      // permission: required matrix (e.g. fibrin) unless inside an allowed region
      let perm = 1;
      if (m.needs) {
        const reg = this.regionAt(c.x, c.y, c.z), ok = reg && m.needs.regions && m.needs.regions.some((r) => reg.startsWith(r));
        if (!ok) { const F = sp.field(m.needs.field), v = F ? F.at(c.x, c.y, c.z) : 0; perm = v < m.needs.min ? 0 : v / (v + m.needs.k); }
      }
      // desired direction: persistence + crowding (contact inhibition of locomotion) + alignment + chemotaxis
      let dx = c.hx * 2, dy = c.hy * 2, dz = c.hz * 2, ax = 0, ay = 0, az = 0, nb = 0;
      const R = 2.6 * c.r, Rc = m.cohesion ? Math.max(R, m.cohR || 60) : R;
      // contact: crowding pushes cells apart; cohesion pulls same-type cells into cords (Schwann cell columns)
      this.near(c.x, c.y, c.z, Rc, (o, ox, oy, oz, d2) => {
        if (o.T.kind === 'neuron') return;
        const d = Math.sqrt(d2) || 1;
        if (d < R) { nb++; dx -= m.crowd * ox / d; dy -= m.crowd * oy / d; dz -= m.crowd * oz / d; }
        else if (o.T.key === c.T.key) { const w = m.cohesion * (1 - d / Rc); dx += w * ox / d; dy += w * oy / d; dz += w * oz / d; }
        if (o.T.key === c.T.key) { const s = (o.ox * c.ox + o.oy * c.oy + o.oz * c.oz) >= 0 ? 1 : -1; ax += s * o.ox; ay += s * o.oy; az += s * o.oz; }
      }, c.id);
      if (m.chemo) for (const f in m.chemo) {
        const F = sp.field(f); if (!F) continue; F.grad(c.x, c.y, c.z, g); const v = F.at(c.x, c.y, c.z);
        const w = m.chemo[f] / (v + 0.05); dx += w * g[0]; dy += w * g[1]; dz += w * g[2];
      }
      if (m.axial && sp.kind === 'tube') { const s = c.hx >= 0 ? 1 : -1; dx += m.axial * s; }
      // orientation: nematic alignment with neighbours and with the direction of travel
      if (m.align) {
        const s = (c.hx * c.ox + c.hy * c.oy + c.hz * c.oz) >= 0 ? 1 : -1;
        let ox = c.ox + 0.1 * (ax + s * c.hx * 0.5), oy = c.oy + 0.1 * (ay + s * c.hy * 0.5), oz = c.oz + 0.1 * (az + s * c.hz * 0.5);
        if (sp.kind === 'tube') ox += 0.05 * (c.ox >= 0 ? 1 : -1);
        if (this.dim === 2) oz = 0; const L = Math.hypot(ox, oy, oz) || 1; c.ox = ox / L; c.oy = oy / L; c.oz = oz / L;
        const so = (dx * c.ox + dy * c.oy + dz * c.oz) >= 0 ? 1 : -1; dx += m.align * so * c.ox; dy += m.align * so * c.oy; dz += m.align * so * c.oz;
      }
      const h = this._v; h[0] = dx; h[1] = dy; h[2] = this.dim === 2 ? 0 : dz; norm3(h);
      const k = Math.min(1, dt / Math.max(1, m.persist));
      c.hx += (h[0] - c.hx) * k; c.hy += (h[1] - c.hy) * k; c.hz += (h[2] - c.hz) * k;
      h[0] = c.hx; h[1] = c.hy; h[2] = c.hz; norm3(h); this.jitterDir(h, Math.sqrt(2 * dt / Math.max(1, m.persist)));
      c.hx = h[0]; c.hy = h[1]; c.hz = h[2];
      c.crowd = nb;
      const v = m.speed * p.migrationSpeed * perm * dt, N = this.N, s = c.node;
      N.x[s] += c.hx * v; N.y[s] += c.hy * v; N.z[s] += c.hz * v;
      if (sp.contain(N.x, N.y, N.z, s, this._n)) { const nn = this._n, d = c.hx * nn[0] + c.hy * nn[1] + c.hz * nn[2]; if (d < 0) { c.hx -= 2 * d * nn[0]; c.hy -= 2 * d * nn[1]; c.hz -= 2 * d * nn[2]; } }
    }
    _cycle(c, dt) {
      const T = c.T; c.cycleT += dt; if (c.cycleT < c.cycleLen) return;
      c.cycleT = c.cycleLen * 0.75;   // try again a little later if blocked
      if (this.liveCells >= this.p.maxCells || (this.divideOK && !this.divideOK(c))) return;
      let nb = 0; this.near(c.x, c.y, c.z, T.contactR || 2.6 * c.r, (o) => { if (o.T.kind !== 'neuron') nb++; }, c.id);
      if (nb >= T.maxNeighbours) return;
      if (T.divideNeeds) {
        const reg = this.regionAt(c.x, c.y, c.z), ok = reg && T.divideNeeds.regions && T.divideNeeds.regions.some((r) => reg.startsWith(r));
        const F = this.space.field(T.divideNeeds.field); if (!ok && (!F || F.at(c.x, c.y, c.z) < T.divideNeeds.min)) return;
      }
      const N = this.N, off = c.r * 1.1, s = c.node;
      const d = this.addCell(N.x[s] + c.ox * off, N.y[s] + c.oy * off, N.z[s] + c.oz * off, { type: T.key, orient: [c.ox, c.oy, c.oz], activeAt: 0 });
      N.x[s] -= c.ox * off * 0.5; N.y[s] -= c.oy * off * 0.5; N.z[s] -= c.oz * off * 0.5;
      d.hx = c.ox; d.hy = c.oy; d.hz = c.oz; c.hx = -c.ox; c.hy = -c.oy; c.hz = -c.oz;
      c.cycleT = 0; c.cycleLen = T.cycle * (1 + T.cycleJitter * (this.rand() - 0.5) * 2); this.divisions++;
      this.space.contain(N.x, N.y, N.z, d.node, this._n);
    }

    _sprout(c) {
      const N = this.N, T = c.T; let plan = null;
      if (T.layout && c.layoutIdx < T.layout.length) plan = T.layout[c.layoutIdx];
      // pick a direction away from existing primaries (best of 10 random tries)
      const d = this._v; let best = null, bestS = -1e9;
      for (let k = 0; k < 10; k++) {
        this.randDir(d); if (plan && plan.dir) { d[0] = plan.dir[0] + 0.2 * d[0]; d[1] = plan.dir[1] + 0.2 * d[1]; d[2] = (plan.dir[2] || 0) + 0.2 * d[2]; norm3(d); }
        let s = this.rand() * 0.5;
        for (const id of c.neur) { const nr = this.neurites[id]; if (nr.parent >= 0) continue; const i0 = nr.nodes[0]; const ux = N.x[i0] - c.x, uy = N.y[i0] - c.y, uz = N.z[i0] - c.z, L = Math.hypot(ux, uy, uz) || 1; s -= Math.max(0, (ux * d[0] + uy * d[1] + uz * d[2]) / L) * 1.5; }
        if (s > bestS) { bestS = s; best = [d[0], d[1], d[2]]; }
      }
      const r = c.r + 2.5, tip = N.alloc(c.x + best[0] * r, c.y + best[1] * r, c.z + best[2] * r, K_TIP, c.id, -1);
      let ident = I_MINOR;
      if (plan) ident = plan.ident === 'axon' ? I_AXON : plan.ident === 'dendrite' ? I_DEND : I_MINOR;
      else if (c.stage >= 4) ident = I_DEND;
      if (!plan && c.axonId < 0 && T.axonRule === 'layout' && T.layout && T.layout.some((l) => l.ident === 'axon')) ident = I_AXON;
      const nr = this._newNeurite(c, -1, c.node, tip, best, ident); N.rl[tip] = r; c.nPrim++;
      if (plan) c.layoutIdx++;
      if (ident === I_AXON && c.axonId < 0) c.axonId = nr.id;
      this.events.push({ type: 'sprout', t: this.t, cell: c.id });
    }

    _stageUpdate(c) {
      const T = c.T, t = this.t, dt = this.p.dt;
      const enter = (s, at) => { c.stage = s; if (c.stageT[s] < 0) c.stageT[s] = at != null ? at : t; this.events.push({ type: 'stage', stage: s, t, cell: c.id }); };
      let ax = c.axonId >= 0 ? this.neurites[c.axonId] : null;
      if (ax && !(ax.alive && ax.ident === I_AXON)) { ax = null; c.axonId = -1; }
      if (c.stage < 2 && c.nPrim > 0) enter(2);
      if (T.axonRule === 'competition' && c.stage >= 2) {
        let L1 = 0, L2 = 0, best = null;
        for (const id of c.neur) {
          const nr = this.neurites[id];
          if (nr.parent >= 0 || nr.dying || nr.ident === I_AXON) continue;
          if (nr.ident !== I_MINOR && !(nr.ident === I_DEND && !ax)) continue;
          const L = nr.len; if (L > L1) { L2 = L1; L1 = L; best = nr; } else if (L > L2) L2 = L;
        }
        if (!ax) {
          const ok = best && L1 >= T.axonMinLen && (L1 - L2 >= T.axonLead || L1 >= 0.88 * T.minor.maxLen);
          if (ok && (c.leadId !== best.id || c.leadT === 0)) { c.leadId = best.id; c.leadStart = t; c.leadT = 0; }
          if (ok) c.leadT += dt; else { c.leadT = 0; c.leadId = -1; }
          if (ok && c.leadT >= T.axonHold) {
            this._setIdent(best, I_AXON); c.axonId = best.id; ax = best; c.leadT = 0; c.axonDecided = t;
            this.events.push({ type: 'axon', t, cell: c.id });
            if (c.stage < 3) enter(3, c.leadStart >= 0 ? c.leadStart : t);
          }
        } else {
          if (best && L1 >= T.axonMinLen && L1 - ax.len >= T.axonLead) c.switchT += dt; else c.switchT = 0;
          if (c.switchT >= T.axonHold) {
            this._setIdent(ax, c.stage >= 4 ? I_DEND : I_MINOR); this._setIdent(best, I_AXON); c.axonId = best.id; ax = best; c.switchT = 0; c.switches++;
            this.events.push({ type: 'axonSwitch', t, cell: c.id });
          }
          if (this.p.maxAxons > 1 && best && best.ident === I_MINOR) {
            let nAx = 0; for (const id of c.neur) { const nr = this.neurites[id]; if (nr.parent < 0 && nr.ident === I_AXON) nAx++; }
            if (nAx < this.p.maxAxons && L1 >= 0.88 * T.minor.maxLen) c.extraT += dt; else c.extraT = 0;
            if (c.extraT >= T.axonHold) { this._setIdent(best, I_AXON); c.extraT = 0; }
          }
        }
      }
      const ax2 = c.axonId >= 0 ? this.neurites[c.axonId] : null, has = !!(ax2 && ax2.alive && ax2.ident === I_AXON);
      if (c.stage < 3 && has) enter(3);
      if (c.stage === 3 && !has && T.axonRule === 'competition') c.stage = 2;
      if (c.stage === 3 && has && t - c.stageT[3] >= T.dendriteDelay && ax2.len >= c.dendThr) {
        for (const id of c.neur) { const nr = this.neurites[id]; if (nr.parent < 0 && nr.ident === I_MINOR) this._setIdent(nr, I_DEND); }
        enter(4);
      }
      if (c.stage === 4) {
        let dl = 0; if (c.spineThr > 0) for (const id of c.neur) { const nr = this.neurites[id]; if (nr.ident === I_DEND) dl += nr.len; }
        c.dendLen = dl; if (t - c.stageT[4] >= T.spineDelay && dl >= c.spineThr) enter(5);
      }
    }
    _setIdent(nr, ident) { nr.ident = ident; const N = this.N; for (const i of nr.nodes) N.ident[i] = ident; for (const ch of nr.children) this._setIdent(this.neurites[ch], ident); }

    // ------------------------------------------------------------ neurites
    _ip(c, nr) { const T = c.T; return nr.ident === I_AXON ? T.axon : nr.ident === I_DEND ? T.dendrite : T.minor; }
    _emitWave(nr, amp, delay) {
      nr.waves.push({ at: this.t + delay + nr.len / this.p.waveSpeed, amp });
      for (const ch of nr.children) if (this.rand() < 0.5) this._emitWave(this.neurites[ch], amp * 0.9, delay + nr.len / this.p.waveSpeed);
    }
    _waveArrive(c, nr, amp) {
      nr.drive = Math.min(2, nr.drive + 0.9 * amp); nr.S += 0.8 * amp; nr.lastWave = this.t;
      if (nr.state === N_RETRACT && !nr.dying && nr.retractUntil === 0) nr.state = N_GROW;
      if (nr.state === N_GROW && !nr.dying) {
        const ip = this._ip(c, nr), pS = nr.ident === I_DEND ? 0.25 * ip.branch : 0.04 * ip.branch;
        if (nr.nodes.length >= 3 && nr.order < (ip.maxOrder || 4) && this.rand() < pS * this.p.branchRate) this._split(c, nr, ip);
      }
    }
    _split(c, nr, ip) {
      const m = nr.nodes.length - 1, h = [nr.hx, nr.hy, nr.hz], half = (ip.splitAngle || 0.6) / 2 * (0.7 + 0.6 * this.rand());
      // rotation axis: in-plane normal for 2-D, random perpendicular in 3-D
      let ux, uy, uz;
      if (this.dim === 2) { ux = 0; uy = 0; uz = 1; } else { const r = this.randDir(this._w); const d = r[0] * h[0] + r[1] * h[1] + r[2] * h[2]; ux = r[0] - d * h[0]; uy = r[1] - d * h[1]; uz = r[2] - d * h[2]; const L = Math.hypot(ux, uy, uz) || 1; ux /= L; uy /= L; uz /= L; }
      const rot = (a) => { // Rodrigues rotation of h about u by angle a
        const ca = Math.cos(a), sa = Math.sin(a), cx = uy * h[2] - uz * h[1], cy = uz * h[0] - ux * h[2], cz = ux * h[1] - uy * h[0], dd = ux * h[0] + uy * h[1] + uz * h[2];
        return [h[0] * ca + cx * sa + ux * dd * (1 - ca), h[1] * ca + cy * sa + uy * dd * (1 - ca), h[2] * ca + cz * sa + uz * dd * (1 - ca)];
      };
      const side = this.rand() < 0.5 ? -1 : 1, a = rot(side * half), b = rot(-side * half);
      const ch = this._branch(nr, m - 1, a);
      if (ch) { nr.hx = b[0]; nr.hy = b[1]; nr.hz = b[2]; nr.lastSplitLen = nr.len; }
    }
    _branch(parent, k, dir) {
      const N = this.N, c = this.cells[parent.cell]; const base = parent.nodes[k];
      if (parent.children.length >= 3 || c.neur.length >= (c.T.maxNeurites || 4 + c.maxNeurites * (c.T.dendrite.maxOrder > 6 ? 40 : 6))) return null;
      for (const chId of parent.children) if (this.neurites[chId].base === base) return null;
      const tip = N.alloc(N.x[base] + dir[0] * 2, N.y[base] + dir[1] * 2, N.z[base] + dir[2] * 2, K_TIP, c.id, -1);
      const ch = this._newNeurite(c, parent.id, base, tip, dir, parent.ident);
      N.rl[tip] = 2; ch.drive = 0.8; ch.T = Math.min(parent.T * 0.4, 2.5); parent.T -= ch.T; parent.children.push(ch.id);
      this.events.push({ type: 'branch', t: this.t, cell: c.id });
      return ch;
    }
    _isBranchBase(nr, i) { for (const chId of nr.children) if (this.neurites[chId].base === i) return true; return false; }

    _neuritesBio(dt) {
      const p = this.p, N = this.N, sp = this.space, decayD = Math.exp(-dt / 22), v3 = this._v, g = this._g;
      const sense = this.steps % 5 === 2;
      for (const c of this.cells) if (c.alive) { c.totalLen = 0; c.nTips = 0; }
      for (const nr of this.neurites) if (nr && nr.alive && !nr.children.length && nr.state !== N_RETRACT) this.cells[nr.cell].nTips++;
      for (let q = 0; q < this.neurites.length; q++) {
        const nr = this.neurites[q]; if (!nr || !nr.alive) continue;
        const c = this.cells[nr.cell], T = c.T, ip = this._ip(c, nr);
        if (!N.alive[nr.base] || N.gen[nr.base] !== nr.baseGen) { this._removeNeurite(nr); continue; }
        // arc length
        const nodes = nr.nodes, m = nodes.length - 1; let a = nr.base, s = 0;
        for (let k = 0; k <= m; k++) { const i = nodes[k]; s += Math.hypot(N.x[i] - N.x[a], N.y[i] - N.y[a], N.z[i] - N.z[a]); a = i; }
        nr.len = s; c.totalLen += s;
        if (nr.parent >= 0) { const par = this.neurites[nr.parent]; let sb = 0, b0 = par.base; for (const i of par.nodes) { sb += Math.hypot(N.x[i] - N.x[b0], N.y[i] - N.y[b0], N.z[i] - N.z[b0]); b0 = i; if (i === nr.base) break; } nr.path = s + (par.path - par.len) + sb; } else nr.path = s;
        // waves reaching the tip
        for (let w = nr.waves.length - 1; w >= 0; w--) if (this.t >= nr.waves[w].at) { const amp = nr.waves[w].amp; nr.waves.splice(w, 1); this._waveArrive(c, nr, amp); }
        const tip = nodes[m], tx = N.x[tip], ty = N.y[tip], tz = N.z[tip];
        if ((T.sproutDelay && c.age < c.sproutAt) || (this.tipStop && this.tipStop(tx, ty, tz))) { nr.vNow = 0; nr.state = N_PAUSE; this._maintain(nr, c); continue; }   // not started yet, or reached its target
        nr.drive *= decayD;
        nr.S -= nr.S * (p.promoterBack * T.promoterBack / (nr.path + 10) + 1 / 300) * dt;
        // tubulin: soma -> tip (diffusion + promoter-driven transport; steady delivery into dendrites)
        const c0 = Math.min(1, c.Q / T.somaCap), ck0 = Math.min(1.5, nr.T / TIPCAP), pol = p.polarity * T.feedback;
        const A = p.tubActive * (nr.ident === I_DEND ? T.dendTransport + 0.3 * pol * nr.S : (0.15 + pol * nr.S) * (nr.ident === I_AXON ? 1.2 : 1));
        let J = p.tubDiff / (nr.path + 20) * (c0 - ck0) + A * c0 * Math.max(0, 1 - ck0);
        if (J > 0) J = Math.min(J, c.Q * 0.25 / dt / Math.max(1, c.neur.length)); else J = Math.max(J, -nr.T * 0.5 / dt);
        nr.T += J * dt; c.Q -= J * dt;
        // long axons are fed at the tip by slow axonal transport, shared among the cell's growing tips
        if (T.tipSupply) nr.T = Math.min(1.5 * TIPCAP, nr.T + T.tipSupply / Math.max(1, c.nTips) * dt);
        // environment at the growth cone
        const stiff = sp.stiffness(tx, ty, tz), adh = sp.adhesion(tx, ty, tz) * p.stickiness, conf = sp.density(tx, ty, tz);
        Clutch.lookup(stiff, adh * T.clutch, this._cl || (this._cl = [0, 0]));
        nr.F = this._cl[0]; nr.adv = Math.min(1, Math.max(0.05, (140 - this._cl[1]) / 140));
        const grip = 0.15 + 0.85 * (1 - Math.exp(-1.5 * adh * T.gripK * p.gripScale * (0.2 + 0.8 * nr.F / Clutch.FMAX)));
        let perm = 1, fx = 0, fy = 0, fz = 0;
        if (T.permissive || T.follow) {
          const P = T.permissive, Fo = T.follow, r = Math.max(P && P.cells ? P.cells.r : 0, Fo ? Fo.r : 0);
          let n = 0, ox = 0, oy = 0, oz = 0, cx = 0, cy = 0, cz = 0; const want = (P && P.cells ? P.cells.type : Fo.type);
          if (r > 0) this.near(tx, ty, tz, r, (o, dx, dy, dz) => { if (o.T.key !== want || this.t < o.activeAt) return; n++; const sg = (o.ox * nr.hx + o.oy * nr.hy + o.oz * nr.hz) >= 0 ? 1 : -1; ox += sg * o.ox; oy += sg * o.oy; oz += sg * o.oz; cx += dx; cy += dy; cz += dz; });
          if (P) { perm = (P.cells ? n / P.cells.n : 0); if (P.field) { const F = sp.field(P.field.name); if (F) { const v = F.at(tx, ty, tz); perm += P.field.k ? P.field.w * v / (v + P.field.k) : P.field.w * v; } } perm = Math.max(P.floor || 0, Math.min(1, perm)); }
          if (Fo && n) { const w = Fo.w / n; fx += w * ox + 0.5 * w * cx / Fo.r; fy += w * oy + 0.5 * w * cy / Fo.r; fz += w * oz + 0.5 * w * cz / Fo.r; }
        }
        nr.perm = perm;
        let inhib = 1; if (T.inhibit) for (const f in T.inhibit) { const F = sp.field(f); if (F) inhib /= 1 + T.inhibit[f] * F.at(tx, ty, tz); }
        const gel = conf > 0 ? 1 / (1 + conf * stiff / T.gelK) : 1;
        if (sense && T.cues) {   // gradient sensing with Weber-law noise and adaptation
          let bx = 0, by = 0, bz = 0;
          for (const f in T.cues) {
            const F = sp.field(f); if (!F) continue; const cc = F.at(tx, ty, tz) / (F.max || 1); F.grad(tx, ty, tz, g); g[0] /= F.max || 1; g[1] /= F.max || 1; g[2] /= F.max || 1;
            nr.fad += (cc - nr.fad) * Math.min(1, dt * 5 / 30);
            const gm = Math.hypot(g[0], g[1], g[2]); if (gm <= 0) continue;
            const snr = gm * 10 / (cc + 0.02) / p.senseThreshold, wgt = p.fieldGain * T.cues[f] * Math.tanh(snr) * (0.5 / (0.5 + nr.fad));
            const h = [g[0] / gm, g[1] / gm, g[2] / gm]; this.jitterDir(h, p.senseNoise / (1 + snr));
            bx += wgt * h[0]; by += wgt * h[1]; bz += wgt * h[2];
          }
          nr.fx = bx; nr.fy = by; nr.fz = bz;
        }
        if (nr.dying) { this._retract(nr, p.retractSpeed * 6 * dt); }
        else if (nr.state === N_GROW || nr.state === N_PAUSE) {
          // steering: persistence + cues + contact guidance (fibres, followed cells)
          let dx = nr.hx * 2 + nr.fx + fx, dy = nr.hy * 2 + nr.fy + fy, dz = nr.hz * 2 + nr.fz + fz;
          const fr = sp.fiber(tx, ty, tz, v3);   // contact guidance by oriented matrix; a numeric return is the local weight
          if (fr) { const sg = (v3[0] * nr.hx + v3[1] * nr.hy + v3[2] * nr.hz) >= 0 ? 1 : -1, fw = typeof fr === 'number' ? fr : (sp.material.fiberGuide || 1.5); dx += sg * v3[0] * fw; dy += sg * v3[1] * fw; dz += sg * v3[2] * fw; }
          const h = [dx, dy, this.dim === 2 ? 0 : dz]; norm3(h);
          const k = Math.min(1, 0.4 * dt);
          h[0] = nr.hx + (h[0] - nr.hx) * k; h[1] = nr.hy + (h[1] - nr.hy) * k; h[2] = nr.hz + (h[2] - nr.hz) * k; norm3(h);
          this.jitterDir(h, ip.turn * p.turnNoise * Math.sqrt(dt));
          nr.hx = h[0]; nr.hy = h[1]; nr.hz = h[2];
          // speed: cone speed x clutch advance x promoter x grip x supply x environment
          const ck = nr.T / TIPCAP, steady = nr.ident === I_DEND || T.waves === false;
          const promote = steady ? 0.45 + 0.25 * Math.min(1, nr.drive) + 0.3 * nr.S / (nr.S + 0.6) : 0.3 * Math.min(1, nr.drive) + 0.7 * nr.S / (nr.S + 0.6);
          let lenF = 1; if (nr.ident === I_MINOR) lenF = Math.max(0, 1 - nr.len / ip.maxLen); else if (nr.len > ip.maxLen) lenF = 0;
          const advF = T.tractionSpeed === 1 ? nr.adv : Math.pow(nr.adv, T.tractionSpeed);
          let v = ip.speed * p.growthSpeed * advF * promote * grip * lenF * perm * inhib * gel * (ck / (ck + 0.15));
          if (nr.ident === I_MINOR && c.stage >= 3) v *= T.minorRestrain;
          nr.vNow = v; nr.state = perm < 0.02 ? N_PAUSE : N_GROW;
          if (v > 0) {
            const d = v * dt; N.x[tip] += nr.hx * d; N.y[tip] += nr.hy * d; N.z[tip] += nr.hz * d;
            if (sp.contain(N.x, N.y, N.z, tip, this._n)) { const nn = this._n, dd = nr.hx * nn[0] + nr.hy * nn[1] + nr.hz * nn[2]; if (dd < 0) { nr.hx -= dd * nn[0]; nr.hy -= dd * nn[1]; nr.hz -= dd * nn[2]; const hh = [nr.hx, nr.hy, nr.hz]; norm3(hh); nr.hx = hh[0]; nr.hy = hh[1]; nr.hz = hh[2]; } }
            const kc = T.tractionCoupling, eff = Math.max(0.2, 1 - kc + kc * Math.min(1, nr.adv / 0.85));
            nr.T = Math.max(0, nr.T - d / eff);
          }
          if (nr.state === N_GROW) {
            if (ck < 0.04 && v < 0.02) nr.starveT += dt; else nr.starveT = Math.max(0, nr.starveT - dt);
            const held = nr.ident === I_MINOR && c.stage >= 3 && T.minorRestrain < 1;
            const retDelay = p.retractDelay * (nr.ident === I_AXON || nr.ident === I_DEND ? 4 : 1);
            const waveStarved = nr.ident !== I_DEND && !held && T.waves !== false && !T.sproutDelay && this.t - nr.lastWave > retDelay && nr.drive < 0.2 && nr.S < 0.25;
            if ((waveStarved || nr.starveT > 30) && this.rand() < dt / 25) nr.state = N_RETRACT;
          }
          // branching: collaterals along axons, tip splitting in dendrites
          if (nr.ident === I_AXON && m > 4 && ip.branch > 0 && this.rand() < p.branchRate * ip.branch * 7e-6 * (ip.branchZone ? Math.min(nr.len, ip.branchZone) : nr.len) * dt) {
            const k0 = ip.branchZone ? Math.max(1, m - 1 - Math.ceil(ip.branchZone / p.segLen)) : 1;
            const k = k0 + ((this.rand() * Math.max(1, m - 2 - k0)) | 0), i0 = nodes[k - 1], i1 = nodes[k + 1];
            const t3 = norm3([N.x[i1] - N.x[i0], N.y[i1] - N.y[i0], N.z[i1] - N.z[i0]]), r = this.randDir(this._w), dd = r[0] * t3[0] + r[1] * t3[1] + r[2] * t3[2];
            const dir = norm3([r[0] - dd * t3[0] + 0.5 * t3[0], r[1] - dd * t3[1] + 0.5 * t3[1], (r[2] - dd * t3[2] + 0.5 * t3[2]) * (this.dim === 2 ? 0 : 1)]);
            this._branch(nr, k, dir);
          }
          if (nr.ident === I_DEND && m >= 2 && nr.order < ip.maxOrder && nr.len - nr.lastSplitLen > ip.segMin && this.rand() < p.branchRate * ip.branch * 0.012 * dt) this._split(c, nr, ip);
        } else if (nr.state === N_RETRACT) {
          const d = this._retract(nr, p.retractSpeed * dt); nr.T += d * 0.8;
          if (nr.retractUntil > 0 && this.t > nr.retractUntil) { nr.state = N_GROW; nr.retractUntil = 0; nr.lastWave = this.t; nr.drive = Math.max(nr.drive, 0.4); }
          else if (nr.retractUntil === 0 && nr.T / TIPCAP > 0.3 && nr.S > 0.5) { nr.state = N_GROW; nr.lastWave = this.t; }
        }
        if (nr.alive) this._maintain(nr, c);
      }
    }
    /** move the tip back toward the previous node; returns the distance moved */
    _retract(nr, dist) {
      const N = this.N, nodes = nr.nodes, m = nodes.length - 1, tip = nodes[m], prev = m > 0 ? nodes[m - 1] : nr.base;
      const ux = N.x[prev] - N.x[tip], uy = N.y[prev] - N.y[tip], uz = N.z[prev] - N.z[tip], L = Math.hypot(ux, uy, uz);
      if (L < 1e-6) return 0; const d = Math.min(L, dist);
      N.x[tip] += ux / L * d; N.y[tip] += uy / L * d; N.z[tip] += uz / L * d; return d;
    }
    _maintain(nr, c) {
      const N = this.N, L0 = this.p.segLen, nodes = nr.nodes, m = nodes.length - 1;
      // the soma swallows the proximal node
      if (nr.parent < 0 && m >= 1) {
        const i0 = nodes[0], d = Math.hypot(N.x[i0] - c.x, N.y[i0] - c.y, N.z[i0] - c.z);
        if (d < c.r * 0.8 && !this._isBranchBase(nr, i0)) { N.release(i0); nodes.splice(0, 1); return; }
      }
      let prev = nr.base;
      for (let k = 0; k <= m; k++) {
        const i = nodes[k], d = Math.hypot(N.x[i] - N.x[prev], N.y[i] - N.y[prev], N.z[i] - N.z[prev]);
        if (d > 1.6 * L0) {
          const ni = N.alloc((N.x[i] + N.x[prev]) / 2, (N.y[i] + N.y[prev]) / 2, (N.z[i] + N.z[prev]) / 2, K_SHAFT, nr.cell, nr.id);
          N.ident[ni] = nr.ident; N.rl[ni] = d / 2; N.rl[i] = d / 2; N.anc[ni] = 1; N.ax[ni] = N.x[ni]; N.ay[ni] = N.y[ni]; N.az[ni] = N.z[ni];
          nodes.splice(k, 0, ni); return;
        }
        if (k < m && d < 0.4 * L0 && !this._isBranchBase(nr, i)) { N.rl[nodes[k + 1]] += N.rl[i]; N.release(i); nodes.splice(k, 1); return; }
        if (k === m && d < 0.35 * L0) {
          if (m > 0) {
            const j = nodes[m - 1];
            if (!this._isBranchBase(nr, j)) { N.rl[i] += N.rl[j]; N.release(j); nodes.splice(m - 1, 1); return; }
            if (nr.state === N_RETRACT) { if (nr.dying) { for (const chId of nr.children.slice()) { const ch = this.neurites[chId]; if (ch.base === j) this._removeNeurite(ch); } } else { nr.state = N_GROW; nr.lastWave = this.t; nr.drive = 0.05; nr.retractUntil = 0; } }
          } else if (nr.state === N_RETRACT && nr.children.length === 0) { this._removeNeurite(nr); return; }
        }
        prev = i;
      }
    }

    // ------------------------------------------------------------ mechanics (quasi-static constraints)
    _mechanics(dt) {
      const p = this.p, N = this.N, sp = this.space, X = N.x, Y = N.y, Z = N.z, RL = N.rl, AN = N.anc;
      const relax = Math.min(1, dt / p.viscosity), shrink = Math.min(0.5, p.contractility * dt), kb = p.bend;
      // rest lengths flow toward current lengths (plastic) and shorten actively (tension)
      for (const nr of this.neurites) {
        if (!nr || !nr.alive) continue; let a = nr.base;
        for (const i of nr.nodes) { const d = Math.hypot(X[i] - X[a], Y[i] - Y[a], Z[i] - Z[a]); RL[i] += (d - RL[i]) * relax; RL[i] *= 1 - shrink; a = i; }
      }
      const inv = (i) => N.kind[i] === K_TIP ? 0 : N.kind[i] === K_SOMA ? (this.cells[N.cell[i]].fixed ? 0 : 0.05) : AN[i] ? 0.15 : 1;
      for (let it = 0; it < p.iters; it++) {
        for (const nr of this.neurites) {
          if (!nr || !nr.alive) continue; let a = nr.base;
          for (const b of nr.nodes) {
            const wa = inv(a), wb = inv(b), ws = wa + wb;
            if (ws > 0) {
              const dx = X[b] - X[a], dy = Y[b] - Y[a], dz = Z[b] - Z[a], d = Math.hypot(dx, dy, dz) || 1e-9, diff = (d - RL[b]) / d * 0.8;
              if (diff > 0) { const ca = wa / ws * diff, cb = wb / ws * diff; X[a] += dx * ca; Y[a] += dy * ca; Z[a] += dz * ca; X[b] -= dx * cb; Y[b] -= dy * cb; Z[b] -= dz * cb; }
            }
            a = b;
          }
          // bending: shaft nodes relax toward the midpoint of their neighbours
          const nd = nr.nodes; let i0 = nr.base;
          for (let k = 0; k < nd.length - 1; k++) {
            const i1 = nd[k], i2 = nd[k + 1], w = inv(i1) * kb;
            if (w > 0) { X[i1] += ((X[i0] + X[i2]) * 0.5 - X[i1]) * w; Y[i1] += ((Y[i0] + Y[i2]) * 0.5 - Y[i1]) * w; Z[i1] += ((Z[i0] + Z[i2]) * 0.5 - Z[i1]) * w; }
            i0 = i1;
          }
        }
      }
      // anchors: shaft nodes stick to the substrate or matrix and let go under load
      for (const nr of this.neurites) {
        if (!nr || !nr.alive) continue;
        for (const i of nr.nodes) {
          if (N.kind[i] !== K_SHAFT) continue;
          if (AN[i]) { const dx = X[i] - N.ax[i], dy = Y[i] - N.ay[i], dz = Z[i] - N.az[i], d = Math.hypot(dx, dy, dz); if (d > 2.0 * p.stickiness) AN[i] = 0; else { X[i] -= dx * 0.7; Y[i] -= dy * 0.7; Z[i] -= dz * 0.7; } }
          else if (this.rand() < 0.6 * dt * p.stickiness) { AN[i] = 1; N.ax[i] = X[i]; N.ay[i] = Y[i]; N.az[i] = Z[i]; }
        }
      }
      // soma overlap and containment
      for (const c of this.cells) {
        if (!c.alive || c.fixed) continue; const s = c.node;
        this.near(X[s], Y[s], Z[s], 2 * c.r + 2, (o, dx, dy, dz, d2) => {
          if (o.id < c.id && !o.fixed) return; const rr = 0.85 * (c.r + o.r); if (d2 >= rr * rr) return;
          const d = Math.sqrt(d2) || 0.01, ov = (rr - d) * 0.5, wa = c.fixed ? 0 : (c.T.kind === 'neuron' ? 0.2 : 1), wb = o.fixed ? 0 : (o.T.kind === 'neuron' ? 0.2 : 1), ws = wa + wb; if (ws === 0) return;
          const ux = d2 > 1e-8 ? dx / d : 1, uy = d2 > 1e-8 ? dy / d : 0, uz = d2 > 1e-8 ? dz / d : 0, t = o.node;
          X[s] -= ux * ov * 2 * wa / ws; Y[s] -= uy * ov * 2 * wa / ws; Z[s] -= uz * ov * 2 * wa / ws;
          X[t] += ux * ov * 2 * wb / ws; Y[t] += uy * ov * 2 * wb / ws; Z[t] += uz * ov * 2 * wb / ws;
        }, c.id);
      }
      const n = N.n, nn = this._n;
      for (let i = 0; i < n; i++) if (N.alive[i] && N.kind[i] !== K_TIP) sp.contain(X, Y, Z, i, nn);
      for (const c of this.cells) if (c.alive) { const s = c.node; c.x = X[s]; c.y = Y[s]; c.z = Z[s]; }
    }

    // ------------------------------------------------------------ lesions
    transect(nr, stump = 10, opts = {}) {
      if (typeof nr === 'number') nr = this.neurites[nr];
      if (!nr || !nr.alive) return false;
      const N = this.N, nodes = nr.nodes, c = this.cells[nr.cell];
      let a = nr.base, s = 0, k = 0;
      for (k = 0; k < nodes.length - 1; k++) { const b = nodes[k]; s += Math.hypot(N.x[b] - N.x[a], N.y[b] - N.y[a], N.z[b] - N.z[a]); a = b; if (s >= stump) break; }
      if (k >= nodes.length - 1) return false;
      const tip = nodes[nodes.length - 1], removed = nodes.slice(k, nodes.length - 1);
      for (const chId of nr.children.slice()) this._removeNeurite(this.neurites[chId]);
      const r0 = nodes[k]; N.x[tip] = N.x[r0]; N.y[tip] = N.y[r0]; N.z[tip] = N.z[r0];
      for (const i of removed) N.release(i);
      nr.nodes = nodes.slice(0, k).concat([tip]); nr.waves.length = 0; nr.state = N_GROW; nr.T = 0.3 * TIPCAP; nr.S = 0.3; nr.drive = 0.5; nr.lastWave = this.t; nr.starveT = 0;
      if (opts.resetIdentity !== false && nr.ident === I_AXON && nr.parent < 0) { this._setIdent(nr, c.stage >= 4 ? I_DEND : I_MINOR); if (c.axonId === nr.id) c.axonId = -1; c.leadT = 0; c.leadId = -1; c.switchT = 0; }
      c.lesions++; this.events.push({ type: 'cut', t: this.t, cell: c.id }); return true;
    }

    // ------------------------------------------------------------ measurement
    /** per-cell morphometrics (neurons) */
    cellMetrics(c) {
      let axon = 0, dend = 0, minor = 0, bp = 0, prim = 0, tips = 0, maxOrder = 0;
      const dprim = [], primL = [];
      for (const id of c.neur) {
        const nr = this.neurites[id]; if (!nr.alive) continue;
        if (nr.ident === I_AXON) axon += nr.len; else if (nr.ident === I_DEND) dend += nr.len; else minor += nr.len;
        if (nr.parent < 0) prim++; else bp++; if (!nr.children.length) tips++; if (nr.order > maxOrder) maxOrder = nr.order;
      }
      for (const id of c.neur) {
        const nr = this.neurites[id]; if (!nr.alive || nr.parent >= 0) continue;
        let L = 0; const walk = (x) => { L += x.len; for (const ch of x.children) walk(this.neurites[ch]); }; walk(nr);
        primL.push({ id: nr.id, ident: nr.ident, L: +L.toFixed(1) }); if (nr.ident === I_DEND) dprim.push(L);
      }
      return { axon, dend, minor, bp, prim, tips, maxOrder, Q: c.Q / c.T.somaCap, stage: c.stage, primL };
    }
    stats() {
      const byType = {}; let neurites = 0, len = 0;
      for (const c of this.cells) if (c.alive) byType[c.T.key] = (byType[c.T.key] || 0) + 1;
      for (const nr of this.neurites) if (nr && nr.alive) { neurites++; len += nr.len; }
      let nodes = 0; for (let i = 0; i < this.N.n; i++) if (this.N.alive[i]) nodes++;
      const out = { t: this.t, cells: byType, neurites, totalLen: len, nodes, deaths: this.deaths, divisions: this.divisions };
      for (const k in this.metricsFns) out[k] = this.metricsFns[k](this);
      return out;
    }

    // ------------------------------------------------------------ compact snapshot for a renderer / worker
    snapshot(opts = {}) {
      const N = this.N, live = this.cells.filter((c) => c.alive), keys = CellTypes.typeKeys();
      const CS = 11, cf = new Float32Array(live.length * CS);
      live.forEach((c, k) => { cf.set([c.id, c.x, c.y, c.z, c.r, keys.indexOf(c.T.key), c.ox, c.oy, c.oz, c.stage, c.dying >= 0 ? 1 : 0], k * CS); });
      let nseg = 0; for (const nr of this.neurites) if (nr && nr.alive) nseg += nr.nodes.length;
      const seg = new Float32Array(nseg * 6), sid = new Uint8Array(nseg), tips = [];
      let o = 0, so = 0;
      for (const nr of this.neurites) {
        if (!nr || !nr.alive) continue; let a = nr.base;
        for (const b of nr.nodes) { seg[o++] = N.x[a]; seg[o++] = N.y[a]; seg[o++] = N.z[a]; seg[o++] = N.x[b]; seg[o++] = N.y[b]; seg[o++] = N.z[b]; sid[so++] = nr.ident; a = b; }
        const tp = nr.nodes[nr.nodes.length - 1]; tips.push(N.x[tp], N.y[tp], N.z[tp], nr.state === N_GROW ? Math.min(1, nr.vNow / Math.max(1e-6, this._ip(this.cells[nr.cell], nr).speed * 0.3)) : -1);
      }
      const out = { t: this.t, cells: { CS, n: live.length, f: cf }, seg, sid, tips: new Float32Array(tips) };
      if (opts.fields) out.fields = this.space.fields.filter((f) => opts.fields === true || opts.fields.includes(f.name)).map((f) => ({ name: f.name, c: f.c.slice() }));
      return out;
    }
    describe() {
      return { space: this.space.describe(), types: CellTypes.typeKeys().map((k) => { const T = CellTypes.getType(k); return { key: k, label: T.label, color: T.color, kind: T.kind, elongate: T.elongate || 1 }; }),
        fields: this.space.fields.map((f) => ({ name: f.name, label: f.label, color: f.color, nx: f.nx, ny: f.ny, nz: f.nz, h: f.h, kind: f.kind, max: f.max, mask: f.mask })) };
    }
  }

  return { Engine, CellTypes4: CellTypes, Clutch };
});
