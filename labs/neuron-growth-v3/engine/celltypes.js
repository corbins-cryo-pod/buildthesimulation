/*
 * Cell-type genomes. A type is plain data: every built-in neuron below is the same engine
 * reading different numbers. Add your own with registerType(key, partialGenome); anything
 * left out falls back to BASE.
 *
 * Angles are radians in screen coordinates (y grows downward): -π/2 points up the screen.
 */
(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.NE2 = root.NE2 || {}; Object.assign(root.NE2, mod); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const UP = -Math.PI / 2, DOWN = Math.PI / 2;

  const BASE = {
    label: 'Neuron', blurb: '', glia: false, inhibitory: false,
    radius: 6.5, softness: 0.7, reservoir: 1.5, cortexNoise: 1,
    primaries: [4, 6],           // primary neurites (min, max); the cell picks one in range
    initRate: 1.0,               // nub initiations per hour while below the count
    stage1Time: 20,              // min spent as a spreading, ruffling sphere before the first nub
    stage1Jitter: 0,             // log-normal spread of stage1Time between cells (sd of ln)
    layout: null,                // planned primaries in sprouting order: [{ dir, ident, apical }]
    axonRule: 'competition',     // 'competition' (longest minor wins) | 'layout' | 'none'
    axonLead: 12,                // µm the winner must lead the runner-up by
    axonMinLen: 25,              // µm minimum length of the winner
    axonHold: 150,               // min the lead must hold (also how long a sibling must out-grow the axon to take over)
    dendriteDelay: 3600,         // min, at least this long from axon specification to dendrites (stage 4)
    dendriteAxonLen: 0,          // µm, and the axon must be at least this long (0 = time only); ±20% per cell
    spineDelay: 4320,            // min, at least this long from stage 4 to spines (stage 5)
    spineDendLen: 0,             // µm of dendrite needed for spines (0 = time only); ±20% per cell
    production: 0.35,            // tubulin made by the soma, µm of neurite per min
    somaCap: 60,                 // soma tubulin store (µm-equivalents)
    upkeep: 1.2e-4,              // tubulin turnover per µm of arbor per min
    feedback: 1,                 // scales the global promoter feedback (params.polarity) for this type
    promoterBack: 1,             // scales the global promoter back-diffusion (params.promoterBack) for this type
    dendTransport: 0.6,          // steady (promoter-independent) tubulin delivery into dendrites
    minorRestrain: 1,            // speed factor for minor neurites once the cell has an axon (stage 3+)
    tractionCoupling: 0.25,      // 0-1: how much a slipping clutch wastes the tip's tubulin (stiffness sensitivity)
    tractionSpeed: 1,            // cone speed scales as (clutch advance)^tractionSpeed; < 1 = less stiffness-sensitive
    minor:    { speed: 0.55, maxLen: 50, branch: 0.2, turn: 0.06 },
    axon:     { speed: 2.2, branch: 0.8, maxLen: 3000, turn: 0.035, tSplit: 0, width: 1.0 },
    dendrite: { speed: 0.9, branch: 1.0, splitAngle: 0.65, maxLen: 320, maxOrder: 5, selfAvoid: 0.8,
                tiling: 0, turn: 0.06, dirBias: 0, width: 1.0, segMin: 10 },
    probes:   { cone: 6, soma: 3, maxLen: 9 },
    clutch: 1.0,                 // clutch binding multiplier (adhesion-receptor expression)
    migration: 'none',           // 'none' | 'nucleokinesis' | 'scaffold' | 'tangential'
    migrateTime: 0,              // min of migration before settling (0 = until a stop zone)
    pulsePeriod: 14, pulseStrength: 0.6,
    ephys: 'RS',                 // Izhikevich class: RS regular spiking, FS fast spiking, none
    cycle: 0,                    // division period (min) for glia; 0 = post-mitotic
    secretes: 1,                 // how strongly other cells' cones are drawn to it (seek)
    hue: 0.58,
  };

  const TYPES = {
    hippocampal: {
      label: 'Hippocampal', blurb: 'Rat hippocampal neuron in culture: several minor neurites, one wins and becomes the axon, the rest become dendrites.',
      // v3 calibration to Dotti, Sullivan & Banker 1988 (see the v3 doc)
      stage1Time: 540, stage1Jitter: 0.35, production: 0.7, feedback: 1, promoterBack: 0.6, axonHold: 90,
      // tractionSpeed 0.25: hippocampal outgrowth is nearly stiffness-insensitive (Koch et al. 2012). Cone speeds are
      // quoted at full clutch advance; on poly-lysine glass (advance 0.386) they run at 0.49x, as calibrated
      tractionSpeed: 0.25, minor: { speed: 0.4411, maxLen: 30, branch: 0.05 }, minorRestrain: 0.1, axon: { speed: 0.09802 }, dendrite: { speed: 0.02451 }, dendTransport: 0.8,
      dendriteDelay: 1440, dendriteAxonLen: 120, spineDelay: 2880, spineDendLen: 220, hue: 0.58,
    },
    pyramidal: {
      label: 'Cortical pyramidal', blurb: 'Apical dendrite up, axon down, basal dendrites around the base.',
      radius: 7.5, primaries: [5, 5], axonRule: 'layout',
      layout: [
        { dir: UP, ident: 'dendrite', apical: true },
        { dir: DOWN, ident: 'axon' },
        { dir: DOWN - 1.0, ident: 'dendrite' },
        { dir: DOWN + 1.0, ident: 'dendrite' },
        { dir: Math.PI * 0.08, ident: 'dendrite' },
      ],
      dendrite: { speed: 0.8, branch: 0.9, splitAngle: 0.55, maxLen: 260, maxOrder: 5, selfAvoid: 0.8, tiling: 0, turn: 0.05, dirBias: 0.25, width: 1.2, segMin: 12 },
      dendriteDelay: 0, spineDelay: 2160, hue: 0.62,
    },
    purkinje: {
      label: 'Purkinje', blurb: 'One primary dendrite fans out into a dense, self-avoiding tree; the axon leaves from the opposite pole.',
      radius: 10, primaries: [2, 2], axonRule: 'layout', production: 0.7, somaCap: 120,
      layout: [{ dir: UP, ident: 'dendrite', apical: true }, { dir: DOWN, ident: 'axon' }],
      dendrite: { speed: 0.75, branch: 3.2, splitAngle: 0.75, maxLen: 140, maxOrder: 9, selfAvoid: 1.6, tiling: 0, turn: 0.08, dirBias: 0.15, width: 1.3, segMin: 7 },
      dendriteDelay: 0, spineDelay: 2160, hue: 0.75,
    },
    granule: {
      label: 'Cerebellar granule', blurb: 'Tiny soma, a few short clawed dendrites, and an axon that splits into a T to form a parallel fiber.',
      radius: 3.4, primaries: [4, 4], axonRule: 'layout', production: 0.3, somaCap: 40,
      layout: [{ dir: UP, ident: 'axon' }, { dir: DOWN, ident: 'dendrite' }, { dir: DOWN - 1.2, ident: 'dendrite' }, { dir: DOWN + 1.2, ident: 'dendrite' }],
      axon: { speed: 2.4, branch: 0.1, maxLen: 900, turn: 0.012, tSplit: 45, width: 0.8 },
      dendrite: { speed: 0.4, branch: 0.6, splitAngle: 0.9, maxLen: 16, maxOrder: 2, selfAvoid: 0.5, tiling: 0, turn: 0.08, dirBias: 0.2, width: 0.9, segMin: 4 },
      probes: { cone: 5, soma: 2, maxLen: 6 }, dendriteDelay: 0, hue: 0.12,
    },
    rgc: {
      label: 'Retinal ganglion', blurb: 'Radial dendrites that avoid themselves and tile with same-type neighbours; one long axon.',
      radius: 7, primaries: [5, 6], axonRule: 'layout', production: 0.5, somaCap: 80,
      layout: [{ dir: 0, ident: 'axon' }, { dir: 'any', ident: 'dendrite' }, { dir: 'any', ident: 'dendrite' }, { dir: 'any', ident: 'dendrite' }, { dir: 'any', ident: 'dendrite' }, { dir: 'any', ident: 'dendrite' }],
      dendrite: { speed: 0.8, branch: 1.4, splitAngle: 0.7, maxLen: 120, maxOrder: 5, selfAvoid: 1.2, tiling: 1.5, turn: 0.05, dirBias: 0, width: 1.0, segMin: 9 },
      dendriteDelay: 0, hue: 0.45,
    },
    drg: {
      label: 'DRG sensory', blurb: 'Large pseudo-unipolar sensory neuron: one stem that splits into two fast axons, big growth cones, no dendrites.',
      radius: 10, primaries: [1, 1], axonRule: 'layout', production: 1.1, somaCap: 160, upkeep: 0.8e-4,
      layout: [{ dir: 'any', ident: 'axon' }],
      axon: { speed: 4.0, branch: 0.35, maxLen: 4000, turn: 0.03, tSplit: 28, width: 1.3 },
      probes: { cone: 10, soma: 3, maxLen: 12 }, clutch: 1.2, dendriteDelay: 0, tractionCoupling: 1, hue: 0.02,
    },
    interneuron: {
      label: 'Migrating interneuron', blurb: 'Inhibitory neuron on a tangential migration: a branched leading process probes ahead, the nucleus follows one branch, then it settles and grows a multipolar arbor.',
      radius: 5.5, primaries: [4, 5], inhibitory: true, ephys: 'FS', axonRule: 'competition', axonHold: 20,
      migration: 'tangential', migrateTime: 600, pulsePeriod: 12, pulseStrength: 0.7,
      minor: { speed: 1.0, maxLen: 45, branch: 1.2, turn: 0.05 },
      hue: 0.92,
    },
    da: {
      label: 'Fly da neuron', blurb: 'Drosophila class IV sensory neuron: a space-filling dendrite that strictly avoids itself and tiles with neighbours.',
      radius: 5, primaries: [4, 4], axonRule: 'layout', production: 0.8, somaCap: 120,
      layout: [{ dir: DOWN, ident: 'axon' }, { dir: 'any', ident: 'dendrite' }, { dir: 'any', ident: 'dendrite' }, { dir: 'any', ident: 'dendrite' }],
      axon: { speed: 1.6, branch: 0, maxLen: 120, turn: 0.02, tSplit: 0, width: 0.8 },
      dendrite: { speed: 0.9, branch: 4.0, splitAngle: 0.95, maxLen: 70, maxOrder: 10, selfAvoid: 2.0, tiling: 2.0, turn: 0.12, dirBias: 0, width: 0.8, segMin: 6 },
      dendriteDelay: 0, ephys: 'none', hue: 0.33,
    },
    ipsc: {
      label: 'iPSC cortical', blurb: 'Human stem-cell-derived cortical neuron: migrates, clumps, bundles and wires quickly, like your culture videos.',
      radius: 6, primaries: [3, 5], axonHold: 15, axonLead: 8, axonMinLen: 18, production: 0.55,
      migration: 'nucleokinesis', migrateTime: 360, pulsePeriod: 30, pulseStrength: 0.35,
      dendriteDelay: 900, spineDelay: 1440, secretes: 1.3, hue: 0.52,
    },
    astrocyte: {
      label: 'Astrocyte', blurb: 'Flat glial cell: spreads into a carpet, divides until contact-inhibited, supports neuron survival and synapses.',
      glia: true, radius: 9, softness: 0.95, reservoir: 5, cortexNoise: 1.6, primaries: [0, 0],
      probes: { cone: 0, soma: 9, maxLen: 6 }, clutch: 1.6, ephys: 'none', cycle: 1500, secretes: 0.6, hue: 0.1,
    },
    sphere: {
      label: 'Soft sphere', blurb: 'A cell with no program: a soft sticky ball.', glia: true, primaries: [0, 0], softness: 1, reservoir: Infinity,
      probes: { cone: 0, soma: 0, maxLen: 6 }, ephys: 'none', cortexNoise: 1.4, hue: 0.58,
    },
  };

  function merge(base, over) {
    const out = Object.assign({}, base);
    for (const k in over) {
      const v = over[k];
      out[k] = (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') ? Object.assign({}, base[k], v) : v;
    }
    return out;
  }
  const RESOLVED = {};
  function getType(key) {
    if (!RESOLVED[key]) {
      if (!TYPES[key]) throw new Error('Unknown cell type: ' + key);
      RESOLVED[key] = Object.assign(merge(BASE, TYPES[key]), { key });
    }
    return RESOLVED[key];
  }
  function registerType(key, genome) { TYPES[key] = genome; delete RESOLVED[key]; return getType(key); }
  function typeKeys() { return Object.keys(TYPES); }

  return { CellTypes: { BASE, TYPES, getType, registerType, typeKeys, UP, DOWN } };
});
