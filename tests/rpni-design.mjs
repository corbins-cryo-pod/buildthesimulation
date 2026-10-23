import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODEL_VERSION, DEFAULT_CONFIG, PRESETS, PARAMETER_META, normalizeConfig,
  validateConfig, createRng, buildGeometry, pointPotentialUv, diskQuadrature,
  contactPotentialUv, sourceTripolesAt, linearKernelInnerProduct,
  sourceMaturityAt, oxygenSlab, simulate, sampleAt, activityAt, runSweep,
  runEnsemble,
} from '../src/lib/rpni-design/model.mjs';

const close = (a, b, atol = 1e-10, rtol = 0) => assert.ok(Math.abs(a - b) <= atol + rtol * Math.abs(b), `${a} versus ${b}; tolerances ${atol} + ${rtol}|b|`);
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const power = a => mean(a.map(x => x * x));
const small = { motorUnitsPerModule: 4, contactOrder: 2, kernelOversampling: 2, sampleRateHz: 4000, traceDurationMs: 200 };
const baseline = simulate(small);
const conductivity = { longitudinalSm: .5, transverseSm: .1 };
const iso = { longitudinalSm: .2, transverseSm: .2 };
const contact = { positionMm: [0, 0, 2], normal: [0, 0, 1], radiusMm: 1 };
const point = { positionMm: [0, 0, 0], currentUa: 1 };

function finiteTree(value) {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), `Nonfinite number ${value}`);
  else if (value && typeof value === 'object') for (const child of Object.values(value)) finiteTree(child);
}

test('default configuration is complete, strictly valid, and numerically explicit', () => {
  assert.equal(validateConfig(DEFAULT_CONFIG, { strict: true }).valid, true);
  assert.deepEqual(Object.keys(DEFAULT_CONFIG).sort(), Object.keys(PARAMETER_META).sort());
  for (const meta of Object.values(PARAMETER_META)) for (const key of ['label', 'unit', 'group', 'sourceClass', 'note']) assert.equal(typeof meta[key], 'string');
  assert.equal(baseline.modelVersion, MODEL_VERSION);
  assert.equal(baseline.diagnostics.calibrated, false);
  assert.equal(baseline.diagnostics.oxygenCoupledToMaturation, false);
});

test('normalization bounds dependent geometry without interpreting strings or NaN as numbers', () => {
  const c = normalizeConfig({ moduleCount: 99, graftLengthMm: 8, graftWidthMm: 3, graftThicknessMm: .5, contactRadiusMm: 3, electrodeSpacingMm: 60, electrodeOffsetMm: 35, electrodeDepthMm: 15, territoryRadiusMm: 8, sourceAmplitudeUa: '20', seed: NaN });
  assert.equal(c.moduleCount, 4);
  assert.equal(c.sourceAmplitudeUa, DEFAULT_CONFIG.sourceAmplitudeUa);
  assert.equal(c.seed, DEFAULT_CONFIG.seed);
  assert.ok(c.contactRadiusMm <= c.graftWidthMm / 4);
  assert.ok(Math.abs(c.electrodeOffsetMm) + c.electrodeSpacingMm / 2 + c.contactRadiusMm <= c.graftLengthMm / 2);
  assert.ok(c.electrodeDepthMm <= c.graftThicknessMm);
  assert.ok(c.territoryRadiusMm <= c.graftThicknessMm / 4);
  assert.equal(validateConfig({ ...DEFAULT_CONFIG, moduleCount: 99 }, { strict: true }).valid, false);
  assert.equal(validateConfig({ ...DEFAULT_CONFIG, unknown: 1 }, { strict: true }).valid, false);
  assert.equal(validateConfig({ moduleCount: 2 }, { strict: true }).valid, false);
});

test('seeded generator and complete simulations reproduce exactly', () => {
  const a = createRng(31337), b = createRng(31337);
  assert.deepEqual(Array.from({ length: 100 }, a), Array.from({ length: 100 }, b));
  assert.deepEqual(baseline, simulate(small));
  assert.notDeepEqual(baseline.motorUnits.map(u => u.territoryCenterMm), simulate({ ...small, seed: 2049 }).motorUnits.map(u => u.territoryCenterMm));
});

