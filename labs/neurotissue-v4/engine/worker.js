/*
 * Worker glue for live runs: builds a scenario, steps it at the requested speed and streams encoded
 * frames (the same format as the recorded library). Every `keyEvery` simulated minutes it also sends a
 * keyframe with fields and a stats row, which the page keeps so a live run can be scrubbed back.
 * main -> worker: load {scenario, opts} · run {on} · speed {minPerSec} · want (ready for a display frame)
 * worker -> main: loaded {header} · key {buf, row} · frame {buf, row} · done
 */
(function () {
  'use strict';
  const NE4 = self.NE4;
  let e = null, rec = null, S = null, running = false, speed = 600, acc = 0, last = 0, want = false, nextKey = 0, keyEvery = 180, endAt = Infinity, nDisp = 0;
  const now = () => (self.performance ? performance.now() : Date.now());
  function row() {
    const s = e.stats(), o = { t: +s.t.toFixed(1), cells: s.cells, totalLen: Math.round(s.totalLen) };
    for (const k in e.metricsFns) o[k] = s[k];
    return JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'number' ? +v.toFixed(4) : v)));
  }
  function sendKey() { const buf = rec.frame(); self.postMessage({ type: 'key', buf, row: row() }, [buf]); }
  function sendFrame() { const buf = rec.frame({ noFields: (nDisp++ % 4) !== 0 }); self.postMessage({ type: 'frame', buf, row: row() }, [buf]); want = false; }
  function tick() {
    if (!e) { setTimeout(tick, 40); return; }
    const t = now(), dtReal = Math.min(0.1, (t - last) / 1000); last = t;
    if (running) {
      acc += speed * dtReal; const t0 = now();
      while (acc >= e.p.dt && now() - t0 < 30 && e.t < endAt) {
        e.step(1); acc -= e.p.dt;
        if (e.t >= nextKey - 1e-9) { sendKey(); nextKey += keyEvery; }
      }
      if (acc > e.p.dt * 20) acc = 0;
      if (e.t >= endAt) { running = false; self.postMessage({ type: 'done', t: e.t }); }
    }
    if (want) sendFrame();
    setTimeout(tick, running ? 0 : 16);
  }
  self.onmessage = (m) => {
    const d = m.data;
    try {
    if (d.type === 'load') {
      S = NE4.SCENARIOS[d.scenario]; e = NE4.buildScenario(d.scenario, d.opts || {});
      const R = (S.view && S.view.record) || {};
      rec = new NE4.Recorder(e, { fields: R.fields || {}, eps: R.eps != null ? R.eps : 1.5 });
      keyEvery = d.keyEvery || R.every || 180; nextKey = keyEvery; endAt = (d.hours || (S.view && S.view.hours) || 720) * 60;
      const header = rec.header({ id: 'live', scenario: d.scenario, opts: d.opts || {}, label: S.label, group: S.group, dim: S.dim, view: S.view, conduit: e.conduit || null, every: keyEvery, dt: e.p.dt, hours: endAt / 60 });
      running = false; acc = 0; last = now();
      self.postMessage({ type: 'loaded', header });
      sendKey(); want = true;
    } else if (d.type === 'run') { running = !!d.on && e && e.t < endAt; last = now(); }
    else if (d.type === 'speed') speed = d.minPerSec;
    else if (d.type === 'want') want = true;
    } catch (error) { running=false; self.postMessage({type:'error',message:error.message}); }
  };
  tick();
})();
