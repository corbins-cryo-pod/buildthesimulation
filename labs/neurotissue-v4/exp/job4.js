// Run one v4 job (JSON in argv[2]); prints one JSON line.
const path = require('path');
const { buildScenario } = require(path.join(__dirname, '../engine/scenarios.js'));
const job = JSON.parse(process.argv[2]); const t0 = Date.now();
const out = { id: job.id, job };
const e = buildScenario(job.key, Object.assign({ seed: job.seed }, job.opts || {}));
const every = (job.sampleEveryH || 24) * 60, total = job.hours * 60;
out.series = [];
const sample = () => {
  const s = e.stats(); const row = { h: +(e.t / 60).toFixed(2), cells: s.cells, nodes: s.nodes, neurites: s.neurites };
  if (s.conduit) Object.assign(row, s.conduit);
  if (s.neuriteLen != null) row.neuriteLen = +s.neuriteLen.toFixed(1);
  if (job.key === 'dish') { const c = e.cells[0]; const m = e.cellMetrics(c); Object.assign(row, { axon: +m.axon.toFixed(1), dend: +m.dend.toFixed(1), minor: +m.minor.toFixed(1), bp: m.bp, prim: m.prim, Q: +m.Q.toFixed(3), stage: m.stage, primL: m.primL }); }
  out.series.push(row);
};
for (let t = every; t <= total + 1e-6; t += every) { e.step(Math.round(every / e.p.dt)); sample(); }
if (job.key === 'dish') { const c = e.cells[0]; out.stageT = c.stageT.map((x) => (x < 0 ? null : +(x / 60).toFixed(2))); out.decided = c.axonDecided < 0 ? null : +(c.axonDecided / 60).toFixed(2); }
out.msPerStep = (Date.now() - t0) / e.steps; out.wallS = (Date.now() - t0) / 1000;
process.stdout.write(JSON.stringify(out) + '\n');
