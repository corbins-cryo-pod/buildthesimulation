import { MODEL_VERSION, EXPORT_SCHEMA, DEFAULT_SETTINGS, normalizeSettings } from './settings.mjs';
import { STAGE1_MODEL_VERSION, STAGE1_EXPORT_SCHEMA, DEFAULT_STAGE1_SETTINGS, normalizeStage1Settings } from './stage1-settings.mjs';

/** Reconstructed export contract. Source text did not survive the executor reset. */
export const MAX_IMPORT_BYTES = 256 * 1024 * 1024;
export const QUANTITY_UNITS = Object.freeze({ coordinates: 'µm', time: 'ms', membranePotential: 'mV',
  membraneCurrent: 'nA', stimulusCurrent: 'µA', fieldTransfer: 'mV/µA', recording: 'µV', conductivity: 'S/m',
  resistivity: 'Ω m', chargePerPhase: 'nC', geometricChargeDensity: 'µC/cm²' });

function assertFinite(value, path = 'result', active = new WeakSet()) {
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`Export rejected: nonfinite number at ${path}.`);
  if (value === null || typeof value !== 'object') {
    if (['undefined', 'function', 'symbol', 'bigint'].includes(typeof value)) throw new Error(`Export rejected: unsupported value at ${path}.`);
    return;
  }
  if (active.has(value)) throw new Error(`Export rejected: circular data at ${path}.`);
  active.add(value);
  if (ArrayBuffer.isView(value)) {
    if (value instanceof DataView) throw new Error(`Export rejected: unsupported binary view at ${path}.`);
    for (let i = 0; i < value.length; i++) assertFinite(value[i], `${path}[${i}]`, active);
  } else {
    for (const [key, item] of Object.entries(value)) assertFinite(item, `${path}.${key}`, active);
  }
  active.delete(value);
}
function complete(result) {
  if (!result || typeof result !== 'object' || result.auditComplete !== true) throw new Error('Export requires a completed experiment, including its matched controls.');
  const stage1 = result.modelVersion === STAGE1_MODEL_VERSION;
  if (!stage1 && result.modelVersion !== MODEL_VERSION) throw new Error('Export model version does not match this implementation.');
  if (typeof result.auditValid !== 'boolean') throw new Error('Completed result must retain an explicit audit-valid flag.');
  if (!result.settings || Object.keys(stage1 ? DEFAULT_STAGE1_SETTINGS : DEFAULT_SETTINGS).some(key => !Object.hasOwn(result.settings, key))) throw new Error('Completed result is missing normalized settings.');
  (stage1 ? normalizeStage1Settings : normalizeSettings)(result.settings);
  if (stage1 && (!result.identities || !result.comparators?.noDevice)) throw new Error('Stage 1 export requires the original identity ledger and the no-device comparator.');
  assertFinite(result);
  return result;
}
const replacer = (_key, value) => ArrayBuffer.isView(value) ? Array.from(value) : value;

export function resultJSON(result) {
  const r = complete(result);
  const envelope = { ...r, schema: r.modelVersion === STAGE1_MODEL_VERSION ? STAGE1_EXPORT_SCHEMA : EXPORT_SCHEMA, quantityUnits: QUANTITY_UNITS,
    exportScope: 'Complete retained result at its original normalized settings. Import restores settings for a new calculation and does not certify imported results.',
    resultStatus: r.auditValid ? 'completed_electrical_audit' : 'raw_diagnostic_audit_failed' };
  return JSON.stringify(envelope, replacer, 2);
}

export function importSettings(text) {
  if (typeof text !== 'string') throw new Error('Settings import requires JSON text.');
  if (text.length > MAX_IMPORT_BYTES || new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) throw new Error('Settings import exceeds the 256 MiB declared size limit.');
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error('Settings import is not valid JSON.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Settings import must be a JSON object.');
  const stage1 = parsed.schema === STAGE1_EXPORT_SCHEMA;
  if (!stage1 && parsed.schema !== EXPORT_SCHEMA) throw new Error('Unsupported axon laboratory export schema.');
  if (parsed.modelVersion !== (stage1 ? STAGE1_MODEL_VERSION : MODEL_VERSION)) throw new Error('Unsupported model version for this export schema.');
  const settings = parsed.settings;
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error('Missing normalized settings object.');
  for (const key of Object.keys(stage1 ? DEFAULT_STAGE1_SETTINGS : DEFAULT_SETTINGS)) if (!Object.hasOwn(settings, key)) throw new Error(`Missing ${key}: an import must contain every normalized setting.`);
  return (stage1 ? normalizeStage1Settings : normalizeSettings)(settings);
}

