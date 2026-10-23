import { MODEL_VERSION, normalizeSettings } from './model.js';
export { MODEL_VERSION };
export const EXPORT_SCHEMA='bts-biohybrid-experiment/1';
const cell=v=>/[",\n\r]/.test(String(v))?`"${String(v).replaceAll('"','""')}"`:String(v);
export function experimentDocument(result,label='Custom experiment'){
 if(!result?.settings||!result?.timeMs?.length)throw new Error('A completed calculation is required.');
 return {schema:EXPORT_SCHEMA,model:MODEL_VERSION,label,settings:{...result.settings},units:{time:'ms',membrane:'mV',extracellular:'µV',stimulus:'µA',length:'µm',conductance:'µS',conductivity:'S/m'},sampleCount:result.timeMs.length,compartmentCount:result.geometry.nodes.length,metrics:result.metrics,diagnostics:result.diagnostics,spikes:result.spikes,provenance:{membrane:'Canonical Hodgkin–Huxley; generic benchmark, not a fit to graft neurons',morphology:'Synthetic branched cables',source:'/simulations/biohybrid-interface/methods/'}};
}
export function experimentJSON(result,label){return JSON.stringify(experimentDocument(result,label),null,2);}
export function parseExperiment(text){
 const doc=JSON.parse(text);
 if(!doc||typeof doc!=='object'||Array.isArray(doc)||doc.schema!==EXPORT_SCHEMA||doc.model!==MODEL_VERSION||!doc.settings||typeof doc.settings!=='object'||Array.isArray(doc.settings))throw new Error('Unsupported experiment file. Use an export from this Biohybrid Laboratory version.');
 doc.settings=normalizeSettings(doc.settings);return doc;
}
export function simulationCSV(result,{allCompartments=false}={}){
 if(!result?.timeMs?.length)throw new Error('No simulation samples to export.');
 const traces=result.traces??[],records=result.recordings??[],n=result.geometry.nodes.length;
 const columns=['time_ms','stimulus_uA',...traces.map(t=>`${t.id}_mV`),...records.flatMap(r=>[`${r.id}_neural_uV`,`${r.id}_artifact_uV`,`${r.id}_total_uV`])];
 if(allCompartments)columns.push(...result.geometry.nodes.map((node,i)=>`compartment_${i}_${node.id}_mV`));
 const rows=[columns.map(cell).join(',')];
 for(let i=0;i<result.timeMs.length;i++){
  const row=[result.timeMs[i],result.stimulusUa[i],...traces.map(t=>t.values[i]),...records.flatMap(r=>[r.neuralUv[i],r.artifactUv[i],r.totalUv[i]])];
  if(allCompartments)for(let j=0;j<n;j++)row.push(result.voltageMv[i*n+j]);
  if(row.some(v=>!Number.isFinite(v)))throw new Error(`Incomplete or non-finite data at sample ${i}.`);
  rows.push(row.map(v=>Number(v).toPrecision(10)).join(','));
 }return rows.join('\n')+'\n';
}
export function spikeCSV(result){
 if(!Array.isArray(result?.spikes))throw new Error('No spike events to export.');
 for(const s of result.spikes)if(typeof s.neuronId!=='string'||!['soma','terminal'].includes(s.kind)||!Number.isFinite(s.timeMs)||s.timeMs<0||s.timeMs>(result.settings?.durationMs??Infinity))throw new Error('Invalid spike event data.');
 return 'neuron_id,location,time_ms\n'+result.spikes.map(s=>[s.neuronId,s.kind,s.timeMs].map(cell).join(',')).join('\n')+'\n';
}
