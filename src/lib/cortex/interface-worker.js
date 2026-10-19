import { loadInterfaceModels, runInterfaceExperiment, interfaceBuffers, validateInterfaceConfig, makeInterfaceCells } from './interface-experiment.js';
import { INTERFACE_DESIGN } from './interface-field.js';
self.onmessage = async ({ data }) => {
  try {
    const config = validateInterfaceConfig(data.config);
    self.postMessage({ type: 'progress', message: 'Loading original human neuron models…' });
    await loadInterfaceModels(config);
    self.postMessage({ type: 'geometry', design: INTERFACE_DESIGN, cells: makeInterfaceCells(config) });
    const result = runInterfaceExperiment(config, status => self.postMessage({ type: 'progress', ...status }));
    self.postMessage({ type: 'result', result }, interfaceBuffers(result));
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
