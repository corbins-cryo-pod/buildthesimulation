// Run one experiment job (JSON in argv[2]) and print one JSON line with the result.
const L = require('./lib.js');
const job = JSON.parse(process.argv[2]);
const t0 = Date.now();
const out = { id: job.id, job };

function runSingle() {
  const { e, c } = L.singleEngine(job);
  const every = (job.sampleEveryH || 12) * 60, total = job.days * 1440;
  out.samples = [];
  for (let t = every; t <= total + 1e-6; t += every) { e.step(L.stepsFor(e, every)); out.samples.push(L.sample(e, c)); }
  out.stageT = c.stageT.map((x) => (x < 0 ? null : +(x / 60).toFixed(2)));
  out.extra = { decided: c.axonDecided < 0 ? null : +(c.axonDecided / 60).toFixed(2), switches: c.switches, stage1T: +(c.stage1T / 60).toFixed(2) };
  out.msPerStep = (Date.now() - t0) / e.steps;
  out.wallS = (Date.now() - t0) / 1000;
}

// Axon transection: grow until the axon has existed for `after` h, cut it, follow for `post` h.
function runCut() {
  const { e, c } = L.singleEngine(job);
  const poll = 30;
  while (c.stageT[3] < 0 && e.t < 6 * 1440) e.step(L.stepsFor(e, poll));
  if (c.stageT[3] < 0) { out.error = 'no axon by day 6'; return; }
  e.step(L.stepsFor(e, (job.after || 12) * 60));
  const ax = e.neurites[c.axonId];
  if (!ax || !ax.alive) { out.error = 'axon lost before cut'; return; }
  out.cutAtH = +(e.t / 60).toFixed(2);
  out.before = L.sample(e, c);
  out.cutId = ax.id;
  const ok = L.cut(e, ax, job.stump, job.mode);
  if (!ok) { out.error = 'axon shorter than stump'; return; }
  e.step(1);
  out.afterCut = L.sample(e, c);
  out.track = [];
  let respec = null;
  for (let t = poll; t <= job.post * 60; t += poll) {
    e.step(L.stepsFor(e, poll));
    if (respec == null && c.axonId >= 0 && (job.mode !== 'keep' || c.axonId !== out.cutId)) respec = { h: +((t) / 60).toFixed(2), id: c.axonId };
    if (t % 360 === 0) { const s = L.sample(e, c); out.track.push({ t: s.t, axonId: c.axonId, prim: s.prim }); }
  }
  out.respec = respec;
  out.end = L.sample(e, c);
  out.axonIdEnd = c.axonId;
  out.sameAxon = c.axonId === out.cutId;
  out.switches = c.switches;
}

function runScenario() {
  const e = L.buildScenario(job.key, Object.assign({ seed: job.seed }, job.opts || {}));
  if (job.params) e.setParams(job.params);
  const every = (job.sampleEveryH || 6) * 60, total = job.hours * 60;
  out.series = [];
  for (let t = every; t <= total + 1e-6; t += every) {
    e.step(L.stepsFor(e, every));
    const s = e.stats(), p = e.population();
    out.series.push({ h: +(e.t / 60).toFixed(2), neurons: s.neurons, glia: s.glia, deaths: s.deaths, synapses: s.synapses, axons: s.axons,
      meanRate: +s.meanRate.toFixed(3), bursts: s.bursts, largestCluster: s.largestCluster, meanDegree: +p.meanDegree.toFixed(3),
      meanAxon: +p.meanAxon.toFixed(1), meanDendrite: +p.meanDendrite.toFixed(1), meanWeight: +p.meanWeight.toFixed(3), stages: s.stages });
  }
  out.msPerStep = (Date.now() - t0) / e.steps;
  out.measure = measures[job.key] ? measures[job.key](e) : null;
}

