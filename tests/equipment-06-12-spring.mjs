import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {point,createStation,run,jsonRecord,csvRecord} from '../public/equipment/06-12/spring.mjs';
test('unilateral contact and beam compensation on a known reference',()=>{
 assert.equal(point(25,.04).displayedMn,0);assert.equal(point(24.9,.04).idealMn,0);assert.ok(point(26,.04).displayedMn>0);
 const v=run(100,.04);assert.equal(v.peakDisplayedMn,2.4);assert.ok(Math.abs(v.fits.effectiveMnPerUm-.032)<.00032);assert.ok(Math.abs(v.fits.springMnPerUm-.04)<.0004);
 assert.equal(run(19,.04).fits.springMnPerUm,null);assert.throws(()=>run(160,.08),/ceiling exceeded/);
});
test('state actions, access contract and reproducible output',()=>{
 const s=createStation();assert.equal(s.hit('Preview_toggle_key').preview.travelUm,100);
 const r=s.hit('Run_virtual_trace_key');assert.equal(jsonRecord(r).fixture.revision,'1');assert.equal(csvRecord(r).trim().split('\n').length,22);
 assert.equal(s.dispatch('travel',12).result,null);assert.throws(()=>jsonRecord(s.read()),/before exporting/);
 const fault=s.dispatch('travel',-4);assert.ok(fault.error);assert.equal(fault.travelUm,12);
});
test('meter-scale GLB and independent published verification',()=>{
 const path=n=>new URL('../public/equipment/06-12/'+n,import.meta.url),v=JSON.parse(readFileSync(path('verification.json'))),b=readFileSync(path('microtester-g2.glb'));
 assert.equal(b.toString('ascii',0,4),'glTF');assert.ok(b.length<50000);assert.equal(v.checks.length,15);assert.ok(v.checks.every(x=>x.pass));
});
