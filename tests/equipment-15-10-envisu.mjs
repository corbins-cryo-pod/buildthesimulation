import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{initial,reduce,report,columns,picks}from'../public/equipment/15-10/art.mjs';
const d=new URL('../public/equipment/15-10/',import.meta.url),load=k=>JSON.parse(readFileSync(new URL(k,d)));
test('Known 5 × 4 graphic spacing; missing mark is null instead of zero',()=>{
 const s=initial(),a=report(s),m=reduce(s,'next'),b=report(m),c=report(reduce(m,'next'));
 assert.deepEqual([a.column,a.status,a.rowSteps,a.separationGraphicUnits],['A','two-marks',5,20]);assert.deepEqual(a,load('example-art.json'));
 assert.deepEqual([b.column,b.status,b.rowSteps,b.separationGraphicUnits],['D','missing-mark',null,null]);assert.deepEqual([c.column,c.separationGraphicUnits],['F',20]);
});
test('Frozen independent graphic and no acquisition action',()=>{
 const s=initial();assert.ok(Object.isFrozen(columns)&&Object.isFrozen(columns[3]));assert.throws(()=>reduce(s,'column',-1),/fixed/);assert.throws(()=>reduce(s,'capture'),/offline/);
 assert.equal(report(s).deviceConnection,false);assert.deepEqual(Object.keys(picks),['Offline_column_tab']);
});
test('Genuine metric GLB verifies cart, sealed shell and independent board bounds',()=>{
 const b=readFileSync(new URL('envisu-c2300.glb',d)),v=load('vr.json');assert.equal(b.subarray(0,4).toString(),'glTF');assert.equal(b.length,b.readUInt32LE(8));
 const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.ok(g.nodes.find(x=>x.name==='Offline_column_tab')?.mesh!==undefined);assert.ok(g.nodes.some(x=>x.name==='Head_blank_end'));
 for(const [k,ns] of [['modelCartM',[.787,1.549,.559]],['modelHeadM',[.08,.17,.23]]])for(const [i,n] of ns.entries())assert.ok(Math.abs(v[k][i]-n)<.002);
 assert.equal(v.actualDeviceActions,0);assert.ok(v.imageIndependent&&b.length<750000);
});
