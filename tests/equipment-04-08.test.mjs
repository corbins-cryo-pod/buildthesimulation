import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initial,act,read} from '../public/equipment/04-08/solver.mjs';
import {assets,anchors} from '../public/equipment/04-08/geometry-source.mjs';
import {build} from '../public/equipment/04-08/mesh-writer.mjs';
test('Fixed diagram readouts and immutable source revision',()=>{assert.deepEqual(['left','center','right'].map(x=>read(x).spacingMm),[12,15,18]);assert.throws(()=>read('bad'),/labeled/);const x=act(act(initial(),'view'),'select','left').result;assert.equal(x.readRevision,2);assert.equal(x.sourceRevision,0);assert.equal(x.physicalStateModelled,false);});
test('Metric asset with documentary fascia and only detached actions',()=>{const m=build(assets,anchors),x=readFileSync(new URL('../public/equipment/04-08/disco-dag810.glb',import.meta.url));assert.ok(x.length<75000);assert.equal(m.metrics.unit,'m');assertGeometry(x,m.raw);const j=JSON.parse(x.subarray(20,20+x.readUInt32LE(12)));assert.equal(j.nodes.find(x=>x.name==='key_center').extras.action,'select:center');assert.equal(j.nodes.find(x=>x.name==='inactive_fascia').extras.action,undefined);});
// Cross-runtime trig can change last floating bits without changing meshes or shape.
function assertGeometry(buffer,generated){
 const decode=b=>{assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);const n=b.readUInt32LE(12);assert.equal(b.readUInt32LE(16),0x4e4f534a);assert.equal(b.readUInt32LE(24+n),0x004e4942);return {doc:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};};
 const a=decode(buffer),b=decode(Buffer.from(generated));
 for(const k of ['meshes','scenes'])assert.deepEqual(a.doc[k],b.doc[k]);
 // The final bit of linearized RGB can differ across JavaScript engines.
 const baseColor=m=>m.pbrMetallicRoughness.baseColorFactor;
 const stripRgb=m=>({...m,pbrMetallicRoughness:{...m.pbrMetallicRoughness,baseColorFactor:[null,null,null,baseColor(m)[3]]}});
 assert.equal(a.doc.materials.length,b.doc.materials.length);
 a.doc.materials.forEach((p,i)=>{
  const q=b.doc.materials[i],rgb=baseColor(p),other=baseColor(q);
  assert.equal(rgb.length,4);assert.equal(other.length,4);assert.deepEqual(stripRgb(p),stripRgb(q));
  for(let j=0;j<3;j++){assert.ok(Number.isFinite(rgb[j])&&Number.isFinite(other[j]));assert.ok(Math.abs(rgb[j]-other[j])<=1e-12,p.name+' RGB '+j);}
 });
 assert.equal(a.doc.nodes.length,b.doc.nodes.length);
 a.doc.nodes.forEach((p,i)=>{const q=b.doc.nodes[i],coords=['anchorM','boundsM'];
  assert.deepEqual({...p,translation:undefined,extras:p.extras&&{...p.extras,...Object.fromEntries(coords.map(c=>[c,undefined]))}},{...q,translation:undefined,extras:q.extras&&{...q.extras,...Object.fromEntries(coords.map(c=>[c,undefined]))}});
  const near=(m,n)=>{if(m===undefined){assert.equal(n,undefined);return;}assert.equal(m.length,n.length);for(let j=0;j<m.length;j++)assert.ok(Math.abs(m[j]-n[j])<=1e-7);};
  near(p.translation,q.translation);for(const c of coords)near(p.extras?.[c],q.extras?.[c]);
 });
 assert.equal(a.doc.accessors.length,b.doc.accessors.length);
 a.doc.accessors.forEach((actual,k)=>{const expect=b.doc.accessors[k];
  for(const key of ['count','type','componentType'])assert.equal(actual[key],expect[key]);
  const x=a.doc.bufferViews[actual.bufferView],y=b.doc.bufferViews[expect.bufferView];assert.equal(x.byteLength,y.byteLength);
  if(actual.componentType===5123){assert.ok(a.bin.subarray(x.byteOffset,x.byteOffset+x.byteLength).equals(b.bin.subarray(y.byteOffset,y.byteOffset+y.byteLength)));return;}
  assert.equal(actual.componentType,5126);
  const eps=actual.min?1e-7:1e-6;
  for(const key of ['min','max'])if(actual[key])actual[key].forEach((v,i)=>assert.ok(Math.abs(v-expect[key][i])<=eps));
  for(let i=0;i<x.byteLength;i+=4)assert.ok(Math.abs(a.bin.readFloatLE(x.byteOffset+i)-b.bin.readFloatLE(y.byteOffset+i))<=eps);
 });
}
