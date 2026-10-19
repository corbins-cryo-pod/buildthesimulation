import { makeInterfaceDesign } from './interface-field.js';
import { INTERFACE_PRESETS } from './interface-presets.js';

export const INTERFACE_COMPARISON_VERSION = 'cortex-interface-comparison/1';
export const INTERFACE_VERSION = 'cortex-interface/1';
export const INTERFACE_DEFAULT = Object.freeze({
  version: INTERFACE_VERSION, count: 12, mode: 'recording', activeContacts: [3],
  amplitudeUa: 10, phaseUs: 200, gapUs: 100, frequencyHz: 40, startMs: 40,
  durationMs: 260, dtMs: .005, sampleMs: .1, settleMs: 100,
  segmentLengthUm: 40, panelDivisions: 4, conductivitySm: .3, clearanceUm: 25,
  contactGeometry: null,
});
export const freshInterfaceConfig = () => structuredClone(INTERFACE_DEFAULT);

export function validateInterfaceConfig(input) {
  const config = { ...freshInterfaceConfig(), ...input };
  if (config.version !== INTERFACE_VERSION) throw new Error('Unsupported interface experiment version.');
  const range = (key, low, high) => {
    if (!Number.isFinite(config[key]) || config[key] < low || config[key] > high)
      throw new Error(`${key} must be between ${low} and ${high}.`);
  };
  range('count', 1, INTERFACE_PRESETS.length);
  if (!Number.isInteger(config.count)) throw new Error('Select a whole number of cells.');
  if (!['recording', 'evoked', 'combined'].includes(config.mode)) throw new Error('Unknown experiment mode.');
  range('amplitudeUa', 0, 100); range('phaseUs', 100, 1000); range('gapUs', 0, 1000);
  range('frequencyHz', 1, 100); range('startMs', 0, 200); range('durationMs', 20, 300);
  range('conductivitySm', .1, 1); range('clearanceUm', 25, 200);
  // Preset calibration and replay sizes are bound to these numerical settings.
  if (config.dtMs !== .005 || config.sampleMs !== .1 || config.settleMs !== 100 ||
      config.segmentLengthUm !== 40 || config.panelDivisions !== 4)
    throw new Error('This experiment requires the documented calibrated solver and field resolution.');
  if (!Array.isArray(config.activeContacts) || config.activeContacts.some(i => !Number.isInteger(i) || i < 0 || i > 7))
    throw new Error('Contact indices must be between 0 and 7.');
  config.activeContacts = [...new Set(config.activeContacts)].sort((a, b) => a - b);
  if (config.mode !== 'recording' && !config.activeContacts.length) throw new Error('Select at least one stimulation contact.');
  for (const key of ['phaseUs', 'gapUs'])
    if (Math.abs(config[key] / (config.dtMs * 1000) - Math.round(config[key] / (config.dtMs * 1000))) > 1e-7)
      throw new Error('Pulse edges must align to the 5 µs integration step.');
  const design = makeInterfaceDesign(config.contactGeometry);
  config.contactGeometry = design.contactGeometry ? { ...design.contactGeometry } : null;
  return config;
}

