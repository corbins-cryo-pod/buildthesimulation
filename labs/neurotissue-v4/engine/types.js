/*
 * Cell types for the v4 core. A type is data: which behaviours a cell runs and with what numbers.
 * Behaviours: neurites (growth cones, tubulin, identity, stages), migrate, divide, secrete, consume,
 * survive. Anything left out falls back to BASE. Units: µm, minutes.
 */
(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.NE4 = root.NE4 || {}; Object.assign(root.NE4, mod); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const BASE = {
    label: 'Cell', kind: 'neuron', color: '#88aed3', radius: 6,
    // ---- neurites (neurons only)
    primaries: [4, 6], initRate: 1.0, stage1Time: 20, stage1Jitter: 0, layout: null,
    axonRule: 'competition', axonLead: 12, axonMinLen: 25, axonHold: 150,
    dendriteDelay: 3600, dendriteAxonLen: 0, spineDelay: 4320, spineDendLen: 0,
    production: 0.35, somaCap: 60, upkeep: 1.2e-4, feedback: 1, promoterBack: 1, dendTransport: 0.6, minorRestrain: 1,
    tractionCoupling: 0.25, tractionSpeed: 1, clutch: 1.0, gripK: 1.0,
    minor: { speed: 0.55, maxLen: 50, branch: 0.2, turn: 0.06 },
    axon: { speed: 2.2, branch: 0.8, maxLen: 3000, turn: 0.035, tSplit: 0, branchZone: 0 },
    dendrite: { speed: 0.9, branch: 1.0, splitAngle: 0.65, maxLen: 320, maxOrder: 5, turn: 0.06, segMin: 10 },
    gelK: 1,                 // kPa: in an embedding matrix, speed /= 1 + confinement x stiffness / gelK
    cues: null,              // { fieldName: weight } chemotaxis of growth cones (negative = repulsion)
    permissive: null,        // { cells: { type, r, n }, field: { name, w }, floor } where cones can advance
    inhibit: null,           // { fieldName: k } speed /= 1 + k x value
    follow: null,            // { type, r, w } growth cones align with and stay near cells of this type
    sproutDelay: 0,          // min before an injured axon starts to grow (stump axons)
    maxNeurites: 0,          // cap on neurites (incl. branches) per cell; 0 = from the number of primaries
    tipSupply: 0,            // µm-equivalents/min delivered straight to growing tips by slow axonal transport
    // ---- motility (non-neuronal cells, or neurons before they settle)
    migrate: null,           // { speed, persist (min), crowd, align, chemo: { field: w }, needs: { field, k, min } }
    cycle: 0, cycleJitter: 0.3, maxNeighbours: 6, contactR: 0, divideNeeds: null,   // contactR: radius for contact inhibition (0 = 2.6 x radius)
    secrete: null,           // { fieldName: rate (units/min per cell) }
    consume: null,           // { fieldName: rate (units/min per cell) }
    life: 0,                 // min; 0 = no fixed lifespan
    trophic: null,           // { fieldName: weight } trophic support from fields
  };

  const TYPES = {
    // ---------------- neurons
    hippocampal: {
      label: 'Hippocampal neuron', color: '#88aed3', radius: 6.5,
      // v3 calibration to Dotti et al. 1988, carried over
      stage1Time: 760, stage1Jitter: 0.35, production: 0.7, feedback: 1, promoterBack: 0.6, axonHold: 90,   // stage1Time: v3's 540 min plus the settling time v3 modelled separately
      tractionSpeed: 0.25, minor: { speed: 0.4411, maxLen: 30, branch: 0.05 }, minorRestrain: 0.1,
      axon: { speed: 0.13, branch: 0.8 }, dendrite: { speed: 0.03 }, dendTransport: 0.8,   // v4: grip comes from substrate adhesion, so speeds were refitted to Dotti
      dendriteDelay: 1440, dendriteAxonLen: 120, spineDelay: 2880, spineDendLen: 220,
    },
    drg: {
      label: 'DRG neuron', color: '#e8a0a0', radius: 10, primaries: [1, 2], axonRule: 'layout', layout: [{ ident: 'axon' }, { ident: 'axon' }],
      production: 1.1, somaCap: 160, upkeep: 0.8e-4, tractionCoupling: 1, clutch: 1.2, stage1Time: 120,
      axon: { speed: 1.2, branch: 0.6, maxLen: 6000, turn: 0.03 }, dendriteDelay: 0, gelK: 0.35,
    },
    stumpAxon: {
      label: 'Regenerating axon', color: '#d79ce6', radius: 4, primaries: [1, 1], axonRule: 'layout', layout: [{ ident: 'axon' }],
      production: 0, somaCap: 600, upkeep: 0, tractionCoupling: 0, stage1Time: 0, dendriteDelay: 0, tipSupply: 3.2, waves: false,
      axon: { speed: 22, branch: 0.6, maxLen: 1e6, turn: 0.04, branchZone: 300 }, sproutDelay: 2880, maxNeurites: 2,   // speed: ~3 um/min on Schwann bands in the tube
      // growth needs repair Schwann cells (their local density, field 'glia'); on bare fibrin cones only creep
      permissive: { field: { name: 'glia', w: 1, k: 0.03 }, floor: 0.04 },
      inhibit: { debris: 4.0 }, cues: null, follow: { type: 'schwann', r: 45, w: 1.5 },
    },
    // ---------------- glia and immune cells
    schwann: {
      kind: 'glia', label: 'Schwann cell (repair)', color: '#7fd6a9', radius: 9, elongate: 2.5,
      // repair-cell conversion takes days after injury (after, ~5 d here); then they migrate onto the fibrin cable and proliferate
      // columns: leaders migrate along the cable, followers stay attached (cohesion), cells divide where a column has stretched
      migrate: { speed: 0.7, persist: 600, crowd: 1.2, cohesion: 1.5, cohR: 80, align: 1.0, axial: 1.0, chemo: null, after: 7200, afterJitter: 0.15, needs: { field: 'fibrin', k: 0.25, min: 0.12, regions: ['stump'] } },
      cycle: 2160, maxNeighbours: 2, contactR: 70, divideNeeds: { field: 'fibrin', min: 0.12, regions: ['stump'] },
      secrete: { trophin: 0.004, glia: 1 / 30 }, consume: { debris: 0.00005 },   // glia: a marker of repair-cell density (cells per voxel)
    },
    macrophage: {
      kind: 'immune', label: 'Macrophage', color: '#f2c14e', radius: 8,
      migrate: { speed: 1.2, persist: 30, crowd: 0.6, align: 0, chemo: { debris: 300 }, needs: null },
      consume: { debris: 0.0015 }, life: 10080,
    },
    astrocyte: { kind: 'glia', label: 'Astrocyte', color: '#d6a86a', radius: 9, migrate: null, cycle: 1500, maxNeighbours: 5 },
  };

  function merge(base, over) {
    const out = Object.assign({}, base);
    for (const k in over) { const v = over[k]; out[k] = (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') ? Object.assign({}, base[k], v) : v; }
    return out;
  }
  const RESOLVED = {};
  function getType(key) { if (!RESOLVED[key]) { if (!TYPES[key]) throw new Error('Unknown cell type: ' + key); RESOLVED[key] = Object.assign(merge(BASE, TYPES[key]), { key }); } return RESOLVED[key]; }
  function registerType(key, genome, from) { TYPES[key] = from ? merge(TYPES[from], genome) : genome; delete RESOLVED[key]; return getType(key); }
  function typeKeys() { return Object.keys(TYPES); }
  return { CellTypes4: { BASE, TYPES, getType, registerType, typeKeys } };
});
