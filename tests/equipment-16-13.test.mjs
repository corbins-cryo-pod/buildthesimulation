import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,initial,SINK,cablePoints} from '../public/equipment/16-13/solver.mjs';
import {jsonSource,importSettings,acquire} from '../public/equipment/09-04/solver.mjs';
import {build} from '../public/equipment/16-13/mesh-writer.mjs';
import {assets,anchors} from '../public/equipment/16-13/geometry-source.mjs';
test('BNC link and pulse retain the receiving channel and hand off to the scope',()=>{
 const state=act(act(initial(),'mate'),'pulse'),w=state.waveform;assert.equal(w.channels[0].id,SINK);assert.equal(w.channels[0].samples.filter(x=>x===1.25).length,10);assert.equal(w.dtS,.0001);
 const src=jsonSource(w),r=acquire(importSettings(src),src);assert.equal(r.contactId,SINK);assert.equal(r.measurements.clipCount,0);assert.equal(r.inputKind,'simulated');
});
test('SMA→BNC and unmated results have no route; geometry warning is separate',()=>{const x=act(act(initial(),'plug','SMA'),'mate');assert.equal(x.connection,null);assert.match(x.error,/No adapter/);
 const valid=act(act(initial(),'set',{radiusMm:12}),'mate');assert.equal(valid.connection.bend.warning,true);const o=act(act(valid,'unmate'),'pulse');assert.equal(o.waveform,null);assert.match(o.error,/Mate/);
 assert.ok(Math.abs(cablePoints(30,false).at(-1)[2]-cablePoints(30,true).at(-1)[2]-.018)<1e-12);
});
// Trig in the cable curve can differ by ULPs across JavaScript platforms.
const decoded=buffer=>{
 assert.equal(buffer.readUInt32LE(0),0x46546c67);assert.equal(buffer.readUInt32LE(4),2);assert.equal(buffer.readUInt32LE(8),buffer.length);
 const chunks=buffer.readUInt32LE(12),p=28+chunks;assert.equal(buffer.readUInt32LE(16),0x4e4f534a);assert.equal(buffer.readUInt32LE(24+chunks),0x004e4942);
 return {j:JSON.parse(buffer.subarray(20,20+chunks)),bin:buffer.subarray(p)};
};
test('meter-scale asset reproduces geometry and named ports across floating-point runtimes',()=>{
 const b=build(assets,anchors),raw=readFileSync(new URL('../public/equipment/16-13/connector-bench.glb',import.meta.url)),p=decoded(raw),q=decoded(Buffer.from(b.raw));
 assert.equal(b.metrics.unit,'m');assert.ok(raw.length<500000);
 for(const k of ['nodes','meshes','scenes'])assert.deepEqual(p.j[k],q.j[k]);
 // The final bit of linearized RGB can differ across JavaScript engines.
 const baseColor=m=>m.pbrMetallicRoughness.baseColorFactor;
 const stripRgb=m=>({...m,pbrMetallicRoughness:{...m.pbrMetallicRoughness,baseColorFactor:[null,null,null,baseColor(m)[3]]}});
 assert.equal(p.j.materials.length,q.j.materials.length);
 p.j.materials.forEach((p,i)=>{
  const candidate=q.j.materials[i],rgb=baseColor(p),other=baseColor(candidate);
  assert.equal(rgb.length,4);assert.equal(other.length,4);assert.deepEqual(stripRgb(p),stripRgb(candidate));
  for(let j=0;j<3;j++){assert.ok(Number.isFinite(rgb[j])&&Number.isFinite(other[j]));assert.ok(Math.abs(rgb[j]-other[j])<=1e-12,p.name+' RGB '+j);}
 });
 assert.equal(p.j.accessors.length,q.j.accessors.length);
 for(let k=0;k<p.j.accessors.length;k++){
  const a=p.j.accessors[k],e=q.j.accessors[k];for(const key of ['count','type','componentType'])assert.equal(a[key],e[key]);
  const pa=p.j.bufferViews[a.bufferView],qa=q.j.bufferViews[e.bufferView];assert.equal(pa.byteLength,qa.byteLength);
  if(a.componentType===5123){assert.ok(p.bin.subarray(pa.byteOffset,pa.byteOffset+pa.byteLength).equals(q.bin.subarray(qa.byteOffset,qa.byteOffset+qa.byteLength)));continue;}
  assert.equal(a.componentType,5126);const tol=a.min?1e-7:1e-6;
  for(const key of ['min','max'])if(a[key])a[key].forEach((v,i)=>assert.ok(Math.abs(v-e[key][i])<=tol));
  for(let i=0;i<pa.byteLength;i+=4)assert.ok(Math.abs(p.bin.readFloatLE(pa.byteOffset+i)-q.bin.readFloatLE(qa.byteOffset+i))<=tol);
 }
 assert.equal(p.j.nodes.find(x=>x.name==='receive_plug_bnc').extras.action,'toggle');assert.equal(p.j.nodes.find(x=>x.name==='sink_bnc').extras.portId,SINK);
});
