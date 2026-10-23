import test from 'node:test';
import assert from 'node:assert/strict';
import {runSimulation,normalizeSettings,DEFAULT_SETTINGS,MODEL_VERSION} from '../src/lib/biohybrid/model.js';
import {experimentDocument,experimentJSON,parseExperiment,simulationCSV,spikeCSV,EXPORT_SCHEMA} from '../src/lib/biohybrid/export.js';
const result=runSimulation();
const numericalRows=csv=>csv.trimEnd().split('\n').slice(1).map(row=>row.split(',').map(Number));

test('biohybrid exports: JSON preserves normalized physical settings and measured event metadata',()=>{
 const label='Functional relay, "default"';
 const doc=parseExperiment(experimentJSON(result,label));
 assert.equal(doc.schema,EXPORT_SCHEMA);assert.equal(doc.model,MODEL_VERSION);assert.equal(doc.label,label);
 assert.deepEqual(doc.settings,normalizeSettings(DEFAULT_SETTINGS));
 assert.equal(doc.sampleCount,result.timeMs.length);assert.equal(doc.compartmentCount,result.geometry.nodes.length);
 assert.deepEqual(doc.metrics,result.metrics);assert.deepEqual(doc.spikes,result.spikes);
 assert.deepEqual(doc.units,{time:'ms',membrane:'mV',extracellular:'µV',stimulus:'µA',length:'µm',conductance:'µS',conductivity:'S/m'});
 assert.equal(doc.metrics.recruitedHosts,3);assert.ok(doc.metrics.firstHostSpikeMs>doc.metrics.firstGraftSpikeMs);
});

test('biohybrid exports: importing settings normalizes supported numeric values and restores deterministic calculations',()=>{
 const doc=experimentDocument(result);doc.settings={...doc.settings,graftCount:'1',hostCount:'2',connectedHosts:2};
 const parsed=parseExperiment(JSON.stringify(doc));
 assert.equal(parsed.settings.graftCount,1);assert.equal(parsed.settings.hostCount,2);
 const a=runSimulation(parsed.settings),b=runSimulation(normalizeSettings(doc.settings));
 assert.deepEqual(a.spikes,b.spikes);assert.deepEqual(a.voltageMv,b.voltageMv);
 assert.equal(a.metrics.recruitedHosts,2);
 assert.equal(a.settings.segmentLengthUm,25);assert.equal(a.settings.dtMs,.005);
});

test('biohybrid exports: rejects wrong versions, malformed settings, unsupported physics, and truncated protocols',()=>{
 const doc=experimentDocument(result);
 for(const bad of [null,[],{...doc,schema:'wrong'},{...doc,model:'future-model'},{...doc,settings:'garbage'},{...doc,settings:1},{...doc,settings:[]},{...doc,settings:{dtMs:0}},{...doc,settings:{conductivitySPerM:-.3}},{...doc,settings:{pulseCount:4,durationMs:20}}])
  assert.throws(()=>parseExperiment(JSON.stringify(bad)));
 assert.throws(()=>parseExperiment('{broken json'));
});

test('biohybrid exports: CSV columns, units, sample count, and every scientific channel reproduce computed data',()=>{
 const csv=simulationCSV(result),header=csv.split('\n')[0].split(','),rows=numericalRows(csv);
 assert.deepEqual(header.slice(0,2),['time_ms','stimulus_uA']);
 assert.equal(rows.length,result.timeMs.length);
 assert.equal(header.length,2+result.traces.length+3*result.recordings.length);
 assert.equal(header[2],'graft-1_mV');assert.ok(header.includes('rec-1_neural_uV'));assert.ok(header.includes('rec-1_artifact_uV'));assert.ok(header.includes('rec-1_total_uV'));
 for(let i=0;i<rows.length;i++){
  const expected=[result.timeMs[i],result.stimulusUa[i],...result.traces.map(t=>t.values[i]),...result.recordings.flatMap(r=>[r.neuralUv[i],r.artifactUv[i],r.totalUv[i]])];
  assert.equal(rows[i].length,expected.length);
  for(let j=0;j<expected.length;j++)assert.ok(Math.abs(rows[i][j]-expected[j])<=Math.max(1e-8,Math.abs(expected[j])*1e-9));
 }
 const artifactColumn=header.indexOf('rec-1_artifact_uV'),neuralColumn=header.indexOf('rec-1_neural_uV'),totalColumn=header.indexOf('rec-1_total_uV');
 const sample=result.timeMs.findIndex(t=>t>=5.1);
 assert.ok(Math.abs(rows[sample][artifactColumn])>Math.abs(rows[sample][neuralColumn]));
 assert.ok(Math.abs(rows[sample][totalColumn]-rows[sample][artifactColumn]-rows[sample][neuralColumn])<1e-5);
});

test('biohybrid exports: complete compartment CSV retains the exact frame-to-node mapping',()=>{
 const csv=simulationCSV(result,{allCompartments:true}),lines=csv.trimEnd().split('\n'),header=lines[0].split(',');
 const offset=2+result.traces.length+3*result.recordings.length,n=result.geometry.nodes.length;
 assert.equal(header.length,offset+n);assert.equal(lines.length,result.timeMs.length+1);
 for(let j=0;j<n;j++)assert.equal(header[offset+j],`compartment_${j}_${result.geometry.nodes[j].id}_mV`);
 for(let i=0;i<result.timeMs.length;i++){
  const row=lines[i+1].split(',');assert.equal(row.length,header.length);
  for(let j=0;j<n;j++)assert.ok(Math.abs(Number(row[offset+j])-result.voltageMv[i*n+j])<1e-7);
 }
});

test('biohybrid exports: refuses incomplete or nonfinite samples instead of exporting plausible blanks',()=>{
 assert.throws(()=>simulationCSV({...result,stimulusUa:new Float64Array(1)}),/Incomplete/);
 const traces=result.traces.map(t=>({...t,values:Float64Array.from(t.values)}));traces[0].values[30]=NaN;
 assert.throws(()=>simulationCSV({...result,traces}),/non-finite/);
 assert.throws(()=>simulationCSV({...result,voltageMv:new Float32Array(10)},{allCompartments:true}),/Incomplete/);
 assert.throws(()=>experimentDocument(null),/completed calculation/);
});

test('biohybrid exports: spike CSV preserves physical event times and rejects corrupted events',()=>{
 const lines=spikeCSV(result).trimEnd().split('\n');assert.equal(lines[0],'neuron_id,location,time_ms');assert.equal(lines.length,result.spikes.length+1);
 result.spikes.forEach((s,i)=>{const fields=lines[i+1].split(',');assert.equal(fields[0],s.neuronId);assert.equal(fields[1],s.kind);assert.equal(Number(fields[2]),s.timeMs);});
 assert.throws(()=>spikeCSV({...result,spikes:[{neuronId:'host-1',kind:'soma',timeMs:NaN}]}),/Invalid/);
 assert.throws(()=>spikeCSV({...result,spikes:[{neuronId:'host-1',kind:'soma',timeMs:result.settings.durationMs+1}]}),/Invalid/);
 assert.equal(spikeCSV({...result,spikes:[]}).trim(),'neuron_id,location,time_ms');
});
