import { runExperiment } from './experiment.js';
import { resultBuffers } from './buffers.js';
self.onmessage = ({ data }) => {
  try {
    const result = runExperiment(data.config, (status) =>
      self.postMessage({ type: 'progress', id: data.id, ...status }),
    );
    const buffers = resultBuffers(result);
    self.postMessage({ type: 'result', id: data.id, result }, buffers);
  } catch (error) {
    self.postMessage({
      type: 'error',
      id: data.id,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
