import { INTERFACE_VERSION, INTERFACE_DEFAULT, validateInterfaceConfig } from './interface-contract.js';
import { makeInterfaceDesign } from './interface-field.js';
import { INTERFACE_PRESETS } from './interface-presets.js';
import { getModelMetadata } from './model-registry.js';
import { INTERFACE_COMPARISON_VERSION, validateInterfaceComparisonSpec, analyzeInterfaceComparison, canonicalInterfaceInput } from './interface-comparison-analysis.js';
import { decodeInterfaceArchive, MAX_INTERFACE_ARCHIVE_BYTES } from './interface-archive.js';
import { INTERFACE_ENGINE_MANIFEST } from './interface-build-manifest.js';

export const MAX_INTERFACE_FILE_BYTES = 64 * 1024 ** 2;
const fail = message => { throw new Error(`Cannot open replay: ${message}`); };
const point = value => Array.isArray(value) && value.length === 3 && value.every(v => Number.isFinite(v) && Math.abs(v) <= 100000);
const floatArray = (value, length, label) => {
  if (!(value instanceof Float32Array || value instanceof Float64Array) || value.length !== length)
    fail(`${label} has an incompatible shape or sample type.`);
  for (const sample of value) if (!Number.isFinite(sample)) fail(`${label} contains a nonfinite sample.`);
};
function times(values, end, label) {
  if (!Array.isArray(values) || values.length > 10000) fail(`${label} is invalid.`);
  let previous = -Infinity;
  for (const t of values) {
    if (!Number.isFinite(t) || t < 0 || t > end || t < previous) fail(`${label} contains an invalid event time.`);
    previous = t;
  }
}

