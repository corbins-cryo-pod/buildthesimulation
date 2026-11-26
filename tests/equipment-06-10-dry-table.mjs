import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{initial,reduce,report,picks}from'../public/equipment/06-10/plan-view.mjs';
const d=new URL('../public/equipment/06-10/',import.meta.url),load=k=>JSON.parse(readFileSync(new URL(k,d)));
test('Independent fit, near-diagonal overhang and right-angle limit',()=>{
 const s=initial(),a=report(s),dm=reduce(s,'next'),b=report(dm),c=report(reduce(dm,'next'));
 assert.deepEqual(a.bounds,[120,50]);assert.deepEqual(a.totalMargin,[8,60]);assert.equal(a.fits,true);
 assert.deepEqual(b.bounds,[126,112]);assert.deepEqual(b.totalMargin,[2,-2]);assert.equal(b.fits,false);assert.deepEqual(b,load('example-footprint.json'));assert.ok(Math.abs(b.degrees-36.869897645844)<1e-10);
 assert.deepEqual(c.bounds,[50,120]);assert.deepEqual(c.totalMargin,[78,-10]);assert.equal(c.fits,false);
});
test('Detached plan diagram rejects unlisted pose and any operation',()=>{
 const s=initial();assert.throws(()=>reduce(s,'pose','unknown'),/Unknown authored/);assert.throws(()=>reduce(s,'operate'),/Unknown offline/);assert.equal(report(s).deviceConnection,false);assert.deepEqual(Object.keys(picks),['Offline_footprint_token']);
});
test('Genuine GLB retains authored nominal envelope and only detached ray target',()=>{
 const b=readFileSync(new URL('dry-table.glb',d)),v=load('vr.json');assert.equal(b.subarray(0,4).toString(),'glTF');assert.equal(b.length,b.readUInt32LE(8));
 const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.ok(g.nodes.find(x=>x.name==='Offline_footprint_token')?.mesh!==undefined);
 assert.deepEqual(v.modelFurnitureM,[1.524,.9144,.762]);assert.equal(v.instrumentActions,0);assert.ok(v.fixtureCoordinatesSeparate&&v.meshes<50&&b.length<500_000);
});
