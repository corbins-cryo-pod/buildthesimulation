import { runExperiment } from './experiment.js';
self.onmessage = ({ data }) => {
  try {
    const result = runExperiment(data.config, (status) =>
      self.postMessage({ type: 'progress', id: data.id, ...status }),
    );
    const buffers = [];
    for (const v of Object.values(result)) {
      if (ArrayBuffer.isView(v)) buffers.push(v.buffer);
      else if (Array.isArray(v))
        for (const a of v) if (ArrayBuffer.isView(a)) buffers.push(a.buffer);
    }
    self.postMessage({ type: 'result', id: data.id, result }, buffers);
  } catch (error) {
    self.postMessage({
      type: 'error',
      id: data.id,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
