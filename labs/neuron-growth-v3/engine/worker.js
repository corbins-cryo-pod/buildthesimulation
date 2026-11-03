/*
 * Worker glue: runs a NeuriteEngine off the main thread and streams compact snapshots.
 * Protocol (main -> worker): load {scenario, opts} · run {on} · speed {minPerSec} · params {p} · cellsSet {key, value}
 *   frame (ready for the next snapshot) · add {x, y, cellType} · select {id} · metrics {id} · swc {id} · ff {minutes}
 *   cut {id, stump} (transect the cell's axon) · cutAt {x, y, r} (cut whatever neurite passes there)
 * Protocol (worker -> main): loaded {env, meta, params} · frame {snap, stats, sel, spikes} · metrics {...} · swc {text} · ff {done}
 */
(function () {
  'use strict';
  const NE2 = self.NE2;
  let e = null, running = true, speed = 8, acc = 0, last = 0, want = true, sel = -1, busy = false;
  let spikeBuf = [], spikeT0 = 0;
  const now = () => (self.performance ? performance.now() : Date.now());
  function selInfo() {
    const c = sel >= 0 ? e.cells[sel] : null;
    if (!c || !c.alive) return null;
    let axon = 0, dend = 0, minor = 0, waves = 0, prim = 0, br = 0, out = 0, inn = 0;
    for (const id of c.neur) { const nr = e.neurites[id]; if (nr.parent < 0) prim++; else br++; waves += nr.waves.length; if (nr.ident === 2) axon += nr.len; else if (nr.ident === 3) dend += nr.len; else minor += nr.len; }
    for (const b of e.bonds) if (b && b.alive) { if (b.ca === c.id) out++; if (b.cb === c.id) inn++; }
    return { id: c.id, type: c.T.key, label: c.T.label, glia: c.T.glia, stage: c.stage, stageT: c.stageT, born: c.born, age: c.age, axon, dend, minor, waves, prim, br, out, inn,
      Q: c.Q / c.T.somaCap, troph: c.troph, switches: c.switches, lesions: c.lesions, rate: c.rate, msp: c.msp, migrating: c.migrating, dying: c.dying, mitosis: c.mitosis, a: c.a, h: c.h, theta: c.theta, z: c.z, R0: c.R0, Rcap: c.Rcap, rOut: c.rOut };
  }
  function sendFrame() {
    const snap = e.snapshot();
    const sp = new Float32Array(spikeBuf); spikeBuf = [];
    self.postMessage({ type: 'frame', snap, stats: e.stats(), sel: selInfo(), spikes: sp, spikeT0, window: e.p.ephysWindow }, e.transferables(snap).concat([sp.buffer]));
    want = false;
  }
  function stepOnce() {
    e.step();
    const A = e.activity;
    if (A.nSpikes && spikeBuf.length < 60000) { for (let s = 0; s < A.nSpikes; s++) spikeBuf.push(A.spikeCell[s], spikeT0 + A.spikeT[s]); }
    if (e.p.activity && A.activeCount) spikeT0 += e.p.ephysWindow;
  }
  function tick() {
    if (!e) { setTimeout(tick, 30); return; }
    const t = now(); const dtReal = Math.min(0.1, (t - last) / 1000); last = t;
    if (running && !busy) {
      acc += speed * dtReal;
      const t0 = now();
      while (acc >= e.p.dt && now() - t0 < 14) { stepOnce(); acc -= e.p.dt; }
      if (acc > e.p.dt * 8) acc = 0;
    }
    if (want) sendFrame();
    setTimeout(tick, running || busy ? 2 : 32);
  }
  self.onmessage = (m) => {
    const d = m.data;
    switch (d.type) {
      case 'load': {
        e = NE2.buildScenario(d.scenario, d.opts || {});
        const S = NE2.SCENARIOS[d.scenario];
        sel = -1; acc = 0; spikeBuf = []; spikeT0 = 0;
        self.postMessage({ type: 'loaded', scenario: d.scenario, env: e.env.describe(), params: e.p, labels: e.labels || [], W: e.W, H: e.H, view: S.view });
        want = true; break;
      }
      case 'run': running = !!d.on; break;
      case 'speed': speed = d.minPerSec; break;
      case 'params': if (e) e.setParams(d.p); break;
      case 'cellsSet': if (e) for (const c of e.cells) if (c.alive && !c.T.glia) c[d.key] = d.value; break;
      case 'frame': want = true; break;
      case 'add': if (e) { const c = e.addCell(d.x, d.y, { type: d.cellType, z: 40, migrating: false }); sel = c.id; } break;
      case 'select': sel = d.id; break;
      case 'cut': if (e && e.cells[d.id] && e.cells[d.id].alive && e.cells[d.id].axonId >= 0) e.transect(e.cells[d.id].axonId, d.stump || 10); want = true; break;
      case 'cutAt': if (e) { const nr = e.cutAt(d.x, d.y, d.r || 4); if (nr) sel = nr.cell; } want = true; break;
      case 'metrics': if (e && e.cells[d.id] && e.cells[d.id].alive) self.postMessage({ type: 'metrics', cell: e.metrics(e.cells[d.id]), pop: e.population(), timing: NE2.Morpho.stageTiming(e) }); break;
      case 'swc': if (e && e.cells[d.id] && e.cells[d.id].alive) self.postMessage({ type: 'swc', id: d.id, text: e.swc(e.cells[d.id]) }); break;
      case 'ff': {
        if (!e) break; busy = true;
        const eng = e, target = e.t + d.minutes; const chunk = () => {
          if (e !== eng) { busy = false; self.postMessage({ type: 'ff', progress: 1, done: true }); return; }   // a new scenario was loaded
          const t0 = now(); while (e.t < target && now() - t0 < 60) stepOnce();
          spikeBuf = spikeBuf.slice(-20000);
          if (e.t < target) { self.postMessage({ type: 'ff', progress: 1 - (target - e.t) / d.minutes }); sendFrame(); setTimeout(chunk, 0); }
          else { busy = false; self.postMessage({ type: 'ff', progress: 1, done: true }); want = true; }
        };
        chunk(); break;
      }
    }
  };
  last = now(); tick();
})();
