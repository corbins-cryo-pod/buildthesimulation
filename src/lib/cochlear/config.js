export const MODEL_VERSION = '1.0.0';
export const DEFAULT_SETTINGS = Object.freeze({
  signalKind: 'tone', durationMs: 60, sampleRate: 24000, toneHz: 1000, secondToneHz: 2200,
  modulationHz: 40, modulationDepth: .8, levelDbfs: -9, seed: 42,
  channelCount: 12, lowHz: 200, highHz: 8000, strategy: 'cis', frameRateHz: 600,
  maxima: 8, envelopeCutoffHz: 150, inputMinDbfs: -55, inputMaxDbfs: 0,
  minCurrentUA: 0, maxCurrentUA: 900, gamma: .7, phaseWidthUs: 50, gapUs: 8,
  guardUs: 2, polarity: 'cathodic', activeMask: Array(12).fill(true),
  arraySpanMm: 16, apicalDepthMm: 26, radialDistanceMm: .5, contactRadiusMm: .15,
  conductivitySPerM: 1 / 3, returnMode: 'monopolar', focusFraction: .75,
  fiberCount: 33, neuralLoss: 0, lossCentreMm: 20, lossWidthMm: 6,
  dtUs: 1, traceEveryUs: 20, replayEveryUs: 200,
});
const RANGES = {
  durationMs: [10, 250], sampleRate: [16000, 96000], toneHz: [200, 8000], secondToneHz: [200, 8000],
  modulationHz: [1, 200], modulationDepth: [0, 1], levelDbfs: [-60, 0], seed: [0, 4294967295],
  channelCount: [4, 24], lowHz: [100, 1000], highHz: [2000, 10000], frameRateHz: [100, 2000], maxima: [1, 24],
  envelopeCutoffHz: [20, 500], inputMinDbfs: [-100, -1], inputMaxDbfs: [-30, 0],
  minCurrentUA: [0, 1000], maxCurrentUA: [0, 2000], gamma: [.1, 3], phaseWidthUs: [10, 100],
  gapUs: [0, 30], guardUs: [0, 30], arraySpanMm: [8, 22], apicalDepthMm: [16, 32],
  radialDistanceMm: [.1, 2], contactRadiusMm: [.03, .35], conductivitySPerM: [.1, 2],
  focusFraction: [0, 1], fiberCount: [9, 65], neuralLoss: [0, 1], lossCentreMm: [2, 33], lossWidthMm: [1, 20],
  dtUs: [.5, 5], traceEveryUs: [10, 100], replayEveryUs: [100, 1000],
};
export function normalizeSettings(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Experiment settings must be an object.');
  const result = { ...DEFAULT_SETTINGS };
  for (const [key, [min, max]] of Object.entries(RANGES)) {
    const value = input[key] ?? DEFAULT_SETTINGS[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${key} must be a finite number between ${min} and ${max}.`);
    result[key] = value;
  }
  for (const key of ['channelCount', 'maxima', 'fiberCount', 'sampleRate', 'seed']) if (!Number.isInteger(result[key])) throw new Error(`${key} must be an integer.`);
  const choices = { signalKind: ['tone', 'sweep', 'two-tone', 'am', 'synthetic-vowel', 'noise', 'silence', 'uploaded'], strategy: ['cis', 'nofm'], polarity: ['cathodic', 'anodic'], returnMode: ['monopolar', 'bipolar', 'partial-tripolar'] };
  for (const [key, values] of Object.entries(choices)) { result[key] = input[key] ?? DEFAULT_SETTINGS[key]; if (!values.includes(result[key])) throw new Error(`Unknown ${key}.`); }
  if (result.apicalDepthMm - result.arraySpanMm < 1) throw new Error('The array must remain within the 35 mm reference path; reduce its span or move the apical position.');
  if (2 * result.contactRadiusMm >= result.arraySpanMm / (result.channelCount - 1)) throw new Error('Contact diameter must be smaller than contact spacing.');
  if (result.lowHz >= result.highHz || result.highHz >= result.sampleRate / 2) throw new Error('Analysis frequencies must be ordered and below the audio Nyquist frequency.');
  if (result.inputMinDbfs >= result.inputMaxDbfs) throw new Error('Input minimum must be below the input maximum.');
  if (result.minCurrentUA > result.maxCurrentUA) throw new Error('Minimum current cannot exceed maximum current.');
  const mask = input.activeMask ?? Array(result.channelCount).fill(true);
  if (!Array.isArray(mask) || mask.length !== result.channelCount || mask.some(v => typeof v !== 'boolean')) throw new Error('The active-contact mask must contain one boolean per contact.');
  result.activeMask = mask.slice(); result.maxima = Math.min(result.maxima, result.channelCount); return result;
}
export const PRESETS = [
  { id: 'tone', title: 'Follow a tone', question: 'Where does a 1 kHz tone drive the nerve?', settings: {} },
  { id: 'sweep', title: 'Frequency sweep', question: 'How does a changing sound frequency move the selected source channels?', settings: { signalKind: 'sweep', durationMs: 100, strategy: 'nofm', maxima: 4 } },
  { id: 'two-tone', title: 'Two frequencies', question: 'How do two spectral peaks interact with channel selection?', settings: { signalKind: 'two-tone', toneHz: 800, secondToneHz: 2800, strategy: 'nofm', maxima: 4 } },
  { id: 'close', title: 'Closer array', question: 'How does reducing electrode–nerve distance change the calculated response?', settings: { radialDistanceMm: .25 } },
  { id: 'contacts', title: 'More contacts', question: 'What changes when 24 contacts occupy the same physical span?', settings: { channelCount: 24, activeMask: Array(24).fill(true), strategy: 'nofm', maxima: 8 } },
  { id: 'loss', title: 'Local nerve loss', question: 'What remains when fibers in a local region are removed?', settings: { neuralLoss: 1, lossCentreMm: 20, lossWidthMm: 7 } },
  { id: 'focus', title: 'Focused return', question: 'How does a partial tripolar return alter recruitment at the same source current?', settings: { returnMode: 'partial-tripolar', focusFraction: .75 } },
  { id: 'vowel', title: 'Synthetic vowel', question: 'How do synthetic formants shape the envelopes and pulse pattern?', settings: { signalKind: 'synthetic-vowel', durationMs: 100, strategy: 'nofm', maxima: 8 } },
];
export function presetSettings(id) { const preset = PRESETS.find(p => p.id === id); if (!preset) throw new Error('Unknown experiment preset.'); return normalizeSettings({ ...DEFAULT_SETTINGS, ...preset.settings }); }
export function settingsKey(settings) { return JSON.stringify(normalizeSettings(settings)); }
export function serializeExperiment(settings, metadata = {}, audio = null) {
  const prepared = normalizeSettings(settings);
  const record = { format: 'buildthesimulation-cochlear', version: MODEL_VERSION, settings: prepared, metadata };
  if (prepared.signalKind === 'uploaded') {
    if (!audio?.samples?.length) throw new Error('Uploaded-audio experiments require the simulated audio samples.');
    record.audio = { label: audio.label ?? 'Uploaded audio', sampleRate: audio.sampleRate, samples: Array.from(audio.samples) };
  }
  return JSON.stringify(record, null, 2);
}
export function parseExperiment(text) {
  if (typeof text !== 'string' || text.length > 4000000) throw new Error('Experiment file is too large.');
  const record = JSON.parse(text);
  if (record?.format !== 'buildthesimulation-cochlear' || record.version !== MODEL_VERSION) throw new Error('This file is not a compatible cochlear experiment.');
  const settings = normalizeSettings(record.settings); let audio = null;
  if (record.audio) {
    const a = record.audio;
    if (!Number.isInteger(a.sampleRate) || a.sampleRate < 16000 || a.sampleRate > 96000 || !Array.isArray(a.samples) || !a.samples.length || a.samples.length > 24000 || a.samples.some(v => typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > 1)) throw new Error('The saved audio samples are invalid.');
    if (a.sampleRate !== settings.sampleRate || Math.abs(a.samples.length / a.sampleRate * 1000 - settings.durationMs) > 1) throw new Error('Saved audio must match the experiment sample rate and duration.');
    audio = { label: typeof a.label === 'string' ? a.label.slice(0, 300) : 'Uploaded audio', sampleRate: a.sampleRate, samples: Float32Array.from(a.samples) };
  }
  if (settings.signalKind === 'uploaded' && !audio) throw new Error('This uploaded-audio experiment does not include its audio window.');
  return { settings, audio, metadata: record.metadata ?? {} };
}
