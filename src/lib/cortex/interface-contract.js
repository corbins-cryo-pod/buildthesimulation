export const INTERFACE_VERSION = 'cortex-interface/1';
export const INTERFACE_DEFAULT = Object.freeze({
  version: INTERFACE_VERSION, count: 12, mode: 'recording', activeContacts: [3],
  amplitudeUa: 10, phaseUs: 200, gapUs: 100, frequencyHz: 40, startMs: 40,
  durationMs: 260, dtMs: .005, sampleMs: .1, settleMs: 100,
  segmentLengthUm: 40, panelDivisions: 4, conductivitySm: .3, clearanceUm: 25,
});
export const freshInterfaceConfig = () => structuredClone(INTERFACE_DEFAULT);
