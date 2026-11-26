import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {compare,createStation,exportComparison} from '../public/equipment/07-08/shapes.mjs';
test('area oracle, overlay invariance, zero self difference and source revision',()=>{
 const s=createStation(),r=s.read();assert.ok(Math.abs(r.areaMm2-1152*Math.SQRT2)<1e-8);assert.equal(r.diameterMm,48);
 assert.equal(s.hit('Plaque_Overlay_Disk').areaMm2,r.areaMm2);
 assert.ok(Math.abs(s.hit('Plaque_Change_Shape').areaMm2-1152)<1e-8);
 assert.equal(s.hit('Plaque_Change_Shape').uncoveredMm2,0);
 assert.equal(exportComparison(s.read()).card.revision,'1');assert.throws(()=>compare('outside'),RangeError);
});
test('outer shell and independent check artifact',()=>{
 const path=n=>new URL('../public/equipment/07-08/'+n,import.meta.url),v=JSON.parse(readFileSync(path('verification.json'))),b=readFileSync(path('octo-documentary.glb'));
 assert.equal(b.toString('ascii',0,4),'glTF');assert.ok(b.length<45000);
 assert.equal(v.checks.length,11);assert.ok(v.checks.every(x=>x.pass));
 const g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));assert.ok(g.extras.caseOnly);assert.equal(g.animations,undefined);
});
