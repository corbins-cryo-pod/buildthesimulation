import test from 'node:test';
import assert from 'node:assert/strict';
import {runProtocol} from '../src/lib/biohybrid/protocols.js';
import {protocolCSV,protocolJSON,protocolDocument,protocolRunRows,PROTOCOL_EXPORT_SCHEMA} from '../src/lib/biohybrid/protocol-export.js';
const base={graftCount:1,hostCount:2,connectedHosts:2,pulseCount:1,durationMs:20,dtMs:.01};
const audit=runProtocol(base);
const clone=value=>JSON.parse(JSON.stringify(value));
function parseCSV(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const char=text[i];
  if(char==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(!quoted&&char===','){row.push(cell);cell='';}
  else if(!quoted&&char==='\n'){row.push(cell);rows.push(row);row=[];cell='';}
  else cell+=char;
 }
 assert.equal(quoted,false);if(cell||row.length){row.push(cell);rows.push(row);}return rows;
}

test('biohybrid protocol export: JSON retains all exact settings, matched interventions and measured hosts',()=>{
 const doc=JSON.parse(protocolJSON(audit));
 assert.equal(doc.schema,PROTOCOL_EXPORT_SCHEMA);assert.equal(doc.schemaVersion,audit.schemaVersion);assert.equal(doc.observationVersion,audit.observationVersion);
 assert.deepEqual(doc.baseSettings,audit.baseSettings);assert.deepEqual(doc.protocol,audit.protocol);assert.deepEqual(doc.cases,audit.cases);assert.deepEqual(doc.summary,audit.summary);
 assert.equal(doc.cases[0].synapsesOff.settings.synapticWeightUs,0);assert.equal(doc.cases[0].noStimulus.settings.stimAmplitudeUa,0);
 assert.equal(doc.units.charge,'nC');assert.equal(doc.units.chargeDensity,'µC/cm²');assert.match(doc.provenance.interpretation,/not biological activation probability/);
 doc.cases[0].baseline.hosts[0].spikeTimesMs.push(99);assert.notDeepEqual(doc.cases[0].baseline.hosts,audit.cases[0].baseline.hosts);
});

test('biohybrid protocol export: CSV has one row per solve and exact physical data for every source channel',()=>{
 const rows=parseCSV(protocolCSV(audit)),header=rows.shift(),sourceRows=protocolRunRows(audit);
 assert.equal(rows.length,3);assert.equal(rows.length,audit.summary.totalRuns);
 sourceRows.forEach(({condition,run},index)=>{
  const row=rows[index];assert.equal(row.length,header.length);const value=name=>row[header.indexOf(name)];
  assert.equal(value('condition'),condition);assert.equal(value('run_status'),'ok');assert.equal(Number(value('recruited_hosts_cells')),run.metrics.recruitedHosts);
  assert.equal(Number(value('first_phase_charge_nC')),run.dose.firstPhaseChargeNc);assert.equal(Number(value('absolute_phase_charge_nC')),run.dose.absolutePhaseChargeNc);
  assert.equal(Number(value('geometric_contact_area_um2')),run.dose.geometricContactAreaUm2);assert.equal(Number(value('absolute_phase_charge_density_uC_per_cm2')),run.dose.absolutePhaseChargeDensityUcPerCm2);
  assert.deepEqual(JSON.parse(value('settings_json')),run.settings);assert.deepEqual(JSON.parse(value('host_events_json')),run.hosts);assert.deepEqual(JSON.parse(value('causal_comparison_json')),audit.cases[0].comparison);
  for(const record of run.recordings)for(const [suffix,key] of [['neural_p2p_uV','neuralPeakToPeakUv'],['graft_p2p_uV','graftPeakToPeakUv'],['host_p2p_uV','hostPeakToPeakUv'],['artifact_p2p_uV','artifactPeakToPeakUv'],['total_p2p_uV','totalPeakToPeakUv'],['source_residual_uV','sourceResidualMaxUv']])assert.equal(Number(value(`${record.id}_${suffix}`)),record[key]);
 });
});

test('biohybrid protocol export: actual sweep preserves explicit axis units, numeric order and errors without false zeros',()=>{
 const sweep=runProtocol({pulseCount:1,durationMs:25,dtMs:.01,recordXOffsetUm:-100},{kind:'sweep',axis:'recordDistanceUm',values:[45,60,150],paired:false});
 const doc=protocolDocument(sweep),rows=parseCSV(protocolCSV(sweep)),header=rows.shift();
 assert.equal(rows.length,3);assert.equal(doc.cases.length,3);assert.deepEqual(doc.cases.map(item=>item.baseline.status),['ok','error','ok']);
 for(let index=0;index<rows.length;index++){
  const value=name=>rows[index][header.indexOf(name)],run=sweep.cases[index].baseline;
  assert.equal(value('axis_unit'),'µm');assert.equal(Number(value('axis_value')),[45,60,150][index]);
  assert.deepEqual(JSON.parse(value('settings_json')),run.settings);
  if(run.status==='error'){assert.equal(value('recruited_hosts_cells'),'');assert.equal(value('rec-2_neural_p2p_uV'),'');assert.equal(value('error'),run.error);assert.equal(value('absolute_phase_charge_density_uC_per_cm2'),'');}
 }
});

