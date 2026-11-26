import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createStation,check,poses,exportFile,targets} from '../public/equipment/03-09/fit.mjs';
const get=n=>fs.readFileSync(new URL('../public/equipment/03-09/'+n,import.meta.url));
test('each of three known radial benchmark cases',()=>{
 assert.ok(Math.abs(check('small').radialGapMm-1.5660188679)<1e-8);assert.equal(check('small').outcome,'clear');
 assert.equal(check('touch').radialGapMm,0);assert.equal(check('touch').outcome,'touch');
 assert.ok(Math.abs(check('large').radialGapMm+.6619037897)<1e-8);assert.equal(check('large').outcome,'blocked');
 assert.throws(()=>check('actual'),/Unknown/);
});
test('only positive-clearance block reaches internal marker and export preserves IDs',()=>{
 const s=createStation();const a=s.hit('Blind_gauge_rim');assert.equal(poses(a)[0].positionM[2],.088);assert.equal(a.revision,1);
 assert.equal(exportFile(a).result.carrierId,'demo-small-16x10');
 s.hit('Carrier_large');const b=s.hit('Blind_gauge_rim');assert.equal(poses(b)[2].positionM[2],.114);assert.equal(b.revision,2);
 assert.equal(s.hit('Cover_front_plate').result.outcome,'blocked');assert.equal(s.read().cutaway,true);
 assert.equal(exportFile(s.read()).gauge.id,'bts-blind-22');assert.equal(s.dispatch('reset').revision,0);
});
test('manufacturer envelope and declared picking IDs match GLB',()=>{
 const gb=get('mini-mite-display.glb'),m=JSON.parse(get('vr-station.json')),j=JSON.parse(gb.subarray(20,20+gb.readUInt32LE(12)));assert.equal(gb.length,m.bytes);
 assert.deepEqual(j.extras.furnaceEnvelopeMm,[406.4,381,279.4]);
 for(const h of m.hitTargets){assert.ok(j.nodes.some(n=>n.name===h.node));assert.deepEqual(targets[h.node].filter(Boolean),[h.action,h.actionPayload].filter(Boolean));}
 assert.ok(JSON.parse(get('verification.json')).checks.every(c=>c.pass));
});
