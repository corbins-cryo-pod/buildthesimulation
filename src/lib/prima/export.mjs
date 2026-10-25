import { MODEL_VERSION, EXPORT_SCHEMA, normalizeConfig, configurationId } from './model.mjs';
export function exportExperiment(result) {
  if (!result || result.modelVersion !== MODEL_VERSION) throw new Error('Run a current PRIMA experiment before exporting.');
  const settings = normalizeConfig(result.config);
  if (result.experimentId !== configurationId(settings)) throw new Error('The result does not match its experiment definition.');
  const packet = { schema: EXPORT_SCHEMA, modelVersion: MODEL_VERSION, experimentId: result.experimentId,
    settings, results: { ...result, config: undefined },
    interpretation: 'Separate published percept approximation and reduced photovoltaic half-space device model. Numerical verification is not clinical validation.' };
  return JSON.stringify(packet, (key, value) => ArrayBuffer.isView(value) ? Array.from(value) : value, 2);
}
export function parseExperiment(text) {
  if (typeof text !== 'string' || text.length > 20000000) throw new Error('Choose a PRIMA experiment JSON smaller than 20 MB.');
  let packet;
  try { packet = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  if (packet?.schema !== EXPORT_SCHEMA || packet?.modelVersion !== MODEL_VERSION) throw new Error('Unsupported PRIMA experiment format or model version.');
  if (!packet.settings || typeof packet.settings !== 'object' || Array.isArray(packet.settings)) throw new Error('The experiment file must contain a settings object.');
  // Restore only the definition. Imported numerical results are never trusted.
  return normalizeConfig(packet.settings);
}
export function exportPixelsCsv(result) {
  if (!result) throw new Error('Run a PRIMA experiment before exporting.');
  const lines = ['# ' + result.experimentId, '# model_version: ' + MODEL_VERSION,
    '# geometry: idealized 378-pixel reconstruction; numerical model parameters are not a manufacturer specification',
    'pixel_id,x_um,y_um,relative_irradiance'];
  for (const p of result.geometry.pixels) lines.push([p.id, p.xUm, p.yUm, p.illumination].join(','));
  return lines.join('\n') + '\n';
}
