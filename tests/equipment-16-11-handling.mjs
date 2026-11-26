import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createStation,exportFile,poses,targets} from '../public/equipment/16-11/handling.mjs';
const data=n=>fs.readFileSync(new URL('../public/equipment/16-11/'+n,import.meta.url));
test('fit, reject undersized, and retain exact unique ID and notch datum',()=>{
 const s=createStation(),a=s.hit('Slot_A02_handle'),b=s.hit('Carrier_75_tab');
 assert.equal(a.wafers[0].siteId,'cassette-100-A02');assert.deepEqual(a.transfers.map(t=>t.waferId),['W100-01']);
 assert.equal(b.attempt.code,'size-mismatch');assert.equal(b.attempt.diameterDeficitMm,25);
 assert.deepEqual(a.wafers,b.wafers);assert.deepEqual(a.transfers,b.transfers);assert.equal(b.ledgerRevision,1);
 const o=exportFile(b);assert.deepEqual(o.wafers.map(w=>w.id),['W100-01','W150-01']);
 assert.equal(o.wafers[0].orientationDeg,30);assert.equal(o.wafers[0].face,'top');
 assert.equal(o.slots.find(r=>r.slotId==='cassette-100-A02').occupant,'W100-01');
});
test('tool occupancy, empty origin and same slot do not increment revision',()=>{
 const s=createStation();s.hit('Wand_click');s.dispatch('select','W150-01');
 const w=s.hit('Wand_click');assert.equal(w.attempt.code,'occupied');assert.equal(w.attempt.occupant,'W100-01');assert.equal(w.ledgerRevision,1);
 const e=s.dispatch('transferFrom',{source:'cassette-100-A03',target:'staging-100'});assert.equal(e.attempt.code,'empty-source');assert.equal(e.ledgerRevision,1);
 const t=s.hit('Slot_B01_handle');assert.equal(t.attempt.code,'same-position');assert.equal(t.ledgerRevision,1);
 const u=s.hit('Slot_B02_handle');assert.equal(u.wafers[1].siteId,'cassette-150-B02');assert.equal(u.ledgerRevision,2);
 assert.equal(s.dispatch('reset').ledgerRevision,0);
});
test('all named GLB hits resolve and slot model datum matches virtual transform',()=>{
 const b=data('handling-station.glb');assert.equal(b.subarray(0,4).toString(),'glTF');const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
 const m=JSON.parse(data('vr-station.json'));assert.equal(m.bytes,b.length);
 for(const h of m.hitTargets){assert.ok(g.nodes.some(n=>n.name===h.node));assert.equal(targets[h.node][0],h.action);assert.ok(h.boundsM.min.every((x,i)=>x<h.boundsM.max[i]));}
 const s=createStation();const d=poses(s.hit('Slot_A02_handle'))[0];assert.deepEqual(d.positionM,g.nodes.find(n=>n.name==='Slot_A02_datum').translation);assert.equal(d.rotationRad,Math.PI/6);
 assert.ok(JSON.parse(data('verification.json')).checks.every(x=>x.pass));
});
