import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createPassiveCable, stepPassiveCable } from '../src/lib/cortex/passive-cable.js';
import { windowAverage } from '../src/lib/cortex/experiment.js';

test('passive kernel matches independent pinned NEURON 9.0.1 voltages and total membrane currents', () => {
  const fixture = JSON.parse(
    readFileSync(new URL('./fixtures/cortex-neuron-passive.json', import.meta.url), 'utf8'),
  );
  assert.equal(fixture.generator.neuronVersion, '9.0.1');
  const generator = readFileSync(new URL('../scripts/cortex-neuron-reference.py', import.meta.url));
  assert.equal(
    createHash('sha256').update(generator).digest('hex'),
    fixture.generator.scriptSha256,
    'Regenerate the fixture if its generator changes.',
  );
  const c = fixture.config,
    dx = c.lengthUm / c.compartments;
  const nodes = Array.from({ length: c.compartments }, (_, i) => ({
    id: `segment-${i}`,
    parent: i - 1,
    lengthUm: dx,
    diameterUm: c.diameterUm,
    areaUm2: Math.PI * c.diameterUm * dx,
  }));
  const cable = createPassiveCable(nodes, c),
    injectionNa = new Float64Array(c.compartments);
  let maxVoltageErrorMv = 0,
    maxCurrentErrorNa = 0;
  for (let step = 0; step <= Math.round(c.durationMs / c.dtMs); step++) {
    const sample = fixture.samples.find((s) => s.step === step);
    if (sample)
      for (let i = 0; i < c.compartments; i++) {
        maxVoltageErrorMv = Math.max(
          maxVoltageErrorMv,
          Math.abs(cable.voltageMv[i] - sample.voltageMv[i]),
        );
        maxCurrentErrorNa = Math.max(
          maxCurrentErrorNa,
          Math.abs(cable.membraneCurrentNa[i] - sample.membraneCurrentNa[i]),
        );
      }
    if (step < Math.round(c.durationMs / c.dtMs)) {
      injectionNa[0] =
        c.injectionNa * windowAverage(step * c.dtMs, c.dtMs, c.onsetMs, c.injectionDurationMs);
      stepPassiveCable(cable, c.dtMs, { injectionNa });
    }
  }
  assert.ok(maxVoltageErrorMv < 1e-8, `NEURON voltage difference ${maxVoltageErrorMv} mV`);
  assert.ok(
    maxCurrentErrorNa < 1e-10,
    `NEURON membrane-current difference ${maxCurrentErrorNa} nA`,
  );
  console.log(
    `NEURON cross-check: max voltage error ${maxVoltageErrorMv} mV; max current error ${maxCurrentErrorNa} nA`,
  );
});