test('module envelopes, source fibers and contact disks respect shared physical geometry', () => {
  for (const module of baseline.geometry.modules) {
    assert.ok(module.nerveTipMm[0] > module.nerveEntryMm[0]);
    assert.ok(module.nerveTipMm[0] < module.centerMm[0]);
    for (const c of baseline.geometry.contacts.filter(c => c.moduleId === module.id)) {
      assert.ok(Math.abs(c.positionMm[0]) + c.radiusMm <= module.dimensionsMm[0] / 2 + 1e-12);
      assert.ok(Math.abs(c.positionMm[1] - module.centerMm[1]) + c.radiusMm <= module.dimensionsMm[1] / 2 + 1e-12);
      assert.ok(Math.abs(c.positionMm[2]) <= module.dimensionsMm[2] / 2);
    }
    for (const u of baseline.motorUnits.filter(u => u.moduleId === module.id)) for (const f of u.members) for (const p of [f.endplateMm, f.fiberStartMm, f.fiberEndMm]) {
      p.forEach((v, axis) => assert.ok(Math.abs(v - module.centerMm[axis]) <= module.dimensionsMm[axis] / 2));
    }
  }
  const [a, b] = baseline.geometry.modules;
  close(b.centerMm[1] - a.centerMm[1] - baseline.config.graftWidthMm, baseline.config.moduleGapMm);
  assert.equal(baseline.geometry.boundariesAffectElectricalField, false);
});

test('point Green function matches independently converted isotropic SI solution', () => {
  const actual = pointPotentialUv([1, -2, 3], [4, 2, 3], 2.5, iso);
  const expected = 2.5e-6 / (4 * Math.PI * .2 * .005) * 1e6;
  close(actual, expected, 1e-10);
});

test('anisotropic axial Green-function ratio, translation and reciprocity hold', () => {
  const along = pointPotentialUv([0, 0, 0], [3, 0, 0], 1, conductivity);
  const across = pointPotentialUv([0, 0, 0], [0, 3, 0], 1, conductivity);
  close(along / across, Math.sqrt(.5 / .1));
  close(pointPotentialUv([1, 2, 3], [4, 6, 8], 1, conductivity), pointPotentialUv([0, 0, 0], [3, 4, 5], 1, conductivity));
  close(pointPotentialUv([1, 2, 3], [4, 6, 8], 1, conductivity), pointPotentialUv([4, 6, 8], [1, 2, 3], 1, conductivity));
});

test('conductivity scaling remains inverse with the explicit smooth source core', () => {
  const a = pointPotentialUv([0, 0, 0], [1, 2, 3], 1, conductivity, .2);
  const b = pointPotentialUv([0, 0, 0], [1, 2, 3], 1, { longitudinalSm: 1, transverseSm: .2 }, .2);
  close(a, 2 * b);
});

test('point-source singularity, zero current, and small-core limit are explicit', () => {
  assert.throws(() => pointPotentialUv([0, 0, 0], [0, 0, 0], 1, iso), /singular/);
  assert.equal(pointPotentialUv([0, 0, 0], [0, 0, 0], 0, iso), 0);
  assert.ok(Number.isFinite(pointPotentialUv([0, 0, 0], [0, 0, 0], 1, iso, .1)));
  close(pointPotentialUv([0, 0, 0], [0, 0, 10], 1, iso, .01), pointPotentialUv([0, 0, 0], [0, 0, 10], 1, iso), 0, 1e-6);
  assert.throws(() => pointPotentialUv([0, 0, 0], [1, 0, 0], 1, { longitudinalSm: 0, transverseSm: .1 }));
});

test('disk quadrature conserves area weight and center on an arbitrary plane', () => {
  const c = { positionMm: [1, 2, 3], normal: [1, 1, 1], radiusMm: 2 }, q = diskQuadrature(c, 5);
  close(q.reduce((s, p) => s + p.weight, 0), 1);
  for (let axis = 0; axis < 3; axis++) close(q.reduce((s, p) => s + p.weight * p.positionMm[axis], 0), c.positionMm[axis]);
  for (const p of q) {
    const displacement = p.positionMm.map((x, i) => x - c.positionMm[i]);
    close(displacement.reduce((s, x) => s + x, 0), 0);
    assert.ok(Math.hypot(...displacement) <= c.radiusMm);
  }
});

