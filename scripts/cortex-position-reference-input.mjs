// Research-only arbitrary source positions; not a catalog-contact/UI extension.
// The configuration supplies cell/tissue/waveform settings. stimulatingSites
// below explicitly overrides catalog geometry for this offline investigation.
import { pathToFileURL } from 'node:url';
import { freshActiveConfig } from '../src/lib/cortex/config.js';
import { makeWorld } from '../src/lib/cortex/world.js';

export function positionReferenceCases() {
  return [42, 43].map(r => {
    const c = freshActiveConfig();
    c.neuron.somaUm = [0, 0, 1500];
    c.neuron.segmentLengthUm = 10;
    c.solver.dtMs = .00125;
    c.solver.durationMs = 20;
    c.solver.sampleMs = .025;
    c.protocol.mode = 'extracellular-stimulation';
    c.protocol.amplitudeUa = 40;
    c.protocol.sourceContactIds = ['r4-c4', 'r4-c5'];
    c.recording.contactIds = ['r3-c3', 'r3-c6'];
    const w = makeWorld(c);
    return {id: 'position-'+r, config: w.config, nodes: w.neuron.nodes,
      stimulatingSites: [{positionUm: [0, -r, 1500]}, {positionUm: [0, 1000, 1500]}],
      recordingSites: w.config.recording.contactIds.map(id => w.contacts.find(s => s.id === id))};
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log(JSON.stringify(positionReferenceCases()));
