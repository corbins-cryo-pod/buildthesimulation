#!/usr/bin/env node
/*
 * Fit cell-type genome numbers to measured targets with a simple (1+1) evolution strategy
 * (one mutated candidate per trial, kept only if it scores better).
 *
 *   node tools/calibrate.js tools/targets-hippocampal.json [trials] [seedsPerTrial]
 *
 * Targets file:
 *   { "type": "hippocampal", "days": 5,
 *     "fit": [ { "path": "axonHold", "min": 60, "max": 400 }, { "path": "minor.speed", "min": 0.3, "max": 1.2 } ],
 *     "targets": { "stage2_h": [12, 0.3], "stage3_h": [36, 0.3], "stage4_h": [96, 0.25], "axon_um@3d": [400, 0.4] } }
 * Each target is [value, relative tolerance]. Metrics available: stageN_h (median time to stage N),
 * axon_um@Xd, dendrite_um@Xd, branchPoints@Xd, sholl_max@Xd (peak Sholl crossings).
 * The script prints the best genome patch; paste it into registerType or engine/celltypes.js.
 */
const path = require('path');
const { NeuriteEngine, Environment, CellTypes, Morpho } = require(path.join(__dirname, '../engine/core.js'));
const file = process.argv[2]; if (!file) { console.error('usage: calibrate.js targets.json [trials] [seeds]'); process.exit(1); }
const spec = JSON.parse(require('fs').readFileSync(file, 'utf8'));
const trials = +(process.argv[3] || 24), seeds = +(process.argv[4] || 3);
// Reject misspelled or unsampled targets before performing an expensive fit.
if (!CellTypes.TYPES[spec.type]) throw new Error('Unknown cell type: '+spec.type);
if (!Number.isFinite(spec.days) || spec.days<=0 || spec.days*2!==Math.round(spec.days*2)) throw new Error('days must be a positive multiple of 0.5');
if (!Number.isInteger(trials)||trials<0||!Number.isInteger(seeds)||seeds<1) throw new Error('Invalid trial or seed count');
if (!spec.targets || !Object.keys(spec.targets).length || !Array.isArray(spec.fit)||!spec.fit.length) throw new Error('Nonempty targets and fit parameters required');
for(const [key,pair] of Object.entries(spec.targets)){
 const stage=/^stage[2-5]_h$/.test(key),metric=/^(axon_um|dendrite_um|branchPoints|sholl_max)@([0-9]+(?:\.[0-9]+)?)d$/.exec(key);
 if(!stage&&!metric)throw new Error('Unknown target: '+key);
 if(metric){const day=+metric[2];if(day<=0||day>spec.days||day*2!==Math.round(day*2))throw new Error('Target day must be sampled: '+key);}
 if(!Array.isArray(pair)||pair.length!==2||pair.some(x=>typeof x!=='number'||!Number.isFinite(x)||x<=0))throw new Error('Positive finite target and relative tolerance required: '+key);
}
for(const f of spec.fit){
 const value=String(f.path).split('.').reduce((o,k)=>o&&o[k],CellTypes.getType(spec.type));
 if(typeof value!=='number'||!Number.isFinite(f.min)||!Number.isFinite(f.max)||f.max<=f.min)throw new Error('Invalid fit parameter: '+f.path);
}
const base = JSON.parse(JSON.stringify(CellTypes.TYPES[spec.type]));
const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
const set = (o, p, v) => { const ks = p.split('.'); let a = o; for (let i = 0; i < ks.length - 1; i++) { a[ks[i]] = Object.assign({}, CellTypes.BASE[ks[i]] || {}, a[ks[i]] || {}); a = a[ks[i]]; } a[ks[ks.length - 1]] = v; };

function evaluate(patch) {
  const g = JSON.parse(JSON.stringify(base)); for (const k in patch) set(g, k, patch[k]);
  CellTypes.registerType('__fit', g);
  const days = spec.days || 5, samples = [];
  const checkpoints = new Set(Object.keys(spec.targets).filter((k) => k.includes('@')).map((k) => parseFloat(k.split('@')[1])));
  for (let s = 0; s < seeds; s++) {
    const e = new NeuriteEngine({ env: new Environment(1600, 1600), seed: 1000 + s * 7919, params: { activity: false, seek: 0 } });
    const c = e.addCell(800, 800, { type: '__fit', spread: true });
    const rec = {};
    for (let d = 0.5; d <= days + 1e-9; d += 0.5) {
      e.step(Math.round(720 / e.p.dt));
      if (checkpoints.has(d)) { const m = Morpho.cellMetrics(e, c); rec[d] = { axon: m.axonLength, dend: m.dendriteLength, bp: m.branchPoints, sholl: Math.max(0, ...m.sholl.map((x) => x.n)) }; }
    }
    rec.stage = c.stageT.map((t) => (t < 0 ? NaN : (t - c.born) / 60));
    samples.push(rec);
  }
  const med = (arr) => { const v = arr.filter((x) => !isNaN(x)).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : NaN; };
  let score = 0; const got = {};
  for (const [k, [want, tol]] of Object.entries(spec.targets)) {
    let val;
    const m = k.match(/^stage(\d)_h$/); if (m) val = med(samples.map((r) => r.stage[+m[1]]));
    const q = k.match(/^(axon_um|dendrite_um|branchPoints|sholl_max)@([\d.]+)d$/);
    if (q) { const key = { axon_um: 'axon', dendrite_um: 'dend', branchPoints: 'bp', sholl_max: 'sholl' }[q[1]]; val = med(samples.map((r) => (r[+q[2]] || {})[key])); }
    got[k] = val;
    score += isNaN(val) ? 25 : ((val - want) / (want * tol)) ** 2;
  }
  return { score, got };
}

let best = {}; const resolved = CellTypes.getType(spec.type); for (const f of spec.fit) best[f.path] = get(resolved, f.path) ?? (f.min + f.max) / 2;
let bestR = evaluate(best), sigma = 0.25;
console.log('start', JSON.stringify(best), 'score', bestR.score.toFixed(2), JSON.stringify(bestR.got));
for (let t = 0; t < trials; t++) {
  const cand = {};
  for (const f of spec.fit) { const span = f.max - f.min; cand[f.path] = Math.min(f.max, Math.max(f.min, best[f.path] + (Math.random() * 2 - 1) * sigma * span)); }
  const r = evaluate(cand);
  if (r.score < bestR.score) { best = cand; bestR = r; sigma = Math.min(0.4, sigma * 1.3); console.log(`trial ${t + 1}: better`, JSON.stringify(cand), 'score', r.score.toFixed(2), JSON.stringify(r.got)); }
  else sigma = Math.max(0.03, sigma * 0.9);
}
console.log('\nbest patch for', spec.type + ':', JSON.stringify(best, null, 2));
console.log('metrics', JSON.stringify(bestR.got));