test('finite disk average converges to the exact on-axis isotropic integral', () => {
  // Average over disk: I/(2πσR²)·(sqrt(z²+R²)-|z|), with mm/µA→µV factor1000.
  const expected = 1000 / (2 * Math.PI * .2) * (Math.sqrt(5) - 2);
  const errors = [1, 2, 4, 8].map(order => Math.abs(contactPotentialUv(contact, [point], iso, { order }) - expected));
  assert.ok(errors[1] < errors[0]); assert.ok(errors[2] < errors[1]);
  assert.ok(errors[3] < 1e-10);
});

test('zero-radius contact equals a point measurement and disk shrinking converges', () => {
  const sources = [point, { positionMm: [1, 0, 0], currentUa: -1 }];
  const expected = sources.reduce((s, source) => s + pointPotentialUv(source.positionMm, contact.positionMm, source.currentUa, iso), 0);
  close(contactPotentialUv({ ...contact, radiusMm: 0 }, sources, iso), expected);
  const a = contactPotentialUv({ ...contact, radiusMm: .01 }, sources, iso), b = contactPotentialUv({ ...contact, radiusMm: .001 }, sources, iso);
  assert.ok(Math.abs(b - expected) < Math.abs(a - expected));
});

test('balanced source pairs reverse sign on physical reflection', () => {
  const sources = [{ positionMm: [-1, 0, 0], currentUa: -1 }, { positionMm: [1, 0, 0], currentUa: 1 }];
  const right = contactPotentialUv({ ...contact, positionMm: [2, 0, 2] }, sources, conductivity, { sourceRadiusMm: .1 });
  const left = contactPotentialUv({ ...contact, positionMm: [-2, 0, 2] }, sources, conductivity, { sourceRadiusMm: .1 });
  close(left, -right, 1e-10);
  assert.ok(Math.abs(right) > 0);
});

test('traveling tripoles conserve current at birth, transit, and finite-fiber extinction', () => {
  for (const unit of baseline.motorUnits) for (const ageMs of [-1, 0, .01, .15, .5, 1.7, 3.2, 5, 20]) {
    const sources = sourceTripolesAt(unit, ageMs, baseline.config);
    close(sources.reduce((s, source) => s + source.currentUa, 0), 0, 2e-15);
    for (const source of sources) assert.ok(source.positionMm[0] >= unit.fiberStartMm[0] - 1e-12 && source.positionMm[0] <= unit.fiberEndMm[0] + 1e-12);
    if (ageMs <= 0 || ageMs >= 20) assert.equal(sources.length, 0);
  }
});

test('piecewise-linear kernel integral matches exact triangular and cross-polynomial integrals', () => {
  close(linearKernelInnerProduct([0, 1, 0], [0, 1, 0], 1), 2 / 3 / 1000, 1e-16);
  close(linearKernelInnerProduct([0, 1], [1, 0], 1), 1 / 6 / 1000, 1e-16);
  close(linearKernelInnerProduct([0, 1, 0], [1, 1, 1], 1), 1 / 1000, 1e-16);
  assert.throws(() => linearKernelInnerProduct([0, 1], [0], 1));
});

test('kernel cross-energy matrix is symmetric positive semidefinite', () => {
  for (const kernel of baseline.sourceKernels) {
    const a = kernel.crossEnergyUv2S, v = [-.7, 1.3];
    close(a[0][1], a[1][0], 1e-14);
    close(kernel.energyUv2S[0], a[0][0]);
    const quadratic = v.reduce((s, vi, i) => s + vi * v.reduce((inner, vj, j) => inner + vj * a[i][j], 0), 0);
    assert.ok(quadratic >= -1e-12);
  }
});

test('expected kernel variance agrees with independent dense midpoint integration', () => {
  const k = baseline.sourceKernels[0], h = k.channels[0], substeps = 100;
  let integral = 0;
  for (let j = 0; j < h.length - 1; j++) for (let q = 0; q < substeps; q++) {
    const u = (q + .5) / substeps, v = h[j] * (1 - u) + h[j + 1] * u;
    integral += v * v * k.dtMs / substeps / 1000;
  }
  close(integral, k.energyUv2S[0], 1e-12, 2e-5);
});

