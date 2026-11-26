import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {convert,createStation,exportReading} from '../public/equipment/11-05/units.mjs';
test('grounded reference, exact linear conversions, and zero log edge',()=>{
 assert.equal(convert(.001,'µW').value,1000);assert.equal(convert(.001,'dBm').value,0);assert.equal(convert(.0001,'dBm').value,-10);
 assert.ok(Math.abs(convert(.00025,'dBm').value+6.02059991328)<1e-9);
 assert.equal(convert(0,'µW').value,0);assert.equal(convert(0,'dBm').value,null);assert.equal(convert(0,'dBm').finite,false);
 assert.throws(()=>convert(-1,'mW'),RangeError);assert.throws(()=>convert(Infinity,'mW'),RangeError);assert.throws(()=>convert(Number.MAX_VALUE,'µW'),RangeError);
});
test('detached actions retain source ID, and no detector asset was inferred',()=>{
 const s=createStation();assert.equal(s.read().reading.value,100);assert.equal(s.hit('Cycle_display_units').reading.value,.1);
 assert.equal(s.hit('Cycle_fixed_value').id,'quarter');assert.equal(exportReading(s.read()).fixed.revision,'1');
 const p=n=>new URL('../public/equipment/11-05/'+n,import.meta.url),v=JSON.parse(readFileSync(p('verification.json'))),b=readFileSync(p('pm100d-console.glb'));
 assert.equal(b.toString('ascii',0,4),'glTF');assert.ok(b.length<90000);
 assert.equal(v.checks.length,15);assert.ok(v.checks.every(x=>x.pass));
 const g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));assert.equal(g.extras.includesDetector,false);
});
