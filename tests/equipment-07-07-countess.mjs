import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import {initial,reduce,count,report,picks,width,height} from '../public/equipment/07-07/count-board.mjs';
const d=new URL('../public/equipment/07-07/',import.meta.url),load=k=>JSON.parse(readFileSync(new URL(k,d)));
test('Separated four authored boxes and touching edge preserve pixel sum but not groups',()=>{
 const s=initial(),a=report(s),t=reduce(s,'next'),b=report(t);
 assert.deepEqual(a.groupPixels,[25,25,25,25]);assert.equal(a.foregroundPixels,100);assert.equal(a.connectedGroups,4);
 assert.deepEqual(b.groupPixels,[50,25,25]);assert.equal(b.foregroundPixels,100);assert.equal(b.connectedGroups,3);
 assert.equal(count(t).image.length,width*height);assert.equal(b.authoredSquares,4);assert.deepEqual(b,load('example-count.json'));
});
test('No imported image or device operation: reject unlisted actions',()=>{
 const s=initial();assert.throws(()=>reduce(s,'card','unknown'),/authored/);assert.throws(()=>reduce(s,'operate'),/offline/);assert.equal(report(s).deviceConnection,false);assert.deepEqual(Object.keys(picks),['Offline_count_plate']);
});
test('Metric GLB bounds and only detached picker',()=>{
 const b=readFileSync(new URL('countess-3-fl.glb',d)),v=load('vr.json');assert.equal(b.subarray(0,4).toString(),'glTF');assert.equal(b.length,b.readUInt32LE(8));
 const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.ok(g.nodes.find(x=>x.name==='Offline_count_plate')?.mesh!==undefined);assert.equal(v.deviceActions,0);
 for(const [i,n] of [.24384,.23876,.17018].entries())assert.ok(Math.abs(v.modelCabinetM[i]-n)<.0015);assert.ok(b.length<400000&&v.offlineCardOnly);
});
