/*
 * Scenario presets for NeuriteEngine. Each one builds a fresh engine.
 * They follow the design path: soft sphere -> sticky pancake -> worm crawl ->
 * one appendage with a nub and MT probes -> a full neuron -> two cells -> a population.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.NeuritePresets = factory(root.NeuriteEngine);
})(typeof self !== 'undefined' ? self : this, function (NeuriteEngine) {
  'use strict';

  const PRESETS = {
    pancake: {
      label: 'Soft sphere',
      blurb: 'A very soft, sticky sphere dropped on glass. It wets the surface and flattens toward a pancake. Drag Softness down to see a stiffer cell stay round.',
      world: [180, 180],
      params: { softness: 1.0, reservoir: Infinity, maxNeurites: 0, somaProbes: 0, spreadRate: 0.08, cortexNoise: 1.4 },
      view: { mode: 'anatomy', speed: 2, frame: 120 },
      setup(e) { e.addCell(90, 90, { z: 45, maxNeurites: 0, radius: 7 }); },
    },
    worm: {
      label: 'Worm crawl',
      blurb: 'One appendage. The tip extends and grips with its probes, then a contraction pulse lets the soma slip forward and swallow the proximal shaft. Extend, grip, contract, release.',
      world: [900, 240],
      params: { maxNeurites: 1, pulsePeriod: 14, pulseStrength: 0.6, waveRate: 3.0, branchRate: 0, seek: 0, polarity: 0, somaProbes: 1, turnNoise: 0.05, retractDelay: 9999, growthSpeed: 1.3, softness: 0.6 },
      view: { mode: 'anatomy', speed: 6, frame: 130, follow: true },
      warmup: 400,
      setup(e) { e.addCell(90, 120, { maxNeurites: 1, maxLen: 42, polarAngle: 0, spread: true }); },
    },
    initiation: {
      label: 'First neurite',
      blurb: 'A spread cell pushes out a nub. MT probes pop out of it, stick to the glass and drag the membrane with them until a neurite and growth cone sprout.',
      world: [220, 220],
      params: { maxNeurites: 1, initRate: 4, somaProbes: 4, seek: 0, branchRate: 0.6, waveRate: 1.6 },
      view: { mode: 'anatomy', speed: 2, frame: 90 },
      setup(e) { e.addCell(110, 110, { maxNeurites: 1, spread: true, polarAngle: -0.3 }); },
    },
    single: {
      label: 'One neuron',
      blurb: 'A full neuron in isolation: several neurites, actin waves pulsing out from the soma, growth spurts, branching at corners, and retraction when waves stop coming.',
      world: [900, 900],
      params: { maxNeurites: 6, seek: 0, polarity: 0.5 },
      setup(e) { e.addCell(450, 450, { spread: true }); },
      view: { mode: 'anatomy', speed: 8, frame: 260 },
      warmup: 4800,
    },
    pair: {
      label: 'Two cells',
      blurb: 'Two neurons 240 µm apart. Growth cones sense each other, steer, touch with their probes and form a synapse-like bond.',
      world: [520, 320],
      params: { maxNeurites: 5, seek: 0.75, polarity: 0.4 },
      view: { mode: 'anatomy', speed: 10, frame: 330, center: [260, 160] },
      setup(e) { e.addCell(140, 160, { spread: true }); e.addCell(380, 160, { spread: true }); },
      warmup: 2400,
    },
    population: {
      label: 'Population',
      blurb: 'Cells are seeded onto the coverslip, settle, spread, grow neurites, seek one another and wire into clusters joined by bundled tracts.',
      count: 80,
      params: { maxNeurites: 5, seek: 0.8, growthSpeed: 1.4, waveRate: 2.0, branchRate: 0.3 },
      view: { mode: 'phase', speed: 10, frame: 'fit' },
      world(count) { const s = Math.round(Math.sqrt(count) * 140 + 160); return [s, s]; },
      setup(e, count) {
        const [W, H] = [e.W, e.H];
        for (let k = 0; k < count; k++) {
          const x = 60 + e.rand() * (W - 120), y = 60 + e.rand() * (H - 120);
          e.addCell(x, y, { z: 10 + e.rand() * 260 });
        }
      },
    },
  };

  function build(name, opts = {}) {
    const P = PRESETS[name];
    const count = opts.count || P.count || 0;
    const world = typeof P.world === 'function' ? P.world(count) : P.world;
    const params = Object.assign({}, P.params, opts.params || {});
    const e = new NeuriteEngine({ width: world[0], height: world[1], params, seed: opts.seed != null ? opts.seed : 7, capacity: 8192 });
    P.setup(e, count);
    if (P.warmup && !opts.noWarmup) e.step(P.warmup);
    return e;
  }

  return { PRESETS, build };
});
