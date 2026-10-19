import { loadInterfaceModels, runInterfaceExperiment, interfaceBuffers, validateInterfaceConfig, makeInterfaceCells } from './interface-experiment.js';
import { runInterfaceComparison } from './interface-comparison.js';
import { makeInterfaceDesign } from './interface-field.js';
import { INTERFACE_ENGINE_MANIFEST } from './interface-build-manifest.js';
let inFlight = false;
self.onmessage = async ({ data }) => {
  const { jobId } = data;
  const send = (message, buffers) => self.postMessage({ ...message, jobId }, buffers || []);
  if (inFlight) { send({ type: 'error', message: 'Another experiment is still running.' }); return; }
  inFlight = true;
  try {
    if (!['run', 'compare', undefined].includes(data.type)) throw new Error('Unsupported experiment request.');
    const config = validateInterfaceConfig(data.config);
    send({ type: 'progress', message: 'Loading original human neuron models…' });
    await loadInterfaceModels(config);
    const annotate = result => {
      result.solverSourceHashes = { ...INTERFACE_ENGINE_MANIFEST.sourceHashes };
      result.engineManifestVersion = INTERFACE_ENGINE_MANIFEST.version;
      result.replayPrecisionMv = null; // Float32 visualization; no 0.01 mV archive quantization.
      return result;
    };
    if (data.type === 'compare') {
      const comparison = runInterfaceComparison(config, data.spec, status => send({ type: 'progress', ...status }));
      annotate(comparison.baseline); annotate(comparison.variant);
      send({ type: 'comparison', comparison }, interfaceBuffers(comparison));
    } else {
      send({ type: 'geometry', design: makeInterfaceDesign(config.contactGeometry), cells: makeInterfaceCells(config) });
      const result = annotate(runInterfaceExperiment(config, status => send({ type: 'progress', ...status })));
      send({ type: 'result', result }, interfaceBuffers(result));
    }
  } catch (error) {
    send({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  } finally { inFlight = false; }
};