test('coincident bipolar contacts cancel all signal while preserving independent noise', () => {
  const r = simulate({ ...small, electrodeSpacingMm: 0 });
  for (const kernel of r.sourceKernels) for (const channel of kernel.channels) assert.ok(channel.every(x => x === 0));
  for (const channel of r.recording.channels) { assert.ok(channel.cleanUv.every(x => x === 0)); assert.deepEqual(channel.signalUv, channel.noiseUv); }
  assert.ok(r.summary.channels.every(c => c.cleanRmsUv === 0 && c.targetFraction === null));
  assert.ok(r.recording.channelSimilarity.flat().every(x => x === null));
});

test('zero equivalent-source current produces a noise-only experiment without nonfinite ratios', () => {
  const r = simulate({ ...small, sourceAmplitudeUa: 0 });
  for (const channel of r.recording.channels) { assert.ok(channel.cleanUv.every(v => v === 0)); assert.deepEqual(channel.signalUv, channel.noiseUv); }
  assert.ok(r.summary.channels.every(c => c.snrDb === null && c.snrState === 'no-signal'));
  assert.ok(r.recording.transferMatrix.flat().every(v => v === 0)); finiteTree(r);
});

test('zero drive, no available sources, and zero growth each independently remove clean signals', () => {
  for (const overrides of [{ targetDrive: 0, otherDrive: 0 }, { sourceAvailability: 0 }, { axonSpeedMmDay: 0 }]) {
    const r = simulate({ ...small, ...overrides });
    assert.ok(r.recording.channels.every(c => c.cleanUv.every(v => v === 0)));
    assert.ok(r.summary.channels.every(c => c.cleanRmsUv === 0));
    if (overrides.axonSpeedMmDay === 0) assert.ok(r.motorUnits.every(u => u.arrivalDay === null));
  }
});

test('source current and conductivity each have the correct full-simulation scaling', () => {
  const amplitude = simulate({ ...small, sourceAmplitudeUa: 2 });
  const conductive = simulate({ ...small, sigmaLongitudinalSm: 1, sigmaTransverseSm: .2 });
  for (let ch = 0; ch < 2; ch++) {
    close(amplitude.summary.channels[ch].cleanRmsUv, 2 * baseline.summary.channels[ch].cleanRmsUv, 1e-10);
    close(conductive.summary.channels[ch].cleanRmsUv, baseline.summary.channels[ch].cleanRmsUv / 2, 1e-10);
    baseline.recording.channels[ch].cleanUv.forEach((v, i) => {
      close(amplitude.recording.channels[ch].cleanUv[i], 2 * v, 1e-10);
      close(conductive.recording.channels[ch].cleanUv[i], v / 2, 1e-10);
    });
    assert.deepEqual(amplitude.recording.channels[ch].noiseUv, baseline.recording.channels[ch].noiseUv);
  }
});

test('expected independent-event power is linear in imposed event rate', () => {
  const a = simulate({ ...small, targetDrive: 1, otherDrive: 1, minFiringHz: 10, maxFiringHz: 10 }, { includeRecording: false });
  const b = simulate({ ...small, targetDrive: 1, otherDrive: 1, minFiringHz: 20, maxFiringHz: 20 }, { includeRecording: false });
  for (let ch = 0; ch < 2; ch++) close(b.summary.channels[ch].cleanRmsUv ** 2, 2 * a.summary.channels[ch].cleanRmsUv ** 2, 1e-10);
});

test('expected pool power partitions total clean power and channel correlation respects covariance', () => {
  const r = baseline;
  r.recording.transferMatrix.forEach((row, i) => {
    close(row.reduce((s, x) => s + x * x, 0), r.summary.channels[i].cleanRmsUv ** 2, 1e-10);
    close(r.recording.covarianceUv2[i][i], r.summary.channels[i].cleanRmsUv ** 2, 1e-10);
    close(r.recording.channelSimilarity[i][i], 1);
    for (let j = 0; j < row.length; j++) { close(r.recording.channelSimilarity[i][j], r.recording.channelSimilarity[j][i]); assert.ok(Math.abs(r.recording.channelSimilarity[i][j]) <= 1); }
  });
});

