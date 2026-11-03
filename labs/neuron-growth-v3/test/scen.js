const { buildScenario } = require('../engine/presets.js'); const snap = require('./snap2.js');
const key = process.argv[2], hours = +(process.argv[3] || 6), extra = process.argv[4] ? JSON.parse(process.argv[4]) : {};
const S = '/tmp/claude-0/-home-claude/851a9dde-cdc8-5a51-878e-ae5ccd715fd8/scratchpad/';
const e = buildScenario(key, extra);
const t0 = Date.now(), s0 = e.steps; const target = e.t + hours * 60; let lastLog = e.t;
while (e.t < target) { e.step(); if (e.t - lastLog >= hours * 60 / 4) { lastLog = e.t; const s = e.stats(); console.log(`t=${(e.t / 60).toFixed(1)}h cells=${s.cells}(glia ${s.glia}) neur=${s.neurites} axons=${s.axons} syn=${s.synapses} deaths=${s.deaths} div=${s.divisions} stages=${s.stages.join(',')} rate=${s.meanRate.toFixed(2)} active=${s.active} bursts=${s.bursts} nodes=${s.nodes}`); } }
console.log('ms/step', ((Date.now() - t0) / (e.steps - s0)).toFixed(3));
snap(e, S + 'sc_' + key + '.svg', null, key);
