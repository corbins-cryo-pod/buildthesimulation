/*
 * NeuriteEngine — soft-bodied neurons on glass (2.5-D, top-down)
 * ----------------------------------------------------------------
 * Units: micrometres (µm) and minutes. One step = p.dt minutes of biology.
 * Mechanics are overdamped (low Reynolds number), so springs relax within a few
 * steps and the biology (growth, waves, adhesion turnover) sets the pace.
 *
 * Body plan of one cell
 *   soma     : a closed membrane ring (NR nodes) + one nucleus node. The ring is
 *              very soft: an area-pressure term, weak edge/smoothing springs and
 *              weak "spokes" to the nucleus. Its footprint comes from a
 *              spherical-cap spreading law (Young–Dupré with a membrane reservoir),
 *              so a soft, sticky sphere flattens into a dome or a pancake.
 *   neurites : chains of nodes from a ring node (or a branch node) to a tip.
 *              Segment springs carry actomyosin tension; bending stiffness is set
 *              by the local microtubule (MT) density, so the skeleton is flexible.
 *              Every node holds the glass through slip bonds that break and re-form.
 *   probes   : MT-cored spikes (filopodia) that sprout from tips, the soma, and
 *              from shafts when an actin wave passes. They show dynamic instability
 *              (grow / catastrophe / shrink / rescue), wander randomly, stick to
 *              glass sometimes and to other cells readily. A stuck probe is a
 *              tether plus a constant traction pull, so it drags the tip (and the
 *              cell) toward what it touched.
 *   waves    : actin waves launched from the soma travel out along a neurite at
 *              constant speed (arrival time grows with distance), widen the shaft,
 *              deposit MTs behind them, sprout lateral probes at corners and
 *              contacts, and give the growth cone a growth spurt when they arrive.
 *   bonds    : when a tip's probe is bound to another cell and the tip reaches it,
 *              a synapse-like bond forms.
 *
 * Population scale: structure-of-arrays node pool, a hashed spatial grid for all
 * contacts, and O(1)-ish per-node work. Nothing here touches the DOM, so the same
 * file runs headless in Node (require('./engine.js')) or in a Web Worker.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NeuriteEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TAU = Math.PI * 2;
  const hyp = (x, y) => Math.sqrt(x * x + y * y);
  const NR = 18;                       // ring nodes per soma

  // node kinds
  const K_RING = 1, K_NUC = 2, K_SHAFT = 3, K_TIP = 4;
  // probe states / kinds
  const P_GROW = 0, P_SHRINK = 1, P_STUCK = 2, P_BOUND = 3;
  const PK_CONE = 0, PK_LAT = 1, PK_SOMA = 2;
  // neurite states
  const N_GROW = 0, N_RETRACT = 1, N_CONN = 2;

  const DEFAULTS = {
    dt: 0.05,              // minutes per step (3 s)
    // ---- soma: softness & adhesion
    somaRadius: 6.5,       // µm, radius of the free (spherical) cell
    softness: 0.7,         // 0..1  -> adhesion/tension ratio W/γ from 0.15 to 2 (2 = complete wetting)
    reservoir: 1.5,        // membrane available / sphere area (Infinity = unlimited)
    minThickness: 0.6,     // µm, thinnest a pancake can get
    spreadRate: 0.12,      // 1/min, how fast the footprint relaxes to equilibrium
    fallSpeed: 12,         // µm/min while a dropped cell sinks to the glass
    stickiness: 1.0,       // multiplies every adhesion (glass anchors, probes, cell-cell)
    cortexNoise: 1.0,      // membrane/cortex fluctuations
    // ---- neurites
    maxNeurites: 6,
    initRate: 1.0,         // neurite initiations per hour while below max
    segLen: 3.5,           // µm between skeleton nodes
    growthSpeed: 1.0,      // µm/min tip advance at full drive
    retractSpeed: 0.3,     // µm/min
    retractDelay: 35,      // min without an actin wave before a neurite may retract
    contractility: 0.04,   // resting actomyosin line tension along every shaft (force units)
    viscosity: 3,          // min: shafts flow plastically (rest lengths relax to actual length)
    stiffness: 1.0,        // MT bending stiffness multiplier
    turnNoise: 0.05,       // rad/√min random steering of growth cones
    maxLength: 1200,       // µm cap per neurite
    // ---- actin waves (Winans et al. 2016: 2–3 µm/min, 1–2 per hour per neurite)
    waveRate: 1.6,         // per hour per primary neurite
    waveSpeed: 2.5,        // µm/min
    waveWidth: 5,          // µm
    polarity: 0.5,         // positive feedback: neurites that got waves get more (axon choice)
    // ---- MT probes (filopodia with MT cores)
    probesPerCone: 6,
    somaProbes: 3,
    probeSpeed: 6,         // µm/min polymerisation
    probeShrink: 14,       // µm/min depolymerisation
    catastrophe: 0.5,      // per min (rises with length)
    rescue: 0.4,           // per min
    probeMaxLen: 9,        // µm
    probeWander: 0.5,      // rad/√min
    glassStick: 0.5,       // per min: chance to adhere to glass while growing
    cellStick: 8,          // per min: chance to bind when touching another cell
    probePull: 0.03,       // traction per stuck probe
    // ---- branching
    branchRate: 0.6,
    maxBranchDepth: 3,
    // ---- seeking other cells
    seek: 0.6,
    senseRange: 260,       // µm
    selfAvoid: 0.3,        // neurites turn away from their own soma
    // ---- migration (worm-like nucleokinesis pulses)
    pulsePeriod: 0,        // min; 0 = off
    pulseStrength: 0.3,    // nucleokinesis: pull on the nucleus toward the leading process during a pulse
    // ---- connections
    synapses: true,
    synapseOnNeurite: 0.35,  // chance a cone that reaches another cell's neurite synapses (else it follows it)
    contactEvery: 1,       // contact pass every N steps
  };

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Height of a spherical cap with contact radius a and volume V.
  // Solves h^3 + 3a^2 h - 6V/π = 0 (one real root). a = 0 gives the sphere (h = 2R).
  function capHeight(a, V) {
    const Q = 6 * V / Math.PI, P = 3 * a * a;
    const D = Math.sqrt(Q * Q / 4 + P * P * P / 27);
    return Math.cbrt(Q / 2 + D) + Math.cbrt(Q / 2 - D);
  }

  // ------------------------------------------------------------------ node pool
  class Nodes {
    constructor(cap) { this.cap = 0; this.n = 0; this.free = []; this._grow(Math.max(256, cap | 0)); }
    _grow(cap) {
      const mk = (T, k) => { const a = new T(cap); if (this[k]) a.set(this[k]); this[k] = a; };
      for (const k of ['x', 'y', 'fx', 'fy', 'ax', 'ay']) mk(Float64Array, k);
      for (const k of ['w', 'mt', 'act', 'nz', 'mob', 'brk', 'rl']) mk(Float32Array, k);
      for (const k of ['anc', 'kind', 'alive', 'touch']) mk(Uint8Array, k);
      for (const k of ['cell', 'neu']) mk(Int32Array, k);
      mk(Uint32Array, 'gen');
      this.cap = cap;
    }
    alloc(x, y, kind, cell, neu) {
      let i;
      if (this.free.length) i = this.free.pop();
      else { if (this.n >= this.cap) this._grow(this.cap * 2); i = this.n++; }
      this.x[i] = x; this.y[i] = y; this.fx[i] = 0; this.fy[i] = 0;
      this.ax[i] = x; this.ay[i] = y; this.anc[i] = 0;
      this.kind[i] = kind; this.cell[i] = cell; this.neu[i] = neu;
      this.w[i] = 0.6; this.mt[i] = 0.2; this.act[i] = 0; this.nz[i] = 0; this.brk[i] = 0.05; this.rl[i] = 1;
      this.mob[i] = kind === K_NUC ? 0.35 : 0.85;
      this.touch[i] = 0; this.alive[i] = 1;
      return i;
    }
    release(i) { this.alive[i] = 0; this.gen[i]++; this.anc[i] = 0; this.free.push(i); }
  }

  // ------------------------------------------------------------------ engine
  class NeuriteEngine {
    constructor(opts = {}) {
      this.p = Object.assign({}, DEFAULTS, opts.params || {});
      this.W = opts.width || 600; this.H = opts.height || 400;
      this.rand = mulberry32(opts.seed != null ? opts.seed : 1234);
      this._spare = null;
      this.t = 0; this.steps = 0;
      this.N = new Nodes(opts.capacity || 4096);
      this.cells = [];
      this.neurites = []; this._freeNeu = [];
      this.probes = []; this._freeProbe = [];
      this.bonds = []; this._freeBond = [];
      this.events = [];
      // uniform spatial grid over the coverslip (cell size hs >= contact range)
      this.hs = 6.0;
      this.gw = Math.ceil(this.W / this.hs) + 3; this.gh = Math.ceil(this.H / this.hs) + 3;
      this.hStart = new Int32Array(this.gw * this.gh + 1);
      this.hCur = new Int32Array(this.gw * this.gh);
      this.hItems = new Int32Array(4096);
      this.hKey = new Int32Array(4096);
      this._arc = new Float64Array(512);
      this._visited = new Int32Array(9);
    }

    static get DEFAULTS() { return Object.assign({}, DEFAULTS); }
    static get NR() { return NR; }
    static get KIND() { return { RING: K_RING, NUC: K_NUC, SHAFT: K_SHAFT, TIP: K_TIP }; }
    static get PROBE() { return { GROW: P_GROW, SHRINK: P_SHRINK, STUCK: P_STUCK, BOUND: P_BOUND, CONE: PK_CONE, LATERAL: PK_LAT, SOMA: PK_SOMA }; }
    static get NSTATE() { return { GROW: N_GROW, RETRACT: N_RETRACT, CONN: N_CONN }; }

    setParams(o) { Object.assign(this.p, o); for (const c of this.cells) c.aEq = -1; }

    gauss() {
      if (this._spare !== null) { const s = this._spare; this._spare = null; return s; }
      let u = 0, v = 0; while (u === 0) u = this.rand(); v = this.rand();
      const r = Math.sqrt(-2 * Math.log(u)); this._spare = r * Math.sin(TAU * v); return r * Math.cos(TAU * v);
    }

    // ------------------------------------------------------------ creation
    /**
     * Add a cell. opts: { z: drop height µm, maxNeurites, maxLen, angle, polarAngle }
     */
    addCell(x, y, opts = {}) {
      const p = this.p, N = this.N;
      const id = this.cells.length;
      const R0 = opts.radius || p.somaRadius * (0.92 + 0.16 * this.rand());
      const c = {
        id, alive: true, R0, V: 4 / 3 * Math.PI * R0 * R0 * R0,
        a: 0, aEq: -1, h: 2 * R0, theta: Math.PI, Rcap: R0, rOut: R0, adh: 0,
        z: opts.z != null ? opts.z : 0, age: 0, landedAt: 0,
        ring: new Int32Array(NR), nuc: -1, slotUse: new Int8Array(NR),
        neur: [], nPrim: 0, nub: null, probes: [],
        maxNeurites: opts.maxNeurites != null ? opts.maxNeurites : p.maxNeurites,
        maxLen: opts.maxLen != null ? opts.maxLen : p.maxLength,
        polarAngle: opts.polarAngle != null ? opts.polarAngle : null,
        pulse: 0, pulseOff: this.rand() * 1000, conn: 0,
        cx: 0, cy: 0, hue: opts.hue != null ? opts.hue : this.rand(),
        box: [x - R0, y - R0, x + R0, y + R0], x, y,
      };
      c.nuc = N.alloc(x, y, K_NUC, id, -1);
      const a0 = opts.angle || 0;
      for (let k = 0; k < NR; k++) {
        const ang = a0 + TAU * k / NR;
        const i = N.alloc(x + R0 * Math.cos(ang), y + R0 * Math.sin(ang), K_RING, id, -1);
        N.w[i] = 0; c.ring[k] = i;
      }
      if (c.z === 0) { c.aEq = this._aEq(c); c.a = opts.spread ? c.aEq : 0; }
      this.cells.push(c);
      return c;
    }

    _newNeurite(c, parentId, baseNode, tipNode, hx, hy, depth) {
      const N = this.N;
      let id;
      if (this._freeNeu.length) id = this._freeNeu.pop(); else { id = this.neurites.length; this.neurites.push(null); }
      const nr = {
        id, cell: c.id, alive: true, parent: parentId, base: baseNode, baseGen: N.gen[baseNode], slot: -1,
        nodes: [tipNode], hx, hy, drive: 1.0, gc: 0.6, kin: 0, lastWave: this.t, born: this.t,
        state: N_GROW, waves: [], probes: [], children: [], depth, bond: -1, len: 0,
        cx: 0, cy: 0, stuck: 0,
      };
      this.neurites[id] = nr;
      N.neu[tipNode] = id; N.kind[tipNode] = K_TIP; N.w[tipNode] = 0.9; N.mt[tipNode] = 0.6;
      c.neur.push(id);
      return nr;
    }

    _newProbe(base, cell, owner, kind, ang, maxLen) {
      let id;
      if (this._freeProbe.length) id = this._freeProbe.pop(); else { id = this.probes.length; this.probes.push(null); }
      const pr = {
        id, alive: true, base, baseGen: this.N.gen[base], cell, owner, kind,
        ang, len: 0.3, maxLen, st: P_GROW, tx: 0, ty: 0, Lref: 0,
        tgt: -1, tgtGen: 0, tgtCell: -1, age: 0, ph: this.rand() * TAU,
      };
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
      nr.alive = false; nr.nodes = []; nr.probes = []; nr.waves = [];
      this._freeNeu.push(nr.id);
    }

    removeCell(c) {
      if (!c.alive) return;
      for (const id of c.neur.slice()) { const nr = this.neurites[id]; if (nr && nr.alive && nr.parent < 0) this._removeNeurite(nr); }
      for (const pid of c.probes) { const pr = this.probes[pid]; if (pr && pr.alive) this._killProbe(pr, true); }
      for (const k of c.ring) this.N.release(k);
      this.N.release(c.nuc);
      c.alive = false;
    }

    // ------------------------------------------------------------ geometry of spreading
    _wg() { return 0.15 + 1.85 * Math.min(1, Math.max(0, this.p.softness)); }

    _aEq(c) {
      const p = this.p, V = c.V;
      const cosT = Math.min(1, Math.max(-1, this._wg() - 1));
      const th = Math.acos(cosT);
      const aMax = Math.sqrt(2 * V / (Math.PI * p.minThickness));
      let a;
      if (th < 1e-3) a = aMax;
      else { const t = Math.tan(th / 2); a = Math.min(aMax, Math.cbrt(6 * V / (Math.PI * t * (3 + t * t)))); }
      if (isFinite(p.reservoir)) {
        const Smax = p.reservoir * 4 * Math.PI * c.R0 * c.R0;
        const S = (aa) => { const h = capHeight(aa, V); return Math.PI * (2 * aa * aa + h * h); };
        if (S(a) > Smax) { let lo = 0, hi = a; for (let k = 0; k < 32; k++) { const m = (lo + hi) / 2; if (S(m) > Smax) hi = m; else lo = m; } a = lo; }
      }
      return a;
    }

    _capGeom(c) {
      const a = c.a, h = capHeight(a, c.V);
      c.h = h;
      if (a < 1e-6) { c.theta = Math.PI; c.Rcap = c.R0; c.rOut = c.R0; c.adh = 0; return; }
      c.theta = 2 * Math.atan(h / a);
      c.Rcap = (a * a + h * h) / (2 * h);
      c.rOut = c.theta > Math.PI / 2 ? c.Rcap : a;
      c.adh = a / c.rOut;
    }

    // ------------------------------------------------------------ main step
    step(n = 1) {
      for (let k = 0; k < n; k++) this._step();
    }

    _step() {
      const p = this.p, dt = p.dt;
      this.t += dt; this.steps++;
      this._cellsBio(dt);
      this._neuritesBio(dt);
      this._probesBio(dt);
      this._bondsBio();
      // mechanics
      const N = this.N, n = N.n;
      N.fx.fill(0, 0, n); N.fy.fill(0, 0, n);
      this._somaForces(dt);
      this._neuriteForces();
      this._probeForces();
      this._bondForces();
      if (this.steps % p.contactEvery === 0) { this._buildHash(); this._contacts(p.contactEvery); }
      this._cellRepulsion();
      this._integrate(dt);
      if (this.steps % 10 === 1) this._chemo();
    }

    // ------------------------------------------------------------ cells: spreading, pulses, initiation, waves
    _cellsBio(dt) {
      const p = this.p, N = this.N;
      for (const c of this.cells) {
        if (!c.alive) continue;
        c.age += dt;
        if (c.z > 0) { c.z = Math.max(0, c.z - p.fallSpeed * dt); if (c.z === 0) c.landedAt = this.t; }
        if (c.aEq < 0 || this.steps % 20 === 0) c.aEq = this._aEq(c);
        if (c.z === 0) {
          // a sphere touching glass starts from a small contact patch
          if (c.a < 0.5) c.a = 0.5;
          c.a += (c.aEq - c.a) * (1 - Math.exp(-p.spreadRate * dt));
        } else c.a = 0;
        this._capGeom(c);
        if (p.pulsePeriod > 0) {
          const ph = ((this.t + c.pulseOff) % p.pulsePeriod) / p.pulsePeriod;
          c.pulse = ph < 0.3 ? Math.sin(Math.PI * ph / 0.3) : 0;
        } else c.pulse = 0;
        c.x = N.x[c.nuc]; c.y = N.y[c.nuc];
        if (c.z > 0) continue;
        const settled = this.t - c.landedAt > 3 || c.age > 3;

        // neurite initiation: a nub forms, probes pop out of it, then it sprouts
        if (c.nub) {
          c.nub.t += dt;
          if (c.nub.t >= c.nub.dur) this._sprout(c);
        } else if (settled && c.nPrim < c.maxNeurites &&
          this.rand() < p.initRate / 60 * dt * (c.nPrim === 0 ? 3 : 1)) this._startNub(c);

        // actin waves launched from the soma into a primary neurite
        let nprim = 0;
        for (const id of c.neur) { const nr = this.neurites[id]; if (nr.parent < 0) nprim++; }
        if (nprim > 0 && this.rand() < p.waveRate / 60 * dt * nprim) {
          let tot = 0; const ws = [];
          for (const id of c.neur) {
            const nr = this.neurites[id]; if (nr.parent >= 0) continue;
            const w = 1 + p.polarity * nr.kin * nr.kin; ws.push([nr, w]); tot += w;
          }
          let r = this.rand() * tot;
          for (const [nr, w] of ws) { r -= w; if (r <= 0) { nr.waves.push({ s: 0, amp: 0.8 + 0.4 * this.rand() }); break; } }
        }

        // short MT probes from the soma (the radial "star"), concentrated on a forming nub
        const target = p.somaProbes + (c.nub ? 4 : 0);
        if (c.probes.length < target && this.rand() < dt * 3) {
          const slot = (c.nub && this.rand() < 0.75) ? c.nub.slot : (this.rand() * NR) | 0;
          const b = c.ring[slot];
          const ox = N.x[b] - N.x[c.nuc], oy = N.y[b] - N.y[c.nuc];
          const ang = Math.atan2(oy, ox) + this.gauss() * 0.45;
          this._newProbe(b, c.id, -1, PK_SOMA, ang, p.probeMaxLen * (c.nub ? 0.9 : 0.55) * (0.6 + 0.8 * this.rand()));
        }
      }
    }

    _startNub(c) {
      const N = this.N, p = this.p;
      let best = -1, bestScore = -1e9;
      const nx = N.x[c.nuc], ny = N.y[c.nuc];
      for (let s = 0; s < NR; s++) {
        let ok = true;
        for (let d = -2; d <= 2; d++) if (c.slotUse[(s + d + NR) % NR] > 0) { ok = false; break; }
        if (!ok) continue;
        const b = c.ring[s];
        let ox = N.x[b] - nx, oy = N.y[b] - ny; const L = hyp(ox, oy) || 1; ox /= L; oy /= L;
        let score = this.rand();
        score += 1.2 * (ox * c.cx + oy * c.cy);
        if (c.polarAngle != null) score += 3 * (ox * Math.cos(c.polarAngle) + oy * Math.sin(c.polarAngle));
        if (score > bestScore) { bestScore = score; best = s; }
      }
      if (best < 0) return;
      c.nub = { slot: best, t: 0, dur: 6 + 10 * this.rand() };
      c.slotUse[best]++;
    }

    _sprout(c) {
      const N = this.N, s = c.nub.slot, b = c.ring[s];
      let ox = N.x[b] - N.x[c.nuc], oy = N.y[b] - N.y[c.nuc]; const L = hyp(ox, oy) || 1; ox /= L; oy /= L;
      const tip = N.alloc(N.x[b] + ox * 2.5, N.y[b] + oy * 2.5, K_TIP, c.id, -1);
      const nr = this._newNeurite(c, -1, b, tip, ox, oy, 0);
      N.rl[tip] = 2.5;
      nr.slot = s; c.nPrim++;
      // the probes that formed the nub become the first growth-cone probes
      for (const pid of c.probes) {
        const pr = this.probes[pid];
        if (pr.alive && pr.base === b) { pr.base = tip; pr.baseGen = N.gen[tip]; pr.owner = nr.id; pr.kind = PK_CONE; nr.probes.push(pid); }
      }
      c.probes = c.probes.filter((id) => this.probes[id].owner < 0);
      c.nub = null;
      this.events.push({ type: 'sprout', x: N.x[tip], y: N.y[tip], t: this.t, cell: c.id });
    }

    // ------------------------------------------------------------ neurites: waves, growth, structure
    _neuritesBio(dt) {
      const p = this.p, N = this.N, L0 = p.segLen;
      const decayD = Math.exp(-dt / 22), decayK = Math.exp(-dt / 200);
      for (let q = 0; q < this.neurites.length; q++) {
        const nr = this.neurites[q];
        if (!nr || !nr.alive) continue;
        const c = this.cells[nr.cell];
        if (!N.alive[nr.base] || N.gen[nr.base] !== nr.baseGen) { this._removeNeurite(nr); continue; }
        let nodes = nr.nodes, m = nodes.length - 1;
        // arc length
        if (this._arc.length < nodes.length + 1) this._arc = new Float64Array((nodes.length + 1) * 2);
        const arc = this._arc;
        let px = N.x[nr.base], py = N.y[nr.base], s = 0;
        for (let k = 0; k <= m; k++) { const i = nodes[k]; s += hyp(N.x[i] - px, N.y[i] - py); arc[k] = s; px = N.x[i]; py = N.y[i]; }
        nr.len = s;

        // waves travel outward; hand off into branches; arrive at the tip
        for (let wi = nr.waves.length - 1; wi >= 0; wi--) {
          const w = nr.waves[wi], s0 = w.s;
          w.s += p.waveSpeed * dt;
          for (const chId of nr.children) {
            const ch = this.neurites[chId]; const k = nodes.indexOf(ch.base);
            if (k >= 0 && arc[k] > s0 && arc[k] <= w.s && this.rand() < 0.5) ch.waves.push({ s: 0, amp: w.amp * 0.9 });
          }
          if (w.s >= nr.len) { nr.waves.splice(wi, 1); this._waveArrive(nr, w); }
        }
        // per-node actin, MT, width; lateral probes inside waves
        const W2 = p.waveWidth;
        const mtRelax = dt / 30;
        for (let k = 0; k <= m; k++) {
          const i = nodes[k], sk = arc[k];
          let act = 0;
          for (const w of nr.waves) {
            const d = (sk - w.s) / W2;
            if (d > -3 && d < 3) act += w.amp * Math.exp(-d * d);
            if (sk < w.s && sk > w.s - 5 * W2) N.mt[i] += 0.5 * dt * w.amp;   // MTs polymerise behind the wave
          }
          N.mt[i] += (0.18 - N.mt[i]) * mtRelax;
          if (N.mt[i] > 2.2) N.mt[i] = 2.2;
          if (k === m) act = Math.max(act, 0.55 * nr.gc);
          N.act[i] = act;
          const taper = nr.parent < 0 ? 1.6 * Math.exp(-sk / 6) : 0.6 * Math.exp(-sk / 4);
          const wT = 0.42 + 0.22 * Math.min(N.mt[i], 2) + 1.0 * Math.min(act, 1.5) + taper + (k === m ? 0.35 * nr.gc : 0);
          N.w[i] += (wT - N.w[i]) * Math.min(1, dt * 0.8);
          if (act > 0.35 && k < m && k > 0 && nr.probes.length < 24) {
            const a = nodes[k - 1], b = nodes[k + 1];
            const ux = N.x[i] - N.x[a], uy = N.y[i] - N.y[a], vx = N.x[b] - N.x[i], vy = N.y[b] - N.y[i];
            const lu = hyp(ux, uy) || 1, lv = hyp(vx, vy) || 1;
            const curv = 1 - (ux * vx + uy * vy) / (lu * lv);            // 0 straight … 2 hairpin
            const rate = p.branchRate * 0.35 * act * (1 + 10 * curv + 4 * N.touch[i]);
            if (this.rand() < rate * dt) {
              const side = this.rand() < 0.5 ? -1 : 1;
              const tang = Math.atan2(uy + vy, ux + vx);
              this._newProbe(i, c.id, nr.id, PK_LAT, tang + side * (Math.PI / 2 - 0.5 + this.gauss() * 0.35), p.probeMaxLen * 0.7 * (0.6 + 0.8 * this.rand()));
            }
          }
        }

        // growth cone
        const tip = nodes[m];
        nr.drive *= decayD; nr.kin *= decayK;
        const gcT = nr.state === N_CONN ? 0.35 : 0.25 + 0.75 * Math.min(1, nr.drive);
        nr.gc += (gcT - nr.gc) * Math.min(1, dt * 0.3);
        let stuck = 0, bound = 0, sx = 0, sy = 0;
        for (const pid of nr.probes) {
          const pr = this.probes[pid];
          if (pr.kind !== PK_CONE || pr.base !== tip) continue;
          if (pr.st === P_STUCK || pr.st === P_BOUND) {
            const [tx, ty] = this.probeTip(pr);
            let ux = tx - N.x[tip], uy = ty - N.y[tip]; const L = hyp(ux, uy) || 1; ux /= L; uy /= L;
            const wgt = pr.st === P_BOUND ? 1.6 : 0.3;
            sx += wgt * ux; sy += wgt * uy;
            if (pr.st === P_BOUND) bound++; else stuck++;
          }
        }
        nr.stuck = stuck + bound;

        if (nr.state === N_GROW) {
          // steering: persistence + pull of adhered probes + chemotaxis + noise
          let dx = nr.hx * 2 + sx + nr.cx, dy = nr.hy * 2 + sy + nr.cy;
          const ha = Math.atan2(nr.hy, nr.hx);
          let da = Math.atan2(dy, dx) - ha;
          while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
          const na = ha + da * Math.min(1, 0.4 * dt) + p.turnNoise * Math.sqrt(dt) * this.gauss();
          nr.hx = Math.cos(na); nr.hy = Math.sin(na);
          // advance (MT-driven protrusion, needs grip)
          let v = p.growthSpeed * Math.min(1.5, nr.drive) * (0.15 + 0.85 * Math.min(1, nr.stuck / 2));
          if (nr.len > c.maxLen) v = 0;
          if (v > 0) { const d = v * dt; N.x[tip] += nr.hx * d; N.y[tip] += nr.hy * d; N.ax[tip] += nr.hx * d; N.ay[tip] += nr.hy * d; }
          // stall -> retraction when no wave has arrived for a while
          if (nr.stuck === 0 || nr.drive < 0.12) {
            if (this.t - nr.lastWave > p.retractDelay && nr.drive < 0.2 && this.rand() < dt / 25) nr.state = N_RETRACT;
          }
        } else if (nr.state === N_RETRACT) {
          const prev = m > 0 ? nodes[m - 1] : nr.base;
          let ux = N.x[prev] - N.x[tip], uy = N.y[prev] - N.y[tip]; const L = hyp(ux, uy);
          if (L > 1e-6) { const d = Math.min(L, p.retractSpeed * dt); N.x[tip] += ux / L * d; N.y[tip] += uy / L * d; N.anc[tip] = 0; }
          for (const pid of nr.probes) { const pr = this.probes[pid]; if (pr.kind === PK_CONE && pr.st === P_GROW) pr.st = P_SHRINK; }
        }
        // tip adhesion strength (grip) comes from its adhered probes
        N.brk[tip] = 0.03 + 0.045 * stuck + 0.09 * bound;

        // spawn growth-cone probes
        if (nr.state === N_GROW) {
          let cone = 0;
          for (const pid of nr.probes) if (this.probes[pid].kind === PK_CONE) cone++;
          const target = Math.round(p.probesPerCone * (0.35 + 0.65 * Math.min(1, nr.gc)));
          if (cone < target && this.rand() < dt * 5) this._spawnConeProbe(nr);
        }

        this._maintain(nr, c);
      }
    }

    _spawnConeProbe(nr) {
      const p = this.p;
      const tip = nr.nodes[nr.nodes.length - 1];
      let ang = Math.atan2(nr.hy, nr.hx) + this.gauss() * 0.8;
      if ((nr.cx || nr.cy) && this.rand() < 0.5) {
        let da = Math.atan2(nr.cy, nr.cx) - ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
        ang += da * 0.6 * this.rand();
      }
      return this._newProbe(tip, nr.cell, nr.id, PK_CONE, ang, p.probeMaxLen * (0.5 + 0.7 * this.rand()) * (0.7 + 0.3 * Math.min(1.3, nr.gc)));
    }

    _waveArrive(nr, w) {
      const p = this.p, N = this.N;
      nr.drive = Math.min(2.0, nr.drive + 0.9 * w.amp);
      nr.gc = Math.min(1.6, nr.gc + 0.5);
      nr.kin += 1; nr.lastWave = this.t;
      if (nr.state === N_RETRACT) nr.state = N_GROW;
      const m = nr.nodes.length - 1;
      this.events.push({ type: 'wave', x: N.x[nr.nodes[m]], y: N.y[nr.nodes[m]], t: this.t, cell: nr.cell });
      if (nr.state === N_GROW) {
        for (let k = 0; k < 3; k++) this._spawnConeProbe(nr);
        // growth-cone splitting -> bifurcation
        if (m >= 2 && nr.depth < p.maxBranchDepth && this.rand() < 0.14 * p.branchRate) {
          const side = this.rand() < 0.5 ? -1 : 1;
          const ang = Math.atan2(nr.hy, nr.hx) + side * (0.55 + 0.6 * this.rand());
          this._branch(nr, nr.nodes[m - 1], Math.cos(ang), Math.sin(ang), null);
          // the parent cone veers to the other side
          const pa = Math.atan2(nr.hy, nr.hx) - side * 0.35; nr.hx = Math.cos(pa); nr.hy = Math.sin(pa);
        }
      }
    }

    _branch(parent, baseNode, dx, dy, probe) {
      const N = this.N, c = this.cells[parent.cell];
      if (parent.children.length >= 3 || parent.depth >= this.p.maxBranchDepth || c.neur.length >= 2 + c.maxNeurites * 2.5) return null;
      for (const chId of parent.children) if (this.neurites[chId].base === baseNode) return null;
      const tip = N.alloc(N.x[baseNode] + dx * 2.0, N.y[baseNode] + dy * 2.0, K_TIP, c.id, -1);
      const ch = this._newNeurite(c, parent.id, baseNode, tip, dx, dy, parent.depth + 1);
      N.rl[tip] = 2.0;
      ch.drive = 0.8; ch.gc = 0.5; ch.kin = 0;
      parent.children.push(ch.id);
      if (probe) {
        const l = parent.probes, k = l.indexOf(probe.id); if (k >= 0) { l[k] = l[l.length - 1]; l.pop(); }
        probe.base = tip; probe.baseGen = N.gen[tip]; probe.owner = ch.id; probe.kind = PK_CONE;
        ch.probes.push(probe.id);
      }
      this.events.push({ type: 'branch', x: N.x[baseNode], y: N.y[baseNode], t: this.t, cell: c.id });
      return ch;
    }

    _isBranchBase(nr, i) {
      for (const chId of nr.children) if (this.neurites[chId].base === i) return true;
      return false;
    }

    _reassignProbes(nr, from, to) {
      const N = this.N;
      for (const pid of nr.probes) { const pr = this.probes[pid]; if (pr.base === from) { pr.base = to; pr.baseGen = N.gen[to]; } }
    }

    // keep skeleton resolution: insert nodes in long segments, merge short ones,
    // let the soma swallow proximal nodes it has crawled over
    _maintain(nr, c) {
      const N = this.N, L0 = this.p.segLen, nodes = nr.nodes;
      let m = nodes.length - 1;
      // soma absorbs nodes it overruns (worm-like advance)
      if (nr.parent < 0 && m >= 1) {
        const i0 = nodes[0];
        const d = hyp(N.x[i0] - N.x[c.nuc], N.y[i0] - N.y[c.nuc]);
        if (d < c.rOut * 0.8 && !this._isBranchBase(nr, i0)) {
          const i1 = nodes[1];
          N.rl[i1] = hyp(N.x[i1] - N.x[nr.base], N.y[i1] - N.y[nr.base]);
          this._reassignProbes(nr, i0, i1); N.release(i0); nodes.splice(0, 1); return;
        }
      }
      let prev = nr.base;
      for (let k = 0; k <= m; k++) {
        const i = nodes[k];
        const d = hyp(N.x[i] - N.x[prev], N.y[i] - N.y[prev]);
        if (d > 1.6 * L0) {
          const ni = N.alloc((N.x[i] + N.x[prev]) / 2, (N.y[i] + N.y[prev]) / 2, K_SHAFT, nr.cell, nr.id);
          N.w[ni] = (N.w[i] + N.w[prev]) / 2 || 0.6; N.mt[ni] = N.mt[i]; N.anc[ni] = 1; N.ax[ni] = N.x[ni]; N.ay[ni] = N.y[ni];
          N.rl[ni] = N.rl[i] / 2; N.rl[i] = N.rl[i] / 2;
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
            if (nr.state === N_RETRACT) { nr.state = N_GROW; nr.lastWave = this.t; nr.drive = 0.05; }
          } else if (nr.state === N_RETRACT && nr.children.length === 0) {
            this._removeNeurite(nr); return;
          }
        }
        prev = i;
      }
    }

    // ------------------------------------------------------------ probes: dynamic instability, binding
    _probesBio(dt) {
      const p = this.p, N = this.N;
      const bindP = 1 - Math.exp(-p.cellStick * p.stickiness * dt);
      const glassP = p.glassStick * p.stickiness * dt;
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
          const hit = this._nearestOther(tx, ty, 1.8, pr.cell);
          if (hit >= 0 && this.rand() < bindP) {
            pr.st = P_BOUND; pr.tgt = hit; pr.tgtGen = N.gen[hit]; pr.tgtCell = N.cell[hit]; pr.Lref = pr.len;
          } else if (this.rand() < glassP) {
            pr.st = P_STUCK; pr.tx = tx; pr.ty = ty; pr.Lref = pr.len;
          }
        } else if (pr.st === P_SHRINK) {
          pr.len -= p.probeShrink * dt;
          if (pr.len <= 0) { this._killProbe(pr); continue; }
          if (this.rand() < p.rescue * dt) pr.st = P_GROW;
        } else if (pr.st === P_STUCK) {
          const dx = pr.tx - bx, dy = pr.ty - by, L = hyp(dx, dy);
          pr.len = L; pr.ang = Math.atan2(dy, dx);
          if (L < pr.Lref) pr.Lref = L;
          if (L < 0.9) { this._killProbe(pr); continue; }                      // consumed: the cell reached it
          if (pr.kind === PK_CONE && pr.owner >= 0 && L > 1.5) {
            // the cone has moved past this adhesion: it lets go (or is left behind on the shaft)
            const nr = this.neurites[pr.owner];
            if ((dx * nr.hx + dy * nr.hy) / L < -0.1 && this.rand() < 3 * dt) { pr.st = P_SHRINK; continue; }
          }
          const tension = N.kind[b] === K_TIP ? 0 : 0.08 * (L - pr.Lref);
          if (tension > 0.12 * p.stickiness || L > pr.maxLen * 2.2 || this.rand() < 0.1 * dt / p.stickiness) { pr.st = P_SHRINK; }
        } else if (pr.st === P_BOUND) {
          const t = pr.tgt;
          if (!N.alive[t] || N.gen[t] !== pr.tgtGen) { pr.st = P_SHRINK; continue; }
          const dx = N.x[t] - bx, dy = N.y[t] - by, L = hyp(dx, dy);
          pr.len = L; pr.ang = Math.atan2(dy, dx);
          if (L < pr.Lref) pr.Lref = L;
          if (pr.kind === PK_CONE && pr.owner >= 0) {
            const nr = this.neurites[pr.owner];
            if (nr.state === N_GROW && L < 2.4 && b === nr.nodes[nr.nodes.length - 1]) {
              // cone reached the other cell: onto a soma it nearly always synapses; onto a neurite
              // it often just keeps going alongside it (fasciculation), sometimes synapses en passant
              const onSoma = N.kind[t] === K_RING;
              if (p.synapses && this.rand() < (onSoma ? 0.9 : p.synapseOnNeurite)) this._synapse(nr, pr);
              this._killProbe(pr); continue;
            }
          }
          if (L < 1.0) { this._killProbe(pr); continue; }
          const tension = N.kind[b] === K_TIP ? 0 : 0.08 * (L - pr.Lref);
          if (tension > 0.3 * p.stickiness || L > pr.maxLen * 2.5 || this.rand() < 0.02 * dt) pr.st = P_SHRINK;
        }
      }
      // lateral probes that adhered firmly can become branches ("corners and contacts")
      if (p.branchRate > 0) {
        for (let q = 0; q < this.probes.length; q++) {
          const pr = this.probes[q];
          if (!pr || !pr.alive || pr.kind !== PK_LAT) continue;
          if ((pr.st === P_STUCK || pr.st === P_BOUND) && pr.age > 1.5 && pr.len > 2.5) {
            const rate = (pr.st === P_BOUND ? 0.1 : 0.04) * p.branchRate;
            if (this.rand() < rate * dt) {
              const nr = this.neurites[pr.owner];
              const bi = nr && nr.alive ? nr.nodes.indexOf(pr.base) : -1;
              if (bi >= 0 && bi < nr.nodes.length - 1 && nr.depth < p.maxBranchDepth) {
                this._branch(nr, pr.base, Math.cos(pr.ang), Math.sin(pr.ang), pr);
              }
            }
          }
        }
      }
    }

    probeTip(pr) {
      const N = this.N;
      if (pr.st === P_STUCK) return [pr.tx, pr.ty];
      if (pr.st === P_BOUND && N.alive[pr.tgt] && N.gen[pr.tgt] === pr.tgtGen) return [N.x[pr.tgt], N.y[pr.tgt]];
      return [N.x[pr.base] + pr.len * Math.cos(pr.ang), N.y[pr.base] + pr.len * Math.sin(pr.ang)];
    }

    _synapse(nr, pr) {
      const N = this.N, tip = nr.nodes[nr.nodes.length - 1];
      let id; if (this._freeBond.length) id = this._freeBond.pop(); else { id = this.bonds.length; this.bonds.push(null); }
      const bd = { id, alive: true, a: tip, ag: N.gen[tip], b: pr.tgt, bg: pr.tgtGen, rest: 1.2, neu: nr.id, ca: nr.cell, cb: pr.tgtCell, t: this.t };
      this.bonds[id] = bd;
      nr.state = N_CONN; nr.bond = id; nr.drive = 0;
      for (const pid of nr.probes) { const o = this.probes[pid]; if (o.kind === PK_CONE && o !== pr && o.st !== P_BOUND) o.st = P_SHRINK; }
      this.cells[bd.ca].conn++; if (this.cells[bd.cb]) this.cells[bd.cb].conn++;
      this.events.push({ type: 'synapse', x: N.x[tip], y: N.y[tip], t: this.t, cell: nr.cell });
    }

    _breakBond(bd) {
      if (!bd || !bd.alive) return;
      bd.alive = false; this._freeBond.push(bd.id);
      const nr = this.neurites[bd.neu];
      if (nr && nr.alive && nr.bond === bd.id) { nr.bond = -1; nr.state = N_GROW; nr.gc = 0.5; nr.drive = 0.4; nr.lastWave = this.t; }
      if (this.cells[bd.ca]) this.cells[bd.ca].conn--; if (this.cells[bd.cb]) this.cells[bd.cb].conn--;
    }

    _bondsBio() {
      const N = this.N;
      for (const bd of this.bonds) {
        if (!bd || !bd.alive) continue;
        if (!N.alive[bd.a] || N.gen[bd.a] !== bd.ag || !N.alive[bd.b] || N.gen[bd.b] !== bd.bg) { this._breakBond(bd); continue; }
        const nr = this.neurites[bd.neu];
        if (!nr || !nr.alive || nr.nodes[nr.nodes.length - 1] !== bd.a) this._breakBond(bd);
      }
    }

    // ------------------------------------------------------------ forces
    _somaForces(dt) {
      const p = this.p, N = this.N;
      const X = N.x, Y = N.y, FX = N.fx, FY = N.fy, NZ = N.nz;
      const kP = 0.15, kE = 0.10, kS = 0.10, kSp = 0.018, kC = 0.06;
      const ouA = Math.exp(-dt / 2.5), ouB = 0.035 * p.cortexNoise * Math.sqrt(1 - ouA * ouA);
      for (const c of this.cells) {
        if (!c.alive) continue;
        const ring = c.ring, nu = c.nuc;
        const rT = c.rOut;
        // area, centroid
        let A = 0, cx = 0, cy = 0;
        for (let k = 0; k < NR; k++) {
          const i = ring[k], j = ring[(k + 1) % NR];
          const cr = X[i] * Y[j] - X[j] * Y[i];
          A += cr; cx += (X[i] + X[j]) * cr; cy += (Y[i] + Y[j]) * cr;
        }
        A *= 0.5;
        if (Math.abs(A) > 1e-6) { cx /= 6 * A; cy /= 6 * A; } else { cx = X[nu]; cy = Y[nu]; }
        const rEff = Math.sqrt(Math.abs(A) / Math.PI);
        const press = kP * (rT - rEff);
        const lT = TAU * rT / NR;
        const nubSlot = c.nub ? c.nub.slot : -1;
        const nubF = c.nub ? 0.09 * Math.min(1, c.nub.t / Math.max(1, c.nub.dur * 0.6)) : 0;
        for (let k = 0; k < NR; k++) {
          const i = ring[k], ip = ring[(k + NR - 1) % NR], inx = ring[(k + 1) % NR];
          let tx = X[inx] - X[ip], ty = Y[inx] - Y[ip]; const tl = hyp(tx, ty) || 1;
          const nx = ty / tl, ny = -tx / tl;          // outward normal (CCW ring)
          // area pressure + cortical noise (OU) + nub protrusion
          NZ[i] = NZ[i] * ouA + ouB * this.gauss();
          let fn = press + NZ[i];
          if (k === nubSlot) fn += nubF;
          FX[i] += fn * nx; FY[i] += fn * ny;
          // edge spring to next
          const ex = X[inx] - X[i], ey = Y[inx] - Y[i], el = hyp(ex, ey) || 1e-6;
          const fe = kE * (el - lT) / el;
          FX[i] += fe * ex; FY[i] += fe * ey; FX[inx] -= fe * ex; FY[inx] -= fe * ey;
          // smoothing (membrane bending)
          FX[i] += kS * ((X[ip] + X[inx]) * 0.5 - X[i]); FY[i] += kS * ((Y[ip] + Y[inx]) * 0.5 - Y[i]);
          // spoke to the nucleus (soft cortex/skeleton)
          const sx = X[i] - X[nu], sy = Y[i] - Y[nu], sl = hyp(sx, sy) || 1e-6;
          const fs = kSp * (sl - rT * 0.92) / sl;
          FX[i] -= fs * sx; FY[i] -= fs * sy; FX[nu] += fs * sx; FY[nu] += fs * sy;
        }
        FX[nu] += kC * (cx - X[nu]); FY[nu] += kC * (cy - Y[nu]);
        c.area = Math.abs(A);
        // nucleokinesis: during a contraction pulse the perinuclear MT cage hauls the
        // nucleus toward the leading process, and the soft ring follows
        if (c.pulse > 0 && c.nPrim > 0) {
          let lead = null;
          for (const id of c.neur) { const nr = this.neurites[id]; if (nr.parent < 0 && (!lead || nr.len > lead.len)) lead = nr; }
          if (lead && lead.len > 8) {
            const b = lead.base; let ux = X[b] - X[nu], uy = Y[b] - Y[nu]; const ul = hyp(ux, uy) || 1;
            const f = p.pulseStrength * c.pulse * Math.min(1, lead.len / 25);
            FX[nu] += f * ux / ul; FY[nu] += f * uy / ul;
            // the rear of the ring is pushed forward with it
            for (let k = 0; k < NR; k++) {
              const i = ring[k]; const rx = X[i] - X[nu], ry = Y[i] - Y[nu];
              if (rx * ux + ry * uy < 0) { FX[i] += 0.5 * f * ux / ul; FY[i] += 0.5 * f * uy / ul; }
            }
          }
        }
      }
    }

    _neuriteForces() {
      const p = this.p, N = this.N;
      const X = N.x, Y = N.y, FX = N.fx, FY = N.fy, MT = N.mt;
      const L0 = p.segLen, kSeg = 0.22, kB = 0.05 * p.stiffness, kRad = 0.04, RL = N.rl;
      const jig = 0.012 * p.cortexNoise, rnd = this.rand;   // the skeleton never sits still
      const dt = p.dt, relax = Math.min(1, dt / Math.max(0.05, p.viscosity)), relaxTip = Math.min(1, dt / 0.3);
      for (const nr of this.neurites) {
        if (!nr || !nr.alive) continue;
        const c = this.cells[nr.cell];
        // line tension (actomyosin) + elastic part around a plastic rest length
        const T = p.contractility * (1 + 1.5 * c.pulse);
        const shorten = 0.3 * c.pulse * dt;
        const nodes = nr.nodes, m = nodes.length - 1;
        let a = nr.base;
        for (let k = 0; k <= m; k++) {
          const b = nodes[k];
          const dx = X[b] - X[a], dy = Y[b] - Y[a], d = hyp(dx, dy) || 1e-6;
          const e = d - RL[b];
          const f = ((e > 0 ? kSeg : kSeg * 0.3) * e + T) / d;   // weak in compression: shafts buckle and curl
          FX[a] += f * dx; FY[a] += f * dy; FX[b] -= f * dx; FY[b] -= f * dy;
          RL[b] += (d - RL[b]) * (k === m ? relaxTip : relax) - RL[b] * shorten;
          FX[b] += jig * (rnd() - 0.5); FY[b] += jig * (rnd() - 0.5);
          a = b;
        }
        // bending: MT-rich shafts are stiff, MT-poor shafts are floppy
        let i0 = nr.base, i1 = nodes[0];
        for (let k = 1; k <= m; k++) {
          const i2 = nodes[k];
          const kb = kB * (0.25 + Math.min(MT[i1], 2));
          const mx = (X[i0] + X[i2]) * 0.5 - X[i1], my = (Y[i0] + Y[i2]) * 0.5 - Y[i1];
          FX[i1] += kb * mx; FY[i1] += kb * my;
          FX[i0] -= 0.5 * kb * mx; FY[i0] -= 0.5 * kb * my; FX[i2] -= 0.5 * kb * mx; FY[i2] -= 0.5 * kb * my;
          i0 = i1; i1 = i2;
        }
        // primary neurites leave the soma radially (the MT bundle is rooted at the centrosome)
        if (nr.parent < 0) {
          const b = nr.base, n0 = nodes[0];
          let ox = X[b] - X[c.nuc], oy = Y[b] - Y[c.nuc]; const ol = hyp(ox, oy) || 1; ox /= ol; oy /= ol;
          const d0 = hyp(X[n0] - X[b], Y[n0] - Y[b]);
          const tx = X[b] + ox * d0, ty = Y[b] + oy * d0;
          FX[n0] += kRad * (tx - X[n0]); FY[n0] += kRad * (ty - Y[n0]);
          FX[b] -= kRad * 0.5 * (tx - X[n0]); FY[b] -= kRad * 0.5 * (ty - Y[n0]);
        }
      }
    }

    _probeForces() {
      const p = this.p, N = this.N, FX = N.fx, FY = N.fy, X = N.x, Y = N.y;
      for (const pr of this.probes) {
        if (!pr || !pr.alive || (pr.st !== P_STUCK && pr.st !== P_BOUND)) continue;
        const b = pr.base;
        let tx, ty;
        if (pr.st === P_STUCK) { tx = pr.tx; ty = pr.ty; } else { tx = X[pr.tgt]; ty = Y[pr.tgt]; }
        const dx = tx - X[b], dy = ty - Y[b], L = hyp(dx, dy) || 1e-6;
        // constant traction + tether that resists being pulled away
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
        const dx = X[bd.b] - X[bd.a], dy = Y[bd.b] - Y[bd.a], d = hyp(dx, dy) || 1e-6;
        const f = 0.12 * (d - bd.rest);
        if (f > 0.6 * this.p.stickiness + 0.2) { this._breakBond(bd); continue; }
        FX[bd.a] += f * dx / d; FY[bd.a] += f * dy / d; FX[bd.b] -= f * dx / d; FY[bd.b] -= f * dy / d;
      }
    }

    // ------------------------------------------------------------ spatial hash + contacts
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
      const k0 = ((x / hs) | 0) + 1 + (((y / hs) | 0) + 1) * gw;
      const start = this.hStart, items = this.hItems;
      let best = -1, bd = r * r;
      for (let oy = -gw; oy <= gw; oy += gw) for (let ox = -1; ox <= 1; ox++) {
        const k = k0 + ox + oy;
        for (let t = start[k], e = start[k + 1]; t < e; t++) {
          const j = items[t];
          if (!N.alive[j] || N.cell[j] === cell || N.kind[j] === K_NUC) continue;
          const dx = N.x[j] - x, dy = N.y[j] - y, d2 = dx * dx + dy * dy;
          if (d2 < bd) { bd = d2; best = j; }
        }
      }
      return best;
    }

    _contacts(scale) {
      const p = this.p, N = this.N, n = this._hashN, hs = this.hs;
      const X = N.x, Y = N.y, FX = N.fx, FY = N.fy, KD = N.kind, CL = N.cell, TCH = N.touch;
      const key = this.hKey, start = this.hStart, items = this.hItems, gw = this.gw;
      const st = p.stickiness * scale;
      TCH.fill(0, 0, N.n);
      const rc2 = 3.0 * 3.0;
      for (let i = 0; i < n; i++) {
        if (key[i] < 0) continue;
        const ki = KD[i]; if (ki === K_NUC) continue;
        const xi = X[i], yi = Y[i], ci = CL[i], k0 = key[i];
        for (let oy = -gw; oy <= gw; oy += gw) for (let ox = -1; ox <= 1; ox++) {
          const k = k0 + ox + oy;
          for (let t = start[k], e = start[k + 1]; t < e; t++) {
            const j = items[t];
            if (j <= i || CL[j] === ci) continue;
            const kj = KD[j]; if (kj === K_NUC) continue;
            const dx = X[j] - xi, dy = Y[j] - yi, d2 = dx * dx + dy * dy;
            if (d2 > rc2 || d2 < 1e-12) continue;
            const d = Math.sqrt(d2);
            let f = 0;
            const ri = ki === K_RING, rj = kj === K_RING;
            if (ri && rj) {                                   // membrane–membrane: soft repulsion + adhesion shell
              if (d < 1.8) f = -0.12 * (1.8 - d) * scale; else f = 0.02 * st * (d - 1.8);
            } else if (ri || rj) {                            // neurite on a soma: sticks, can crawl over
              if (d > 0.6) f = 0.015 * st * (d - 0.6);
            } else {                                          // neurite–neurite: zipper (fasciculation)
              if (d < 0.5) f = -0.05 * (0.5 - d) * scale; else if (d < 2.6) f = 0.025 * st * (d - 0.5);
            }
            if (d < 2.4) { TCH[i] = 1; TCH[j] = 1; }
            const fx = f * dx / d, fy = f * dy / d;
            FX[i] += fx; FY[i] += fy; FX[j] -= fx; FY[j] -= fy;
          }
        }
      }
    }

    // soma–soma volume exclusion at the cell level (squishy, not hard)
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
            const dx = X[o.nuc] - X[c.nuc], dy = Y[o.nuc] - Y[c.nuc], d = hyp(dx, dy) || 1e-6;
            const rr = c.rOut + o.rOut;
            if (d > rr) continue;
            const ov = rr * 0.72 - d;
            if (ov > 0) {
              const f = 0.06 * ov / d;
              FX[c.nuc] -= f * dx; FY[c.nuc] -= f * dy; FX[o.nuc] += f * dx; FY[o.nuc] += f * dy;
            }
            // membrane nodes that sit inside the other soma are pushed out
            for (const [A, Bc] of [[c, o], [o, c]]) {
              const bx = X[Bc.nuc], by = Y[Bc.nuc], lim = Bc.rOut * 0.85;
              for (let k = 0; k < NR; k++) {
                const i = A.ring[k]; const ex = X[i] - bx, ey = Y[i] - by, el = hyp(ex, ey) || 1e-6;
                if (el < lim) { const g = 0.05 * (lim - el) / el; FX[i] += g * ex; FY[i] += g * ey; }
              }
            }
          }
        }
      }
    }

    // ------------------------------------------------------------ glass adhesion + integration
    _integrate(dt) {
      const p = this.p, N = this.N, n = N.n, cells = this.cells;
      const X = N.x, Y = N.y, FX = N.fx, FY = N.fy, AX = N.ax, AY = N.ay, ANC = N.anc, KD = N.kind, MOB = N.mob, BRK = N.brk;
      const kA = 0.15, maxStep = 0.8, st = p.stickiness;
      const reRing = 1.0 * st * dt, reShaft = 0.6 * st * dt, reTip = 0.4 * dt;
      const W = this.W, H = this.H, margin = 4;
      for (const c of cells) if (c.alive) { c.box[0] = c.box[1] = 1e9; c.box[2] = c.box[3] = -1e9; }
      for (let i = 0; i < n; i++) {
        if (!N.alive[i]) continue;
        const c = cells[N.cell[i]], kd = KD[i];
        if (c.z > 0) {
          ANC[i] = 0;
        } else if (kd !== K_NUC) {
          let brk;
          if (kd === K_RING) brk = 0.05 * st * (0.15 + 0.85 * c.adh) * (1 - 0.85 * c.pulse);
          else if (kd === K_SHAFT) brk = 0.07 * st * (1 - 0.7 * c.pulse);
          else brk = BRK[i] * st;
          if (ANC[i]) {
            const dx = AX[i] - X[i], dy = AY[i] - Y[i];
            if (kA * hyp(dx, dy) > brk) ANC[i] = 0;
            else { FX[i] += kA * dx; FY[i] += kA * dy; }
          } else {
            const r = kd === K_RING ? reRing * (0.2 + 0.8 * c.adh) : kd === K_SHAFT ? reShaft : reTip * (1 + 40 * (BRK[i] - 0.03));
            if (this.rand() < r) { ANC[i] = 1; AX[i] = X[i]; AY[i] = Y[i]; }
          }
        }
        let dx = MOB[i] * FX[i], dy = MOB[i] * FY[i];
        const dl = hyp(dx, dy);
        if (dl > maxStep) { dx *= maxStep / dl; dy *= maxStep / dl; }
        let x = X[i] + dx, y = Y[i] + dy;
        if (x < margin) x = margin; else if (x > W - margin) x = W - margin;
        if (y < margin) y = margin; else if (y > H - margin) y = H - margin;
        X[i] = x; Y[i] = y;
        const b = c.box, r = N.w[i] + 1;
        if (x - r < b[0]) b[0] = x - r; if (y - r < b[1]) b[1] = y - r;
        if (x + r > b[2]) b[2] = x + r; if (y + r > b[3]) b[3] = y + r;
      }
      // extend boxes by probe reach
      const pad = p.probeMaxLen + 2;
      for (const c of cells) if (c.alive) { c.box[0] -= pad; c.box[1] -= pad; c.box[2] += pad; c.box[3] += pad; }
    }

    // ------------------------------------------------------------ seeking: sense other cells
    _chemo() {
      const p = this.p, N = this.N, cells = this.cells, R = p.senseRange, lam = R / 2.5;
      const grid = new Map();
      for (const c of cells) {
        if (!c.alive || c.z > 0) continue;
        const k = Math.floor(c.x / R) * 100003 + Math.floor(c.y / R);
        let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(c);
      }
      const sense = (x, y, self, out) => {
        let gx = 0, gy = 0;
        const bx = Math.floor(x / R), by = Math.floor(y / R);
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
          const l = grid.get((bx + ox) * 100003 + by + oy); if (!l) continue;
          for (const o of l) {
            if (o.id === self) continue;
            const dx = o.x - x, dy = o.y - y, d = hyp(dx, dy);
            if (d > R || d < 1) continue;
            const w = p.seek * Math.exp(-d / lam) / (1 + 0.3 * o.conn);
            gx += w * dx / d; gy += w * dy / d;
          }
        }
        const sc = cells[self];
        const dx = x - sc.x, dy = y - sc.y, d = hyp(dx, dy);
        if (d > 1) { const w = p.selfAvoid * Math.exp(-d / 60); gx += w * dx / d; gy += w * dy / d; }   // grow away from own soma
        const g = hyp(gx, gy), s = 1 / (g + 0.04);
        out[0] = gx * s; out[1] = gy * s;
      };
      const out = [0, 0];
      for (const c of cells) {
        if (!c.alive || c.z > 0) continue;
        sense(c.x, c.y, c.id, out); c.cx = out[0]; c.cy = out[1];
      }
      for (const nr of this.neurites) {
        if (!nr || !nr.alive) continue;
        const tip = nr.nodes[nr.nodes.length - 1];
        sense(N.x[tip], N.y[tip], nr.cell, out); nr.cx = out[0]; nr.cy = out[1];
      }
    }

    // ------------------------------------------------------------ queries
    stats() {
      const N = this.N;
      let cells = 0, neur = 0, len = 0, probes = 0, syn = 0, nodes = 0, stuck = 0;
      for (const c of this.cells) if (c.alive) cells++;
      for (const nr of this.neurites) if (nr && nr.alive) { neur++; len += nr.len; }
      for (const pr of this.probes) if (pr && pr.alive) { probes++; if (pr.st >= P_STUCK) stuck++; }
      for (const b of this.bonds) if (b && b.alive) syn++;
      for (let i = 0; i < N.n; i++) if (N.alive[i]) nodes++;
      return { t: this.t, cells, neurites: neur, meanLen: neur ? len / neur : 0, totalLen: len, probes, adheredProbes: stuck, synapses: syn, nodes, largestCluster: this.largestCluster() };
    }

    largestCluster() {
      const cells = this.cells, n = cells.length, par = new Int32Array(n);
      for (let i = 0; i < n; i++) par[i] = i;
      const f = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
      for (const b of this.bonds) if (b && b.alive) { const a = f(b.ca), c = f(b.cb); if (a !== c) par[a] = c; }
      const cnt = new Map(); let best = 0;
      for (let i = 0; i < n; i++) if (cells[i].alive) { const r = f(i); const v = (cnt.get(r) || 0) + 1; cnt.set(r, v); if (v > best) best = v; }
      return best;
    }

    cellAt(x, y, r = 12) {
      let best = null, bd = 1e18;
      for (const c of this.cells) {
        if (!c.alive) continue;
        const d = (c.x - x) ** 2 + (c.y - y) ** 2;
        if (d < bd && d < (c.rOut + r) ** 2) { bd = d; best = c; }
      }
      return best;
    }
  }

  NeuriteEngine.capHeight = capHeight;
  return NeuriteEngine;
});
