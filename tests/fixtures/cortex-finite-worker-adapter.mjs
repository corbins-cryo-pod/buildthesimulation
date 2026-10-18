import {readFile} from 'node:fs/promises';
import {parentPort,workerData} from 'node:worker_threads';
globalThis.fetch=async url=>{
  if(workerData?.delayMs)await new Promise(resolve=>setTimeout(resolve,workerData.delayMs));
  if(workerData?.fail)return new Response('',{status:503});
  return new Response(await readFile(new URL('../../public'+url,import.meta.url)));
};
globalThis.self={postMessage:(m,t)=>parentPort.postMessage(m,t)};
await import('../../src/lib/cortex/finite-worker.js');
parentPort.on('message',data=>self.onmessage({data}));
