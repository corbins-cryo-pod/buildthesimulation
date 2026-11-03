// Generate the job queues for the experiment suite.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'queues'); fs.mkdirSync(dir, { recursive: true });
const A = [], B = [];

// E1 · variability: 20 hippocampal seeds, 7 days, baseline parameters
for (let s = 1; s <= 20; s++) A.push({ id: `e1_s${s}`, kind: 'single', type: 'hippocampal', seed: s, days: 7, sampleEveryH: 12 });

// E2 · axon transection 12 h after specification; stump shorter (10 µm) or longer (60 µm) than the minor neurites
for (let s = 1; s <= 6; s++) for (const stump of [10, 60]) for (const mode of ['keep', 'reset'])
  A.push({ id: `e2_s${s}_${stump}_${mode}`, kind: 'cut', type: 'hippocampal', seed: s, stump, mode, after: 12, post: 48 });

// E3 · polarity sweeps (4 days, seeds 1-4; baseline comes from E1 at day 4)
const sweeps = { supply: [0.5, 0.75, 1.5, 2], tubActive: [0.15, 0.3, 0.9, 1.35], polarity: [0, 0.25, 1.5, 3], promoterBack: [0.25, 4] };
for (const k in sweeps) for (const v of sweeps[k]) for (let s = 1; s <= 4; s++)
  A.push({ id: `e3_${k}_${v}_s${s}`, kind: 'single', type: 'hippocampal', seed: s, days: 4, sampleEveryH: 12, params: { [k]: v } });

// E4 · substrate: uniform stiffness under laminin (DRG 2 d, hippocampal 3 d), stripes, turning
for (const k of [0.1, 0.3, 1, 3, 10, 30, 100, 1e6]) for (let s = 1; s <= 4; s++)
  B.push({ id: `e4_drg_${k}_s${s}`, kind: 'single', type: 'drg', seed: s, days: 2, sampleEveryH: 12, W: 3000, env: { coat: 2, stiffness: k }, params: { seek: 0, apoptosis: false } });
for (const k of [0.1, 1, 10, 100, 1e6]) for (let s = 1; s <= 3; s++)
  B.push({ id: `e4_hip_${k}_s${s}`, kind: 'single', type: 'hippocampal', seed: s, days: 3, sampleEveryH: 12, env: { coat: 2, stiffness: k }, params: { seek: 0, apoptosis: false } });
for (let s = 1; s <= 3; s++) B.push({ id: `e4_stripes_s${s}`, kind: 'scenario', key: 'stripes', seed: s, hours: 36, sampleEveryH: 12 });
for (let s = 1; s <= 3; s++) {
  B.push({ id: `e4_turn_camp1_s${s}`, kind: 'scenario', key: 'turning', seed: s, hours: 36, sampleEveryH: 12, opts: { cAMP: 1 } });
  B.push({ id: `e4_turn_camp0_s${s}`, kind: 'scenario', key: 'turning', seed: s, hours: 36, sampleEveryH: 12, opts: { cAMP: 0 } });
  B.push({ id: `e4_turn_nocue_s${s}`, kind: 'scenario', key: 'turning', seed: s, hours: 36, sampleEveryH: 12, opts: { cAMP: 1 }, params: { fieldGain: 0 } });
}

// E5 · populations: plating density at fixed area in low serum; glia feeder; activity with and without structural plasticity
for (const n of [15, 30, 60, 120]) for (let s = 1; s <= 2; s++) B.push({ id: `e5_dens_${n}_s${s}`, kind: 'density', count: n, seed: s, hours: 96 });
for (let s = 1; s <= 3; s++) B.push({ id: `e5_glia_s${s}`, kind: 'scenario', key: 'glia', seed: s, hours: 72, sampleEveryH: 12 });
for (let s = 1; s <= 2; s++) for (const msp of [1, 0])
  B.push({ id: `e5_act_msp${msp}_s${s}`, kind: 'scenario', key: 'activity', seed: s, hours: 60, sampleEveryH: 6, params: { msp } });

// E7 · time step: hippocampal 5 days at dt 0.025, 0.1, 0.2 (0.05 = E1)
for (const dt of [0.025, 0.1, 0.2]) for (let s = 1; s <= 4; s++)
  B.push({ id: `e7_dt${dt}_s${s}`, kind: 'single', type: 'hippocampal', seed: s, days: 5, sampleEveryH: 12, params: { dt } });

fs.writeFileSync(path.join(dir, 'qA.json'), JSON.stringify(A));
fs.writeFileSync(path.join(dir, 'qB.json'), JSON.stringify(B));
console.log('qA', A.length, 'qB', B.length);
