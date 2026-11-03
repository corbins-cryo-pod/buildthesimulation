const { buildScenario } = require('../engine/presets.js');
const e = buildScenario('stiffness', { seed: +(process.argv[2] || 3) });
e.step(Math.round(12 * 60 / e.p.dt));
const cols = {};
for (const c of e.cells) { const k = Math.round((c.x - 70) / 215); const m = e.metrics(c); (cols[k] = cols[k] || []).push(m.totalLength); }
for (const k of Object.keys(cols).sort()) { const v = cols[k]; const E = 10 ** (Math.log10(0.1) + (Math.log10(300) - Math.log10(0.1)) * ((70 + k * 215 - 40) / 920)); console.log('col', k, 'E≈', E.toFixed(2), 'kPa  mean total length', (v.reduce((a, b) => a + b, 0) / v.length).toFixed(0)); }
