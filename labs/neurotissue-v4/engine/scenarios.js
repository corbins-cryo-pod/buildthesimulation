/*
 * v4 scenarios. Each picks a Space (the geometry), fields and reactions (the chemistry), cell types
 * and placement. The engine is the same for all of them.
 *   dish        2-D coverslip, hippocampal neurons (parity with v3 and Dotti et al. 1988)
 *   gel         3-D hydrogel, DRG neurons embedded at a chosen stiffness (Balgude et al. 2001)
 *   gelSurface  the same neurons on the surface of the same gel (2-D control for gel)
 *   conduit     peripheral nerve regeneration across a gap in a silicone tube (rat sciatic):
 *               exudate -> fibrin cable, macrophages clear debris, Schwann cells invade from both
 *               stumps, axons from the proximal stump follow them (Lundborg; Williams et al.)
 */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const mod = factory(isNode ? require('./core.js') : root.NE4);
  if (isNode) module.exports = mod; else { root.NE4 = root.NE4 || {}; Object.assign(root.NE4, mod); }
})(typeof self !== 'undefined' ? self : this, function (NE4) {
  'use strict';
  const { Engine, Surface, Volume, Tube } = NE4;

  const SCENARIOS = {
    dish: {
      group: 'Dish (2-D)', label: 'Hippocampal neurons on a coverslip', dim: 2,
      blurb: 'Rat hippocampal neurons on poly-lysine glass, the v3 calibration carried into the new core. Minor neurites, one wins and becomes the axon, dendrites follow from day 3-4.',
      view: { speed: 120, hours: 168, record: { every: 60, eps: 0.6 } },
      build(o) {
        const n = o.count || 6, W = o.W || 1400, space = new Surface(W, W, { material: { label: 'Glass, poly-lysine' } });
        const e = new Engine({ space, seed: o.seed, params: Object.assign({ dt: 0.05, segLen: 3.5 }, o.params || {}) });
        if (n === 1) e.addCell(W / 2, W / 2, 0, { type: 'hippocampal' });
        else for (let k = 0; k < n; k++) e.addCell(150 + e.rand() * (W - 300), 150 + e.rand() * (W - 300), 0, { type: 'hippocampal' });
        e.metricsFns.neurons = (en) => neuronSummary(en);
        return e;
      },
    },
    gel: {
      group: 'Hydrogel (3-D)', label: 'DRG neurons inside a hydrogel', dim: 3,
      blurb: 'Sensory (DRG) neurons embedded in a 3-D gel. Stiffer gel grips the growth cone better but confines it more, so neurites grow more slowly in stiffer gel, as Balgude et al. (2001) found in agarose.',
      view: { speed: 60, hours: 48, record: { every: 30, eps: 1 } },
      build(o) {
        const S = o.size || 700, k = o.stiffness != null ? o.stiffness : 1;
        const space = new Volume(S, S, S, { material: { label: `Hydrogel ${k} kPa`, stiffness: () => k, adhesion: () => 0.7, density: () => 1 } });
        const e = new Engine({ space, seed: o.seed, params: Object.assign({ dt: 0.1, segLen: 5, apoptosis: false }, o.params || {}) });
        const n = o.count || 12;
        for (let i = 0; i < n; i++) e.addCell(S / 2 + (e.rand() - 0.5) * 120, S / 2 + (e.rand() - 0.5) * 120, S / 2 + (e.rand() - 0.5) * 120, { type: 'drg' });
        e.metricsFns.neuriteLen = (en) => meanNeurite(en);
        e.metricsFns.neurons = (en) => neuronSummary(en);
        return e;
      },
    },
    gelSurface: {
      group: 'Hydrogel (3-D)', label: 'The same neurons on the gel surface', dim: 2,
      blurb: 'The 2-D control for the hydrogel scenario: the same DRG neurons and the same gel, but on its surface instead of inside it.',
      view: { speed: 60, hours: 48, record: { every: 30, eps: 1 } },
      build(o) {
        const S = o.size || 1400, k = o.stiffness != null ? o.stiffness : 1;
        const space = new Surface(S, S, { material: { label: `Gel surface ${k} kPa`, stiffness: () => k, adhesion: () => 0.7, density: () => 0 } });
        const e = new Engine({ space, seed: o.seed, params: Object.assign({ dt: 0.1, segLen: 5, apoptosis: false }, o.params || {}) });
        const n = o.count || 12;
        for (let i = 0; i < n; i++) e.addCell(S / 2 + (e.rand() - 0.5) * 160, S / 2 + (e.rand() - 0.5) * 160, 0, { type: 'drg' });
        e.metricsFns.neuriteLen = (en) => meanNeurite(en);
        e.metricsFns.neurons = (en) => neuronSummary(en);
        return e;
      },
    },
    conduit: {
      group: 'Nerve repair (tube)', label: 'Nerve regeneration across a gap', dim: 3,
      blurb: 'A cut rat sciatic nerve with its stumps in a silicone tube. Exudate from the stumps clots into a fibrin cable; macrophages clear debris; Schwann cells migrate in from both stumps along the cable; axons sprout from the proximal stump and follow them. Short gaps bridge, long gaps do not.',
      view: { speed: 1440, hours: 720, record: { every: 360, eps: 3, fields: { fibrin: { ds: 2, scale: 1 }, debris: { ds: 2, scale: 1 }, trophin: { ds: 2, scale: 0.15 } } } },
      build(o) { return buildConduit(o); },
    },
  };

  /** population summary of neurons: stage counts, mean stage-entry times (h), mean lengths (um) */
  function neuronSummary(e) {
    const st = [0, 0, 0, 0, 0, 0], tSum = [0, 0, 0, 0, 0, 0], tN = [0, 0, 0, 0, 0, 0]; let n = 0, ax = 0, de = 0, mi = 0, longest = 0;
    for (const c of e.cells) {
      if (!c.alive || c.T.kind !== 'neuron') continue; n++; st[c.stage]++;
      for (let k = 2; k <= 5; k++) if (c.stageT[k] >= 0) { tSum[k] += c.stageT[k] / 60; tN[k]++; }
      const m = e.cellMetrics(c); ax += m.axon; de += m.dend; mi += m.minor;
      for (const id of c.neur) { const nr = e.neurites[id]; if (nr.alive && nr.len > longest) longest = nr.len; }
    }
    const mt = (k) => (tN[k] ? tSum[k] / tN[k] : null);
    return { n, stages: st.slice(1), t2: mt(2), t3: mt(3), t4: mt(4), t5: mt(5), n3: tN[3], n4: tN[4], axon: n ? ax / n : 0, dend: n ? de / n : 0, minor: n ? mi / n : 0, longest };
  }
  function meanNeurite(e) {
    let s = 0, n = 0; for (const c of e.cells) if (c.alive && c.T.kind === 'neuron') { const m = e.cellMetrics(c); s += m.axon + m.dend + m.minor; n++; }
    return n ? s / n : 0;
  }

  // ------------------------------------------------------------------ nerve conduit
  function buildConduit(o) {
    const gap = (o.gap != null ? o.gap : 8) * 1000, Lp = 1500, Ld = 2000, L = Lp + gap + Ld, R = o.R || 400;
    const fill = !!o.graft;   // graft: the gap is pre-filled with Schwann cell bands and matrix (like a nerve autograft)
    const regions = [{ name: 'stump-prox', x0: 0, x1: Lp }, { name: 'gap', x0: Lp, x1: Lp + gap }, { name: 'stump-dist', x0: Lp + gap, x1: L + 1 }];
    // contact guidance: basal-lamina tubes in the stumps (strong), the longitudinally condensing fibrin cable in the gap (weaker)
    let fibF = null;
    const fiber = (x, y, z, out) => { out[0] = 1; out[1] = 0; out[2] = 0; if (x < Lp || x > Lp + gap || fill) return 3; const f = fibF ? fibF.at(x, y, z) : 0; return f > 0.05 ? 1.2 * f : false; };
    const space = new Tube(L, R, { fieldRes: o.fieldRes || 50, regions, material: { label: 'Silicone tube lumen', stiffness: () => 1, adhesion: () => 0.7, density: () => 0, fiber } });
    const p = Object.assign({ dt: 5, segLen: 40, hashSize: 50, fieldEvery: 15, fieldSweeps: 1, iters: 2, viscosity: 3, contractility: 0.0005, maxCells: o.maxCells || 8000, apoptosis: false }, o.params || {});
    const e = new Engine({ space, seed: o.seed, params: p });
    e.conduit = { Lp, gap, Ld, L, R, graft: fill };
    // Schwann cells proliferate on the cable and near the cut faces (the stump interiors are already full of bands),
    // up to a carrying capacity per 250 um of tube (one simulated cell stands for a short column of real cells)
    // (K per bin locally, and K x bins over the whole proliferative zone, so cells leaving the stump faces cannot pump the gap full)
    const binW = 250, K = o.schwannK || 70, bins = new Int32Array(Math.ceil(L / binW) + 1), x0 = Lp - 300, x1 = Lp + gap + 300, Ktot = K * (x1 - x0) / binW;
    let zone = 0;
    e.addHook({ once: false, when: () => true, run: (en) => { bins.fill(0); zone = 0; for (const c of en.cells) if (c.alive && c.T.key === 'schwann') { bins[Math.max(0, Math.floor(c.x / binW))]++; if (c.x > x0 && c.x < x1 && !c.fixed) zone++; } } });
    e.divideOK = (c) => c.x > x0 && c.x < x1 && bins[Math.max(0, Math.floor(c.x / binW))] < K && zone < Ktot;
    e.tipStop = (x) => x > L - 150;   // axons that reach the end of the distal stump have arrived
    // ---- fields
    // exudate (plasma and fibrinogen) seeps from both stump faces for a few days; where it is concentrated
    // enough it clots (threshold exThr) into a fibrin matrix that condenses toward the tube axis, so the
    // cable is thick near the stumps and thinnest mid-gap; the cutoff is a model result, not an imposed experimental critical gap. Lundborg 1982
    // reports regeneration at 10 mm with BOTH stumps present, unlike the proximal-only condition.
    const ex = space.addField({ name: 'exudate', label: 'Exudate (fibrinogen)', D: o.exD || 4000, decay: o.exDecay || 1 / 1560, color: '#c9b37a' });
    const fib = space.addField({ name: 'fibrin', label: 'Fibrin matrix', kind: 'matrix', max: 1, color: '#b8a070' }); fibF = fib;
    const deb = space.addField({ name: 'debris', label: 'Myelin and axon debris', kind: 'matrix', max: 1, color: '#c07070' });
    const tro = space.addField({ name: 'trophin', label: 'Neurotrophins', D: 3000, decay: 1 / 300, max: 0.05, color: '#7fd6c2' });
    space.addField({ name: 'glia', label: 'Repair Schwann cell density', D: 150, decay: 1 / 30, max: 0.5, color: '#7fd6a9' });
    fib.fillWhere((x) => x < Lp || x > Lp + gap || fill, 1);
    deb.fillWhere((x) => x > Lp + gap || (fill && x > Lp), 1);
    const face = (x) => Math.abs(x - Lp) < 60 || Math.abs(x - (Lp + gap)) < 60;
    ex.srcWhere((x) => face(x), o.exSrc || 0.02);
    const tau = (o.exTau || 4) * 1440; ex.srcScaleFn = (t) => Math.exp(-t / tau);
    const kF = o.kF != null ? o.kF : 0.002, thr = o.exThr != null ? o.exThr : 0.1;   // clotting rate and threshold
    const radial = new Float32Array(fib.c.length);   // cable profile: 1 on the axis, 0.25 at the wall
    for (let k = 0; k < fib.nz; k++) for (let j = 0; j < fib.ny; j++) for (let i = 0; i < fib.nx; i++) {
      const y = -R + (j + 0.5) * fib.h, z = -R + (k + 0.5) * fib.h, rr = (y * y + z * z) / (R * R);
      radial[i + fib.nx * (j + fib.ny * k)] = Math.max(0, 1 - 0.75 * rr);
    }
    e.addReaction((en, dtF) => {
      const n = fib.c.length;
      for (let q = 0; q < n; q++) { if (!fib.mask[q]) continue; const E = ex.c[q] - thr; if (E > 0) fib.c[q] += (1 - fib.c[q]) * -Math.expm1(-kF * E * radial[q] * dtF); }
    });
    // bands of Buengner: one on the axis, rings of 6 and 12 (about 120 um apart)
    const bands = [[0, 0]];
    for (const [nr, fr] of [[6, 0.3], [12, 0.62]]) for (let k = 0; k < nr; k++) { const a = (k + 0.5 * (nr === 12)) / nr * Math.PI * 2, r = fr * R; bands.push([r * Math.cos(a), r * Math.sin(a)]); }
    // ---- stump axons: pre-formed in the proximal stump alongside the bands, cut at the proximal face
    const nAx = o.axons || 40;
    for (let k = 0; k < nAx; k++) {
      const b = bands[k % bands.length], a = e.rand() * Math.PI * 2, rj = 6 + 10 * e.rand(), y = b[0] + rj * Math.cos(a), z = b[1] + rj * Math.sin(a);
      const c = e.addCell(8, y, z, { type: 'stumpAxon', fixed: true });
      const pts = []; for (let x = 30; x <= Lp - 5; x += p.segLen) pts.push([x, y, z]);
      e.addNeuriteAlong(c, pts, 2, { anchor: true });
      c.stage = 3; c.stageT[3] = 0;
    }
    // ---- Schwann cells: bands in both stumps (and through the gap for a graft)
    const spacing = o.bandSpacing || 50;
    for (const [by, bz] of bands) for (let x = 15; x < L; x += spacing) {
      const inGap = x > Lp && x < Lp + gap; if (inGap && !fill) continue;
      const active = Math.abs(x - Lp) < 400 || Math.abs(x - (Lp + gap)) < 400;
      const fixed = fill ? !(x > Lp - 400 && x < Lp + 200) : !active;   // stump interiors (and a graft's bands) stay put
      const c = e.addCell(x + (e.rand() - 0.5) * 8, by + (e.rand() - 0.5) * 10, bz + (e.rand() - 0.5) * 10, { type: 'schwann', orient: [1, 0, 0], fixed });
      c.hx = x < Lp + gap / 2 ? 1 : -1; c.hy = 0; c.hz = 0;
    }
    // ---- macrophages arrive through the stumps' vessels while there is debris to clear
    e.addSpawner({ type: 'macrophage', every: 120, from: 720, until: 21 * 1440,
      count: (en) => { const left = deb.total() / en.conduit.debris0; return en.rand() < 0.5 + 4 * left - Math.floor(0.5 + 4 * left) ? Math.ceil(0.5 + 4 * left) : Math.floor(0.5 + 4 * left); },
      where: (en, out) => { const r = Math.sqrt(en.rand()) * (R - 30), a = en.rand() * Math.PI * 2; out[0] = en.rand() < 0.7 ? Lp + gap + en.rand() * Ld : en.rand() * Lp; out[1] = r * Math.cos(a); out[2] = r * Math.sin(a); return true; } });
    e.conduit.debris0 = Math.max(1e-9, deb.total());
    // ---- measurements
    e.metricsFns.conduit = (en) => conduitMetrics(en);
    return e;
  }

  function conduitMetrics(e) {
    const { Lp, gap, L } = e.conduit, N = e.N, sp = e.space, xs = [];
    let crossed = 0, axons = 0;
    for (const c of e.cells) {
      if (!c.alive || c.T.key !== 'stumpAxon') continue; axons++;
      let mx = 0; for (const id of c.neur) { const nr = e.neurites[id]; if (!nr.alive) continue; const tp = nr.nodes[nr.nodes.length - 1]; if (N.x[tp] > mx) mx = N.x[tp]; }
      xs.push(mx - Lp); if (mx > Lp + gap) crossed++;
    }
    xs.sort((a, b) => a - b);
    const q = (f) => xs.length ? xs[Math.min(xs.length - 1, Math.floor(f * xs.length))] : 0;
    let sGap = 0, sProx = 0, sDist = 0, mac = 0;
    const bins = 20, prof = new Array(bins).fill(0);
    for (const c of e.cells) {
      if (!c.alive) continue;
      if (c.T.key === 'macrophage') { mac++; continue; }
      if (c.T.key !== 'schwann') continue;
      if (c.x < Lp) sProx++; else if (c.x > Lp + gap) sDist++; else { sGap++; prof[Math.min(bins - 1, Math.floor((c.x - Lp) / gap * bins))]++; }
    }
    const bw = 250, nbw = Math.ceil(gap / bw), cnt = new Array(nbw).fill(0);
    for (const c of e.cells) if (c.alive && c.T.key === 'schwann' && c.x > Lp && c.x < Lp + gap) cnt[Math.min(nbw - 1, Math.floor((c.x - Lp) / bw))]++;
    let fp = 0; while (fp < nbw && cnt[fp] >= 3) fp++;
    let fd = 0; while (fd < nbw && cnt[nbw - 1 - fd] >= 3) fd++;
    const fib = sp.field('fibrin'), deb = sp.field('debris');
    let fibMin = 1; for (let x = Lp + 25; x < Lp + gap; x += 50) fibMin = Math.min(fibMin, fib.profileX(x));
    return { day: e.t / 1440, frontMed: q(0.5) / 1000, front90: q(0.9) / 1000, crossed, axons, schwannGap: sGap, schwannProx: sProx, schwannDist: sDist,
      schwannBridgeMin: Math.min(...prof), schwannFrontProx: Math.min(gap, fp * bw) / 1000, schwannFrontDist: Math.min(gap, fd * bw) / 1000, bridged: fp + fd >= nbw, macrophages: mac, fibrinMin: fibMin, debrisLeft: deb.total() / e.conduit.debris0 };
  }

  function buildScenario(key, o = {}) {
    const S = SCENARIOS[key]; if (!S) throw new Error('Unknown scenario ' + key);
    const e = S.build(Object.assign({ seed: 7 }, o)); e.scenario = key; return e;
  }
  return { SCENARIOS, buildScenario, conduitMetrics };
});
