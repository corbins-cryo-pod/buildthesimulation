import { runExperiment, scanChannels, findThreshold } from './experiment.js';
function transferableBuffers(value, buffers = new Set()) {
  if (ArrayBuffer.isView(value)) buffers.add(value.buffer);
  else if (value instanceof ArrayBuffer) buffers.add(value);
  else if (value && typeof value === 'object') for (const item of Object.values(value)) transferableBuffers(item, buffers);
  return buffers;
}
self.onmessage = event => {
  const { id, task, settings, audio, contactIndex, fiberIndex } = event.data;
  let last = -Infinity;
  const progress = value => { const now = performance.now(); if (now - last >= 80 || value.fraction >= 1) { self.postMessage({ id, type: 'progress', ...value }); last = now; } };
  try {
    let result;
    if (task === 'run') result = runExperiment(settings, audio, progress);
    else if (task === 'scan') result = scanChannels(settings, progress);
    else if (task === 'threshold') result = findThreshold(settings, contactIndex, fiberIndex);
    else throw new Error('Unknown cochlear calculation.');
    self.postMessage({ id, type: 'result', result }, [...transferableBuffers(result)]);
  } catch (error) { self.postMessage({ id, type: 'error', message: error?.message ?? String(error) }); }
};
