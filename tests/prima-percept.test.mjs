import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPerceptFixture } from '../scripts/prima-reference/load_fixture.mjs';
import { inflateSync } from 'node:zlib';
import { createTukeyWindow, gammaTransform, predictPercept, roundTiesToEven, sigmoidTransform, validateImage } from '../src/lib/prima/percept.mjs';
import { renderInput, sampleImageAt, STIMULUS_IDS } from '../src/lib/prima/stimuli.mjs';

const reference = loadPerceptFixture();
function decode(encoded, count) {
  const buffer = inflateSync(Buffer.from(encoded, 'base64'));
  assert.equal(buffer.length, count * 8);
  return Float64Array.from({ length: count }, (_, i) => buffer.readDoubleLE(i * 8));
}
function compare(actual, expected, name, tolerance = 5e-12) {
  assert.equal(actual.length, expected.length);
  let error = 0;
  for (let i = 0; i < actual.length; i++) {
    assert.ok(Number.isFinite(actual[i]), `${name}: finite at ${i}`);
    error = Math.max(error, Math.abs(actual[i] - expected[i]));
  }
  assert.ok(error < tolerance, `${name}: maximum absolute error ${error}, tolerance ${tolerance}`);
  return error;
}

for (const fixture of reference.cases) {
  test(`PRIMA percept matches native ProViSim v2.0.0: ${fixture.name}`, () => {
    const count = fixture.size ** 2;
    const input = { width: fixture.size, height: fixture.size, values: decode(fixture.input, count) };
    const result = predictPercept(input, fixture.settings);
    const mask = createTukeyWindow(fixture.settings.cutoffCyclesPerImage ?? 10, fixture.size,
      { alpha: fixture.settings.taper, radiusExpansion: fixture.settings.radiusExpansion });
    compare(mask.values, decode(fixture.mask, count), `${fixture.name} mask`);
    compare(result.spatialValues, decode(fixture.spatial, count), `${fixture.name} spatial`);
    compare(result.values, decode(fixture.expected, count), `${fixture.name} percept`);
  });
}

test('PRIMA default 256-pixel UI stimulus matches the independently rasterized Python Landolt input', () => {
  const fixture = reference.cases.find(c => c.name === 'default-ui-landolt-256');
  assert.ok(fixture, 'The native-resolution published reference is required.');
  const input = renderInput();
  assert.equal(input.width, 256);
  assert.deepEqual(input.values, decode(fixture.input, 256 ** 2));
});

test('PRIMA published filter preserves the upstream padding and separately reports nominal cutoff and actual support', () => {
  const mask = createTukeyWindow(10, 256);
  assert.equal(mask.windowSize, 27);
  assert.equal(mask.padBefore, 114);
  assert.equal(mask.maskCenter, 127);
  assert.equal(mask.dcIndex, 128);
  assert.equal(mask.cutoffCyclesPerImage, 10);
  assert.ok(mask.maximumSupportRadiusCycles > 13);
  assert.equal(mask.dcGain, 1);
  assert.notEqual(mask.values[128 * 256 + 139], mask.values[128 * 256 + 117]);
});

test('PRIMA tone curves preserve their published meanings', () => {
  for (const x of [0, 0.5, 1]) assert.equal(gammaTransform(x, 2.6), x);
  assert.ok(gammaTransform(0.25, 2.6) > 0.25);
  assert.ok(gammaTransform(0.75, 2.6) < 0.75);
  assert.ok(Math.abs(sigmoidTransform(0, 20, 0.2) - 0.01798620996209156) < 1e-15);
  assert.equal(sigmoidTransform(0.2, 20, 0.2), 0.5);
});

test('PRIMA frequency response agrees with sinusoidal amplitude attenuation', () => {
  const size = 128, frequency = 11;
  const values = Float64Array.from({ length: size * size }, (_, i) => 0.5 + 0.2 * Math.cos(2 * Math.PI * frequency * (i % size) / size));
  const output = predictPercept({ width: size, height: size, values }, { contrastModel: 'none' });
  let projection = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) projection += (output.values[y * size + x] - 0.5) * Math.cos(2 * Math.PI * frequency * x / size);
  const observedGain = 2 * projection / (size * size * 0.2);
  assert.ok(Math.abs(observedGain - output.frequencyResponse.find(p => p.cyclesPerImage === frequency).gain) < 2e-12);
});