test('biohybrid protocol export: failed solve explanations survive quoting and spreadsheet formula prefixes are neutralized',()=>{
 const broken=clone(audit);broken.cases[0].noStimulus={status:'error',settings:broken.cases[0].noStimulus.settings,error:'=geometry,"failed"\nno measurement'};broken.cases[0].status='partial';Object.assign(broken.summary,{successfulRuns:2,failedRuns:1,completedCases:0,allControlsQuiet:null});
 const doc=protocolDocument(broken);assert.equal(doc.cases[0].noStimulus.error,broken.cases[0].noStimulus.error);
 const rows=parseCSV(protocolCSV(broken)),header=rows.shift(),last=rows[2],value=name=>last[header.indexOf(name)];
 assert.equal(last.length,header.length);assert.equal(value('run_status'),'error');assert.equal(value('error'),"'=geometry,\"failed\"\nno measurement");assert.equal(value('recruited_hosts_cells'),'');assert.equal(value('host_events_json'),'');
});

test('biohybrid protocol export: refuses missing controls, malformed versions and truncated case arrays',()=>{
 for(const bad of [null,{}, {...audit,schemaVersion:'future'},{...audit,modelVersion:'unknown'},{...audit,cases:[]}])assert.throws(()=>protocolDocument(bad));
 const bad=clone(audit);bad.cases[0].synapsesOff=null;assert.throws(()=>protocolJSON(bad),/controls/);
 const missing=clone(audit);missing.cases[0].baseline.recordings.pop();assert.throws(()=>protocolCSV(missing),/recording channels/);
 const events=clone(audit);events.cases[0].baseline.hosts[0].somaSpikes+=1;assert.throws(()=>protocolJSON(events),/host events/);
});

test('biohybrid protocol export: refuses nonfinite fields and unmatched interventions instead of altering data',()=>{
 const nan=clone(audit);nan.cases[0].baseline.recordings[1].hostPeakToPeakUv=NaN;assert.throws(()=>protocolCSV(nan),/Non-finite/);
 const absent=clone(audit);delete absent.cases[0].baseline.recordings[1].graftPeakToPeakUv;assert.throws(()=>protocolJSON(absent),/Invalid protocol measurement/);
 const changed=clone(audit);changed.cases[0].synapsesOff.settings.stimAmplitudeUa=-1;assert.throws(()=>protocolJSON(changed),/unmatched setting/);
 const totals=clone(audit);totals.summary.totalRuns=8;assert.throws(()=>protocolCSV(totals),/run totals/);
});

test('biohybrid protocol export: rejects stale failed-run measurements and fabricated causal summaries',()=>{
 const stale=clone(audit);stale.cases[0].noStimulus.status='error';stale.cases[0].noStimulus.error='failure';assert.throws(()=>protocolCSV(stale),/stale measurements/);
 const causal=clone(audit);causal.cases[0].comparison.lostHosts=99;assert.throws(()=>protocolJSON(causal),/causal comparison/);
 const response=clone(audit);response.summary.responsePattern='nonmonotonic';assert.throws(()=>protocolCSV(response),/summary is inconsistent/);
 const status=clone(audit);status.cases[0].status='error';assert.throws(()=>protocolJSON(status),/status contradicts/);
});

test('biohybrid protocol export: rejects impossible event chronology, conflicting dose and mislabelled units',()=>{
 const late=clone(audit);late.cases[0].baseline.hosts[0].spikeTimesMs[0]=100;assert.throws(()=>protocolJSON(late),/chronology/);
 const duplicate=clone(audit);duplicate.cases[0].baseline.hosts[1].id=duplicate.cases[0].baseline.hosts[0].id;assert.throws(()=>protocolCSV(duplicate),/Duplicate cell/);
 const count=clone(audit);count.cases[0].baseline.metrics.recruitedHosts=0;assert.throws(()=>protocolJSON(count),/recruitment or soma counts/);
 const dose=clone(audit);dose.cases[0].baseline.dose.absolutePhaseChargeNc=100;assert.throws(()=>protocolJSON(dose),/Charge metadata/);
 const units=clone(audit);units.units.charge='µC';assert.throws(()=>protocolCSV(units),/units/);
 const resolution=clone(audit);resolution.cases[0].baseline.diagnostics.dtMs=.02;assert.throws(()=>protocolJSON(resolution),/Resolution metadata/);
});

test('biohybrid protocol export: nominal geometric phase density uses explicit physical conversion and cannot be relabelled as safety',()=>{
 const dose=audit.cases[0].baseline.dose;
 const areaCm2=Math.PI*(audit.baseSettings.contactRadiusUm*1e-4)**2;
 const chargeMicroCoulomb=Math.abs(audit.baseSettings.stimAmplitudeUa*audit.baseSettings.pulseWidthMs)*1e-3;
 assert.ok(Math.abs(dose.absolutePhaseChargeDensityUcPerCm2-chargeMicroCoulomb/areaCm2)<1e-10);
 assert.equal(dose.geometricContactAreaUm2,Math.PI*audit.baseSettings.contactRadiusUm**2);
 assert.match(protocolJSON(audit),/not an electrochemical or clinical safety limit/);
 const corrupted=clone(audit);corrupted.cases[0].baseline.dose.absolutePhaseChargeDensityUcPerCm2*=1000;assert.throws(()=>protocolJSON(corrupted),/Charge metadata/);
 const units=clone(audit);units.units.chargeDensity='nC/cm²';assert.throws(()=>protocolCSV(units),/units/);
});
