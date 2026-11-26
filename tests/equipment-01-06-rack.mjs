import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {archive,restore,runFixture,sha,initial,dispatch,geometry,mounted,budget,loadFor,placement} from '../public/equipment/01-06/solver.mjs';
const p=new URL('../public/equipment/01-06/',import.meta.url),asset=n=>new URL(n,p),json=n=>JSON.parse(readFileSync(asset(n),'utf8'));
const rows=[];
function compare(id,expected,actual,unit='',tol=0) {
 const pass=typeof expected==='number'&&typeof actual==='number'?Math.abs(expected-actual)<=tol:expected===actual;
 rows.push({id,expected,actual,unit,tol:typeof expected==='number'?tol:'Exact',pass});
 assert.ok(pass,id);
}
test('independent digest vector and known byte counts',async()=>{
 compare('SHA-256 of abc (known vector)','ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',await sha('abc'));
 const a=await archive();
 compare('Mask UTF-8 size',94,a.objects[0].bytes,'bytes');
 compare('Trace UTF-8 size',32,a.objects[1].bytes,'bytes');
 for(const q of a.objects)assert.equal(q.sha256,createHash('sha256').update(q.text,'utf8').digest('hex'));
 assert.deepEqual(a,json('example-archive.json'));assert.deepEqual(runFixture,json('example-run.json'));
});
test('clean restore preserves source identities and parent links',async()=>{
 const a=await archive(),r=await restore(a);
 compare('Clean example restore','2 objects accepted',r.ok?r.checks.filter(q=>q.ok).length+' objects accepted':'Rejected');
 assert.equal(r.event.restoredRevision,runFixture.revision);assert.equal(r.event.sampleId,runFixture.sampleId);assert.equal(r.checks[1].parentId,r.checks[0].id);
});
test('same-size trace edit fails without changing mask',async()=>{
 let s=(await dispatch(initial(),'archive')).state;
 s=(await dispatch(s,'damage')).state;
 const r=await dispatch(s,'restore');
 compare('Modified trace','Trace only rejected',r.state.result.checks[0].ok&&!r.state.result.checks[1].ok&&!r.state.result.event?'Trace only rejected':'Unexpected');
 assert.equal(r.state.result.checks[1].bytes,s.pack.objects[1].bytes);
});
test('broken lineage or byte count does not restore',async()=>{
 const a=await archive();a.objects[1].parentId='unknown';compare('Broken parent chain','Rejected',(await restore(a)).ok?'Accepted':'Rejected');
 a.objects[1].parentId=a.objects[0].id;a.objects[0].bytes=0;assert.equal((await restore(a)).ok,false);
});
test('local unmodified archive import and new input round-trip',async()=>{
 for(const type of ['example-archive.json','example-run.json']){
  const r=await dispatch(initial(),'import',json(type));assert.equal(r.ok,true);assert.deepEqual(r.state.pack,json('example-archive.json'));
 }
});
test('1U placement, nominal pitch, crossed boundary and occupancy',()=>{
 compare('U9 center elevation',432.825,placement(9,1,390).centerYmm,'mm',1e-8);
 compare('Nominal rail unit pitch',44.45,geometry.pitchMm,'mm',1e-9);
 compare('Occupied U8','Rejected',placement(8,1,390).ok?'Accepted':'Rejected');
 assert.equal(placement(12,2,390).ok,false);assert.equal(placement(2,1,501).ok,false);assert.equal(placement(9.1,1,390).ok,false);
});
test('rated load arithmetic and independent boundary of each rating',()=>{
 const q=budget(mounted);compare('Default real load',288,q.realW,'W',1e-9);compare('Default apparent load',360,q.apparentVA,'VA',1e-9);compare('Default estimated current',3,q.estimatedA,'A',1e-9);
 assert.equal(budget([{w:1000,pf:1}]).within,true);assert.equal(budget([{w:1000.01,pf:1}]).within,false);assert.equal(budget([{w:720,pf:.5}]).within,true);assert.equal(budget([{w:720.01,pf:.5}]).within,false);
 assert.throws(()=>budget([{w:10,pf:0}]));
});
test('120 W sled accepts archive, 900 W sled blocks due to both ceilings',async()=>{
 let r=await dispatch(initial(),'mount',{u:9,w:120});assert.equal(r.ok,false);
 const s=(await dispatch(initial(),'door')).state;
 const a=(await dispatch(s,'mount',{u:9,w:120})).state;assert.equal((await dispatch(a,'archive')).ok,true);assert.equal(loadFor(a).realW,408);
 const b=(await dispatch(a,'mount',{u:9,w:900})).state;
 compare('900 W sled aggregate watts',1188,loadFor(b).realW,'W',1e-9);
 compare('900 W sled aggregate apparent load',1485,loadFor(b).apparentVA,'VA',1e-9);
 compare('Overload interlock','Blocked',(await dispatch(b,'archive')).ok?'Allowed':'Blocked');
 assert.equal((await dispatch((await dispatch(initial(),'power')).state,'archive')).ok,false);
});
test('tray/door state prevents removal, close and archive while extended',async()=>{
 const a=(await dispatch(initial(),'door')).state,b=(await dispatch(a,'pull')).state;
 for(const k of ['door','remove','archive'])assert.equal((await dispatch(b,k)).ok,false);
 assert.equal((await dispatch((await dispatch(b,'pull')).state,'archive')).ok,true);
});
test('GLB parse, independent physical widths, metric target positions and conservative budget',async()=>{
 const b=readFileSync(asset('rack.glb')),m=json('interaction.json'),stats=json('asset-metrics.json');
 assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);
 const gltf=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const scene=gltf.scene,seen=new Map();scene.traverse(n=>seen.set(n.name,(seen.get(n.name)??0)+1));
 const get=k=>scene.getObjectByName(k);
 for(const n of [m.frame.placementAnchor,...Object.values(m.parts),...m.ports,...m.actions.map(a=>a.node)])assert.equal(seen.get(n),1,n);
 for(const a of m.actions){assert.equal(a.sizeM.length,3);assert.ok(a.sizeM.every(v=>Number.isFinite(v)&&v>.02&&v<.15));}
 assert.deepEqual(get('bts_bench_anchor').getWorldPosition(new T.Vector3()).toArray(),[0,0,0]);
 const size=new T.Box3().setFromObject(scene).getSize(new T.Vector3());compare('Cabinet closed model width',600,Math.round(size.x*1000),'mm',1);compare('Cabinet closed model height',650,Math.round(size.y*1000),'mm',1);compare('Rack target U9 in GLB',432.825,get('mount_target').getWorldPosition(new T.Vector3()).y*1000,'mm',.01);
 assert.ok(size.z>.599&&size.z<.632);compare('GLB action bindings',4,m.actions.length,'actions');
 const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));let triangles=0,primitives=0;
 for(const mesh of j.meshes)for(const p of mesh.primitives){triangles+=j.accessors[p.indices].count/3;primitives++;}
 assert.deepEqual(stats,{triangles,primitives,nodes:j.nodes.length,bytes:b.length});assert.ok(b.length<2e6&&primitives<=40&&triangles<5e4);
});
test('published verification matches computed test values',()=>{
 const scope='Analytic dimensions, exact UTF-8 byte hashing, AC budget and software state checks. No measured cabinet, AC, endurance, runtime or headset validation.';
 if(process.env.BTS_UPDATE_01_06==='1')writeFileSync(asset('verification.json'),JSON.stringify({scope,rows},null,2)+'\n');
 else assert.deepEqual(json('verification.json'),{scope,rows});
});
