/** Native-reference input and frozen acceptance criteria. No reference solver here. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { runSimulation, MODEL_VERSION } from '../../src/lib/biohybrid/model.js';

const output = process.argv[2] || '/tmp/biohybrid-current-reference-input.json.gz';
const criteria = {
  rootMeanSquareVoltageMv: 1,
  maximumSpikeTimingErrorMs: 0.1,
  spikeCountAgreement: true,
  strictPointwiseVoltageMv: 0.5,
  strictPointwiseRole: 'Preserved additional diagnostic; reported separately from RMS/timing acceptance, never discarded or loosened after an outcome.',
  alignment: 'Compare the same physical times. No voltage offset, time shift, waveform alignment, or rescaling.',
};
const definitions = [
  { id: 'rest-dt005', description: 'Full branched geometry, zero applied current and no spontaneous synaptic events.', settings: { stimAmplitudeUa: 0, dtMs: .005 } },
  { id: 'disconnected-dt005', description: 'Full branched geometry with active graft and zero host-graft synaptic conductance.', settings: { synapticWeightUs: 0, dtMs: .005 } },
  { id: 'relay-dt005', description: 'Complete default electrically stimulated graft-to-host relay, native HH and native Exp2Syn/NetCon.', settings: { dtMs: .005 } },
  { id: 'relay-dt0025', description: 'Same complete relay at half the timestep; all comparison tolerances unchanged.', settings: { dtMs: .0025 } },
];
const files = ['src/lib/biohybrid/model.js', 'src/lib/biohybrid/geometry.js', 'src/lib/cortex/volume-conductor.js'];
const sourceSha256 = Object.fromEntries(await Promise.all(files.map(async path => [path, createHash('sha256').update(await readFile(new URL(`../../${path}`, import.meta.url))).digest('hex')])));
const cases = [];
for (const definition of definitions) {
  const result = runSimulation(definition.settings);
  cases.push({ ...definition, settings: result.settings, geometry: result.geometry,
    timeMs: Array.from(result.timeMs), voltageMv: Array.from(result.voltageMv),
    traces: result.traces.map(trace => ({ ...trace, values: Array.from(trace.values) })),
    spikes: result.spikes, synapticEvents: result.synapticEvents,
    metrics: result.metrics, diagnostics: result.diagnostics });
  console.log(definition.id, JSON.stringify({ nodes: result.geometry.nodes.length, spikes: result.spikes.length, elapsedMs: result.diagnostics.elapsedMs }));
}
await mkdir(new URL('../../docs/biohybrid/', import.meta.url), { recursive: true });
const payload = { schema: 'biohybrid-native-reference-input/1', modelVersion: MODEL_VERSION, criteria, sourceSha256, cases };
await writeFile(output, gzipSync(Buffer.from(JSON.stringify(payload)), { level: 6 }));
console.log(output);
