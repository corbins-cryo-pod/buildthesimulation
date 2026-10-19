import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { freshInterfaceConfig, loadInterfaceModels } from '../src/lib/cortex/interface-experiment.js';
import { INTERFACE_COMPARISON_VERSION, runInterfaceComparison } from '../src/lib/cortex/interface-comparison.js';
import { encodeInterfaceArchive, decodeInterfaceArchive } from '../src/lib/cortex/interface-archive.js';
import { validateInterfaceReplay } from '../src/lib/cortex/interface-replay-validation.js';
import { INTERFACE_ENGINE_MANIFEST } from '../src/lib/cortex/interface-build-manifest.js';
for (const [path, expected] of Object.entries(INTERFACE_ENGINE_MANIFEST.sourceHashes))
  if (createHash('sha256').update(await readFile(new URL('../' + path, import.meta.url))).digest('hex') !== expected)
    throw new Error('Regenerate the interface engine manifest before saving examples.');
const config = { ...freshInterfaceConfig(), durationMs: 100 };
await loadInterfaceModels(config, path => readFile(new URL('../public' + path, import.meta.url)));
for (const kind of ['geometry', 'stimulation']) {
  const selected = kind === 'geometry' ? config : { ...config, mode: 'evoked', activeContacts: [4], amplitudeUa: 40,
    startMs: 20, frequencyHz: 20 };
  const spec = kind === 'geometry' ? { version: INTERFACE_COMPARISON_VERSION, kind, contactIndex: 4,
    baselineVariantId: '12x12', variantVariantId: '30x30', eventMatchWindowMs: 5 }
    : { version: INTERFACE_COMPARISON_VERSION, kind, eventMatchWindowMs: 5 };
  const comparison = runInterfaceComparison(selected, spec, status => console.log(`${kind}: ${status.condition} · ${status.message}`));
  for (const run of [comparison.baseline, comparison.variant]) {
    run.solverSourceHashes = { ...INTERFACE_ENGINE_MANIFEST.sourceHashes };
    run.engineManifestVersion = INTERFACE_ENGINE_MANIFEST.version;
    run.replayPrecisionMv = .01;
  }
  if (kind === 'geometry') {
    for (let ci = 0; ci < comparison.baseline.cells.length; ci++) {
      const a = comparison.baseline.cells[ci], b = comparison.variant.cells[ci];
      if (!a.membraneMv.every((value, i) => value === b.membraneMv[i])) throw new Error('Passive geometry changed source dynamics.');
    }
  } else {
    if (comparison.baseline.cells.some(cell => cell.spikeTimesMs.length)) throw new Error('Resting control unexpectedly has soma events.');
    const target = comparison.variant.cells.find(cell => cell.specimenId === 601927090);
    if (target.spikeTimesMs.length !== 2 || comparison.variant.cells.some(cell => cell !== target && cell.spikeTimesMs.length))
      throw new Error('Exact evoked comparison did not reproduce the saved response.');
  }
  const bytes = gzipSync(encodeInterfaceArchive(comparison, { quantizeMembraneMv: true }), { level: 9 });
  if (bytes.length >= 24 * 1024 ** 2) throw new Error('Comparison exceeds the static-host asset limit.');
  const decoded = validateInterfaceReplay(decodeInterfaceArchive((await import('node:zlib')).gunzipSync(bytes)));
  const path = new URL(`../public/models/cortex/interface/${kind}`, import.meta.url);
  await writeFile(new URL(path.href + '.bin.gz'), bytes);
  const summarize = run => ({ config: run.config, compartments: run.compartments, elapsedSeconds: run.elapsedSeconds,
    cells: run.cells.map(cell => ({ id: cell.id, specimenId: cell.specimenId, spikeTimesMs: cell.spikeTimesMs })) });
  await writeFile(new URL(path.href + '.json'), JSON.stringify({ version: comparison.version, spec,
    generatedAt: new Date().toISOString(), sha256: createHash('sha256').update(bytes).digest('hex'), compressedBytes: bytes.length,
    solverSourceHashes: INTERFACE_ENGINE_MANIFEST.sourceHashes, baseline: summarize(decoded.baseline),
    variant: summarize(decoded.variant), analysis: decoded.analysis }, null, 2) + '\n');
  console.log(`Saved ${kind} comparison: ${bytes.length} compressed bytes.`);
}
