import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createStation,panel,inspect,exportDrawing} from '../public/equipment/06-07/panel.mjs';
test('immutable panel, signed mirror, and known boundary',()=>{
 const s=createStation();
 const q=s.read();assert.equal(q.distanceMm,30);assert.equal(q.deltaMm,30);
 const r=s.hit('Panel_mirror_key');assert.equal(r.deltaMm,-30);assert.equal(r.distanceMm,30);assert.deepEqual(r.markers.map(x=>x.sourceXMm),[30,60,90,120]);
 assert.equal(s.hit('Panel_pair_key').pair,'BC');assert.equal(s.dispatch('pair','AD').distanceMm,90);assert.equal(s.dispatch('pair','AA').distanceMm,0);
 assert.equal(exportDrawing(s.read()).panel.revision,panel.revision);assert.throws(()=>inspect('ZZ'),RangeError);
});
test('documented nominal casing and approximate picture proportions pass',()=>{
 const path=n=>new URL('../public/equipment/06-07/'+n,import.meta.url);
 const v=JSON.parse(readFileSync(path('verification.json')));assert.equal(v.checks.length,15);assert.ok(v.checks.every(x=>x.pass));
 const b=readFileSync(path('mfcs-ez-dormant.glb'));assert.equal(b.toString('ascii',0,4),'glTF');assert.ok(b.length<70000);
});
