import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { referenceCases } from '../scripts/cortex-reference-input.mjs';
import { runExperiment } from '../src/lib/cortex/experiment.js';
import { leadField } from '../src/lib/cortex/volume-conductor.js';

const read = (path) => readFileSync(new URL(path, import.meta.url));
const hash = (value) => createHash('sha256').update(value).digest('hex');
const fixture = JSON.parse(read('./fixtures/cortex-lfpykit-forward.json'));
const inputs = referenceCases();

test('LFPykit fixture records exact generators, inputs and independent NEURON currents', () => {
  assert.equal(fixture.generator.lfpykitVersion, '0.6.2');
  assert.equal(fixture.generator.inputSha256, hash(JSON.stringify(inputs) + '\n'));
  assert.equal(
    fixture.generator.scriptSha256,
    hash(read('../scripts/cortex-lfpykit-reference.py')),
  );
  assert.equal(
    fixture.generator.inputScriptSha256,
    hash(read('../scripts/cortex-reference-input.mjs')),
  );
  assert.equal(
    fixture.generator.neuronFixtureSha256,
    hash(read('./fixtures/cortex-neuron-arbor.json')),
  );
  assert.equal(fixture.cases.length, inputs.length * 2);
});

for (const reference of fixture.cases)
  test(`${reference.id}/${reference.approximation}: forward coefficients and recordings match NEURON + LFPykit`, () => {
    const input = inputs.find((c) => c.id === reference.id);
    const c = structuredClone(input.config);
    c.recording.sourceModel = reference.approximation;
    const matrix = leadField(
      input.nodes,
      input.recordingSites,
      c.tissue.conductivitySPerM,
      reference.approximation,
      c.recording.exclusionUm,
    );
    let coefficientError = 0,
      signalError = 0;
    assert.ok(reference.minAxisClearanceUm > 0);
    for (let channel = 0; channel < 2; channel++)
      for (let i = 0; i < input.nodes.length; i++)
        coefficientError = Math.max(
          coefficientError,
          Math.abs(matrix[channel][i] - reference.coefficientsUvPerNa[channel][i]),
        );
    assert.ok(coefficientError < 1e-10, `Coefficient error ${coefficientError} µV/nA`);
    const result = runExperiment(c);
    for (const sample of reference.samples) {
      for (const field of ['neuralUv', 'appliedUv', 'totalUv'])
        for (let channel = 0; channel < 2; channel++)
          signalError = Math.max(
            signalError,
            Math.abs(result[field][channel][sample.step] - sample[field][channel]),
          );
      signalError = Math.max(
        signalError,
        Math.abs(result.differentialUv[sample.step] - sample.differentialUv),
      );
    }
    assert.ok(signalError < 1e-8, `End-to-end signal error ${signalError} µV`);
    console.log(
      `${reference.id}/${reference.approximation}: coefficient error ${coefficientError} µV/nA; signal error ${signalError} µV`,
    );
  });
