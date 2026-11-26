import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createStation,displayIntensity,section,file,targets} from '../public/equipment/12-06/stack.mjs';
const get=n=>fs.readFileSync(new URL('../public/equipment/12-06/'+n,import.meta.url));
test('XY/XZ recover distinct widths and voxel-edge bounds on the same inset',()=>{
 const s=createStation(),a=s.hit('Workstation_stack_button');
 assert.deepEqual(a.result.extentUm,[24,16]);assert.deepEqual(a.result.edgeBoundsUm,[43,33,67,49]);assert.equal(a.result.voxelCount,96);
 s.hit('Workstation_monitor_screen');const b=s.hit('Workstation_stack_button');assert.deepEqual(b.result.extentUm,[24,30]);
 assert.deepEqual(b.result.edgeBoundsUm,[43,22.5,67,52.5]);assert.equal(b.result.voxelCount,72);
 assert.deepEqual(file(b).planeSpacingUm,[2,5]);assert.equal(file(b).fixedCoordinateUm,40);assert.equal(file(b).viewRevision,2);
});
test('display contrast changes no raw section data and blank layers have no bounds',()=>{
 const s=createStation(),a=file(s.dispatch('measure'));const b=file(s.dispatch('window','high'));
 assert.notEqual(displayIntensity(150,'normal'),displayIntensity(150,'high'));assert.deepEqual(a.rawIntensity,b.rawIntensity);assert.deepEqual(a.measurement,b.measurement);
 s.dispatch('index',0);const c=s.dispatch('measure');assert.equal(c.result.present,false);assert.equal(c.result.extentUm,null);
 assert.throws(()=>section('XY',21),/outside/);assert.ok(s.dispatch('index',21).error);
});
test('metric documented envelopes and named actions in actual GLB',()=>{
 const gb=get('lsm980-nlo-display.glb'),j=JSON.parse(gb.subarray(20,20+gb.readUInt32LE(12))),m=JSON.parse(get('vr-station.json'));
 assert.equal(m.bytes,gb.length);assert.deepEqual(j.extras.scannerMm,[450,220,550]);
 for(const x of m.hitTargets){assert.ok(j.nodes.some(v=>v.name===x.node));assert.equal(targets[x.node],x.action);}
 assert.ok(JSON.parse(get('verification.json')).checks.every(c=>c.pass));
});
