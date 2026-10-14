import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { activeReferenceCases } from '../scripts/cortex-active-reference-input.mjs';
import { runExperiment } from '../src/lib/cortex/experiment.js';
const read = (p) => readFileSync(new URL(p, import.meta.url));
const hash = (v) => createHash('sha256').update(v).digest('hex');
const fixture = JSON.parse(read('./fixtures/cortex-active-thresholds.json'));
test('threshold references preserve the independent native generator and exact input', () => {
  assert.equal(fixture.generator.neuronVersion, '9.0.1');
  assert.equal(
    fixture.generator.scriptSha256,
    hash(read('../scripts/cortex-active-threshold-reference.py')),
  );
  assert.equal(
    fixture.generator.modelGeneratorSha256,
    hash(read('../scripts/cortex-active-model.py')),
  );
  assert.equal(
    fixture.generator.inputScriptSha256,
    hash(read('../scripts/cortex-active-reference-input.mjs')),
  );
  assert.equal(fixture.generator.inputSha256, hash(JSON.stringify(activeReferenceCases()) + '\n'));
});
for (const ref of fixture.cases)
  test(`${ref.id}: independent threshold bracket agrees with browser kernel`, () => {
    assert.ok((ref.upperCrossing - ref.lowerNoCrossing) / ref.upperCrossing < 0.05);
    for (const [amplitude, expected] of [
      [ref.lowerNoCrossing, false],
      [ref.upperCrossing, true],
    ]) {
      const c = structuredClone(ref.config);
      c.protocol[c.protocol.mode === 'intracellular-current' ? 'injectionNa' : 'amplitudeUa'] =
        amplitude;
      const r = runExperiment(c);
      const crosses =
        ref.criterion === 'soma'
          ? r.spikes.some((s) => s.timeMs <= ref.windowEndMs)
          : Array.from(r.firstCrossingByCompartment).some(
              (t) => Number.isFinite(t) && t <= ref.windowEndMs,
            );
      assert.equal(crosses, expected, `${amplitude} ${ref.units} threshold classification differs`);
    }
  });
