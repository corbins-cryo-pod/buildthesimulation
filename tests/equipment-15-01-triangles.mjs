import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {compare,createStation,exportIllustration} from '../public/equipment/15-01/triangles.mjs';
test('generic triangle benchmark and closed-line/impossible boundary',()=>{
 const s=createStation();assert.equal(s.read().area,24);
 assert.ok(Math.abs(s.hit('Cycle_triangle_artwork').area-21.3307290077)<1e-9);
 assert.equal(s.hit('Cycle_triangle_artwork').kind,'flat');
 assert.equal(s.read().area,0);
 assert.equal(s.hit('Toggle_triangle_side_labels').labels,false);
 assert.equal(s.hit('Cycle_triangle_artwork').area,null);assert.equal(s.read().gapLength,1);
 assert.equal(exportIllustration(s.read()).card.revision,'1');assert.throws(()=>compare('outside'),RangeError);
});
test('non-operational glTF and verified nominal plate evidence',()=>{
 const p=n=>new URL('../public/equipment/15-01/'+n,import.meta.url);
 const v=JSON.parse(readFileSync(p('verification.json'))),b=readFileSync(p('kopf940-outline.glb'));
 assert.equal(b.toString('ascii',0,4),'glTF');assert.ok(b.length<50000);assert.equal(v.checks.length,12);assert.ok(v.checks.every(x=>x.pass));
 const g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));assert.ok(g.extras.noPositioningFeatures&&g.extras.noTracking);assert.equal(g.animations,undefined);
});
