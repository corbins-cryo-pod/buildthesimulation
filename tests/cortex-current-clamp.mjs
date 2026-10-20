import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SOMA_AREA_UM2,
  IV_AMPLITUDES_NA,
  FI_AMPLITUDES_NA,
  runCurrentClamp,
  ivSweep,
  fiSweep,
} from '../src/lib/cortex/current-clamp.js';

const fit = JSON.parse(
  readFileSync('public/models/cortex/allen571654895/optim_param_571654895.json', 'utf8'),
);

test('single compartment idles at a stable hyperpolarized rest with no drive', () => {
  const r = runCurrentClamp(fit, { injectionNa: 0 });
  assert.ok(r.restMv > -92 && r.restMv < -89, `rest ${r.restMv}`);
  assert.ok(Math.abs(r.stepEndMeanMv - r.restMv) < 0.2, 'drift under zero drive');
  assert.equal(r.spikeCount, 0);
  assert.equal(r.countRateHz, 0);
  assert.equal(r.latencyMs, null);
});

test('hyperpolarizing step stays subthreshold and matches ohmic input resistance', () => {
  const r = runCurrentClamp(fit, { injectionNa: -0.05 });
  assert.equal(r.spikeCount, 0);
  const deltaMv = r.stepEndMeanMv - r.restMv;
  assert.ok(deltaMv > -70 && deltaMv < -60, `sag-adjusted step ${deltaMv}`);
  const rinGohm = Math.abs(deltaMv) / 50; // mV per pA = GΩ
  assert.ok(rinGohm > 1.0 && rinGohm < 1.6, `input resistance ${rinGohm} GΩ`);
});

test('pinned 0.1 nA step reproduces the reference spike train', () => {
  const r = runCurrentClamp(fit, { injectionNa: 0.1 });
  assert.ok(r.spikeCount >= 8 && r.spikeCount <= 10, `count ${r.spikeCount}`);
  assert.ok(r.latencyMs > 7.5 && r.latencyMs < 9.5, `latency ${r.latencyMs}`);
  assert.ok(r.spikes.every((s) => s.timeMs >= 200 && s.timeMs < 800));
});

test('halving the timestep preserves the early spike times and count within one event', () => {
  const coarse = runCurrentClamp(fit, { injectionNa: 0.1 });
  const fine = runCurrentClamp(fit, { injectionNa: 0.1, dt: 0.0125, sampleMs: 0.05 });
  assert.ok(Math.abs(coarse.spikeCount - fine.spikeCount) <= 1);
  // Spike timing error accumulates superlinearly in a spiking system; bound the
  // drift with a quadratic envelope so real divergence still fails the test.
  for (let i = 0; i < 5; i++)
    assert.ok(
      Math.abs(coarse.spikes[i].timeMs - fine.spikes[i].timeMs) < 0.2 + 0.2 * i * i,
      `spike ${i}: ${coarse.spikes[i].timeMs} vs ${fine.spikes[i].timeMs}`,
    );
});

test('IV sweep is monotone over its subthreshold range and flags spiking points', () => {
  const iv = ivSweep(fit);
  const sub = iv.filter((p) => !p.spiked);
  assert.ok(sub.length >= 8);
  for (let i = 1; i < sub.length; i++)
    assert.ok(sub[i].steadyMv > sub[i - 1].steadyMv, `non-monotone at ${sub[i].injectionNa}`);
  assert.equal(iv.at(-1).spiked, true);
  assert.equal(iv[0].injectionNa, IV_AMPLITUDES_NA[0]);
});

test('f-I sweep rises with current and shows depolarization block at high drive', () => {
  const fi = fiSweep(fit);
  const at = (a) => fi.find((p) => p.injectionNa === a);
  assert.ok(at(0.02).rateHz > 0);
  assert.ok(at(0.16).rateHz > at(0.02).rateHz);
  assert.ok(at(0.3).rateHz < at(0.16).rateHz, 'block must reduce the rate');
  assert.equal(fi.length, FI_AMPLITUDES_NA.length);
  assert.ok(fi.every((p) => p.count * 1000 / 600 === p.rateHz));
});

test('soma area matches the pinned morphology membrane area', () => {
  assert.ok(SOMA_AREA_UM2 > 840 && SOMA_AREA_UM2 < 847);
});
