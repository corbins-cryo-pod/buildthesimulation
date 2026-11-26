import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {initial,reduce,report,picks} from '../public/equipment/04-06/footprint.mjs';
const d=new URL('../public/equipment/04-06/',import.meta.url),load=k=>JSON.parse(readFileSync(new URL(k,d)));
test('Independent footprint fit, orientation and total margin',()=>{
 const s=initial(),q=report(s),v=report(reduce(s,'turn'));
 assert.deepEqual(q.totalClearanceMm,[55,-35]);assert.equal(q.fits,false);assert.deepEqual(v.totalClearanceMm,[15,5]);assert.equal(v.fits,true);assert.equal(v.deviceConnection,false);assert.deepEqual(v,load('example-footprint.json'));
 assert.equal(reduce(reduce(s,'turn'),'turn').orientationDeg,0);
});
test('Unsupported actions fail and only the detached tile is named as an action',()=>{
 assert.throws(()=>reduce(initial(),'process'),/offline/);assert.throws(()=>report({orientationDeg:45}),/Unknown fixed/);assert.deepEqual(Object.keys(picks),['Footprint_gold_token']);
});
test('GLB matches authored envelope, not an installation specification',()=>{
 const b=readFileSync(new URL('wet-bench.glb',d)),v=load('vr.json');assert.equal(b.subarray(0,4).toString(),'glTF');assert.equal(b.length,b.readUInt32LE(8));
 const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.ok(g.nodes.find(x=>x.name==='Footprint_gold_token')?.mesh!==undefined);
 for(const [i,n] of [1.8288,1.68,.88].entries())assert.ok(Math.abs(v.modelMainUnitM[i]-n)<.002);
 assert.equal(v.controlsEnabled,false);assert.ok(b.length<1_000_000);
});
