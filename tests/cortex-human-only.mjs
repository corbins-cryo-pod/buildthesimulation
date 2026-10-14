import test from 'node:test';
import assert from 'node:assert/strict';
import { freshConfig, freshActiveConfig, ACTIVE_MODEL_ID } from '../src/lib/cortex/config.js';
import { modelRegistry } from '../src/lib/cortex/model-registry.js';
import { EXAMPLES, getExampleConfig } from '../src/lib/cortex/examples.js';
import { parseLaboratoryConfig } from '../src/lib/cortex/laboratory.js';
import { encodeJson } from '../src/lib/cortex/experiment.js';

test('the interactive registry and every curated example use the published human cell', () => {
  assert.deepEqual(modelRegistry.map(m => m.id), [ACTIVE_MODEL_ID]);
  assert.equal(EXAMPLES.length, 9);
  assert.ok(EXAMPLES.every(e => e.modelId === ACTIVE_MODEL_ID && e.config.neuron.modelId === ACTIVE_MODEL_ID));
  assert.throws(() => getExampleConfig('passive-subthreshold'), /Unknown cortex example/);
  const config = getExampleConfig('active-intracellular-spike');
  assert.deepEqual(parseLaboratoryConfig(encodeJson(config)), config);
});

test('laboratory imports reject retired passive physiology rather than relabeling it', () => {
  const old = freshConfig();
  assert.throws(() => parseLaboratoryConfig(encodeJson(old)), /retired.*Load a human cell example/);
  assert.equal(old.neuron.modelId, undefined);
  const active = freshActiveConfig();
  assert.deepEqual(parseLaboratoryConfig(encodeJson(active)), active);
  active.neuron.modelId = 'unknown';
  assert.throws(() => parseLaboratoryConfig(encodeJson(active)), /Unknown active model/);
});
