// Shared helpers for the experiment suite (exp/). Each job runs in its own process.
const path = require('path');
const core = require(path.join(__dirname, '../engine/core.js'));
const { NeuriteEngine, Environment, CellTypes } = core;
const { buildScenario, TURN_SRC } = require(path.join(__dirname, '../engine/presets.js'));

const I_MINOR = 1, I_AXON = 2, I_DEND = 3, TIPCAP = 6;
const hyp = Math.hypot;

// apply a partial genome patch to a type under a fresh key and return that key
function patchedType(type, genome) {
  if (!genome || !Object.keys(genome).length) return type;
  const base = JSON.parse(JSON.stringify(CellTypes.TYPES[type]));
  for (const k in genome) {
    if (genome[k] && typeof genome[k] === 'object') base[k] = Object.assign({}, CellTypes.BASE[k], base[k] || {}, genome[k]);
    else base[k] = genome[k];
  }
  const key = type + '__x';
  CellTypes.registerType(key, base);
  return key;
}

function rootOf(e, nr) { while (nr.parent >= 0) nr = e.neurites[nr.parent]; return nr; }

// per-cell snapshot: lengths by identity, per-primary subtree length, dendrite tip state
function sample(e, c) {
  const m = e.metrics(c);
  const sub = new Map();
  let dG = 0, dR = 0, dCk = 0, dN = 0;
  for (const id of c.neur) {
    const nr = e.neurites[id];
    const r = rootOf(e, nr);
    sub.set(r.id, (sub.get(r.id) || 0) + nr.len);
    if (nr.ident === I_DEND) { dN++; if (nr.state === 0) dG++; else if (nr.state === 1) dR++; dCk += Math.min(1.5, nr.T / TIPCAP); }
  }
  const prim = c.neur.map((id) => e.neurites[id]).filter((nr) => nr.parent < 0)
    .map((nr) => ({ id: nr.id, ident: nr.ident, L: +(sub.get(nr.id) || 0).toFixed(1) }));
  return {
    t: +(e.t / 60).toFixed(2), alive: c.alive, stage: c.stage,
    axon: +m.axonLength.toFixed(1), dend: +m.dendriteLength.toFixed(1), minor: +m.minorLength.toFixed(1),
    bp: m.branchPoints, tips: m.tips, primaries: m.primaries, maxOrder: m.maxOrder,
    Q: +(c.Q / c.T.somaCap).toFixed(3), troph: +c.troph.toFixed(3),
    dTips: dN, dGrow: dN ? +(dG / dN).toFixed(3) : null, dRetract: dN ? +(dR / dN).toFixed(3) : null, dTipTub: dN ? +(dCk / dN).toFixed(3) : null,
    nAxonPrim: prim.filter((p) => p.ident === I_AXON).length,
    long100: prim.filter((p) => p.L > 100).length,
    prim,
    sholl: m.sholl.map((s) => s.n),
  };
}

// v3: transection is part of the engine. mode 'reset' clears the axon label at the cut (engine default);
// 'keep' leaves it on the stump, so only the engine's revocable-identity rule can hand the axon to a sibling.
function cut(e, nr, stump, mode) { return e.transect(nr, stump, { resetIdentity: mode !== 'keep' }); }

function setIdentTree(e, nr, ident) { e._setIdent(nr, ident); }

function singleEngine(job) {
  const W = job.W || 1400;
  const env = new Environment(W, W, Object.assign({}, job.env || {}));
  const params = Object.assign({ activity: false }, job.params || {});
  const e = new NeuriteEngine({ env, seed: job.seed * 7919, params });
  const type = patchedType(job.type || 'hippocampal', job.genome);
  const c = e.addCell(W / 2, W / 2, Object.assign({ type, spread: true }, job.cell || {}));
  return { e, c };
}

const stepsFor = (e, minutes) => Math.max(1, Math.round(minutes / e.p.dt));

module.exports = { TURN_SRC, core, NeuriteEngine, Environment, CellTypes, buildScenario, patchedType, sample, cut, singleEngine, stepsFor, rootOf, I_MINOR, I_AXON, I_DEND, TIPCAP };
