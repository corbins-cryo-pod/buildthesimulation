import { ACTIVE_MODEL_ID, ACTIVE_SCHEMA_VERSION } from './config.js';
import { parseConfig } from './experiment.js';

// The interactive laboratory supports only the published human active cell.
// Historical passive configs remain meaningful offline; never relabel/migrate
// their morphology and membrane physics into an active experiment implicitly.
export function parseLaboratoryConfig(text) {
  const config = parseConfig(text);
  if (config.schemaVersion !== ACTIVE_SCHEMA_VERSION || config.neuron.modelId !== ACTIVE_MODEL_ID)
    throw new Error('The simplified passive neuron has been retired from this laboratory. Load a human cell example or import a human active-cell configuration.');
  return config;
}
