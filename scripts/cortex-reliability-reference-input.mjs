// New physical configurations only. No browser numerical results enter NEURON.
import { pathToFileURL } from 'node:url';
import { freshActiveConfig } from '../src/lib/cortex/config.js';
import { makeWorld } from '../src/lib/cortex/world.js';

export function reliabilityReferenceCases() {
  const cases = [];
  // These are the historical .00125 ms threshold brackets, retained verbatim.
  // The new reference tests both endpoints rather than assuming their labels.
  for (const [mesh, low, high] of [[40, 19.375, 19.53125], [20, 18.59375, 18.75], [10, 19.0625, 19.21875]]) {
    for (const [label, amplitude] of [['lower', low], ['upper', high], ['fixed19', 19]]) {
      const c = freshActiveConfig();
      c.neuron.segmentLengthUm = mesh;
      c.solver.dtMs = 0.00125;
      c.solver.durationMs = 20;
      c.protocol.mode = 'extracellular-stimulation';
      c.protocol.sourceContactIds = ['r4-c4', 'r4-c5'];
      c.recording.contactIds = ['r3-c3', 'r3-c6'];
      c.protocol.amplitudeUa = amplitude;
      cases.push({id: `reliability-local-${mesh}um-${label}`, config: c});
    }
  }
  const moved = structuredClone(cases.find(c => c.id === 'reliability-local-10um-upper'));
  moved.id = 'reliability-moved-soma-10um';
  moved.config.protocol.amplitudeUa = 40;
  moved.config.protocol.phaseUs = 1000;
  moved.config.implant.translationUm = [100, -50, 0];
  cases.push(moved);
  const c = freshActiveConfig();
  c.neuron.segmentLengthUm = 10;
  c.solver.dtMs = 0.00125;
  c.solver.durationMs = 20;
  cases.push({id: 'reliability-intracellular-10um', config: c});
  return cases.map(({id, config}) => {
    const w = makeWorld(config);
    return {id, config: w.config, nodes: w.neuron.nodes,
      recordingSites: w.config.recording.contactIds.map(id => w.contacts.find(s => s.id === id)),
      stimulatingSites: w.config.protocol.sourceContactIds.map(id => w.contacts.find(s => s.id === id))};
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log(JSON.stringify(reliabilityReferenceCases()));
