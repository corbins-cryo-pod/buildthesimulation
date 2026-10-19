/**
 * Lightweight controlled-comparison contracts and descriptive analysis.
 * No cell-model assets or membrane solver are imported here. Event matching
 * describes temporal correspondence within a declared window; it does not
 * establish causality, axonal propagation, detection, or biological selectivity.
 */
import { INTERFACE_COMPARISON_VERSION, validateInterfaceConfig } from './interface-contract.js';
import { makeInterfaceDesign } from './interface-field.js';
export { INTERFACE_COMPARISON_VERSION } from './interface-contract.js';

/** Stable JSON text, not a cryptographic digest or an authenticity guarantee. */
export function canonicalInterfaceInput(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Canonical inputs require finite numbers.');
    return JSON.stringify(value);
  }
  if (Array.isArray(value) || ArrayBuffer.isView(value))
    return `[${Array.from(value, canonicalInterfaceInput).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).filter(key => value[key] !== undefined).sort()
    .map(key => `${JSON.stringify(key)}:${canonicalInterfaceInput(value[key])}`).join(',')}}`;
  throw new Error('Unsupported canonical input value.');
}
const same = (a, b) => canonicalInterfaceInput(a) === canonicalInterfaceInput(b);

export function validateInterfaceComparisonSpec(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('A comparison specification is required.');
  if (input.version !== INTERFACE_COMPARISON_VERSION) throw new Error('Unsupported interface comparison version.');
  if (!['geometry', 'stimulation'].includes(input.kind)) throw new Error('Unknown comparison kind.');
  const allowed = ['version', 'kind', 'eventMatchWindowMs', ...(input.kind === 'geometry'
    ? ['contactIndex', 'baselineVariantId', 'variantVariantId'] : [])];
  if (Object.keys(input).some(key => !allowed.includes(key))) throw new Error('Unsupported comparison setting.');
  const eventMatchWindowMs = input.eventMatchWindowMs ?? 5;
  if (eventMatchWindowMs !== 5) throw new Error('This comparison version uses a declared 5 ms event matching window.');
  const spec = { version: INTERFACE_COMPARISON_VERSION, kind: input.kind, eventMatchWindowMs };
  if (input.kind === 'geometry') {
    const { contactIndex, baselineVariantId, variantVariantId } = input;
    for (const variantId of [baselineVariantId, variantVariantId]) makeInterfaceDesign({ contactIndex, variantId });
    if (baselineVariantId === variantVariantId) throw new Error('Select two distinct contact geometries.');
    return { ...spec, contactIndex, baselineVariantId, variantVariantId };
  }
  return spec;
}

function changesBetween(a, b, prefix = '') {
  const changes = [];
  for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    const path = prefix ? `${prefix}.${key}` : key, av = a[key], bv = b[key];
    if (av === undefined || bv === undefined) {
      if (av !== bv) changes.push({ path, baseline: av ?? null, variant: bv ?? null });
    } else if (!same(av, bv)) {
      if (av && bv && typeof av === 'object' && typeof bv === 'object' && !Array.isArray(av) && !Array.isArray(bv))
        changes.push(...changesBetween(av, bv, path));
      else changes.push({ path, baseline: av, variant: bv });
    }
  }
  return changes;
}

export function makeInterfaceComparisonConfigs(input, specInput) {
  const config = validateInterfaceConfig(input), spec = validateInterfaceComparisonSpec(specInput);
  let baselineConfig, variantConfig;
  if (spec.kind === 'geometry') {
    baselineConfig = validateInterfaceConfig({ ...config,
      contactGeometry: { contactIndex: spec.contactIndex, variantId: spec.baselineVariantId } });
    variantConfig = validateInterfaceConfig({ ...config,
      contactGeometry: { contactIndex: spec.contactIndex, variantId: spec.variantVariantId } });
  } else {
    if (config.mode === 'recording') throw new Error('A stimulation comparison requires evoked or combined mode.');
    if (!(config.amplitudeUa > 0)) throw new Error('A stimulation comparison requires positive variant current.');
    if (config.startMs + (2 * config.phaseUs + config.gapUs) / 1000 > config.durationMs)
      throw new Error('The comparison window must contain at least one complete stimulation pulse.');
    baselineConfig = validateInterfaceConfig({ ...config, amplitudeUa: 0 });
    variantConfig = validateInterfaceConfig(config);
  }
  return { spec, baselineConfig, variantConfig, inputChanges: changesBetween(baselineConfig, variantConfig) };
}

