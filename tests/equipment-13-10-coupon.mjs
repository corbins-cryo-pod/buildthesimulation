import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createStation,scanRow,coupon,file,heightAt,targets} from '../public/equipment/13-10/coupon.mjs';
const asset=n=>new URL('../public/equipment/13-10/'+n,import.meta.url);
test('fixed 36 nm interior, 0 nm surrounding, exact edge convention and zero blank line',()=>{
 assert.equal(scanRow(12).points.filter(p=>p.heightNm===36).length,16);
 assert.ok(scanRow(2).points.every(p=>p.heightNm===0));
 assert.deepEqual([5.75,6,13.999,14].map(x=>heightAt(x,6.25)),[0,36,36,0]);
 assert.throws(()=>scanRow(24),RangeError);
 assert.throws(()=>heightAt(-.1,4),RangeError);
});
test('semantic actions, revision-preserving export and validation',()=>{
 const s=createStation(),o=file(s.hit('Read_Passive_Step'));
 assert.equal(o.measurement.stepNm,36);
 assert.equal(o.coupon.id,coupon.id);assert.equal(o.coupon.revision,'1');
 assert.equal(s.hit('Pick_Surround_Point').measurement,null);
 assert.equal(s.dispatch('read').measurement.stepNm,0);
 const err=s.dispatch('column',NaN);assert.ok(err.error);assert.equal(err.column,4);assert.equal(err.measurement,null);
 assert.equal(file(s.read()).profile.points.length,40);
});
test('metric editable lightweight sealed model and exact published verification',()=>{
 const b=readFileSync(asset('ace600-closed.glb')),m=JSON.parse(readFileSync(asset('vr-station.json'))), v=JSON.parse(readFileSync(asset('verification.json')));
 assert.equal(b.subarray(0,4).toString(),'glTF');assert.equal(b.length,m.bytes);assert.equal(m.units,'m');
 assert.deepEqual(m.hitTargets.map(t=>t.action),Object.values(targets));assert.ok(v.checks.every(t=>t.pass));assert.equal(v.checks.length,13);
 const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
 assert.equal(g.extras.dormant,true);assert.equal(g.animations,undefined);
 assert.ok(g.nodes.find(x=>x.name==='Opaque_glazing_rounded'));
});
