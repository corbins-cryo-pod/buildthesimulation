// Screen 2: timing + axon pace. Hippocampal with stage-4 rule on; 4 days, 4 seeds.
const fs = require('fs'); const jobs = [];
let n = 0;
for (const production of [0.7, 0.9]) for (const axs of [0.6, 1.0]) for (const feedback of [0.6, 1]) for (const pb of [0.6, 1]) {
  const g = { production, axon: { speed: axs }, minor: { speed: 0.9 }, axonHold: 90, feedback, promoterBack: pb, dendTransport: 1.0, dendriteDelay: 1440, dendriteAxonLen: 150 };
  const id = 'k' + (n++);
  for (let seed = 1; seed <= 4; seed++) jobs.push({ id: `cal2_${id}_s${seed}`, kind: 'single', type: 'hippocampal', genome: g, seed, days: 4, sampleEveryH: 12 });
}
fs.writeFileSync(__dirname + '/q2.json', JSON.stringify(jobs)); console.log(jobs.length);
