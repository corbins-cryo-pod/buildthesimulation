/*
 * Scenarios. Each builds an Environment, a NeuriteEngine and the cells, and says how to view it.
 * Groups follow the design path: build-up (v1) → development → environment assays → networks.
 */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const mod = factory(isNode ? require('./core.js') : root.NE2);
  if (isNode) module.exports = mod;
  else { root.NE2 = root.NE2 || {}; Object.assign(root.NE2, mod); }
})(typeof self !== 'undefined' ? self : this, function (NE2) {
  'use strict';
  const { NeuriteEngine, Environment, CellTypes } = NE2;
  const UP = -Math.PI / 2;

  // a migrating cortical neuron: pyramidal genome that climbs a radial-glia fiber first
  CellTypes.registerType('radialMigrant', Object.assign({}, CellTypes.TYPES.pyramidal, {
    label: 'Radial migrant', blurb: 'Newborn cortical neuron that climbs a radial-glia fiber, settles under the pial surface and becomes pyramidal.',
    migration: 'scaffold', migrateTime: 0, pulsePeriod: 10, pulseStrength: 0.8, stage1Time: 10, radius: 5.5, production: 0.6,
  }));

  const jitterGrid = (e, n, x0, y0, x1, y1, jitter) => {
    const cols = Math.ceil(Math.sqrt(n * (x1 - x0) / (y1 - y0))), rows = Math.ceil(n / cols), out = [];
    for (let k = 0; k < n; k++) {
      const i = k % cols, j = Math.floor(k / cols);
      out.push([x0 + (i + 0.5) * (x1 - x0) / cols + (e.rand() - 0.5) * jitter, y0 + (j + 0.5) * (y1 - y0) / rows + (e.rand() - 0.5) * jitter]);
    }
    return out;
  };

  const TURN_SRC = [470, 70];   // turning-assay pipette: ~27-54° off the cells' initial heading

  const SCENARIOS = {
    // ---------------------------------------------------------------- build-up (v1)
    sphere: {
      group: 'Build-up', label: 'Soft sphere',
      blurb: 'A very soft, sticky sphere dropped on poly-lysine glass wets the surface and flattens toward a pancake. Lower Softness and it stays domed.',
      view: { mode: 'anatomy', speed: 2, frame: 120 },
      build(o) {
        const env = new Environment(180, 180);
        const e = new NeuriteEngine({ env, seed: o.seed, params: { activity: false } });
        e.addCell(90, 90, { type: 'sphere', z: 45, radius: 7 });
        return e;
      },
    },
    worm: {
      group: 'Build-up', label: 'Worm crawl',
      blurb: 'One appendage on laminin. The tip grips with its probes, a contraction pulse frees the soma and hauls the nucleus forward, the soma swallows the shaft, the tip extends again.',
      view: { mode: 'anatomy', speed: 6, frame: 130, follow: true },
      build(o) {
        const env = new Environment(1000, 240, { coat: 2 });
        const e = new NeuriteEngine({ env, seed: o.seed, params: { pulsePeriod: 14, pulseStrength: 0.7, waveRate: 3, branchRate: 0, seek: 0, growthSpeed: 1.2, tubActive: 1.0, activity: false, apoptosis: false } });
        e.addCell(90, 120, { type: 'ipsc', maxNeurites: 1, maxLen: 42, polarAngle: 0, spread: true, migrating: true, migrateTime: 0 });
        e.step(400);
        return e;
      },
    },
    first: {
      group: 'Build-up', label: 'First neurite',
      blurb: 'A spread hippocampal neuron pushes out a nub. MT probes pop out of it, stick and drag the membrane until a neurite and its growth cone sprout.',
      view: { mode: 'anatomy', speed: 2, frame: 90 },
      build(o) {
        const env = new Environment(220, 220);
        const e = new NeuriteEngine({ env, seed: o.seed, params: { activity: false, seek: 0 } });
        const c = e.addCell(110, 110, { type: 'hippocampal', maxNeurites: 1, spread: true, polarAngle: -0.3 });
        c.landedAt = -c.stage1T + 6;
        return e;
      },
    },
    // ---------------------------------------------------------------- development
    stages: {
      group: 'Development', label: 'Hippocampal stages',
      blurb: 'One rat hippocampal neuron on poly-lysine, run for days. Watch the five classic stages: lamellipodia, minor neurites, one wins and becomes the axon, dendrites differentiate, spines appear.',
      view: { mode: 'anatomy', speed: 60, frame: 360, panel: 'stages', ff: 840 },
      build(o) {
        const env = new Environment(1600, 1600);
        const e = new NeuriteEngine({ env, seed: o.seed, params: { seek: 0 } });
        e.addCell(800, 800, { type: 'hippocampal', spread: true });
        return e;
      },
    },
    lesion: {
      group: 'Development', label: 'Axon transection',
      blurb: 'One hippocampal neuron. Twelve hours after it picks an axon, the axon is cut 10 µm from the soma (Goslin and Banker 1989). The label clears and the longest remaining neurite becomes the new axon. Use Cut axon in the cell panel, or Alt-click any neurite, to make your own cuts.',
      view: { mode: 'anatomy', speed: 60, frame: 260, panel: 'stages', ff: 1200 },
      build(o) {
        const env = new Environment(1200, 1200);
        const e = new NeuriteEngine({ env, seed: o.seed, params: { seek: 0, activity: false } });
        const c = e.addCell(600, 600, { type: 'hippocampal', spread: true });
        const stump = o.stump || 10, after = (o.cutAfterH != null ? o.cutAfterH : 12) * 60;
        e.addHook({ once: true, when: (en) => c.alive && c.axonDecided >= 0 && en.t - c.axonDecided >= after && c.axonId >= 0, run: (en) => en.transect(c.axonId, stump) });
        return e;
      },
    },
    types: {
      group: 'Development', label: 'Neuron types',
      blurb: 'Eight genomes, one engine: cortical pyramidal, Purkinje, granule (T-shaped axon), retinal ganglion, DRG sensory, fly da, migrating interneuron and astrocytes.',
      view: { mode: 'anatomy', speed: 40, frame: 'fit', ff: 600 },
      build(o) {
        const keys = ['pyramidal', 'purkinje', 'granule', 'rgc', 'drg', 'da', 'interneuron', 'astrocyte'];
        const cw = 380, ch = 420, env = new Environment(4 * cw, 2 * ch);
        const e = new NeuriteEngine({ env, seed: o.seed, params: { seek: 0, activity: false, apoptosis: false } });
        keys.forEach((k, i) => e.addCell((i % 4 + 0.5) * cw, (Math.floor(i / 4) + 0.5) * ch + (k === 'purkinje' || k === 'granule' || k === 'pyramidal' ? 60 : 0), { type: k, spread: true }));
        e.labels = keys.map((k, i) => ({ text: CellTypes.getType(k).label, x: (i % 4) * cw + 14, y: Math.floor(i / 4) * ch + 24 }));
        e.step(1200);
        return e;
      },
    },
    tiling: {
      group: 'Development', label: 'Tiling mosaic',
      blurb: 'Nine fly da neurons. Each dendrite avoids its own branches and retracts on meeting a same-type neighbour, so the field is covered once with little overlap. Set Tiling to 0 to see the overlap return.',
      view: { mode: 'anatomy', speed: 30, frame: 'fit' },
      build(o) {
        const env = new Environment(480, 480);
        const e = new NeuriteEngine({ env, seed: o.seed, params: { seek: 0, activity: false, apoptosis: false } });
        for (const [x, y] of jitterGrid(e, 9, 20, 20, 460, 460, 30)) e.addCell(x, y, { type: 'da', spread: true });
        return e;
      },
    },
    cortex: {
      group: 'Development', label: 'Cortical migration',
      blurb: 'Newborn neurons leave the ventricular zone (bottom), climb radial-glia fibers by nucleokinesis, slip past earlier arrivals and settle under the pial surface. Colour marks birth time: early-born cells end up deeper (inside-out).',
      view: { mode: 'anatomy', speed: 30, frame: 'fit', overlay: 'birth', ff: 480 },
      build(o) {
        const W = 360, H = 440, env = new Environment(W, H);
        for (let x = 30; x < W; x += 30) env.addFiber([[x, H - 30], [x, 20]], { width: 5 });
        env.addZone({ key: 'stop', x0: 0, x1: W, y0: 0, y1: 70 });
        env.addZone({ key: 'vz', x0: 0, x1: W, y0: H - 60, y1: H });
        env.addSpawner({ x: W / 2, y: H - 36, w: W - 60, h: 16, rate: 4, type: 'radialMigrant', hueByBirth: true, hueSpan: 1800, snapFibers: true });
        const e = new NeuriteEngine({ env, seed: o.seed, params: { activity: false, seek: 0, apoptosis: false, branchRate: 0.6, dt: 0.1 } });
        return e;
      },
    },
    // ---------------------------------------------------------------- environment assays
    stripes: {
      group: 'Environment', label: 'Stripe assay',
      blurb: 'Laminin stripes (olive) on bare glass. Growth cones grip and advance better on laminin and their probes stick there more, so axons stay on the stripes.',
      view: { mode: 'anatomy', speed: 40, frame: 'fit', overlay: 'substrate' },
      build(o) {
        const env = new Environment(900, 520, { coat: 0 });
        env.stripes(36, 80, Math.PI / 2, { coat: 2 });
        const e = new NeuriteEngine({ env, seed: o.seed, params: { seek: 0, activity: false, apoptosis: false, synapses: false } });
        for (let k = 0; k < 7; k++) e.addCell(70 + e.rand() * 60, 50 + k * 70 + (e.rand() - 0.5) * 16, { type: 'drg', spread: true, polarAngle: 0 });
        return e;
      },
    },
    turning: {
      group: 'Environment', label: 'Turning assay',
      blurb: 'Axons start out growing to the right; a pipette up and to the right, about 45° off their path, releases a netrin-like cue (gold contours), as in Ming et al. 1997. Axons read the gradient across the cone with noise and turn up toward it. Drop cAMP below 0.5 and the same cue turns them away.',
      view: { mode: 'anatomy', speed: 30, frame: 'fit', overlay: 'field', camp: true },
      build(o) {
        const env = new Environment(760, 560, { coat: 2 });
        const f = env.addField('netrin', { label: 'Netrin-like attractant', lambda: 160, effect: { axon: 1, minor: 0.6, dendrite: 0 }, gain: 1.6, color: '#f2c14e', start: (o.cueStartH || 0) * 60 });
        f.campSwitch = true; f.addSource(TURN_SRC[0], TURN_SRC[1], 1);
        const e = new NeuriteEngine({ env, seed: o.seed, params: { seek: 0, activity: false, apoptosis: false, synapses: false, cAMP: o.cAMP != null ? o.cAMP : 1 } });
        for (let k = 0; k < 6; k++) e.addCell(110 + (k % 2) * 50, 250 + k * 50, { type: 'ipsc', spread: true, polarAngle: 0, migrating: false });
        return e;
      },
    },
    channels: {
      group: 'Environment', label: 'Microchannels',
      blurb: 'A two-chamber PDMS device: somata and dendrites stay in the left chamber, only axons are long enough to cross the 150 µm channels. Walls guide cones along their edges.',
      view: { mode: 'anatomy', speed: 40, frame: 'fit', overlay: 'substrate' },
      build(o) {
        const W = 900, H = 520, env = new Environment(W, H);
        env.rect(330, 0, 480, H, { wall: true });
        for (let k = 0; k < 7; k++) { const y = 60 + k * 66; env.rect(330, y, 480, y + 10, { wall: false }); }
        const f = env.addField('ngf', { label: 'NGF-like attractant (axon chamber)', lambda: 260, effect: { axon: 1.2, minor: 0.5, dendrite: 0 }, gain: 1.6, color: '#7fd6c2' });
        f.paintSource(700, 40, 880, H - 40, 0.02);
        const e = new NeuriteEngine({ env, seed: o.seed, params: { seek: 0, activity: false, apoptosis: false, synapses: false } });
        for (let k = 0; k < 12; k++) e.addCell(170 + e.rand() * 130, 50 + k * 36 + (e.rand() - 0.5) * 14, { type: 'ipsc', spread: true, migrating: false, polarAngle: 0 });
        return e;
      },
    },
    stiffness: {
      group: 'Environment', label: 'Stiffness gradient',
      blurb: 'A gel from 0.1 kPa (left) to 300 kPa (right) under laminin, seeded with DRG neurons. The motor-clutch grips best at intermediate stiffness and slips on soft and stiff gel; a slipping cone loses polymer to retrograde flow, so DRG axons grow longest in the middle.',
      view: { mode: 'anatomy', speed: 40, frame: 'fit', overlay: 'stiffness' },
      build(o) {
        const env = new Environment(1000, 480, { coat: 2 });
        env.stiffnessGradient(40, 960, 0.1, 300);
        const e = new NeuriteEngine({ env, seed: o.seed, params: { seek: 0, activity: false, apoptosis: false, synapses: false } });
        for (let k = 0; k < 15; k++) e.addCell(70 + (k % 5) * 215, 90 + Math.floor(k / 5) * 150 + (e.rand() - 0.5) * 30, { type: 'drg', spread: true });
        return e;
      },
    },
    // ---------------------------------------------------------------- networks
    glia: {
      group: 'Networks', label: 'Glia and survival',
      blurb: 'Low-serum medium. The left half is plated on astrocytes that divide into a carpet; the right half is bare. Glia support neurons on contact and through factors that spread through the medium, so as the carpet grows the bare half is rescued too, as in a shared dish. Set Glial factor to 0 to see contact-only support: neurons without glial or synaptic support starve, and die at random over the next one to two days. Feeder layer models a coverslip suspended over glia.',
      view: { mode: 'phase', speed: 60, frame: 'fit' },
      build(o) {
        const W = 1000, H = 560, env = new Environment(W, H);
        const e = new NeuriteEngine({ env, seed: o.seed, params: { serum: 0.15, seek: 0.6, activity: false, dt: 0.08 } });
        for (let k = 0; k < 22; k++) e.addCell(30 + e.rand() * (W / 2 - 60), 30 + e.rand() * (H - 60), { type: 'astrocyte', z: 5 + e.rand() * 40 });
        for (let k = 0; k < 36; k++) e.addCell(30 + e.rand() * (W - 60), 30 + e.rand() * (H - 60), { type: 'ipsc', z: 30 + e.rand() * 120, migrating: false });
        return e;
      },
    },
    activity: {
      group: 'Networks', label: 'Activity and plasticity',
      blurb: 'A maturing culture (starts at DIV 6). Neurons fire, synapses strengthen with timing (STDP) and depress, the network starts to burst. Cells above their target rate shed synapses, cells below it grow more.',
      view: { mode: 'calcium', speed: 20, frame: 'fit', panel: 'raster' },
      build(o) {
        const n = o.count || 60, s = Math.round(Math.sqrt(n) * 85 + 120), env = new Environment(s, s);
        const e = new NeuriteEngine({ env, seed: o.seed, params: { startDIV: 6, seek: 0.8, apoptosis: false } });
        for (let k = 0; k < n; k++) e.addCell(40 + e.rand() * (s - 80), 40 + e.rand() * (s - 80), { type: k % 5 === 4 ? 'interneuron' : 'ipsc', z: 10 + e.rand() * 60, migrating: false });
        return e;
      },
    },
    population: {
      group: 'Networks', label: 'Large population',
      blurb: 'Stem-cell-derived neurons seeded across the coverslip: they settle, crawl, grow, seek one another and wire into clusters joined by bundled tracts.',
      view: { mode: 'phase', speed: 15, frame: 'fit' },
      build(o) {
        const n = o.count || 150, s = Math.round(Math.sqrt(n) * 140 + 160), env = new Environment(s, s, { coat: 2 });
        const e = new NeuriteEngine({ env, seed: o.seed, params: { seek: 0.8, activity: false, apoptosis: false, dt: 0.08 } });
        for (let k = 0; k < n; k++) e.addCell(60 + e.rand() * (s - 120), 60 + e.rand() * (s - 120), { type: 'ipsc', z: 10 + e.rand() * 260 });
        return e;
      },
    },
  };

  function buildScenario(key, o = {}) {
    const S = SCENARIOS[key]; if (!S) throw new Error('Unknown scenario ' + key);
    const opts = Object.assign({ seed: 7 }, o);
    const e = S.build(opts);
    if (o.params) e.setParams(o.params);
    e.scenario = key;
    return e;
  }
  return { SCENARIOS, buildScenario, TURN_SRC };
});
