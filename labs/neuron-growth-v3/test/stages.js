const { NeuriteEngine, Environment, CellTypes } = require('../engine/core.js');
const type = process.argv[2] || 'hippocampal', days = +(process.argv[3] || 4), seeds = +(process.argv[4] || 6);
const over = process.argv[5] ? JSON.parse(process.argv[5]) : null;
if (over) { const T = CellTypes.TYPES[type]; for (const k in over) T[k] = typeof over[k] === 'object' ? Object.assign({}, CellTypes.BASE[k], T[k] || {}, over[k]) : over[k]; CellTypes.registerType(type, T); }
const rows = [];
for (let s = 1; s <= seeds; s++) {
  const e = new NeuriteEngine({ env: new Environment(1400, 1400), seed: s * 7919, params: { activity: false } });
  const c = e.addCell(700, 700, { type, spread: true });
  e.step(Math.round(days * 1440 / e.p.dt));
  const m = e.metrics(c);
  rows.push(c.stageT.map((x) => x < 0 ? NaN : x / 60));
  console.log(`seed ${s}: stage2 ${(c.stageT[2]/60).toFixed(1)}h stage3 ${(c.stageT[3]/60).toFixed(1)}h stage4 ${(c.stageT[4]/60).toFixed(1)}h stage5 ${c.stageT[5] < 0 ? "-" : (c.stageT[5]/60).toFixed(1) + "h"} | axon ${m.axonLength.toFixed(0)} dend ${m.dendriteLength.toFixed(0)} minor ${m.minorLength.toFixed(0)} bp ${m.branchPoints}`);
}
const med = (k) => { const v = rows.map((r) => r[k]).filter((x) => !isNaN(x)).sort((a, b) => a - b); return v.length ? v[v.length >> 1].toFixed(1) + `h (${v.length}/${rows.length})` : 'none'; };
console.log('median stage2', med(2), 'stage3', med(3), 'stage4', med(4), 'stage5', med(5));
