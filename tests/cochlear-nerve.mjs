import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createNerveModel, extracellularDrive, nerveGateRates, simulateFiber } from '../src/lib/cochlear/nerve.js';

const reference = JSON.parse(readFileSync(new URL('../docs/cochlear/nerve-reference.json', import.meta.url), 'utf8'));
const model = createNerveModel();
// Exact unbounded homogeneous point-source benchmark from Bachmaier 2019:
// 0.5 mm perpendicular to third dendritic node, resistivity 3 ohm m.
const lead = Float64Array.from(model.positionsMm, y => 1 / (4 * Math.PI / 3 * Math.hypot(0.5, y)));
const common = { model, leadFields: [lead], durationMs: 6, phaseWidthUs: 100, gapUs: 0,
  pulseForm: 'mono', dtUs: 1, events: [{ onsetUs: 1000, contactIndex: 0, amplitudeUA: 200 }] };

test('auditory cable is a 12.715 mm human-model morphology with a distal central-axon recording', () => {
  assert.equal(model.compartmentCount, 65);
  assert.equal(model.positionsMm[model.stimulationNodeIndex], 0);
  assert.equal(model.type[model.detectionIndex], 'axon-node');
  assert.equal(model.type[model.somaIndex], 'soma');
  assert.ok(model.positionsMm[model.detectionIndex] > model.positionsMm[model.somaIndex] + 4);
  assert.equal(model.totalLengthMm, 12.715);
  for (const c of model.capacitanceNf) assert.ok(c > 0 && Number.isFinite(c));
  for (const g of model.axialUs) assert.ok(g > 0 && Number.isFinite(g));
});

test('resting equilibrium is stable and uniform time-varying Ve cannot excite the cable', () => {
  const uniform = new Float64Array(model.compartmentCount).fill(7.4);
  assert.ok(extracellularDrive(model, uniform).every(x => x === 0));
  const r = simulateFiber({ ...common, leadFields: [uniform], durationMs: 10,
    events: [0, 1300.25, 6000].map(onsetUs => ({ onsetUs, contactIndex: 0, amplitudeUA: 1000 })),
    pulseForm: 'bi', phaseWidthUs: 50, gapUs: 8 });
  assert.equal(r.spikeTimesMs.length, 0);
  for (const v of r.finalMv) assert.ok(Math.abs(v + 65) < 1e-8);
});

test('extracellular axial drive conserves total current and is invariant to a potential offset', () => {
  const drive = extracellularDrive(model, lead);
  const shifted = extracellularDrive(model, Float64Array.from(lead, x => x + 32));
  assert.ok(Math.abs(drive.reduce((a, b) => a + b, 0)) < 1e-16);
  // The 466 uS somatic connections amplify cancellation roundoff after adding
  // the 32 mV common offset. Bound that roundoff explicitly in nA/uA.
  const roundoffBound = 8 * Number.EPSILON * 32 * Math.max(...model.axialUs);
  for (let i = 0; i < drive.length; i++) assert.ok(Math.abs(drive[i] - shifted[i]) < roundoffBound);
});

test('both removable gating-rate singularities have finite analytic limits', () => {
  assert.equal(nerveGateRates(-40).am, 12);
  assert.ok(Math.abs(nerveGateRates(-55).an - 1.2) < 1e-14);
  for (const v of [-40 - 1e-8, -40 + 1e-8, -55 - 1e-8, -55 + 1e-8]) {
    assert.ok(Object.values(nerveGateRates(v)).every(x => Number.isFinite(x) && x > 0));
  }
});

test('a suprathreshold pulse produces sequential proximal and distal axonal action potentials', () => {
  const r = simulateFiber(common);
  assert.equal(r.spikeTimesMs.length, 1);
  assert.equal(r.proximalSpikeTimesMs.length, 1);
  const conductionMs = r.spikeTimesMs[0] - r.proximalSpikeTimesMs[0];
  assert.ok(conductionMs > 0.05 && conductionMs < 0.2);
  assert.ok(r.maxMv[model.detectionIndex] > 15);
  assert.ok(r.minMv[model.detectionIndex] < -70);
});

test('six published current thresholds are bracketed within 0.5% at the reference 5 us timestep', () => {
  for (const c of reference.publishedThresholds.rows) {
    const spike = factor => simulateFiber({ ...common, dtUs: 5, phaseWidthUs: c.phaseWidthUs,
      pulseForm: c.pulseForm, events: [{ onsetUs: 2000, contactIndex: 0, amplitudeUA: c.thresholdUA * factor }],
      recordCompartments: [] }).spikeTimesMs.length;
    assert.equal(spike(0.995), 0, `below ${c.phaseWidthUs} us ${c.pulseForm}`);
    assert.equal(spike(1.005), 1, `above ${c.phaseWidthUs} us ${c.pulseForm}`);
  }
});

