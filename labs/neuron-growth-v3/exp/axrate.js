// Axon elongation in the 18 h after specification, and minor-neurite count at 24 h (compare Dotti et al. 1988, Table 1)
const L = require('./lib.js');
const seeds = +(process.argv[2] || 8), rows = [];
for (let s = 1; s <= seeds; s++) {
  const { e, c } = L.singleEngine({ seed: s, type: 'hippocampal' });
  e.step(L.stepsFor(e, 24 * 60)); const prim24 = L.sample(e, c).primaries;
  while (c.stageT[3] < 0 && e.t < 6 * 1440) e.step(L.stepsFor(e, 5));
  const ax = e.neurites[c.axonId]; const L0 = ax.len; let peak = 0, last = L0;
  for (let k = 0; k < 9; k++) { e.step(L.stepsFor(e, 120)); peak = Math.max(peak, (ax.len - last) / 2); last = ax.len; }
  rows.push({ seed: s, specH: +(c.stageT[3] / 60).toFixed(1), lenAtSpec: +L0.toFixed(1), rate18: +((ax.len - L0) / 18).toFixed(1), peak2h: +peak.toFixed(1), prim24 });
}
console.log(JSON.stringify(rows));
const med = (v) => { const s = v.slice().sort((a, b) => a - b); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
console.log('median rate18', med(rows.map((r) => r.rate18)), 'median peak2h', med(rows.map((r) => r.peak2h)), 'median lenAtSpec', med(rows.map((r) => r.lenAtSpec)), 'median prim24', med(rows.map((r) => r.prim24)));