function csvCell(value) {
  if (value === null) return '';
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('CSV export rejected a nonfinite number.');
  if (value === undefined) throw new Error('CSV export rejected a missing value; absent quantities must be explicit null.');
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
const csv = (header, rows) => [header, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
const COMMON = ['model_version', 'audit_valid', 'result_status', 'seed', 'cohort_count', 'channel_count', 'solver_dt_ms', 'observation_end_ms', 'amplitude_uA'];
const common = r => [r.modelVersion, r.auditValid, r.auditValid ? 'completed_electrical_audit' : 'raw_diagnostic_audit_failed',
  r.settings.seed, r.settings.axonCount, r.settings.channelCount, r.settings.dtMs, r.settings.durationMs, r.settings.amplitudeUa];
function metadata(r) {
  return JSON.stringify({ schema: r.modelVersion === STAGE1_MODEL_VERSION ? STAGE1_EXPORT_SCHEMA : EXPORT_SCHEMA, settings: r.settings, controls: r.controls, limitations: r.limitations,
    quantityUnits: QUANTITY_UNITS, numericalContract: r.numericalContract ?? null,
    originalHostMeaning: r.metrics.originalHostMeaning ?? 'No original-host cohort or postoperative continuity experiment is instantiated.' }, replacer);
}

export function matrixCSV(result) {
  const r = complete(result), prefix = common(r), meta = metadata(r);
  const ids = r.geometry.cells.map(cell => cell.id);
  const rows = [];
  for (const [intervention, matrix] of Object.entries(r.matrices)) for (let k = 0; k < matrix.length; k++) {
    if (matrix[k].length !== ids.length || !matrix[k].every(value => value === true || value === false || value === 0 || value === 1)) throw new Error('Recruitment CSV requires complete binary cohort rows.');
    rows.push([...prefix, intervention, r.geometry.channels[k].id, ...matrix[k].map(Number), meta]);
  }
  return csv([...COMMON, 'intervention', 'channel_id', ...ids, 'run_metadata_json'], rows);
}

export function eventCSV(result) {
  const r = complete(result), prefix = common(r), meta = metadata(r);
  return csv([...COMMON, 'channel_id', 'cell_id', 'intervention', 'compartment_index', 'time_ms', 'z_um', 'direction', 'criterion', 'run_metadata_json'],
    r.events.map(event => [...prefix, event.channel, event.cell, event.intervention, event.compartment, event.timeMs, event.zUm, event.direction, event.criterion, meta]));
}

export function timeSeriesCSV(result) {
  const r = complete(result), prefix = common(r), meta = metadata(r), rows = [];
  for (const recording of r.recordings) {
    const length = recording.timeMs.length;
    for (const key of ['appliedStepStartMs', 'appliedStepEndMs', 'stimulusUa', 'artifactUv', 'engineeredUv', 'hostUv', 'totalUv']) if (!Array.isArray(recording[key]) || recording[key].length !== length) throw new Error(`Time-series export requires aligned ${key}.`);
    for (let i = 0; i < length; i++) rows.push([...prefix, recording.channel, recording.timeMs[i], recording.appliedStepStartMs[i], recording.appliedStepEndMs[i],
      recording.stimulusUa[i], recording.artifactUv[i], recording.engineeredUv[i], recording.hostUv[i], recording.totalUv[i], recording.samplingMeaning, recording.hostMeaning, meta]);
  }
  return csv([...COMMON, 'channel_id', 'state_time_ms', 'applied_step_start_ms', 'applied_step_end_ms', 'stimulus_uA', 'imposed_field_artifact_uV', 'model_outer_membrane_uV', 'host_source_uV', 'instantaneous_sum_uV', 'sampling_meaning', 'host_meaning', 'run_metadata_json'], rows);
}

export function cascadeCSV(result) {
  const r = complete(result), prefix = common(r), meta = metadata(r);
  return csv([...COMMON, 'stage', 'count', 'denominator', 'status', 'run_metadata_json'],
    r.cascade.map(stage => [...prefix, stage.label, stage.count, stage.denominator, stage.status, meta]));
}
