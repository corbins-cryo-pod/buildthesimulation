import {MODEL_VERSION, OBSERVATION_VERSION, normalizeSettings} from './model.js';
import {PROTOCOL_VERSION, PROTOCOL_AXES, normalizeProtocol, compareControls, summarizeProtocol, stimulationDose} from './protocols.js';

export const PROTOCOL_EXPORT_SCHEMA='bts-biohybrid-protocol/1';
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const finite=(value,label,{nullable=false,integer=false,min=-Infinity}={})=>{
 if(nullable&&value===null)return;
 if(!Number.isFinite(value)||(integer&&!Number.isInteger(value))||value<min)throw new Error(`Invalid protocol measurement: ${label}.`);
};
const sameSettings=(a,b)=>JSON.stringify(Object.entries(normalizeSettings(a)).sort())===JSON.stringify(Object.entries(normalizeSettings(b)).sort());
const canonical=value=>Array.isArray(value)?value.map(canonical):isObject(value)?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)])):value;
const sameJSON=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const finiteTree=(value,path='result')=>{
 if(typeof value==='number'&&!Number.isFinite(value))throw new Error(`Non-finite protocol data at ${path}.`);
 if(value&&typeof value==='object')for(const [key,item] of Object.entries(value))finiteTree(item,`${path}.${key}`);
};
const validateRun=(run,label)=>{
 if(!isObject(run)||!['ok','error'].includes(run.status)||!isObject(run.settings))throw new Error(`Incomplete ${label} run.`);
 normalizeSettings(run.settings);
 if(run.status==='error'){
  if(typeof run.error!=='string'||!run.error.trim())throw new Error(`Missing error explanation for ${label}.`);
  if(['metrics','hosts','grafts','recordings','dose','diagnostics'].some(key=>key in run))throw new Error(`Failed ${label} run contains stale measurements.`);
  return;
 }
 const m=run.metrics;
 if(!isObject(m)||!Array.isArray(run.hosts)||!Array.isArray(run.grafts)||!Array.isArray(run.recordings)||!isObject(run.diagnostics)||!isObject(run.dose))throw new Error(`Incomplete measurements for ${label}.`);
 for(const key of ['recruitedHosts','somaSpikeCount','hostCount','graftCount','activeConnections','synapticEvents'])finite(m[key],`${label}.${key}`,{integer:true,min:0});
 if(run.hosts.length!==m.hostCount||run.grafts.length!==m.graftCount||m.recruitedHosts>m.hostCount||m.hostCount!==run.settings.hostCount||m.graftCount!==run.settings.graftCount)throw new Error(`Inconsistent cell counts for ${label}.`);
 for(const key of ['conductionDelayMs','relayDelayMs','firstGraftSpikeMs','firstHostSpikeMs'])finite(m[key],`${label}.${key}`,{nullable:true});
 if(new Set(run.hosts.map(host=>host.id)).size!==run.hosts.length||new Set(run.grafts.map(graft=>graft.id)).size!==run.grafts.length)throw new Error(`Duplicate cell identities for ${label}.`);
 for(const host of run.hosts){
  if(typeof host.id!=='string'||!Array.isArray(host.spikeTimesMs))throw new Error(`Incomplete host data for ${label}.`);
  finite(host.somaSpikes,`${label}.${host.id}.somaSpikes`,{integer:true,min:0});
  if(host.spikeTimesMs.length!==host.somaSpikes)throw new Error(`Inconsistent host events for ${label}.`);
  for(const [index,time] of host.spikeTimesMs.entries()){finite(time,`${label}.${host.id}.time`,{min:0});if(time>run.settings.durationMs||(index&&time<host.spikeTimesMs[index-1]))throw new Error(`Invalid host event chronology for ${label}.`);}
  if(host.firstSpikeMs!==(host.spikeTimesMs[0]??null))throw new Error(`Inconsistent first host spike for ${label}.`);
  finite(host.relayConsistentSpikes,`${label}.${host.id}.relayConsistentSpikes`,{integer:true,min:0});finite(host.earlySpikes,`${label}.${host.id}.earlySpikes`,{integer:true,min:0});
  if(host.relayConsistentSpikes+host.earlySpikes!==host.somaSpikes)throw new Error(`Inconsistent host event classification for ${label}.`);
  finite(host.firstSpikeMs,`${label}.${host.id}.firstSpikeMs`,{nullable:true,min:0});
 }
 for(const graft of run.grafts){
  if(typeof graft.id!=='string')throw new Error(`Missing graft identity for ${label}.`);
  finite(graft.somaSpikes,`${label}.${graft.id}.somaSpikes`,{integer:true,min:0});
  finite(graft.terminalSpikes,`${label}.${graft.id}.terminalSpikes`,{integer:true,min:0});
  for(const [count,time] of [[graft.somaSpikes,graft.firstSomaMs],[graft.terminalSpikes,graft.firstTerminalMs]]){finite(time,`${label}.${graft.id}.firstSpikeMs`,{nullable:true,min:0});if((count===0)!==(time===null)||(time!==null&&time>run.settings.durationMs))throw new Error(`Inconsistent graft events for ${label}.`);}
 }
 if(run.hosts.filter(host=>host.somaSpikes>0).length!==m.recruitedHosts||run.hosts.reduce((sum,host)=>sum+host.somaSpikes,0)+run.grafts.reduce((sum,graft)=>sum+graft.somaSpikes,0)!==m.somaSpikeCount)throw new Error(`Inconsistent recruitment or soma counts for ${label}.`);
 if(run.recordings.length!==3||new Set(run.recordings.map(r=>r.id)).size!==3)throw new Error(`Incomplete recording channels for ${label}.`);
 for(const recording of run.recordings)for(const key of ['neuralPeakToPeakUv','graftPeakToPeakUv','hostPeakToPeakUv','artifactPeakToPeakUv','totalPeakToPeakUv','sourceResidualMaxUv'])finite(recording[key],`${label}.${recording.id}.${key}`,{min:0});
 if(!Array.isArray(m.recordingPeakToPeakUv)||m.recordingPeakToPeakUv.length!==3||run.recordings.some((recording,index)=>recording.id!==`rec-${index+1}`||recording.neuralPeakToPeakUv!==m.recordingPeakToPeakUv[index]))throw new Error(`Inconsistent recording summary for ${label}.`);
 for(const key of ['firstPhaseChargeNc','absolutePhaseChargeNc','netChargeNc','totalAbsoluteChargeNc','geometricContactAreaUm2','absolutePhaseChargeDensityUcPerCm2'])finite(run.dose[key],`${label}.dose.${key}`);
 if(!sameJSON(run.dose,stimulationDose(run.settings)))throw new Error(`Charge metadata disagrees with the delivered settings for ${label}.`);
 for(const key of ['dtMs','sampleDtMs','segmentLengthUm','steps','frames','maxCurrentBalanceNa'])finite(run.diagnostics[key],`${label}.diagnostics.${key}`,{min:0});
 if(['dtMs','sampleDtMs','segmentLengthUm'].some(key=>run.diagnostics[key]!==run.settings[key])||run.diagnostics.steps!==Math.round(run.settings.durationMs/run.settings.dtMs)||run.diagnostics.frames!==Math.round(run.settings.durationMs/run.settings.sampleDtMs)+1)throw new Error(`Resolution metadata disagrees with settings for ${label}.`);
};

