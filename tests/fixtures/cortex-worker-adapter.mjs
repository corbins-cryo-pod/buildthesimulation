// Node worker bridge for testing the SAME browser-worker module without a browser.
import { parentPort } from 'node:worker_threads';
globalThis.self = { postMessage: (message, transfer) => parentPort.postMessage(message, transfer) };
await import('../../src/lib/cortex/worker.js');
parentPort.on('message', (data) => self.onmessage({ data }));
