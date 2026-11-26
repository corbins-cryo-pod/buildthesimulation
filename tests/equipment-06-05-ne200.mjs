import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{initial,reduce,report,picks}from'../public/equipment/06-05/rectangle.mjs';
const d=new URL('../public/equipment/06-05/',import.meta.url),load=k=>JSON.parse(readFileSync(new URL(k,d)));
test('Independent square, intermediate and maximum-width rectangles',()=>{
 const s=initial(),mid=reduce(s,'next'),wide=reduce(mid,'next'),calc=q=>[q.width,q.height,q.area,q.perimeter,q.aspectRatio];
 assert.deepEqual(calc(report(s)),[10,10,100,40,1]);assert.deepEqual(calc(report(mid)),[12.5,8,100,41,1.5625]);assert.deepEqual(calc(report(wide)),[20,5,100,50,4]);assert.equal(reduce(wide,'next').width,10);
 assert.deepEqual(report(reduce(s,'width',20)),load('example-rectangle.json'));
});
test('Detached diagram rejects unlisted shape and equipment action',()=>{
 const s=initial();assert.throws(()=>reduce(s,'width',0),/Unknown authored/);assert.throws(()=>reduce(s,'operate'),/Unknown offline/);assert.equal(report(s).deviceConnection,false);assert.deepEqual(Object.keys(picks),['Offline_gold_rect']);
});
test('GLB verifies catalog exterior envelope and only one detached target',()=>{
 const b=readFileSync(new URL('ne200.glb',d)),v=load('vr.json');assert.equal(b.subarray(0,4).toString(),'glTF');assert.equal(b.length,b.readUInt32LE(8));
 const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.ok(g.nodes.find(x=>x.name==='Offline_gold_rect')?.mesh!==undefined);
 for(const [i,n] of [.770,1.040,.675].entries())assert.ok(Math.abs(v.modelCabinetM[i]-n)<.0005);
 assert.equal(v.actualDeviceActionCount,0);assert.ok(v.cabinetSealed&&v.meshes<65&&b.length<700_000);
});
