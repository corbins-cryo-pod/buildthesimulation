import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{initial,reduce,report,reference,picks}from'../public/equipment/13-05/lattice.mjs';
const d=new URL('../public/equipment/13-05/',import.meta.url),load=k=>JSON.parse(readFileSync(new URL(k,d)));
test('Known pitches from independent declared spans; exact unit conversions',()=>{
 const s=initial(),r=report(s),u=report(reduce(s,'compare'));
 assert.equal(r.spanPx,92);assert.equal(u.spanPx,164);
 for(const [x,nm,ang] of [[r,.23,2.3],[u,.41,4.1]]){
  assert.ok(Math.abs(x.pitchNm-nm)<1e-12);assert.ok(Math.abs(x.pitchAngstrom-ang)<1e-11);assert.equal(x.intervals,4);
 }
 assert.deepEqual(r,load('example-lattice.json'));
});
test('Unknown actions fail; the authored immutable arrays never become measurements',()=>{
 const s=initial(),p=reference(s);assert.ok(Object.isFrozen(p.centersPx));assert.throws(()=>reduce(s,'plate','unknown'),/Unknown fixed/);
 assert.throws(()=>reduce(s,'beam'),/Unknown offline/);assert.equal(report(s).deviceConnection,false);
 assert.equal(reduce(reduce(s,'compare'),'compare').plate,'fine');assert.deepEqual(Object.keys(picks),['Offline_lattice_panel']);
});
test('Physical GLB is metric and matches published main-unit envelope',()=>{
 const b=readFileSync(new URL('jem1400plus.glb',d)),v=load('vr.json');assert.equal(b.subarray(0,4).toString(),'glTF');
 const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.equal(b.length,b.readUInt32LE(8));assert.ok(g.nodes.find(x=>x.name==='Offline_lattice_panel')?.mesh!==undefined);
 for(const [i,n] of [2.16,2.49,1.76].entries())assert.ok(Math.abs(v.modelMainUnitM[i]-n)<.0005);
 assert.ok(!v.instrumentControls&&v.dataPanelIndependent&&b.length<750_000);
});
