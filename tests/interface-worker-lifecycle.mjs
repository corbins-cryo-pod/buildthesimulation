import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { freshInterfaceConfig, INTERFACE_COMPARISON_VERSION } from '../src/lib/cortex/interface-contract.js';
import { validateInterfaceReplay } from '../src/lib/cortex/interface-replay-validation.js';

test('retained worker echoes job identities and survives transferable results without corrupting caches', { timeout: 60000 }, async () => {
  const worker = new Worker(`
    import { parentPort, workerData } from 'node:worker_threads';
    import { readFile } from 'node:fs/promises';
    globalThis.self = { postMessage: (message, buffers) => parentPort.postMessage(message, buffers) };
    globalThis.fetch = async path => new Response(await readFile(new URL('.' + path, workerData.publicRoot)));
    await import(workerData.entry);
    parentPort.on('message', data => self.onmessage({ data }));
    parentPort.postMessage({ type: 'ready' });
  `, { eval: true, type: 'module', workerData: {
    publicRoot: new URL('../public/', import.meta.url).href,
    entry: new URL('../src/lib/cortex/interface-worker.js', import.meta.url).href,
  } });
  const inbox = [], waiters = [];
  worker.on('message', message => {
    inbox.push(message);
    for (const waiter of [...waiters]) if (waiter.predicate(message)) { waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(message); }
  });
  const wait = predicate => new Promise((resolve, reject) => {
    const existing = inbox.find(predicate); if (existing) return resolve(existing);
    const entry = { predicate, resolve, reject }; waiters.push(entry);
  });
  worker.on('error', error => { for (const waiter of waiters.splice(0)) waiter.reject(error); });
  try {
    await wait(message => message.type === 'ready');
    const config = { ...freshInterfaceConfig(), count: 1, durationMs: 20, startMs: 5, mode: 'evoked', amplitudeUa: 1 };
    const run = async jobId => {
      worker.postMessage({ type: 'run', jobId, config });
      const message = await wait(message => message.jobId === jobId && ['result','error'].includes(message.type));
      assert.equal(message.type, 'result', message.message);
      return validateInterfaceReplay(message.result);
    };
    const first = await run('first'), second = await run('second');
    assert.deepEqual(second.cells[0].membraneMv, first.cells[0].membraneMv);
    assert.deepEqual(second.neuralUv, first.neuralUv);
    assert.deepEqual(second.currentUa, first.currentUa);
    assert.ok(first.cells[0].membraneMv.byteLength > 0);
    worker.postMessage({ type: 'compare', jobId: 'paired', config: { ...config, mode: 'recording' },
      spec: { version: INTERFACE_COMPARISON_VERSION, kind: 'geometry', contactIndex: 0,
        baselineVariantId: '12x12', variantVariantId: '30x30', eventMatchWindowMs: 5 } });
    const message = await wait(message => message.jobId === 'paired' && ['comparison','error'].includes(message.type));
    assert.equal(message.type, 'comparison', message.message);
    const pair = validateInterfaceReplay(message.comparison);
    assert.deepEqual(pair.baseline.cells[0].membraneMv, pair.variant.cells[0].membraneMv);
    assert.ok(pair.analysis.contacts[0].neural.maximumAbsoluteDeltaUv > 0);
    assert.ok(inbox.filter(message => ['progress','geometry','result','comparison'].includes(message.type)).every(message => ['first','second','paired'].includes(message.jobId)));
  } finally { await worker.terminate(); }
});
