// Calibrate explicit patch-style background drive for the interface laboratory.
// This uses the existing human-cell cable solver without altering any fit,
// morphology, temperature, channel, or membrane parameter. It is not biological
// validation or a substitute for spatial/timestep convergence near thresholds.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { modelRegistry } from '../src/lib/cortex/model-registry.js';
import { loadActiveModel } from '../src/lib/cortex/model-library.js';
import { createActiveCable, stepActiveCable } from '../src/lib/cortex/active-cable.js';

export const CALIBRATION_PROTOCOL = Object.freeze({
  dtMs: 0.005, lengthUm: 40, settleMs: 100, durationMs: 220,
  thresholdMv: -25, refractoryMs: 2, minimumPeakMv: 0,
  minimumCrossings: 2, latestCrossingMinimumMs: 100,
  convention: 'Constant somatic intracellular current after no-drive conditioning; no extracellular field.',
});
const initialCurrents = new Map([
  [571654895, .3], [508378649, .8], [528038990, 1.2], [529878215, .8],
  [531526539, .8], [541563728, .5], [569844159, .4], [571500474, .8],
  [531520637, .4], [601927090, .1], [614651270, .4], [526734407, .4],
]);
export const SELECTED_MODELS = modelRegistry.filter(m => initialCurrents.has(m.specimenId));
const stateFields = ['voltageMv', 'previous', 'membraneCurrentNa', 'ionicNa', 'potassiumNa',
  'calciumNa', 'hcnNa', 'leakNa', 'capacitiveNa', 'gates', 'sodium', 'calciumMm', 'extraGates'];
const rounded = x => Number(x.toFixed(6));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const readAsset = path => readFile(new URL('../public' + path, import.meta.url));

export function measureCurrent(cable, conditionedState, currentNa, protocol = CALIBRATION_PROTOCOL) {
  for (const [field, value] of Object.entries(conditionedState)) cable[field].set(value);
  const injectionNa = new Float64Array(cable.n);
  injectionNa[0] = currentNa;
  const crossings = [];
  let minMv = cable.voltageMv[0], maxMv = minMv, lastCrossing = -Infinity;
  const samples = [];
  const steps = Math.round(protocol.durationMs / protocol.dtMs);
  for (let step = 0; step < steps; step++) {
    const previous = cable.voltageMv[0];
    stepActiveCable(cable, protocol.dtMs, { injectionNa });
    const voltage = cable.voltageMv[0], timeMs = (step + 1) * protocol.dtMs;
    minMv = Math.min(minMv, voltage); maxMv = Math.max(maxMv, voltage);
    if (previous < protocol.thresholdMv && voltage >= protocol.thresholdMv &&
        timeMs - lastCrossing >= protocol.refractoryMs) {
      lastCrossing = timeMs - protocol.dtMs + protocol.dtMs *
        (protocol.thresholdMv - previous) / (voltage - previous);
      crossings.push({ timeMs: lastCrossing, peakMv: voltage, repolarized: false });
    }
    for (let j = crossings.length - 1; j >= 0; j--) {
      const event = crossings[j], age = timeMs - event.timeMs;
      if (age > 20) break;
      if (age <= 3) event.peakMv = Math.max(event.peakMv, voltage);
      if (voltage < -40) event.repolarized = true;
    }
    if (step % Math.round(.25 / protocol.dtMs) === 0)
      samples.push([rounded(timeMs), rounded(voltage)]);
  }
  const events = crossings.map(e => ({ timeMs: rounded(e.timeMs), peakMv: rounded(e.peakMv),
    repolarized: e.repolarized }));
  const apLike = events.filter(e => e.peakMv >= protocol.minimumPeakMv && e.repolarized);
  const intervals = apLike.slice(1).map((e, j) => e.timeMs - apLike[j].timeMs);
  return {
    currentNa, passed: apLike.length >= protocol.minimumCrossings &&
      apLike.at(-1).timeMs >= protocol.latestCrossingMinimumMs,
    somaCrossingCount: events.length, apLikeCount: apLike.length,
    spikeTimesMs: events.map(e => e.timeMs), events,
    somaRangeMv: [rounded(minMv), rounded(maxMv)], finalSomaMv: rounded(cable.voltageMv[0]),
    meanIntervalMs: intervals.length ? rounded(intervals.reduce((a,b) => a+b,0) / intervals.length) : null,
    samples,
  };
}