/** Structural and numerical consistency checks, not authentication or scientific validation. */
function validateRun(run) {
  if (!run || run.version !== INTERFACE_VERSION) fail('unsupported experiment version.');
  if (!run.config || typeof run.config !== 'object' || Array.isArray(run.config) ||
    Object.keys(INTERFACE_DEFAULT).some(key => key !== 'contactGeometry' && !Object.hasOwn(run.config, key)) ||
    Object.keys(run.config).some(key => !Object.hasOwn(INTERFACE_DEFAULT, key))) fail('missing or unsupported protocol fields.');
  const config = validateInterfaceConfig(run.config);
  if (JSON.stringify(config.activeContacts) !== JSON.stringify(run.config.activeContacts)) fail('contact selection is not canonical.');
  const design = makeInterfaceDesign(config.contactGeometry);
  if (!run.design || ['widthUm', 'thicknessUm', 'lengthUm', 'taperUm', 'plane', 'tissueSide'].some(k => run.design[k] !== design[k]) ||
      !Array.isArray(run.design.contacts) || run.design.contacts.length !== 8) fail('unsupported shank geometry.');
  for (let k = 0; k < 8; k++) {
    const actual = run.design.contacts[k], expected = design.contacts[k];
    if (!actual || ['id','index','widthUm','heightUm','areaUm2','shape'].some(key => actual[key] !== expected[key]) ||
      JSON.stringify(actual.centerUm) !== JSON.stringify(expected.centerUm)) fail('contact geometry does not match the recorded configuration.');
  }
  const frames = Math.floor(Math.round(config.durationMs / config.dtMs) / Math.round(config.sampleMs / config.dtMs)) + 1;
  floatArray(run.timeMs, frames, 'Time axis');
  for (let f = 0; f < frames; f++) if (Math.abs(run.timeMs[f] - f * config.sampleMs) > 1e-8) fail('time samples do not match the protocol.');
  for (const key of ['neuralUv','artifactUv','currentUa']) floatArray(run[key], frames * 8, key);
  for (let f = 0; f < frames; f++) {
    let total = 0;
    const time = run.timeMs[f] - config.dtMs / 2;
    if (f && config.mode !== 'recording' && time >= config.startMs) {
      const phase = config.phaseUs / 1000, gap = config.gapUs / 1000, period = 1000 / config.frequencyHz;
      const pulseStart = config.startMs + Math.floor((time - config.startMs + 1e-10) / period) * period;
      if (pulseStart + 2 * phase + gap <= config.durationMs + 1e-9) {
        const age = time - pulseStart;
        total = age < phase - 1e-9 ? -config.amplitudeUa : age < phase + gap - 1e-9 ? 0
          : age < 2 * phase + gap - 1e-9 ? config.amplitudeUa : 0;
      }
    }
    for (let k = 0; k < 8; k++) {
      const expected = config.activeContacts.includes(k) ? total / config.activeContacts.length : 0;
      if (Math.abs(run.currentUa[f * 8 + k] - expected) > 1e-10) fail('recorded contact current disagrees with the pulse protocol.');
      if (total === 0 && run.artifactUv[f * 8 + k] !== 0) fail('direct applied potential is nonzero with zero applied current.');
    }
  }
  if (!Array.isArray(run.cells) || run.cells.length !== config.count) fail('cell count does not match the protocol.');
  let nodes = 0, pathPoints = 0;
  for (const [ci, cell] of run.cells.entries()) {
    if (cell.id !== INTERFACE_PRESETS[ci].modelId || cell.specimenId !== getModelMetadata(cell.id).specimenId ||
      !Array.isArray(cell.nodes) || !cell.nodes.length || cell.nodes.length > 5000)
      fail('unknown cell identity or unsupported compartment count.');
    const count = cell.nodes.length; nodes += count;
    if (!Number.isInteger(cell.somaIndex) || cell.somaIndex < 0 || cell.somaIndex >= count || !point(cell.somaUm)) fail('invalid soma geometry.');
    const expectedDrive = config.mode === 'evoked' ? 0 : INTERFACE_PRESETS[ci].backgroundNa;
    if (cell.backgroundNa !== expectedDrive || cell.backgroundStartMs !== (INTERFACE_PRESETS[ci].phaseMs ?? ci * 2)) fail('background drive does not match the recorded cell protocol.');
    let roots = 0;
    for (const [ni, node] of cell.nodes.entries()) {
      if (!node || !point(node.centerUm) || !point(node.startUm) || !point(node.endUm) ||
        !Number.isInteger(node.parent) || node.parent < -1 || node.parent >= count || node.parent === ni ||
        !['areaUm2','lengthUm','diameterUm','edgeUs'].every(key => Number.isFinite(node[key]) && node[key] >= 0)) fail('invalid compartment geometry.');
      if (node.parent === -1) roots++;
      if (!Array.isArray(node.pathUm) || (!node.pathUm.length && !(node.kind === 'junction' && node.areaUm2 === 0)) ||
        node.pathUm.length > 8192 || !node.pathUm.every(point)) fail('invalid compartment path.');
      pathPoints += node.pathUm.length;
      if (pathPoints > 200000) fail('morphology exceeds the supported rendering budget.');
      if (node.pathDiameterUm && (!Array.isArray(node.pathDiameterUm) || node.pathDiameterUm.length !== node.pathUm.length ||
        !node.pathDiameterUm.every(d => Number.isFinite(d) && d >= 0 && d <= 10000))) fail('invalid compartment diameters.');
    }
    if (roots !== 1) fail('the morphology is not one connected cable tree.');
    const visited = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      let node = i; const path = [];
      while (node >= 0 && visited[node] === 0) { visited[node] = 1; path.push(node); node = cell.nodes[node].parent; }
      if (node >= 0 && visited[node] === 1) fail('the morphology contains a cycle.');
      for (const index of path) visited[index] = 2;
    }
    floatArray(cell.membraneMv, frames * count, `Cell ${ci + 1} compartment voltage`);
    for (const key of ['somaMv','somaSodiumNa','somaPotassiumNa','somaCalciumNa','somaInjectionNa']) floatArray(cell[key], frames, `Cell ${ci + 1} ${key}`);
    if (cell.nodes[cell.somaIndex].kind !== 'soma') fail('selected soma compartment is not a soma.');
    for (let f = 0; f < frames; f++) {
      const tolerance = run.replayPrecisionMv === .01 ? .0051 : 1e-5;
      if (Math.abs(cell.somaMv[f] - cell.membraneMv[f * count + cell.somaIndex]) > tolerance) fail('soma trace disagrees with the compartment replay.');
      const drive = f && run.timeMs[f] - config.dtMs + 1e-9 >= cell.backgroundStartMs ? expectedDrive : 0;
      if (Math.abs(cell.somaInjectionNa[f] - drive) > 1e-7) fail('injected current disagrees with the background protocol.');
    }
    if (cell.neuralUv !== undefined) floatArray(cell.neuralUv, frames * 8, `Cell ${ci + 1} contact contribution`);
    times(cell.spikeTimesMs, config.durationMs, `Cell ${ci + 1} soma events`);
    if (!Array.isArray(cell.events) || cell.events.length > 10000 || cell.events.some(e => !Number.isFinite(e.peakMv) || typeof e.repolarized !== 'boolean')) fail('invalid event observations.');
    times(cell.events.map(e => e.timeMs), config.durationMs, `Cell ${ci + 1} raw crossings`);
    const complete = cell.events.filter(e => e.peakMv >= 0 && e.repolarized).map(e => e.timeMs);
    if (JSON.stringify(complete) !== JSON.stringify(cell.spikeTimesMs)) fail('soma events disagree with their recorded classification.');
  }
  if (nodes !== run.compartments || nodes > 20000) fail('compartment totals disagree.');
  if (run.cells.every(cell => cell.neuralUv)) {
    for (let i = 0; i < frames * 8; i++) {
      const sum = run.cells.reduce((value, cell) => value + cell.neuralUv[i], 0);
      if (Math.abs(sum - run.neuralUv[i]) > 1e-8 + 1e-10 * Math.abs(sum)) fail('per-cell contributions disagree with the total recording.');
    }
  }
  if (run.solverSourceHashes && Object.values(run.solverSourceHashes).some(hash => typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)))
    fail('invalid solver source fingerprints.');
  // Version 1 originally omitted this optional geometry field. This is the
  // only supported migration: omitted contactGeometry means the original pads.
  return { ...run, config };
}

