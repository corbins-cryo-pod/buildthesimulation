import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { currentStepReferenceCases } from '../scripts/cortex-current-step-reference-input.mjs';
import { runExperiment } from '../src/lib/cortex/experiment.js';
const read = (p) => readFileSync(new URL(p, import.meta.url));
const hash = (v) => createHash('sha256').update(v).digest('hex');
const fixture = JSON.parse(read('./fixtures/cortex-current-step-neuron.json'));
const inputs = currentStepReferenceCases();
test('long current-step references retain pinned native source and exact input provenance', () => {
  assert.equal(fixture.generator.neuronVersion, '9.0.1');
  assert.equal(fixture.generator.lfpykitVersion, '0.6.2');
  assert.equal(fixture.generator.inputSha256, hash(JSON.stringify(inputs) + '\n'));
  for (const [path, sha] of Object.entries(fixture.generator.sourceHashes))
    assert.equal(hash(read('../' + path)), sha, path);
  assert.equal(fixture.cases.length, 2);
});
for (const ref of fixture.cases)
  test(`${ref.id}: active cell/spikes/currents/recordings match native NEURON + LFPykit`, () => {
    const input = inputs.find((c) => c.id === ref.id);
    assert.deepEqual(ref.config, input.config);
    const r = runExperiment(input.config),
      n = r.diagnostics.compartments;
    let voltageSq = 0,
      voltageMax = 0,
      currentSq = 0,
      currentPeak = 0,
      count = 0;
    const complete = ref.completeTrace,
      compressed = read('./fixtures/' + complete.file);
    assert.equal(hash(compressed), complete.sha256);
    const packed = gunzipSync(compressed),
      physicalCount = ref.physicalIndices.length,
      size = complete.frames * physicalCount;
    assert.equal(packed.byteLength, size * 8);
    assert.equal(complete.frames, r.timeMs.length);
    const voltageAcc = new Float64Array(physicalCount),
      currentAcc = new Float64Array(physicalCount);
    for (let frame = 0; frame < complete.frames; frame++)
      for (let j = 0; j < physicalCount; j++) {
        const k = frame * physicalCount + j,
          i = ref.physicalIndices[j];
        voltageAcc[j] += packed.readInt32LE(k * 4);
        currentAcc[j] += packed.readInt32LE((size + k) * 4);
        const v = voltageAcc[j] * complete.voltageQuantumMv,
          current = currentAcc[j] * complete.currentQuantumNa;
        const e = r.membraneMv[frame * n + i] - v;
        voltageSq += e * e;
        voltageMax = Math.max(voltageMax, Math.abs(e));
        currentSq += (r.membraneCurrentNa[frame * n + i] - current) ** 2;
        currentPeak = Math.max(currentPeak, Math.abs(current));
        count++;
      }
    const voltageRms = Math.sqrt(voltageSq / count),
      currentRms = Math.sqrt(currentSq / count);
    assert.ok(voltageRms < 0.1, `Voltage RMS ${voltageRms} mV`);
    assert.ok(voltageMax < 1, `Voltage maximum ${voltageMax} mV`);
    assert.ok(currentRms < Math.max(1e-4, 0.01 * currentPeak), `Current RMS ${currentRms} nA`);
    assert.equal(r.spikes.length, ref.spikeTimesMs.length);
    for (let k = 0; k < r.spikes.length; k++)
      assert.ok(Math.abs(r.spikes[k].timeMs - ref.spikeTimesMs[k]) < 0.1);
    for (const i of ref.physicalIndices) {
      const t = ref.firstCrossingTimesMs[i];
      if (t === null) assert.ok(Number.isNaN(r.firstCrossingByCompartment[i]));
      else assert.ok(Math.abs(r.firstCrossingByCompartment[i] - t) < 0.1);
    }
    let signalRmsMax = 0;
    for (const field of ['neuralUv', 'appliedUv', 'totalUv'])
      for (let ch = 0; ch < 2; ch++) {
        let sq = 0,
          peak = 0;
        for (let k = 0; k < ref.signals[field].length; k++) {
          const v = ref.signals[field][k][ch];
          sq += (r[field][ch][k] - v) ** 2;
          peak = Math.max(peak, Math.abs(v));
        }
        const rms = Math.sqrt(sq / ref.signals[field].length);
        signalRmsMax = Math.max(signalRmsMax, rms);
        assert.ok(rms < Math.max(1e-4, 0.01 * peak), `${field} RMS ${rms} µV`);
      }
    assert.ok(r.diagnostics.maxKclResidualNa < 1e-8);
    assert.ok(r.diagnostics.maxConservationResidualNa < 1e-8);
    console.log(
      `${ref.id}: voltage RMS ${voltageRms} mV, max ${voltageMax} mV; current RMS ${currentRms} nA; signal RMS ${signalRmsMax} µV; soma spikes ${r.spikes.length}`,
    );
  });
