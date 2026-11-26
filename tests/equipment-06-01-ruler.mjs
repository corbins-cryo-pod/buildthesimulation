import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createStation,measure,exportReading} from '../public/equipment/06-01/ruler.mjs';
test('immutable drawing preserves magnitude and ray actions',()=>{
 const s=createStation(),r=s.read();assert.equal(r.measurement.distanceUm,50);assert.deepEqual(r.measurement.deltaUm,[30,40]);
 const reversed=s.hit('Ruler_reverse_button');assert.deepEqual(reversed.measurement.deltaUm,[-30,-40]);assert.equal(reversed.measurement.distanceUm,50);
 assert.equal(s.hit('Ruler_pair_button').measurement.distanceUm,35);assert.equal(s.hit('Ruler_pair_button').measurement.distanceUm,0);
 assert.throws(()=>measure('invalid','A'),RangeError);assert.equal(exportReading(s.read()).drawing.revision,'1');
});
test('public geometric evidence and GLB',()=>{
 const p=x=>new URL('../public/equipment/06-01/'+x,import.meta.url);
 const b=readFileSync(p('gt2-documentary.glb'));assert.equal(b.toString('ascii',0,4),'glTF');assert.ok(b.length<45000);
 const v=JSON.parse(readFileSync(p('verification.json')));assert.equal(v.checks.length,10);assert.ok(v.checks.every(x=>x.pass));
});
