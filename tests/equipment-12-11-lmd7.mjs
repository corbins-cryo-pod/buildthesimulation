import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import {initial,reduce,measure,aggregate} from '../public/equipment/12-11/area-board.mjs';
const d=new URL('../public/equipment/12-11/',import.meta.url),load=k=>JSON.parse(readFileSync(new URL(k,d)));
const polygon=v=>v.reduce((s,k)=>reduce(s,'add',k),initial());
test('Independent rectangle and triangle exact areas, both orientations',()=>{
 const s=reduce(initial(),'example');assert.deepEqual(measure(s),{areaGridUnits2:1000,vertexCount:4});assert.deepEqual(aggregate(s),load('example-area.json'));
 const v=[[2,2],[12,2],[2,12]];for(const q of [v,[...v].reverse()])assert.equal(measure(reduce(polygon(q),'close')).areaGridUnits2,50);
});
test('Crossings, invalid coordinates and device actions rejected without mutation',()=>{
 const s=polygon([[2,2],[12,12],[12,2],[2,12]]),p=JSON.stringify(s);
 assert.throws(()=>reduce(s,'close'),/crosses/);assert.throws(()=>reduce(s,'add',[101,5]),/outside/);assert.throws(()=>reduce(s,'cut'),/Unknown offline/);assert.equal(JSON.stringify(s),p);assert.equal(measure(s),null);
 const j=aggregate(reduce(initial(),'example'));assert.equal(j.deviceConnection,false);assert.equal(j.containsCoordinateData,false);assert.ok(!JSON.stringify(j).includes('vertices'));
});
test('GLB scanning-stage envelope and only one disconnected board ray action',()=>{
 const b=readFileSync(new URL('lmd7.glb',d)),v=load('vr.json');assert.equal(b.subarray(0,4).toString(),'glTF');assert.equal(b.length,b.readUInt32LE(8));assert.ok(b.length<900_000);
 const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.ok(g.nodes.find(x=>x.name==='Synthetic_grid_panel')?.mesh!==undefined);
 assert.deepEqual(Object.keys(v.interaction),['Synthetic_grid_panel']);assert.ok(!v.activeDeviceControls&&!v.gridCalibrationToScene);
 for(const [i,m] of [.512,.6496,.5965].entries())assert.ok(Math.abs(v.modeledStandM[i]-m)<.0005);
});
