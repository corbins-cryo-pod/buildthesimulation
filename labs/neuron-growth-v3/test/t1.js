// single hippocampal neuron, multi-day: stage timing + lengths
const NE2 = require('../engine/core.js'); const { NeuriteEngine, Environment } = NE2;
const type = process.argv[2] || 'hippocampal', days = +(process.argv[3] || 4), seed = +(process.argv[4] || 1);
const env = new Environment(1400, 1400);
const e = new NeuriteEngine({ env, seed, params: { activity: false } });
const c = e.addCell(700, 700, { type, spread: true });
const t0 = Date.now(); const spd = 1 / e.p.dt;
for (let h = 0; h <= days * 24; h += 6) {
  while (e.t < h * 60) e.step();
  const ns = c.neur.map((id) => e.neurites[id]);
  const prim = ns.filter((n) => n.parent < 0);
  const desc = prim.map((n) => `${'-mad'[n.ident]}${n.len.toFixed(0)}${'gr*'[n.state]}`).join(' ');
  const m = e.metrics(c);
  console.log(`${(h/24).toFixed(2)}d st${c.stage} Q=${c.Q.toFixed(1)} tot=${c.totalLen.toFixed(0)} ax=${m.axonLength.toFixed(0)} den=${m.dendriteLength.toFixed(0)} min=${m.minorLength.toFixed(0)} bp=${m.branchPoints} tips=${m.tips} | ${desc}`);
}
console.log('stageT (h):', c.stageT.map((x) => x < 0 ? '-' : (x / 60).toFixed(1)).join(' '), ' ms/step', ((Date.now() - t0) / e.steps).toFixed(3));
