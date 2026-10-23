/** Minimal browser-worker message surface implemented by a real Node worker. */
import {parentPort,workerData} from 'node:worker_threads';

if(!parentPort)throw new Error('This harness must execute in a worker thread.');
if(!['worker.js','protocol-worker.js'].includes(workerData.module))throw new Error('Unsupported biohybrid worker module.');

globalThis.self={
  addEventListener(type,listener){
    if(type!=='message')throw new Error(`Unsupported worker event: ${type}`);
    parentPort.on('message',data=>listener({data}));
  },
  postMessage(message,transfer=[]){
    const sourceBuffers=message.type==='result'&&message.result?.recordings
      ?message.result.recordings.flatMap(recording=>[recording.graftUv.buffer,recording.hostUv.buffer]):[];
    parentPort.postMessage(message,transfer);
    if(transfer.length)parentPort.postMessage({__harness:'transfer',id:message.id,
      transferredBufferCount:transfer.length,allTransferredBuffersDetached:transfer.every(buffer=>buffer.byteLength===0),
      populationSourceBufferCount:sourceBuffers.length,allPopulationSourceBuffersDetached:sourceBuffers.every(buffer=>buffer.byteLength===0)});
  },
};

// Import the actual production entrypoint. No solver, message handler or
// cancellation implementation is replaced by this adapter.
await import(new URL(`../../src/lib/biohybrid/${workerData.module}`,import.meta.url));
parentPort.postMessage({__harness:'ready'});
