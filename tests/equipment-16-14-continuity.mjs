import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createStation,exportFile,readiness,pose,targets} from '../public/equipment/16-14/continuity.mjs';
const get=p=>fs.readFileSync(new URL('../public/equipment/16-14/'+p,import.meta.url));
test('matching marker only changes readiness of own station and restores stable edge ID',()=>{
 const s=createStation(),flags=()=>readiness(s.read()).map(x=>x.ready);assert.deepEqual(flags(),[false,false]);
 s.hit('Key_A_face');s.hit('Key_B_face');const expected=readiness(s.read());assert.deepEqual(flags(),[true,true]);
 s.hit('Key_A_face');assert.deepEqual(flags(),[false,true]);assert.deepEqual(readiness(s.read())[1],expected[1]);
 s.hit('Key_A_face');assert.deepEqual(readiness(s.read()),expected);assert.equal(s.read().ledgerRevision,4);
 assert.equal(exportFile(s.read()).history.at(-1).edgeId,expected[0].edgeId);
});
test('wrong blind key, no-change seating, and inspection cannot mutate graph ledger',()=>{
 const s=createStation();const a=s.hit('Key_B_face');
 const r=s.dispatch('seat',{branch:'A',token:'square-B'});assert.equal(r.note.code,'key-mismatch');assert.deepEqual(r.labeled,a.labeled);assert.deepEqual(r.history,a.history);
 const b=s.dispatch('seat',{branch:'B',token:'square-B'});assert.equal(b.note.code,'no-change');assert.equal(b.ledgerRevision,1);
 const t=s.hit('Blind_socket_A');assert.equal(t.note.code,'inspection');assert.equal(t.ledgerRevision,1);
 assert.equal(s.dispatch('remove',{branch:'C'}).note.code,'unknown-branch');
});
test('metric model, declared marker travel and ray IDs agree',()=>{
 const b=get('blind-fixture.glb'),m=JSON.parse(get('vr-station.json'));assert.equal(b.length,m.bytes);
 const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.deepEqual(j.nodes.find(n=>n.name==='WallPanel_860').scale,[.86,.41,.028]);
 for(const h of m.hitTargets){assert.ok(j.nodes.some(n=>n.name===h.node));assert.deepEqual(targets[h.node],[h.action,h.actionPayload]);}
 const s=createStation();assert.ok(Math.abs(pose(s.read()).A.tokenZ-pose(s.hit('Key_A_face')).A.tokenZ-.022)<1e-12);
 assert.ok(JSON.parse(get('verification.json')).checks.every(c=>c.pass));
});
