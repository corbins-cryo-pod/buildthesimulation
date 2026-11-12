/** Real Node Worker adapter for the production browser Worker entry point. */
import { parentPort } from 'node:worker_threads';
if (!parentPort) throw new Error('The axon-interface harness requires a Worker thread.');
globalThis.self = { postMessage(message, transfer = []) { parentPort.postMessage(message, transfer); } };
await import('../../src/lib/axon-interface/worker.mjs');
if (typeof self.onmessage !== 'function') throw new Error('Production Worker did not install a message handler.');
parentPort.on('message', data => self.onmessage({ data }));
parentPort.postMessage({ __harness: 'ready' });
