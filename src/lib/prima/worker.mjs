import { simulateExperiment } from './engine.mjs';
self.onmessage = async ({ data }) => {
  if (data.type !== 'run') return;
  const { id, config } = data;
  try {
    const result = await simulateExperiment(config, { onProgress: progress => self.postMessage({ type: 'progress', id, progress }) });
    self.postMessage({ type: 'result', id, result });
  } catch (error) { self.postMessage({ type: 'error', id, message: error.message || String(error) }); }
};

