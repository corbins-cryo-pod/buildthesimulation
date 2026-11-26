import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {analyze,createStation,clip,exportRecord,csvRecord} from '../public/equipment/15-12/offline.mjs';
test('offline peak rule, explicit tie ordering, exact equality and no match',()=>{
 for(const t of [3,5,6]){const r=analyze(t).first;assert.equal(r.id,'L3');assert.equal(r.peakIndex,76);assert.ok(Math.abs(r.peakOffsetMs-2.2)<1e-12);}
 assert.equal(analyze(7).first.id,'L4');assert.equal(analyze(7).first.peakIndex,76);assert.equal(analyze(9).first,null);
 assert.throws(()=>analyze(NaN),RangeError);
});
test('immutable numeric file and export tied to the analysis state',()=>{
 const s=createStation();assert.throws(()=>exportRecord(s.read()),/before exporting/);
 const r=s.hit('Recompute_from_fixed_file');assert.equal(exportRecord(r).source.revision,'1');assert.equal(csvRecord(r).trimEnd().split('\n').length,513);
 assert.equal(s.hit('Cycle_offline_threshold').result,null);
 const c=clip('L3');c.dataMv[76]=88;assert.equal(clip('L3').dataMv[76],6);
});
test('static exteriors and exact public evidence artifacts',()=>{
 const p=n=>new URL('../public/equipment/15-12/'+n,import.meta.url),b=readFileSync(p('rz6-ra4pa-exteriors.glb')),v=JSON.parse(readFileSync(p('verification.json')));
 assert.equal(b.toString('ascii',0,4),'glTF');assert.ok(b.length<85000);
 const g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));assert.ok(g.extras.noAudioOrControl);assert.equal(g.animations,undefined);
 assert.equal(v.checks.length,14);assert.ok(v.checks.every(x=>x.pass));
});
