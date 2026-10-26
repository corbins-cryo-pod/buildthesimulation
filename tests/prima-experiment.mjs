import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { DEFAULT_CONFIG, PRESETS, MODEL_VERSION, EXPORT_SCHEMA, normalizeConfig, configurationId, validateConfig } from '../src/lib/prima/model.mjs';
import { simulateExperiment, samplePixelIllumination } from '../src/lib/prima/engine.mjs';
import { exportExperiment, parseExperiment } from '../src/lib/prima/export.mjs';
import { createPrimaClient } from '../src/lib/prima/client.mjs';
import { createPrimaGeometry } from '../src/lib/prima/geometry.mjs';

const runs = new Map(), report = [];
function runPreset(id) {
  if (!runs.has(id)) {
    const preset = PRESETS.find(p => p.id === id);
    assert.ok(preset, `Preset ${id} exists.`);
    const progress = [];
    runs.set(id, simulateExperiment({ ...DEFAULT_CONFIG, ...preset.config }, { onProgress: p => progress.push(p) })
      .then(result => ({ result, progress })));
  }
  return runs.get(id);
}
const maxAbs = values => Math.max(...values.map(Math.abs));
const sum = values => values.reduce((a, b) => a + b, 0);
const close = (actual, expected, tolerance, message) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} versus ${expected}`);
const allFinite = values => assert.ok(Array.from(values).every(Number.isFinite));

for (const preset of PRESETS) {
  test(`PRIMA complete 378-pixel experiment: ${preset.id}`, async () => {
    const { result: r, progress } = await runPreset(preset.id);
    assert.equal(r.modelVersion, MODEL_VERSION);
    assert.equal(r.experimentId, configurationId(r.config));
    assert.equal(r.geometry.pixels.length, 378);
    assert.equal(r.physics.pixelMetrics.length, 378);
    assert.equal(r.input.width, 256); assert.equal(r.input.values.length, 256 ** 2);
    assert.equal(r.percept.values.length, 256 ** 2);
    assert.equal(r.physics.field.width, 61); assert.equal(r.physics.field.potentialMv.length, 61 ** 2);
    allFinite(r.input.values); allFinite(r.percept.values);
    const w = r.physics.waveform;
    for (const field of ['timeMs','currentUa','arrayCurrentUa','returnCurrentUa','polarizationMv','diodeVoltageV']) {
      assert.equal(w[field].length, w.timeMs.length); allFinite(w[field]);
    }
    for (let i = 1; i < w.timeMs.length; i++) assert.ok(w.timeMs[i] >= w.timeMs[i - 1]);
    for (let i = 0; i < w.timeMs.length; i++) close(w.arrayCurrentUa[i] + w.returnCurrentUa[i], 0, 1e-12, 'Array current balance');
    assert.ok(r.metrics.illuminatedPixels > 0 && r.metrics.illuminatedPixels <= 378);
    assert.ok(r.metrics.peakArrayCurrentUa > 0);
    assert.ok(r.metrics.maxKclResidualPa <= 0.200001);
    close(r.metrics.currentBalanceUa, 0, 1e-10, 'Snapshot current balance');
    close(r.metrics.nativeSnellenDenominator, 416.6666666666667, 1e-10, 'Geometric acuity equivalent');
    close(r.metrics.nominalNyquistCpd, 1.44, 1e-14, 'Nominal spatial sampling');
    close(r.metrics.implantFieldDeg, 2000 / 288, 1e-14, 'Retinal footprint');
    close(r.metrics.sceneFieldDeg, (2000 / 288) / r.config.zoom, 1e-14, 'Zoomed scene coverage');
    close(r.metrics.endTimeMs, r.config.cycles * 1000 / r.config.frequencyHz, 1e-10, 'Train duration');
    close(r.physics.field.snapshotTimeMs, (r.config.cycles - 1) * 1000 / r.config.frequencyHz + r.config.pulseDurationMs / 2, 1e-10, 'Field snapshot time');
    close(r.metrics.maxPotentialMv, maxAbs(r.physics.field.potentialMv), 1e-12, 'Sampled field maximum');
    close(r.metrics.maxBcDeltaMv, maxAbs(r.physics.field.bcDeltaMv), 1e-12, 'Sampled driving maximum');
    close(r.metrics.averageProjectionPowerMw, sum(r.input.values) / r.input.values.length * 4 * r.config.irradianceMwMm2 * r.config.pulseDurationMs * r.config.frequencyHz / 1000, 1e-11, 'Square projection optical power');
    close(r.metrics.averageArrayIncidentPowerMw, sum(r.geometry.pixels.map(p => p.illumination)) * r.geometry.pixelAreaUm2 * 1e-6 * r.config.irradianceMwMm2 * r.config.pulseDurationMs * r.config.frequencyHz / 1000, 1e-11, 'Reconstructed pixel-area optical power');
    assert.equal(progress.at(-1).phase, 'complete'); assert.equal(progress.at(-1).progress, 1);
    for (let i = 1; i < progress.length; i++) assert.ok(progress[i].progress >= progress[i - 1].progress);
    assert.match(r.provenance.interpretation, /independent/);
    assert.match(r.provenance.thermal, /temperature.*not calculated/);
    report.push({ preset: preset.id, experimentId: r.experimentId, selectedPixel: r.config.selectedPixelId,
      illuminatedPixels: r.metrics.illuminatedPixels, peakArrayCurrentUa: r.metrics.peakArrayCurrentUa,
      sampledPotentialMaximumMv: r.metrics.maxPotentialMv, maximumKclResidualPa: r.metrics.maxKclResidualPa,
      averageProjectionPowerMw: r.metrics.averageProjectionPowerMw, averageArrayIncidentPowerMw: r.metrics.averageArrayIncidentPowerMw,
      circuitTimeSteps: r.metrics.timeSteps });
  });
}

test('PRIMA optical raster orientation and area averaging agree with independently defined fields', () => {
  const geometry = createPrimaGeometry(), size = 256;
  for (const constant of [0, 0.37, 1]) {
    const image = { width: size, height: size, values: new Float64Array(size ** 2).fill(constant) };
    for (const value of samplePixelIllumination(image, geometry)) close(value, constant, 2e-15, 'Constant-image pixel average');
  }
  const values = Float64Array.from({ length: size ** 2 }, (_, i) => {
    const row = Math.floor(i / size), col = i % size;
    return row < size / 2 ? col >= size / 2 ? 0.9 : 0.7 : col >= size / 2 ? 0.3 : 0.1;
  });
  const quadrants = samplePixelIllumination({ width: size, height: size, values }, geometry);
  for (const p of geometry.pixels) if (Math.abs(p.xUm) > 100 && Math.abs(p.yUm) > 100) {
    const expected = p.yUm > 0 ? p.xUm > 0 ? 0.9 : 0.7 : p.xUm > 0 ? 0.3 : 0.1;
    // Naive addition of roughly 140 identical binary64 raster values incurs
    // a few ulps before division; this bound remains far below image precision.
    close(quadrants[p.index], expected, 1e-14, 'Right/superior coordinate convention');
  }
  const step = Float64Array.from({ length: size ** 2 }, (_, i) => i % size >= size / 2 ? 1 : 0);
  const averages = samplePixelIllumination({ width: size, height: size, values: step }, geometry);
  const straddling = geometry.pixels.filter(p => Math.abs(p.xUm - 25) < 1e-10);
  assert.ok(straddling.length > 0);
  // Analytical vertical cut of a 100-µm flat-to-flat hexagon centered at x=25:
  // the unilluminated trapezoid occupies 5/24 of its area.
  for (const p of straddling) {
    assert.ok(averages[p.index] < 1, 'Pixel is averaged, rather than sampled only at its center.');
    close(averages[p.index], 19 / 24, 0.05, 'Raster quadrature of a partial hexagon');
  }
});

test('PRIMA magnification preserves native sampling while changing scene coverage', async () => {
  const { result: native } = await runPreset('native');
  const { result: zoomed } = await runPreset('magnification');
  assert.equal(native.metrics.nativeSnellenDenominator, zoomed.metrics.nativeSnellenDenominator);
  assert.equal(native.percept.filter.cutoffCyclesPerImage, zoomed.percept.filter.cutoffCyclesPerImage);
  close(zoomed.metrics.sceneFieldDeg, native.metrics.sceneFieldDeg / 4, 1e-14, 'Fourfold scene magnification');
  assert.equal(zoomed.input.metadata.effectiveLandoltGapUm, 240);
});

test('PRIMA uniform half-intensity projection has the expected milliwatt conversion', async () => {
  const { result } = await runPreset('contrast');
  close(result.metrics.projectedMean, 0.5, 1e-14, 'Mean intensity of a complete sinusoidal grating');
  close(result.metrics.averageProjectionPowerMw, 1.176, 1e-12, '0.5 × 4mm² × 3.5mW/mm² × 0.168');
  assert.ok(result.metrics.averageArrayIncidentPowerMw < result.metrics.averageProjectionPowerMw,
    'Reconstructed occupied pixel area is smaller than the square projection.');
});

test('PRIMA zero irradiance gives zero electrical drive while preserving a conditional image approximation', async () => {
  const r = await simulateExperiment({ ...DEFAULT_CONFIG, irradianceMwMm2: 0 });
  assert.equal(r.metrics.illuminatedPixels, 0);
  for (const key of ['currentUa','arrayCurrentUa','returnCurrentUa','polarizationMv','diodeVoltageV']) assert.ok(r.physics.waveform[key].every(v => v === 0), key);
  assert.ok(r.physics.field.potentialMv.every(v => v === 0));
  assert.ok(r.physics.field.bcDeltaMv.every(v => v === 0));
  assert.equal(r.metrics.averageProjectionPowerMw, 0); assert.equal(r.metrics.averageArrayIncidentPowerMw, 0);
  assert.ok(r.percept.values.some(v => v > 0), 'Appearance remains explicitly conditional.');
  assert.ok(r.warnings.some(w => /does not predict.*without stimulation/.test(w)));
});

test('PRIMA blank image is electrically dark even under the sigmoid black-level assumption', async () => {
  const r = await simulateExperiment({ ...DEFAULT_CONFIG, stimulus: 'blank', contrastModel: 'sigmoid' });
  assert.ok(r.input.values.every(v => v === 0));
  assert.ok(r.physics.waveform.arrayCurrentUa.every(v => v === 0));
  assert.equal(r.metrics.averageProjectionPowerMw, 0);
  close(r.percept.metrics.outputBlackLevel, 1 / (1 + Math.exp(4)), 1e-15, 'Sigmoid appearance black level');
  assert.ok(r.percept.values.every(v => v === r.percept.metrics.outputBlackLevel));
  assert.ok(r.warnings.some(w => /not spontaneous neural activation/.test(w)));
});

test('PRIMA rejects invalid definitions and the exact rounded integration-step limit', () => {
  const bad = [null, [], { typo: 1 }, { irradianceMwMm2: '3.5' }, { irradianceMwMm2: NaN },
    { irradianceMwMm2: Infinity }, { cycles: 1.5 }, { imageSize: 64 }, { fieldGridSize: 100 },
    { pixelWidthUm: 75 }, { implantWidthUm: 3000 }, { taper: 0.2 }, { radiusExpansion: 0.4 },
    { selectedPixelId: 'P000' }, { selectedPixelId: 'P379' }, { stimulus: 'image' }, { zoom: 0 },
    { frequencyHz: 1, cycles: 8, timeStepMs: 0.025 },
    { frequencyHz: 5, cycles: 6, pulseDurationMs: 0.7, timeStepMs: 0.1 },
    { customImage: { width: 2, height: 2, values: [0,1] } },
    { customImage: { width: 2, height: 2, values: [0,1,NaN,0] } },
    { customImage: { width: 1025, height: 1, values: [] } }];
  for (const config of bad) { assert.throws(() => normalizeConfig(config)); assert.equal(validateConfig(config).valid, false); }
  assert.equal(normalizeConfig({ frequencyHz: 5, cycles: 6, pulseDurationMs: 5.6, timeStepMs: 0.1 }).cycles, 6);
});

test('PRIMA experiment IDs include nested image content and ignore object insertion order', () => {
  const image = { width: 2, height: 2, values: [0,0.25,0.75,1] };
  const a = { stimulus: 'image', customImage: image, zoom: 2 };
  const b = { zoom: 2, customImage: { values: Float64Array.from(image.values), height: 2, width: 2 }, stimulus: 'image' };
  assert.equal(configurationId(a), configurationId(b));
  const rearranged = { ...a, customImage: { ...image, values: [1,0.75,0.25,0] } };
  assert.notEqual(configurationId(a), configurationId(rearranged), 'Equal image mean is not equal image content.');
  const normalized = normalizeConfig(b);
  assert.ok(Array.isArray(normalized.customImage.values));
  normalized.customImage.values[0] = 1;
  assert.equal(b.customImage.values[0], 0, 'Normalization owns its image copy.');
});

test('PRIMA JSON restores definitions, ignores untrusted numerical results, and recomputes', async () => {
  const { result } = await runPreset('native');
  const text = exportExperiment(result), packet = JSON.parse(text);
  assert.equal(packet.schema, EXPORT_SCHEMA);
  assert.ok(Array.isArray(packet.results.percept.values));
  assert.deepEqual(parseExperiment(text), result.config);
  packet.results = { modelVersion: 'wrong', config: { stimulus: 'blank' }, percept: { values: [999] }, physics: { field: { potentialMv: [1e100] } } };
  packet.experimentId = 'untrusted-result-label';
  const definition = parseExperiment(JSON.stringify(packet));
  assert.deepEqual(definition, result.config);
  const restored = await simulateExperiment(definition);
  assert.equal(restored.experimentId, result.experimentId);
  assert.deepEqual(restored.percept.values, result.percept.values);
  assert.deepEqual(restored.physics.waveform.currentUa, result.physics.waveform.currentUa);
  assert.deepEqual(restored.physics.field.bcDeltaMv, result.physics.field.bcDeltaMv);
});

test('PRIMA export rejects changed definitions and imports reject absent settings or incompatible versions', async () => {
  const { result } = await runPreset('native');
  assert.throws(() => exportExperiment({ ...result, config: { ...result.config, zoom: 2 } }));
  assert.throws(() => exportExperiment({ ...result, modelVersion: 'old' }));
  assert.throws(() => parseExperiment('{'));
  assert.throws(() => parseExperiment('x'.repeat(20000001)));
  assert.throws(() => parseExperiment(JSON.stringify({ schema: EXPORT_SCHEMA, modelVersion: MODEL_VERSION })));
  assert.throws(() => parseExperiment(JSON.stringify({ schema: EXPORT_SCHEMA, modelVersion: MODEL_VERSION, settings: [] })));
  assert.throws(() => parseExperiment(JSON.stringify({ schema: EXPORT_SCHEMA, modelVersion: 'future', settings: result.config })));
  assert.throws(() => parseExperiment(JSON.stringify({ schema: 'other', modelVersion: MODEL_VERSION, settings: result.config })));
});

function mockClient() {
  const workers = [];
  const client = createPrimaClient({ workerFactory: () => {
    const worker = { sent: [], terminated: false, postMessage(message) { this.sent.push(message); }, terminate() { this.terminated = true; },
      message(type, id, extra = {}) { this.onmessage?.({ data: { type, id, ...extra } }); }, error(message) { this.onerror?.({ message }); } };
    workers.push(worker); return worker;
  } });
  return { client, workers };
}

test('PRIMA worker reuses a completed instance, ignores stale messages and preserves idle cancellation', async () => {
  const { client, workers } = mockClient(), progress = [];
  const first = client.run({ a: 1 }); const worker = workers[0], firstId = worker.sent[0].id;
  worker.message('result', firstId, { result: { ok: 1 } }); assert.deepEqual(await first, { ok: 1 });
  client.cancel(); assert.equal(worker.terminated, false);
  const second = client.run({ a: 2 }, { onProgress: p => progress.push(p) }), secondId = worker.sent[1].id;
  assert.equal(workers.length, 1);
  worker.message('progress', firstId, { progress: 'stale' }); worker.message('result', firstId, { result: 'stale' });
  worker.message('progress', secondId, { progress: 'current' }); worker.message('result', secondId, { result: { ok: 2 } });
  assert.deepEqual(await second, { ok: 2 }); assert.deepEqual(progress, ['current']);
  client.dispose(); assert.equal(worker.terminated, true);
  await assert.rejects(client.run({}), /disposed/);
});

test('PRIMA replacement and cancellation reject obsolete work without allowing late worker errors to break the next run', async () => {
  const { client, workers } = mockClient();
  const first = client.run({}), cancelled = assert.rejects(first, { name: 'AbortError' });
  const old = workers[0], second = client.run({}); await cancelled;
  assert.equal(old.terminated, true); assert.equal(workers.length, 2);
  const current = workers[1], id = current.sent[0].id;
  old.error('late failure from terminated worker');
  assert.equal(current.terminated, false, 'Stale worker error does not terminate the replacement.');
  old.message('result', old.sent[0].id, { result: 'stale' });
  current.message('result', id, { result: 'current' }); assert.equal(await second, 'current');
  const third = client.run({}), thirdCancelled = assert.rejects(third, { name: 'AbortError' });
  client.cancel(); await thirdCancelled; assert.equal(current.terminated, true);
  client.dispose();
});

test('PRIMA active worker failure is recoverable and disposal aborts the pending promise', async () => {
  const { client, workers } = mockClient();
  const failed = client.run({}), observed = assert.rejects(failed, /worker failed/);
  workers[0].error('worker failed'); await observed; assert.equal(workers[0].terminated, true);
  const pending = client.run({}), aborted = assert.rejects(pending, { name: 'AbortError' });
  assert.equal(workers.length, 2); client.dispose(); await aborted;
  assert.equal(workers[1].terminated, true);
});

test('PRIMA integration report records complete preset coverage', () => {
  assert.equal(report.length, 7);
  if (process.env.PRIMA_WRITE_INTEGRATION_REPORT === '1') writeFileSync(new URL('../docs/prima/INTEGRATION_VALIDATION.json', import.meta.url), JSON.stringify({
    schema: 'bts.prima.integration.validation.v1', modelVersion: MODEL_VERSION,
    presets: report, checks: ['378-pixel full numerical pipeline', 'optical raster orientation and area averaging', 'sampling and magnification units',
      'projection versus occupied-array optical power', 'zero electrical drive versus conditional percept', 'strict input and rounded time-step limits',
      'nested image content identifiers', 'definition-only JSON restore and stale export rejection', 'worker reuse, cancellation, disposal and stale events'],
    interpretation: 'Integration and numerical behavior checks; sampled fields and geometric sampling are not clinical predictions.',
  }, null, 2) + '\n');
});