test('PRIMA empty illumination remains exactly dark with gamma but has the documented sigmoid black level', () => {
  const input = renderInput({ stimulus: 'blank', contrast: 0.2, brightness: 2 }, 128);
  assert.ok(input.values.every(v => v === 0));
  assert.ok(predictPercept(input).values.every(v => v === 0));
  const sigmoid = predictPercept(input, { contrastModel: 'sigmoid' });
  assert.ok(sigmoid.values.every(v => v === sigmoid.metrics.outputBlackLevel));
});

test('PRIMA stimulus coordinates and Landolt orientation are explicit', () => {
  const right = renderInput({ stimulus: 'landolt', orientation: 'right', landoltGapUm: 120 }, 256);
  assert.equal(sampleImageAt(right, 240, 0), 0);
  assert.equal(sampleImageAt(right, -240, 0), 1);
  assert.equal(sampleImageAt(right, 0, 240), 1);
  const up = renderInput({ stimulus: 'landolt', orientation: 'up', landoltGapUm: 120 }, 256);
  assert.equal(sampleImageAt(up, 0, 240), 0);
  assert.equal(sampleImageAt(up, 0, -240), 1);
});

test('PRIMA zoom changes source feature size and not the physical percept cutoff', () => {
  const small = renderInput({ stimulus: 'landolt', landoltGapUm: 60, zoom: 1 }, 128);
  const large = renderInput({ stimulus: 'landolt', landoltGapUm: 60, zoom: 4 }, 128);
  assert.equal(small.metadata.effectiveLandoltGapUm, 60);
  assert.equal(large.metadata.effectiveLandoltGapUm, 240);
  assert.ok(large.values.reduce((a,b) => a+b, 0) > 10 * small.values.reduce((a,b) => a+b, 0));
  assert.equal(predictPercept(small).filter.cutoffCyclesPerImage, predictPercept(large).filter.cutoffCyclesPerImage);
});

test('PRIMA optical translation moves a spot toward positive x and superior y', () => {
  const image = renderInput({ stimulus: 'spot', spotRadiusUm: 100, offsetXUm: 300, offsetYUm: 200 }, 256);
  let sum = 0, xsum = 0, ysum = 0;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const w = image.values[y * 256 + x]; sum += w;
    xsum += w * ((x + 0.5) / 256 - 0.5) * 2000;
    ysum += w * (0.5 - (y + 0.5) / 256) * 2000;
  }
  assert.ok(Math.abs(xsum / sum - 300) < 1);
  assert.ok(Math.abs(ysum / sum - 200) < 1);
});

test('PRIMA local image resampling is deterministic and preserves orientation', () => {
  const customImage = { width: 2, height: 2, values: [1,0,0,0] };
  const input = renderInput({ stimulus: 'image', customImage }, 128);
  assert.ok(sampleImageAt(input, -500, 500) > 0.9);
  assert.ok(sampleImageAt(input, 500, -500) < 0.01);
  assert.deepEqual(input.values, renderInput({ stimulus: 'image', customImage }, 128).values);
});

test('PRIMA all synthetic stimuli yield bounded finite optical inputs and valid percepts', () => {
  for (const stimulus of STIMULUS_IDS.filter(s => s !== 'image')) {
    const input = renderInput({ stimulus, blurSigmaPx: 1 }, 128);
    validateImage(input, { square: true });
    const output = predictPercept(input);
    validateImage(output, { square: true });
  }
});

test('PRIMA invalid images and sampling configurations fail explicitly', () => {
  assert.throws(() => validateImage({ width: 4, height: 4, values: [0] }));
  assert.throws(() => validateImage({ width: 1, height: 1, values: [NaN] }));
  assert.throws(() => validateImage({ width: 1, height: 1, values: [-0.1] }));
  assert.throws(() => renderInput({ stimulus: 'image' }));
  assert.throws(() => renderInput({ zoom: 0 }));
  assert.throws(() => predictPercept({ width: 20, height: 20, values: new Float64Array(400) }));
  assert.throws(() => createTukeyWindow(100, 128));
  assert.throws(() => predictPercept(renderInput({},128), { contrastModel: 'patient-prediction' }));
});

test('PRIMA window sizing uses the Python ties-to-even convention', () => {
  assert.equal(roundTiesToEven(2.5), 2);
  assert.equal(roundTiesToEven(3.5), 4);
  assert.equal(roundTiesToEven(10.5), 10);
});
