import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{initial,reduce,report,picks}from'../public/equipment/04-12/overlap.mjs';
const d=new URL('../public/equipment/04-12/',import.meta.url),load=k=>JSON.parse(readFileSync(new URL(k,d)));
test('Independent shared areas 100%, 50% and 0%',()=>{
 const s=initial(),m=reduce(s,'next'),u=reduce(m,'next');assert.equal(report(s).sharedAreaFraction,1);assert.equal(report(m).sharedAreaFraction,.5);assert.equal(report(u).sharedAreaFraction,0);assert.deepEqual(report(m),load('example-overlap.json'));
});
test('Only detached normalized diagram can be modified',()=>{
 const s=initial();assert.throws(()=>reduce(s,'operate'),/offline/);assert.throws(()=>reduce(s,'offset',-.1),/Unknown diagram/);assert.equal(report(s).deviceConnection,false);assert.deepEqual(Object.keys(picks),['Offline_gold_square']);
});
test('Original metric estimate and detached pickable GLB',()=>{
 const b=readFileSync(new URL('evg501.glb',d)),v=load('vr.json');assert.equal(b.subarray(0,4).toString(),'glTF');assert.equal(b.length,b.readUInt32LE(8));
 const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.ok(g.nodes.find(x=>x.name==='Offline_gold_square')?.mesh!==undefined);
 assert.deepEqual(v.modelMainUnitM,[.98,1.54,.707]);assert.equal(v.physicalStationActions,false);assert.ok(v.meshes<70&&b.length<1_350_000);
});
