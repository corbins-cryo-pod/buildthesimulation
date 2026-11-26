import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createStation,pose,assemblyRecord,targets} from '../public/equipment/08-12/assembly.mjs';
const f=n=>fs.readFileSync(new URL('../public/equipment/08-12/'+n,import.meta.url)),j=n=>JSON.parse(f(n));
test('empty D1 preserves pad-to-net traces but opens both device joints',()=>{
 const s=createStation(),r=assemblyRecord(s.dispatch('remove'));
 assert.equal(r.revision,1);assert.equal(r.parentRevision,0);assert.equal(r.components.length,0);
 assert.deepEqual(r.jointStates.map(x=>[x.padId,x.net,x.state]),[['P1','VPLUS','open'],['P2','RETURN','open']]);
 assert.equal(r.connectivity.edges.length,2);assert.equal(s.read().feedback.code,'footprint-empty');
});
test('reversed pending diode is rejected without creating joined edges or new revision',()=>{
 const s=createStation();s.dispatch('remove');s.dispatch('place');const before=s.hit('Diode_body');assert.equal(pose(before).orientationY,Math.PI);
 const bad=s.dispatch('join'),r=assemblyRecord(bad);assert.equal(bad.error.code,'reversed-polarity');assert.equal(r.revision,1);
 assert.deepEqual(bad.error.issues[0].actual,{A:'RETURN',K:'VPLUS'});assert.equal(r.connectivity.edges.length,2);
});
test('correct replacement preserves both labeled nets and ordered revision lineage',()=>{
 const s=createStation();for(const k of ['remove','place','join'])s.dispatch(k);
 const r=assemblyRecord(s.read());assert.equal(r.check.ok,true);assert.equal(r.components[0].id,'D1-REPLACEMENT');assert.deepEqual(Object.fromEntries(r.jointStates.map(j=>[j.pin,j.net])),{A:'VPLUS',K:'RETURN'});
 assert.deepEqual(r.history.map(x=>x.operation),['remove','join']);assert.equal(r.revision,2);
 assert.deepEqual(r,j('example-assembly.json'));assert.ok(j('output-schema.json').required.every(k=>Object.hasOwn(r,k)));
});
test('metric controller dimensions, manifest and stable target names',()=>{
 const buf=f('dde-bench.glb');assert.equal(buf.readUInt32LE(8),buf.length);
 const g=JSON.parse(buf.toString('utf8',20,20+buf.readUInt32LE(12))),m=j('vr-station.json');
 assert.deepEqual(g.nodes.find(n=>n.name==='DDE_D_envelope').scale,[.148,.12,.232]);
 for(const [n,a] of Object.entries(targets)){assert.ok(g.nodes.some(x=>x.name===n));assert.equal(m.targets.find(x=>x.node===n).action,a);}
 assert.ok(j('verification.json').cases.every(k=>k.pass));
});
