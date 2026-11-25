import test from 'node:test';
import assert from 'node:assert/strict';
import {exampleSample,defaults,runMill,validateSample} from '../src/lib/equipment/04-04/solver.mjs';
const e=exampleSample(), run=(c={})=>runMill(e,{...defaults,...c});
const close=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t, a+' vs '+b);
test('04-04 register acceptance: all 4096 cells',()=>{const r=run();r.sample.thicknessNm.forEach((v,k)=>close(v,k%64<32?200:140));close(r.meanRemovedNm,30);});
test('04-04 projection and directional mask intersection',()=>{close(run({maskFraction:0,angle:60}).meanRemovedNm,30);close(run({angle:45,azimuth:180}).shadowFraction.reduce((n,v)=>n+(v>.99),0),35*64);});
test('04-04 saturation, zero dose and mass budget',()=>{assert.ok(run({maskFraction:0,minutes:20}).sample.thicknessNm.every(v=>v===0));close(run({minutes:0}).meanRemovedNm,0);const r=run({redeposition:.2});close(r.redepositedVolumeMm3/r.removedVolumeMm3,.2);});
test('04-04 rotation averages azimuth over a complete turn',()=>{const a=run({rpm:1,minutes:1,angle:45}),b=run({rpm:1,minutes:1,angle:45,azimuth:90});a.shadowFraction.forEach((v,i)=>close(v,b.shadowFraction[i]));});
test('04-04 invalid samples, parameters and revision contract',()=>{assert.throws(()=>run({angle:90}));assert.throws(()=>validateSample({...e,thicknessNm:[200]}));assert.throws(()=>validateSample({...e,widthMm:100,heightMm:100}));const r=run();assert.equal(r.sample.sampleId,e.sampleId);assert.equal(r.sample.revision,1);assert.equal(e.thicknessNm[0],200);validateSample(r.sample);});

import {readFileSync} from 'node:fs';
test('04-04 GLB structure, physical carrier and named pivots',()=>{const b=readFileSync(new URL('../public/equipment/04-04/nanoquest.glb',import.meta.url));assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());const nodes=new Map(j.nodes.map(n=>[n.name,n]));for(const n of ['Door_hinge_pivot','Stage_tilt','Stage_spin','Shutter_slide','Ion_grid','Coupon','Opaque_mask'])assert.ok(nodes.has(n),n);close(nodes.get('100mm_carrier_retainer').scale[0],.1);close(nodes.get('Coupon').scale[0],.01);assert.ok(j.buffers[0].byteLength>10000);});
test('04-04 published example matches the solver and is reloadable',()=>{const r=JSON.parse(readFileSync(new URL('../public/equipment/04-04/example-result.json',import.meta.url)));assert.deepEqual(r,run());validateSample(r.sample);});
