import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_CONFIG,PRESETS,normalizeConfig,generateContacts,buildWaveform,scheduleInfo,createElectricalSources,createStimulusRaster,measurePercept,exportExperiment,parseExperiment} from '../src/lib/retinal-implant/model.mjs';
import {decodePerceptReference} from '../src/lib/retinal-implant/percept.mjs';
import {simulateExperiment} from '../src/lib/retinal-implant/engine.mjs';
import {createRetinalClient} from '../src/lib/retinal-implant/client.mjs';
const assets=new URL('../public/assets/retinal-implant/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('axon-reference.json',assets)));
const reference=await decodePerceptReference(manifest,Buffer.concat(manifest.storage.chunks.map(c=>readFileSync(new URL(c.file,assets)))));
const c=patch=>normalizeConfig({...DEFAULT_CONFIG,...patch});
const close=(a,b,t=1e-8)=>assert(Math.abs(a-b)<=t,`${a} differs from ${b}`);

test('phase charge and geometric area use SI-consistent units',()=>{
  const w=buildWaveform(c({pattern:'single',amplitudeUa:100,phaseDurationMs:.2,diameterUm:200}));
  close(w.phaseChargeNc,20);close(w.chargeDensityUcCm2,63.66197723675813);assert.equal(w.pulseCount,4);close(w.totalAbsoluteChargeNc,160);close(w.netChargeNc,0);
});
test('fractional pulse edges preserve charge without rounding to time samples',()=>{
  const w=buildWaveform(c({pattern:'single',amplitudeUa:100,phaseDurationMs:.137,interphaseMs:.073,frequencyHz:37,trainDurationMs:20}));
  assert.equal(w.pulseCount,1);close(w.phaseChargeNc,13.7);close(w.totalAbsoluteChargeNc,27.4);close(w.netChargeNc,0);
});
test('finite window contains only complete charge-balancing pairs',()=>{
  const w=buildWaveform(c({pattern:'single',frequencyHz:50,trainDurationMs:20.1}));
  assert.equal(w.pulseCount,1);assert(w.events.every(e=>e.startMs>=0&&e.endMs<=20.1));close(w.netChargeNc,0);
});
test('interleaving is nonoverlapping and infeasible schedules reject',()=>{
  const config=c({pattern:'pair',sequence:'interleaved',phaseDurationMs:.2});
  const s=scheduleInfo(config),events=s.active.flatMap(p=>buildWaveform(config,p.id).events).sort((a,b)=>a.startMs-b.startMs);
  for(let i=1;i<events.length;i++)assert(events[i].startMs>=events[i-1].endMs-1e-10);
  assert.throws(()=>scheduleInfo(c({pattern:'letter-e',sequence:'interleaved',phaseDurationMs:1,frequencyHz:100})),/exceeds/);
});
test('finite returns balance both modes and keep cathodic source signs',()=>{
  for(const returnMode of ['remote','ring']){const e=createElectricalSources(c({returnMode}));close(e.netCurrentUa,0);assert(e.sources.some(p=>p.currentUa<0));assert.equal(e.sources.filter(p=>p.kind==='return').length,returnMode==='ring'?8:1);}
});
test('disabled contacts and summed-current caps affect actual delivered current',()=>{
  const config=c({budgetMode:'total-current',totalCurrentUa:400});close(generateContacts(config).reduce((s,p)=>s+p.amplitudeUa,0),400);
  const disabled=c({pattern:'single',disabledIds:['E28']});assert.equal(buildWaveform(disabled).pulseCount,0);assert.deepEqual(createElectricalSources(disabled).sources,[]);
});
test('rotation and translation preserve pitch; invalid inputs reject',()=>{
  const config=c({device:'grid',rows:4,cols:4,xUm:1200,yUm:-700,rotationDeg:73}),p=generateContacts(config);
  close(p.reduce((s,a)=>s+a.xUm,0)/16,1200);close(p.reduce((s,a)=>s+a.yUm,0)/16,-700);close(Math.hypot(p[1].xUm-p[0].xUm,p[1].yUm-p[0].yUm),config.pitchUm);
  assert.throws(()=>normalizeConfig({amplitudeUa:NaN}),/finite/);assert.throws(()=>normalizeConfig({diameterUm:500,pitchUm:400}),/smaller/);
});
test('physical gap changes fields while fitted spatial percept remains independent',async()=>{
  const config=c({pattern:'single',compareCircular:false});const a=await simulateExperiment(config,reference),b=await simulateExperiment({...config,gapUm:500},reference);
  assert.deepEqual(a.percept.brightness,b.percept.brightness);assert(b.metrics.maxFieldVm<a.metrics.maxFieldVm);close(a.waveform.phaseChargeNc,b.waveform.phaseChargeNc);
});
test('zero and blank experiments return zeros with undefined spatial descriptors',async()=>{
  for(const patch of [{amplitudeUa:0},{pattern:'blank'}]){const r=await simulateExperiment(c(patch),reference);assert.equal(r.metrics.drivenContacts,0);assert.equal(r.metrics.maxFieldVm,0);assert.equal(r.metrics.perceptPeak,0);assert.equal(r.percept.metrics.centroidXDeg,null);assert(r.field.potentialMv.every(v=>v===0));}
});
test('biphasic phase duration changes representative percept, not fixed-current field',async()=>{
  const config=c({pattern:'single',perceptModel:'biphasic'}),a=await simulateExperiment(config,reference),b=await simulateExperiment({...config,phaseDurationMs:.8},reference);
  assert.notDeepEqual(a.percept.brightness,b.percept.brightness);assert.deepEqual(a.field.potentialMv,b.field.potentialMv);assert.equal(a.circularPercept.model,'biphasic-scoreboard');
  await assert.rejects(()=>simulateExperiment({...config,sequence:'interleaved'},reference),/simultaneous/);
});
test('contact region and fine grids retain exact probe coordinates and provenance',async()=>{
  const r=await simulateExperiment(c({pattern:'single',fieldView:'selected',fieldSpanUm:500,fieldGridSize:121,gridStepDeg:.25}),reference);
  assert.equal(r.field.width,121);assert.equal(r.percept.width,121);const selected=r.contacts.find(p=>p.id===r.config.selectedId);
  close(r.field.xUm[60],selected.xUm);close(r.field.yUm[60],selected.yUm);close(r.field.potentialMv[60*121+60],r.contactMetrics[selected.id].potentialMv,1e-7);assert.match(r.provenance.referenceAssetSha256,/^[a-f0-9]{64}$/);
});
test('image support metrics distinguish zero, one region and separated components',()=>{
  const data={width:3,height:3,xDeg:[-1,0,1],yDeg:[1,0,-1],brightness:new Float32Array(9)};assert.equal(measurePercept(data).centroidXDeg,null);
  data.brightness[0]=1;data.brightness[8]=1;const m=measurePercept(data);assert.equal(m.components,2);assert.equal(m.areaDeg2,2);close(m.centroidXDeg,0);assert(m.touchesEdge);
});
test('exports validate versions/settings, ignore imported results and reject stale outputs',async()=>{
  const config=c({pattern:'single'}),r=await simulateExperiment(config,reference),doc=exportExperiment(config,r);assert.deepEqual(parseExperiment(JSON.stringify(doc)),config);
  doc.results={bad:'not trusted'};assert.deepEqual(parseExperiment(JSON.stringify(doc)),config);
  assert.throws(()=>parseExperiment(JSON.stringify({...doc,modelVersion:'future'})),/Expected/);delete doc.settings.gapUm;assert.throws(()=>parseExperiment(JSON.stringify(doc)),/Missing/);
  assert.throws(()=>exportExperiment({...config,gapUm:400},r),/different/);
});
test('all seven presets calculate finite outputs and restore to the same settings',async()=>{
  for(const preset of PRESETS){const config=c(preset.config),r=await simulateExperiment(config,reference);assert(r.field.potentialMv.every(Number.isFinite),preset.id);assert(r.percept.brightness.every(Number.isFinite),preset.id);close(r.metrics.netSourceCurrentUa,0,1e-8);assert.deepEqual(parseExperiment(JSON.stringify(exportExperiment(config,r))),config);}
});
test('idle cancellation retains the completed worker; active cancellation rejects and ignores stale messages',async()=>{
  const workers=[];class FakeWorker{constructor(){this.terminated=false;workers.push(this);}postMessage(message){this.message=message;}terminate(){this.terminated=true;}}
  const client=createRetinalClient({workerFactory:()=>new FakeWorker()});

  const first=client.run(DEFAULT_CONFIG),cachedWorker=workers[0];
  cachedWorker.onmessage({data:{type:'result',id:cachedWorker.message.id,result:'first'}});
  assert.equal(await first,'first');
  client.cancel();client.cancel(); // Editing settings and then running both request cancellation.
  assert.equal(cachedWorker.terminated,false,'Idle cancellation must preserve the worker and its checked reference caches.');
  const second=client.run({...DEFAULT_CONFIG,gapUm:250});
  assert.equal(workers.length,1,'A subsequent run must reuse the completed worker.');
  cachedWorker.onmessage({data:{type:'result',id:cachedWorker.message.id,result:'second'}});
  assert.equal(await second,'second');

  const cancelled=client.run(DEFAULT_CONFIG),cancelledId=cachedWorker.message.id;
  const rejection=assert.rejects(cancelled,{name:'AbortError'});client.cancel();await rejection;
  assert.equal(cachedWorker.terminated,true,'Cancelling active work must terminate its worker.');
  const next=client.run(DEFAULT_CONFIG);assert.equal(workers.length,2);
  cachedWorker.onmessage({data:{type:'result',id:cancelledId,result:'stale'}});
  workers[1].onmessage({data:{type:'result',id:workers[1].message.id,result:'fresh'}});
  assert.equal(await next,'fresh');
  client.dispose();assert.equal(workers[1].terminated,true,'Disposal must terminate even an idle worker.');
  await assert.rejects(()=>client.run(DEFAULT_CONFIG),/disposed/);
});
