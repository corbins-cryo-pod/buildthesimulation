const { NeuriteEngine, Environment } = require('../engine/core.js'); require('../engine/presets.js');
const env = new Environment(200, 760);
env.addFiber([[100, 720], [100, 30]], { width: 5 });
env.addZone({ key: 'stop', x0: 0, x1: 200, y0: 0, y1: 120 });
const e = new NeuriteEngine({ env, seed: 2, params: { activity: false, seek: 0, apoptosis: false } });
const c = e.addCell(100, 700, { type: 'radialMigrant', spread: true });
for (let m = 0; m <= 600; m += 30) { while (e.t < m) e.step(); const nr = c.neur.map((id) => e.neurites[id])[0];
  console.log(m, 'Q', c.Q.toFixed(1), 'y', c.y.toFixed(0), 'mig', c.migrating, 'pulse', c.pulse.toFixed(2), nr ? `lead len ${nr.len.toFixed(0)} hy ${nr.hy.toFixed(2)} adv ${nr.adv.toFixed(2)} T ${(nr.T/6).toFixed(2)} S ${nr.S.toFixed(2)} st ${nr.state} ident ${nr.ident}` : '', 'nprim', c.nPrim); }
