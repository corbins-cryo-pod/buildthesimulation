// Screening sweep for hippocampal axon timing (3 days, 4 seeds per config).
const fs = require('fs');
let s = 12345; const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const jobs = [], cfgs = [{ id: 'base', genome: {} }];
for (let k = 0; k < 39; k++) {
  const g = { production: pick([0.5, 0.65, 0.8]), feedback: pick([0.5, 1, 1.6]), promoterBack: pick([0.3, 0.6, 1]), axonHold: pick([90, 150]), minor: { speed: pick([0.55, 0.9]) } };
  cfgs.push({ id: 'c' + k, genome: g });
}
for (const c of cfgs) for (let seed = 1; seed <= 4; seed++) jobs.push({ id: `cal1_${c.id}_s${seed}`, kind: 'single', type: 'hippocampal', genome: c.genome, seed, days: 3, sampleEveryH: 12 });
fs.writeFileSync(__dirname + '/q1.json', JSON.stringify(jobs));
console.log(jobs.length, 'jobs');