export function validateInterfaceReplay(payload) {
  if (payload?.version === INTERFACE_COMPARISON_VERSION) {
    const spec = validateInterfaceComparisonSpec(payload.spec);
    const a = validateRun(payload.baseline), b = validateRun(payload.variant);
    const hashMap = value => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0 &&
      Object.values(value).every(hash => typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash));
    for (const run of [a, b]) {
      if (run.engineManifestVersion !== INTERFACE_ENGINE_MANIFEST.version || !hashMap(run.solverSourceHashes) ||
        Object.keys(INTERFACE_ENGINE_MANIFEST.sourceHashes).some(key => !Object.hasOwn(run.solverSourceHashes, key)) ||
        run.cells.some(cell => !hashMap(cell.sourceHashes))) fail('comparison is missing complete engine or cell-source provenance.');
      const field = run.fieldMetadata;
      if (!field || field.model !== 'cortex-joint-planar-contacts/1' || field.return !== 'infinity' || field.contactPlane !== 'y=0' ||
        field.tissueHalfSpace !== 'y>0' || field.potentialCoefficientUnit !== 'mV/µA = µV/nA' ||
        field.conductivitySm !== run.config.conductivitySm || field.panelDivisions !== run.config.panelDivisions ||
        field.minimumHeightUm !== 10 || field.designId !== run.design.id) fail('comparison conductor metadata is incompatible.');
    }
    if (canonicalInterfaceInput(a.solverSourceHashes) !== canonicalInterfaceInput(b.solverSourceHashes) ||
      a.fieldMetadata.method !== b.fieldMetadata.method || a.fieldMetadata.status !== b.fieldMetadata.status)
      fail('comparison conditions use different engine or conductor implementations.');
    // Never trust imported metrics to describe the accompanying numerical arrays.
    return { ...payload, spec, baseline: a, variant: b, analysis: analyzeInterfaceComparison(a, b, spec) };
  }
  return validateRun(payload);
}

export async function readInterfaceReplayFile(file) {
  if (!file || !Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_INTERFACE_FILE_BYTES)
    fail('choose a replay file no larger than 64 MiB.');
  const magic = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  let stream = file.stream();
  if (magic[0] === 31 && magic[1] === 139) {
    if (typeof DecompressionStream === 'undefined') fail('this browser cannot decompress gzip replays.');
    stream = stream.pipeThrough(new DecompressionStream('gzip'));
  }
  const reader = stream.getReader(), chunks = []; let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > MAX_INTERFACE_ARCHIVE_BYTES) { await reader.cancel(); fail('decompressed replay exceeds 192 MiB.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return validateInterfaceReplay(decodeInterfaceArchive(bytes));
}
