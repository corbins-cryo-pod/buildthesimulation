import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{initial,reduce,report,picks}from'../public/equipment/11-03/readout.mjs';
const d=new URL('../public/equipment/11-03/',import.meta.url),load=k=>JSON.parse(readFileSync(new URL(k,d)));
test('Independent diagonal, negative-axis and origin geometry cases',()=>{
 const s=initial(),n=reduce(s,'next'),z=reduce(n,'next'),v=q=>{const r=report(q);return[r.column,r.row,r.straightDistance,r.axisDistance]};
 assert.deepEqual(v(s),[4,3,5,7]);assert.deepEqual(v(n),[-3,0,3,3]);assert.deepEqual(v(z),[0,0,0,0]);assert.deepEqual(report(s),load('example-readout.json'));
});
test('Only fixed off-instrument marks and no event contract',()=>{
 const s=initial();assert.throws(()=>reduce(s,'mark','unknown'),/Unknown fixed/);assert.throws(()=>reduce(s,'trigger'),/offline/);assert.equal(report(s).deviceConnection,false);assert.deepEqual(Object.keys(picks),['Offline_locator_marker']);
});
test('Compact dimensional GLB with all four capped circles and only detached ray',()=>{
 const b=readFileSync(new URL('otpg4.glb',d)),v=load('vr.json');assert.equal(b.subarray(0,4).toString(),'glTF');assert.equal(b.length,b.readUInt32LE(8));
 const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.ok(g.nodes.find(x=>x.name==='Offline_locator_marker')?.mesh!==undefined);
 assert.equal(g.nodes.filter(x=>x.name.startsWith('Doric_solid_blind_cap_')).length,4);for(const [i,n] of [.135,.021,.058].entries())assert.ok(Math.abs(v.modelCabinetM[i]-n)<.0005);
 assert.equal(v.actualDeviceActions,0);assert.ok(v.independentReadout&&b.length<500_000);
});
