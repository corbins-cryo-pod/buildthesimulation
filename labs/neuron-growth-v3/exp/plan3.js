// v3 validation suite: the v2 experiments that test the issues v3 fixes, same seeds and settings.
//   node exp/plan3.js  ->  exp/queues/v3a.json (single cells) and v3b.json (scenarios and populations)
const fs = require('fs');
const A = [], B = [];
// V1 · variability and calibration: 20 hippocampal seeds, 7 days (compare v2 E1)
for (let s = 1; s <= 20; s++) A.push({ id: `v1_s${s}`, kind: 'single', type: 'hippocampal', seed: s, days: 7, sampleEveryH: 12 });
// V2 · transection 12 h after the axon is chosen, stump 10 or 60 µm, label kept (engine rule only) or cleared (engine default)
// (the v3 axon is slower, so 60 µm stumps are cut 36 h after the axon is chosen; 10 µm stumps at 12 h as in v2)
for (let s = 1; s <= 6; s++) for (const stump of [10, 60]) for (const mode of ['keep', 'reset'])
  A.push({ id: `v2_s${s}_${stump}_${mode}`, kind: 'cut', type: 'hippocampal', seed: s, stump, mode, after: stump === 60 ? 36 : 12, post: 48 });
// V7 · time step: hippocampal 5 days at dt 0.025, 0.1, 0.2 (0.05 = V1 seeds 1-4)
for (const dt of [0.025, 0.1, 0.2]) for (let s = 1; s <= 4; s++)
  A.push({ id: `v7_dt${dt}_s${s}`, kind: 'single', type: 'hippocampal', seed: s, days: 5, sampleEveryH: 12, params: { dt } });
// V4 · stiffness: DRG on uniform laminin gels (2 days), hippocampal (3 days)
for (const k of [0.1, 0.3, 1, 3, 10, 100, 1e6]) for (let s = 1; s <= 3; s++)
  B.push({ id: `v4_drg_${k}_s${s}`, kind: 'single', type: 'drg', seed: s, days: 2, sampleEveryH: 12, W: 3000, env: { coat: 2, stiffness: k }, params: { seek: 0, apoptosis: false } });
for (const k of [0.1, 1, 10, 100, 1e6]) for (let s = 1; s <= 3; s++)
  B.push({ id: `v4_hip_${k}_s${s}`, kind: 'single', type: 'hippocampal', seed: s, days: 3, sampleEveryH: 12, env: { coat: 2, stiffness: k }, params: { seek: 0, apoptosis: false } });
// V4 · turning assay with the pipette ~45° off the initial heading; 6 seeds x 3 conditions, 36 h
for (let s = 1; s <= 6; s++) {
  B.push({ id: `v4_turn_camp1_s${s}`, kind: 'scenario', key: 'turning', seed: s, hours: 36, sampleEveryH: 12, opts: { cAMP: 1 } });
  B.push({ id: `v4_turn_camp0_s${s}`, kind: 'scenario', key: 'turning', seed: s, hours: 36, sampleEveryH: 12, opts: { cAMP: 0 } });
  B.push({ id: `v4_turn_nocue_s${s}`, kind: 'scenario', key: 'turning', seed: s, hours: 36, sampleEveryH: 12, opts: { cAMP: 1 }, params: { fieldGain: 0 } });
}
// V5 · populations: density in low serum (hazard death), glia halves (10 seeds), feeder layer
for (const n of [15, 30, 60]) for (let s = 1; s <= 2; s++) B.push({ id: `v5_dens_${n}_s${s}`, kind: 'density', count: n, seed: s, hours: 96 });
for (let s = 1; s <= 10; s++) B.push({ id: `v5_glia_s${s}`, kind: 'scenario', key: 'glia', seed: s, hours: 72, sampleEveryH: 6 });
for (const feeder of [0, 0.3]) for (let s = 1; s <= 2; s++) B.push({ id: `v5_feed${feeder}_s${s}`, kind: 'density', count: 30, seed: s, hours: 96, params: { feeder } });
// performance by cell count (population scenario, constant density)
for (const n of [25, 50, 100, 200, 400]) B.push({ id: `perf_pop_${n}`, kind: 'perf', key: 'population', count: n, seed: 7, warmH: 12, steps: 1500 });
fs.mkdirSync(__dirname + '/queues', { recursive: true });
fs.writeFileSync(__dirname + '/queues/v3a.json', JSON.stringify(A));
fs.writeFileSync(__dirname + '/queues/v3b.json', JSON.stringify(B));
console.log('v3a', A.length, 'v3b', B.length);