/**
 * Ordered one-to-one event matching: maximize the number of pairs inside the
 * inclusive window, then minimize their summed absolute time differences.
 * Unmatched events are descriptive added/lost events within this window and
 * detector definition; phase changes beyond the window are not distinguished.
 */
export function matchInterfaceEvents(baselineTimes, variantTimes, windowMs = 5) {
  if (!(windowMs >= 0) || !Number.isFinite(windowMs)) throw new Error('Event matching window must be finite and nonnegative.');
  for (const times of [baselineTimes, variantTimes]) {
    if ((!Array.isArray(times) && !ArrayBuffer.isView(times)) || times.length > 1000)
      throw new Error('Event times must be a bounded ordered array.');
    for (let i = 0; i < times.length; i++)
      if (!Number.isFinite(times[i]) || (i && times[i] <= times[i - 1])) throw new Error('Event times must be finite and strictly increasing.');
  }
  const n = baselineTimes.length, m = variantTimes.length, stride = m + 1;
  const counts = new Uint16Array((n + 1) * stride), costs = new Float64Array(counts.length), choices = new Uint8Array(counts.length);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    const index = i * stride + j, skipA = index + stride, skipB = index + 1;
    let count = counts[skipA], cost = costs[skipA], choice = 1;
    if (counts[skipB] > count || (counts[skipB] === count && costs[skipB] < cost)) {
      count = counts[skipB]; cost = costs[skipB]; choice = 2;
    }
    const distance = Math.abs(variantTimes[j] - baselineTimes[i]), paired = skipA + 1;
    if (distance <= windowMs && (counts[paired] + 1 > count
      || (counts[paired] + 1 === count && costs[paired] + distance <= cost))) {
      count = counts[paired] + 1; cost = costs[paired] + distance; choice = 3;
    }
    counts[index] = count; costs[index] = cost; choices[index] = choice;
  }
  const matched = [], added = [], lost = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    const choice = i === n ? 2 : j === m ? 1 : choices[i * stride + j];
    if (choice === 3) {
      const deltaMs = variantTimes[j] - baselineTimes[i];
      matched.push({ baselineIndex: i, variantIndex: j, baselineTimeMs: baselineTimes[i], variantTimeMs: variantTimes[j], deltaMs,
        classification: Math.abs(deltaMs) <= 1e-9 ? 'unchanged' : deltaMs < 0 ? 'advanced' : 'delayed' });
      i++; j++;
    } else if (choice === 1) lost.push({ baselineIndex: i, timeMs: baselineTimes[i++] });
    else added.push({ variantIndex: j, timeMs: variantTimes[j++] });
  }
  return { matched, added, lost };
}

function pairedSignalMetrics(baseline, variant, contactIndex, contactCount, signal) {
  let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
  let dMin = Infinity, dMax = -Infinity, squared = 0, maximumAbsoluteDeltaUv = 0;
  const frames = baseline.timeMs.length;
  for (let f = 0; f < frames; f++) {
    const index = f * contactCount + contactIndex;
    const value = result => signal === 'total' ? result.neuralUv[index] + result.artifactUv[index]
      : result[signal === 'neural' ? 'neuralUv' : 'artifactUv'][index];
    const a = value(baseline), b = value(variant), d = b - a;
    if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error('Comparison signals must be finite.');
    aMin = Math.min(aMin, a); aMax = Math.max(aMax, a); bMin = Math.min(bMin, b); bMax = Math.max(bMax, b);
    dMin = Math.min(dMin, d); dMax = Math.max(dMax, d); squared += d * d;
    maximumAbsoluteDeltaUv = Math.max(maximumAbsoluteDeltaUv, Math.abs(d));
  }
  return { baselinePeakToPeakUv: aMax - aMin, variantPeakToPeakUv: bMax - bMin,
    peakToPeakChangeUv: (bMax - bMin) - (aMax - aMin), deltaPeakToPeakUv: dMax - dMin,
    deltaRmsUv: Math.sqrt(squared / frames), maximumAbsoluteDeltaUv };
}

