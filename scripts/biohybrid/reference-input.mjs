/** Native-reference input and frozen acceptance criteria. No reference solver here. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { runSimulation, MODEL_VERSION, OBSERVATION_VERSION } from '../../src/lib/biohybrid/model.js';

const output = process.argv[2] || '/tmp/biohybrid-current-reference-input.json.gz';
const criteria = {
  rootMeanSquareVoltageMv: 1,
  maximumSpikeTimingErrorMs: 0.1,
  spikeCountAgreement: true,
  strictPointwiseVoltageMv: 0.5,
  extracellularMaximumErrorUv: 0.001,
  sourceComponentMaximumErrorUv: 0.001, // Same predeclared electrical criterion, applied independently to each source partition.
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
  const inputSha256 = createHash('sha256').update(JSON.stringify({ settings: result.settings, geometry: result.geometry, restMv: result.diagnostics.restMv })).digest('hex');
  cases.push({ ...definition, inputSha256, settings: result.settings, geometry: result.geometry,
    timeMs: Array.from(result.timeMs), voltageMv: Array.from(result.voltageMv),
    traces: result.traces.map(trace => ({ ...trace, values: Array.from(trace.values) })),
    recordings: result.recordings.map(trace => ({ id: trace.id, neuralUv: Array.from(trace.neuralUv), graftUv: Array.from(trace.graftUv), hostUv: Array.from(trace.hostUv) })),
    spikes: result.spikes, synapticEvents: result.synapticEvents,
    metrics: result.metrics, diagnostics: result.diagnostics });
  console.log(definition.id, JSON.stringify({ nodes: result.geometry.nodes.length, spikes: result.spikes.length, elapsedMs: result.diagnostics.elapsedMs }));
}
await mkdir(new URL('../../docs/biohybrid/', import.meta.url), { recursive: true });
const payload = { schema: 'biohybrid-native-reference-input/1', modelVersion: MODEL_VERSION, observationVersion: OBSERVATION_VERSION, criteria, sourceSha256, cases };
await writeFile(output, gzipSync(Buffer.from(JSON.stringify(payload)), { level: 6 }));
console.log(output);
