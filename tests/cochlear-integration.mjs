import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runProcessor,
  validateProcessorConfig,
  expandPulsePhases,
} from '../src/lib/cochlear/processor.js';
import { buildLeadFields } from '../src/lib/cochlear/fields.js';
import { createNerveModel, simulateFiber } from '../src/lib/cochlear/nerve.js';
import { runExperiment, scanChannels, findThreshold } from '../src/lib/cochlear/experiment.js';
import { createGeometry } from '../src/lib/cochlear/geometry.js';
import { normalizeSettings, serializeExperiment, parseExperiment } from '../src/lib/cochlear/config.js';

const AUDIO_RATE = 24000;

function tone(frequencyHz, durationMs = 80, peak = 0.3) {
  return Float32Array.from(
    { length: Math.round(AUDIO_RATE * durationMs / 1000) },
    (_, i) => peak * Math.sin(2 * Math.PI * frequencyHz * i / AUDIO_RATE),
  );
}

function near(actual, expected, absoluteTolerance, explanation) {
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= absoluteTolerance,
    `${explanation}: got ${actual}, expected ${expected} ± ${absoluteTolerance}`,
  );
}

test('cochlear integration: a known 1 kHz tone drives the basal-indexed 930–1265 Hz contact', () => {
  // This expected index is fixed by the independently specified 12-band,
  // 200–8000 Hz map, not obtained by asking the implementation for a winner.
  const result = runProcessor(tone(1000), AUDIO_RATE, {
    channelCount: 12,
    lowHz: 200,
    highHz: 8000,
    strategy: 'nofm',
    maxima: 1,
    frameRateHz: 800,
  });
  const steadyEvents = result.events.filter((event) => event.onsetUs >= 20000);
  assert.ok(steadyEvents.length >= 40, 'Tone must generate a useful steady train.');
  assert.ok(steadyEvents.every((event) => event.contactIndex === 6),
    'A 1 kHz tone must drive zero-based contact 6; reversing tonotopy changes this result.');
  assert.ok(steadyEvents.every((event) => event.amplitudeUA > 0));
});

test('cochlear integration: disabling the dominant contact changes delivered events, and disabling all is silent', () => {
  const samples = tone(1000);
  const config = { strategy: 'nofm', maxima: 1, frameRateHz: 800 };
  const mask = Array(12).fill(true);
  mask[6] = false;
  const disabled = runProcessor(samples, AUDIO_RATE, { ...config, activeMask: mask });
  assert.ok(disabled.events.length > 0, 'Other enabled filter channels remain available.');
  assert.ok(disabled.events.every((event) => event.contactIndex !== 6),
    'The disabled contact must be absent from the actual pulse schedule.');
  for (let frame = 0; frame < disabled.frameTimesS.length; frame++) {
    assert.equal(disabled.currentsUA[frame * 12 + 6], 0,
      'The electrodogram and pulse mask must agree.');
  }
  const allDisabled = runProcessor(samples, AUDIO_RATE, {
    ...config,
    activeMask: Array(12).fill(false),
  });
  assert.equal(allDisabled.events.length, 0);
  assert.ok(allDisabled.currentsUA.every((amplitude) => amplitude === 0));
  const silence = runProcessor(new Float32Array(samples.length), AUDIO_RATE, config);
  assert.equal(silence.events.length, 0, 'Silence is not an implicit threshold carrier.');
});

test('cochlear integration: independent serial-timing fixtures reject impossible pulse occupancy', () => {
  const pulse = { channelCount: 12, phaseWidthUs: 25, gapUs: 8, guardUs: 2 };
  const feasible = validateProcessorConfig({ ...pulse, strategy: 'cis', frameRateHz: 800 });
  assert.equal(feasible.valid, true);
  near(feasible.timing.maxOccupancy, 0.576, 1e-12, '12 × 800 × 60 microseconds');

  const impossible = validateProcessorConfig({ ...pulse, strategy: 'cis', frameRateHz: 1600 });
  assert.equal(impossible.valid, false);
  near(impossible.timing.maxOccupancy, 1.152, 1e-12, '12 × 1600 × 60 microseconds');
  assert.throws(() => runProcessor(tone(1000), AUDIO_RATE, {
    ...pulse,
    strategy: 'cis',
    frameRateHz: 1600,
  }), /frame|Sequential|require/);

  const selected = validateProcessorConfig({
    ...pulse, strategy: 'nofm', maxima: 4, frameRateHz: 1200,
  });
  assert.equal(selected.valid, true);
  near(selected.timing.maxOccupancy, 0.288, 1e-12, '4 × 1200 × 60 microseconds');
});

