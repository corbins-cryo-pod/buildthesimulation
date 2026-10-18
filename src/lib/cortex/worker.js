import { runExperiment } from './experiment.js';
import { resultBuffers } from './buffers.js';
import { loadActiveModels } from './model-library.js';
import { populationModels } from './population.js';
import { runPopulation } from './population.js';
self.onmessage = async ({ data }) => {
  try {
    const progress = (status) => self.postMessage({ type: 'progress', id: data.id, ...status });
    if (data.population || data.config.neuron.modelId) await loadActiveModels(data.population ? populationModels(data.config, data.population).slice(0,data.population.count).map(m=>m.id) : [data.config.neuron.modelId], data.config.neuron.segmentLengthUm);
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