test('finite recording decomposition and RMS include actual covariance terms', () => {
  const r = baseline;
  r.recording.channels.forEach((channel, ch) => {
    channel.signalUv.forEach((v, i) => close(v, channel.targetUv[i] + channel.otherUv[i] + channel.noiseUv[i]));
    close(mean(channel.targetUv), 0, 1e-12); close(mean(channel.otherUv), 0, 1e-12);
    close(r.recording.metrics[ch].rmsUv ** 2, power(channel.signalUv), 1e-10);
    close(r.recording.metrics[ch].cleanRmsUv ** 2, power(channel.targetUv) + power(channel.otherUv) + 2 * r.recording.metrics[ch].targetOtherCovarianceUv2, 1e-10);
  });
});

test('noise is reproducible, independent by channel, and measured separately from prescribed RMS', () => {
  const r = simulate({ ...small, traceDurationMs: 2000, targetDrive: 0, otherDrive: 0 });
  const [a, b] = r.recording.channels.map(c => c.noiseUv);
  assert.notDeepEqual(a, b);
  close(mean(a), 0, 1e-12); close(mean(b), 0, 1e-12);
  assert.ok(Math.abs(Math.sqrt(power(a)) - r.config.noiseRmsUv) < .15);
  const correlation = mean(a.map((v, i) => v * b[i])) / Math.sqrt(power(a) * power(b));
  assert.ok(Math.abs(correlation) < .05, `noise correlation ${correlation}`);
  assert.notEqual(r.recording.metrics[0].noiseRmsUv, r.summary.channels[0].noiseRmsUv);
});

test('target-only drive removes all other-pool power regardless of physical routing', () => {
  const r = simulate({ ...small, routingFidelity: .5, otherDrive: 0 });
  assert.ok(r.motorUnits.filter(u => u.sourcePoolId !== r.config.targetModule).every(u => u.rateHz === 0));
  for (const c of r.recording.channels) assert.ok(c.otherUv.every(v => v === 0));
  assert.ok(r.summary.channels.every(c => c.otherRmsUv === 0 && c.targetFraction === 1));
});

test('synthetic allocation changes command labels without moving sources or inventing axons', () => {
  const r = simulate({ ...small, routingFidelity: 0 });
  assert.ok(r.motorUnits.every(u => u.moduleId !== u.sourcePoolId));
  assert.equal(r.motorUnits.length, baseline.motorUnits.length);
  r.motorUnits.forEach((u, i) => { assert.deepEqual(u.territoryCenterMm, baseline.motorUnits[i].territoryCenterMm); close(u.sourceScale, baseline.motorUnits[i].sourceScale); close(u.arrivalDay, baseline.motorUnits[i].arrivalDay); });
  const single = simulate({ ...small, moduleCount: 1, routingFidelity: 0 });
  assert.equal(single.summary.routingFraction, 1);
});

test('wider separation reduces other-graft pickup in the stated paired scenario', () => {
  const near = simulate({ ...small, moduleGapMm: 1 }, { includeRecording: false }), far = simulate({ ...small, moduleGapMm: 30 }, { includeRecording: false });
  assert.ok(far.summary.channels[0].otherRmsUv < near.summary.channels[0].otherRmsUv);
  close(far.summary.channels[0].targetRmsUv, near.summary.channels[0].targetRmsUv, 1e-10);
  assert.deepEqual(far.motorUnits.map(u => u.spikeTimesMs), near.motorUnits.map(u => u.spikeTimesMs));
});

test('source maturation starts after assumed branch arrival with its own exact clock', () => {
  const unit = baseline.motorUnits[0], c = baseline.config;
  close(unit.arrivalDay, c.regenerationLagDays + unit.pathLengthMm / c.axonSpeedMmDay);
  assert.equal(sourceMaturityAt(unit, unit.arrivalDay - .1, c), 0);
  assert.equal(sourceMaturityAt(unit, unit.arrivalDay, c), 0);
  close(sourceMaturityAt(unit, unit.arrivalDay + c.nmjMaturationDays, c), c.sourceAvailability * (1 - Math.exp(-1)));
  const r = simulate({ ...small, sourceAvailability: .4 });
  close(r.summary.matureSourceFraction, .4 * baseline.summary.matureSourceFraction);
  r.summary.channels.forEach((channel, i) => close(channel.cleanRmsUv, .4 * baseline.summary.channels[i].cleanRmsUv));
});