test('cochlear integration: real pulse events have correct phase charge and fit both clip and frame clocks', () => {
  const config = {
    strategy: 'nofm', maxima: 4, frameRateHz: 1200,
    phaseWidthUs: 25, gapUs: 8, guardUs: 2,
  };
  const result = runProcessor(tone(1000, 81.37), AUDIO_RATE, config);
  assert.ok(result.events.length > 0);
  let previousPulseEnd = -Infinity;
  let totalAbsoluteChargeNC = 0;
  for (const event of result.events) {
    const phases = expandPulsePhases(event, result.config);
    assert.equal(phases.length, 2);
    near(phases[0].durationUs, 25, 1e-12, 'First phase width');
    near(phases[1].durationUs, 25, 1e-12, 'Second phase width');
    near(phases[1].onsetUs - phases[0].onsetUs, 33, 1e-8, 'Phase width plus interphase gap');
    assert.ok(phases[0].currentUA < 0 && phases[1].currentUA > 0,
      'The default cathodic pulse has a negative first phase.');
    const q1 = phases[0].currentUA * phases[0].durationUs / 1000;
    const q2 = phases[1].currentUA * phases[1].durationUs / 1000;
    near(q1 + q2, 0, 1e-12, 'Signed net charge in nC');
    near(Math.abs(q1), event.amplitudeUA * 0.025, 1e-12, 'µA × 25 µs converted to nC');
    totalAbsoluteChargeNC += Math.abs(q1) + Math.abs(q2);
    const end = phases[1].onsetUs + phases[1].durationUs;
    assert.ok(event.onsetUs >= previousPulseEnd + 2 - 0.0011,
      'Every delivered pulse respects the serial guard interval.');
    assert.ok(event.onsetUs >= event.frameIndex * 1e6 / 1200 - 0.0011);
    assert.ok(end <= (event.frameIndex + 1) * 1e6 / 1200 + 0.0011,
      'An event fits its declared selection frame.');
    assert.ok(end <= result.durationS * 1e6 + 0.0011,
      'An event fits the actual clip, including its nonintegral final frame.');
    previousPulseEnd = end;
  }
  near(result.metrics.summedAbsoluteChargeNC, totalAbsoluteChargeNC, 1e-7,
    'Reported total charge agrees with independently integrated phases');
  const fixedPhases = expandPulsePhases({ onsetUs: 0, contactIndex: 0, amplitudeUA: 200 }, result.config);
  near(Math.abs(fixedPhases[0].currentUA) * fixedPhases[0].durationUs / 1000,
    5, 1e-12, 'The independent 200 µA / 25 µs reference carries 5 nC per phase');
});

test('cochlear integration: JSON parameter roundtrip preserves real processor events', () => {
  const config = {
    channelCount: 12, strategy: 'nofm', maxima: 4, frameRateHz: 1200,
    lowHz: 200, highHz: 8000, phaseWidthUs: 25, gapUs: 8, guardUs: 2,
    activeMask: Array.from({ length: 12 }, (_, i) => i !== 3 && i !== 8),
    polarity: 'anodic', maxCurrentUA: 300,
  };
  const samples = tone(1375);
  const before = runProcessor(samples, AUDIO_RATE, config);
  const after = runProcessor(samples, AUDIO_RATE, JSON.parse(JSON.stringify(before.config)));
  assert.deepEqual(after.events, before.events);
  assert.deepEqual(after.currentsUA, before.currentsUA);
});

