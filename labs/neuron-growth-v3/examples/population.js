// Run a scenario headless and save stats + morphologies.
//   node examples/population.js [scenario] [hours] [count]
//   node examples/population.js population 12 200
// Prints culture stats every simulated hour; writes snapshot.json (cells, neurites, synapses)
// and one SWC file per neuron into ./swc/.
const fs = require('fs');
const path = require('path');
const { buildScenario } = require('../engine/presets.js');

const key = process.argv[2] || 'population', hours = +(process.argv[3] || 12), count = +(process.argv[4] || 0) || undefined;
const e = buildScenario(key, { seed: 42, count });
const t0 = Date.now();
for (let h = 1; h <= hours; h++) {
  e.step(Math.round(60 / e.p.dt));
  const s = e.stats();
  console.log(`${h} h  cells ${s.neurons}+${s.glia}g  neurites ${s.neurites}  axons ${s.axons}  synapses ${s.synapses}  deaths ${s.deaths}  rate ${s.meanRate.toFixed(2)} Hz  (${((Date.now() - t0) / e.steps).toFixed(2)} ms/step)`);
}
const pop = e.population();
console.log('population metrics', JSON.stringify(pop));

const N = e.N, pt = (i) => [+N.x[i].toFixed(2), +N.y[i].toFixed(2)];
const IDN = ['none', 'minor', 'axon', 'dendrite'];
const cells = e.cells.filter((c) => c.alive).map((c) => ({
  id: c.id, type: c.T.key, stage: c.stage, nucleus: pt(c.nuc), contactRadius: c.a, height: c.h, outline: [...c.ring].map(pt),
  neurites: c.neur.map((id) => { const nr = e.neurites[id]; return { parent: nr.parent, identity: IDN[nr.ident], state: ['growing', 'retracting', 'connected'][nr.state], path: [nr.base, ...nr.nodes].map(pt) }; }),
}));
const synapses = e.bonds.filter((b) => b && b.alive).map((b) => ({ from: b.ca, to: b.cb, weight: b.w, inhibitory: b.inhib, at: pt(b.a) }));
fs.writeFileSync('snapshot.json', JSON.stringify({ t: e.t, width: e.W, height: e.H, cells, synapses }));
fs.mkdirSync('swc', { recursive: true });
for (const c of e.cells) if (c.alive && !c.T.glia) fs.writeFileSync(path.join('swc', `cell${c.id}_${c.T.key}.swc`), e.swc(c));
console.log('wrote snapshot.json and swc/');
