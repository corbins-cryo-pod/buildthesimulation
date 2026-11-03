/*
 * NeuriteEngine v3 — soft-bodied neurons on a patterned coverslip (2.5-D, top-down).
 * Units: µm, minutes. One step = p.dt minutes of structural time. Mechanics are overdamped and
 * advance in simulated time (p.mechRef minutes per unit relaxation), so results no longer depend on dt.
 *
 * v2: tubulin supply + competition · neurite identity and Dotti stages · cell-type genomes ·
 *   motor-clutch growth cones · environment (coatings, stiffness, walls, cue fields, scaffolds) ·
 *   interstitial branching with MT invasion · self-avoidance, tiling, pruning ·
 *   trophic support, apoptosis, glia division, neurogenesis, migration modes ·
 *   spiking activity, synaptic weights and homeostatic structural plasticity ·
 *   morphometrics, SWC export, compact snapshots for a Web Worker.
 * v3 (from the v2 experiment report): revocable axon identity and a lesion API (transect) ·
 *   stage 4 and 5 triggered by growth state instead of fixed timers · death as a hazard that rises
 *   with trophic deficit · diffusible glial support and a feeder-layer option · per-type transport
 *   feedback and dendritic delivery, recalibrated to Dotti et al. 1988 · tip tubulin cost coupled to
 *   clutch slip (stiffness sensitivity) · time-step-consistent mechanics · optional extra axons ·
 *   cue fields that switch on at a set time.
 */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const dep = (file, name) => (isNode ? require(file) : root.NE2)[name];
  const mod = factory(dep('./environment.js', 'Environment'), dep('./celltypes.js', 'CellTypes'), dep('./clutch.js', 'Clutch'),
    dep('./activity.js', 'Activity'), dep('./morphometrics.js', 'Morpho'));
  if (isNode) module.exports = mod;
  else { root.NE2 = root.NE2 || {}; Object.assign(root.NE2, mod); }
})(typeof self !== 'undefined' ? self : this, function (Environment, CellTypes, Clutch, Activity, Morpho) {
  'use strict';

  const TAU = Math.PI * 2;
  const hyp = (x, y) => Math.sqrt(x * x + y * y);
  const NR = 18;
  const K_RING = 1, K_NUC = 2, K_SHAFT = 3, K_TIP = 4;
  const P_GROW = 0, P_SHRINK = 1, P_STUCK = 2, P_BOUND = 3;
  const PK_CONE = 0, PK_LAT = 1, PK_SOMA = 2;
  const N_GROW = 0, N_RETRACT = 1, N_CONN = 2;
  const I_NONE = 0, I_MINOR = 1, I_AXON = 2, I_DEND = 3;
  const IDENT_NAME = ['none', 'minor', 'axon', 'dendrite'];
  const TIPCAP = 6;   // tip tubulin compartment capacity (µm-equivalents)

  const DEFAULTS = {
    dt: 0.05, mechRef: 0.05, mechMaxScale: 1,   // mechanics are calibrated per mechRef minutes; a larger dt sub-steps them (each sub-step <= mechMaxScale x mechRef)
    // body
    softnessScale: 1, reservoirScale: 1, minThickness: 0.6, spreadRate: 0.12, fallSpeed: 12,
    stickiness: 1, cortexNoise: 1,
    // neurite mechanics + growth
    segLen: 3.5, growthSpeed: 1, retractSpeed: 0.3, retractDelay: 35, contractility: 0.04, viscosity: 3,
    stiffness: 1, turnNoise: 1, maxLength: 1e9,
    // actin waves
    waveRate: 1.6, waveSpeed: 2.5, waveWidth: 5,
    // tubulin supply and the growth promoter (shootin/kinesin-like cargo carried by waves)
    supply: 1, tubDiff: 6, tubActive: 0.45, polarity: 0.75, promoterBack: 1.0,
    // MT probes
    probesScale: 1, probeSpeed: 6, probeShrink: 14, catastrophe: 0.5, rescue: 0.4, probeWander: 0.5,
    glassStick: 0.5, cellStick: 8, probePull: 0.03,
    // motor-clutch growth cone
    vPoly: 140,
    // branching
    branchRate: 1, severing: 1, patchRate: 0.0006, maxBranchDepth: 10, selfAvoid: 1, tiling: 1,
    // seeking and guidance cues
    seek: 0.6, senseRange: 260, selfAvoidSoma: 0.3, fieldGain: 1, senseThreshold: 0.02, senseNoise: 0.6, cAMP: 1, fiberGuide: 1.5,
    // migration (0 = use the cell type's own numbers)
    pulsePeriod: 0, pulseStrength: 0,
    // life cycle. Death is a hazard: rate = deficit² / deathDelay per min once age > deathGrace,
    // where deficit = 1 − troph/deathThreshold (deathDelay = mean survival at full deprivation, min)
    serum: 1, deathThreshold: 0.25, deathDelay: 600, deathGrace: 360, apoptosis: true, division: true,
    // glial support: contact (soma on an astrocyte), diffusible from astrocytes within ~gliaRange µm,
    // and a uniform feeder layer (coverslip suspended over glia, as in the Banker method)
    gliaDiffuse: 0.5, gliaRange: 200, feeder: 0,
    // polarity
    maxAxons: 1,
    // synapses + activity
    synapses: true, activity: true, startDIV: 0, matureDIV0: 3, matureDIV1: 8, ephysWindow: 200,
    ephysDrive: 1.0, ephysNoise: 3.0, synGain: 12, stdp: 1, rateTau: 15, targetRate: 2.5, msp: 1, mspDelete: 0.03, wMature: 0.35,
    contactEvery: 1,
  };

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function capHeight(a, V) {
    const Q = 6 * V / Math.PI, P = 3 * a * a;
    const D = Math.sqrt(Q * Q / 4 + P * P * P / 27);
    return Math.cbrt(Q / 2 + D) + Math.cbrt(Q / 2 - D);
  }
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };

  // ------------------------------------------------------------------ node pool
  class Nodes {
    constructor(cap) { this.cap = 0; this.n = 0; this.free = []; this._grow(Math.max(256, cap | 0)); }
    _grow(cap) {
      const mk = (T, k) => { const a = new T(cap); if (this[k]) a.set(this[k]); this[k] = a; };
      for (const k of ['x', 'y', 'fx', 'fy', 'ax', 'ay']) mk(Float64Array, k);
      for (const k of ['w', 'mt', 'act', 'nz', 'mob', 'brk', 'rl', 's', 'patch', 'adhl']) mk(Float32Array, k);
      for (const k of ['anc', 'kind', 'alive', 'touch', 'ident']) mk(Uint8Array, k);
      for (const k of ['cell', 'neu']) mk(Int32Array, k);
      mk(Uint32Array, 'gen');
      this.cap = cap;
    }
    alloc(x, y, kind, cell, neu) {
      let i;
      if (this.free.length) i = this.free.pop();
      else { if (this.n >= this.cap) this._grow(this.cap * 2); i = this.n++; }
      this.x[i] = x; this.y[i] = y; this.fx[i] = 0; this.fy[i] = 0; this.ax[i] = x; this.ay[i] = y; this.anc[i] = 0;
      this.kind[i] = kind; this.cell[i] = cell; this.neu[i] = neu; this.ident[i] = I_NONE;
      this.w[i] = 0.6; this.mt[i] = 0.2; this.act[i] = 0; this.nz[i] = 0; this.brk[i] = 0.05; this.rl[i] = 1; this.s[i] = 0; this.patch[i] = 0; this.adhl[i] = 1;
      this.mob[i] = kind === K_NUC ? 0.35 : 0.85; this.touch[i] = 0; this.alive[i] = 1;
      return i;
    }
    release(i) { this.alive[i] = 0; this.gen[i]++; this.anc[i] = 0; this.free.push(i); }
  }

  // ------------------------------------------------------------------ engine
  class NeuriteEngine {
    constructor(opts = {}) {
      this.p = Object.assign({}, DEFAULTS, opts.params || {});
      this.env = opts.env || new Environment(opts.width || 600, opts.height || 400);
      this.W = this.env.W; this.H = this.env.H;
      this.rand = mulberry32(opts.seed != null ? opts.seed : 1234);
      this._spare = null;
      this.t = 0; this.steps = 0; this.deaths = 0; this.divisions = 0; this.born = 0;
      this.N = new Nodes(opts.capacity || 4096);
      this.cells = []; this.neurites = []; this._freeNeu = []; this.probes = []; this._freeProbe = []; this.bonds = []; this._freeBond = [];
      this.events = [];
      this.hooks = [];   // scripted interventions: { when(e) -> bool, run(e), once }
      this.hs = 6.0;
      this.gw = Math.ceil(this.W / this.hs) + 3; this.gh = Math.ceil(this.H / this.hs) + 3;
      this.hStart = new Int32Array(this.gw * this.gh + 1); this.hCur = new Int32Array(this.gw * this.gh);
      this.hItems = new Int32Array(4096); this.hKey = new Int32Array(4096);
      this._arc = new Float64Array(512); this._o2 = [0, 0]; this._o3 = [0, 0, 0];
      this.activity = new Activity(this);
      this.env.prepare();
      this._hasWalls = !!this.env.escX;
    }
    static get DEFAULTS() { return Object.assign({}, DEFAULTS); }
    static get NR() { return NR; }
    static get KIND() { return { RING: K_RING, NUC: K_NUC, SHAFT: K_SHAFT, TIP: K_TIP }; }
    static get PROBE() { return { GROW: P_GROW, SHRINK: P_SHRINK, STUCK: P_STUCK, BOUND: P_BOUND, CONE: PK_CONE, LATERAL: PK_LAT, SOMA: PK_SOMA }; }
    static get NSTATE() { return { GROW: N_GROW, RETRACT: N_RETRACT, CONN: N_CONN }; }
    static get IDENT() { return { NONE: I_NONE, MINOR: I_MINOR, AXON: I_AXON, DENDRITE: I_DEND, NAMES: IDENT_NAME }; }

    /** Run `run(engine)` whenever `when(engine)` is true (checked every 10 steps); once: true removes it after the first run. */
    addHook(h) { this.hooks.push(Object.assign({ once: true }, h)); return h; }
    _runHooks() {
      for (let k = this.hooks.length - 1; k >= 0; k--) {
        const h = this.hooks[k];
        if (h.when(this)) { h.run(this); if (h.once) this.hooks.splice(k, 1); }
      }
    }
    setParams(o) { Object.assign(this.p, o); for (const c of this.cells) c.aEq = -1; }
    gauss() {
      if (this._spare !== null) { const s = this._spare; this._spare = null; return s; }
      let u = 0; while (u === 0) u = this.rand(); const v = this.rand();
      const r = Math.sqrt(-2 * Math.log(u)); this._spare = r * Math.sin(TAU * v); return r * Math.cos(TAU * v);
    }

    // ------------------------------------------------------------ creation
    /** Add a cell. opts: { type, z (drop height µm), spread (start spread), angle, maxNeurites, radius, hue, migrating } */
    addCell(x, y, opts = {}) {
      const p = this.p, N = this.N, T = CellTypes.getType(opts.type || 'hippocampal');
      const id = this.cells.length;
      const R0 = opts.radius || T.radius * (0.92 + 0.16 * this.rand());
      const lo = T.primaries[0], hi = T.primaries[1];
      const c = {
        id, alive: true, T, R0, V: 4 / 3 * Math.PI * R0 * R0 * R0,
        a: 0, aEq: -1, h: 2 * R0, theta: Math.PI, Rcap: R0, rOut: R0, adh: 0, adhLoc: 1,
        z: opts.z != null ? opts.z : 0, age: 0, born: this.t, landedAt: this.t,
        ring: new Int32Array(NR), nuc: -1, slotUse: new Int8Array(NR),
        neur: [], nPrim: 0, nub: null, probes: [], layoutIdx: 0,
        maxNeurites: opts.maxNeurites != null ? opts.maxNeurites : lo + Math.floor(this.rand() * (hi - lo + 1)),
        maxLen: opts.maxLen != null ? opts.maxLen : p.maxLength,
        polarAngle: opts.polarAngle != null ? opts.polarAngle : null,
        pulse: 0, pulseOff: this.rand() * 1000, conn: 0, cx: 0, cy: 0,
        hue: opts.hue != null ? opts.hue : T.hue + (this.rand() - 0.5) * 0.04,
        box: [x - R0, y - R0, x + R0, y + R0], x, y,
        // v2 state
        stage: T.glia ? 0 : 1, stageT: [-1, this.t, -1, -1, -1, -1], axonId: -1, leadT: 0,
        Q: T.somaCap * 0.5, totalLen: 0, troph: 0.5, lowT: 0, dying: -1, mitosis: -1, cycleT: this.rand() * 0.5 * (T.cycle || 1),
        cycleLen: T.cycle * (0.8 + 0.5 * this.rand()), migrating: opts.migrating != null ? opts.migrating : T.migration !== 'none',
        migrateTime: opts.migrateTime != null ? opts.migrateTime : T.migrateTime,
        rate: 0, spk: 0, ca: 0, msp: 0, area: 0,
        // v3 state
        stage1T: T.stage1Time * (T.stage1Jitter > 0 ? Math.exp(T.stage1Jitter * this.gauss()) : 1),
        dendThr: T.dendriteAxonLen * (0.8 + 0.4 * this.rand()), spineThr: T.spineDendLen * (0.8 + 0.4 * this.rand()),
        leadStart: -1, leadId: -1, switchT: 0, switches: 0, axonDecided: -1, extraT: 0, gliaSup: 0, dendLen: 0, lesions: 0,
      };
      c.nuc = N.alloc(x, y, K_NUC, id, -1);
      const a0 = opts.angle || 0;
      for (let k = 0; k < NR; k++) {
        const ang = a0 + TAU * k / NR;
        const i = N.alloc(x + R0 * Math.cos(ang), y + R0 * Math.sin(ang), K_RING, id, -1);
        N.w[i] = 0; c.ring[k] = i;
      }
      this.cells.push(c);
      if (c.z === 0) { c.aEq = this._aEq(c); c.a = opts.spread ? c.aEq : 0; this._capGeom(c); }
      this.activity.dirty = true; this.born++;
      return c;
    }

    _newNeurite(c, parentId, baseNode, tipNode, hx, hy, depth, ident) {
      const N = this.N;
      let id;
      if (this._freeNeu.length) id = this._freeNeu.pop(); else { id = this.neurites.length; this.neurites.push(null); }
      const par = parentId >= 0 ? this.neurites[parentId] : null;
      const nr = {
        id, cell: c.id, alive: true, parent: parentId, base: baseNode, baseGen: N.gen[baseNode], slot: -1,
        nodes: [tipNode], hx, hy, dir0: Math.atan2(hy, hx), drive: 1.0, gc: 0.6, kin: 0, lastWave: this.t, born: this.t,
        state: N_GROW, waves: [], probes: [], children: [], depth, bond: -1, len: 0, path: 0,
        cx: 0, cy: 0, fx: 0, fy: 0, fad: null, stuck: 0,
        ident: ident != null ? ident : I_MINOR, apical: par ? par.apical : false, order: par ? par.order + 1 : 1,
        T: par ? 1.0 : 2.0, S: par ? par.S * 0.3 : 0.3, starveT: 0, retractUntil: 0, blocked: 0, avx: 0, avy: 0, blockT: 0,
        tSplitDone: false, lastSplitLen: 0, F: 0, V: 0, adv: 0.5, vNow: 0, dying: false,
      };
      this.neurites[id] = nr;
      N.neu[tipNode] = id; N.kind[tipNode] = K_TIP; N.w[tipNode] = 0.9; N.mt[tipNode] = 0.6; N.ident[tipNode] = nr.ident;
      c.neur.push(id);
      return nr;
    }

    _newProbe(base, cell, owner, kind, ang, maxLen) {
      let id;
      if (this._freeProbe.length) id = this._freeProbe.pop(); else { id = this.probes.length; this.probes.push(null); }
      const pr = { id, alive: true, base, baseGen: this.N.gen[base], cell, owner, kind, ang, len: 0.3, maxLen, st: P_GROW, tx: 0, ty: 0, Lref: 0, tgt: -1, tgtGen: 0, tgtCell: -1, age: 0, ph: this.rand() * TAU };
      this.probes[id] = pr;
      if (owner >= 0) this.neurites[owner].probes.push(id); else this.cells[cell].probes.push(id);
      return pr;
    }
    _killProbe(pr, keepList) {
      if (!pr.alive) return;
      pr.alive = false; this._freeProbe.push(pr.id);
      if (keepList) return;
      const l = pr.owner >= 0 ? this.neurites[pr.owner].probes : this.cells[pr.cell].probes;
      const k = l.indexOf(pr.id); if (k >= 0) { l[k] = l[l.length - 1]; l.pop(); }
    }
    _removeNeurite(nr) {
      if (!nr.alive) return;
      for (const ch of nr.children.slice()) this._removeNeurite(this.neurites[ch]);
      for (const pid of nr.probes) { const pr = this.probes[pid]; if (pr && pr.alive && pr.owner === nr.id) this._killProbe(pr, true); }
      if (nr.bond >= 0) this._breakBond(this.bonds[nr.bond]);
      for (const i of nr.nodes) this.N.release(i);
      const c = this.cells[nr.cell];
      c.neur.splice(c.neur.indexOf(nr.id), 1);
      if (nr.parent >= 0) { const par = this.neurites[nr.parent]; par.children.splice(par.children.indexOf(nr.id), 1); }
      else { if (nr.slot >= 0) c.slotUse[nr.slot]--; c.nPrim--; }
      if (c.axonId === nr.id) c.axonId = -1;
      nr.alive = false; nr.nodes = []; nr.probes = []; nr.waves = [];
      this._freeNeu.push(nr.id);
    }
    removeCell(c) {
      if (!c.alive) return;
      for (const id of c.neur.slice()) { const nr = this.neurites[id]; if (nr && nr.alive && nr.parent < 0) this._removeNeurite(nr); }
      for (const pid of c.probes) { const pr = this.probes[pid]; if (pr && pr.alive) this._killProbe(pr, true); }
      for (const b of this.bonds) if (b && b.alive && (b.ca === c.id || b.cb === c.id)) this._breakBond(b);
      for (const k of c.ring) this.N.release(k);
      this.N.release(c.nuc);
      c.alive = false; this.activity.dirty = true;
    }

    // ------------------------------------------------------------ spreading geometry
    _localAdh(x, y) {
      const env = this.env, a = env.astroAt(x, y);
      return Math.min(2.5, Math.max(0.07, (env.coatOn(x, y) * (1 - a) + 1.6 * a) / 0.7));
    }
    _aEq(c) {
      const p = this.p, V = c.V, T = c.T;
      const soft = Math.min(1, Math.max(0, T.softness * p.softnessScale * Math.min(1.2, Math.max(0.15, c.adhLoc))));
      const wg = 0.15 + 1.85 * soft;
      const cosT = Math.min(1, Math.max(-1, wg - 1)), th = Math.acos(cosT);
      const aMax = Math.sqrt(2 * V / (Math.PI * p.minThickness));
      let a;
      if (th < 1e-3) a = aMax;
      else { const t = Math.tan(th / 2); a = Math.min(aMax, Math.cbrt(6 * V / (Math.PI * t * (3 + t * t)))); }
      const res = T.reservoir * p.reservoirScale;
      if (isFinite(res)) {
        const Smax = res * 4 * Math.PI * c.R0 * c.R0;
        const S = (aa) => { const h = capHeight(aa, V); return Math.PI * (2 * aa * aa + h * h); };
        if (S(a) > Smax) { let lo = 0, hi = a; for (let k = 0; k < 32; k++) { const m = (lo + hi) / 2; if (S(m) > Smax) hi = m; else lo = m; } a = lo; }
      }
      return a;
    }
    _capGeom(c) {
      const a = c.a, h = capHeight(a, c.V);
      c.h = h;
      if (a < 1e-6) { c.theta = Math.PI; c.Rcap = c.R0; c.rOut = c.R0; c.adh = 0; return; }
      c.theta = 2 * Math.atan(h / a); c.Rcap = (a * a + h * h) / (2 * h);
      c.rOut = c.theta > Math.PI / 2 ? c.Rcap : a; c.adh = a / c.rOut;
    }

    // ------------------------------------------------------------ main step
    step(n = 1) { for (let k = 0; k < n; k++) this._step(); }
    _step() {
      const p = this.p, dt = p.dt;
      this.t += dt; this.steps++;
      if (this.env.spawners.length) this._spawn(dt);
      this._cellsBio(dt);
      this._neuritesBio(dt);
      this._probesBio(dt);
      this._bondsBio(dt);
      this.activity.step(dt);
      // mechanics advance in simulated time: a step longer than mechRef is split into sub-steps of at most
      // mechMaxScale x mechRef (v2 relaxed once per step whatever dt was, so a larger dt meant less tension per
      // simulated minute and longer neurites; one enlarged explicit step instead biases lengths the other way)
      const N = this.N, s = dt / p.mechRef, nSub = Math.max(1, Math.ceil(s / p.mechMaxScale - 1e-9)), sc = s / nSub;
      this._mechScale = sc; this._nSub = nSub;
      for (let k = 0; k < nSub; k++) {
        const n = N.n;
        N.fx.fill(0, 0, n); N.fy.fill(0, 0, n);
        this._somaForces(dt / nSub);
        this._neuriteForces();
        this._probeForces();
        this._bondForces();
        if (nSub > 1 || this.steps % p.contactEvery === 0) { this._buildHash(); this._contacts(nSub > 1 ? 1 : p.contactEvery); }
        this._cellRepulsion();
        this._integrate(dt / nSub, sc);
      }
      if (this.steps % 10 === 1) this._chemo();
      if (this.hooks.length && this.steps % 10 === 5) this._runHooks();
      if (this.steps % 5 === 2 && this.env.fields.length) this._fieldSense();
      if (this.steps % 40 === 3) this._astroRaster();
    }

    _spawn(dt) {
      for (const s of this.env.spawners) {
        s.acc += (s.rate / 60) * dt;
        while (s.acc >= 1) {
          s.acc -= 1;
          let x = s.x + (this.rand() - 0.5) * (s.w || 0);
          if (s.snapFibers && this.env.fibers.length) { const f = this.env.fibers[(this.rand() * this.env.fibers.length) | 0]; x = f.pts[0][0] + (this.rand() - 0.5) * 3; }
          const c = this.addCell(x, s.y + (this.rand() - 0.5) * (s.h || 0), { type: s.type, z: 4, angle: this.rand() * TAU });
          c.hue = s.hueByBirth ? (0.75 - 0.75 * Math.min(1, this.t / s.hueSpan)) : c.hue;
          this.events.push({ type: 'born', x: c.x, y: c.y, t: this.t, cell: c.id });
        }
      }
    }

    // ------------------------------------------------------------ cells: spreading, stage, supply, survival, division, migration
    _cellsBio(dt) {
      const p = this.p, N = this.N, env = this.env;
      for (const c of this.cells) {
        if (!c.alive) continue;
        const T = c.T;
        c.age += dt;
        if (c.z > 0) { c.z = Math.max(0, c.z - p.fallSpeed * dt); if (c.z === 0) { c.landedAt = this.t; c.stageT[1] = this.t; } }
        c.x = N.x[c.nuc]; c.y = N.y[c.nuc];
        if (this.steps % 20 === 0 || c.aEq < 0) { c.adhLoc = this._localAdh(c.x, c.y); c.aEq = this._aEq(c); }
        let aT = c.aEq;
        if (c.dying >= 0) aT *= Math.max(0.12, 1 - c.dying / 40);
        if (c.mitosis >= 0) aT *= Math.max(0.25, 1 - c.mitosis / 25);
        if (c.z === 0) { if (c.a < 0.5) c.a = 0.5; c.a += (aT - c.a) * (1 - Math.exp(-p.spreadRate * dt)); } else c.a = 0;
        this._capGeom(c);
        if (c.z > 0) continue;

        // ---- dying: round up, retract everything, then go
        if (c.dying >= 0) {
          c.dying += dt;
          if (c.dying > 90) { this.removeCell(c); this.deaths++; this.events.push({ type: 'death', x: c.x, y: c.y, t: this.t, cell: c.id }); }
          continue;
        }
        // ---- glia: cell cycle with contact inhibition
        if (T.cycle > 0 && p.division) {
          if (c.mitosis >= 0) { c.mitosis += dt; if (c.mitosis > 60) this._divide(c); }
          else {
            c.cycleT += dt;
            if (c.cycleT > c.cycleLen && c.age > 120) {
              if (this._localDensity(c, 2.4 * c.rOut) < 3) { c.mitosis = 0; for (const pid of c.probes) { const pr = this.probes[pid]; if (pr.alive) pr.st = P_SHRINK; } }
              else c.cycleT = c.cycleLen * 0.7;   // contact-inhibited: check again later
            }
          }
        }
        // ---- survival: trophic support from serum, glia, synaptic targets, trophic fields
        if (!T.glia) {
          let out = 0; for (const id of c.neur) { const nr = this.neurites[id]; if (nr.state === N_CONN) out++; }
          let supply = p.serum * 0.35 + 1.0 * env.astroAt(c.x, c.y) + Math.min(0.6, 0.12 * out) + c.gliaSup + p.feeder;
          const tf = env.field('trophic'); if (tf) { tf.sample(c.x, c.y, this._o3); supply += 0.8 * this._o3[0] / Math.max(1e-6, tf.peak || 1); }
          c.troph += (supply - c.troph) * dt / 360;
          // apoptosis as a hazard: the deeper the deficit, the sooner a cell commits, so deaths spread out
          const def = Math.max(0, 1 - c.troph / p.deathThreshold);
          if (def > 0) c.lowT += dt; else c.lowT = Math.max(0, c.lowT - dt);
          if (p.apoptosis && c.age > p.deathGrace && def > 0 && this.rand() < def * def * dt / Math.max(1, p.deathDelay)) { this._beginDeath(c); continue; }
        }
        // ---- migration pulses (nucleokinesis) while migrating
        const period = p.pulsePeriod > 0 ? p.pulsePeriod : T.pulsePeriod;
        if (c.migrating && period > 0) {
          const ph = ((this.t + c.pulseOff) % period) / period;
          c.pulse = ph < 0.3 ? Math.sin(Math.PI * ph / 0.3) : 0;
        } else c.pulse = 0;
        if (c.migrating) {
          const done = (c.migrateTime > 0 && c.age > c.migrateTime) || env.inZone('stop', c.x, c.y);
          if (done) this._settle(c);
        }
        // ---- tubulin: production in the soma (saturating), turnover of the existing arbor
        if (!T.glia) {
          c.Q += T.production * p.supply * (1 - c.Q / T.somaCap) * dt;
          c.Q -= T.upkeep * c.totalLen * dt;
          if (c.Q < 0) c.Q = 0;
          this._stageUpdate(c);
        }
        const settled = this.t - c.landedAt > 3;
        const maxPrim = c.migrating ? Math.min(1, c.maxNeurites) : c.maxNeurites;
        // ---- neurite initiation (nub -> probes -> sprout)
        if (c.mitosis < 0) {
          if (c.nub) { c.nub.t += dt; if (c.nub.t >= c.nub.dur) this._sprout(c); }
          else if (settled && c.nPrim < maxPrim && this.t - c.landedAt > c.stage1T && this.rand() < T.initRate / 60 * dt * (c.nPrim === 0 ? 3 : 1)) this._startNub(c);
        }
        // ---- actin waves into primary neurites
        let nprim = 0;
        for (const id of c.neur) { const nr = this.neurites[id]; if (nr.parent < 0 && !nr.dying) nprim++; }
        if (nprim > 0 && this.rand() < p.waveRate / 60 * dt * nprim) {
          let k = (this.rand() * nprim) | 0;
          for (const id of c.neur) { const nr = this.neurites[id]; if (nr.parent >= 0 || nr.dying) continue; if (k-- === 0) { nr.waves.push({ s: 0, amp: 0.8 + 0.4 * this.rand() }); break; } }
        }
        // ---- soma probes (ruffles / radial star), concentrated on a forming nub
        const target = Math.round((T.probes.soma + (c.nub ? 4 : 0)) * p.probesScale);
        if (c.mitosis < 0 && c.probes.length < target && this.rand() < dt * 3) {
          const slot = (c.nub && this.rand() < 0.75) ? c.nub.slot : (this.rand() * NR) | 0;
          const b = c.ring[slot];
          const ang = Math.atan2(N.y[b] - N.y[c.nuc], N.x[b] - N.x[c.nuc]) + this.gauss() * 0.45;
          this._newProbe(b, c.id, -1, PK_SOMA, ang, T.probes.maxLen * (c.nub ? 0.9 : 0.55) * (0.6 + 0.8 * this.rand()));
        }
      }
    }

    _stageUpdate(c) {
      const T = c.T, t = this.t, dt = this.p.dt;
      const enter = (s, at) => { c.stage = s; if (c.stageT[s] < 0) c.stageT[s] = at != null ? at : t; this.events.push({ type: 'stage', stage: s, x: c.x, y: c.y, t, cell: c.id }); };
      let ax = c.axonId >= 0 ? this.neurites[c.axonId] : null;
      if (ax && !(ax.alive && ax.ident === I_AXON)) { ax = null; c.axonId = -1; }
      if (c.stage < 2 && c.nPrim > 0) enter(2);
      if (T.axonRule === 'competition' && !c.migrating && c.stage >= 2) {
        // candidates: primary minor neurites; once dendrites exist and the axon is lost, dendrites too
        let L1 = 0, L2 = 0, best = null;
        for (const id of c.neur) {
          const nr = this.neurites[id];
          if (nr.parent >= 0 || nr.dying || nr.ident === I_AXON) continue;
          if (nr.ident !== I_MINOR && !(nr.ident === I_DEND && !ax && !nr.apical)) continue;
          const L = nr.len;
          if (L > L1) { L2 = L1; L1 = L; best = nr; } else if (L > L2) L2 = L;
        }
        if (!ax) {
          // specification: the longest candidate must lead the runner-up (or near the minor ceiling) and keep leading
          const ok = best && L1 >= T.axonMinLen && (L1 - L2 >= T.axonLead || L1 >= 0.88 * T.minor.maxLen);
          if (ok && (c.leadId !== best.id || c.leadT === 0)) { c.leadId = best.id; c.leadStart = t; c.leadT = 0; }
          if (ok) c.leadT += dt; else { c.leadT = 0; c.leadId = -1; }
          if (ok && c.leadT >= T.axonHold) {
            this._setIdent(best, I_AXON); c.axonId = best.id; ax = best; c.leadT = 0; c.axonDecided = t;
            this.events.push({ type: 'axon', x: c.x, y: c.y, t, cell: c.id });
            // stage 3 is scored from the start of the winning lead, the way time-lapse studies date axon initiation
            if (c.stage < 3) enter(3, c.leadStart >= 0 ? c.leadStart : t);
          }
        } else {
          // identity stays revocable: a sibling that out-grows the axon by axonLead for axonHold takes over,
          // and the old axon becomes a minor neurite (stage 3) or a dendrite (stage 4+)
          if (best && L1 >= T.axonMinLen && L1 - ax.len >= T.axonLead) c.switchT += dt; else c.switchT = 0;
          if (c.switchT >= T.axonHold) {
            this._setIdent(ax, c.stage >= 4 ? I_DEND : I_MINOR);
            this._setIdent(best, I_AXON); c.axonId = best.id; ax = best; c.switchT = 0; c.switches++;
            this.events.push({ type: 'axonSwitch', x: c.x, y: c.y, t, cell: c.id });
          }
          // optional extra axons (multi-axon phenotypes): a minor that reaches the minor ceiling and holds there
          if (this.p.maxAxons > 1 && best && best.ident === I_MINOR) {
            let nAx = 0; for (const id of c.neur) { const nr = this.neurites[id]; if (nr.parent < 0 && nr.ident === I_AXON) nAx++; }
            if (nAx < this.p.maxAxons && L1 >= 0.88 * T.minor.maxLen) c.extraT += dt; else c.extraT = 0;
            if (c.extraT >= T.axonHold) { this._setIdent(best, I_AXON); c.extraT = 0; this.events.push({ type: 'axon', x: c.x, y: c.y, t, cell: c.id }); }
          }
        }
      }
      const ax2 = c.axonId >= 0 ? this.neurites[c.axonId] : null;
      const hasAxon2 = !!(ax2 && ax2.alive && ax2.ident === I_AXON);
      if (c.stage < 3 && hasAxon2) enter(3);
      if (c.stage === 3 && !hasAxon2 && T.axonRule === 'competition') { c.stage = 2; }   // axon lost before dendrites: re-polarize
      // stage 4 needs both time since the axon and an axon of a given length (per-cell threshold)
      if (c.stage === 3 && hasAxon2 && t - c.stageT[3] >= T.dendriteDelay && ax2.len >= c.dendThr) {
        for (const id of c.neur) { const nr = this.neurites[id]; if (nr.parent < 0 && nr.ident === I_MINOR) this._setIdent(nr, I_DEND); }
        enter(4);
      }
      if (c.stage === 4) {
        let dl = 0; if (c.spineThr > 0) for (const id of c.neur) { const nr = this.neurites[id]; if (nr.ident === I_DEND) dl += nr.len; }
        c.dendLen = dl;
        if (t - c.stageT[4] >= T.spineDelay && dl >= c.spineThr) enter(5);
      }
    }

    /**
     * Cut a neurite `stump` µm from its base (a transection). Everything distal, including side branches,
     * is removed and the growth cone re-forms at the cut. With resetIdentity (default) a cut axon loses its
     * label, so the competition rule picks the next axon, as after a real transection.
     * Returns true if the cut was made.
     */
    transect(nr, stump = 10, opts = {}) {
      if (typeof nr === 'number') nr = this.neurites[nr];
      if (!nr || !nr.alive) return false;
      const N = this.N, nodes = nr.nodes, c = this.cells[nr.cell];
      let a = nr.base, s = 0, k = 0;
      for (k = 0; k < nodes.length - 1; k++) { const b = nodes[k]; s += hyp(N.x[b] - N.x[a], N.y[b] - N.y[a]); a = b; if (s >= stump) break; }
      if (k >= nodes.length - 1) return false;
      const tip = nodes[nodes.length - 1], removed = nodes.slice(k, nodes.length - 1);
      for (const chId of nr.children.slice()) this._removeNeurite(this.neurites[chId]);
      for (const pid of nr.probes.slice()) { const pr = this.probes[pid]; if (pr && pr.alive) this._killProbe(pr); }
      const r0 = nodes[k];
      N.x[tip] = N.x[r0]; N.y[tip] = N.y[r0]; N.ax[tip] = N.x[tip]; N.ay[tip] = N.y[tip]; N.anc[tip] = 0; N.rl[tip] = N.rl[r0];
      for (const i of removed) N.release(i);
      nr.nodes = nodes.slice(0, k).concat([tip]);
      nr.waves.length = 0; nr.state = N_GROW; nr.T = 0.3 * TIPCAP; nr.S = 0.3; nr.drive = 0.5; nr.lastWave = this.t; nr.starveT = 0; nr.retractUntil = 0;
      if (nr.bond >= 0) this._breakBond(this.bonds[nr.bond]);
      if (opts.resetIdentity !== false && nr.ident === I_AXON && nr.parent < 0) {
        this._setIdent(nr, c.stage >= 4 ? I_DEND : I_MINOR);
        if (c.axonId === nr.id) c.axonId = -1;
        c.leadT = 0; c.leadId = -1; c.switchT = 0;
      }
      c.lesions++;
      this.events.push({ type: 'cut', x: N.x[tip], y: N.y[tip], t: this.t, cell: c.id });
      return true;
    }
    /** Cut whichever neurite passes within r µm of (x, y), at that point. Returns the neurite or null. */
    cutAt(x, y, r = 4, opts) {
      const N = this.N; let best = null, bd = r * r, bs = 0;
      for (const nr of this.neurites) {
        if (!nr || !nr.alive) continue;
        let a = nr.base, s = 0;
        for (const i of nr.nodes) { s += hyp(N.x[i] - N.x[a], N.y[i] - N.y[a]); a = i; const d2 = (N.x[i] - x) ** 2 + (N.y[i] - y) ** 2; if (d2 < bd) { bd = d2; best = nr; bs = s; } }
      }
      if (!best) return null;
      if (best.parent >= 0 && bs < 3) { this._removeNeurite(best); return best; }
      return this.transect(best, Math.max(2, bs), opts) ? best : null;
    }
    _setIdent(nr, ident) {
      nr.ident = ident;
      const N = this.N; for (const i of nr.nodes) N.ident[i] = ident;
      for (const ch of nr.children) this._setIdent(this.neurites[ch], ident);
    }
    _settle(c) {
      c.migrating = false; c.pulse = 0;
      this.events.push({ type: 'settle', x: c.x, y: c.y, t: this.t, cell: c.id });
      // the leading process of a scaffold migrant becomes its apical dendrite
      if (c.T.migration === 'scaffold') {
        for (const id of c.neur) { const nr = this.neurites[id]; if (nr.parent < 0) { this._setIdent(nr, I_DEND); nr.apical = true; } }
        c.plate = true;   // now part of the cortical plate: held by neighbours, not by glass, so later arrivals can push it deeper
      }
    }
    _beginDeath(c) {
      c.dying = 0; this.events.push({ type: 'dying', x: c.x, y: c.y, t: this.t, cell: c.id });
      for (const b of this.bonds) if (b && b.alive && (b.ca === c.id || b.cb === c.id)) this._breakBond(b);
      for (const id of c.neur) { const nr = this.neurites[id]; nr.dying = true; nr.state = N_RETRACT; nr.waves.length = 0; }
      for (const pid of c.probes) { const pr = this.probes[pid]; if (pr.alive) pr.st = P_SHRINK; }
      c.nub = null;
    }
    _localDensity(c, r) {
      let n = 0; for (const o of this.cells) { if (!o.alive || o === c || o.T.key !== c.T.key) continue; if ((o.x - c.x) ** 2 + (o.y - c.y) ** 2 < r * r) n++; }
      return n;
    }
    _divide(c) {
      const N = this.N, ang = this.rand() * TAU, off = c.R0 * 0.9, ux = Math.cos(ang), uy = Math.sin(ang);
      const nx = N.x[c.nuc], ny = N.y[c.nuc];
      for (const i of [c.nuc, ...c.ring]) { N.x[i] -= ux * off; N.y[i] -= uy * off; N.anc[i] = 0; }
      const d = this.addCell(nx + ux * off, ny + uy * off, { type: c.T.key, radius: c.R0, spread: false });
      d.a = c.a; d.hue = c.hue;
      c.mitosis = -1; c.cycleT = 0; c.cycleLen = c.T.cycle * (0.8 + 0.5 * this.rand());
      d.cycleT = 0; this.divisions++;
      this.events.push({ type: 'divide', x: nx, y: ny, t: this.t, cell: c.id });
    }

    _startNub(c) {
      const N = this.N, T = c.T;
      let plan = null;
      if (T.layout && c.layoutIdx < T.layout.length) plan = T.layout[c.layoutIdx];
      let best = -1, bestScore = -1e9;
      const nx = N.x[c.nuc], ny = N.y[c.nuc];
      for (let s = 0; s < NR; s++) {
        let ok = true;
        for (let d = -2; d <= 2; d++) if (c.slotUse[(s + d + NR) % NR] > 0) { ok = false; break; }
        if (!ok) continue;
        const b = c.ring[s];
        let ox = N.x[b] - nx, oy = N.y[b] - ny; const L = hyp(ox, oy) || 1; ox /= L; oy /= L;
        let score = this.rand();
        if (plan && plan.dir !== 'any') score += 6 * (ox * Math.cos(plan.dir) + oy * Math.sin(plan.dir));
        else score += 1.2 * (ox * c.cx + oy * c.cy);
        if (c.polarAngle != null) score += 3 * (ox * Math.cos(c.polarAngle) + oy * Math.sin(c.polarAngle));
        if (c.migrating && T.migration === 'scaffold') { const f = this._o2; if (this.env.fiberAt(nx, ny, f) || this.env.fiberAt(nx, ny - 8, f)) score += 4 * Math.abs(ox * f[0] + oy * f[1]) - 3 * oy; }
        if (score > bestScore) { bestScore = score; best = s; }
      }
      if (best < 0) return;
      c.nub = { slot: best, t: 0, dur: 6 + 10 * this.rand(), plan };
      c.slotUse[best]++;
    }

    _sprout(c) {
      const N = this.N, s = c.nub.slot, b = c.ring[s], plan = c.nub.plan;
      let ox = N.x[b] - N.x[c.nuc], oy = N.y[b] - N.y[c.nuc]; const L = hyp(ox, oy) || 1; ox /= L; oy /= L;
      const tip = N.alloc(N.x[b] + ox * 2.5, N.y[b] + oy * 2.5, K_TIP, c.id, -1);
      let ident = I_MINOR;
      if (plan) ident = plan.ident === 'axon' ? I_AXON : plan.ident === 'dendrite' ? I_DEND : I_MINOR;
      if (!plan && c.stage >= 4) ident = I_DEND;
      // a layout type that lost its axon early regrows one rather than a dendrite
      if (!plan && c.axonId < 0 && c.T.axonRule === 'layout' && c.T.layout && c.T.layout.some((l) => l.ident === 'axon')) ident = I_AXON;
      if (c.migrating) ident = I_MINOR;
      const nr = this._newNeurite(c, -1, b, tip, ox, oy, 0, ident);
      N.rl[tip] = 2.5; nr.slot = s; c.nPrim++;
      if (plan) { nr.apical = !!plan.apical; if (plan.dir !== 'any') nr.dir0 = plan.dir; c.layoutIdx++; }
      if (ident === I_AXON) c.axonId = nr.id;
      for (const pid of c.probes.slice()) {
        const pr = this.probes[pid];
        if (pr.alive && pr.base === b) {
          const l = c.probes, k = l.indexOf(pid); l[k] = l[l.length - 1]; l.pop();
          pr.base = tip; pr.baseGen = N.gen[tip]; pr.owner = nr.id; pr.kind = PK_CONE; nr.probes.push(pid);
        }
      }
      c.nub = null;
      this.events.push({ type: 'sprout', x: N.x[tip], y: N.y[tip], t: this.t, cell: c.id });
    }

    // ------------------------------------------------------------ neurites
    _identParams(c, nr) {
      const T = c.T;
      return nr.ident === I_AXON ? T.axon : nr.ident === I_DEND ? T.dendrite : T.minor;
    }

    _neuritesBio(dt) {
      const p = this.p, N = this.N, env = this.env, L0 = p.segLen;
      const decayD = Math.exp(-dt / 22);
      for (const c of this.cells) if (c.alive) c.totalLen = 0;
      for (let q = 0; q < this.neurites.length; q++) {
        const nr = this.neurites[q];
        if (!nr || !nr.alive) continue;
        const c = this.cells[nr.cell], T = c.T, ip = this._identParams(c, nr);
        if (!N.alive[nr.base] || N.gen[nr.base] !== nr.baseGen) { this._removeNeurite(nr); continue; }
        const nodes = nr.nodes, m = nodes.length - 1;
        // arc length
        if (this._arc.length < nodes.length + 1) this._arc = new Float64Array((nodes.length + 1) * 2);
        const arc = this._arc;
        let px = N.x[nr.base], py = N.y[nr.base], s = 0;
        for (let k = 0; k <= m; k++) { const i = nodes[k]; s += hyp(N.x[i] - px, N.y[i] - py); arc[k] = s; N.s[i] = s; px = N.x[i]; py = N.y[i]; }
        nr.len = s; c.totalLen += s;
        nr.path = s + (nr.parent >= 0 ? (this.neurites[nr.parent].path - this.neurites[nr.parent].len) + N.s[nr.base] : 0);

        // actin waves travel out, hand off into branches, arrive at the tip
        for (let wi = nr.waves.length - 1; wi >= 0; wi--) {
          const w = nr.waves[wi], s0 = w.s;
          w.s += p.waveSpeed * dt;
          for (const chId of nr.children) {
            const ch = this.neurites[chId]; const k = nodes.indexOf(ch.base);
            if (k >= 0 && arc[k] > s0 && arc[k] <= w.s && (ch.tChild || this.rand() < 0.5)) ch.waves.push({ s: 0, amp: w.amp * 0.9 });
          }
          if (w.s >= nr.len) { nr.waves.splice(wi, 1); this._waveArrive(c, nr, w); }
        }
        // per node: actin, MT, width, lateral probes at wave crests and actin patches (axons)
        const W2 = p.waveWidth, mtRelax = dt / 30;
        const wScale = (nr.ident === I_AXON ? T.axon.width * 0.85 : nr.ident === I_DEND ? T.dendrite.width * (nr.apical ? 1.35 : 1) : 1) * (nr.order > 1 ? Math.pow(0.85, nr.order - 1) : 1);
        const latBranch = nr.ident === I_AXON ? T.axon.branch : nr.ident === I_DEND ? T.dendrite.branch : T.minor.branch;
        for (let k = 0; k <= m; k++) {
          const i = nodes[k], sk = arc[k];
          N.ident[i] = nr.ident;
          let act = 0;
          for (const w of nr.waves) {
            const d = (sk - w.s) / W2;
            if (d > -3 && d < 3) act += w.amp * Math.exp(-d * d);
            if (sk < w.s && sk > w.s - 5 * W2) N.mt[i] += 0.5 * dt * w.amp;
          }
          if (N.patch[i] > 0) { N.patch[i] -= dt; act += 0.7; }
          N.mt[i] += ((nr.ident === I_AXON ? 0.45 : 0.18) - N.mt[i]) * mtRelax;
          if (N.mt[i] > 2.2) N.mt[i] = 2.2;
          if (k === m) act = Math.max(act, 0.55 * nr.gc);
          N.act[i] = act;
          const taper = nr.parent < 0 ? 1.6 * Math.exp(-sk / 6) : 0.6 * Math.exp(-sk / 4);
          const dTaper = nr.ident === I_DEND ? Math.max(0.55, 1 - sk / (ip.maxLen * 1.6)) : 1;
          const wT = (0.42 + 0.22 * Math.min(N.mt[i], 2)) * wScale * dTaper + 1.0 * Math.min(act, 1.5) + taper + (k === m ? 0.35 * nr.gc : 0);
          N.w[i] += (wT - N.w[i]) * Math.min(1, dt * 0.8);
          if (act > 0.35 && k < m && k > 0 && nr.probes.length < 24 && !nr.dying) {
            const a = nodes[k - 1], b = nodes[k + 1];
            const ux = N.x[i] - N.x[a], uy = N.y[i] - N.y[a], vx = N.x[b] - N.x[i], vy = N.y[b] - N.y[i];
            const lu = hyp(ux, uy) || 1, lv = hyp(vx, vy) || 1;
            const curv = 1 - (ux * vx + uy * vy) / (lu * lv);
            const rate = p.branchRate * 0.35 * latBranch * act * (1 + 10 * curv + 4 * N.touch[i]) + (N.patch[i] > 0 ? 0.6 : 0);
            if (this.rand() < rate * dt) {
              const side = this.rand() < 0.5 ? -1 : 1, tang = Math.atan2(uy + vy, ux + vx);
              this._newProbe(i, c.id, nr.id, PK_LAT, tang + side * (Math.PI / 2 - 0.5 + this.gauss() * 0.35), T.probes.maxLen * 0.7 * (0.6 + 0.8 * this.rand()));
            }
          }
        }
        // interstitial branching sites: actin patches along axons
        if (nr.ident === I_AXON && m > 4 && !nr.dying && T.axon.branch > 0) {
          const growBoost = 1 + Math.max(0, c.msp) * p.msp;
          if (this.rand() < p.patchRate * nr.len * dt * p.branchRate * growBoost) {
            const k = 1 + ((this.rand() * (m - 3)) | 0); N.patch[nodes[k]] = 8;
          }
        }

        // ---- growth cone
        const tip = nodes[m];
        nr.drive *= decayD;
        nr.S -= nr.S * (p.promoterBack * T.promoterBack / (nr.path + 10) + 1 / 300) * dt;   // back-diffusion to the soma: slower from far away
        const gcT = nr.state === N_CONN ? 0.35 : 0.25 + 0.75 * Math.min(1, nr.drive);
        nr.gc += (gcT - nr.gc) * Math.min(1, dt * 0.3);
        // tubulin: soma -> tip transport (diffusive + active, kinesin-biased by the promoter)
        if (!T.glia) {
          const c0 = Math.min(1, c.Q / T.somaCap), ck = Math.min(1.5, nr.T / TIPCAP);
          const G = p.tubDiff / (nr.path + 20);
          // dendrites get steady (dynein-assisted) delivery; axons and minor neurites ride the promoter feedback
          const pol = p.polarity * T.feedback;
          const A = p.tubActive * (nr.ident === I_DEND ? T.dendTransport + 0.3 * pol * nr.S : (0.15 + pol * nr.S) * (nr.ident === I_AXON ? 1.2 : 1)) * (c.migrating && nr.parent < 0 ? 3 : 1);
          let J = G * (c0 - ck) + A * c0 * Math.max(0, 1 - ck);
          if (J > 0) J = Math.min(J, c.Q * 0.25 / dt / Math.max(1, c.neur.length)); else J = Math.max(J, -nr.T * 0.5 / dt);
          nr.T += J * dt; c.Q -= J * dt;
        }
        let stuck = 0, bound = 0, sx = 0, sy = 0;
        for (const pid of nr.probes) {
          const pr = this.probes[pid];
          if (pr.kind !== PK_CONE || pr.base !== tip) continue;
          if (pr.st === P_STUCK || pr.st === P_BOUND) {
            const tp = this.probeTip(pr);
            let ux = tp[0] - N.x[tip], uy = tp[1] - N.y[tip]; const L = hyp(ux, uy) || 1; ux /= L; uy /= L;
            const wgt = pr.st === P_BOUND ? 1.6 : 0.3;
            sx += wgt * ux; sy += wgt * uy;
            if (pr.st === P_BOUND) bound++; else stuck++;
          }
        }
        nr.stuck = stuck + bound;
        // motor-clutch: traction and retrograde flow from substrate stiffness x local adhesion
        const tx = N.x[tip], ty = N.y[tip];
        const astro = env.astroAt(tx, ty), f2 = this._o2, onFiber = env.fiberAt(tx, ty, f2);
        let on = (env.coatOn(tx, ty) * (1 - astro) + 1.6 * astro) * T.clutch * p.stickiness * (onFiber ? 1.8 : 1);
        Clutch.lookup(env.stiffnessAt(tx, ty), on, this._o2b || (this._o2b = [0, 0]));
        nr.F = this._o2b[0]; nr.V = this._o2b[1];
        nr.adv = Math.min(1, Math.max(0.05, (p.vPoly - nr.V) / p.vPoly));
        N.brk[tip] = 0.02 + 0.10 * nr.F / Clutch.FMAX + 0.03 * stuck + 0.08 * bound;

        if (nr.dying) {
          const prev = m > 0 ? nodes[m - 1] : nr.base;
          let ux = N.x[prev] - tx, uy = N.y[prev] - ty; const L = hyp(ux, uy);
          if (L > 1e-6) { const d = Math.min(L, p.retractSpeed * 6 * dt); N.x[tip] += ux / L * d; N.y[tip] += uy / L * d; N.anc[tip] = 0; }
        } else if (nr.state === N_GROW) {
          // steering: persistence + adhered probes + seeking + cue fields + scaffolds + avoidance + type bias
          const seekW = nr.ident === I_DEND ? 0.3 : 1;
          let dx = nr.hx * 2 + sx + seekW * nr.cx + nr.fx, dy = nr.hy * 2 + sy + seekW * nr.cy + nr.fy;
          if (onFiber) {
            const sg = (f2[0] * nr.hx + f2[1] * nr.hy) >= 0 ? 1 : -1;
            const fw = p.fiberGuide * (c.migrating && T.migration === 'scaffold' && nr.parent < 0 ? 3 : 1);
            dx += sg * f2[0] * fw; dy += sg * f2[1] * fw;
          }
          if (nr.ident === I_DEND && ip.dirBias > 0) { dx += Math.cos(nr.dir0) * ip.dirBias * 2; dy += Math.sin(nr.dir0) * ip.dirBias * 2; }
          if (nr.blocked > 0) { dx += nr.avx * 3; dy += nr.avy * 3; nr.blocked -= dt; nr.blockT += dt; if (nr.blocked <= 0) { nr.avx = nr.avy = 0; } } else nr.blockT = Math.max(0, nr.blockT - dt * 0.5);
          const ha = Math.atan2(nr.hy, nr.hx);
          let na = ha + angDiff(Math.atan2(dy, dx), ha) * Math.min(1, 0.4 * dt) + ip.turn * p.turnNoise * Math.sqrt(dt) * this.gauss();
          // walls: slide along them (contact guidance)
          if (this._hasWalls) {
            const ax = tx + Math.cos(na) * 3, ay = ty + Math.sin(na) * 3;
            if (env.isWall(ax, ay) && env.escape(ax, ay, f2)) {
              let wx = f2[0] - ax, wy = f2[1] - ay; const wl = hyp(wx, wy) || 1; wx /= wl; wy /= wl;
              const tgx = -wy, tgy = wx, sg = (tgx * Math.cos(na) + tgy * Math.sin(na)) >= 0 ? 1 : -1;
              na = Math.atan2(sg * tgy + 0.3 * wy, sg * tgx + 0.3 * wx);
            }
          }
          nr.hx = Math.cos(na); nr.hy = Math.sin(na);
          // advance: clutch x promoter x supply x grip x calcium x length limits
          const ck = nr.T / TIPCAP;
          const steady = nr.ident === I_DEND || (c.migrating && nr.parent < 0);
          const promote = steady ? 0.45 + 0.25 * Math.min(1, nr.drive) + 0.3 * nr.S / (nr.S + 0.6)
                                              : 0.3 * Math.min(1, nr.drive) + 0.7 * nr.S / (nr.S + 0.6);
          const grip = 0.15 + 0.85 * Math.min(1, nr.stuck / 2);
          const caStall = 1 / (1 + (c.rate / (2.5 * p.targetRate)) ** 2);
          let lenF = 1;
          if (nr.ident === I_MINOR) lenF = Math.max(0, 1 - nr.len / ip.maxLen);
          else if (nr.len > ip.maxLen) lenF = 0;
          if (nr.len > c.maxLen) lenF = 0;
          if (c.migrating && nr.parent < 0) lenF = nr.len < Math.min(45, c.maxLen) ? 1 : 0;
          const lead = c.migrating && nr.parent < 0;   // a migrating cell's leading process extends like an axon
          // clutch advance scales cone speed; tractionSpeed < 1 makes a type less stiffness-sensitive (Koch et al. 2012)
          const advF = T.tractionSpeed === 1 ? nr.adv : Math.pow(nr.adv, T.tractionSpeed);
          let v = (lead ? T.axon.speed : ip.speed) * (nr.apical ? 1.3 : 1) * p.growthSpeed * advF * promote * grip * caStall * lenF;
          if (nr.ident === I_MINOR && c.stage >= 3) v *= T.minorRestrain;   // once an axon exists the other minor neurites mark time
          if (!T.glia) v *= ck / (ck + 0.15);
          nr.vNow = v;
          if (v > 0) {
            const d = v * dt; N.x[tip] += nr.hx * d; N.y[tip] += nr.hy * d; N.ax[tip] += nr.hx * d; N.ay[tip] += nr.hy * d;
            // a slipping clutch lets retrograde flow sweep polymer back: the tip pays more tubulin per µm gained
            const k = T.tractionCoupling, eff = Math.max(0.2, 1 - k + k * Math.min(1, nr.adv / 0.85));
            nr.T = Math.max(0, nr.T - d / eff);
          }
          // starvation and wave-starved stalling -> retraction
          if (ck < 0.04 && v < 0.02) nr.starveT += dt; else nr.starveT = Math.max(0, nr.starveT - dt);
          const retDelay = p.retractDelay * (nr.ident === I_AXON || nr.ident === I_DEND ? 4 : 1);
          // restrained minor neurites (stage 3+) hold their length rather than retracting for want of waves
          const held = nr.ident === I_MINOR && c.stage >= 3 && T.minorRestrain < 1;
          const waveStarved = nr.ident !== I_DEND && !held && this.t - nr.lastWave > retDelay && nr.drive < 0.2 && nr.S < 0.25;
          if ((waveStarved || nr.starveT > 30) && !c.migrating && this.rand() < dt / 25) nr.state = N_RETRACT;
          if (nr.blockT > 4) { nr.state = N_RETRACT; nr.retractUntil = this.t + 6 + 6 * this.rand(); nr.blockT = 0; }
          // terminal branching: T-split (granule, DRG) and growth-cone splitting (dendrites)
          if (nr.ident === I_AXON && T.axon.tSplit > 0 && nr.parent < 0 && !nr.tSplitDone && nr.len >= T.axon.tSplit && m >= 2) {
            nr.tSplitDone = true;
            const a0 = Math.atan2(nr.hy, nr.hx);
            nr.hx = Math.cos(a0 + Math.PI / 2); nr.hy = Math.sin(a0 + Math.PI / 2); nr.dir0 = a0 + Math.PI / 2;
            const ch = this._branch(nr, nodes[m - 1], Math.cos(a0 - Math.PI / 2), Math.sin(a0 - Math.PI / 2), null, true);
            if (ch) { ch.S = nr.S; ch.T = nr.T * 0.5; nr.T *= 0.5; ch.tSplitDone = true; ch.tChild = true; ch.drive = 1; }
          }
          if (nr.ident === I_DEND && m >= 2 && nr.order < ip.maxOrder && nr.len - nr.lastSplitLen > ip.segMin &&
              this.rand() < p.branchRate * ip.branch * 0.012 * dt) this._split(c, nr, ip);
        } else if (nr.state === N_RETRACT) {
          const prev = m > 0 ? nodes[m - 1] : nr.base;
          let ux = N.x[prev] - tx, uy = N.y[prev] - ty; const L = hyp(ux, uy);
          if (L > 1e-6) { const d = Math.min(L, p.retractSpeed * dt); N.x[tip] += ux / L * d; N.y[tip] += uy / L * d; N.anc[tip] = 0; nr.T += d * 0.8; }
          for (const pid of nr.probes) { const pr = this.probes[pid]; if (pr.kind === PK_CONE && pr.st === P_GROW) pr.st = P_SHRINK; }
          if (nr.retractUntil > 0 && this.t > nr.retractUntil) { nr.state = N_GROW; nr.retractUntil = 0; nr.lastWave = this.t; nr.drive = Math.max(nr.drive, 0.4); }
          else if (nr.retractUntil === 0 && nr.T / TIPCAP > 0.3 && nr.S > 0.5) { nr.state = N_GROW; nr.lastWave = this.t; }
        }
        // spawn growth-cone probes
        if (nr.state === N_GROW && !nr.dying) {
          let cone = 0;
          for (const pid of nr.probes) if (this.probes[pid].kind === PK_CONE) cone++;
          const targetN = Math.round(T.probes.cone * p.probesScale * (0.35 + 0.65 * Math.min(1, nr.gc)));
          if (cone < targetN && this.rand() < dt * 5) this._spawnConeProbe(c, nr);
        }
        if (nr.alive) this._maintain(nr, c);
      }
    }

    _spawnConeProbe(c, nr) {
      const p = this.p;
      const tip = nr.nodes[nr.nodes.length - 1];
      let ang = Math.atan2(nr.hy, nr.hx) + this.gauss() * 0.8;
      const bx = nr.cx + nr.fx, by = nr.cy + nr.fy;
      if ((bx || by) && this.rand() < 0.5) ang += angDiff(Math.atan2(by, bx), ang) * 0.6 * this.rand();
      return this._newProbe(tip, nr.cell, nr.id, PK_CONE, ang, c.T.probes.maxLen * (0.5 + 0.7 * this.rand()) * (0.7 + 0.3 * Math.min(1.3, nr.gc)));
    }

    _waveArrive(c, nr, w) {
      const p = this.p, N = this.N;
      nr.drive = Math.min(2.0, nr.drive + 0.9 * w.amp);
      nr.gc = Math.min(1.6, nr.gc + 0.5);
      nr.S += 0.8 * w.amp; nr.kin += 1; nr.lastWave = this.t;
      if (nr.state === N_RETRACT && !nr.dying && nr.retractUntil === 0) nr.state = N_GROW;
      const m = nr.nodes.length - 1;
      this.events.push({ type: 'wave', x: N.x[nr.nodes[m]], y: N.y[nr.nodes[m]], t: this.t, cell: nr.cell });
      if (nr.state === N_GROW && !nr.dying) {
        for (let k = 0; k < 3; k++) this._spawnConeProbe(c, nr);
        const ip = this._identParams(c, nr);
        const pSplit = nr.ident === I_DEND ? 0.25 * ip.branch : nr.ident === I_AXON ? 0.04 * ip.branch : 0.04 * ip.branch;
        if (m >= 2 && nr.order < (ip.maxOrder || 4) && this.rand() < pSplit * p.branchRate) this._split(c, nr, ip);
      }
    }
    _split(c, nr, ip) {
      const m = nr.nodes.length - 1, a0 = Math.atan2(nr.hy, nr.hx), half = (ip.splitAngle || 0.6) / 2 * (0.7 + 0.6 * this.rand());
      const side = this.rand() < 0.5 ? -1 : 1;
      const ch = this._branch(nr, nr.nodes[m - 1], Math.cos(a0 + side * half), Math.sin(a0 + side * half), null);
      if (ch) { nr.hx = Math.cos(a0 - side * half); nr.hy = Math.sin(a0 - side * half); nr.lastSplitLen = nr.len; ch.dir0 = nr.dir0; }
    }
    _branch(parent, baseNode, dx, dy, probe, force) {
      const N = this.N, c = this.cells[parent.cell];
      if (!force && (parent.children.length >= 3 || parent.depth >= this.p.maxBranchDepth || c.neur.length >= 4 + c.maxNeurites * (c.T.dendrite.maxOrder > 6 ? 40 : 3))) return null;
      for (const chId of parent.children) if (this.neurites[chId].base === baseNode) return null;
      const tip = N.alloc(N.x[baseNode] + dx * 2.0, N.y[baseNode] + dy * 2.0, K_TIP, c.id, -1);
      const ch = this._newNeurite(c, parent.id, baseNode, tip, dx, dy, parent.depth + 1, parent.ident);
      N.rl[tip] = 2.0; ch.drive = 0.8; ch.gc = 0.5;
      ch.T = Math.min(parent.T * 0.4, 2.5); parent.T -= ch.T;
      parent.children.push(ch.id);
      if (probe) {
        const l = parent.probes, k = l.indexOf(probe.id); if (k >= 0) { l[k] = l[l.length - 1]; l.pop(); }
        probe.base = tip; probe.baseGen = N.gen[tip]; probe.owner = ch.id; probe.kind = PK_CONE; ch.probes.push(probe.id);
      }
      this.events.push({ type: 'branch', x: N.x[baseNode], y: N.y[baseNode], t: this.t, cell: c.id });
      return ch;
    }
    _isBranchBase(nr, i) { for (const chId of nr.children) if (this.neurites[chId].base === i) return true; return false; }
    _reassignProbes(nr, from, to) { const N = this.N; for (const pid of nr.probes) { const pr = this.probes[pid]; if (pr.base === from) { pr.base = to; pr.baseGen = N.gen[to]; } } }

    _maintain(nr, c) {
      const N = this.N, L0 = this.p.segLen, nodes = nr.nodes;
      const m = nodes.length - 1;
      if (nr.parent < 0 && m >= 1) {
        const i0 = nodes[0];
        const d = hyp(N.x[i0] - N.x[c.nuc], N.y[i0] - N.y[c.nuc]);
        if (d < c.rOut * 0.8) {
          if (!this._isBranchBase(nr, i0)) {
            const i1 = nodes[1], newRl = hyp(N.x[i1] - N.x[nr.base], N.y[i1] - N.y[nr.base]);
            c.Q = Math.min(c.T.somaCap, c.Q + Math.max(0, N.rl[i0] + N.rl[i1] - newRl));   // swallowed shaft returns its tubulin
            N.rl[i1] = newRl;
            this._reassignProbes(nr, i0, i1); N.release(i0); nodes.splice(0, 1); return;
          } else if (c.migrating) {
            // the nucleus reached a branch point of the leading process: the side branch is given up
            for (const chId of nr.children.slice()) { const ch = this.neurites[chId]; if (ch.base === i0) { this._removeNeurite(ch); this.events.push({ type: 'prune', x: N.x[i0], y: N.y[i0], t: this.t, cell: c.id }); } }
            return;
          }
        }
      }
      let prev = nr.base;
      for (let k = 0; k <= m; k++) {
        const i = nodes[k];
        const d = hyp(N.x[i] - N.x[prev], N.y[i] - N.y[prev]);
        if (d > 1.6 * L0) {
          const ni = N.alloc((N.x[i] + N.x[prev]) / 2, (N.y[i] + N.y[prev]) / 2, K_SHAFT, nr.cell, nr.id);
          N.w[ni] = (N.w[i] + N.w[prev]) / 2 || 0.6; N.mt[ni] = N.mt[i]; N.anc[ni] = 1; N.ax[ni] = N.x[ni]; N.ay[ni] = N.y[ni];
          N.rl[ni] = N.rl[i] / 2; N.rl[i] = N.rl[i] / 2; N.ident[ni] = nr.ident;
          nodes.splice(k, 0, ni);
          return;
        }
        if (k < m && d < 0.4 * L0 && !this._isBranchBase(nr, i)) {
          N.rl[nodes[k + 1]] += N.rl[i];
          this._reassignProbes(nr, i, prev);
          N.release(i); nodes.splice(k, 1); return;
        }
        if (k === m && d < 0.35 * L0) {
          if (m > 0) {
            const j = nodes[m - 1];
            if (!this._isBranchBase(nr, j)) { N.rl[i] += N.rl[j]; this._reassignProbes(nr, j, i); N.release(j); nodes.splice(m - 1, 1); return; }
            if (nr.state === N_RETRACT) {
              if (nr.dying) { for (const chId of nr.children.slice()) { const ch = this.neurites[chId]; if (ch.base === j) this._removeNeurite(ch); } }
              else { nr.state = N_GROW; nr.lastWave = this.t; nr.drive = 0.05; nr.retractUntil = 0; }
            }
          } else if (nr.state === N_RETRACT && nr.children.length === 0) {
            this._removeNeurite(nr); return;
          }
        }
        prev = i;
      }
    }

    // ------------------------------------------------------------ probes
    _probesBio(dt) {
      const p = this.p, N = this.N, env = this.env;
      const bindP = 1 - Math.exp(-p.cellStick * p.stickiness * dt);
      const sq = Math.sqrt(dt);
      for (let q = 0; q < this.probes.length; q++) {
        const pr = this.probes[q];
        if (!pr || !pr.alive) continue;
        const b = pr.base;
        if (!N.alive[b] || N.gen[b] !== pr.baseGen) { this._killProbe(pr); continue; }
        pr.age += dt;
        const bx = N.x[b], by = N.y[b];
        if (pr.st === P_GROW) {
          pr.len += p.probeSpeed * dt;
          pr.ang += p.probeWander * sq * this.gauss();
          const f = pr.len / pr.maxLen;
          if (pr.len >= pr.maxLen || this.rand() < p.catastrophe * dt * (0.3 + 2 * f * f)) pr.st = P_SHRINK;
          const tx = bx + pr.len * Math.cos(pr.ang), ty = by + pr.len * Math.sin(pr.ang);
          if (tx < 2 || ty < 2 || tx > this.W - 2 || ty > this.H - 2 || (this._hasWalls && env.isWall(tx, ty))) { pr.st = P_SHRINK; pr.len = Math.max(0, pr.len - 1); continue; }
          const hit = this._nearestOther(tx, ty, 1.8, pr.cell);
          if (hit >= 0 && this.rand() < bindP) {
            pr.st = P_BOUND; pr.tgt = hit; pr.tgtGen = N.gen[hit]; pr.tgtCell = N.cell[hit]; pr.Lref = pr.len;
          } else {
            const astro = env.astroAt(tx, ty), fb = env.fiberAt(tx, ty, this._o2);
            // filopodial adhesions only mature under load: weak traction (soft or slippery substrate) -> fewer stick
            const load = pr.kind === PK_CONE && pr.owner >= 0 ? 0.2 + 0.8 * this.neurites[pr.owner].F / Clutch.FMAX : 1;
            const adh = (env.coatOn(tx, ty) * (1 - astro) + 1.6 * astro) / 0.7 * (fb ? 3 : 1) * load;
            if (this.rand() < p.glassStick * p.stickiness * adh * dt) { pr.st = P_STUCK; pr.tx = tx; pr.ty = ty; pr.Lref = pr.len; }
          }
        } else if (pr.st === P_SHRINK) {
          pr.len -= p.probeShrink * dt;
          if (pr.len <= 0) { this._killProbe(pr); continue; }
          if (this.rand() < p.rescue * dt) pr.st = P_GROW;
        } else if (pr.st === P_STUCK) {
          const dx = pr.tx - bx, dy = pr.ty - by, L = hyp(dx, dy);
          pr.len = L; pr.ang = Math.atan2(dy, dx);
          if (L < pr.Lref) pr.Lref = L;
          if (L < 0.9) { this._killProbe(pr); continue; }
          if (pr.kind === PK_CONE && pr.owner >= 0 && L > 1.5) {
            const nr = this.neurites[pr.owner];
            if ((dx * nr.hx + dy * nr.hy) / L < -0.1 && this.rand() < 3 * dt) { pr.st = P_SHRINK; continue; }
          }
          const tension = N.kind[b] === K_TIP ? 0 : 0.08 * (L - pr.Lref);
          if (tension > 0.12 * p.stickiness || L > pr.maxLen * 2.2 || this.rand() < 0.1 * dt / p.stickiness) pr.st = P_SHRINK;
        } else if (pr.st === P_BOUND) {
          const t = pr.tgt;
          if (!N.alive[t] || N.gen[t] !== pr.tgtGen) { pr.st = P_SHRINK; continue; }
          const dx = N.x[t] - bx, dy = N.y[t] - by, L = hyp(dx, dy);
          pr.len = L; pr.ang = Math.atan2(dy, dx);
          if (L < pr.Lref) pr.Lref = L;
          if (pr.kind === PK_CONE && pr.owner >= 0) {
            const nr = this.neurites[pr.owner];
            if (nr.state === N_GROW && L < 2.4 && b === nr.nodes[nr.nodes.length - 1]) {
              if (p.synapses && nr.ident === I_AXON && this.cells[pr.tgtCell] && !this.cells[pr.tgtCell].T.glia) {
                const tk = N.kind[t], tid = N.ident[t], post = this.cells[pr.tgtCell];
                let prob = tk === K_RING ? 0.7 : tid === I_DEND ? (post.stage >= 5 ? 1.0 : 0.85) : tid === I_MINOR ? 0.4 : 0.0;
                const pre = this.cells[nr.cell];
                prob *= (1 + 0.8 * Math.max(0, pre.msp) * p.msp) * (1 + 0.6 * env.astroAt(N.x[t], N.y[t]));
                if (post.stage >= 2 && this.rand() < Math.min(1, prob)) this._synapse(nr, pr);
              }
              this._killProbe(pr); continue;
            }
          }
          if (L < 1.0) { this._killProbe(pr); continue; }
          const tension = N.kind[b] === K_TIP ? 0 : 0.08 * (L - pr.Lref);
          if (tension > 0.3 * p.stickiness || L > pr.maxLen * 2.5 || this.rand() < 0.02 * dt) pr.st = P_SHRINK;
        }
      }
      // lateral probes that adhere and get invaded by MTs become branches
      if (p.branchRate > 0) {
        for (let q = 0; q < this.probes.length; q++) {
          const pr = this.probes[q];
          if (!pr || !pr.alive || pr.kind !== PK_LAT) continue;
          if ((pr.st === P_STUCK || pr.st === P_BOUND) && pr.age > 1.5 && pr.len > 2.5) {
            const nr = this.neurites[pr.owner];
            if (!nr || !nr.alive || nr.dying) continue;
            const c = this.cells[nr.cell], ip = this._identParams(c, nr);
            let rate = (pr.st === P_BOUND ? 0.3 : 0.06) * p.branchRate * (ip.branch || 0);
            if (nr.ident === I_AXON) rate *= p.severing * Math.min(1, N.mt[pr.base] + 0.2) * (1 + Math.max(0, c.msp) * p.msp);
            if (nr.ident === I_DEND && nr.order >= (ip.maxOrder || 5)) rate = 0;
            if (this.rand() < rate * dt) {
              const bi = nr.nodes.indexOf(pr.base);
              if (bi >= 0 && bi < nr.nodes.length - 1 && nr.depth < p.maxBranchDepth) this._branch(nr, pr.base, Math.cos(pr.ang), Math.sin(pr.ang), pr);
            }
          }
        }
      }
    }
    probeTip(pr) {
      const N = this.N, o = this._pt || (this._pt = [0, 0]);
      if (pr.st === P_STUCK) { o[0] = pr.tx; o[1] = pr.ty; }
      else if (pr.st === P_BOUND && N.alive[pr.tgt] && N.gen[pr.tgt] === pr.tgtGen) { o[0] = N.x[pr.tgt]; o[1] = N.y[pr.tgt]; }
      else { o[0] = N.x[pr.base] + pr.len * Math.cos(pr.ang); o[1] = N.y[pr.base] + pr.len * Math.sin(pr.ang); }
      return o;
    }

    // ------------------------------------------------------------ synapses
    _synapse(nr, pr) {
      const N = this.N, tip = nr.nodes[nr.nodes.length - 1];
      let id; if (this._freeBond.length) id = this._freeBond.pop(); else { id = this.bonds.length; this.bonds.push(null); }
      const pre = this.cells[nr.cell];
      const bd = { id, alive: true, a: tip, ag: N.gen[tip], b: pr.tgt, bg: pr.tgtGen, rest: 1.2, neu: nr.id, ca: nr.cell, cb: pr.tgtCell, t: this.t, w: 0.08, inhib: !!pre.T.inhibitory, onSoma: N.kind[pr.tgt] === K_RING };
      this.bonds[id] = bd;
      nr.state = N_CONN; nr.bond = id; nr.drive = 0;
      for (const pid of nr.probes) { const o = this.probes[pid]; if (o.kind === PK_CONE && o !== pr && o.st !== P_BOUND) o.st = P_SHRINK; }
      this.cells[bd.ca].conn++; if (this.cells[bd.cb]) this.cells[bd.cb].conn++;
      this.activity.dirty = true;
      this.events.push({ type: 'synapse', x: N.x[tip], y: N.y[tip], t: this.t, cell: nr.cell });
    }
    _breakBond(bd, prune) {
      if (!bd || !bd.alive) return;
      bd.alive = false; this._freeBond.push(bd.id); this.activity.dirty = true;
      const nr = this.neurites[bd.neu];
      if (nr && nr.alive && nr.bond === bd.id) {
        nr.bond = -1; nr.state = N_GROW; nr.gc = 0.5; nr.drive = 0.4; nr.lastWave = this.t;
        if (prune) { nr.state = N_RETRACT; nr.retractUntil = this.t + 15; }
      }
      if (this.cells[bd.ca]) this.cells[bd.ca].conn--; if (this.cells[bd.cb]) this.cells[bd.cb].conn--;
      if (prune) this.events.push({ type: 'unsynapse', x: this.N.x[bd.a], y: this.N.y[bd.a], t: this.t, cell: bd.ca });
    }
    _bondsBio(dt) {
      const N = this.N, p = this.p;
      for (const bd of this.bonds) {
        if (!bd || !bd.alive) continue;
        if (!N.alive[bd.a] || N.gen[bd.a] !== bd.ag || !N.alive[bd.b] || N.gen[bd.b] !== bd.bg) { this._breakBond(bd); continue; }
        const nr = this.neurites[bd.neu];
        if (!nr || !nr.alive || nr.nodes[nr.nodes.length - 1] !== bd.a) { this._breakBond(bd); continue; }
        // maturation toward a baseline weight; weak old synapses are eliminated
        bd.w += (p.wMature - bd.w) * dt / 240;
        if (this.t - bd.t > 360 && bd.w < 0.06 && this.rand() < 0.02 * dt) this._breakBond(bd, true);
      }
      // homeostatic structural plasticity: above-target cells shed synapses, below-target cells grow
      if (p.activity && p.msp > 0 && this.activity.activeCount) {
        for (const c of this.cells) {
          if (!c.alive || c.T.glia || c.stage < 3) continue;
          c.msp = Math.max(-1, Math.min(1, 1 - c.rate / p.targetRate));
          if (c.msp < -0.1 && this.rand() < -c.msp * p.mspDelete * p.msp * dt) {
            const mine = []; for (const b of this.bonds) if (b && b.alive && (b.ca === c.id || b.cb === c.id)) mine.push(b);
            if (mine.length) this._breakBond(mine[(this.rand() * mine.length) | 0], true);
          }
        }
      } else for (const c of this.cells) if (c.alive) c.msp = c.stage >= 3 ? 0.3 : 0;
    }

    // ------------------------------------------------------------ forces
    _somaForces(dt) {
      const p = this.p, N = this.N, X = N.x, Y = N.y, FX = N.fx, FY = N.fy, NZ = N.nz;
      const kP = 0.15, kE = 0.10, kS = 0.10, kSp = 0.018, kC = 0.06;
      const ouA = Math.exp(-dt / 2.5);
      for (const c of this.cells) {
        if (!c.alive) continue;
        const ouB = 0.035 * p.cortexNoise * c.T.cortexNoise * Math.sqrt(1 - ouA * ouA) * (c.dying >= 0 ? 3 : 1);
        const ring = c.ring, nu = c.nuc, rT = c.rOut;
        let A = 0, cx = 0, cy = 0;
        for (let k = 0; k < NR; k++) { const i = ring[k], j = ring[(k + 1) % NR]; const cr = X[i] * Y[j] - X[j] * Y[i]; A += cr; cx += (X[i] + X[j]) * cr; cy += (Y[i] + Y[j]) * cr; }
        A *= 0.5;
        if (Math.abs(A) > 1e-6) { cx /= 6 * A; cy /= 6 * A; } else { cx = X[nu]; cy = Y[nu]; }
        const rEff = Math.sqrt(Math.abs(A) / Math.PI), press = kP * (rT - rEff), lT = TAU * rT / NR;
        const nubSlot = c.nub ? c.nub.slot : -1, nubF = c.nub ? 0.09 * Math.min(1, c.nub.t / Math.max(1, c.nub.dur * 0.6)) : 0;
        for (let k = 0; k < NR; k++) {
          const i = ring[k], ip = ring[(k + NR - 1) % NR], inx = ring[(k + 1) % NR];
          const tx = X[inx] - X[ip], ty = Y[inx] - Y[ip], tl = hyp(tx, ty) || 1, nx = ty / tl, ny = -tx / tl;
          NZ[i] = NZ[i] * ouA + ouB * this.gauss();
          let fn = press + NZ[i]; if (k === nubSlot) fn += nubF;
          FX[i] += fn * nx; FY[i] += fn * ny;
          const ex = X[inx] - X[i], ey = Y[inx] - Y[i], el = hyp(ex, ey) || 1e-6, fe = kE * (el - lT) / el;
          FX[i] += fe * ex; FY[i] += fe * ey; FX[inx] -= fe * ex; FY[inx] -= fe * ey;
          FX[i] += kS * ((X[ip] + X[inx]) * 0.5 - X[i]); FY[i] += kS * ((Y[ip] + Y[inx]) * 0.5 - Y[i]);
          const sx = X[i] - X[nu], sy = Y[i] - Y[nu], sl = hyp(sx, sy) || 1e-6, fs = kSp * (sl - rT * 0.92) / sl;
          FX[i] -= fs * sx; FY[i] -= fs * sy; FX[nu] += fs * sx; FY[nu] += fs * sy;
        }
        FX[nu] += kC * (cx - X[nu]); FY[nu] += kC * (cy - Y[nu]);
        c.area = Math.abs(A);
        if (c.pulse > 0 && c.nPrim > 0) {
          let lead = null;
          for (const id of c.neur) { const nr = this.neurites[id]; if (nr.parent < 0 && (!lead || nr.len > lead.len)) lead = nr; }
          if (lead && lead.len > 8) {
            const b = lead.base; const ux = X[b] - X[nu], uy = Y[b] - Y[nu], ul = hyp(ux, uy) || 1;
            const strength = p.pulseStrength > 0 ? p.pulseStrength : c.T.pulseStrength;
            const f = strength * c.pulse * Math.min(1, lead.len / 25);
            FX[nu] += f * ux / ul; FY[nu] += f * uy / ul;
            for (let k = 0; k < NR; k++) { const i = ring[k]; if ((X[i] - X[nu]) * ux + (Y[i] - Y[nu]) * uy < 0) { FX[i] += 0.5 * f * ux / ul; FY[i] += 0.5 * f * uy / ul; } }
          }
        }
      }
    }

    _neuriteForces() {
      const p = this.p, N = this.N, X = N.x, Y = N.y, FX = N.fx, FY = N.fy, MT = N.mt, RL = N.rl;
      const L0 = p.segLen, kSeg = 0.22, kB = 0.05 * p.stiffness, kRad = 0.04, dt = p.dt / (this._nSub || 1);
      const relax = Math.min(1, dt / Math.max(0.05, p.viscosity)), relaxTip = Math.min(1, dt / 0.3);
      const jig = 0.012 * p.cortexNoise / Math.sqrt(this._mechScale || 1), rnd = this.rand;   // thermal jiggle: displacement ∝ √time
      for (const nr of this.neurites) {
        if (!nr || !nr.alive) continue;
        const c = this.cells[nr.cell];
        const T = p.contractility * (1 + 1.5 * c.pulse) * (nr.dying ? 3 : 1);
        const shorten = 0.3 * c.pulse * dt + (nr.dying ? 0.05 * dt : 0);
        const nodes = nr.nodes, m = nodes.length - 1;
        let a = nr.base;
        for (let k = 0; k <= m; k++) {
          const b = nodes[k];
          const dx = X[b] - X[a], dy = Y[b] - Y[a], d = hyp(dx, dy) || 1e-6, e = d - RL[b];
          const f = ((e > 0 ? kSeg : kSeg * 0.3) * e + T) / d;
          FX[a] += f * dx; FY[a] += f * dy; FX[b] -= f * dx; FY[b] -= f * dy;
          RL[b] += (d - RL[b]) * (k === m ? relaxTip : relax) - RL[b] * shorten;
          FX[b] += jig * (rnd() - 0.5); FY[b] += jig * (rnd() - 0.5);
          a = b;
        }
        let i0 = nr.base, i1 = nodes[0];
        for (let k = 1; k <= m; k++) {
          const i2 = nodes[k], kb = kB * (0.25 + Math.min(MT[i1], 2));
          const mx = (X[i0] + X[i2]) * 0.5 - X[i1], my = (Y[i0] + Y[i2]) * 0.5 - Y[i1];
          FX[i1] += kb * mx; FY[i1] += kb * my; FX[i0] -= 0.5 * kb * mx; FY[i0] -= 0.5 * kb * my; FX[i2] -= 0.5 * kb * mx; FY[i2] -= 0.5 * kb * my;
          i0 = i1; i1 = i2;
        }
        if (nr.parent < 0) {
          const b = nr.base, n0 = nodes[0];
          let ox = X[b] - X[c.nuc], oy = Y[b] - Y[c.nuc]; const ol = hyp(ox, oy) || 1; ox /= ol; oy /= ol;
          const d0 = hyp(X[n0] - X[b], Y[n0] - Y[b]), tx = X[b] + ox * d0, ty = Y[b] + oy * d0;
          FX[n0] += kRad * (tx - X[n0]); FY[n0] += kRad * (ty - Y[n0]); FX[b] -= kRad * 0.5 * (tx - X[n0]); FY[b] -= kRad * 0.5 * (ty - Y[n0]);
        }
      }
    }
    _probeForces() {
      const p = this.p, N = this.N, FX = N.fx, FY = N.fy, X = N.x, Y = N.y;
      for (const pr of this.probes) {
        if (!pr || !pr.alive || (pr.st !== P_STUCK && pr.st !== P_BOUND)) continue;
        const b = pr.base; let tx, ty;
        if (pr.st === P_STUCK) { tx = pr.tx; ty = pr.ty; } else { tx = X[pr.tgt]; ty = Y[pr.tgt]; }
        const dx = tx - X[b], dy = ty - Y[b], L = hyp(dx, dy) || 1e-6;
        const tether = N.kind[b] === K_TIP ? 0 : 0.08 * Math.max(0, L - pr.Lref);
        const f = (p.probePull * (pr.kind === PK_SOMA ? 0.8 : 1) + tether) / L;
        FX[b] += f * dx; FY[b] += f * dy;
        if (pr.st === P_BOUND) { FX[pr.tgt] -= 0.6 * f * dx; FY[pr.tgt] -= 0.6 * f * dy; }
      }
    }
    _bondForces() {
      const N = this.N, FX = N.fx, FY = N.fy, X = N.x, Y = N.y;
      for (const bd of this.bonds) {
        if (!bd || !bd.alive) continue;
        const dx = X[bd.b] - X[bd.a], dy = Y[bd.b] - Y[bd.a], d = hyp(dx, dy) || 1e-6, f = 0.12 * (d - bd.rest);
        if (f > 0.6 * this.p.stickiness + 0.2) { this._breakBond(bd); continue; }
        FX[bd.a] += f * dx / d; FY[bd.a] += f * dy / d; FX[bd.b] -= f * dx / d; FY[bd.b] -= f * dy / d;
      }
    }

    // ------------------------------------------------------------ contacts (uniform grid)
    _buildHash() {
      const N = this.N, n = N.n, hs = this.hs, gw = this.gw, G = gw * this.gh;
      if (this.hKey.length < n) { this.hKey = new Int32Array(n * 2); this.hItems = new Int32Array(n * 2); }
      const key = this.hKey, start = this.hStart, cur = this.hCur, items = this.hItems;
      start.fill(0);
      const X = N.x, Y = N.y, AL = N.alive, CL = N.cell, cells = this.cells;
      for (let i = 0; i < n; i++) {
        if (!AL[i] || cells[CL[i]].z > 0) { key[i] = -1; continue; }
        const k = ((X[i] / hs) | 0) + 1 + (((Y[i] / hs) | 0) + 1) * gw;
        key[i] = k; start[k + 1]++;
      }
      for (let b = 0; b < G; b++) start[b + 1] += start[b];
      cur.set(start.subarray(0, G));
      for (let i = 0; i < n; i++) { const k = key[i]; if (k >= 0) items[cur[k]++] = i; }
      this._hashN = n;
    }
    _nearestOther(x, y, r, cell) {
      if (!this._hashN) return -1;
      const N = this.N, hs = this.hs, gw = this.gw;
      if (x < 0 || y < 0 || x >= this.W || y >= this.H) return -1;
      const k0 = ((x / hs) | 0) + 1 + (((y / hs) | 0) + 1) * gw, start = this.hStart, items = this.hItems;
      let best = -1, bd = r * r;
      for (let oy = -gw; oy <= gw; oy += gw) for (let ox = -1; ox <= 1; ox++) {
        const k = k0 + ox + oy;
        for (let t = start[k], e = start[k + 1]; t < e; t++) {
          const j = items[t];
          if (!N.alive[j] || N.cell[j] === cell || N.kind[j] === K_NUC) continue;
          const oc = this.cells[N.cell[j]]; if (oc.dying >= 0) continue;
          const dx = N.x[j] - x, dy = N.y[j] - y, d2 = dx * dx + dy * dy;
          if (d2 < bd) { bd = d2; best = j; }
        }
      }
      return best;
    }
    _contacts(scale) {
      const p = this.p, N = this.N, n = this._hashN;
      const X = N.x, Y = N.y, FX = N.fx, FY = N.fy, KD = N.kind, CL = N.cell, TCH = N.touch, ID = N.ident, NE = N.neu, S = N.s;
      const key = this.hKey, start = this.hStart, items = this.hItems, gw = this.gw, cells = this.cells, neur = this.neurites;
      const st = p.stickiness * scale;
      TCH.fill(0, 0, N.n);
      const rc2 = 9;
      for (let i = 0; i < n; i++) {
        if (key[i] < 0) continue;
        const ki = KD[i]; if (ki === K_NUC) continue;
        const xi = X[i], yi = Y[i], ci = CL[i], k0 = key[i];
        for (let oy = -gw; oy <= gw; oy += gw) for (let ox = -1; ox <= 1; ox++) {
          const k = k0 + ox + oy;
          for (let t = start[k], e = start[k + 1]; t < e; t++) {
            const j = items[t];
            if (j <= i) continue;
            const kj = KD[j]; if (kj === K_NUC) continue;
            const cj = CL[j], same = cj === ci;
            if (same) {
              // self-avoidance: only between different dendrite branches of one cell, away from shared branch points
              if (ID[i] !== I_DEND || ID[j] !== I_DEND || NE[i] === NE[j]) continue;
              const sa = cells[ci].T.dendrite.selfAvoid * p.selfAvoid; if (sa <= 0) continue;
              const A = neur[NE[i]], B = neur[NE[j]];
              if ((B.parent === A.id && S[j] < 8) || (A.parent === B.id && S[i] < 8) || (A.parent === B.parent && S[i] < 8 && S[j] < 8) || (A.parent < 0 && B.parent < 0 && S[i] < 10 && S[j] < 10)) continue;
              const dx = X[j] - xi, dy = Y[j] - yi, d2 = dx * dx + dy * dy;
              if (d2 > rc2 || d2 < 1e-12) continue;
              const d = Math.sqrt(d2), f = -0.05 * sa * (3 - d) * scale, fx = f * dx / d, fy = f * dy / d;
              FX[i] += fx; FY[i] += fy; FX[j] -= fx; FY[j] -= fy;
              if (KD[i] === K_TIP) { A.blocked = 1; A.avx -= dx / d; A.avy -= dy / d; }
              if (KD[j] === K_TIP) { B.blocked = 1; B.avx += dx / d; B.avy += dy / d; }
              continue;
            }
            const dx = X[j] - xi, dy = Y[j] - yi, d2 = dx * dx + dy * dy;
            if (d2 > rc2 || d2 < 1e-12) continue;
            const d = Math.sqrt(d2);
            let f = 0;
            const ri = ki === K_RING, rj = kj === K_RING;
            if (ri && rj) { if (d < 1.8) f = -0.12 * (1.8 - d) * scale; else f = 0.02 * st * (d - 1.8); }
            else if (ri || rj) { if (d > 0.6) f = 0.015 * st * (d - 0.6); }
            else if (ID[i] === I_DEND && ID[j] === I_DEND && cells[ci].T.key === cells[cj].T.key && cells[ci].T.dendrite.tiling > 0) {
              // tiling: same-type dendrites repel each other
              const tl = cells[ci].T.dendrite.tiling * p.tiling;
              f = -0.05 * tl * (3 - d) * scale;
              if (KD[i] === K_TIP) { const A = neur[NE[i]]; A.blocked = 1; A.avx -= dx / d; A.avy -= dy / d; }
              if (KD[j] === K_TIP) { const B = neur[NE[j]]; B.blocked = 1; B.avx += dx / d; B.avy += dy / d; }
            } else { if (d < 0.5) f = -0.05 * (0.5 - d) * scale; else if (d < 2.6) f = 0.025 * st * (d - 0.5); }
            if (d < 2.4) { TCH[i] = 1; TCH[j] = 1; }
            const fx = f * dx / d, fy = f * dy / d;
            FX[i] += fx; FY[i] += fy; FX[j] -= fx; FY[j] -= fy;
          }
        }
      }
    }
    _cellRepulsion() {
      const N = this.N, cells = this.cells, X = N.x, Y = N.y, FX = N.fx, FY = N.fy;
      const B = 40, grid = new Map();
      for (const c of cells) {
        if (!c.alive || c.z > 0) continue;
        const k = Math.floor(c.x / B) * 100003 + Math.floor(c.y / B);
        let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(c);
      }
      for (const c of cells) {
        if (!c.alive || c.z > 0) continue;
        const gx = Math.floor(c.x / B), gy = Math.floor(c.y / B);
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
          const l = grid.get((gx + ox) * 100003 + gy + oy); if (!l) continue;
          for (const o of l) {
            if (o.id <= c.id) continue;
            // migrating neurons slip past settled ones (they move in 3-D through the plate)
            const slip = (c.migrating !== o.migrating) ? 0.25 : 1;
            const dx = X[o.nuc] - X[c.nuc], dy = Y[o.nuc] - Y[c.nuc], d = hyp(dx, dy) || 1e-6, rr = c.rOut + o.rOut;
            if (d > rr) continue;
            const ov = rr * 0.72 - d;
            if (ov > 0) { const f = 0.06 * slip * ov / d; FX[c.nuc] -= f * dx; FY[c.nuc] -= f * dy; FX[o.nuc] += f * dx; FY[o.nuc] += f * dy; }
            for (const [A, Bc] of [[c, o], [o, c]]) {
              const bx = X[Bc.nuc], by = Y[Bc.nuc], lim = Bc.rOut * 0.85;
              for (let k = 0; k < NR; k++) { const i = A.ring[k]; const ex = X[i] - bx, ey = Y[i] - by, el = hyp(ex, ey) || 1e-6; if (el < lim) { const g = 0.05 * slip * (lim - el) / el; FX[i] += g * ex; FY[i] += g * ey; } }
            }
          }
        }
      }
    }

    // ------------------------------------------------------------ adhesion + integration
    _integrate(dt, sc = 1) {
      const p = this.p, N = this.N, n = N.n, cells = this.cells, env = this.env;
      const X = N.x, Y = N.y, FX = N.fx, FY = N.fy, AX = N.ax, AY = N.ay, ANC = N.anc, KD = N.kind, MOB = N.mob, BRK = N.brk;
      const kA = 0.15, maxStep = 0.8 * sc, st = p.stickiness, reRing = 1.0 * st * dt, reShaft = 0.6 * st * dt, reTip = 0.4 * dt;
      const W = this.W, H = this.H, margin = 4, walls = this._hasWalls, esc = this._o2;
      for (const c of cells) if (c.alive) { c.box[0] = c.box[1] = 1e9; c.box[2] = c.box[3] = -1e9; }
      for (let i = 0; i < n; i++) {
        if (!N.alive[i]) continue;
        const c = cells[N.cell[i]], kd = KD[i];
        if (c.z > 0) ANC[i] = 0;
        else if (kd !== K_NUC) {
          if ((i & 7) === (this.steps & 7)) N.adhl[i] = this._localAdh(X[i], Y[i]);
          const loc = N.adhl[i];
          let brk;
          if (kd === K_RING) brk = 0.05 * st * (0.15 + 0.85 * c.adh) * (1 - 0.85 * c.pulse) * Math.min(1.6, c.adhLoc) * (c.dying >= 0 || c.mitosis >= 0 ? 0.3 : 1) * (c.plate ? 0.12 : 1);
          else if (kd === K_SHAFT) brk = 0.07 * st * (1 - 0.7 * c.pulse) * Math.min(1.6, loc);
          else brk = BRK[i] * st;
          if (ANC[i]) {
            const dx = AX[i] - X[i], dy = AY[i] - Y[i];
            if (kA * hyp(dx, dy) > brk) ANC[i] = 0; else { FX[i] += kA * dx; FY[i] += kA * dy; }
          } else {
            const r = kd === K_RING ? reRing * (0.2 + 0.8 * c.adh) * Math.min(1.5, c.adhLoc) : kd === K_SHAFT ? reShaft * Math.min(1.5, loc) : reTip * (1 + 40 * (BRK[i] - 0.02));
            if (this.rand() < r) { ANC[i] = 1; AX[i] = X[i]; AY[i] = Y[i]; }
          }
        }
        let dx = MOB[i] * FX[i] * sc, dy = MOB[i] * FY[i] * sc;
        const dl = hyp(dx, dy);
        if (dl > maxStep) { dx *= maxStep / dl; dy *= maxStep / dl; }
        let x = X[i] + dx, y = Y[i] + dy;
        if (x < margin) x = margin; else if (x > W - margin) x = W - margin;
        if (y < margin) y = margin; else if (y > H - margin) y = H - margin;
        if (walls && env.isWall(x, y) && env.escape(x, y, esc)) { x = esc[0]; y = esc[1]; ANC[i] = 0; }
        X[i] = x; Y[i] = y;
        const b = c.box, r = N.w[i] + 1;
        if (x - r < b[0]) b[0] = x - r; if (y - r < b[1]) b[1] = y - r;
        if (x + r > b[2]) b[2] = x + r; if (y + r > b[3]) b[3] = y + r;
      }
      for (const c of cells) if (c.alive) { const pad = c.T.probes.maxLen + 2; c.box[0] -= pad; c.box[1] -= pad; c.box[2] += pad; c.box[3] += pad; }
    }

    // ------------------------------------------------------------ sensing: other cells, cue fields, glia
    _chemo() {
      const p = this.p, N = this.N, cells = this.cells, R = p.senseRange, lam = R / 2.5, grid = new Map();
      for (const c of cells) {
        if (!c.alive || c.z > 0 || c.dying >= 0) continue;
        const k = Math.floor(c.x / R) * 100003 + Math.floor(c.y / R);
        let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(c);
      }
      const sense = (x, y, self, out) => {
        let gx = 0, gy = 0;
        const bx = Math.floor(x / R), by = Math.floor(y / R);
        if (p.seek > 0) for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
          const l = grid.get((bx + ox) * 100003 + by + oy); if (!l) continue;
          for (const o of l) {
            if (o.id === self) continue;
            const dx = o.x - x, dy = o.y - y, d = hyp(dx, dy);
            if (d > R || d < 1) continue;
            const w = p.seek * o.T.secretes * Math.exp(-d / lam) / (1 + 0.3 * o.conn);
            gx += w * dx / d; gy += w * dy / d;
          }
        }
        const sc = cells[self], dx = x - sc.x, dy = y - sc.y, d = hyp(dx, dy);
        if (d > 1) { const w = p.selfAvoidSoma * Math.exp(-d / 60); gx += w * dx / d; gy += w * dy / d; }
        const g = hyp(gx, gy), s = 1 / (g + 0.04);
        out[0] = gx * s; out[1] = gy * s;
      };
      const out = [0, 0];
      for (const c of cells) { if (!c.alive || c.z > 0) continue; sense(c.x, c.y, c.id, out); c.cx = out[0]; c.cy = out[1]; }
      for (const nr of this.neurites) {
        if (!nr || !nr.alive) continue;
        const tip = nr.nodes[nr.nodes.length - 1];
        sense(N.x[tip], N.y[tip], nr.cell, out); nr.cx = out[0]; nr.cy = out[1];
      }
    }
    // gradient sensing with noise and adaptation (Weber-law relative gradient across a ~10 µm cone)
    _fieldSense() {
      const p = this.p, N = this.N, fields = this.env.fields, o = this._o3, dGC = 10, dtS = p.dt * 5;
      for (const f of fields) if (f.peak == null) f.peak = Math.max(1e-9, f.max());
      for (const nr of this.neurites) {
        if (!nr || !nr.alive) continue;
        if (!nr.fad || nr.fad.length !== fields.length) nr.fad = new Float32Array(fields.length);
        const tip = nr.nodes[nr.nodes.length - 1], x = N.x[tip], y = N.y[tip];
        let bx = 0, by = 0;
        for (let k = 0; k < fields.length; k++) {
          const f = fields[k]; let eff = f.effect[IDENT_NAME[nr.ident]] || 0;
          if (!eff || (f.start > 0 && this.t < f.start)) continue;   // a cue can be switched on at a set time
          if (f.campSwitch && p.cAMP < 0.5) eff = -eff;
          f.sample(x, y, o);
          const c = o[0] / f.peak, g = hyp(o[1], o[2]) / f.peak, kd = 0.02;
          nr.fad[k] += (c - nr.fad[k]) * Math.min(1, dtS / 30);
          const rel = g * dGC / (c + kd);
          const snr = rel / p.senseThreshold;
          const w = p.fieldGain * f.gain * eff * Math.tanh(snr) * (0.5 / (0.5 + nr.fad[k]));
          const sig = p.senseNoise / (1 + snr);
          const th = Math.atan2(o[2], o[1]) + sig * this.gauss();
          bx += w * Math.cos(th); by += w * Math.sin(th);
        }
        nr.fx = bx; nr.fy = by;
      }
    }
    _astroRaster() {
      const env = this.env, A = env.astro, p = this.p;
      let any = false; for (const c of this.cells) if (c.alive && c.T.key === 'astrocyte') { any = true; break; }
      if (!any && !this._hadAstro) return;
      // diffusible glial support: each landed astrocyte contributes exp(-d/gliaRange) at a neuron's soma,
      // saturating (two astrocytes close by give half of gliaDiffuse)
      const astro = this.cells.filter((c) => c.alive && c.T.key === 'astrocyte' && c.z === 0);
      const lam = Math.max(1, p.gliaRange), cut = 5 * lam;
      for (const c of this.cells) {
        if (!c.alive || c.T.glia) continue;
        let s = 0;
        for (const a of astro) { const d = hyp(a.x - c.x, a.y - c.y); if (d < cut) s += Math.exp(-d / lam); }
        c.gliaSup = p.gliaDiffuse * s / (s + 2);
      }
      A.fill(0); this._hadAstro = any;
      const res = env.res;
      for (const c of this.cells) {
        if (!c.alive || c.T.key !== 'astrocyte' || c.z > 0) continue;
        const r = c.rOut * 0.95, i0 = Math.max(0, ((c.x - r) / res) | 0), i1 = Math.min(env.gw - 1, ((c.x + r) / res) | 0);
        const j0 = Math.max(0, ((c.y - r) / res) | 0), j1 = Math.min(env.gh - 1, ((c.y + r) / res) | 0);
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const x = (i + 0.5) * res, y = (j + 0.5) * res;
          if ((x - c.x) ** 2 + (y - c.y) ** 2 < r * r) A[i + j * env.gw] = 1;
        }
      }
    }

    // ------------------------------------------------------------ queries
    stats() {
      const N = this.N;
      let cells = 0, glia = 0, neur = 0, len = 0, probes = 0, syn = 0, nodes = 0, stuck = 0, axons = 0;
      const stage = [0, 0, 0, 0, 0, 0];
      for (const c of this.cells) if (c.alive) { cells++; if (c.T.glia) glia++; else stage[c.stage]++; }
      for (const nr of this.neurites) if (nr && nr.alive) { neur++; len += nr.len; if (nr.ident === I_AXON && nr.parent < 0) axons++; }
      for (const pr of this.probes) if (pr && pr.alive) { probes++; if (pr.st >= P_STUCK) stuck++; }
      for (const b of this.bonds) if (b && b.alive) syn++;
      for (let i = 0; i < N.n; i++) if (N.alive[i]) nodes++;
      return { t: this.t, div: this.p.startDIV + this.t / 1440, cells, glia, neurons: cells - glia, neurites: neur, axons, meanLen: neur ? len / neur : 0, totalLen: len,
        probes, adheredProbes: stuck, synapses: syn, nodes, largestCluster: this.largestCluster(), deaths: this.deaths, divisions: this.divisions,
        stages: stage, meanRate: this.activity.meanRate, active: this.activity.activeCount, bursts: this.activity.bursts };
    }
    largestCluster() {
      const cells = this.cells, n = cells.length, par = new Int32Array(n);
      for (let i = 0; i < n; i++) par[i] = i;
      const f = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
      for (const b of this.bonds) if (b && b.alive) { const a = f(b.ca), c = f(b.cb); if (a !== c) par[a] = c; }
      const cnt = new Map(); let best = 0;
      for (let i = 0; i < n; i++) if (cells[i].alive && !cells[i].T.glia) { const r = f(i); const v = (cnt.get(r) || 0) + 1; cnt.set(r, v); if (v > best) best = v; }
      return best;
    }
    cellAt(x, y, r = 12) {
      let best = null, bd = 1e18;
      for (const c of this.cells) { if (!c.alive) continue; const d = (c.x - x) ** 2 + (c.y - y) ** 2; if (d < bd && d < (c.rOut + r) ** 2) { bd = d; best = c; } }
      return best;
    }
    metrics(c) { return Morpho.cellMetrics(this, c); }
    population() { return Morpho.populationMetrics(this); }
    swc(c) { return Morpho.toSWC(this, c); }

    // ------------------------------------------------------------ compact snapshot for a renderer / worker
    snapshot() {
      const N = this.N, n = N.n;
      const nodes = { n, x: new Float32Array(N.x.subarray(0, n)), y: new Float32Array(N.y.subarray(0, n)), w: N.w.slice(0, n), act: N.act.slice(0, n), mt: N.mt.slice(0, n),
        ax: new Float32Array(N.ax.subarray(0, n)), ay: new Float32Array(N.ay.subarray(0, n)), anc: N.anc.slice(0, n), kind: N.kind.slice(0, n), ident: N.ident.slice(0, n), patch: N.patch.slice(0, n) };
      const CS = 34, live = this.cells.filter((c) => c.alive), cf = new Float32Array(live.length * CS), ring = new Int32Array(live.length * NR);
      const nl = [], probeL = [];
      live.forEach((c, k) => {
        const o = k * CS;
        cf.set([c.id, c.x, c.y, c.rOut, c.R0, c.z, c.a, c.h, c.theta, c.Rcap, c.hue, CellTypes.typeKeys().indexOf(c.T.key), c.stage, c.ca, c.troph,
          c.dying, c.migrating ? 1 : 0, c.nuc, c.box[0], c.box[1], c.box[2], c.box[3], c.conn, c.T.glia ? 1 : 0, c.mitosis, c.rate, c.Q / c.T.somaCap, c.adh, c.T.inhibitory ? 1 : 0, c.age, c.spk, c.pulse, c.msp, c.lowT], o);
        ring.set(c.ring, k * NR);
        for (const id of c.neur) nl.push(this.neurites[id]);
        for (const pid of c.probes) { const pr = this.probes[pid]; if (pr.alive) probeL.push(pr); }
        for (const id of c.neur) for (const pid of this.neurites[id].probes) { const pr = this.probes[pid]; if (pr.alive) probeL.push(pr); }
      });
      const NM = 10, NF = 8, nm = new Int32Array(nl.length * NM), nfl = new Float32Array(nl.length * NF);
      let tot = 0; for (const nr of nl) tot += nr.nodes.length;
      const nn = new Int32Array(tot); let off = 0;
      const cellSlot = new Map(); live.forEach((c, k) => cellSlot.set(c.id, k));
      const neuSlot = new Map(); nl.forEach((nr, k) => neuSlot.set(nr.id, k));
      nl.forEach((nr, k) => {
        nm.set([nr.id, cellSlot.get(nr.cell), nr.parent >= 0 ? (neuSlot.has(nr.parent) ? neuSlot.get(nr.parent) : -1) : -1, nr.base, nr.ident, nr.state, off, nr.nodes.length, nr.apical ? 1 : 0, (nr.dying ? 1 : 0) | (nr.order << 1)], k * NM);
        nfl.set([nr.gc, nr.len, nr.hx, nr.hy, nr.S, nr.T / TIPCAP, nr.waves.length, nr.vNow], k * NF);
        nn.set(nr.nodes, off); off += nr.nodes.length;
      });
      const PS = 8, pf = new Float32Array(probeL.length * PS);
      probeL.forEach((pr, k) => { const tp = this.probeTip(pr); pf.set([pr.base, tp[0], tp[1], pr.st, pr.kind, pr.len, pr.ph, pr.owner >= 0 ? neuSlot.get(pr.owner) ?? -1 : -1 - cellSlot.get(pr.cell)], k * PS); });
      const bl = this.bonds.filter((b) => b && b.alive), BS = 6, bf = new Float32Array(bl.length * BS);
      bl.forEach((b, k) => bf.set([b.a, b.b, b.w, b.inhib ? 1 : 0, b.ca, b.cb], k * BS));
      const sp = this.activity.nSpikes, spikes = new Float32Array(sp * 2);
      for (let s = 0; s < sp; s++) { spikes[2 * s] = this.activity.spikeCell[s]; spikes[2 * s + 1] = this.activity.spikeT[s]; }
      const ev = this.events.splice(0, this.events.length);
      return { t: this.t, W: this.W, H: this.H, dt: this.p.dt, window: this.p.ephysWindow, nodes, cells: { CS, n: live.length, f: cf, ring }, neurites: { NM, NF, n: nl.length, meta: nm, f: nfl, nodes: nn },
        probes: { PS, n: probeL.length, f: pf }, bonds: { BS, n: bl.length, f: bf }, spikes, events: ev, envVersion: this.env.version };
    }
    transferables(s) {
      const n = s.nodes;
      return [n.x.buffer, n.y.buffer, n.w.buffer, n.act.buffer, n.mt.buffer, n.ax.buffer, n.ay.buffer, n.anc.buffer, n.kind.buffer, n.ident.buffer, n.patch.buffer,
        s.cells.f.buffer, s.cells.ring.buffer, s.neurites.meta.buffer, s.neurites.f.buffer, s.neurites.nodes.buffer, s.probes.f.buffer, s.bonds.f.buffer, s.spikes.buffer];
    }
  }

  NeuriteEngine.capHeight = capHeight;
  return { NeuriteEngine, CellTypes, Environment, Clutch, Activity, Morpho };
});
