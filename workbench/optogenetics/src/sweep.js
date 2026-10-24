/** Bounded, deterministic response maps. No random trials or probability claims. */
import { validateConfig, resolveNodes } from './simulation.js';
function parseValues(value, min, max, label) {
  const values = Array.isArray(value) ? value.slice() : String(value).split(/[,;\s]+/).filter(Boolean).map(Number);
  if (!values.length || values.length > 8 || values.some(v => !Number.isFinite(v) || v < min || v > max))
    throw new Error(`${label}: enter 1–8 finite values between ${min} and ${max}, separated by commas.`);
  if (new Set(values).size !== values.length) throw new Error(`${label}: remove duplicate values.`);
  return values.sort((a,b)=>a-b);
}
function createSweep(model, input, levels, widths) {
  const lightLevels = parseValues(levels, 0, 20, 'Light levels');
  const pulseWidths = parseValues(widths, 0.1, 100, 'Pulse widths');
  if (lightLevels.length * pulseWidths.length > 16) throw new Error('A response map is limited to 16 trials. Use fewer light levels or pulse widths.');
  const base = validateConfig({ ...input, mode:'neuron', protocol:'single', onsetMs:20,
    durationMs:Math.max(80,70+Math.max(...pulseWidths)), pulseWidthMs:pulseWidths[0], light:{...input.light,kind:'uniform'} });
  const n=resolveNodes(model,base).length;
  const estimatedBytes=lightLevels.length*pulseWidths.length*((Math.ceil(base.durationMs/base.sampleMs)+1)*(n*16+32)+n*24);
  if (estimatedBytes>64*1024*1024) throw new Error('This map would exceed 64 MiB of recordings. Use fewer trials, a coarser mesh or a larger saved sample interval.');
  const trials=[];
  for (const irradiance of lightLevels) for (const width of pulseWidths) trials.push(validateConfig({ ...base,
    pulseWidthMs:width, light:{...base.light,irradianceMwMm2:irradiance} }));
  return {lightLevels,pulseWidths,trials,estimatedBytes,baseConfig:base,
    convention:'Uniform illumination, a single pulse at 20 ms, identical 100 ms dark conditioning for each independent trial. Count upward soma crossings after onset until record end; not an experimental threshold or a spike probability.'};
}
function summarizeTrial(result) {
  const events=result.spikes.filter(s=>s.timeMs>=result.config.onsetMs);
  return {lightMwMm2:result.config.light.irradianceMwMm2,widthMs:result.config.pulseWidthMs,spikeCount:events.length,
    category:events.length===0?'none':events.length===1?'one':'many',
    latencyMs:events.length?events[0].timeMs-result.config.onsetMs:null,
    peakVoltageMv:result.diagnostics.peakVoltageMv,peakInwardCurrentNa:-result.diagnostics.peakInwardPhotocurrentNa,
    localDoseUjMm2:result.config.light.irradianceMwMm2*result.config.pulseWidthMs};
}
export { parseValues, createSweep, summarizeTrial };
