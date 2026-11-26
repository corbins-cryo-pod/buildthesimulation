import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{initial,reduce,report,picks}from'../public/equipment/13-11/geometry-card.mjs';
const d=new URL('../public/equipment/13-11/',import.meta.url),load=k=>JSON.parse(readFileSync(new URL(k,d)));
test('Independent neutral, half and one-and-a-half cube computations',()=>{
 const s=initial(),trip=q=>[q.edgeRatio,q.surfaceAreaRatio,q.volumeRatio];assert.deepEqual(trip(report(s)),[1,1,1]);
 assert.deepEqual(trip(report(reduce(s,'next'))),[1.5,2.25,3.375]);const q=report(reduce(s,'ratio',.5));
 assert.deepEqual(trip(q),[.5,.25,.125]);assert.deepEqual(q,load('example-geometry.json'));
});
test('Only offline ratios and state; no hardware or specimen relationship',()=>{
 const s=initial();assert.throws(()=>reduce(s,'ratio',0),/fixed diagram/);assert.throws(()=>reduce(s,'operate'),/Unknown offline/);
 assert.deepEqual(Object.keys(picks),['Offline_comparison_cube']);assert.equal(report(s).deviceConnection,false);
});
test('GLB matches OEM outline and records detached hit region',()=>{
 const b=readFileSync(new URL('cpd300.glb',d)),v=load('vr.json');assert.equal(b.subarray(0,4).toString(),'glTF');assert.equal(b.length,b.readUInt32LE(8));
 const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.ok(g.nodes.find(x=>x.name==='Offline_comparison_cube')?.mesh!==undefined);assert.ok(v.diagramDisconnected&&!v.instrumentControls);
 for(const [i,n] of [.34,.3325,.5835].entries())assert.ok(Math.abs(v.modelMainUnitM[i]-n)<.001);assert.ok(b.length<750_000);
});