test('availability and source signals remain independent of the slab diagnostic', () => {
  const r = simulate({ ...small, oxygenDiffusivityMm2S: .01, oxygenConsumptionPerS: .001 });
  assert.notEqual(r.oxygen.centerRatio, baseline.oxygen.centerRatio);
  assert.deepEqual(r.motorUnits, baseline.motorUnits);
  assert.deepEqual(r.recording, baseline.recording);
  assert.equal(r.summary.matureSourceFraction, baseline.summary.matureSourceFraction);
});

test('biological sampling clamps outside the horizon and matches the recording-day summary', () => {
  assert.equal(sampleAt(baseline, -10).day, 0);
  assert.equal(sampleAt(baseline, 1000).day, baseline.config.durationDays);
  assert.deepEqual(sampleAt(baseline, baseline.config.observationDay), baseline.summary);
  let arrived = 0, available = 0;
  for (const s of baseline.samples) { assert.ok(s.arrivedUnits >= arrived); assert.ok(s.matureSourceFraction >= available); arrived = s.arrivedUnits; available = s.matureSourceFraction; }
});

test('viewer activity uses exact model events, growth fraction and physical wave speed', () => {
  const unit = baseline.motorUnits[0], event = unit.spikeTimesMs.find(t => t > 0 && t < baseline.config.traceDurationMs - 1);
  assert.ok(Number.isFinite(event));
  const timeMs = event + .2, activity = activityAt(baseline, baseline.config.observationDay, timeMs).units[0];
  assert.ok(activity.activation > 0);
  close(activity.wavefrontsMm[0], unit.territoryCenterMm[0] - .2 * baseline.config.conductionVelocityMps, 1e-10);
  close(activity.wavefrontsMm[1], unit.territoryCenterMm[0] + .2 * baseline.config.conductionVelocityMps, 1e-10);
  const halfDay = baseline.config.regenerationLagDays + unit.pathLengthMm / baseline.config.axonSpeedMmDay / 2;
  const early = activityAt(baseline, halfDay, timeMs).units[0];
  close(early.growthFraction, .5); assert.equal(early.activation, 0); assert.equal(early.arrived, false);
  assert.equal(activityAt(baseline, 0, timeMs).matchesRecordingDay, false);
});

test('slab solution meets both boundary conditions and its differential equation', () => {
  const s = oxygenSlab({ thicknessMm: 4, diffusivityMm2S: .3, consumptionPerS: .02, points: 501 });
  close(s.profile[0].ratio, 1); close(s.profile.at(-1).ratio, 1);
  for (let i = 1; i < s.profile.length - 1; i++) {
    const dz = s.profile[i + 1].zMm - s.profile[i].zMm;
    const second = (s.profile[i + 1].ratio - 2 * s.profile[i].ratio + s.profile[i - 1].ratio) / dz ** 2;
    close(s.diffusivityMm2S * second - s.consumptionPerS * s.profile[i].ratio, 0, 1e-8);
  }
});

test('slab boundary flux equals integrated consumption', () => {
  const s = oxygenSlab({ thicknessMm: 5, diffusivityMm2S: .002, consumptionPerS: .01 });
  const inwardFluxBothFaces = 2 * s.diffusivityMm2S / s.lambdaMm * Math.tanh(s.thieleModulus);
  const consumption = s.consumptionPerS * s.thicknessMm * s.meanRatio;
  close(inwardFluxBothFaces, consumption, 1e-14);
});

test('slab zero-consumption, zero-thickness, extreme depletion and monotonic limits hold', () => {
  for (const s of [oxygenSlab({ consumptionPerS: 0 }), oxygenSlab({ thicknessMm: 0 })]) { close(s.centerRatio, 1); close(s.meanRatio, 1); assert.ok(s.profile.every(p => p.ratio === 1)); }
  const base = oxygenSlab();
  assert.ok(oxygenSlab({ thicknessMm: 6 }).centerRatio < base.centerRatio);
  assert.ok(oxygenSlab({ diffusivityMm2S: .004 }).centerRatio > base.centerRatio);
  assert.ok(oxygenSlab({ consumptionPerS: .02 }).centerRatio < base.centerRatio);
  const extreme = oxygenSlab({ thicknessMm: 1e6, diffusivityMm2S: .0001, consumptionPerS: .2 });
  assert.equal(extreme.centerRatio, 0); finiteTree(extreme);
  assert.throws(() => oxygenSlab({ diffusivityMm2S: 0 }));
});

