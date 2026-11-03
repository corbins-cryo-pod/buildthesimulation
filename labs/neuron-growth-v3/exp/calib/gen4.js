const fs = require('fs'); const jobs = []; let n = 0;
for (const axs of [0.18, 0.24]) for (const ds of [0.06, 0.1]) {
  const g = { axon: { speed: axs }, dendrite: { speed: ds } }, id = 'r' + (n++);
  for (let seed = 1; seed <= 4; seed++) jobs.push({ id: `cal4_${id}_s${seed}`, kind: 'single', type: 'hippocampal', genome: g, seed, days: 7, sampleEveryH: 12 });
}
fs.writeFileSync(__dirname + '/q4.json', JSON.stringify(jobs)); console.log(jobs.length);
