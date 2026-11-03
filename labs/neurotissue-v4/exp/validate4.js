// Exploratory calibration jobs, NOT independent biological validation. usage: node exp/validate4.js dish|conduit <seed> [gap] [graft]
// dish: 6 hippocampal neurons for 7 days -> stage times and lengths at days 1, 2, 4, 7
// conduit: one conduit run (no recording) -> daily metrics
const path = require('path'), fs = require('fs');
const { buildScenario } = require('../engine/scenarios.js');
const [kind, seedS, gapS, graftS] = process.argv.slice(2), seed = +seedS;
const out = { kind, seed, t0: Date.now(), modelRevision:require('../engine/evidence.js').MODEL_REVISION, evidence:'exploratory calibration' };
if (kind === 'dish') {
  const e = buildScenario('dish', { count: 6, seed }); out.days = {};
  for (const d of [1, 2, 4, 7]) { e.step(Math.round((d * 1440 - e.t) / e.p.dt)); out.days[d] = e.stats().neurons; }
  out.msPerStep = (Date.now() - out.t0) / e.steps;
} else {
  const gap = +(gapS || 8), graft = graftS === 'graft', days = graft ? 14 : 30;
  const e = buildScenario('conduit', { gap, graft, seed }); out.gap = gap; out.graft = graft; out.series = [];
  for (let d = 1; d <= days; d++) { e.step(Math.round((d * 1440 - e.t) / e.p.dt)); const s = e.stats(); out.series.push(Object.assign({ cells: s.cells }, s.conduit)); }
  out.msPerStep = (Date.now() - out.t0) / e.steps;
}
out.wall = (Date.now() - out.t0) / 1000;
fs.mkdirSync(path.join(__dirname, 'results'), { recursive: true });
fs.appendFileSync(path.join(__dirname, 'results', 'validate4.jsonl'), JSON.stringify(out) + '\n');
console.log(kind, seed, gapS || '', graftS || '', 'done', out.wall.toFixed(0), 's');
