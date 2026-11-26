import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {action,defaults,fit,initial} from '../public/equipment/03-12/solver.mjs';
const dir=new URL('../public/equipment/03-12/',import.meta.url),get=k=>readFileSync(new URL(k,dir)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,dir),JSON.stringify(v,null,2)+'\n');
const native=fit(defaults),turned=fit({...defaults,yawDeg:90}),raw=get('pdc32g2-static.glb'),g=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12))),n=k=>g.nodes.find(q=>q.name===k),box=k=>{
 const a=g.meshes[n(k).mesh].primitives.map(q=>g.accessors[q.attributes.POSITION]);
 return [0,1,2].map(i=>Math.max(...a.map(x=>x.max[i]))-Math.min(...a.map(x=>x.min[i])));
};
const v=box('nominal_housing'),ext=[v[0],n('nominal_housing').translation[1]+v[1]/2,v[2]];
const reject=f=>{try{f();return false}catch{return true}};
const actual={
 'centered-x-side':native.marginsMm.leftMm,'centered-y-side':native.marginsMm.backMm,
 'quarter-turn-width':turned.projectionMm.width,'quarter-turn-depth':turned.projectionMm.depth,'quarter-turn-y-interference':turned.marginsMm.frontMm,
 'rotated-45-projection':fit({...defaults,yawDeg:45}).projectionMm.width,
 'touch-reserve':fit({...defaults,xMm:13}).status,'offset-interference':fit({...defaults,xMm:15}).status,
 'invalid-negative-gauge-rejected':reject(()=>fit({...defaults,gaugeW:-1})),'exterior-width':ext[0],'exterior-height':ext[1],'exterior-depth':ext[2]};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):actual[c.id]===c.expected)?'PASS':'FAIL'}));
const metrics={bytes:raw.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0),nominalHousingXyzM:ext};
const proof={schema:'bts.enclosure-footprint.verification.v1',metrics,cases,scope:'Nominal shell dimensions and synthetic external rectangular gauge only. No real equipment installation, treatment, or process state.'};
if(process.argv.includes('--write-proof')){
 put('verification.json',proof);put('example-report.json',native);
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'03-12',asset:'/equipment/03-12/pdc32g2-static.glb',unit:'glTF meter, +Y up and +Z toward operator',metrics,scope:'External teaching markers only, no operational controls or headset verification',nodes:[
  {node:'grid_overlay_target',label:'Toggle synthetic footprint frame',action:{type:'grid'},boundsM:[.045,.006,.029]},
  {node:'turn_overlay_target',label:'Turn virtual shell visualization 0° to 90°',action:{type:'quarterTurn'},boundsM:[.045,.006,.029]}
 ]});
}
test('Predeclared metric footprint and independent special-angle cases',()=>{
 assert.deepEqual(read('verification.json'),proof);for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));
 assert.deepEqual(native,read('example-report.json'));assert.ok(n('grid_overlay_target')&&n('turn_overlay_target')&&n('fixed_view_window')&&n('rear_fan_frame'));
 // General-angle oracle: direct transformation of all four corners.
 const d=37,theta=d*Math.PI/180,[a,b]=[127,101.6],corners=[];
 for(const x of [-a,a])for(const y of [-b,b])corners.push([x*Math.cos(theta)-y*Math.sin(theta),x*Math.sin(theta)+y*Math.cos(theta)]);
 for(const [i,key] of ['width','depth'].entries())assert.ok(Math.abs(fit({...defaults,yawDeg:d}).projectionMm[key]-(Math.max(...corners.map(p=>p[i]))-Math.min(...corners.map(p=>p[i]))))<1e-10);
});
test('Shared view-only actions, revisions, and explicit unsupported operations',()=>{
 let s=action(initial(),{type:'inspect'});s=action(s,{type:'grid'});assert.equal(s.grid,false);
 s=action(s,{type:'quarterTurn'});assert.equal(s.p.yawDeg,90);assert.equal(s.result,null);
 s=action(s,{type:'inspect'});assert.equal(s.result.status,'interference-in-gauge');assert.equal(s.result.parentRevision,1);
 assert.throws(()=>action(s,{type:'activate'}),/exterior/);assert.throws(()=>fit({...defaults,xMm:76}),/xMm/);
});
