// Symmetry breaking before the axon: which neurite wins, how often the lead changes, how much minors retract.
const L = require('./lib.js');
const seeds = +(process.argv[2] || 20), rows = [];
for (let s = 1; s <= seeds; s++) {
  const { e, c } = L.singleEngine({ seed: s, type: 'hippocampal' });
  let first = -1, leader = -1, changes = 0, retr = 0, grow = 0, samples = 0, maxPrim = 0;
  while (c.stageT[3] < 0 && e.t < 6 * 1440) {
    e.step(L.stepsFor(e, 10));
    let best = null, bl = 0, n = 0;
    for (const id of c.neur) { const nr = e.neurites[id]; if (nr.parent >= 0) continue; n++; if (first < 0) first = nr.id; if (nr.len > bl) { bl = nr.len; best = nr; } if (nr.state === 1) retr++; else grow++; }
    maxPrim = Math.max(maxPrim, n);
    if (best && bl > 5) { if (leader >= 0 && best.id !== leader) changes++; leader = best.id; }
    samples++;
  }
  rows.push({ seed: s, specH: +(c.stageT[3] / 60).toFixed(1), axonIsFirst: c.axonId === first, leadChanges: changes, minorRetractFrac: +(retr / Math.max(1, retr + grow)).toFixed(3), maxPrim });
}
console.log(JSON.stringify(rows));
const firstN = rows.filter((r) => r.axonIsFirst).length;
const med = (v) => { const s = v.slice().sort((a, b) => a - b); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
console.log('axon was first neurite', firstN, 'of', rows.length, '| median lead changes', med(rows.map((r) => r.leadChanges)), 'range', Math.min(...rows.map((r) => r.leadChanges)), Math.max(...rows.map((r) => r.leadChanges)), '| median minor retract frac', med(rows.map((r) => r.minorRetractFrac)), '| median max primaries before axon', med(rows.map((r) => r.maxPrim)));
