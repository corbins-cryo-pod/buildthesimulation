import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createStation,section,volume,file,targets} from '../public/equipment/13-03/sections.mjs';
const get=n=>fs.readFileSync(new URL('../public/equipment/13-03/'+n,import.meta.url));
test('read-only two planes distinguish section and volume geometry',()=>{
 const s=createStation(),a=s.hit('Volume_measure_key');assert.deepEqual(a.result.sectionExtentUm,[24,20]);assert.equal(a.result.cavityAreaUm2,480);
 assert.deepEqual(a.result.sectionEdgeBoundsUm,[28,18,52,38]);assert.equal(a.result.cavityVolumeUm3,7680);
 s.hit('Section_monitor_screen');const b=s.hit('Volume_measure_key');assert.deepEqual(b.result.sectionExtentUm,[24,16]);assert.equal(b.result.cavityAreaUm2,384);
 assert.deepEqual(b.result.sectionEdgeBoundsUm,[28,12,52,28]);assert.equal(b.result.cavityVolumeUm3,7680);
 assert.equal(file(b).coordinateUm,29);assert.equal(file(b).fixture.revision,1);
});
test('blank and out-of-range selections leave digital fixture unchanged',()=>{
 const s=createStation();s.dispatch('index',0);const a=s.hit('Volume_measure_key');assert.equal(a.result.present,false);assert.equal(a.result.cavityVolumeUm3,7680);
 const copy=file(a);copy.image.pixels[0]=1;assert.equal(file(a).image.pixels[0],0);
 assert.throws(()=>section('XY',24),/inside/);assert.ok(s.dispatch('index',24).error);assert.equal(s.read().index,0);
 assert.equal(volume().voidVoxelCount,960);assert.equal(s.hit('Section_view_key').index,10);
});
test('documented 379 mm metric chamber datum and valid scene actions',()=>{
 const b=get('hydra-cx-display.glb'),m=JSON.parse(get('vr-station.json')),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
 assert.equal(b.length,m.bytes);const lookup=n=>j.nodes.find(x=>x.name===n);
 assert.ok(Math.abs(lookup('Chamber_width_datum_R').translation[0]-lookup('Chamber_width_datum_L').translation[0]-.379)<1e-12);
 for(const h of m.hitTargets){assert.ok(lookup(h.node));assert.equal(targets[h.node],h.action);}
 assert.ok(JSON.parse(get('verification.json')).checks.every(x=>x.pass));
});
