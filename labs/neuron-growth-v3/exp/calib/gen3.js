// Screen 3: growth pace after polarity (7 days). Hippocampal genome as in celltypes.js, varying axon and dendrite pace.
const fs = require('fs'); const jobs = []; let n = 0;
for (const axs of [0.25, 0.35, 0.5]) for (const ds of [0.08, 0.15, 0.3]) {
  const g = { axon: { speed: axs }, dendrite: { speed: ds } }, id = 'm' + (n++);
  for (let seed = 1; seed <= 4; seed++) jobs.push({ id: `cal3_${id}_s${seed}`, kind: 'single', type: 'hippocampal', genome: g, seed, days: 7, sampleEveryH: 12 });
}
fs.writeFileSync(__dirname + '/q3.json', JSON.stringify(jobs)); console.log(jobs.length);