function validatePair(baseline, variant, spec) {
  const expected = makeInterfaceComparisonConfigs(variant.config, spec);
  if (baseline.version !== expected.baselineConfig.version || variant.version !== expected.variantConfig.version || !same(validateInterfaceConfig(baseline.config), expected.baselineConfig)
    || !same(validateInterfaceConfig(variant.config), expected.variantConfig))
    throw new Error('Paired experiments changed inputs outside the declared comparison.');
  if (!same(baseline.design, makeInterfaceDesign(expected.baselineConfig.contactGeometry))
    || !same(variant.design, makeInterfaceDesign(expected.variantConfig.contactGeometry)))
    throw new Error('Paired result geometry does not match its declared configuration.');
  if (!baseline.timeMs?.length || !same(baseline.timeMs, variant.timeMs)) throw new Error('Paired experiments require the same output timebase.');
  if (baseline.cells?.length !== expected.baselineConfig.count || variant.cells?.length !== baseline.cells.length)
    throw new Error('Paired experiments require the same complete cell set.');
  const expectedFrames = Math.floor(Math.round(expected.baselineConfig.durationMs / expected.baselineConfig.dtMs)
    / Math.round(expected.baselineConfig.sampleMs / expected.baselineConfig.dtMs)) + 1;
  if (baseline.timeMs.length !== expectedFrames) throw new Error('Paired output timebase does not match the protocol.');
  for (let f = 0; f < expectedFrames; f++)
    if (baseline.timeMs[f] !== f * expected.baselineConfig.sampleMs) throw new Error('Paired output timebase does not match the sampling convention.');
  const contacts = baseline.design.contacts.length, length = expectedFrames * contacts;
  for (const result of [baseline, variant]) {
    if (result.neuralUv?.length !== length || result.artifactUv?.length !== length) throw new Error('Paired signal dimensions do not match the timebase.');
  }
  for (let i = 0; i < baseline.cells.length; i++) {
    const a = baseline.cells[i], b = variant.cells[i];
    if (a.id !== b.id || a.specimenId !== b.specimenId || a.source !== b.source
      || !same(a.sourceHashes ?? null, b.sourceHashes ?? null) || !same(a.somaUm, b.somaUm) || !same(a.nodes, b.nodes)
      || a.backgroundNa !== b.backgroundNa || a.backgroundStartMs !== b.backgroundStartMs)
      throw new Error('Paired experiments require unchanged source identities, morphology, poses and background drive.');
    if (a.neuralUv?.length !== length || b.neuralUv?.length !== length) throw new Error('Per-cell recording dimensions do not match the paired output.');
  }
  for (const result of [baseline, variant]) for (let i = 0; i < length; i++) {
    let sum = 0;
    for (const cell of result.cells) {
      if (!Number.isFinite(cell.neuralUv[i])) throw new Error('Per-cell recording contributions must be finite.');
      sum += cell.neuralUv[i];
    }
    if (!Number.isFinite(result.neuralUv[i]) || Math.abs(sum - result.neuralUv[i]) > 1e-10 * Math.max(1, Math.abs(sum), Math.abs(result.neuralUv[i])))
      throw new Error('Per-cell contributions do not sum to the aggregate recording within floating-point tolerance.');
  }
  return expected;
}

export function analyzeInterfaceComparison(baseline, variant, specInput) {
  const spec = validateInterfaceComparisonSpec(specInput), expected = validatePair(baseline, variant, spec);
  const cells = baseline.cells.map((cell, cellIndex) => ({ cellIndex, id: cell.id, specimenId: cell.specimenId, label: cell.label,
    baselineEventCount: cell.spikeTimesMs.length, variantEventCount: variant.cells[cellIndex].spikeTimesMs.length,
    ...matchInterfaceEvents(cell.spikeTimesMs, variant.cells[cellIndex].spikeTimesMs, spec.eventMatchWindowMs) }));
  const contacts = baseline.design.contacts.map((contact, contactIndex) => ({ contactIndex, contactId: contact.id,
    neural: pairedSignalMetrics(baseline, variant, contactIndex, baseline.design.contacts.length, 'neural'),
    artifact: pairedSignalMetrics(baseline, variant, contactIndex, baseline.design.contacts.length, 'artifact'),
    total: pairedSignalMetrics(baseline, variant, contactIndex, baseline.design.contacts.length, 'total') }));
  return { inputChanges: expected.inputChanges,
    canonicalInputs: { format: 'canonical-json/1', baseline: canonicalInterfaceInput(expected.baselineConfig), variant: canonicalInterfaceInput(expected.variantConfig) },
    eventMatchWindowMs: spec.eventMatchWindowMs, cells, contacts,
    eventMatching: 'Ordered one-to-one matching maximizes pair count within the inclusive 5 ms window, then minimizes total absolute timing difference. Added/lost labels are unmatched events under this rule. Timing changes within 1e-9 ms are labeled unchanged.',
    signalConvention: 'Raw ideal contact signals in µV. Delta is variant minus baseline at identical saved times; peak-to-peak is over the complete saved window. Membrane-source signals include ionic and capacitive currents, not only isolated spikes.',
    scope: 'Descriptive ground-truth model comparison. Event correspondence does not establish causal attribution, propagation, extracellular detectability, converged selectivity or biological validity. Both conditions use complete active-cable solves.' };
}
