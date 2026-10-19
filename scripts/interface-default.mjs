import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { freshInterfaceConfig, loadInterfaceModels, runInterfaceExperiment } from '../src/lib/cortex/interface-experiment.js';
import { encodeInterfaceArchive, decodeInterfaceArchive } from '../src/lib/cortex/interface-archive.js';
import { INTERFACE_ENGINE_MANIFEST } from '../src/lib/cortex/interface-build-manifest.js';
const config = freshInterfaceConfig();
const exampleName = process.argv.includes('--evoked') ? 'evoked' : 'default';
if (exampleName === 'evoked') Object.assign(config, { mode: 'evoked', activeContacts: [4], amplitudeUa: 40,
  startMs: 20, durationMs: 100, frequencyHz: 20 });
await loadInterfaceModels(config, path => readFile(new URL('../public' + path, import.meta.url)));
const result = runInterfaceExperiment(config, status => console.log(status.message));
const sourcePaths = Object.keys(INTERFACE_ENGINE_MANIFEST.sourceHashes);
result.solverSourceHashes = Object.fromEntries(await Promise.all(sourcePaths.map(async path =>
  [path, createHash('sha256').update(await readFile(new URL('../' + path, import.meta.url))).digest('hex')])));
for (const path of sourcePaths) if (result.solverSourceHashes[path] !== INTERFACE_ENGINE_MANIFEST.sourceHashes[path])
  throw new Error('Regenerate the interface engine manifest before saving examples.');
result.engineManifestVersion = INTERFACE_ENGINE_MANIFEST.version;
for (const cell of result.cells) {
  console.log(`${cell.specimenId}: ${cell.spikeTimesMs.length} complete somatic events, ${cell.nodes.length} compartments, soma y=${cell.somaUm[1].toFixed(1)} µm`);
  if (exampleName === 'default' && cell.spikeTimesMs.length < 2) throw new Error(`Default cell ${cell.specimenId} did not repeatedly fire.`);
}
if (exampleName === 'evoked' && result.cells.find(c => c.specimenId === 601927090)?.spikeTimesMs.length !== 2)
  throw new Error('The exact evoked example did not reproduce its two complete somatic events.');
result.replayPrecisionMv = .01;
const encoded = encodeInterfaceArchive(result, { quantizeMembraneMv: true }), bytes = gzipSync(encoded, { level: 9 });
const decoded = decodeInterfaceArchive(encoded);
if (Math.abs(decoded.cells[0].membraneMv.at(-1) - result.cells[0].membraneMv.at(-1)) > .0051) throw new Error('Replay archive precision gate failed.');
const directory = new URL('../public/models/cortex/interface/', import.meta.url);
await mkdir(directory, { recursive: true });
if (bytes.length >= 24 * 1024 ** 2) throw new Error(`Archive needs splitting: ${bytes.length} bytes.`);
await writeFile(new URL(`${exampleName}.bin.gz`, directory), bytes);
const summary = { version: result.version, config, generatedAt: new Date().toISOString(),
  sha256: createHash('sha256').update(bytes).digest('hex'), compressedBytes: bytes.length, decodedBytes: encoded.length,
  elapsedSeconds: result.elapsedSeconds, compartments: result.compartments, solverSourceHashes: result.solverSourceHashes, replayPrecisionMv: result.replayPrecisionMv,
  cells: result.cells.map(c => ({ id: c.id, specimenId: c.specimenId, compartments: c.nodes.length,
    backgroundNa: c.backgroundNa, backgroundStartMs: c.backgroundStartMs, somaUm: c.somaUm,
    spikeTimesMs: c.spikeTimesMs, somaRangeMv: c.somaRangeMv })), provenance: result.provenance };
await writeFile(new URL(`${exampleName}.json`, directory), JSON.stringify(summary, null, 2) + '\n');
console.log(`Saved ${bytes.length} gzip bytes from ${encoded.length} raw bytes; ${result.elapsedSeconds.toFixed(1)} seconds.`);
