import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {defaults,sweep} from '../public/equipment/10-01/solver.mjs';
import {acquire,jsonSource,importSettings} from '../public/equipment/09-04/solver.mjs';
import {initial,fixture,run,dispatch,waveform,calibrationId} from '../public/equipment/10-04/solver.mjs';
const p=new URL('../public/equipment/10-04/',import.meta.url),url=n=>new URL(n,p),json=n=>JSON.parse(readFileSync(url(n),'utf8')),rows=[];
function check(id,expected,actual,unit='',tol=0){
 const pass=typeof expected==='number'&&typeof actual==='number'?Math.abs(expected-actual)<=tol:expected===actual;
 rows.push({id,expected,actual,unit,tol:typeof expected==='number'?tol:'Exact',pass});assert.ok(pass,id+' '+JSON.stringify({expected,actual,tol}));
}
const step=(s,a,v)=>{const q=dispatch(s,a,v);assert.ok(q.ok,q.message);return q.state;};
const maximum=(a,b)=>a.reduce((m,v,i)=>Math.max(m,Math.abs(v-b[i])),0);
test('independent resistor values, time constant and representative transient',()=>{
 const a=run(),n=Math.round(.005/a.acquisition.dtS),d=1000; // Another 10 ms.
 check('IC settled upstream voltage',10.2,1000*a.summary.settledPrimarySI,'mV',1e-12);
 check('IC starting upstream step',0.2,1000*a.records.electrodeV[n],'mV',1e-12);
 check('IC electronic time constant',16.5,a.summary.tauMs,'ms',1e-12);
 check('IC upstream at 10 ms into step',.2+10*(1-Math.exp(-10/16.5)),1000*a.records.electrodeV[n+d],'mV',1e-11);
 check('Acquisition clock',100000,a.acquisition.clockHz,'Sa/s',1e-8);
 assert.equal(a.mode,'IC');assert.equal(a.calibrationId,calibrationId);assert.equal(a.summary.clippedSamples,0);
});
test('10-01 same ideal columns agree in SI, while its device adapter is separate',()=>{
 for(const mode of ['IC','VC']){
  const s=mode==='IC'?initial():step(initial(),'mode','VC');
  const a=run(s),b=sweep({...defaults,...{mode:s.settings.mode,step:s.settings.step}});
  check('10-01 '+mode+' electrode agreement',0,maximum(a.records.electrodeV,b.columns.electrodeV),'V',1e-13);
  check('10-01 '+mode+' current agreement',0,maximum(a.records.currentA,b.columns.currentA),'A',1e-20);
  assert.deepEqual(a.records.timeS,b.columns.timeS);
  assert.equal(a.revision,b.revision);assert.equal(a.sampleId,b.sampleId);
 }
});
test('VC true passive current and isolated monitor clipping',()=>{
 const s=step(initial(),'mode','VC'),a=run(s),q=run(step(s,'settings',{range:'high'}));
 check('VC at rising edge',1000,1e12*a.records.currentA[500],'pA',1e-9);
 check('VC settled series current',100/5.1,1e12*a.summary.settledPrimarySI,'pA',1e-9);
 assert.equal(a.summary.clippedSamples,0);assert.ok(q.summary.clippedSamples>=2);
 assert.deepEqual(a.records.currentA,q.records.currentA);assert.equal(q.records.monitorV[500],10);
 assert.equal(q.acquisition.physicalPrimaryUnit,'A');
 check('High range VC clipped monitor at step','Clipped',q.records.clipped[500]?'Clipped':'Not clipping');
});
test('disabled state, invalid fixture and exact 0 Ω ideality guard',()=>{
 for(const a of ['connect','host','power'])assert.equal(dispatch(step(initial(),a),'run').ok,false);
 const s=step(step(initial(),'mode','VC'),'fixture',{rsMOhm:0});assert.equal(dispatch(s,'run').ok,false);
 assert.equal(dispatch(s,'settings',{step:101}).ok,false);
 assert.equal(dispatch(s,'settings',{durationMs:501}).ok,false);
 assert.equal(dispatch(s,'import',{...fixture,rlMOhm:-1}).ok,false);
 const test=step(step(initial(),'import',{...fixture,sampleId:'inert-v2',parentRevision:7}),'run').result;
 assert.equal(test.revision,8);assert.equal(test.sampleId,'inert-v2');
});
test('actual Tektronix 09-04 import and capture of exported waveform',()=>{
 const a=run(),compact=waveform(a,2001);
 assert.deepEqual(json('example-dummy.json'),fixture);assert.deepEqual(json('example-monitor.json'),compact);assert.equal(compact.provenance.partial,true);
 const src=jsonSource(compact),out=acquire(importSettings(src),src);
 check('Scope capture peak-to-peak',.0308555,out.measurements.peakToPeakV,'V',.00002);
 check('Scope capture clipping',0,out.measurements.clipCount,'samples');
 assert.equal(out.measurements.periodS,null);assert.equal(out.source,'10-04 HEKA EPC 10 USB virtual monitor');
 assert.equal(out.parentRevision,compact.revision);assert.equal(out.contactId,'EPC10-PRIMARY');
});
test('actual metric model, bounded controls, dummy separation',async()=>{
 const b=readFileSync(url('epc10.glb')),m=json('interaction.json'),metrics=json('asset-metrics.json');
 const scene=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene,seen=new Map();
 scene.traverse(v=>seen.set(v.name,(seen.get(v.name)??0)+1));
 const g=n=>scene.getObjectByName(n),loc=n=>g(n).getWorldPosition(new T.Vector3()),bounds=n=>new T.Box3().setFromObject(g(n)).getSize(new T.Vector3()).toArray().map(x=>1000*x);
 for(const n of [m.frame.placementAnchor,...Object.values(m.parts),...m.ports,...m.actions.map(z=>z.node)])assert.equal(seen.get(n),1,n);
 assert.deepEqual(loc(m.frame.placementAnchor).toArray(),[0,0,0]);
 const main=bounds(m.parts.cabinet),head=bounds('red_star_core');
 check('Main cabinet across ear flanges',483,main[0],'mm',.2);check('Main cabinet height',145,main[1],'mm',1);
 check('Enclosure depth, excluding connectors',311,bounds('envelope_frame')[2],'mm',.1);
 for(const [i,nn,val] of [[0,'width',17],[1,'height',14.5],[2,'depth',90]])check('Red Star '+nn,val,head[i],'mm',.02);
 const before=loc('fixture_tip');g(m.parts.dummy).position.z+=m.motion.dummyDisconnectZ;
 check('Illustrative dummy disconnect animation',38,1000*(loc('fixture_tip').z-before.z),'mm',1e-6);
 assert.equal(metrics.bytes,b.length);assert.ok(metrics.bytes<2e6&&metrics.triangles<5e4&&metrics.primitives<=40);
});
test('published checks match exact fixture results',()=>{
 const scope='Independent passive RC calculations, exact common-solver agreement, emulator-to-emulator transfer and original metric asset only. No OEM hardware calibration, cellular model or headset test.';
 if(process.env.BTS_UPDATE_10_04==='1')writeFileSync(url('verification.json'),JSON.stringify({scope,rows},null,2)+'\n');
 else assert.deepEqual(json('verification.json'),{scope,rows});
});
