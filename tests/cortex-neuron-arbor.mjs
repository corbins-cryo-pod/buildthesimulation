import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { referenceCases } from '../scripts/cortex-reference-input.mjs';
import { runExperiment } from '../src/lib/cortex/experiment.js';

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/cortex-neuron-arbor.json', import.meta.url), 'utf8'),
);
const inputs = referenceCases();
const hash = (value) => createHash('sha256').update(value).digest('hex');

test('branched NEURON reference preserves input provenance and passive adapter invariants', () => {
  assert.equal(fixture.generator.neuronVersion, '9.0.1');
  assert.equal(fixture.generator.inputSha256, hash(JSON.stringify(inputs) + '\n'));
  for (const [file, key] of [
    ['cortex-reference-input.mjs', 'inputScriptSha256'],
    ['cortex-neuron-arbor-reference.py', 'scriptSha256'],
  ])
    assert.equal(
      hash(readFileSync(new URL(`../scripts/${file}`, import.meta.url))),
      fixture.generator[key],
      `Regenerate the reference after changing ${file}.`,
    );
  assert.deepEqual(
    fixture.cases.map((c) => c.id),
    inputs.map((c) => c.id),
  );
  assert.equal(fixture.adapterChecks.length, 2);
  for (const check of fixture.adapterChecks) {
    assert.ok(check.maxVoltageDifferenceMv < 1e-8);
    assert.ok(check.maxCurrentDifferenceNa < 1e-10);
    assert.ok(check.diagnostics.maxConnectorCurrentNa < 1e-12);
    assert.ok(check.diagnostics.maxConservationResidualNa < 1e-10);
    assert.ok(check.diagnostics.maxPrescribedFieldErrorMv < 1e-8);
  }
});

for (const reference of fixture.cases)
  test(`${reference.id}: full arbor matches NEURON voltage and total membrane current`, () => {
    const input = inputs.find((c) => c.id === reference.id);
    assert.deepEqual(reference.config, input.config);
    assert.deepEqual(
      reference.compartmentIds,
      input.nodes.map((n) => n.id),
    );
    for (const [i, geometry] of reference.neuronGeometry.entries()) {
      assert.equal(geometry.id, input.nodes[i].id);
      for (const field of ['areaUm2', 'diameterUm', 'lengthUm'])
        assert.ok(Math.abs(geometry[field] - input.nodes[i][field]) < 1e-9);
    }
    assert.ok(reference.diagnostics.maxConnectorCurrentNa < 1e-12);
    assert.ok(reference.diagnostics.maxConservationResidualNa < 1e-10);
    assert.ok(reference.diagnostics.maxPrescribedFieldErrorMv < 1e-8);
    const result = runExperiment(input.config),
      n = result.diagnostics.compartments;
    let maxVoltageErrorMv = 0,
      maxCurrentErrorNa = 0;
    assert.equal(n, 48);
    assert.equal(reference.samples.length, 14);
    for (const sample of reference.samples) {
      assert.ok(Math.abs(result.timeMs[sample.step] - sample.timeMs) < 1e-12);
      for (let i = 0; i < n; i++) {
        maxVoltageErrorMv = Math.max(
          maxVoltageErrorMv,
          Math.abs(result.membraneMv[sample.step * n + i] - sample.voltageMv[i]),
        );
        maxCurrentErrorNa = Math.max(
          maxCurrentErrorNa,
          Math.abs(result.membraneCurrentNa[sample.step * n + i] - sample.membraneCurrentNa[i]),
        );
      }
    }
    assert.ok(maxVoltageErrorMv < 1e-8, `NEURON voltage difference ${maxVoltageErrorMv} mV`);
    assert.ok(maxCurrentErrorNa < 1e-10, `NEURON current difference ${maxCurrentErrorNa} nA`);
    console.log(`${reference.id}: NEURON error ${maxVoltageErrorMv} mV, ${maxCurrentErrorNa} nA`);
  });
