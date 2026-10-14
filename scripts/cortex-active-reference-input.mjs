// Independent reference input includes only parameters and the shared world.
import { pathToFileURL } from 'node:url';
import { freshActiveConfig } from '../src/lib/cortex/config.js';
import { makeWorld } from '../src/lib/cortex/world.js';
export function activeReferenceCases() {
  const cases = [];
  for (const [id, amplitude] of [
    ['rest', 0],
    ['intracellular-subthreshold', 0.05],
    ['intracellular-spiking', 1.2],
  ]) {
    const c = freshActiveConfig();
    c.protocol.injectionNa = amplitude;
    cases.push({ id, config: c });
  }
  for (const [id, amplitude] of [
    ['extracellular-subthreshold', 1],
    ['extracellular-spiking', 40],
  ]) {
    const c = freshActiveConfig();
    c.protocol.mode = 'extracellular-stimulation';
    c.protocol.amplitudeUa = amplitude;
    c.protocol.sourceContactIds = ['r4-c4', 'r4-c5'];
    c.recording.contactIds = ['r3-c3', 'r3-c6'];
    cases.push({ id, config: c });
  }
  const moved = structuredClone(cases.at(-1));
  moved.id = 'extracellular-rotated';
  moved.config.implant.rotationDeg = [0, 5, 10];
  moved.config.implant.translationUm = [-50, 100, 0];
  cases.push(moved);
  const temporal = structuredClone(cases.find((c) => c.id === 'intracellular-spiking'));
  temporal.id = 'intracellular-half-timestep';
  temporal.config.solver.dtMs = 0.0025;
  cases.push(temporal);
  const spatial = structuredClone(temporal);
  spatial.id = 'intracellular-refined-morphology';
  spatial.config.neuron.segmentLengthUm = 20;
  cases.push(spatial);
  return cases.map(({ id, config }) => {
    const w = makeWorld(config);
    return {
      id,
      config: w.config,
      nodes: w.neuron.nodes,
      recordingSites: config.recording.contactIds.map((id) => w.contacts.find((s) => s.id === id)),
      stimulatingSites: config.protocol.sourceContactIds.map((id) =>
        w.contacts.find((s) => s.id === id),
      ),
    };
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log(JSON.stringify(activeReferenceCases()));
