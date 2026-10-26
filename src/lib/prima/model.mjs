/** Experiment definition. Physical and perceptual predictions remain distinct. */
import { PHYSICS_DEFAULTS, normalizePhysicsConfig } from './physics.mjs';

export const MODEL_VERSION = 'prima-1.0.0';
export const EXPORT_SCHEMA = 'bts.prima.experiment.v1';
export const DEFAULT_CONFIG = Object.freeze({
  ...PHYSICS_DEFAULTS,
  selectedPixelId: 'P142',
  stimulus: 'landolt', orientation: 'right', letter: 'E',
  landoltGapUm: 120, gratingCycles: 8, spotRadiusUm: 75,
  zoom: 1, contrast: 1, brightness: 1, blurSigmaPx: 0,
  offsetXUm: 0, offsetYUm: 0, imageSize: 256, customImage: null,
  pixelWidthUm: 100, implantWidthUm: 2000, retinalScaleUmDeg: 288,
  contrastModel: 'gamma', gamma: 2.6, sigmoidGain: 20, sigmoidOffset: 0.2,
  taper: 0.3, radiusExpansion: 0.3,
});

export const PRESETS = Object.freeze([
  { id: 'native', title: 'Native resolution', description: 'A 120 µm Landolt-C gap projected onto the published 100 µm pixel geometry.', config: { stimulus: 'landolt', selectedPixelId: 'P142' } },
  { id: 'magnification', title: 'Magnification', description: 'Fourfold magnification enlarges a 60 µm scene gap, with a corresponding reduction in scene coverage.', config: { stimulus: 'landolt', landoltGapUm: 60, zoom: 4, selectedPixelId: 'P145' } },
  { id: 'reading', title: 'Letter projection', description: 'Follow a synthetic letter through projection, photovoltaic stimulation and the separate percept approximation.', config: { stimulus: 'letter', letter: 'E', selectedPixelId: 'P178' } },
  { id: 'contrast', title: 'Contrast loss', description: 'A low-contrast grating illustrates the assumed contrast transform.', config: { stimulus: 'grating', gratingCycles: 8, contrast: 0.35, selectedPixelId: 'P180' } },
  { id: 'spot', title: 'Local illumination', description: 'A small light spot reveals local currents and their shared return path.', config: { stimulus: 'spot', spotRadiusUm: 65, selectedPixelId: 'P180' } },
  { id: 'alignment', title: 'Projection alignment', description: 'Move the projected letter toward the edge of the reconstructed array.', config: { stimulus: 'letter', letter: 'E', offsetXUm: 650, offsetYUm: 200, selectedPixelId: 'P203' } },
  { id: 'recovery', title: 'Electrode recovery', description: 'Short optical pulses expose charging and discharge between successive frames.', config: { stimulus: 'spot', spotRadiusUm: 140, pulseDurationMs: 0.7, shuntMohm: 3, cycles: 5, selectedPixelId: 'P180' } },
]);

export const PARAMETER_BOUNDS = Object.freeze({
  irradianceMwMm2: [0, 4], pulseDurationMs: [0.7, 9.8], frequencyHz: [1, 40], cycles: [1, 8], timeStepMs: [0.025, 0.5],
  conductivitySm: [0.05, 1], gapUm: [10, 100], bipolarLengthUm: [20, 100], activeRadiusUm: [8, 20], returnWidthUm: [2, 6],
  capacitanceDensityFm2: [1, 40], shuntMohm: [0.1, 10], responsivityAW: [0.1, 0.65], diodeIdeality: [1, 2], diodeSaturationNa: [0.00001, 0.1],
  landoltGapUm: [30, 350], gratingCycles: [1, 30], spotRadiusUm: [10, 700], zoom: [1, 12], contrast: [0, 1], brightness: [0, 1],
  blurSigmaPx: [0, 8], offsetXUm: [-2000, 2000], offsetYUm: [-2000, 2000], retinalScaleUmDeg: [250, 320],
  gamma: [1, 4], sigmoidGain: [1, 40], sigmoidOffset: [0, 1],
});
const ENUMS = { stimulus: ['landolt', 'letter', 'grating', 'checkerboard', 'face', 'spot', 'blank', 'image'], orientation: ['right', 'down', 'left', 'up'], letter: ['E', 'F', 'H', 'T'], contrastModel: ['none', 'gamma', 'sigmoid'] };
const KEYS = new Set(Object.keys(DEFAULT_CONFIG));
export function normalizeConfig(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Experiment settings must be an object.');
  for (const key of Object.keys(input)) if (!KEYS.has(key)) throw new Error(`Unknown PRIMA setting: ${key}.`);
  const c = { ...DEFAULT_CONFIG, ...input };
  for (const [key, [lo, hi]] of Object.entries(PARAMETER_BOUNDS)) {
    if (typeof c[key] !== 'number' || !Number.isFinite(c[key]) || c[key] < lo || c[key] > hi) throw new Error(`${key} must be a finite number from ${lo} to ${hi}.`);
  }
  for (const [key, options] of Object.entries(ENUMS)) if (!options.includes(c[key])) throw new Error(`Unsupported ${key}: ${c[key]}.`);
  if (!Number.isInteger(c.cycles)) throw new Error('The optical train must contain an integer number of periods.');
  if (![128, 256].includes(c.imageSize)) throw new Error('Image size must be 128 or 256 pixels per side.');
  if (![31, 61, 81].includes(c.fieldGridSize)) throw new Error('Field grid size must be 31, 61 or 81 points per side.');
  if (c.pixelWidthUm !== 100 || c.implantWidthUm !== 2000) throw new Error('This published-device mode uses 100 µm pixels and a 2000 µm implant.');
  if (c.taper !== 0.3 || c.radiusExpansion !== 0.3) throw new Error('The published ProViSim filter uses fixed 0.3 taper and radius expansion.');
  if (!/^P\d{3}$/.test(c.selectedPixelId) || +c.selectedPixelId.slice(1) < 1 || +c.selectedPixelId.slice(1) > 378) throw new Error('Selected pixel must be P001 through P378.');
  if (c.pulseDurationMs >= 1000 / c.frequencyHz) throw new Error('Each optical pulse must leave a dark recovery interval.');
  if (c.cycles * 1000 / c.frequencyHz / c.timeStepMs > 12000) throw new Error('This run exceeds 12,000 time steps. Reduce the number of periods or increase the time step.');
  if (c.customImage !== null) {
    const image = c.customImage;
    if (!image || typeof image !== 'object' || !Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 1 || image.height < 1 || image.width > 1024 || image.height > 1024) throw new Error('Imported images must have integer dimensions between 1 and 1024.');
    if (!(Array.isArray(image.values) || ArrayBuffer.isView(image.values)) || image.values.length !== image.width * image.height) throw new Error('Imported image sample count does not match its dimensions.');
    if (!Array.from(image.values).every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1)) throw new Error('Image values must be finite grayscale values from 0 to 1.');
    c.customImage = { width: image.width, height: image.height, values: Array.from(image.values) };
  }
  if (c.stimulus === 'image' && !c.customImage) throw new Error('Load a local image before selecting the image stimulus.');
  normalizePhysicsConfig(c);
  return c;
}
export function validateConfig(input) {
  try { normalizeConfig(input); return { valid: true, errors: [] }; }
  catch (error) { return { valid: false, errors: [error.message] }; }
}
export function configurationId(config) {
  const c = normalizeConfig(config);
  const ordered = value => Array.isArray(value) ? value.map(ordered) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])])) : value;
  const text = JSON.stringify(ordered(c));
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return 'PRIMA-' + (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

