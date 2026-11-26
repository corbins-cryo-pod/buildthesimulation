import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {measureRows,createStation,exportRuler} from '../public/equipment/15-07/ruler.mjs';
test('known immutable ruler and directed/zero/out-of-range cases',()=>{
 const s=createStation(),a=s.read();assert.equal(a.measurement.separationMm,4.5);assert.equal(a.measurement.deltaRows,36);
 const b=s.hit('Reverse_ruler_endpoints');assert.equal(b.measurement.signedMm,-4.5);assert.equal(b.measurement.separationMm,4.5);
 const c=s.hit('Cycle_marker_pair');assert.equal(c.measurement.separationMm,0);assert.equal(exportRuler(c).graphic.revision,'1');
 assert.throws(()=>measureRows(0,80),RangeError);assert.throws(()=>measureRows(-1,3),RangeError);assert.throws(()=>measureRows(.5,3),RangeError);
});
test('metric authored console, no ancillary device, and independent checks',()=>{
 const p=n=>new URL('../public/equipment/15-07/'+n,import.meta.url),b=readFileSync(p('vevo3100-console.glb')),v=JSON.parse(readFileSync(p('verification.json')));
 assert.equal(b.toString('ascii',0,4),'glTF');assert.ok(b.length<65000);
 const g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));assert.equal(g.extras.includesAccessoryCart,false);assert.equal(g.animations,undefined);
 assert.equal(v.checks.length,12);assert.ok(v.checks.every(x=>x.pass));
});
