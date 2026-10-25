import { MODEL_VERSION, normalizeSettings } from './config.js';
import { createGeometry, frequencyMismatchSemitones } from './geometry.js';
import { buildLeadFields } from './fields.js';
import { createSyntheticAudio } from './audio.js';
import { runProcessor, assertPulseSchedule } from './processor.js';
import { createNerveModel, simulateFiber, NERVE_PROVENANCE } from './nerve.js';

export function prepareAudio(settings, uploaded = null, durationMs = settings.durationMs) {
  if (settings.signalKind === 'uploaded') {
    if (!uploaded?.samples?.length || !uploaded.sampleRate) throw new Error('Choose an audio file before running this experiment.');
    const count = Math.round(durationMs * uploaded.sampleRate / 1000);
    if (uploaded.samples.length < count) throw new Error('The selected audio is shorter than the neural simulation window.');
    return { samples: Float32Array.from(uploaded.samples.slice(0, count)), sampleRate: uploaded.sampleRate, label: uploaded.label ?? 'Uploaded audio' };
  }
  return createSyntheticAudio({ kind: settings.signalKind, durationS: durationMs / 1000, sampleRate: settings.sampleRate,
    toneHz: settings.toneHz, secondToneHz: settings.secondToneHz, modulationHz: settings.modulationHz, modulationDepth: settings.modulationDepth,
    amplitude: 10 ** (settings.levelDbfs / 20), lowHz: settings.lowHz, highHz: settings.highHz, seed: settings.seed });
}
export function audioFingerprint(samples, sampleRate) {
  let h = 2166136261;
  const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
  for (const value of bytes) { h ^= value; h = Math.imul(h, 16777619); }
  return `pcm-fnv1a-${sampleRate}-${samples.length}-${(h >>> 0).toString(16).padStart(8, '0')}`;
}
export function runExperiment(input, uploaded = null, onProgress = () => {}) {
  const settings = normalizeSettings(input), started = performance.now();
  const audio = prepareAudio(settings, uploaded), processor = runProcessor(audio.samples, audio.sampleRate, settings);
  assertPulseSchedule(processor);
  onProgress({ fraction: .03, stage: 'Building finite-contact fields' });
  const geometry = createGeometry(settings), model = createNerveModel(), leadFields = buildLeadFields(geometry, model.positionsMm, settings), durationMs = settings.durationMs + 3;
  const fibers = [];
  for (let i = 0; i < geometry.fibers.length; i++) {
    const descriptor = geometry.fibers[i]; let response = null;
    if (descriptor.alive) response = simulateFiber({ model, events: processor.events, leadFields: leadFields[i], durationMs,
      dtUs: settings.dtUs, phaseWidthUs: settings.phaseWidthUs, gapUs: settings.gapUs, polarity: settings.polarity,
      spikeThresholdMv: 0, traceEveryUs: settings.traceEveryUs, replayEveryUs: settings.replayEveryUs });
    fibers.push({ ...descriptor, response, spikeTimesMs: response?.spikeTimesMs ?? [] });
    onProgress({ fraction: .06 + .94 * (i + 1) / geometry.fibers.length, stage: `Solving auditory nerve ${i + 1} / ${geometry.fibers.length}` });
  }
  const surviving = fibers.filter(x => x.alive), recruited = surviving.filter(x => x.spikeTimesMs.length), spikeCount = surviving.reduce((sum, f) => sum + f.spikeTimesMs.length, 0);
  const allocation = processor.bands.map((band, index) => ({ ...band, label: geometry.contacts[index].label, positionMm: geometry.contacts[index].positionMm[0], placeHz: geometry.contacts[index].placeHz, mismatchSemitones: frequencyMismatchSemitones(geometry.contacts[index].placeHz, band.centerHz) }));
  return { version: MODEL_VERSION, settings, audio: { ...audio, fingerprint: audioFingerprint(audio.samples, audio.sampleRate) }, processor, geometry, leadFields, fibers, allocation, durationMs,
    // The completed result replaces the draft model in the anatomical views.
    // Preserve its actual physical geometry across the worker transfer; these
    // are output metadata from the solved model, not new solver parameters.
    model: { ...NERVE_PROVENANCE, compartmentCount: model.compartmentCount,
      positionsMm: model.positionsMm, lengthMm: model.lengthMm, edgeDiameterMm: model.edgeDiameterMm,
      totalLengthMm: model.totalLengthMm, type: model.type, somaIndex: model.somaIndex, somaIndices: model.somaIndices,
      detectionIndex: model.detectionIndex, stimulationNodeIndex: model.stimulationNodeIndex },
    metrics: { surviving: surviving.length, recruited: recruited.length, modeled: fibers.length, spikeCount, recruitmentFraction: surviving.length ? recruited.length / surviving.length : null, elapsedMs: performance.now() - started, totalCompartments: surviving.length * model.compartmentCount } };
}
export function scanChannels(input, onProgress = () => {}) {
  const settings = normalizeSettings(input), geometry = createGeometry(settings), model = createNerveModel(), fields = buildLeadFields(geometry, model.positionsMm, settings), n = settings.channelCount;
  const responses = [], counts = [];
  for (let channel = 0; channel < n; channel++) {
    const recruitment = new Uint8Array(geometry.fibers.length);
    for (let f = 0; f < geometry.fibers.length; f++) {
      if (geometry.fibers[f].alive && settings.activeMask[channel]) {
        const result = simulateFiber({ model, events: [{ onsetUs: 500, contactIndex: channel, amplitudeUA: settings.maxCurrentUA }], leadFields: fields[f], durationMs: 4,
          dtUs: settings.dtUs, phaseWidthUs: settings.phaseWidthUs, gapUs: settings.gapUs, polarity: settings.polarity,
          spikeThresholdMv: 0, traceEveryUs: 100, replayEveryUs: 0, recordCompartments: [model.detectionIndex] });
        recruitment[f] = result.spikeTimesMs.length > 0 ? 1 : 0;
      }
      onProgress({ fraction: (channel * geometry.fibers.length + f + 1) / (n * geometry.fibers.length), stage: `Probing contact ${channel + 1} / ${n}` });
    }
    responses.push(recruitment); counts.push(recruitment.reduce((sum, value) => sum + value, 0));
  }
  const matrix = responses.map((a, i) => responses.map((b, j) => {
    if (!counts[i] || !counts[j]) return null;
    let shared = 0; for (let f = 0; f < a.length; f++) shared += a[f] * b[f];
    return shared / Math.sqrt(counts[i] * counts[j]);
  }));
  return { settings, geometry, responses, counts, matrix, amplitudeUA: settings.maxCurrentUA, description: 'Cosine overlap of deterministic propagated-spike recruitment after isolated equal-current biphasic pulses. Empty responses are undefined.' };
}
export function findThreshold(input, contactIndex, fiberIndex) {
  const settings = normalizeSettings(input), geometry = createGeometry(settings), model = createNerveModel();
  if (!geometry.fibers[fiberIndex]?.alive) throw new Error('Choose a surviving modeled fiber.');
  if (!geometry.contacts[contactIndex] || !settings.activeMask[contactIndex]) throw new Error('Choose an enabled contact.');
  const leadFields = buildLeadFields({ ...geometry, fibers: [geometry.fibers[fiberIndex]] }, model.positionsMm, settings)[0];
  const fire = amplitudeUA => simulateFiber({ model, events: [{ onsetUs: 500, contactIndex, amplitudeUA }], leadFields, durationMs: 4,
    dtUs: settings.dtUs, phaseWidthUs: settings.phaseWidthUs, gapUs: settings.gapUs, polarity: settings.polarity,
    spikeThresholdMv: 0, traceEveryUs: 100, replayEveryUs: 0, recordCompartments: [model.detectionIndex] }).spikeTimesMs.length > 0;
  // Search the first sampled transition before bisection; high-current firing is
  // not assumed to be globally monotonic in this nonlinear membrane model.
  let low = 0, high = null;
  for (let amplitude = 25; amplitude <= 2000; amplitude += 25) { if (fire(amplitude)) { high = amplitude; break; } low = amplitude; }
  if (high === null) return { contactIndex, fiberIndex, thresholdUA: null, lowerUA: null, upperUA: null, limitUA: 2000, settings };
  for (let iteration = 0; iteration < 10; iteration++) { const mid = (low + high) / 2; if (fire(mid)) high = mid; else low = mid; }
  return { contactIndex, fiberIndex, thresholdUA: high, lowerUA: low, upperUA: high, settings, criterion: 'First propagated distal-axon 0 mV upcrossing within 4 ms for one pulse; deterministic, not a hearing threshold.' };
}
export function pulsesCSV(result) {
  const lines = ['contact,onset_us,amplitude_uA,phase_width_us,interphase_gap_us,leading_polarity,phase_charge_nC'];
  for (const e of result.processor.events) lines.push([e.contactIndex + 1, e.onsetUs, e.amplitudeUA, result.settings.phaseWidthUs, result.settings.gapUs, result.settings.polarity, e.amplitudeUA * result.settings.phaseWidthUs / 1000].join(','));
  return lines.join('\n');
}
export function spikesCSV(result) {
  const lines = ['fiber,reference_place_mm,reference_frequency_Hz,distal_spike_time_ms'];
  for (const f of result.fibers) for (const t of f.spikeTimesMs) lines.push([f.index + 1, f.placeMm, f.placeHz, t].join(','));
  return lines.join('\n');
}
export function membraneCSV(result, fiberIndex) {
  const fiber = result.fibers[fiberIndex]; if (!fiber?.response) throw new Error('This fiber has no membrane recording.');
  const r = fiber.response, lines = ['time_ms,peripheral_node_mV,soma_mV,distal_axon_mV'];
  for (let i = 0; i < r.timeMs.length; i++) lines.push([r.timeMs[i], ...r.membraneMv.map(a => a[i])].join(','));
  return lines.join('\n');
}
