import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { freshConfig, freshActiveConfig } from '../src/lib/cortex/config.js';
import { resultBuffers } from '../src/lib/cortex/buffers.js';
import { runExperiment } from '../src/lib/cortex/experiment.js';

async function request(config, id, timeoutMs = 10000) {
  const worker = new Worker(new URL('./fixtures/cortex-worker-adapter.mjs', import.meta.url));
  const progress = [];
  try {
    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Worker timed out')), timeoutMs);
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
test('active worker transfers complete nested channel outputs and computed spike events', async () => {
  const config = freshActiveConfig();
  config.solver.durationMs = 20;
  const { result, progress } = await request(config, 43, 60000);
  assert.equal(result.type, 'result', result.message);
  const r = result.result;
  assert.equal(r.engineVersion, 'cortex-active/0.2.0');
  assert.equal(r.timeMs.length, 401);
  for (const values of Object.values(r.channels)) {
    assert.ok(values instanceof Float64Array);
    assert.equal(values.length, r.timeMs.length * r.diagnostics.compartments);
    assert.ok(values.every(Number.isFinite));
  }
  assert.equal(r.spikes.length, 1);
  assert.ok(Math.abs(r.spikes[0].timeMs - 9.293949523604386) < 0.1);
  assert.equal(r.diagnostics.outputBytes, resultBuffers(r).reduce((s, b) => s + b.byteLength, 0));
  assert.equal(progress.at(-1), 1);
  assert.ok(progress.every((v, i) => !i || v >= progress[i - 1]));
});
test('worker reports invalid configurations without returning fake traces', async () => {
  const config = freshConfig();
  config.solver.dtMs = 0;
  const actual = await request(config, 7);
  assert.equal(actual.result.type, 'error');
  assert.match(actual.result.message, /Timestep/);
  assert.equal(actual.result.result, undefined);
});
