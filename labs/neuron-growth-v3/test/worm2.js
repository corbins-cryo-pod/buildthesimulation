const { buildScenario } = require('../engine/presets.js');
const e = buildScenario('worm', process.argv[2] ? { params: JSON.parse(process.argv[2]) } : {});
const c = e.cells[0]; const x0 = c.x; let line = '';
for (let m = 0; m <= 300; m += 10) { while (e.t < m + 20) e.step(); const nr = c.neur.map((id) => e.neurites[id])[0];
  line += `${m}:${(c.x - x0).toFixed(0)}/${nr ? nr.len.toFixed(0) + ':' + nr.adv.toFixed(2) + ':' + nr.S.toFixed(1) + ':' + (nr.T/6).toFixed(2) + ':' + nr.stuck : '-'} `; }
console.log(line); console.log('speed µm/h', ((c.x - x0) / 5).toFixed(1), 'Q', c.Q.toFixed(1), 'migrating', c.migrating, 'stage', c.stage);