test('cochlear integration: finite-disk fields cause distal propagation, while uniform Ve cannot excite', () => {
  const model = createNerveModel();
  const geometry = {
    contacts: [{ positionMm: [0, 0, 0.5], radiusMm: 0.15, normal: [0, 0, 1] }],
    fibers: [{ placeMm: 0 }],
    returnPositionMm: [17.5, -20, 20],
  };
  const leadFields = buildLeadFields(geometry, model.positionsMm,
    { conductivitySPerM: 1 / 3, returnMode: 'monopolar', focusFraction: 0.75 })[0];
  const input = {
    model, events: [{ onsetUs: 1000, contactIndex: 0, amplitudeUA: 1000 }],
    durationMs: 6, dtUs: 1, phaseWidthUs: 25, gapUs: 8,
    spikeThresholdMv: 0, traceEveryUs: 20,
  };
  const actual = simulateFiber({ ...input, leadFields });
  assert.equal(actual.spikeTimesMs.length, 1,
    'The real disk geometry and physical current must drive the active cable.');
  assert.equal(actual.proximalSpikeTimesMs.length, 1);
  assert.ok(actual.spikeTimesMs[0] > actual.proximalSpikeTimesMs[0],
    'The distal response must follow the proximal central-axon response.');
  assert.ok(actual.spikeTimesMs[0] > 1.7 && actual.spikeTimesMs[0] < 2.2);
  assert.ok(actual.maxMv[model.detectionIndex] > 15,
    'The distal event is a complete depolarization, not just a source-local voltage perturbation.');

  const uniform = simulateFiber({
    ...input, leadFields: [new Float64Array(model.compartmentCount).fill(1)],
  });
  assert.equal(uniform.spikeTimesMs.length, 0);
  for (const voltage of uniform.finalMv) near(voltage, -65, 1e-8,
    'Spatially uniform time-varying extracellular voltage must not polarize the sealed cable');

  // Adding any spatially uniform reference potential to the actual field
  // must leave transmembrane activity unchanged, including sealed endpoints.
  const shifted = simulateFiber({
    ...input, leadFields: leadFields.map((field) => Float64Array.from(field, (value) => value + 10)),
  });
  assert.equal(shifted.spikeTimesMs.length, actual.spikeTimesMs.length);
  near(shifted.spikeTimesMs[0], actual.spikeTimesMs[0], 1e-8, 'Extracellular reference invariance');
  for (let i = 0; i < model.compartmentCount; i++) {
    near(shifted.finalMv[i], actual.finalMv[i], 1e-7, 'Gauge-invariant final membrane potential');
  }
});

const COUPLED_SETTINGS = normalizeSettings({
  durationMs: 12, fiberCount: 9, dtUs: 2, replayEveryUs: 1000, traceEveryUs: 100,
  channelCount: 12, arraySpanMm: 16, apicalDepthMm: 26, radialDistanceMm: 0.25,
  contactRadiusMm: 0.15, conductivitySPerM: 1 / 3, returnMode: 'monopolar',
  signalKind: 'tone', toneHz: 1500, maxCurrentUA: 1200, minCurrentUA: 0,
  strategy: 'nofm', maxima: 1, frameRateHz: 600,
  phaseWidthUs: 25, gapUs: 8, guardUs: 2, polarity: 'cathodic',
  lowHz: 200, highHz: 8000, neuralLoss: 0,
});
let coupledBaseline;
function getCoupledBaseline() {
  return coupledBaseline ??= runExperiment(COUPLED_SETTINGS);
}

test('cochlear integration: changing the active source or electrode distance changes actual propagated responses', () => {
  const baseline = getCoupledBaseline();
  assert.equal(baseline.processor.events.length, 6);
  assert.ok(baseline.processor.events.every((event) => event.contactIndex === 5));
  assert.equal(baseline.metrics.recruited, 1);
  assert.equal(baseline.fibers[4].spikeTimesMs.length, 6);

  const mask = Array(12).fill(true);
  mask[5] = false;
  const disabled = runExperiment({ ...COUPLED_SETTINGS, activeMask: mask });
  assert.ok(disabled.processor.events.length > 0);
  assert.ok(disabled.processor.events.every((event) => event.contactIndex !== 5));
  assert.equal(disabled.metrics.spikeCount, 0,
    'Removing the strongly coupled source changes the cable drive, not only the contact marker.');

  const distant = runExperiment({ ...COUPLED_SETTINGS, radialDistanceMm: 1.5 });
  assert.deepEqual(distant.processor.events, baseline.processor.events,
    'This distance comparison must preserve the exact delivered pulse sequence.');
  assert.equal(distant.metrics.spikeCount, 0,
    'The same stimulus at a different physical location must rebuild its actual fields.');
  assert.notDeepEqual(distant.leadFields[4][5], baseline.leadFields[4][5]);
});

