// Shared geometry/configuration only; no laboratory solver output enters NEURON.
import { pathToFileURL } from 'node:url';
import { getExampleConfig } from '../src/lib/cortex/examples.js';
import { makeWorld } from '../src/lib/cortex/world.js';
export function currentStepReferenceCases() {
  return ['active-current-step-200ms', 'active-current-step-500ms'].map((id) => {
    const w = makeWorld(getExampleConfig(id));
    return { id, config: w.config, nodes: w.neuron.nodes,
      recordingSites: w.config.recording.contactIds.map((id) => w.contacts.find((s) => s.id === id)),
      stimulatingSites: w.config.protocol.sourceContactIds.map((id) => w.contacts.find((s) => s.id === id)),
    };
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log(JSON.stringify(currentStepReferenceCases()));
