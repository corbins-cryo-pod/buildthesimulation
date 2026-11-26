import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{initial,reduce,report,markers,fixedRaster,picks,width,height}from'../public/equipment/11-08/graphic.mjs';
const d=new URL('../public/equipment/11-08/',import.meta.url),load=k=>JSON.parse(readFileSync(new URL(k,d)));
test('Independent pixel and graphic spans, including zero-distance boundary',()=>{
 const s=initial(),a=report(s),r=reduce(s,'next'),b=report(r),c=report(reduce(r,'next'));assert.deepEqual([a.distancePx,a.distanceGraphicUnits],[10,20]);assert.deepEqual([b.distancePx,b.distanceGraphicUnits],[11,22]);assert.deepEqual([c.distancePx,c.distanceGraphicUnits],[0,0]);assert.deepEqual(a,load('example-graphic.json'));
});
test('Raster and authored markers are immutable; no external image enters',()=>{
 const a=[...fixedRaster],s=initial();assert.equal(a.length,width*height);assert.ok(Object.isFrozen(fixedRaster)&&Object.isFrozen(markers(s)[0]));
 const t=reduce(reduce(s,'next'),'next');assert.deepEqual(a,[...fixedRaster]);assert.throws(()=>reduce(t,'capture'),/offline/);assert.throws(()=>reduce(t,'span','unknown'),/fixed/);assert.equal(report(t).deviceConnection,false);
});
test('Documented passive cabinet plus one detached ray action',()=>{
 const b=readFileSync(new URL('orca-v3.glb',d)),v=load('vr.json');assert.equal(b.subarray(0,4).toString(),'glTF');assert.equal(b.length,b.readUInt32LE(8));assert.deepEqual(Object.keys(picks),['Offline_scale_legend']);
 const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.ok(g.nodes.find(x=>x.name==='Offline_scale_legend')?.mesh!==undefined);assert.ok(g.nodes.some(x=>x.name==='ORCA_opaque_mount_blank'));
 for(const [i,n] of [.085,.0935,.125].entries())assert.ok(Math.abs(v.modelPrimaryBodyM[i]-n)<.001);assert.equal(v.hardwareActions,0);assert.ok(v.dataIndependent&&b.length<950000);
});
