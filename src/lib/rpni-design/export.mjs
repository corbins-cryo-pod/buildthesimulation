import { MODEL_VERSION, DEFAULT_CONFIG, PARAMETER_META, normalizeConfig } from './model.mjs';
import { SOURCES, EVIDENCE_REVIEWED_AT } from './evidence.mjs';
export const EXPERIMENT_FORMAT='buildthesimulation-rpni-design';
export const FORMAT_VERSION=1;
const isRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export function createExperiment(result,extras={}){
 if(!result||result.modelVersion!==MODEL_VERSION)throw new Error('A completed result from the current model is required.');
 return {
  format:EXPERIMENT_FORMAT,formatVersion:FORMAT_VERSION,modelVersion:MODEL_VERSION,
  exportedAt:new Date().toISOString(),config:result.config,result,
  comparison:extras.reference||null,sweep:extras.sweep||null,ensemble:extras.ensemble||null,
  view:{day:extras.day??result.config.observationDay,timeMs:extras.timeMs??0,channelIndex:extras.channelIndex??0},
  provenance:{laboratory:'/simulations/rpni-design/',methods:'/simulations/rpni-design/methods/',anatomy:'procedural muscle-graft RPNI',biologicalCalibration:false,electricalModel:'current-balanced equivalent muscle sources; infinite homogeneous anisotropic conductor; finite recording contacts',transport:'independent steady first-order slab diagnostic; no viability gate',evidenceReviewedAt:EVIDENCE_REVIEWED_AT,sourceIds:SOURCES.map(s=>s.id),units:{distance:'mm',time:'days for regeneration; ms for recording',potential:'µV',sourceCurrent:'µA',conductivity:'S/m',diffusivity:'mm²/s',consumption:'1/s'},importBehavior:'Only the exact-version design parameters are restored. Saved numerical results and comparisons are not trusted or loaded.'}
 };
}
export function parseExperiment(input){
 if(typeof input==='string'&&input.length>50_000_000)throw new Error('Choose an experiment smaller than 50 MB.');
 let packet;try{packet=typeof input==='string'?JSON.parse(input):input;}catch{throw new Error('The experiment is not valid JSON.');}
 if(!isRecord(packet)||packet.format!==EXPERIMENT_FORMAT||packet.formatVersion!==FORMAT_VERSION)throw new Error('This is not a supported RPNI design experiment.');
 if(packet.modelVersion!==MODEL_VERSION)throw new Error(`Model version ${packet.modelVersion??'missing'} is incompatible with ${MODEL_VERSION}. An exact version match is required.`);
 if(!isRecord(packet.config))throw new Error('The design parameter object is missing.');
 const allowed=Object.keys(DEFAULT_CONFIG),given=Object.keys(packet.config);
 if(given.some(k=>!allowed.includes(k)))throw new Error('The design contains unsupported parameters.');
 const config={};for(const key of allowed){
  const value=packet.config[key],meta=PARAMETER_META[key];
  if(typeof value!=='number'||!Number.isFinite(value))throw new Error(`Parameter ${key} must be a finite number.`);
  if(meta&&(value<meta.min||value>meta.max))throw new Error(`Parameter ${key} is outside the supported range.`);
  config[key]=value;
 }
 const normalized=normalizeConfig(config);
 const altered=allowed.filter(key=>normalized[key]!==config[key]);
 if(altered.length)throw new Error(`The saved design violates geometry or sampling constraints: ${altered.join(', ')}.`);
 return normalized;
}
function cell(v){const s=v===null||v===undefined?'':String(v);return /[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
function csv(rows){return rows.map(row=>row.map(cell).join(',')).join('\r\n');}
export function recordingCsv(result){
 const r=result.recording,keys=['signalUv','cleanUv','targetUv','otherUv','noiseUv'];
 const columns=r.channels.flatMap(c=>keys.map(k=>`${c.id}_${k}`));
 const rows=[['model_version','seed','observation_day','time_ms',...columns]];
 for(let i=0;i<r.timesMs.length;i++)rows.push([result.modelVersion,result.config.seed,r.day,r.timesMs[i],...r.channels.flatMap(c=>keys.map(k=>c[k][i]))]);
 return csv(rows);
}
export function growthCsv(result){
 const base=['day','arrivedUnits','matureSourceFraction','routingFraction','oxygenCenterRatio','oxygenMeanRatio'];
 const channelKeys=['rmsUv','cleanRmsUv','targetRmsUv','otherRmsUv','noiseRmsUv','snrDb','snrState','targetFraction'];
 const rows=[['model_version','seed',...base.map(k=>k==='matureSourceFraction'?'mean_source_amplitude_gain':k),...result.geometry.channels.flatMap(c=>channelKeys.map(k=>`${c.id}_expected_${k}`))]];
 for(const s of result.samples)rows.push([result.modelVersion,result.config.seed,...base.map(k=>Number.isFinite(s[k])?s[k]:''),...s.channels.flatMap(c=>channelKeys.map(k=>typeof c[k]==='string'||Number.isFinite(c[k])?c[k]:''))]);
 return csv(rows);
}