const measures = {
  stripes(e) {
    const env = e.env, N = e.N;
    let lam = 0, all = 0; for (let q = 0; q < env.coat.length; q++) { all++; if (env.coat[q] === 2) lam++; }
    const frac = (ident) => { let on = 0, n = 0; for (const nr of e.neurites) if (nr && nr.alive && (ident == null || nr.ident === ident)) for (const i of nr.nodes) { n++; if (env.coat[env.id(N.x[i], N.y[i])] === 2) on++; } return n ? on / n : null; };
    let somaOn = 0, cells = 0; for (const c of e.cells) if (c.alive) { cells++; if (env.coat[env.id(N.x[c.nuc], N.y[c.nuc])] === 2) somaOn++; }
    return { areaLaminin: lam / all, axonOnLaminin: frac(2), allOnLaminin: frac(null), somaOnLaminin: somaOn / cells };
  },
  turning(e) {
    const N = e.N, sx = L.TURN_SRC[0], sy = L.TURN_SRC[1], cells = [];
    for (const c of e.cells) {
      if (!c.alive) continue;
      let best = null, bl = 0;
      for (const id of c.neur) { const nr = e.neurites[id]; if (nr.parent < 0 && nr.len > bl) { bl = nr.len; best = nr; } }
      if (!best) continue;
      const tip = best.nodes[best.nodes.length - 1], x0 = N.x[c.nuc], y0 = N.y[c.nuc];
      const vx = N.x[tip] - x0, vy = N.y[tip] - y0, bx = sx - x0, by = sy - y0;
      // angle of the tip's last 30 µm relative to the bearing to the source
      let k = best.nodes.length - 1, back = best.nodes[k]; let s = 0;
      while (k > 0 && s < 30) { const a = best.nodes[k - 1]; s += Math.hypot(N.x[back] - N.x[a], N.y[back] - N.y[a]); back = a; k--; }
      const hx = N.x[tip] - N.x[back], hy = N.y[tip] - N.y[back];
      const ang = (ux, uy, wx, wy) => Math.atan2(ux * wy - uy * wx, ux * wx + uy * wy) * 180 / Math.PI;
      const tb = Math.hypot(N.x[tip] - sx, N.y[tip] - sy);
      cells.push({ id: c.id, ident: best.ident, len: +bl.toFixed(1), y0: +y0.toFixed(1), tipX: +N.x[tip].toFixed(1), tipY: +N.y[tip].toFixed(1),
        startDist: +Math.hypot(bx, by).toFixed(1), tipDist: +tb.toFixed(1),
        bearingAngle: +ang(bx, by, vx, vy).toFixed(1), headingVsSource: +ang(sx - N.x[back], sy - N.y[back], hx, hy).toFixed(1),
        // signed turn from the initial heading (+x): positive = toward the source side
        srcBearing: +(Math.atan2(by, bx) * 180 / Math.PI).toFixed(1),
        turnToward: +(Math.sign(Math.atan2(by, bx)) * Math.atan2(vy, vx) * 180 / Math.PI).toFixed(1),
        tipTurnToward: +(Math.sign(Math.atan2(by, bx)) * Math.atan2(hy, hx) * 180 / Math.PI).toFixed(1) });
    }
    return { cells };
  },
  glia(e) {
    const W = e.env.W || 1000; let L0 = 0, R0 = 0, Ls = 0, Rs = 0;
    for (const c of e.cells) { if (c.T.glia) continue; const left = c.x < W / 2; if (left) { L0++; if (c.alive && c.dying < 0) Ls++; } else { R0++; if (c.alive && c.dying < 0) Rs++; } }
    return { leftPlated: L0, leftAlive: Ls, rightPlated: R0, rightAlive: Rs };
  },
};

function runPerf() {
  const e = L.buildScenario(job.key, { seed: job.seed || 7, count: job.count });
  e.step(L.stepsFor(e, (job.warmH || 12) * 60));
  const s0 = e.steps, ta = Date.now();
  e.step(job.steps || 1500);
  out.msPerStep = (Date.now() - ta) / (e.steps - s0);
  const s = e.stats();
  out.nodes = s.nodes; out.cells = s.cells; out.neurites = s.neurites; out.probes = s.probes; out.dt = e.p.dt;
  out.simMinPerSec = e.p.dt * 1000 / out.msPerStep;
}

// fixed-area density culture with low serum: survival, wiring and growth vs plating density
function runDensity() {
  const S = job.side || 1200, env = new L.Environment(S, S, { coat: 2 });
  const e = new L.NeuriteEngine({ env, seed: job.seed * 104729, params: Object.assign({ dt: 0.08, serum: job.serum != null ? job.serum : 0.15, seek: 0.8, activity: false, apoptosis: true }, job.params || {}) });
  for (let k = 0; k < job.count; k++) e.addCell(40 + e.rand() * (S - 80), 40 + e.rand() * (S - 80), { type: 'ipsc', z: 10 + e.rand() * 80, migrating: false });
  const every = 6 * 60; out.series = [];
  for (let t = every; t <= job.hours * 60 + 1e-6; t += every) {
    e.step(L.stepsFor(e, every));
    const s = e.stats(), p = e.population();
    let alive = 0; for (const c of e.cells) if (c.alive && !c.T.glia && c.dying < 0) alive++;
    out.series.push({ h: +(e.t / 60).toFixed(1), alive, deaths: s.deaths, synapses: s.synapses, meanDegree: +p.meanDegree.toFixed(2), largestCluster: s.largestCluster, meanAxon: +p.meanAxon.toFixed(1), meanTroph: +(e.cells.filter((c) => c.alive && !c.T.glia).reduce((a, c) => a + c.troph, 0) / Math.max(1, alive)).toFixed(3) });
  }
  out.msPerStep = (Date.now() - t0) / e.steps;
}

({ single: runSingle, cut: runCut, scenario: runScenario, perf: runPerf, density: runDensity })[job.kind]();
out.wallS = +((Date.now() - t0) / 1000).toFixed(1);
process.stdout.write(JSON.stringify(out) + '\n');
