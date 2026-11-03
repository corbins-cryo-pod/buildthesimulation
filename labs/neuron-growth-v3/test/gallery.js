const { NeuriteEngine, Environment } = require('../engine/core.js'); const snap = require('./snap2.js');
const types = (process.argv[2] || 'pyramidal,purkinje,granule,rgc,drg,da,interneuron,astrocyte').split(','), hours = +(process.argv[3] || 36);
const S = '/tmp/claude-0/-home-claude/851a9dde-cdc8-5a51-878e-ae5ccd715fd8/scratchpad/';
const cols = 4, cw = 420, ch = 420;
const env = new Environment(cols * cw, Math.ceil(types.length / cols) * ch);
const e = new NeuriteEngine({ env, seed: 5, params: { activity: false, seek: 0 } });
types.forEach((t, k) => e.addCell((k % cols + 0.5) * cw, (Math.floor(k / cols) + 0.5) * ch, { type: t, spread: true }));
const t0 = Date.now(); e.step(Math.round(hours * 60 / e.p.dt));
console.log('ms/step', ((Date.now() - t0) / e.steps).toFixed(3));
for (const c of e.cells) { if (!c.alive) { console.log('dead'); continue; } const m = e.metrics(c); console.log(c.T.key.padEnd(12), 'stage', c.stage, 'axon', m.axonLength.toFixed(0), 'dend', m.dendriteLength.toFixed(0), 'minor', m.minorLength.toFixed(0), 'bp', m.branchPoints, 'tips', m.tips, 'order', m.maxOrder); }
snap(e, S + 'gallery.svg', null, types.join(' '));