test('cochlear integration: zero current and local fiber loss affect the coupled model correctly', () => {
  const baseline = getCoupledBaseline();
  const zero = runExperiment({ ...COUPLED_SETTINGS, maxCurrentUA: 0 });
  assert.equal(zero.processor.events.length, 0);
  assert.equal(zero.metrics.spikeCount, 0);
  assert.equal(zero.metrics.recruited, 0);
  for (const fiber of zero.fibers) {
    assert.ok(fiber.response.finalMv.every((voltage) => Math.abs(voltage + 65) < 1e-7));
  }
  const loss = runExperiment({
    ...COUPLED_SETTINGS, neuralLoss: 1, lossCentreMm: 17.5, lossWidthMm: 1,
  });
  assert.deepEqual(loss.processor.events, baseline.processor.events,
    'Removing a modeled fiber must not silently change sound processing or stimulus current.');
  assert.equal(loss.metrics.surviving, 8);
  assert.equal(loss.fibers[4].alive, false);
  assert.equal(loss.fibers[4].response, null);
  assert.equal(loss.metrics.spikeCount, 0);
});

test('cochlear integration: the public saved-experiment format reproduces electrical and neural results', () => {
  const baseline = getCoupledBaseline();
  const text = serializeExperiment(baseline.settings, { purpose: 'Independent reproducibility fixture' });
  const imported = parseExperiment(text);
  const restored = runExperiment(imported.settings, imported.audio);
  assert.equal(restored.audio.fingerprint, baseline.audio.fingerprint);
  assert.deepEqual(restored.processor.events, baseline.processor.events);
  assert.deepEqual(restored.fibers.map((fiber) => fiber.spikeTimesMs),
    baseline.fibers.map((fiber) => fiber.spikeTimesMs));
  assert.deepEqual(restored.fibers[4].response.membraneMv, baseline.fibers[4].response.membraneMv);
});

test('cochlear integration: isolated-channel overlap uses actual propagated recruitment and undefined empty responses', () => {
  const scan = scanChannels({
    ...COUPLED_SETTINGS,
    channelCount: 4,
    activeMask: [true, false, false, false],
  });
  assert.ok(scan.counts[0] > 0,
    'The enabled isolated physical source must recruit at least one propagated model response.');
  assert.equal(scan.matrix[0][0], 1, 'A nonempty profile has unit self-overlap.');
  for (let i = 1; i < 4; i++) {
    assert.equal(scan.counts[i], 0);
    assert.equal(scan.matrix[i][i], null,
      'No-response profiles have undefined normalized overlap, not zero overlap.');
    assert.equal(scan.matrix[0][i], null);
  }
});

test('cochlear integration: a reported deterministic threshold brackets an actual change in propagated response', () => {
  const settings = normalizeSettings({
    ...COUPLED_SETTINGS,
    channelCount: 4,
    activeMask: [true, false,false, false],
  });
  const threshold = findThreshold(settings, 0, 2);
  assert.ok(threshold.thresholdUA > 100 && threshold.thresholdUA < 1000);
  assert.ok(threshold.upperUA - threshold.lowerUA <= 0.025);
  const model = createNerveModel();
  const geometry = createGeometry(settings);
  const leadFields = buildLeadFields({ ...geometry, fibers: [geometry.fibers[2]] },
    model.positionsMm, settings)[0];
  const response = (amplitudeUA) => simulateFiber({
    model, leadFields,
    events: [{ onsetUs: 500, contactIndex: 0, amplitudeUA }],
    durationMs: 4, dtUs: settings.dtUs, phaseWidthUs: settings.phaseWidthUs,
    gapUs: settings.gapUs, polarity: settings.polarity, spikeThresholdMv: 0,
    traceEveryUs: 100,
  });
  assert.equal(response(threshold.lowerUA).spikeTimesMs.length, 0);
  assert.ok(response(threshold.upperUA).spikeTimesMs.length > 0);
});
