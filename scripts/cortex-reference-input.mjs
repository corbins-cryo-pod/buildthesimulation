// Shared geometry/parameters only. No browser solver or forward-model outputs
// are passed to the independent NEURON reference generator.
import { pathToFileURL } from 'node:url';
import { freshConfig } from '../src/lib/cortex/config.js';
import { makeWorld } from '../src/lib/cortex/world.js';

export function referenceCases() {
  const configs = ['synaptic-recording', 'intracellular-current', 'extracellular-stimulation'].map(
    (mode) => {
      const config = freshConfig();
      config.protocol.mode = mode;
      return { id: mode, config };
    },
  );
  const shifted = freshConfig();
  shifted.protocol.mode = 'extracellular-stimulation';
  shifted.protocol.startMs = 5.0125;
  shifted.protocol.gapUs = 0;
  shifted.implant.translationUm = [-100, 75, 50];
  shifted.implant.rotationDeg = [5, 10, -15];
  configs.push({ id: 'rotated-nonaligned-stimulation', config: shifted });
  return configs.map(({ id, config }) => {
    const world = makeWorld(config);
    return {
      id,
      config: world.config,
      nodes: world.neuron.nodes,
      stimulatingSites: config.protocol.sourceContactIds.map((contactId) =>
        world.contacts.find((site) => site.id === contactId),
      ),
      recordingSites: config.recording.contactIds.map((contactId) =>
        world.contacts.find((site) => site.id === contactId),
      ),
    };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log(JSON.stringify(referenceCases()));
