import { runExperiment } from './experiment.js';
import { resultBuffers } from './buffers.js';
import { runPopulation } from './population.js';
self.onmessage = ({ data }) => {
  try {
    const progress = (status) => self.postMessage({ type: 'progress', id: data.id, ...status });
    const result = data.population
      ? runPopulation(data.config, data.population, progress)
      : runExperiment(data.config, progress);
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