for (const c of reference.cases) {
  test(`independent author Brian2 reference: ${c.name}`, () => {
    const r = simulateFiber({ ...common, durationMs: c.durationMs, phaseWidthUs: c.widthUs,
      gapUs: c.gapUs, pulseForm: c.pulseForm, recordCompartments: c.recordCompartments,
      events: c.onsetUs.map(onsetUs => ({ onsetUs, contactIndex: 0, amplitudeUA: c.amplitudeUA })) });
    let square = 0; let count = 0; let max = 0;
    for (let k = 0; k < c.membraneMv.length; k++) for (let j = 0; j < c.timeMs.length; j++) {
      assert.ok(Math.abs(r.timeMs[j] - c.timeMs[j]) < 1e-7);
      const d = Math.abs(r.membraneMv[k][j] - c.membraneMv[k][j]);
      square += d * d; count++; max = Math.max(max, d);
    }
    assert.ok(Math.sqrt(square / count) < 0.025, 'RMS difference <0.025 mV across five compartments');
    assert.ok(max < 0.25, 'maximum sample difference <0.25 mV');
    assert.equal(r.spikeTimesMs.length, c.referenceSpikeTimesMs.length);
    for (let k = 0; k < r.spikeTimesMs.length; k++) {
      assert.ok(Math.abs(r.spikeTimesMs[k] - c.referenceSpikeTimesMs[k]) < 0.01);
    }
  });
}

test('fine timestep convergence and gate lookup accuracy are measured on a pulse train', () => {
  const input = { ...common, durationMs: 8, pulseForm: 'bi', phaseWidthUs: 50, gapUs: 8,
    events: [1000, 3000, 5000].map(onsetUs => ({ onsetUs, contactIndex: 0, amplitudeUA: 500 })) };
  const fine = simulateFiber({ ...input, dtUs: 0.25 });
  const half = simulateFiber({ ...input, dtUs: 0.5 });
  const standard = simulateFiber(input);
  const exact = simulateFiber({ ...input, useLookup: false });
  const rms = (a, b) => {
    let sum = 0; let n = 0;
    for (let k = 0; k < a.membraneMv.length; k++) for (let i = 0; i < a.timeMs.length; i++) {
      sum += (a.membraneMv[k][i] - b.membraneMv[k][i]) ** 2; n++;
    }
    return Math.sqrt(sum / n);
  };
  assert.equal(standard.spikeTimesMs.length, 3);
  assert.equal(half.spikeTimesMs.length, 3);
  assert.equal(fine.spikeTimesMs.length, 3);
  assert.ok(rms(half, fine) < rms(standard, fine) * 0.5);
  assert.ok(rms(standard, fine) < 0.8);
  assert.ok(rms(standard, exact) < 0.001);
  for (let k = 0; k < 3; k++) {
    assert.ok(Math.abs(standard.spikeTimesMs[k] - fine.spikeTimesMs[k]) < 0.006);
    assert.ok(Math.abs(standard.spikeTimesMs[k] - exact.spikeTimesMs[k]) < 1e-5);
  }
});

test('fractional pulse edges are integrated and sparse replay agrees with recorded membrane samples', () => {
  const r = simulateFiber({ ...common, pulseForm: 'bi', phaseWidthUs: 50.4, gapUs: 8.1, dtUs: 2,
    events: [{ onsetUs: 1000.3, contactIndex: 0, amplitudeUA: 500 }], replayEveryUs: 200 });
  assert.equal(r.replayMv.length, r.replayTimesMs.length * model.compartmentCount);
  for (let j = 0; j < r.replayTimesMs.length; j++) {
    assert.ok(Math.abs(r.replayTimesMs[j] - j * 0.2) < 1e-8);
    for (let k = 0; k < r.recordCompartments.length; k++) {
      assert.equal(r.replayMv[j * model.compartmentCount + r.recordCompartments[k]], r.membraneMv[k][j * 10]);
    }
  }
  assert.equal(r.spikeTimesMs.length, 1);
});

test('invalid fields and truncated pulse requests fail before numerical integration', () => {
  assert.throws(() => simulateFiber({ ...common, leadFields: [[NaN]] }), /Invalid lead field/);
  assert.throws(() => simulateFiber({ ...common, durationMs: 1.05 }), /complete pulse/);
  assert.throws(() => simulateFiber({ ...common, dtUs: 0 }), /Timestep/);
  assert.throws(() => simulateFiber({ ...common, events: [{ onsetUs: 0, contactIndex: 0, amplitudeUA: -1 }] }), /Current amplitude/);
});
