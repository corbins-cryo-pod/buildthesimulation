import { readFile } from 'node:fs/promises';
const originalFetch=globalThis.fetch;
globalThis.fetch=async (url,...args)=>typeof url==='string' && url.startsWith('/models/cortex/library/') ? new Response(await readFile(new URL('../../public'+url,import.meta.url))) : originalFetch(url,...args);
// Node worker bridge for testing the SAME browser-worker module without a browser.
import { parentPort } from 'node:worker_threads';
globalThis.self = { postMessage: (message, transfer) => parentPort.postMessage(message, transfer) };
await import('../../src/lib/cortex/worker.js');
parentPort.on('message', (data) => self.onmessage({ data }));
