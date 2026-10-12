import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { freshConfig } from '../src/lib/cortex/config.js';
import { runExperiment } from '../src/lib/cortex/experiment.js';

async function request(config, id) {
  const worker = new Worker(new URL('./fixtures/cortex-worker-adapter.mjs', import.meta.url));
  const progress = [];
  try {
    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Worker timed out')), 10000);
      worker.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      worker.on('message', (message) => {
        assert.equal(message.id, id);
        if (message.type === 'progress') progress.push(message.progress);
        else {
          clearTimeout(timeout);
          resolve(message);
        }
      });
      worker.postMessage({ id, config });
    });
    return { result, progress };
  } finally {
    await worker.terminate();
  }
}
test('worker returns matching typed arrays, monotonic progress and request identity', async () => {
  const config = freshConfig(),
    actual = await request(config, 42),
    expected = runExperiment(config);
  assert.equal(actual.result.type, 'result');
  assert.ok(actual.result.result.timeMs instanceof Float64Array);
  assert.deepEqual(actual.result.result.totalUv, expected.totalUv);
  assert.ok(actual.progress.length > 1);
  assert.equal(actual.progress.at(-1), 1);
  assert.ok(actual.progress.every((v, i) => !i || v >= actual.progress[i - 1]));
});
test('worker reports invalid configurations without returning fake traces', async () => {
  const config = freshConfig();
  config.solver.dtMs = 0;
  const actual = await request(config, 7);
  assert.equal(actual.result.type, 'error');
  assert.match(actual.result.message, /Timestep/);
  assert.equal(actual.result.result, undefined);
});
