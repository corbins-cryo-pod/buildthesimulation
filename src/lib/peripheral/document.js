export const PERIPHERAL_SCHEMA = 'bts-peripheral-sandbox';
export const PERIPHERAL_DOCUMENT_VERSION = 1;
export const PERIPHERAL_DOCUMENT_UNITS = 'geometry: canvas-px; nerve diameter: mm; duration: ms; frequency: Hz; stimulus: arbitrary units';
export const PERIPHERAL_RESTORE_SCOPE = 'nerve-electrode-geometry-controls-view-only';
export const PERIPHERAL_RESTORE_NOTE = 'Axon placement and firing schedules are regenerated. This document does not restore a neural replay or a random seed.';
const DATA_KEYS = ['nerve', 'fascicles', 'electrodes', 'stim', 'wave', 'view', 'scale'];
const META_KEYS = ['schema', 'version', 'units', 'restoreScope', 'restoreNote'];
const LEGACY_DEFAULTS = Object.freeze({ stim: { amp: 40, falloff: 24, thresh: 55 }, wave: { freqHz: 20, durMs: 450 }, view: { s: 1, ox: 0, oy: 0 }, scale: { nerveDiameterMm: 2, axonCount: 1000 } });

function object(value, name, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} must be an object.`);
  for (const key of Object.keys(value)) if (!keys.includes(key)) throw new Error(`${name}.${key} is not supported by this document version.`);
  return value;
}
function number(value, name, min, max, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new Error(`${name} must be ${integer ? 'an integer' : 'a finite number'} from ${min} to ${max}.`);
  return value;
}
function list(value, name, min, max) {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new Error(`${name} must contain ${min === max ? min : `${min}–${max}`} entries.`);
  return value;
}

/** Validate before allocating axon candidates or mutating the displayed model. */
export function parsePeripheralDocument(input) {
  let source = input;
  if (typeof input === 'string') {
    if (input.length > 65536) throw new Error('Peripheral documents must be at most 65,536 characters.');
    try { source = JSON.parse(input); } catch { throw new Error('The document is not valid JSON.'); }
  }
  object(source, 'document', [...DATA_KEYS, ...META_KEYS]);
  const legacy = !Object.hasOwn(source, 'schema') && !Object.hasOwn(source, 'version');
  if (!legacy && (source.schema !== PERIPHERAL_SCHEMA || source.version !== PERIPHERAL_DOCUMENT_VERSION)) throw new Error('Choose a bts-peripheral-sandbox version 1 document, or a legacy versionless sandbox export.');
  if (legacy && META_KEYS.some(key => Object.hasOwn(source, key))) throw new Error('Legacy documents cannot contain versioned metadata without a schema and version.');
  if (!legacy && (source.units !== PERIPHERAL_DOCUMENT_UNITS || source.restoreScope !== PERIPHERAL_RESTORE_SCOPE || source.restoreNote !== PERIPHERAL_RESTORE_NOTE)) throw new Error('The document units or restoration scope do not match peripheral sandbox version 1.');
  const section = key => Object.hasOwn(source, key) ? source[key] : legacy ? LEGACY_DEFAULTS[key] : undefined;
  const n = object(source.nerve, 'nerve', ['cx', 'cy', 'r']);
  // The radius bound also bounds the 3 px candidate grid to under 118,000 sites.
  const nerve = { cx: number(n.cx, 'nerve.cx', -10000, 10000), cy: number(n.cy, 'nerve.cy', -10000, 10000), r: number(n.r, 'nerve.r', 10, 512) };
  const fascicles = list(source.fascicles, 'fascicles', 1, 1).map((raw, i) => {
    const f = object(raw, `fascicles[${i}]`, ['x', 'y', 'r']);
    const clean = { x: number(f.x, 'fascicle.x', -10000, 10000), y: number(f.y, 'fascicle.y', -10000, 10000), r: number(f.r, 'fascicle.r', 1, nerve.r) };
    if (Math.hypot(clean.x - nerve.cx, clean.y - nerve.cy) + clean.r > nerve.r + 1e-8) throw new Error('The fascicle must fit inside the nerve.');
    return clean;
  });
  const ids = new Set();
  const electrodes = list(source.electrodes, 'electrodes', 0, 10).map((raw, i) => {
    const e = object(raw, `electrodes[${i}]`, ['id', 'type', 'x', 'y', 'recEnabled']);
    if (typeof e.id !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(e.id) || ids.has(e.id)) throw new Error('Electrode IDs must be unique, with 1–40 letters, digits, underscores or hyphens.');
    ids.add(e.id);
    if (e.type !== 'intra') throw new Error(`Electrode ${e.id}: only the intrafascicular type "intra" is supported.`);
    const recEnabled = e.recEnabled === undefined && legacy ? true : e.recEnabled;
    if (typeof recEnabled !== 'boolean') throw new Error(`Electrode ${e.id}: recEnabled must be true or false.`);
    const clean = { id: e.id, type: 'intra', x: number(e.x, `electrode ${e.id}.x`, -10000, 10000), y: number(e.y, `electrode ${e.id}.y`, -10000, 10000), recEnabled };
    if (Math.hypot(clean.x - nerve.cx, clean.y - nerve.cy) > nerve.r + 1e-8) throw new Error(`Electrode ${e.id} must lie inside the nerve.`);
    return clean;
  });
  const s = object(section('stim'), 'stim', ['amp', 'falloff', 'thresh']);
  const stim = { amp: number(s.amp, 'stim.amp', 0, 100, true), falloff: number(s.falloff, 'stim.falloff', 5, 60, true), thresh: number(s.thresh, 'stim.thresh', 0, 200, true) };
  const w = object(section('wave'), 'wave', ['freqHz', 'durMs']);
  const wave = { freqHz: number(w.freqHz, 'wave.freqHz', 1, 200, true), durMs: number(w.durMs, 'wave.durMs', 50, 1500, true) };
  const v = object(section('view'), 'view', ['s', 'ox', 'oy']);
  const view = { s: number(v.s, 'view.s', .6, 4), ox: number(v.ox, 'view.ox', -1e6, 1e6), oy: number(v.oy, 'view.oy', -1e6, 1e6) };
  const c = object(section('scale'), 'scale', ['nerveDiameterMm', 'axonCount']);
  const scale = { nerveDiameterMm: number(c.nerveDiameterMm, 'scale.nerveDiameterMm', 2, 2), axonCount: number(c.axonCount, 'scale.axonCount', 0, 4000, true) };
  return { document: { schema: PERIPHERAL_SCHEMA, version: PERIPHERAL_DOCUMENT_VERSION, units: PERIPHERAL_DOCUMENT_UNITS, restoreScope: PERIPHERAL_RESTORE_SCOPE, restoreNote: PERIPHERAL_RESTORE_NOTE, nerve, fascicles, electrodes, stim, wave, view, scale }, migratedFrom: legacy ? 'legacy-versionless' : null };
}

export function createPeripheralDocument(data) {
  return parsePeripheralDocument({ schema: PERIPHERAL_SCHEMA, version: PERIPHERAL_DOCUMENT_VERSION, units: PERIPHERAL_DOCUMENT_UNITS, restoreScope: PERIPHERAL_RESTORE_SCOPE, restoreNote: PERIPHERAL_RESTORE_NOTE, ...data }).document;
}
