// Stiffness series for DRG neurons inside a gel and on its surface (48 h, several seeds).
// Writes exp/results/gel-trend.json (inside-gel means, used by the page) and prints a table.
const fs = require('fs'), path = require('path');
const { buildScenario } = require('../engine/scenarios.js');
const ks = [0.25, 0.5, 1, 2, 4], seeds = [1, 2, 3], hours = 48;
const rows = [];
for (const key of ['gel', 'gelSurface']) for (const k of ks) {
  let s24 = 0, s48 = 0; const t0 = Date.now();
  for (const seed of seeds) {
    const e = buildScenario(key, { stiffness: k, seed });
    e.step(Math.round(24 * 60 / e.p.dt)); s24 += e.stats().neuriteLen;
    e.step(Math.round(24 * 60 / e.p.dt)); s48 += e.stats().neuriteLen;
  }
  const r = { key, k, len24: s24 / seeds.length, len48: s48 / seeds.length, wall: (Date.now() - t0) / 1000 };
  rows.push(r); console.log(`${key.padEnd(10)} ${String(k).padEnd(5)} kPa  24 h ${r.len24.toFixed(0).padStart(5)} um   48 h ${r.len48.toFixed(0).padStart(5)} um   (${r.wall.toFixed(0)} s)`);
}
fs.mkdirSync(path.join(__dirname, 'results'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'results', 'gel-trend-full.json'), JSON.stringify(rows, null, 1));
fs.writeFileSync(path.join(__dirname, 'results', 'gel-trend.json'), JSON.stringify(rows.filter((r) => r.key === 'gel').map((r) => ({ k: r.k, len: +r.len48.toFixed(1) }))));