export async function calibrateCell(metadata, options = {}) {
  const protocol = { ...CALIBRATION_PROTOCOL, ...options };
  const started = performance.now();
  const model = await loadActiveModel(metadata.id, protocol.lengthUm, readAsset);
  const nodes = model.variants[String(protocol.lengthUm)];
  const cable = createActiveCable(nodes, model.fit, { kv2TauGuard: model.kv2TauGuard !== false });
  for (let i = 0; i < Math.round(protocol.settleMs / protocol.dtMs); i++)
    stepActiveCable(cable, protocol.dtMs);
  const conditioned = Object.fromEntries(stateFields.filter(field => cable[field]).map(
    field => [field, cable[field].slice()]));
  const initial = options.currentNa ?? initialCurrents.get(metadata.specimenId);
  const currents = options.currentNa ? [initial] : [...new Set([initial,
    rounded(initial * 1.5), rounded(initial * 2), rounded(initial * 3)])].filter(x => x <= 2.4);
  const trials = [];
  for (const current of currents) {
    const t = performance.now();
    const trial = measureCurrent(cable, conditioned, current, protocol);
    trial.elapsedSeconds = rounded((performance.now() - t) / 1000);
    trials.push(trial);
    console.log(`${metadata.specimenId}: ${protocol.lengthUm} um, dt=${protocol.dtMs} ms, ` +
      `${current} nA, soma crossings=${trial.somaCrossingCount}, AP-like=${trial.apLikeCount}, ` +
      `last=${trial.spikeTimesMs.at(-1) ?? 'none'} ms, pass=${trial.passed}, ${trial.elapsedSeconds}s`);
    if (trial.passed) break;
  }
  const selected = trials.find(t => t.passed) ?? null;
  const assetPath = metadata.specimenId === 571654895
    ? 'src/lib/cortex/models/allen571654895.json'
    : `public/models/cortex/library/allen${metadata.specimenId}-${protocol.lengthUm}.json.gz`;
  return {
    modelId: metadata.id, specimenId: metadata.specimenId, label: metadata.label,
    cellClass: metadata.class, layer: metadata.layer,
    compartments: nodes.length, membraneCompartments: nodes.filter(n => n.areaUm2).length,
    protocol, initialSomaMv: rounded(conditioned.voltageMv[0]),
    selectedCurrentNa: selected?.currentNa ?? null, selected,
    trials, elapsedSeconds: rounded((performance.now() - started) / 1000),
    assetPath, assetSha256: digest(await readFile(new URL('../' + assetPath, import.meta.url))),
  };
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
  const options = {};
  for (const key of ['dtMs', 'lengthUm', 'currentNa', 'settleMs', 'durationMs'])
    if (args[key]) options[key] = Number(args[key]);
  const presets = 'presets' in args ? (await import('../src/lib/cortex/interface-presets.js')).INTERFACE_PRESETS : null;
  const selected = args.specimen ? modelRegistry.filter(m => String(m.specimenId) === args.specimen)
    : presets ? presets.map(p => modelRegistry.find(m => m.id === p.modelId)) : SELECTED_MODELS;
  if (!selected.length) throw new Error('No published cell matches this selection.');
  if (selected.some(m => !initialCurrents.has(m.specimenId)) && !presets && !options.currentNa)
    throw new Error('Specify --currentNa for a cell outside the original candidate scan.');
  const sourceHashes = {};
  for (const path of ['scripts/interface-calibrate.mjs', 'src/lib/cortex/active-cable.js',
    'src/lib/cortex/active-channels.js', 'src/lib/cortex/extra-channels.js'])
    sourceHashes[path] = digest(await readFile(new URL('../' + path, import.meta.url)));
  if (presets) sourceHashes['src/lib/cortex/interface-presets.js'] =
    digest(await readFile(new URL('../src/lib/cortex/interface-presets.js', import.meta.url)));
  const report = { schemaVersion: 'cortex-interface-cell-calibration/1',
    generatedAt: new Date().toISOString(), sourceHashes, protocol: { ...CALIBRATION_PROTOCOL, ...options },
    scope: 'Repeated soma voltage events under injected constant intracellular current. Not spontaneous firing, biological validation, or threshold convergence.',
    cells: [] };
  const output = args.output ?? '/tmp/cortex-interface-cell-calibration.json';
  for (const metadata of selected) {
    const preset = presets?.find(p => p.modelId === metadata.id);
    report.cells.push(await calibrateCell(metadata, { ...options,
      ...(preset ? { currentNa: preset.backgroundNa } : {}) }));
    await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  }
  console.log(`Completed ${report.cells.length} cells; ${report.cells.filter(c=>c.selected).length} passed. ${output}`);
  if (report.cells.some(c => !c.selected)) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