test('recording-grid changes preserve a fixed internal source grid and physical event times', () => {
  const a = simulate({ ...small, sampleRateHz: 4000, kernelOversampling: 4 }), b = simulate({ ...small, sampleRateHz: 8000, kernelOversampling: 2 });
  assert.deepEqual(a.sourceKernels, b.sourceKernels);
  assert.deepEqual(a.motorUnits.map(u => u.spikeTimesMs), b.motorUnits.map(u => u.spikeTimesMs));
  assert.deepEqual(a.summary, b.summary);
  for (let ch = 0; ch < 2; ch++) {
    const aa = a.recording.channels[ch].cleanUv, bb = b.recording.channels[ch].cleanUv;
    aa.forEach((v, i) => close(v - aa[0], bb[2 * i] - bb[0], 1e-10));
  }
});

test('default source waveform and contact refinement errors are explicitly bounded at the benchmark', () => {
  const a = simulate({}, { includeRecording: false }), b = simulate({ kernelOversampling: 8 }, { includeRecording: false }), q = simulate({ contactOrder: 6 }, { includeRecording: false });
  a.summary.channels.forEach((channel, i) => {
    close(channel.cleanRmsUv, b.summary.channels[i].cleanRmsUv, 0, .002);
    close(channel.cleanRmsUv, q.summary.channels[i].cleanRmsUv, 0, .001);
  });
  assert.equal(a.sourceKernels[0].dtMs, 1000 / (a.config.sampleRateHz * a.config.kernelOversampling));
});

test('coarse narrow-source settings carry a resolution warning instead of an accuracy guarantee', () => {
  const r = simulate({ ...small, sourceRadiusMm: .02, poleSpacingMm: .1, conductionVelocityMps: 8, sampleRateHz: 1000, kernelOversampling: 1 }, { includeRecording: false });
  assert.ok(r.warnings.some(w => /temporally underresolved/.test(w)));
  assert.ok(r.warnings.some(w => /pole-transit time/.test(w)));
});

test('observation-day sweeps use a common realization and only change maturation', () => {
  const r = runSweep(small, 'observationDay', [0, 60, 120]);
  assert.equal(r.points[0].summary.channels[0].cleanRmsUv, 0);
  assert.ok(r.points[1].summary.channels[0].cleanRmsUv < r.points[2].summary.channels[0].cleanRmsUv);
  assert.ok(r.points.every(p => p.config.seed === baseline.config.seed));
  assert.throws(() => runSweep(small, 'made-up', [1, 2]));
  assert.throws(() => runSweep(small, 'seed', [1, 2]));
  assert.throws(() => runSweep(small, 'moduleGapMm', [1, NaN]));
});

test('ensemble percentile bands are reproducible, ordered and explicitly synthetic', () => {
  const c = { ...small, motorUnitsPerModule: 2, contactOrder: 1 }, a = runEnsemble(c, 3), b = runEnsemble(c, 3);
  assert.deepEqual(a, b); assert.equal(new Set(a.seeds).size, 3); assert.equal(a.n, 3); assert.equal(a.rows.length, 3);
  for (const s of a.samples) for (const key of ['matureSourceFraction', 'arrivedUnits']) assert.ok(s[key].low <= s[key].median && s[key].median <= s[key].high);
  assert.match(a.interpretation, /not patient prediction/);
});

test('all presets and a four-graft stress layout retain finite exportable outputs', () => {
  for (const preset of [...PRESETS, { config: { ...DEFAULT_CONFIG, moduleCount: 4, graftThicknessMm: .5, electrodeSpacingMm: 0, sourceAvailability: 0, oxygenConsumptionPerS: 0 } }]) {
    const r = simulate({ ...preset.config, ...small, motorUnitsPerModule: 1, contactOrder: 1 });
    finiteTree(r);
    const roundtrip = JSON.parse(JSON.stringify(r));
    assert.equal(roundtrip.motorUnits.length, r.config.moduleCount * r.config.motorUnitsPerModule);
    assert.equal(roundtrip.recording.transferMatrix.length, r.config.moduleCount);
  }
  assert.deepEqual(buildGeometry(DEFAULT_CONFIG), simulate({ ...DEFAULT_CONFIG, motorUnitsPerModule: 1 }, { includeRecording: false }).geometry);
});
