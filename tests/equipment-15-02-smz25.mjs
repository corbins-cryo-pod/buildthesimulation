import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{initial,reduce,report,points,picks}from'../public/equipment/15-02/chart.mjs';
const d=new URL('../public/equipment/15-02/',import.meta.url),load=k=>JSON.parse(readFileSync(new URL(k,d)));
test('Known 1 mm fiducials at two logical display scales and coincident edge',()=>{
 const s=initial(),a=report(s),t=reduce(s,'toggle'),b=report(t),c=report(reduce(t,'span','zero'));assert.deepEqual([a.chartSpanPx,a.legendPxPerMm,a.chartDistanceMm],[20,20,1]);assert.deepEqual([b.chartSpanPx,b.legendPxPerMm,b.chartDistanceMm],[40,40,1]);assert.deepEqual([c.chartSpanPx,c.chartDistanceMm],[0,0]);assert.deepEqual(b,load('example-chart.json'));
});
test('Fixed drawing, invalid actions and no hardware association',()=>{
 const s=initial();assert.ok(Object.isFrozen(points(s)));assert.equal(points(s),points(reduce(s,'toggle')));assert.throws(()=>reduce(s,'zoom',0),/offline/);assert.throws(()=>reduce(s,'focus'),/offline/);
 assert.deepEqual(Object.keys(picks),['Offline_zoom_tile']);assert.equal(report(s).deviceConnection,false);
});
test('Decoded GLB, primary dimensions, nominal ocular projection and detached ray',()=>{
 const b=readFileSync(new URL('smz25.glb',d)),v=load('vr.json');assert.equal(b.subarray(0,4).toString(),'glTF');assert.equal(b.length,b.readUInt32LE(8));
 const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.ok(g.nodes.find(x=>x.name==='Offline_zoom_tile')?.mesh!==undefined);
 for(const [i,n] of [.298,.568,.514].entries())assert.ok(Math.abs(v.modelPrimaryEnvelopeM[i]-n)<.001);
 assert.ok(Math.abs(v.sizeM[2]-.539)<.001);assert.equal(v.instrumentActions,0);assert.ok(v.offlineChartIndependent&&b.length<500000);
});
