import test from 'node:test';
import assert from 'node:assert/strict';
import { MODEL_VERSION, DEFAULT_CONFIG, normalizeConfig, simulate } from '../src/lib/rpni-design/model.mjs';
import { createExperiment, parseExperiment, recordingCsv, growthCsv } from '../src/lib/rpni-design/export.mjs';
const reference=simulate({...DEFAULT_CONFIG,motorUnitsPerModule:3,traceDurationMs:50});
const packet=()=>createExperiment(reference);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('experiment JSON round trip restores a deterministic exact-version configuration',()=>{
 const e=packet(), c=parseExperiment(JSON.stringify(e));
 assert.deepEqual(c,reference.config);assert.equal(e.modelVersion,MODEL_VERSION);
 assert.deepEqual(simulate(c).recording,reference.recording);
 assert.equal(e.provenance.biologicalCalibration,false);assert.equal(e.provenance.sourceIds.length,15);
});
test('restore rejects incompatible format, schema and model versions',()=>{
 for(const p of [{...packet(),format:'other'},{...packet(),formatVersion:2},{...packet(),modelVersion:'0.0.0'}])assert.throws(()=>parseExperiment(p));
 assert.throws(()=>parseExperiment('{broken'));assert.throws(()=>parseExperiment(null));
 assert.throws(()=>createExperiment(null));
});
test('restore rejects incomplete, unknown and nonfinite parameter objects',()=>{
 const missing=packet();delete missing.config;assert.throws(()=>parseExperiment(missing));
 const c={...reference.config};delete c.seed;assert.throws(()=>parseExperiment({...packet(),config:c}));
 assert.throws(()=>parseExperiment({...packet(),config:{...reference.config,unknown:1}}));
 for(const value of [null,'2048',NaN,Infinity,-Infinity])assert.throws(()=>parseExperiment({...packet(),config:{...reference.config,seed:value}}));
});
test('restore rejects out-of-range values and configurations requiring geometry normalization',()=>{
 for(const patch of [{graftThicknessMm:-1},{electrodeSpacingMm:60},{targetModule:3},{observationDay:730},{moduleCount:1.5}])assert.throws(()=>parseExperiment({...packet(),config:{...reference.config,...patch}}));
});
test('stored numerical results and comparisons are ignored during parameter restoration',()=>{
 const altered={...packet(),result:{inventedSuccess:1},comparison:{config:{seed:1}},view:{day:0}};
 const c=parseExperiment(altered);assert.deepEqual(c,reference.config);
 const r=simulate(c);assert.equal(r.modelVersion,MODEL_VERSION);assert.deepEqual(r.recording,reference.recording);
 assert.equal(r.inventedSuccess,undefined);
});
test('recording CSV preserves units, sample count and physical component accounting',()=>{
 const rows=recordingCsv(reference).split('\r\n').map(line=>line.split(','));
 assert.deepEqual(rows[0].slice(0,4),['model_version','seed','observation_day','time_ms']);
 assert.equal(rows.length,reference.recording.timesMs.length+1);
 for(let i=1;i<rows.length;i++){
  assert.equal(Number(rows[i][3]),reference.recording.timesMs[i-1]);
  for(let c=0;c<reference.recording.channels.length;c++){
   const [signal,clean,target,other,noise]=rows[i].slice(4+5*c,9+5*c).map(Number);
   close(signal,clean+noise);close(clean,target+other);
   close(signal,reference.recording.channels[c].signalUv[i-1]);
  }
 }
});
test('growth CSV labels amplitude gain and distinguishes expected clean from total RMS',()=>{
 const rows=growthCsv(reference).split('\r\n').map(line=>line.split(',')), h=rows[0];
 assert.ok(h.includes('mean_source_amplitude_gain'));assert.ok(!h.includes('matureSourceFraction'));
 const clean=h.indexOf('ch0_expected_cleanRmsUv'),total=h.indexOf('ch0_expected_rmsUv'),noise=h.indexOf('ch0_expected_noiseRmsUv');
 assert.ok(clean>0&&total>0&&noise>0);
 for(let i=1;i<rows.length;i++)close(Number(rows[i][total])**2,Number(rows[i][clean])**2+Number(rows[i][noise])**2);
 assert.equal(rows.length,reference.samples.length+1);
});
test('normalized silent and point-contact edge cases round trip without nonfinite export values',()=>{
 const config=normalizeConfig({...DEFAULT_CONFIG,moduleCount:1,motorUnitsPerModule:1,sourceAmplitudeUa:0,noiseRmsUv:0,contactRadiusMm:0,electrodeSpacingMm:0,traceDurationMs:50});
 const result=simulate(config), e=createExperiment(result);
 assert.deepEqual(parseExperiment(JSON.stringify(e)),config);
 assert.equal(result.summary.channels[0].cleanRmsUv,0);assert.equal(result.summary.channels[0].snrDb,null);
 for(const csv of [recordingCsv(result),growthCsv(result)])assert.ok(!/NaN|Infinity|undefined/.test(csv));
});