/** Every actual numerical run, including a failed control, has its own export row. */
export function protocolRunRows(result){
 return result.cases.flatMap(testCase=>[
  {testCase,condition:'intact',run:testCase.baseline},
  ...(testCase.synapsesOff?[{testCase,condition:'synapses-off',run:testCase.synapsesOff}]:[]),
  ...(testCase.noStimulus?[{testCase,condition:'no-stimulus',run:testCase.noStimulus}]:[]),
 ]);
}

export function protocolDocument(result){
 if(!isObject(result)||result.schemaVersion!==PROTOCOL_VERSION||result.modelVersion!==MODEL_VERSION||result.observationVersion!==OBSERVATION_VERSION||!isObject(result.baseSettings)||!isObject(result.protocol)||!Array.isArray(result.cases)||!result.cases.length||!isObject(result.summary))throw new Error('A completed protocol from this laboratory version is required.');
 finiteTree(result);
 normalizeSettings(result.baseSettings);const protocol=normalizeProtocol(result.protocol,result.baseSettings);
 if(!sameJSON(protocol,result.protocol))throw new Error('Protocol configuration or numerical budget metadata is inconsistent.');
 const expectedUnits={time:'ms',membranePotential:'mV',extracellularPotential:'µV',current:'µA',conductance:'µS',length:'µm',conductivity:'S/m',charge:'nC',recruitment:'cells',chargeDensity:'µC/cm²',contactArea:'µm²'};
 if(!isObject(result.units)||Object.entries(expectedUnits).some(([key,value])=>result.units[key]!==value))throw new Error('Protocol units are incomplete or inconsistent.');
 if(result.cases.length!==(protocol.kind==='causal'?1:protocol.values.length))throw new Error('Incomplete protocol case list.');
 if(new Set(result.cases.map(c=>c.id)).size!==result.cases.length)throw new Error('Duplicate protocol case identities.');
 for(const [index,testCase] of result.cases.entries()){
  if(typeof testCase.id!=='string'||!isObject(testCase.settings)||!['ok','partial','error'].includes(testCase.status))throw new Error('Invalid protocol case identity or status.');
  if((protocol.kind==='causal'&&testCase.value!==null)||(protocol.kind==='sweep'&&testCase.value!==protocol.values[index]))throw new Error('Protocol axis values do not match the requested grid.');
  validateRun(testCase.baseline,`${testCase.id} intact`);
  const expectedSettings=protocol.kind==='sweep'?{...result.baseSettings,[protocol.axis]:protocol.values[index]}:result.baseSettings;
  if(!sameSettings(testCase.baseline.settings,expectedSettings)||!sameSettings(testCase.settings,expectedSettings))throw new Error('Protocol settings do not match the sampled condition.');
  if(protocol.paired!==!!testCase.synapsesOff||(protocol.kind==='causal')!==!!testCase.noStimulus)throw new Error('Incomplete protocol controls.');
  if(testCase.synapsesOff&&!sameSettings(testCase.synapsesOff.settings,{...expectedSettings,synapticWeightUs:0}))throw new Error('Synapses-off control changed an unmatched setting.');
  if(testCase.noStimulus&&!sameSettings(testCase.noStimulus.settings,{...expectedSettings,stimAmplitudeUa:0}))throw new Error('No-stimulus control changed an unmatched setting.');
  if(testCase.synapsesOff)validateRun(testCase.synapsesOff,`${testCase.id} synapses-off`);
  if(testCase.noStimulus)validateRun(testCase.noStimulus,`${testCase.id} no-stimulus`);
  const conditions=[testCase.baseline,testCase.synapsesOff,testCase.noStimulus].filter(Boolean),successes=conditions.filter(run=>run.status==='ok').length;
  if(testCase.status!==(successes===conditions.length?'ok':successes?'partial':'error'))throw new Error('Protocol case status contradicts its calculated conditions.');
  if(!sameJSON(testCase.comparison,compareControls(testCase.baseline,testCase.synapsesOff)))throw new Error('Protocol causal comparison is inconsistent with the recorded host responses.');
 }
 const rows=protocolRunRows(result);
 if(rows.length!==result.summary.totalRuns||rows.filter(r=>r.run.status==='error').length!==result.summary.failedRuns||rows.filter(r=>r.run.status==='ok').length!==result.summary.successfulRuns)throw new Error('Protocol run totals do not match exported data.');
 if(!sameJSON(result.summary,summarizeProtocol(result.cases,protocol)))throw new Error('Protocol summary is inconsistent with its calculated conditions.');
 return JSON.parse(JSON.stringify({...result,schema:PROTOCOL_EXPORT_SCHEMA,provenance:{methods:'/simulations/biohybrid-interface/methods/',questions:'/simulations/biohybrid-interface/questions/',interpretation:'Deterministic model responses at finite tested settings; not biological activation probability. Source attribution uses known simulated transmembrane currents, not inverse spike sorting. Nominal phase charge density uses geometric disk area and is not an electrochemical or clinical safety limit. No raw voltage frames are included; inspect a case to recalculate its full trace.'}}));
}
export const protocolJSON=result=>JSON.stringify(protocolDocument(result),null,2);
const csvCell=value=>{
 if(value===null||value===undefined)return '';
 if(typeof value==='number')return String(value);
 let text=typeof value==='string'?value:JSON.stringify(value);
 if(/^[=+\-@\t\r]/.test(text))text=`'${text}`;
 return /[",\n\r]/.test(text)?`"${text.replaceAll('"','""')}"`:text;
};
export function protocolCSV(result){
 const doc=protocolDocument(result);
 const headers=['protocol_version','model_version','protocol_kind','axis','axis_value','axis_unit','case_id','case_status','condition','run_status','error','host_count_cells','recruited_hosts_cells','soma_spikes','trunk_delay_ms','relay_delay_ms','first_phase_charge_nC','absolute_phase_charge_nC','net_charge_nC','total_absolute_charge_nC','geometric_contact_area_um2','absolute_phase_charge_density_uC_per_cm2','dt_ms','segment_length_um',
 ...['rec-1','rec-2','rec-3'].flatMap(id=>[`${id}_neural_p2p_uV`,`${id}_graft_p2p_uV`,`${id}_host_p2p_uV`,`${id}_artifact_p2p_uV`,`${id}_total_p2p_uV`,`${id}_source_residual_uV`]),
 'host_events_json','graft_events_json','causal_comparison_json','settings_json'];
 const rows=[headers];
 for(const {testCase,condition,run} of protocolRunRows(doc)){
  const ok=run.status==='ok',m=ok?run.metrics:null;
  rows.push([doc.schemaVersion,doc.modelVersion,doc.protocol.kind,doc.protocol.kind==='sweep'?doc.protocol.axis:'',testCase.value??'',doc.protocol.kind==='sweep'?(PROTOCOL_AXES.find(axis=>axis.id===doc.protocol.axis)?.unit??''):'',testCase.id,testCase.status,condition,run.status,run.error??'',m?.hostCount,m?.recruitedHosts,m?.somaSpikeCount,m?.conductionDelayMs,m?.relayDelayMs,run.dose?.firstPhaseChargeNc,run.dose?.absolutePhaseChargeNc,run.dose?.netChargeNc,run.dose?.totalAbsoluteChargeNc,run.dose?.geometricContactAreaUm2,run.dose?.absolutePhaseChargeDensityUcPerCm2,run.settings.dtMs,run.settings.segmentLengthUm,
   ...['rec-1','rec-2','rec-3'].flatMap(id=>{const recording=run.recordings?.find(r=>r.id===id);return ['neuralPeakToPeakUv','graftPeakToPeakUv','hostPeakToPeakUv','artifactPeakToPeakUv','totalPeakToPeakUv','sourceResidualMaxUv'].map(key=>recording?.[key]);}),
   ok?run.hosts:null,ok?run.grafts:null,testCase.comparison,run.settings]);
 }
 return rows.map(row=>row.map(csvCell).join(',')).join('\n')+'\n';
}
