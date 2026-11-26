import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {compare,createStation,exportDrawing} from '../public/equipment/07-14/drawing.mjs';
test('equal areas/different perimeters, edge case and stable source through rotation',()=>{
 const s=createStation(),a=s.read();assert.equal(a.areaMm2,1600);assert.equal(a.differenceAreaMm2,0);assert.equal(a.perimeterMm,200);
 const b=s.hit('Rotate_fixed_drawing');assert.deepEqual(b.displayDimensionsMm,[20,80]);assert.equal(b.areaMm2,a.areaMm2);assert.equal(b.perimeterMm,a.perimeterMm);
 const c=s.hit('Choose_fixed_shape');assert.equal(c.areaMm2,1500);assert.equal(c.differenceAreaMm2,-100);assert.equal(c.perimeterMm,160);
 const d=s.hit('Choose_fixed_shape');assert.equal(d.equalArea,true);assert.equal(d.differencePerimeterMm,0);
 assert.equal(exportDrawing(d).reference.revision,'1');assert.throws(()=>compare('outside'),RangeError);
});
test('documentary sealed shell, exact bounds evidence and compact GLB',()=>{
 const p=n=>new URL('../public/equipment/07-14/'+n,import.meta.url);
 const v=JSON.parse(readFileSync(p('verification.json'))),b=readFileSync(p('tsx60086a-documentary.glb'));
 assert.equal(b.toString('ascii',0,4),'glTF');assert.ok(b.length<60000);
 assert.equal(v.checks.length,14);assert.ok(v.checks.every(x=>x.pass));
 const g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));assert.ok(g.extras.allPartsStatic);assert.equal(g.animations,undefined);
});
