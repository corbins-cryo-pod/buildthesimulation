(function () {
  'use strict';
  const NE4 = window.NE4;
  const $ = (id) => document.getElementById(id);
  const tok = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const fmt = (v, d = 1) => (v == null || !isFinite(v) ? '–' : Number(v).toFixed(d));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ====================================================================== scenario adapters
  // Each adapter turns a run's header and stats rows into readouts, a chart, literature checks,
  // camera presets and labels. Times in rows are minutes.
  const day = (r) => r.t / 1440, hr = (r) => r.t / 60;
  const firstT = (rows, f) => { for (const r of rows) if (f(r)) return r.t; return null; };
  const status = (v, lo, hi, slack = 0.3) => (v == null ? 'na' : v >= lo && v <= hi ? 'ok' : v >= lo * (1 - slack) && v <= hi * (1 + slack) ? 'warn' : 'bad');
  const PILL = { ok: 'Within target', warn: 'Near target', bad: 'Mismatch', na: 'Pending', info: 'Exploratory' };

  const conduit = {
    clock: 'day',
    title(H) { const c = H.conduit, g = c.gap / 1000; return c.graft ? `Nerve graft bridging ${g} mm` : `Silicone conduit, ${g} mm gap`; },
    stats(r, H) {
      const c = r.conduit || {}, g = H.conduit.gap / 1000;
      return [
        ['Axon front, median', fmt(c.frontMed, 2), 'mm into gap'],
        ['Leading 10% of axons', fmt(c.front90, 2), 'mm'],
        ['Axons in distal stump', c.crossed != null ? `${c.crossed}/${c.axons}` : '–', ''],
        ['Fibrin cable, thinnest', c.fibrinMin != null ? (c.fibrinMin > 0.03 ? fmt(c.fibrinMin, 2) : 'none') : '–', c.fibrinMin >= 0.12 ? 'of full density' : c.fibrinMin > 0.03 ? 'thin strand on the axis' : 'gap not bridged'],
        ['Schwann front, proximal', fmt(c.schwannFrontProx, 2), 'mm'],
        ['Schwann front, distal', fmt(c.schwannFrontDist, 2), 'mm'],
        ['Bridge criterion now', c.bridged ? 'Met' : 'Not met', 'density bins'],
        ['Bridge criterion ever', r.history && r.history.bridgeEverFormed ? 'Met' : 'Not met', 'historical'],
        ['Max proximal advance', fmt(r.history && r.history.maxSchwannFrontProx,2), 'mm, historical'],
        ['Max distal advance', fmt(r.history && r.history.maxSchwannFrontDist,2), 'mm, historical'],
        ['Schwann cells in gap', c.schwannGap != null ? String(c.schwannGap) : '–', c.bridged ? 'bridged' : `of ${g} mm`],
        ['Macrophages', c.macrophages != null ? String(c.macrophages) : '–', `debris left ${c.debrisLeft != null ? Math.round(c.debrisLeft * 100) : '–'}%`],
      ];
    },
    chart(H) {
      const c = H.conduit, g = c.gap / 1000, xMax = H.hours / 24;
      const spec = { title: 'Fronts in the gap', xMax, xLabel: 'day', yMin: -0.5, yMax: g + (c.graft ? 2 : 1), yLabel: 'mm into gap', x: day,
        series: [
          { label: 'Axons, leading 10%', color: tok('--ch-axon'), w: 1, dash: [3, 3], get: (r) => r.conduit && r.conduit.front90 },
          { label: 'Axons, median', color: tok('--ch-axon'), w: 2, get: (r) => r.conduit && r.conduit.frontMed },
          { label: 'Schwann, proximal', color: tok('--ch-schwann'), w: 1.5, get: (r) => r.conduit && r.conduit.schwannFrontProx },
          { label: 'Schwann, distal', color: tok('--ch-schwann'), w: 1.5, dash: [5, 3], get: (r) => r.conduit && g - r.conduit.schwannFrontDist },
        ],
        hlines: [{ y: 0, label: '' }, { y: g, label: 'distal stump' }], fns: [], bands: [] };
      if (c.graft) {
        spec.fns.push({ label: 'fresh nerve graft, 1.5 mm/d', fn: (d) => 1.5 * (d - 3.6) });
        // Do not mix crush and fresh-graft conditions into one acceptance band.
      } else {
        spec.bands.push({ x0: 2, x1: 7, label: 'matrix' }, { x0: 7, x1: 21, label: 'Schwann cells, axons' }, { x0: 21, x1: 30, label: 'nerve re-forms' });
      }
      return spec;
    },
    bench(rows, H) {
      const c = H.conduit, g = c.gap / 1000, last = rows[rows.length - 1], endD = last ? day(last) : 0, done = endD >= H.hours / 24 - 0.01;
      const out = [];
      if (c.graft) {
        // fit front90 (pinch-test-like leading front) over the linear part
        const pts = rows.filter((r) => r.conduit && r.conduit.front90 > 0.5 && r.conduit.front90 < g + 1.5).map((r) => [day(r), r.conduit.front90]);
        let slope = null, delay = null;
        if (pts.length >= 3) { const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n; let sxy = 0, sxx = 0; for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; } slope = sxy / sxx; delay = mx - my / slope; }
        out.push({q:'Fresh-graft reference: growth rate',lit:'1.5 mm/day after a 3.6-day delay in a fitted rat sciatic sensory-pinch-test model. The simulated front90 is a different endpoint; no pass band is assigned.',cite:'Holmquist et al. 1993 · DOI 10.1016/S0165-0270(05)80004-4',me:slope!=null?`${fmt(slope,2)} mm/day (simulated front90 fit)`:'needs more frames',st:'info'});
        out.push({q:'Fresh-graft reference: initial delay',lit:'3.6 days for the fresh-graft condition. Crush and pre-degenerated grafts are separate conditions, not tolerance limits.',cite:'Holmquist et al. 1993; Danielsen et al. 1994, PMID 7882035',me:delay!=null?`${fmt(delay,1)} days (fit intercept)`:'needs more frames',st:'info'});
        const cr=firstT(rows,r=>r.conduit&&r.conduit.crossed>0);
        out.push({q:'First simulated distal-stump crossing',lit:`Straight-line fresh-graft extrapolation: ${fmt(3.6+g/1.5,1)} days. An extrapolation is not an independently observed crossing time.`,cite:'reference extrapolation; model endpoint',me:cr!=null?`day ${fmt(cr/1440,1)}`:done?'not reached':'not yet',st:'info'});
        return out;
      }
      const result = NE4.nerveBenchmark(rows, H);
      const first = rows.find(r => r.conduit && r.conduit.bridged);
      const raw = last && last.conduit;
      out.push({ q: 'Distal-stump crossing: matched gap condition',
        lit: result.matched ? `Both stumps present: regeneration reported at 6 and 10 mm, absent at 15 mm. ${g} mm is a matched gap, not a fully matched protocol.` : `${g} mm was not a gap tested in Lundborg et al. 1982; do not score it as a matched experiment.`,
        cite: 'Lundborg et al. 1982 · 10.1016/0014-4886(82)90215-1',
        me: raw ? `${raw.crossed}/${raw.axons} currently across by day ${fmt(endD,1)}. ${result.status}.` : 'not yet',
        st: result.status === 'mismatch' ? 'bad' : result.status === 'pending' ? 'na' : 'info' });
      out.push({ q: 'Schwann bridge: raw density-bin criterion', lit: 'A model threshold: at least three Schwann agents per 250 µm axial bin. This is not a direct histological measurement.', cite: 'model definition',
        me: raw ? `Current: ${raw.bridged?'met':'not met'}; ever met: ${first?'day '+fmt(first.t/1440,1):'no'}. Reversals remain visible.` : 'not yet', st: 'info' });
      out.push({ q: 'Fibrin continuity', lit: 'Threshold and radial profile are modelling assumptions, not an independently validated material measurement.', cite: 'model definition',
        me: raw ? `Minimum cross-sectional density ${fmt(raw.fibrinMin,3)} (model units)` : 'not yet', st: 'info' });
      return out;
    },
    cams(H) {
      const c = H.conduit, mid = c.Lp + c.gap / 2;
      return [
        { label: 'Gap', t: [mid, 0, 0], fit: [c.gap * 1.45, c.R * 5], th: -Math.PI / 2 + 0.35, ph: 1.05 },
        { label: 'Whole conduit', t: [c.L / 2, 0, 0], fit: [c.L * 1.3, c.R * 7], th: -Math.PI / 2 + 0.16, ph: 1.15 },
        { label: 'Proximal stump', t: [c.Lp + 500, 0, 0], r: 2600, th: -Math.PI / 2 + 0.55, ph: 1.0 },
        { label: 'Mid-gap', t: [mid, 0, 0], r: 3000, th: -Math.PI / 2 + 0.4, ph: 1.05 },
        { label: 'Distal stump', t: [c.Lp + c.gap + 300, 0, 0], r: 2600, th: -Math.PI / 2 - 0.5, ph: 1.0 },
        { label: 'Down the axis', t: [mid, 0, 0], r: c.gap * 0.75 + 2500, th: 0.02, ph: Math.PI / 2 - 0.05 },
      ];
    },
    labels(H) { const c = H.conduit; return [{ text: 'Proximal stump', p: [c.Lp / 2, 0, c.R + 80] }, { text: c.graft ? `Graft · ${c.gap / 1000} mm` : `Gap · ${c.gap / 1000} mm`, p: [c.Lp + c.gap / 2, 0, c.R + 80] }, { text: 'Distal stump', p: [c.Lp + c.gap + c.Ld / 2, 0, c.R + 80] }]; },
    defaultFrame(H, rows) { const i = rows.findIndex((r) => r.conduit && r.conduit.crossed > 4); return i > 0 ? i : Math.round(rows.length * 0.8); },
  };

  const dish = {
    clock: 'day',
    title() { return 'Hippocampal neurons on a coverslip'; },
    stats(r) {
      const n = r.neurons || {}; const st = n.stages || [];
      return [
        ['Neurons', String(n.n || 0), ''],
        ['Stages', st.length ? st.map((k, i) => (k ? `${k}×S${i + 1}` : '')).filter(Boolean).join(' ') : '–', ''],
        ['Axon, mean', fmt(n.axon, 0), 'µm'],
        ['Dendrites, mean total', fmt(n.dend, 0), 'µm'],
        ['Axon chosen (stage 3)', n.t3 != null ? fmt(n.t3, 1) : '–', n.n3 ? `h, n=${n.n3}` : ''],
        ['Dendrites (stage 4)', n.t4 != null ? fmt(n.t4 / 24, 1) : '–', n.n4 ? `d, n=${n.n4}` : ''],
      ];
    },
    chart(H) {
      return { title: 'Axon and dendrite growth', xMax: H.hours / 24, xLabel: 'day', yMin: 0, yMax: 600, yLabel: 'µm per neuron', x: day,
        series: [
          { label: 'Axon', color: tok('--ch-axon'), w: 2, get: (r) => r.neurons && r.neurons.axon },
          { label: 'Dendrites, total', color: tok('--ch-dend'), w: 2, get: (r) => r.neurons && r.neurons.dend },
          { label: 'Minor processes', color: tok('--ch-minor'), w: 1, dash: [3, 3], get: (r) => r.neurons && r.neurons.minor },
        ],
        points: [{ x: 4, y: 250, e: 0.3, color: tok('--ch-axon'), label: 'axon, day 4' }, { x: 7, y: 420, e: 0.25, color: tok('--ch-axon'), label: 'axon, day 7' }, { x: 7, y: 270, e: 0.3, color: tok('--ch-dend'), label: 'dendrites, day 7' }],
        hlines: [], fns: [], bands: [] };
    },
    bench(rows) {
      const at = (d) => { let best = null; for (const r of rows) if (Math.abs(day(r) - d) < 0.05) best = r; return best; };
      const last = rows[rows.length - 1], n = last && last.neurons;
      const r4 = at(4), r7 = at(7);
      return [
        { q: 'Stage 2: minor processes appear', lit: 'Calibration target ~13 h; author-selected acceptance band ±40%, not measured uncertainty', cite: 'Dotti, Sullivan & Banker 1988', me: n && n.t2 != null ? `${fmt(n.t2, 1)} h (mean)` : 'not yet', st: n && n.t2 != null ? status(n.t2, 13 * 0.6, 13 * 1.4, 0.2) : 'na' },
        { q: 'Stage 3: one process becomes the axon', lit: 'Calibration target ~19 h; author-selected acceptance band ±30%, not measured uncertainty', cite: 'Dotti et al. 1988', me: n && n.t3 != null ? `${fmt(n.t3, 1)} h (mean of ${n.n3})` : 'not yet', st: n && n.t3 != null ? status(n.t3, 19 * 0.7, 19 * 1.3, 0.2) : 'na' },
        { q: 'Stage 4: dendrites grow', lit: 'Calibration target ~day 4; author-selected acceptance interval 3–5 days', cite: 'Dotti et al. 1988', me: n && n.t4 != null ? `day ${fmt(n.t4 / 24, 1)} (mean of ${n.n4})` : 'not yet', st: n && n.t4 != null ? status(n.t4 / 24, 3, 5, 0.2) : 'na' },
        { q: 'Axon length: day 4 calibration target', lit: 'Author-selected target ~250 µm; acceptance band ±30%, not experimental error.', cite: 'approximate Dotti-derived calibration; digitization not independently verified', me: r4 ? `${fmt(r4.neurons.axon,0)} µm` : 'not yet', st: r4 ? status(r4.neurons.axon,175,325,0.2) : 'na' },
        { q: 'Axon length: day 7 calibration target', lit: 'Author-selected target ~420 µm; acceptance band ±25%, not experimental error.', cite: 'approximate Dotti-derived calibration; digitization not independently verified', me: r7 ? `${fmt(r7.neurons.axon,0)} µm` : 'not yet', st: r7 ? status(r7.neurons.axon,315,525,0.2) : 'na' },
        { q: 'Dendrites by day 7', lit: 'Approximate calibration target ~270 µm total per neuron; author-selected ±30% band, not measured uncertainty', cite: 'Dotti et al. 1988', me: r7 ? `${fmt(r7.neurons.dend, 0)} µm in total` : 'not yet', st: r7 ? status(r7.neurons.dend, 270 * 0.7, 270 * 1.3, 0.2) : 'na' },
      ];
    },
    cams(H) { const b = H.bounds, W = b.x1 - b.x0; return [{ label: 'Whole coverslip', t: [W / 2, (b.y1 - b.y0) / 2, 0], fit: [W * 1.05, W * 1.05], th: -Math.PI / 2, ph: 0.02 }, { label: 'Tilted', t: [W / 2, (b.y1 - b.y0) / 2, 0], r: W * 1.5, th: -Math.PI / 2 + 0.3, ph: 0.85 }]; },
    labels() { return []; },
    defaultFrame(H, rows) { return rows.length - 1; },
  };

  const gel = {
    clock: 'hour',
    title(H) { const k = H.opts && H.opts.stiffness != null ? H.opts.stiffness : 1; return H.scenario === 'gelSurface' ? `DRG neurons on a ${k} kPa gel surface` : `DRG neurons inside a ${k} kPa gel`; },
    stats(r) { const n = r.neurons || {}; return [['Neurons', String(n.n || 0), ''], ['Neurite length, mean', fmt(r.neuriteLen, 0), 'µm per neuron'], ['Longest neurite', fmt(n.longest, 0), 'µm'], ['Axons', fmt(n.axon, 0), 'µm per neuron']]; },
    chart(H) { return { title: 'Neurite outgrowth', xMax: H.hours, xLabel: 'hour', yMin: 0, yMax: 1200, yLabel: 'µm per neuron', x: hr, series: [{ label: 'Neurite length, mean', color: tok('--ch-axon'), w: 2, get: (r) => r.neuriteLen }], hlines: [], fns: [], bands: [], refRuns: true }; },
    bench(rows, H) {
      const last = rows[rows.length - 1];
      const trend = (window.__gelTrend || []);
      const rowsT = trend.map((g) => `${g.k} kPa ${g.len.toFixed(0)} µm`).join(' · ');
      const range = trend.filter((g) => g.k >= 0.5), mono = range.length > 2 && range.every((g, i) => i === 0 || g.len < range[i - 1].len);
      return [
        { q: 'Neurite growth falls as the gel stiffens', lit: 'DRG neurite extension rate is inversely related to agarose gel stiffness (0.75-2.0% gels)', cite: 'Balgude et al. 2001, Biomaterials 22:1077', me: rowsT ? `mean per neuron at 48 h, 3 seeds: ${rowsT} (falls from 0.5 kPa up; the softest gel grips too weakly)` : 'see the stiffness series in the library', st: trend.length ? (mono ? 'ok' : 'bad') : 'na' },
        { q: 'This run', lit: H.scenario === 'gelSurface' ? 'On a surface nothing confines the growth cone, and the model predicts faster growth on stiffer gel' : 'Inside the gel the matrix confines the growth cone as well as gripping it', cite: 'model', me: last ? `${fmt(last.neuriteLen, 0)} µm per neuron at ${fmt(hr(last), 0)} h` : '–', st: 'info' },
      ];
    },
    cams(H) { const b = H.bounds, S = b.x1 - b.x0, c = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, H.dim === 2 ? 0 : (b.z0 + b.z1) / 2]; return H.dim === 2 ? [{ label: 'Top', t: c, fit: [S, S], th: -Math.PI / 2, ph: 0.02 }, { label: 'Tilted', t: c, r: S * 1.4, th: -Math.PI / 2 + 0.3, ph: 0.9 }] : [{ label: 'Oblique', t: c, fit: [S * 2, S * 2], th: -0.9, ph: 1.05 }, { label: 'Close', t: c, r: S * 0.9, th: -0.6, ph: 1.15 }, { label: 'Top', t: c, fit: [S * 1.6, S * 1.6], th: -Math.PI / 2, ph: 0.02 }]; },
    labels() { return []; },
    defaultFrame(H, rows) { return rows.length - 1; },
  };
  const ADAPTERS = { conduit, dish, gel, gelSurface: gel };

  // ====================================================================== small vector and matrix helpers (column-major, like WebGL)
  const V3 = {
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    norm: (a) => { const L = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / L, a[1] / L, a[2] / L]; },
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  };
  function perspective(fovDeg, aspect, near, far) {
    const f = 1 / Math.tan(fovDeg * Math.PI / 360), nf = 1 / (near - far), m = new Float32Array(16);
    m[0] = f / aspect; m[5] = f; m[10] = (far + near) * nf; m[11] = -1; m[14] = 2 * far * near * nf; return m;
  }
  function lookAt(eye, at, up) {
    const z = V3.norm(V3.sub(eye, at)), x = V3.norm(V3.cross(up, z)), y = V3.cross(z, x), m = new Float32Array(16);
    m[0] = x[0]; m[4] = x[1]; m[8] = x[2]; m[1] = y[0]; m[5] = y[1]; m[9] = y[2]; m[2] = z[0]; m[6] = z[1]; m[10] = z[2];
    m[12] = -V3.dot(x, eye); m[13] = -V3.dot(y, eye); m[14] = -V3.dot(z, eye); m[15] = 1; return m;
  }
  function mulVec(m, p) { const x = p[0], y = p[1], z = p[2]; return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14], m[3] * x + m[7] * y + m[11] * z + m[15]]; }

  // Raw current values are immutable; history is a separate, explicitly labelled object.
  const normRow = (r, prev) => NE4.evidenceRow(r, prev);
  const normRows = rows => NE4.evidenceRows(rows);
  // ====================================================================== orbit camera (z up)
  class Orbit {
    constructor(el, onChange) {
      this.el = el; this.onChange = onChange; this.fov = 35; this.aspect = 1;
      this.t = [0, 0, 0]; this.r = 1000; this.th = -Math.PI / 2; this.ph = 1.1; this.anim = null; this.ptr = new Map(); this.extent = 1e4;
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); this.ptr.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, s: e.shiftKey }); this.anim = null; });
      el.addEventListener('pointermove', (e) => this._move(e));
      const up = (e) => { this.ptr.delete(e.pointerId); this._pinch = null; };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      el.addEventListener('wheel', (e) => { e.preventDefault(); this.anim = null; this.r = clamp(this.r * Math.exp(e.deltaY * (e.deltaMode ? 0.05 : 0.0012)), 20, this.extent * 4); this.apply(); }, { passive: false });
      this.apply();
    }
    _move(e) {
      const p = this.ptr.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (this.ptr.size === 2) {
        const [a, b] = [...this.ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (this._pinch) { this.r = clamp(this.r * this._pinch / Math.max(1, d), 20, this.extent * 4); this._pan(dx / 2, dy / 2); }
        this._pinch = d; this.apply(); return;
      }
      if (p.b === 2 || p.b === 1 || p.s) this._pan(dx, dy);
      else { this.th -= dx * 0.008; this.ph = clamp(this.ph - dy * 0.008, 0.02, Math.PI - 0.02); }
      this.apply();
    }
    _pan(dx, dy) {
      const k = 2 * this.r * Math.tan(this.fov * Math.PI / 360) / Math.max(1, this.el.clientHeight), V = this.view;
      const right = [V[0], V[4], V[8]], upv = [V[1], V[5], V[9]];
      for (let i = 0; i < 3; i++) this.t[i] += -dx * k * right[i] + dy * k * upv[i];
    }
    eye() { const s = Math.sin(this.ph); return [this.t[0] + this.r * s * Math.cos(this.th), this.t[1] + this.r * s * Math.sin(this.th), this.t[2] + this.r * Math.cos(this.ph)]; }
    apply() {
      this.view = lookAt(this.eye(), this.t, [0, 0, 1]);
      this.near = Math.max(0.5, this.r * 0.004); this.far = this.r * 4 + this.extent * 3;
      this.proj = perspective(this.fov, this.aspect, this.near, this.far);
      this.onChange();
    }
    go(p, animate) {
      const tf = Math.tan(this.fov * Math.PI / 360);
      const r = p.fit ? Math.max(p.fit[0] / 2 / (tf * this.aspect), p.fit[1] / 2 / tf) : p.r;
      const to = { t: p.t.slice(), r, th: p.th, ph: p.ph };
      if (!animate || reduceMotion) { this.t = to.t; this.r = to.r; this.th = to.th; this.ph = to.ph; this.apply(); return; }
      let dth = to.th - this.th; while (dth > Math.PI) dth -= 2 * Math.PI; while (dth < -Math.PI) dth += 2 * Math.PI;
      this.anim = { from: { t: this.t.slice(), r: this.r, th: this.th, ph: this.ph }, to, dth, t0: performance.now() };
    }
    tick(now) {
      const a = this.anim; if (!a) return false;
      const u = clamp((now - a.t0) / 700, 0, 1), k = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
      for (let i = 0; i < 3; i++) this.t[i] = a.from.t[i] + (a.to.t[i] - a.from.t[i]) * k;
      this.r = Math.exp(Math.log(a.from.r) + (Math.log(a.to.r) - Math.log(a.from.r)) * k);
      this.th = a.from.th + a.dth * k; this.ph = a.from.ph + (a.to.ph - a.from.ph) * k; this.apply();
      if (u >= 1) this.anim = null; return true;
    }
  }

  // ====================================================================== renderer (plain WebGL)
  const CELL_VS = `
    attribute vec3 position; attribute vec3 color; attribute float size; attribute vec3 ori; attribute float elong;
    uniform mat4 uMV, uP; uniform float uScale, uBoost, uMinPx, uPR, uMaxPt; uniform vec2 uHalf;
    varying vec3 vColor; varying float vAng; varying float vAsp;
    void main() {
      vec4 mv = uMV * vec4(position, 1.0); vec4 cp = uP * mv; gl_Position = cp;
      float dist = max(1e-3, -mv.z), d = size * uBoost;
      float shortPx = d * uScale / dist;
      vec3 od = normalize((uMV * vec4(ori, 0.0)).xyz + vec3(1e-6));
      vec4 cp2 = uP * vec4(mv.xyz + od * d * elong * 0.5, 1.0);
      vec2 dpx = (cp2.xy / max(cp2.w, 1e-3) - cp.xy / max(cp.w, 1e-3)) * uHalf;
      float longPx = max(shortPx, length(dpx) * 2.0);
      vAng = atan(dpx.y, dpx.x); vAsp = clamp(longPx / max(shortPx, 1e-3), 1.0, max(1.0, elong));
      gl_PointSize = min(max(longPx, uMinPx) * uPR, uMaxPt); vColor = color;
    }`;
  const CELL_FS = `
    precision mediump float;
    varying vec3 vColor; varying float vAng; varying float vAsp;
    void main() {
      vec2 p = gl_PointCoord - 0.5; p.y = -p.y;
      float c = cos(vAng), s = sin(vAng); vec2 q = vec2(c * p.x + s * p.y, -s * p.x + c * p.y); q.y *= vAsp;
      float r = length(q) * 2.0; if (r > 1.0) discard;
      float shade = 0.55 + 0.45 * (1.0 - r * r), rim = smoothstep(0.8, 1.0, r);
      gl_FragColor = vec4(vColor * shade + vColor * rim * 0.3, 1.0);
    }`;
  const GLOW_VS = `
    attribute vec3 position; attribute vec3 color; attribute float v;
    uniform mat4 uMV, uP; uniform float uScale, uSize, uPR, uGain, uMinPx, uMaxPx, uMaxPt;
    varying vec3 vColor;
    void main() {
      vec4 mv = uMV * vec4(position, 1.0); gl_Position = uP * mv;
      float px = clamp(uSize * uScale / max(1e-3, -mv.z), uMinPx, uMaxPx);
      gl_PointSize = min(px * uPR, uMaxPt); vColor = color * v * uGain;
      if (v <= 0.0) gl_PointSize = 0.0;
    }`;
  const GLOW_FS = `
    precision mediump float;
    varying vec3 vColor;
    void main() { vec2 p = gl_PointCoord - 0.5; float r2 = dot(p, p) * 4.0; if (r2 > 1.0) discard; gl_FragColor = vec4(vColor * exp(-r2 * 2.2), 1.0); }`;
  const LINE_VS = `
    attribute vec3 position; attribute vec3 color; uniform mat4 uMV, uP; varying vec3 vColor;
    void main() { gl_Position = uP * uMV * vec4(position, 1.0); vColor = color; }`;
  const LINE_FS = `
    precision mediump float; varying vec3 vColor; uniform float uAlpha;
    void main() { gl_FragColor = vec4(vColor * uAlpha, 1.0); }`;

  const rgb = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

  /** a drawable: named attribute arrays (grown on demand) uploaded to GL buffers */
  class Batch {
    constructor(gl, spec, cap) { this.gl = gl; this.spec = spec; this.n = 0; this.buf = {}; this.arr = {}; this.cap = 0; this.dirty = true; this.grow(cap); }
    grow(cap) {
      if (cap <= this.cap) return; let c = Math.max(this.cap || 64, 64); while (c < cap) c *= 2;
      for (const [name, k] of this.spec) { const a = new Float32Array(c * k); if (this.arr[name]) a.set(this.arr[name]); this.arr[name] = a; if (!this.buf[name]) this.buf[name] = this.gl.createBuffer(); }
      this.cap = c; this.dirty = true;
    }
    upload() {
      if (!this.dirty) return; const gl = this.gl;
      for (const [name, k] of this.spec) { gl.bindBuffer(gl.ARRAY_BUFFER, this.buf[name]); gl.bufferData(gl.ARRAY_BUFFER, this.arr[name].subarray(0, Math.max(1, this.n) * k), gl.DYNAMIC_DRAW); }
      this.dirty = false;
    }
    dispose() { for (const k in this.buf) this.gl.deleteBuffer(this.buf[k]); }
  }

  class View {
    constructor(canvas) {
      this.canvas = canvas;
      const gl = canvas.getContext('webgl', { antialias: true, alpha: false, preserveDrawingBuffer: false });
      if (!gl) throw new Error('WebGL is not available in this browser, so the 3-D view cannot start.');
      this.gl = gl; this.PR = Math.min(2, window.devicePixelRatio || 1);
      this.maxPt = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1] || 64;
      this.prog = { cell: this._prog(CELL_VS, CELL_FS), glow: this._prog(GLOW_VS, GLOW_FS), line: this._prog(LINE_VS, LINE_FS) };
      this.orbit = new Orbit(canvas, () => { this.dirty = true; this.camMoved = true; });
      this.boost = 1; this.fgain = 1; this.on = {}; this.dirty = true; this.scale = 1; this.W = 1; this.Hh = 1;
      this.bg = rgb(tok('--bg'));
      const ro = new ResizeObserver(() => this.resize()); ro.observe(canvas.parentElement); this.resize();
    }
    _prog(vs, fs) {
      const gl = this.gl, mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const loc = { p, a: {}, u: {} }, na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES), nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < na; i++) { const a = gl.getActiveAttrib(p, i); loc.a[a.name] = gl.getAttribLocation(p, a.name); }
      for (let i = 0; i < nu; i++) { const u = gl.getActiveUniform(p, i); loc.u[u.name] = gl.getUniformLocation(p, u.name); }
      return loc;
    }
    resize() {
      const el = this.canvas.parentElement, w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
      this.canvas.width = Math.round(w * this.PR); this.canvas.height = Math.round(h * this.PR); this.W = w; this.Hh = h;
      this.orbit.aspect = w / h; this.orbit.apply(); this.scale = h / (2 * Math.tan(this.orbit.fov * Math.PI / 360));
      this.dirty = true; this.camMoved = true;
    }
    clear() { for (const b of [this.frameB, this.statB, this.dynB, this.lineB, this.tipB, ...(this.fieldBs || []).map((f) => f.b)]) if (b) b.dispose(); }
    setScene(H, layerOn) {
      this.clear(); this.H = H; this.on = layerOn; const gl = this.gl;
      const sp = H.scene.space, b = H.bounds;
      this.types = H.scene.types.map((t) => ({ key: t.key, color: rgb(t.color), elong: t.elongate || 1, kind: t.kind }));
      this.orbit.extent = Math.max(b.x1 - b.x0, b.y1 - b.y0, (b.z1 - b.z0) || 0);
      // scaffold: tube, box or coverslip
      const fr = [], fc = [], seg = (a, c, col) => { fr.push(a[0], a[1], a[2], c[0], c[1], c[2]); fc.push(...col, ...col); };
      const wall = rgb('#2b3644'), face = rgb('#6b5a7a'), stumpC = rgb('#3a3442');
      if (sp.kind === 'tube') {
        const R = sp.R, L = b.x1, n = 64;
        const ringAt = (x, col) => { for (let k = 0; k < n; k++) { const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2; seg([x, R * Math.cos(a0), R * Math.sin(a0)], [x, R * Math.cos(a1), R * Math.sin(a1)], col); } };
        const c = H.conduit;
        for (let x = 0; x <= L + 1; x += 1000) ringAt(Math.min(x, L), wall);
        ringAt(L, wall);
        for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; seg([0, R * Math.cos(a), R * Math.sin(a)], [L, R * Math.cos(a), R * Math.sin(a)], wall); }
        if (c) {
          // stumps: denser longitudinal hatching so tissue reads apart from the open gap
          for (let k = 0; k < 24; k++) { const a = (k + 0.5) / 24 * Math.PI * 2, rr = R * 0.97; seg([0, rr * Math.cos(a), rr * Math.sin(a)], [c.Lp, rr * Math.cos(a), rr * Math.sin(a)], stumpC); seg([c.Lp + c.gap, rr * Math.cos(a), rr * Math.sin(a)], [L, rr * Math.cos(a), rr * Math.sin(a)], stumpC); }
          ringAt(c.Lp, face); ringAt(c.Lp + c.gap, face);
        }
      } else if (sp.kind === 'volume') {
        const X = [b.x0, b.x1], Y = [b.y0, b.y1], Z = [b.z0, b.z1], col = rgb('#3a4656');
        for (const y of Y) for (const z of Z) seg([X[0], y, z], [X[1], y, z], col);
        for (const x of X) for (const z of Z) seg([x, Y[0], z], [x, Y[1], z], col);
        for (const x of X) for (const y of Y) seg([x, y, Z[0]], [x, y, Z[1]], col);
      } else {
        const W = b.x1 - b.x0, Hh = b.y1 - b.y0, step = W > 3000 ? 500 : 100, col = rgb('#161d26');
        for (let x = 0; x <= W + 0.1; x += step) seg([x, 0, -0.5], [x, Hh, -0.5], col);
        for (let y = 0; y <= Hh + 0.1; y += step) seg([0, y, -0.5], [W, y, -0.5], col);
      }
      this.frameB = new Batch(gl, [['position', 3], ['color', 3]], fr.length / 3); this.frameB.arr.position.set(fr); this.frameB.arr.color.set(fc); this.frameB.n = fr.length / 3;
      // fields as glowing voxels
      this.fieldBs = (H.fields || []).map((f) => {
        const B = new Batch(gl, [['position', 3], ['color', 3], ['v', 1]], f.n), cc = rgb(f.color), P = B.arr.position, C = B.arr.color;
        f.idx.forEach((q, a) => { const i = q % f.nx, j = Math.floor(q / f.nx) % f.ny, k = Math.floor(q / (f.nx * f.ny)); P[3 * a] = b.x0 + (i + 0.5) * f.h; P[3 * a + 1] = b.y0 + (j + 0.5) * f.h; P[3 * a + 2] = sp.dim === 2 ? -1 : b.z0 + (k + 0.5) * f.h; C[3 * a] = cc[0]; C[3 * a + 1] = cc[1]; C[3 * a + 2] = cc[2]; });
        B.n = f.n; const gain = { fibrin: 0.035, debris: 0.045, trophin: 0.05, glia: 0.06, exudate: 0.04 }[f.name] || 0.05;
        return { name: f.name, b: B, h: f.h, gain };
      });
      const cellSpec = [['position', 3], ['color', 3], ['size', 1], ['ori', 3], ['elong', 1]];
      this.statB = new Batch(gl, cellSpec, H.staticCells.n || 1); this.dynB = new Batch(gl, cellSpec, 4096);
      this.lineB = new Batch(gl, [['position', 3], ['color', 3]], 16384); this.tipB = new Batch(gl, [['position', 3], ['color', 3], ['v', 1]], 1024);
      this.statCells = NE4.decodeStatic(H); this._fillCells(this.statB, this.statCells);
      this.identCol = { 1: rgb(tok('--ch-minor')), 2: rgb(tok('--ch-axon')), 3: rgb(tok('--ch-dend')) };
      this.F = null; this.dirty = true;
    }
    _fillCells(B, C) {
      B.grow(C.n); const P = B.arr.position, Co = B.arr.color, Sz = B.arr.size, Or = B.arr.ori, El = B.arr.elong; let m = 0;
      for (let i = 0; i < C.n; i++) {
        const T = this.types[C.typ[i]]; if (!T || !this.on['c:' + T.key]) continue;
        P[3 * m] = C.pos[3 * i]; P[3 * m + 1] = C.pos[3 * i + 1]; P[3 * m + 2] = C.pos[3 * i + 2];
        const dim = C.flg && (C.flg[i] & 1) ? 0.3 : 1; Co[3 * m] = T.color[0] * dim; Co[3 * m + 1] = T.color[1] * dim; Co[3 * m + 2] = T.color[2] * dim;
        Sz[m] = C.rad[i] / 2; Or[3 * m] = C.ori[3 * i] / 127; Or[3 * m + 1] = C.ori[3 * i + 1] / 127; Or[3 * m + 2] = C.ori[3 * i + 2] / 127; El[m] = T.elong; m++;
      }
      B.n = m; B.dirty = true;
    }
    setFrame(F) {
      if (!this.H) return; this.F = F;
      this._fillCells(this.dynB, F.cells);
      const pl = F.polys, nSeg = Math.max(0, pl.npts - pl.n), LB = this.lineB; LB.grow(2 * nSeg + 2);
      const LP = LB.arr.position, LC = LB.arr.color; let o = 0, s = 0; const showAx = this.on['n:axon'], showDe = this.on['n:dend'];
      for (let k = 0; k < pl.n; k++) {
        const c = pl.cnt[k], id = pl.ident[k], col = this.identCol[id] || this.identCol[1];
        if (id === 2 ? showAx : showDe) for (let j = 0; j < c - 1; j++) {
          const a = 3 * (s + j), b2 = 3 * (s + j + 1);
          LP[o] = pl.pts[a]; LP[o + 1] = pl.pts[a + 1]; LP[o + 2] = pl.pts[a + 2]; LC[o] = col[0]; LC[o + 1] = col[1]; LC[o + 2] = col[2]; o += 3;
          LP[o] = pl.pts[b2]; LP[o + 1] = pl.pts[b2 + 1]; LP[o + 2] = pl.pts[b2 + 2]; LC[o] = col[0]; LC[o + 1] = col[1]; LC[o + 2] = col[2]; o += 3;
        }
        s += c;
      }
      LB.n = o / 3; LB.dirty = true;
      const TB = this.tipB; TB.grow(pl.n + 1); const TP = TB.arr.position, TC = TB.arr.color, TV = TB.arr.v; let m = 0;
      if (this.on['tips']) for (let k = 0; k < pl.n; k++) {
        const v = F.tips.v[k], col = this.identCol[pl.ident[k]] || this.identCol[1], g = v === 255 ? 0.3 : 0.5 + 0.9 * Math.min(1, v / 250);
        TP[3 * m] = F.tips.pos[3 * k]; TP[3 * m + 1] = F.tips.pos[3 * k + 1]; TP[3 * m + 2] = F.tips.pos[3 * k + 2];
        TC[3 * m] = Math.min(1, col[0] * g + 0.2 * g); TC[3 * m + 1] = Math.min(1, col[1] * g + 0.2 * g); TC[3 * m + 2] = Math.min(1, col[2] * g + 0.2 * g); TV[m] = 1; m++;
      }
      TB.n = m; TB.dirty = true;
      if (F.fields && F.fields.length) this.fieldBs.forEach((fo, k) => { const src = F.fields[k]; if (!src) return; const v = fo.b.arr.v; for (let a = 0; a < src.length; a++) v[a] = src[a] / 255; fo.b.dirty = true; });
      this.dirty = true;
    }
    setLayers(on) { this.on = on; if (!this.H) return; this._fillCells(this.statB, this.statCells); if (this.F) this.setFrame(this.F); this.dirty = true; }
    setBoost(b) { this.boost = b; this.dirty = true; }
    setGain(g) { this.fgain = g; this.dirty = true; }
    project(p) { const c = mulVec(this.orbit.proj, mulVec(this.orbit.view, p)); if (c[3] <= 0) return { vis: false, x: 0, y: 0 }; const x = c[0] / c[3], y = c[1] / c[3], z = c[2] / c[3]; return { x: (x + 1) / 2 * this.W, y: (1 - y) / 2 * this.Hh, vis: z > -1 && z < 1 && Math.abs(x) < 1.2 && Math.abs(y) < 1.2 }; }
    worldPerPx() { return 2 * this.orbit.r * Math.tan(this.orbit.fov * Math.PI / 360) / this.Hh; }
    _bind(P, B) {
      const gl = this.gl; B.upload();
      for (const [name, k] of B.spec) { const l = P.a[name]; if (l == null || l < 0) continue; gl.bindBuffer(gl.ARRAY_BUFFER, B.buf[name]); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, k, gl.FLOAT, false, 0, 0); }
    }
    _unbind(P) { const gl = this.gl; for (const k in P.a) gl.disableVertexAttribArray(P.a[k]); }
    _common(P) { const gl = this.gl; gl.useProgram(P.p); gl.uniformMatrix4fv(P.u.uMV, false, this.orbit.view); gl.uniformMatrix4fv(P.u.uP, false, this.orbit.proj); }
    render() {
      const gl = this.gl; this.dirty = false;
      gl.viewport(0, 0, this.canvas.width, this.canvas.height); gl.clearColor(this.bg[0], this.bg[1], this.bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (!this.H) return;
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      // scaffold lines
      const L = this.prog.line;
      if (this.on['frame'] !== false && this.frameB.n) { gl.disable(gl.BLEND); gl.depthMask(true); this._common(L); gl.uniform1f(L.u.uAlpha, 1); this._bind(L, this.frameB); gl.drawArrays(gl.LINES, 0, this.frameB.n); this._unbind(L); }
      // cells (opaque sprites)
      const C = this.prog.cell; this._common(C);
      gl.uniform1f(C.u.uScale, this.scale); gl.uniform1f(C.u.uBoost, this.boost); gl.uniform1f(C.u.uMinPx, 2.2); gl.uniform1f(C.u.uPR, this.PR); gl.uniform1f(C.u.uMaxPt, this.maxPt); gl.uniform2f(C.u.uHalf, this.W / 2, this.Hh / 2);
      for (const B of [this.statB, this.dynB]) if (B.n) { this._bind(C, B); gl.drawArrays(gl.POINTS, 0, B.n); }
      this._unbind(C);
      // additive layers: neurites, fields, growth cones
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
      if (this.lineB.n) { this._common(L); gl.uniform1f(L.u.uAlpha, this.H.scenario === 'conduit' ? 0.6 : 0.95); this._bind(L, this.lineB); gl.drawArrays(gl.LINES, 0, this.lineB.n); this._unbind(L); }
      const G = this.prog.glow; this._common(G); gl.uniform1f(G.u.uScale, this.scale); gl.uniform1f(G.u.uPR, this.PR); gl.uniform1f(G.u.uMaxPt, this.maxPt);
      for (const fo of this.fieldBs) {
        if (!this.on['f:' + fo.name] || !fo.b.n) continue;
        gl.uniform1f(G.u.uSize, fo.h * 1.25); gl.uniform1f(G.u.uGain, fo.gain * this.fgain); gl.uniform1f(G.u.uMinPx, 1.5); gl.uniform1f(G.u.uMaxPx, 160);
        this._bind(G, fo.b); gl.drawArrays(gl.POINTS, 0, fo.b.n);
      }
      if (this.tipB.n) { gl.uniform1f(G.u.uSize, 0); gl.uniform1f(G.u.uGain, 1); gl.uniform1f(G.u.uMinPx, 6); gl.uniform1f(G.u.uMaxPx, 6); this._bind(G, this.tipB); gl.drawArrays(gl.POINTS, 0, this.tipB.n); }
      this._unbind(G); gl.depthMask(true); gl.disable(gl.BLEND);
    }
  }

  // ====================================================================== chart (canvas 2-D)
  function drawChart(cv, spec, rows, tNow, H) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    if (!spec) return;
    const fg = tok('--fg'), dim = tok('--dim'), faint = tok('--faint'), line = tok('--line');
    const L = 40, R = 10, T = 8, B = 34, pw = w - L - R, ph = h - T - B;
    // y range grows with the data if needed
    let yMax = spec.yMax; for (const r of rows) for (const s of spec.series) { const v = s.get(r); if (v != null && isFinite(v) && v > yMax) yMax = v * 1.08; }
    const X = (x) => L + x / spec.xMax * pw, Y = (y) => T + ph - (y - spec.yMin) / (yMax - spec.yMin) * ph;
    g.font = '10.5px ' + tok('--f-mono'); g.textBaseline = 'middle';
    // bands (literature phases)
    for (const b of spec.bands || []) {
      if (b.x0 >= spec.xMax) continue; const x0 = X(b.x0), x1 = X(Math.min(spec.xMax, b.x1));
      g.fillStyle = 'rgba(255,255,255,0.035)'; g.fillRect(x0, T, x1 - x0, ph);
      g.strokeStyle = line; g.beginPath(); g.moveTo(x0 + 0.5, T); g.lineTo(x0 + 0.5, T + ph); g.stroke();
      g.fillStyle = faint; g.textAlign = 'left'; g.save(); g.beginPath(); g.rect(x0, T, x1 - x0, ph); g.clip(); g.fillText(b.label, x0 + 4, T + ph - 8); g.restore();
    }
    // grid and axes
    const yStep = niceStep((yMax - spec.yMin) / 4), xStep = niceStep(spec.xMax / 6);
    g.strokeStyle = line; g.lineWidth = 1; g.fillStyle = dim; g.textAlign = 'right';
    for (let y = Math.ceil(spec.yMin / yStep) * yStep; y <= yMax + 1e-9; y += yStep) { const yy = Math.round(Y(y)) + 0.5; g.beginPath(); g.moveTo(L, yy); g.lineTo(L + pw, yy); g.stroke(); g.fillText(trimNum(y), L - 6, yy); }
    g.textAlign = 'center'; g.textBaseline = 'top';
    for (let x = 0; x <= spec.xMax + 1e-9; x += xStep) { const xx = Math.round(X(x)) + 0.5; g.beginPath(); g.moveTo(xx, T + ph); g.lineTo(xx, T + ph + 4); g.stroke(); g.fillText(trimNum(x), xx, T + ph + 6); }
    g.fillStyle = faint; g.fillText(spec.xLabel, L + pw / 2, T + ph + 20);
    g.save(); g.translate(10, T + ph / 2); g.rotate(-Math.PI / 2); g.textBaseline = 'middle'; g.fillText(spec.yLabel, 0, 0); g.restore();
    // reference lines
    g.save(); g.beginPath(); g.rect(L, T, pw, ph); g.clip();
    for (const hl of spec.hlines || []) { const yy = Math.round(Y(hl.y)) + 0.5; g.strokeStyle = faint; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(L, yy); g.lineTo(L + pw, yy); g.stroke(); g.setLineDash([]); g.fillStyle = faint; g.textAlign = 'left'; g.textBaseline = 'bottom'; g.fillText(hl.label, L + 4, yy - 2); }
    for (const f of spec.fns || []) {
      g.strokeStyle = fg; g.globalAlpha = 0.45; g.setLineDash([6, 4]); g.beginPath(); let started = false, lx = 0, ly = 0;
      for (let k = 0; k <= 120; k++) { const x = k / 120 * spec.xMax, y = f.fn(x); if (y < spec.yMin) continue; const px = X(x), py = Y(y); if (!started) { g.moveTo(px, py); started = true; } else g.lineTo(px, py); lx = px; ly = py; if (y > yMax) break; }
      g.stroke(); g.setLineDash([]); g.globalAlpha = 0.8; g.fillStyle = dim; g.textAlign = 'left'; g.textBaseline = 'middle';
      const lab = spec.fns.indexOf(f); const yLab = clamp(Y(f.fn(spec.xMax * (0.18 + 0.3 * lab))) - 10, T + 10, T + ph - 10); g.fillText(f.label, X(spec.xMax * (0.18 + 0.3 * lab)) + 6, yLab); g.globalAlpha = 1;
    }
    for (const p of spec.points || []) { const px = X(p.x), py = Y(p.y); g.strokeStyle = p.color; g.fillStyle = p.color; g.beginPath(); g.moveTo(px, Y(p.y * (1 - p.e))); g.lineTo(px, Y(p.y * (1 + p.e))); g.stroke(); g.beginPath(); g.moveTo(px - 4, py - 4); g.lineTo(px + 4, py + 4); g.moveTo(px - 4, py + 4); g.lineTo(px + 4, py - 4); g.lineWidth = 1.6; g.stroke(); g.lineWidth = 1; }
    // series
    for (const s of spec.series) {
      g.strokeStyle = s.color; g.lineWidth = s.w || 1.5; g.setLineDash(s.dash || []); g.beginPath(); let started = false;
      for (const r of rows) { const v = s.get(r); if (v == null || !isFinite(v)) { started = false; continue; } const px = X(spec.x(r)), py = Y(v); if (!started) { g.moveTo(px, py); started = true; } else g.lineTo(px, py); }
      g.stroke(); g.setLineDash([]); g.lineWidth = 1;
    }
    // playhead
    if (tNow != null) { const xx = Math.round(X(spec.x({ t: tNow }))) + 0.5; g.strokeStyle = fg; g.globalAlpha = 0.6; g.beginPath(); g.moveTo(xx, T); g.lineTo(xx, T + ph); g.stroke(); g.globalAlpha = 1; }
    g.restore();
  }
  function niceStep(raw) { const p = Math.pow(10, Math.floor(Math.log10(raw || 1))), m = raw / p; return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p; }
  function trimNum(v) { return Math.abs(v) >= 100 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1); }

  // CPU projection fallback: real recorded 3-D coordinates, no depth shading or field voxels.
  // This keeps playback, camera, measurements and live workers usable without WebGL.
  class ProjectionView {
    constructor(canvas){
      this.canvas=canvas;this.g=canvas.getContext('2d');if(!this.g)throw Error('Neither WebGL nor Canvas 2-D is available');
      this.isProjection=true;this.on={};this.boost=1;this.dirty=true;this.camMoved=true;
      this.orbit=new Orbit(canvas,()=>{this.dirty=true;this.camMoved=true;});
      const resize=()=>{this.W=Math.max(1,canvas.parentElement.clientWidth);this.Hh=Math.max(1,canvas.parentElement.clientHeight);this.PR=Math.min(1.5,devicePixelRatio||1);canvas.width=Math.round(this.W*this.PR);canvas.height=Math.round(this.Hh*this.PR);this.orbit.aspect=this.W/this.Hh;this.orbit.apply();this.dirty=this.camMoved=true;};
      new ResizeObserver(resize).observe(canvas.parentElement);resize();
    }
    setScene(H,on){this.H=H;this.on=on;this.F=null;this.static=NE4.decodeStatic(H);this.orbit.extent=Math.max(H.bounds.x1-H.bounds.x0,H.bounds.y1-H.bounds.y0,H.bounds.z1-H.bounds.z0);this.dirty=true;}
    setFrame(F){this.F=F;this.dirty=true;}
    setLayers(on){this.on=on;this.dirty=true;}
    setBoost(n){this.boost=n;this.dirty=true;}
    setGain(){}
    project(p){const c=mulVec(this.orbit.proj,mulVec(this.orbit.view,p));if(c[3]<=0)return {vis:false,x:0,y:0};const x=c[0]/c[3],y=c[1]/c[3],z=c[2]/c[3];return {x:(x+1)*this.W/2,y:(1-y)*this.Hh/2,vis:z>-1&&z<1&&Math.abs(x)<1.2&&Math.abs(y)<1.2};}
    worldPerPx(){return 2*this.orbit.r*Math.tan(this.orbit.fov*Math.PI/360)/this.Hh;}
    render(){
      this.dirty=false;const g=this.g;g.setTransform(this.PR,0,0,this.PR,0,0);g.fillStyle='#0a0d10';g.fillRect(0,0,this.W,this.Hh);if(!this.H)return;
      const line=(a,b,color)=>{const p=this.project(a),q=this.project(b);if(!p.vis&&!q.vis)return;g.strokeStyle=color;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(q.x,q.y);g.stroke();};
      const b=this.H.bounds,sp=this.H.scene.space;g.lineWidth=.7;
      if(this.on.frame!==false){
        if(sp.kind==='tube'){
          for(const x of [b.x0,this.H.conduit.Lp,this.H.conduit.Lp+this.H.conduit.gap,b.x1])for(let i=0;i<32;i++){const a=i*Math.PI/16,c=(i+1)*Math.PI/16;line([x,sp.R*Math.cos(a),sp.R*Math.sin(a)],[x,sp.R*Math.cos(c),sp.R*Math.sin(c)],'#38434d');}
          for(let i=0;i<8;i++){const a=i*Math.PI/4,y=sp.R*Math.cos(a),z=sp.R*Math.sin(a);line([b.x0,y,z],[b.x1,y,z],'#283440');}
        }else{
          for(const y of [b.y0,b.y1])for(const z of [b.z0,b.z1])line([b.x0,y,z],[b.x1,y,z],'#34404b');
          for(const x of [b.x0,b.x1])for(const z of [b.z0,b.z1])line([x,b.y0,z],[x,b.y1,z],'#34404b');
          if(sp.dim===3)for(const x of [b.x0,b.x1])for(const y of [b.y0,b.y1])line([x,y,b.z0],[x,y,b.z1],'#34404b');
        }
      }
      const cells=C=>{for(let i=0;i<C.n;i++){const T=this.H.scene.types[C.typ[i]];if(!T||this.on['c:'+T.key]===false)continue;const p=this.project([C.pos[i*3],C.pos[i*3+1],C.pos[i*3+2]]);if(!p.vis)continue;g.fillStyle=T.color;const r=Math.max(1,Math.min(12,C.rad[i]/4*this.boost/this.worldPerPx()));g.beginPath();g.arc(p.x,p.y,r,0,2*Math.PI);g.fill();}};
      cells(this.static);if(!this.F)return;cells(this.F.cells);
      const pl=this.F.polys;let off=0;g.lineWidth=1;
      for(let k=0;k<pl.n;k++){const n=pl.cnt[k],id=pl.ident[k],show=this.on[id===2?'n:axon':'n:dend']!==false;if(show){g.strokeStyle=tok(id===2?'--ch-axon':id===3?'--ch-dend':'--ch-minor');g.beginPath();let pen=false;for(let i=0;i<n;i++){const q=3*(off+i),p=this.project([pl.pts[q],pl.pts[q+1],pl.pts[q+2]]);if(!p.vis){pen=false;continue;}if(pen)g.lineTo(p.x,p.y);else{g.moveTo(p.x,p.y);pen=true;}}g.stroke();}off+=n;}
      if(this.on.tips!==false){g.fillStyle='#fff';const t=this.F.tips;for(let i=0;i<t.pos.length;i+=3){const p=this.project([t.pos[i],t.pos[i+1],t.pos[i+2]]);if(p.vis){g.beginPath();g.arc(p.x,p.y,1.5,0,2*Math.PI);g.fill();}}}
      g.fillStyle='#c5b18d';g.font='11px system-ui';g.fillText('Canvas projection · no depth occlusion or field voxels',14,this.Hh-50);
    }
  }

  // ====================================================================== app state
  let view;
  try { if(new URLSearchParams(location.search).get('renderer')==='canvas')throw Error('Canvas requested'); view = new View($('gl')); } catch (err) { const old=$('gl'),canvas=old.cloneNode(false);old.replaceWith(canvas);view=new ProjectionView(canvas);document.documentElement.dataset.renderer='canvas-projection'; }
  const st = { mode: 'library', H: null, ad: null, frames: [], rows: [], idx: 0, playing: false, acc: 0, playRate: 1440, cache: new Map(), libId: null, loading: 0,
    live: { w: null, follow: true, running: false, cur: null, row: null, lastFields: null, wantAt: 0, done: false } };
  const LAYERS_DEFAULT = { 'c:schwann': true, 'c:macrophage': true, 'c:stumpAxon': false, 'c:hippocampal': true, 'c:drg': true, 'c:astrocyte': true, 'n:axon': true, 'n:dend': true, tips: true, 'f:fibrin': true, 'f:debris': true, 'f:trophin': false, 'f:exudate': false, 'f:glia': false, frame: true };
  let layerOn = Object.assign({}, LAYERS_DEFAULT);

  function veil(text, frac) { const v = $('veil'); if (text == null) { v.hidden = true; return; } v.hidden = false; $('veilTxt').textContent = text; $('veilBar').style.width = frac != null ? `${Math.round(frac * 100)}%` : '0'; }

  function decoded(i) {
    if (st.cache.has(i)) { const f = st.cache.get(i); st.cache.delete(i); st.cache.set(i, f); return f; }
    const f = NE4.decodeFrame(st.frames[i], st.H); st.cache.set(i, f); if (st.cache.size > 10) st.cache.delete(st.cache.keys().next().value); return f;
  }

  function setupRun(H) {
    st.H = H; st.ad = ADAPTERS[H.scenario] || dish; st.cache.clear();
    $('scnTitle').textContent = st.ad.title(H); $('scnGroup').textContent = H.group || '';
    view.setScene(H, layerOn);
    buildCams(); buildLegend(); buildLayers(); buildSpeeds(); $('fgain').disabled=!!view.isProjection; $('fgain').title=view.isProjection?'Field voxels require WebGL.':'';
    const cams = st.ad.cams(H); view.orbit.go(cams[0], false);
    $('about').innerHTML = aboutHtml(H);
    const provenance = document.createElement('p'); provenance.className = 'provenance'; provenance.textContent = H.modelRevision === NE4.MODEL_REVISION ? 'Corrected solver v4.1. Numerical checks do not establish biological validation.' : 'ARCHIVED V4 RUN: generated before the solver corrections. Raw measurements are preserved. Start a live run for the corrected solver.'; $('about').prepend(provenance); $('provenanceBanner').textContent = provenance.textContent;
  }
  function buildCams() {
    const box = $('cams'); box.innerHTML = '';
    for (const c of st.ad.cams(st.H)) { const b = document.createElement('button'); b.textContent = c.label; b.addEventListener('click', () => view.orbit.go(c, true)); box.appendChild(b); }
  }
  function present() {
    const keys = new Set(st.H.scene.types.map((t) => t.key)), used = new Set();
    for (let i = 0; i < st.H.staticCells.n; i++) used.add(st.H.scene.types[st.H.staticCells.typ[i]].key);
    const F = st.frames.length ? decoded(Math.min(st.idx, st.frames.length - 1)) : st.live.cur;
    if (F) for (let i = 0; i < F.cells.n; i++) used.add(st.H.scene.types[F.cells.typ[i]].key);
    if (st.H.scenario === 'conduit') { used.add('schwann'); used.add('macrophage'); }
    return st.H.scene.types.filter((t) => keys.has(t.key) && used.has(t.key));
  }
  function buildLegend() {
    const lg = $('legend'); lg.innerHTML = '';
    const add = (color, text, ln) => { const s = document.createElement('span'); s.innerHTML = `<i class="${ln ? 'ln' : ''}" style="background:${color}"></i>`; s.appendChild(document.createTextNode(text)); lg.appendChild(s); };
    for (const t of present()) if (t.key !== 'stumpAxon') add(t.color, t.label);
    if (st.H.scenario === 'conduit') add(tok('--ch-axon'), 'Regenerating axons', true);
    else { add(tok('--ch-axon'), 'Axon', true); if (st.H.scenario === 'dish') { add(tok('--ch-dend'), 'Dendrite', true); add(tok('--ch-minor'), 'Minor process', true); } }
    for (const f of st.H.fields || []) if (!view.isProjection && layerOn['f:' + f.name]) add(f.color, f.label);
  }
  function buildLayers() {
    const box = $('layers'); box.innerHTML = '';
    const add = (key, text, color) => {
      const l = document.createElement('label'), id = 'ly-' + key.replace(/[^a-z0-9]/gi, '');
      l.innerHTML = `<input type="checkbox" id="${id}"${layerOn[key] !== false ? ' checked' : ''}><i style="background:${color}"></i>`; l.appendChild(document.createTextNode(text));
      l.querySelector('input').addEventListener('change', (e) => { layerOn[key] = e.target.checked; view.setLayers(layerOn); buildLegend(); });
      if(view.isProjection && key.startsWith('f:')){l.querySelector('input').disabled=true;l.title='Field voxels require WebGL; numerical fields are still calculated.';}
      box.appendChild(l);
    };
    for (const t of present()) if (t.key !== 'stumpAxon') add('c:' + t.key, t.label.replace(' (repair)', ''), t.color);
    add('n:axon', 'Axons', tok('--ch-axon'));
    if (st.H.scenario === 'dish') add('n:dend', 'Dendrites, minor', tok('--ch-dend'));
    add('tips', 'Growth cones', '#ffffff');
    for (const f of st.H.fields || []) add('f:' + f.name, f.label, f.color);
    add('frame', st.H.scene.space.kind === 'tube' ? 'Tube wall' : 'Frame', '#3a4656');
  }
  function buildSpeeds() {
    const sel = $('tSpeed'), H = st.H, perDay = H.hours >= 96; sel.innerHTML = '';
    const opts = perDay ? [[360, '¼ day/s'], [720, '½ day/s'], [1440, '1 day/s'], [2880, '2 days/s'], [5760, '4 days/s']] : [[30, '½ h/s'], [60, '1 h/s'], [120, '2 h/s'], [240, '4 h/s'], [480, '8 h/s']];
    const def = perDay ? (H.hours > 400 ? 1440 : 720) : 120;
    for (const [v, t] of opts) { const o = document.createElement('option'); o.value = v; o.textContent = t; if (v === def) o.selected = true; sel.appendChild(o); }
    st.playRate = def;
  }

  function aboutHtml(H) {
    const common = `<p><b>One engine for every geometry.</b> Positions are 3-D vectors everywhere; the scenario chooses the space (a coverslip, a block of gel, a nerve conduit). Cells are typed agents whose behaviour comes from data: neurites, migration, division, secretion, consumption and survival. Chemicals and matrix live on a grid. The corrected solver uses exact local source/decay and first-order implicit diffusion with bounded field/reaction substeps. Cell-mechanical relaxation and coupling still require convergence studies; stability alone is not accuracy.</p>
      <p><b>Recorded and live runs share one format.</b> Each frame stores the moving cells, every neurite as a simplified polyline, the growth cones and the field grids, so any run can be scrubbed backward and forward.</p>`;
    if (H.scenario === 'conduit') return `<p><b>The scene.</b> A cut rat sciatic nerve with both stumps held in a silicone tube (inner radius ${H.conduit.R} µm). Exudate from the cut faces clots into a fibrin cable where it is concentrated enough; Schwann cells turn into repair cells over several days, then migrate along the cable from both stumps and divide where there is room; macrophages clear myelin debris from the distal stump; axons sprout from the proximal stump after about two days and advance only where Schwann cells lead them. ${H.conduit.graft ? 'In the graft run the gap is filled from the start with Schwann cell bands and matrix, as in a fresh nerve autograft.' : ''}</p>
      <p><b>Simplifications.</b> Each axon stands for a regenerating unit; fibroblasts, blood vessels and perineurial cells are not modelled; one simulated Schwann cell stands for a column of cells.</p>` + common;
    if (H.scenario === 'dish') return `<p><b>The scene.</b> Rat hippocampal neurons on poly-lysine glass, with the v3 calibration to Dotti, Sullivan and Banker (1988) carried into the new core: minor processes appear, one wins a tubulin competition and becomes the axon, and dendrites grow from about day 4.</p>` + common;
    return `<p><b>The scene.</b> Sensory (DRG) neurons ${H.scenario === 'gel' ? 'embedded inside' : 'on the surface of'} a hydrogel. Stiffness changes the growth cone's clutch and grip. Inside a gel the matrix also confines the growth cone, so from about 0.5 kPa up outgrowth slows as the gel stiffens. On the surface nothing confines it, and the stiffer gel's better grip speeds growth instead, which is a testable prediction of the model.</p>` + common;
  }

  // ---------------------------------------------------------------- display
  function showIndex(i) {
    if (!st.frames.length) return; st.idx = clamp(i, 0, st.frames.length - 1);
    const F = decoded(st.idx); view.setFrame(F);
    const row = st.rows[st.idx]; updateClock(row ? row.t : F.t); updateStats(row);
    $('tSlider').value = String(st.idx); drawChartNow(row ? row.t : F.t);
  }
  function showLive(F, row) { st.live.cur = F; st.live.row = row; view.setFrame(F); updateClock(row.t); updateStats(row); drawChartNow(row.t); }
  function updateClock(t) {
    const H = st.H; if (!H) return;
    if (H.hours >= 96) { $('clockBig').textContent = `Day ${(t / 1440).toFixed(1)}`; $('clockSmall').textContent = `${Math.round(t / 60)} h · ${Math.round(t).toLocaleString('en-US')} min`; }
    else { $('clockBig').textContent = `${(t / 60).toFixed(1)} h`; $('clockSmall').textContent = `${Math.round(t).toLocaleString('en-US')} min`; }
    const end = H.hours * 60; $('tStart').textContent = st.frames.length ? fmtT(st.rows[0] ? st.rows[0].t : 0) : ''; $('tEnd').textContent = fmtT(end);
    $('tlInfo').textContent = st.mode === 'live' ? (st.live.done ? 'live run finished' : st.live.running ? 'running' : 'paused') : `${st.frames.length} frames, every ${H.every >= 60 ? (H.every / 60) + ' h' : H.every + ' min'}`;
  }
  function fmtT(t) { return st.H && st.H.hours >= 96 ? `day ${(t / 1440).toFixed(0)}` : `${(t / 60).toFixed(0)} h`; }
  function updateStats(row) {
    const box = $('stats'); if (!row) { box.innerHTML = ''; return; }
    box.innerHTML = st.ad.stats(row, st.H).map(([k, v, u]) => `<div class="stat"><span class="k">${k}</span><span class="v">${v} <small>${u || ''}</small></span></div>`).join('');
    $('statNote').textContent = st.H.modelRevision === NE4.MODEL_REVISION ? 'corrected solver' : 'original solver';
  }
  let chartSpec = null;
  function drawChartNow(tNow) {
    if (!st.H) return; chartSpec = chartSpec && chartSpec.__H === st.H ? chartSpec : Object.assign(st.ad.chart(st.H), { __H: st.H });
    $('chartTitle').textContent = chartSpec.title;
    const lg = $('chartLegend'); if (lg.dataset.for !== chartSpec.title + st.H.id) { lg.dataset.for = chartSpec.title + st.H.id; lg.innerHTML = chartSpec.series.map((s) => `<span><i style="border-top:${s.w || 1.5}px ${s.dash ? 'dashed' : 'solid'} ${s.color}"></i>${s.label}</span>`).join('') + (chartSpec.fns || []).map((f) => `<span><i style="border-top:1px dashed var(--dim)"></i>${f.label}</span>`).join('') + ((chartSpec.points || []).length ? `<span><b style="color:var(--fg);font-weight:600">×</b> calibration targets, author-selected ±25–30% bands; NOT measured error bars</span>` : '') + ((chartSpec.bands || []).length ? `<span>shaded: schematic developmental phases; not fitted experimental confidence intervals</span>` : ''); }
    const rows = st.mode === 'live' ? st.rows.concat(st.live.row && (!st.rows.length || st.live.row.t > st.rows[st.rows.length - 1].t) ? [st.live.row] : []) : st.rows;
    drawChart($('chart'), chartSpec, rows, tNow, st.H);
  }
  function updateBench() {
    if (!st.H) return;
    const rows = st.mode === 'live' && st.live.row ? st.rows.concat([st.live.row]) : st.rows;
    const items = st.ad.bench(rows, st.H);
    $('bench').innerHTML = items.map((b) => `<div class="b"><span class="q">${b.q}</span><span class="pill ${b.st}">${PILL[b.st]}</span><span class="lit">${b.lit} <cite>· ${b.cite}</cite></span><span class="me">This run: ${b.me}</span></div>`).join('');
  }

  // ---------------------------------------------------------------- library
  function buildLibrary() {
    const box = $('libBox'); box.innerHTML = ''; let grp = null;
    for (const r of LIBRARY) {
      if (r.group !== grp) { grp = r.group; const g = document.createElement('div'); g.className = 'grp'; g.textContent = grp; box.appendChild(g); }
      const b = document.createElement('button'); b.className = 'run'; b.dataset.id = r.id;
      b.innerHTML = `<b></b><span></span><em></em>`; b.querySelector('b').textContent = r.title; b.querySelector('span').textContent = r.desc; b.querySelector('em').textContent = `${r.span} · ${r.frames} frames · ${r.mb}`;
      b.addEventListener('click', () => loadLibrary(r.id)); box.appendChild(b);
    }
  }
  async function loadLibrary(id) {
    const r = LIBRARY.find((x) => x.id === id); if (!r) return;
    stopLive(); setMode('library'); st.libId = id; st.playing = false; setPlayIcon();
    try { if (location.hash.slice(1) !== id) location.hash = id; } catch (e) { /* hash is optional */ }
    for (const b of document.querySelectorAll('.run')) b.setAttribute('aria-current', b.dataset.id === id ? 'true' : 'false');
    const token = ++st.loading;
    if (st.abort) st.abort.abort(); st.abort = new AbortController();
    try {
      veil(`Loading ${r.title} · ${r.mb}`, 0);
      const res = await fetch(r.file, { signal: st.abort.signal }); if (!res.ok) throw new Error(`The recording could not be fetched (HTTP ${res.status}).`);
      const total = r.textBytes || r.bytes; let got = 0; const parts = [];
      const rd = res.body.getReader();
      for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; if (token === st.loading) veil(`Loading ${r.title} · ${r.mb}`, Math.min(0.95, got / total)); }
      let raw = new Uint8Array(got), o = 0; for (const p of parts) { raw.set(p, o); o += p.length; }
      if (/\.txt$/.test(r.file)) {   // base64 text (how the recordings are published)
        const bin = atob(new TextDecoder().decode(raw).trim()), u = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        raw = u;
      }
      let buf = raw.buffer;
      if (raw[0] === 0x1f && raw[1] === 0x8b) {   // gzipped (unless the server already unpacked it)
        if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot unpack recordings. Try a current Chrome, Edge, Firefox or Safari, or start a live run.');
        buf = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      }
      if (token !== st.loading) return;
      const run = NE4.unpackRun(buf);
      st.frames = run.frames; st.rows = normRows(run.header.series, run.header); chartSpec = null;
      setupRun(run.header);
      const sl = $('tSlider'); sl.max = String(st.frames.length - 1);
      showIndex(st.ad.defaultFrame(st.H, st.rows)); updateBench(); buildLegend(); buildLayers();
      veil(null);
    } catch (err) { if (token === st.loading && err.name !== 'AbortError') veil(err.message || String(err)); }
  }

  // ---------------------------------------------------------------- live
  const LIVE = {
    conduit: { label: 'Nerve conduit (3-D tube)', opts: [['gap', 'Gap length', [4, 6, 8, 10, 12, 15], 8, 'mm'], ['graft', 'Fill gap like a nerve graft', 'bool', false], ['axons', 'Axons', [20, 40], 40, ''], ['seed', 'Seed', 'int', 1]], speeds: [[360, '¼ day/s'], [720, '½ day/s'], [1440, '1 day/s'], [4320, 'as fast as possible']] },
    gel: { label: 'DRG neurons in a 3-D gel', opts: [['stiffness', 'Gel stiffness', [0.25, 0.5, 1, 2, 4], 1, 'kPa'], ['count', 'Neurons', [4, 8, 12, 20], 12, ''], ['seed', 'Seed', 'int', 1]], speeds: [[60, '1 h/s'], [120, '2 h/s'], [240, '4 h/s'], [600, 'as fast as possible']] },
    gelSurface: { label: 'DRG neurons on a gel surface (2-D)', opts: [['stiffness', 'Gel stiffness', [0.25, 0.5, 1, 2, 4], 1, 'kPa'], ['count', 'Neurons', [4, 8, 12, 20], 12, ''], ['seed', 'Seed', 'int', 1]], speeds: [[60, '1 h/s'], [120, '2 h/s'], [240, '4 h/s'], [600, 'as fast as possible']] },
    dish: { label: 'Hippocampal neurons on glass (2-D)', opts: [['count', 'Neurons', [1, 3, 6, 12], 6, ''], ['seed', 'Seed', 'int', 1]], speeds: [[120, '2 h/s'], [360, '6 h/s'], [720, '12 h/s'], [2880, 'as fast as possible']] },
  };
  function buildLiveForm() {
    const sel = $('liveScn'); sel.innerHTML = '';
    for (const k in LIVE) { const o = document.createElement('option'); o.value = k; o.textContent = LIVE[k].label; sel.appendChild(o); }
    sel.addEventListener('change', liveOpts); liveOpts();
  }
  function liveOpts() {
    const k = $('liveScn').value, box = $('liveOpts'); box.innerHTML = '';
    for (const [key, label, vals, def, unit] of LIVE[k].opts) {
      const row = document.createElement('div'); row.className = 'row'; const id = 'lo-' + key;
      if (vals === 'bool') row.innerHTML = `<label for="${id}">${label}</label><input type="checkbox" id="${id}"${def ? ' checked' : ''}>`;
      else if (vals === 'int') row.innerHTML = `<label for="${id}">${label}</label><input type="number" id="${id}" value="${def}" min="1" max="9999" style="width:90px">`;
      else row.innerHTML = `<label for="${id}">${label}</label><select id="${id}">${vals.map((v) => `<option value="${v}"${v === def ? ' selected' : ''}>${v}${unit ? ' ' + unit : ''}</option>`).join('')}</select>`;
      box.appendChild(row);
    }
    const sp = $('liveSpeed'); sp.innerHTML = LIVE[k].speeds.map(([v, t], i) => `<option value="${v}"${i === 1 ? ' selected' : ''}>${t}</option>`).join('');
  }
  function makeWorker() {
    const src = $('ne4').textContent + '\n' + $('ne4-worker').textContent;
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const w = new Worker(url); URL.revokeObjectURL(url); return w;
  }
  function startLive() {
    const seedField=$('lo-seed'); if(seedField && (!Number.isInteger(+seedField.value)||+seedField.value<1||+seedField.value>9999)){ $('liveNote').textContent='Seed must be an integer from 1 to 9999.';return;} $('liveNote').textContent='';
    stopLive(); setMode('live'); st.playing = false; setPlayIcon(); st.loading++; if(st.abort) st.abort.abort();
    const k = $('liveScn').value, opts = {};
    for (const [key, , vals] of LIVE[k].opts) { const el = $('lo-' + key); opts[key] = vals === 'bool' ? el.checked : +el.value; }
    st.frames = []; st.rows = []; st.idx = 0; chartSpec = null; st.cache.clear();
    Object.assign(st.live, { follow: true, running: true, cur: null, row: null, lastFields: null, done: false });
    veil('Building the scenario');
    let w; try { w = makeWorker(); } catch (err) { veil('Live runs need Web Workers, which this browser blocked.'); return; }
    st.live.w = w;
    w.onmessage = (m) => {
      const d = m.data;
      if (d.type === 'error') { st.live.running = false; veil(d.message); setPlayIcon(); }
      else if (d.type === 'loaded') { setupRun(d.header); veil(null); w.postMessage({ type: 'speed', minPerSec: +$('liveSpeed').value }); w.postMessage({ type: 'run', on: true }); $('tLive').hidden = false; updateFollow(); }
      else if (d.type === 'key') {
        st.frames.push(d.buf); d.row = normRow(d.row, st.rows[st.rows.length - 1]); st.rows.push(d.row); const sl = $('tSlider'); sl.max = String(st.frames.length - 1);
        if (st.live.follow) sl.value = sl.max;
        if (st.frames.length === 1) { const F = decoded(0); st.live.lastFields = F.fields; showLive(F, d.row); buildLegend(); buildLayers(); }
        if (st.frames.length % 2 === 1) updateBench();
      } else if (d.type === 'frame') {
        if (!st.live.follow) return;
        const F = NE4.decodeFrame(d.buf, st.H); if (F.fields.length) st.live.lastFields = F.fields; else F.fields = st.live.lastFields || [];
        showLive(F, normRow(d.row, st.rows[st.rows.length - 1])); st.live.wantAt = performance.now() + 45;
      } else if (d.type === 'done') { st.live.done = true; st.live.running = false; updateBench(); updateClock(st.live.row ? st.live.row.t : 0); setPlayIcon(); }
    };
    w.onerror = (e) => { veil('The live run stopped: ' + (e.message || 'worker error')); };
    w.postMessage({ type: 'load', scenario: k, opts });
  }
  function stopLive() { if (st.live.w) { st.live.w.terminate(); st.live.w = null; } st.live.running = false; $('tLive').hidden = true; }
  function updateFollow() { $('tLive').textContent = st.live.follow ? 'Live' : 'Go live'; $('tLive').setAttribute('aria-pressed', st.live.follow ? 'true' : 'false'); }

  // ---------------------------------------------------------------- mode, transport
  function setMode(m) {
    st.mode = m; $('modeLib').setAttribute('aria-pressed', m === 'library' ? 'true' : 'false'); $('modeLive').setAttribute('aria-pressed', m === 'live' ? 'true' : 'false');
    $('libBox').hidden = m !== 'library'; $('liveBox').hidden = m !== 'live';
  }
  function setPlayIcon() { const on = st.mode === 'live' ? st.live.running : st.playing; $('tPlay').innerHTML = on ? '&#10074;&#10074;' : '&#9654;'; $('tPlay').setAttribute('aria-label', on ? 'Pause' : 'Play'); }
  $('modeLib').addEventListener('click', () => { if (st.mode !== 'library') { setMode('library'); if (st.libId && !st.live.w) return; loadLibrary(st.libId || LIBRARY[0].id); } });
  $('modeLive').addEventListener('click', () => setMode('live'));
  $('liveStart').addEventListener('click', startLive);
  $('liveSpeed').addEventListener('change', () => { if (st.live.w) st.live.w.postMessage({ type: 'speed', minPerSec: +$('liveSpeed').value }); });
  $('tPlay').addEventListener('click', () => {
    if (st.mode === 'live' && st.live.w) { if (st.live.done) return; st.live.running = !st.live.running; st.live.w.postMessage({ type: 'run', on: st.live.running }); setPlayIcon(); updateClock(st.live.row ? st.live.row.t : 0); return; }
    if (!st.frames.length) return; if (st.idx >= st.frames.length - 1) showIndex(0);
    st.playing = !st.playing; st.acc = 0; setPlayIcon();
  });
  const stepBy = (d) => { if (st.mode === 'live') { if (st.live.follow) st.idx = st.frames.length - 1; st.live.follow = false; updateFollow(); } st.playing = false; setPlayIcon(); showIndex(st.idx + d); };
  $('tPrev').addEventListener('click', () => stepBy(-1)); $('tNext').addEventListener('click', () => stepBy(1));
  $('tSlider').addEventListener('input', (e) => { if (st.mode === 'live') { st.live.follow = +e.target.value >= st.frames.length - 1; updateFollow(); } showIndex(+e.target.value); });
  $('tLive').addEventListener('click', () => { st.live.follow = true; updateFollow(); if (st.live.cur) showLive(st.live.cur, st.live.row); });
  $('tSpeed').addEventListener('change', (e) => { st.playRate = +e.target.value; });
  $('boost').addEventListener('input', (e) => view.setBoost(+e.target.value));
  $('fgain').addEventListener('input', (e) => view.setGain(+e.target.value));
  window.addEventListener('keydown', (e) => { if (e.target.closest('input, select, textarea, button, a')) return; if (e.key === ' ') { e.preventDefault(); $('tPlay').click(); } else if (e.key === 'ArrowLeft') stepBy(-1); else if (e.key === 'ArrowRight') stepBy(1); });

  $('exportMeasurements').addEventListener('click', () => {
    const rows = st.rows.map(({history,...raw}) => raw);
    const payload = {modelRevision:st.H.modelRevision || 'original-v4', scenario:st.H.scenario, units:{time:'minutes',fronts:'mm'}, rawRows:rows, history:st.rows.map(r=>r.history||null)};
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
    const a = document.createElement('a'); a.href=url; a.download='neurotissue-measurements.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  window.neurotissueApp = {get summary(){return {mode:st.mode,revision:st.H&&st.H.modelRevision,renderer:view.isProjection?'canvas-projection':'webgl',frames:st.frames.length,time:st.live.row?st.live.row.t:st.rows[st.idx]&&st.rows[st.idx].t,rawRows:st.rows.map(({history,...r})=>r)};}};
  // Pause rather than consume CPU invisibly. Resume remains an explicit user action.
  document.addEventListener('visibilitychange',()=>{if(document.hidden){st.playing=false;if(st.live.w){st.live.running=false;st.live.w.postMessage({type:'run',on:false});}setPlayIcon();}});
  window.addEventListener('pagehide',()=>{stopLive();if(st.abort)st.abort.abort();});
  // ---------------------------------------------------------------- frame loop
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.2, (now - last) / 1000); last = now;
    view.orbit.tick(now);
    if (document.hidden) { requestAnimationFrame(loop); return; }
    if (st.mode === 'library' && st.playing && st.frames.length) {
      st.acc += dt * st.playRate; const every = st.H.every || 60;
      if (st.acc >= every) { const n = Math.floor(st.acc / every); st.acc -= n * every; if (st.idx >= st.frames.length - 1) { st.playing = false; setPlayIcon(); } else showIndex(st.idx + n); }
    }
    if (st.mode === 'live' && st.live.w && st.live.follow && now > st.live.wantAt) { st.live.w.postMessage({ type: 'want' }); st.live.wantAt = now + 1000; }
    if (view.camMoved) { placeLabels(); placeScale(); view.camMoved = false; }
    if (view.dirty) view.render();
    requestAnimationFrame(loop);
  }
  function placeLabels() {
    const box = $('labels'); if (!st.ad) return;
    const L = st.ad.labels(st.H); while (box.children.length < L.length) box.appendChild(document.createElement('div'));
    while (box.children.length > L.length) box.removeChild(box.lastChild);
    L.forEach((l, k) => { const p = view.project(l.p), d = box.children[k]; d.textContent = l.text; d.style.display = p.vis ? '' : 'none'; d.style.left = `${p.x}px`; d.style.top = `${p.y}px`; });
  }
  function placeScale() {
    const wpp = view.worldPerPx(), nice = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
    let best = nice[0]; for (const n of nice) if (n / wpp <= 140) best = n;
    $('scaleRule').style.width = `${Math.round(best / wpp)}px`; $('scaleTxt').textContent = best >= 1000 ? `${best / 1000} mm` : `${best} µm`;
  }
  window.addEventListener('resize', () => { drawChartNow(st.mode === 'live' && st.live.row ? st.live.row.t : (st.rows[st.idx] || {}).t); });

  function buildValidation() {
    const box = $('vtable'); if (!VALIDATION || !VALIDATION.rows.length) { box.innerHTML = '<p class="note">Recorded-run comparisons are added when the library is built.</p>'; return; }
    let html = '<table><thead><tr><th>Measure</th><th>Reference and evidence type</th><th>Recorded result</th></tr></thead><tbody>', grp = null;
    const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    for (const r of VALIDATION.rows) { if (r.s !== grp) { grp = r.s; html += `<tr class="grp"><td colspan="3">${esc(grp)}</td></tr>`; } html += `<tr><td>${esc(r.m)}</td><td>${esc(r.lit)}</td><td class="v">${esc(typeof r.v === 'number' ? 'day ' + r.v : r.v)}</td></tr>`; }
    html += '</tbody></table>';
    if (VALIDATION.perf && VALIDATION.perf.length) html += `<div class="perf">Recording cost (one CPU core, Node): ${VALIDATION.perf.map((p) => `${p.id} ${p.days} d in ${p.wall} s (${p.msPerStep} ms/step at dt ${p.dt} min)`).join(' · ')}</div>`;
    box.innerHTML = html;
  }

  // ---------------------------------------------------------------- boot
  buildValidation();
  window.__gelTrend = (LIBRARY.find((r) => r.gelTrend) || {}).gelTrend || [];
  buildLibrary(); buildLiveForm(); setMode('library');
  requestAnimationFrame(loop);
  const fromHash = () => { const h = decodeURIComponent(location.hash.slice(1)); return LIBRARY.find((r) => r.id === h); };
  window.addEventListener('hashchange', () => { const r = fromHash(); if (r && r.id !== st.libId) loadLibrary(r.id); });
  if (LIBRARY.length) loadLibrary((fromHash() || LIBRARY[0]).id); else { veil(null); setMode('live'); }
})();
