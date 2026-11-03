/*
 * Record a scenario run for the library: frames every `every` minutes, stats per frame, gzipped.
 * usage: node exp/record.js <id> <scenario> '<opts json>' <hours> <every-min> [outdir]
 */
const zlib = require('zlib'), fs = require('fs'), path = require('path');
const NE = Object.assign({}, require('../engine/scenarios.js'), require('../engine/recorder.js'));
const [id, key, optsJson, hoursS, everyS, outDir = path.join(__dirname, '..', 'runs')] = process.argv.slice(2);
const opts = JSON.parse(optsJson || '{}'), hours = +hoursS, every = +everyS;
const S = NE.SCENARIOS[key], e = NE.buildScenario(key, opts);
const rec = new NE.Recorder(e, { fields: (S.view && S.view.record && S.view.record.fields) || {}, eps: (S.view && S.view.record && S.view.record.eps) || 1.5 });
const series = [], frames = [];
const pick = (s) => {
  const o = { t: +s.t.toFixed(1), cells: s.cells, totalLen: Math.round(s.totalLen) };
  for (const k in e.metricsFns) o[k] = s[k];
  return JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'number' ? +v.toFixed(4) : v)));
};
const H0 = rec.header();
const snap = () => { frames.push(rec.frame()); series.push(pick(e.stats())); };
snap();
const T0 = Date.now(), end = hours * 60;
let next = every;
while (e.t < end - 1e-9) {
  e.step(1);
  if (e.t >= next - 1e-9) { snap(); next += every; }
  if (e.steps % 2000 === 0) process.stderr.write(`\r${id} ${(e.t / 1440).toFixed(2)} d  ${((Date.now() - T0) / 1000).toFixed(0)} s   `);
}
const header = Object.assign(H0, {
  id, scenario: key, opts, label: S.label, group: S.group, dim: S.dim, hours, every, view: S.view, conduit: e.conduit || null,
  series, wall: (Date.now() - T0) / 1000, steps: e.steps, dt: e.p.dt,
});
const packed = NE.packRun(header, frames), gz = zlib.gzipSync(packed, { level: 9 });
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, id + '.bin'), gz);
const fmax = {}; for (const f of e.space.fields) { let m = 0; for (let q = 0; q < f.c.length; q++) if (f.c[q] > m) m = f.c[q]; fmax[f.name] = +m.toFixed(4); }
console.log(`\n${id}: ${frames.length} frames, ${(packed.length / 1e6).toFixed(2)} MB raw, ${(gz.length / 1e6).toFixed(2)} MB gz, ${header.wall.toFixed(0)} s, field max ${JSON.stringify(fmax)}`);
console.log(JSON.stringify(series[series.length - 1]));
