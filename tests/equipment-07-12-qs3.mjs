import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{initial,reduce,report,points,picks}from'../public/equipment/07-12/geometry-card.mjs';
const d=new URL('../public/equipment/07-12/',import.meta.url),load=k=>JSON.parse(readFileSync(new URL(k,d)));
test('Independent 6–8–10 triangle and zero-area collinear boundary',()=>{
 const s=initial(),a=report(s),b=report(reduce(s,'next'));assert.deepEqual(a.edgeLengths,[8,10,6]);assert.equal(a.area,24);assert.equal(a.hasEnclosedArea,true);assert.deepEqual(a,load('example-geometry.json'));
 assert.deepEqual(b.edgeLengths,[5,3,8]);assert.equal(b.area,0);assert.equal(b.hasEnclosedArea,false);
});
test('Only fixed immutable diagrams and no device action',()=>{
 const s=initial();assert.ok(Object.isFrozen(points(s))&&Object.isFrozen(points(s)[2]));assert.throws(()=>reduce(s,'operate'),/offline/);assert.throws(()=>reduce(s,'card','other'),/authored/);assert.equal(report(s).deviceConnection,false);assert.deepEqual(Object.keys(picks),['Offline_geometry_card']);
});
test('Physical GLB and sole detached ray region',()=>{
 const b=readFileSync(new URL('quantstudio3.glb',d)),v=load('vr.json');assert.equal(b.subarray(0,4).toString(),'glTF');assert.equal(b.length,b.readUInt32LE(8));
 const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.ok(g.nodes.find(x=>x.name==='Offline_geometry_card')?.mesh!==undefined);
 assert.ok(g.nodes.some(x=>x.name==='Offline_flat_edge')&&g.nodes.some(x=>x.name==='Offline_annotated_triangle_edge_0'));
 for(const [i,n] of [.27,.4,.5].entries())assert.ok(Math.abs(v.modelCabinetM[i]-n)<.0015);assert.equal(v.deviceActionCount,0);assert.ok(v.detachedDiagramOnly&&b.length<500000);
});
