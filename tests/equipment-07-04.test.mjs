import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initial,act,read} from '../public/equipment/07-04/solver.mjs';
import {assets,anchors} from '../public/equipment/07-04/geometry-source.mjs';
import {build} from '../public/equipment/07-04/mesh-writer.mjs';
test('Calibrated static rectangle and honest edge/blank guards',()=>{const r=read('complete');assert.deepEqual(r.raster.spacingMm,[.25,.2]);const q=r.measurement;assert.deepEqual([q.widthPx,q.heightPx,q.widthMm,q.heightMm,q.areaMm2],[40,28,10,5.6,56]);assert.equal(q.visiblePixels,1120);const f=read('cropped').measurement;assert.equal(f.status,'edge-clipped');assert.equal(f.visiblePixels,784);assert.deepEqual([f.widthPx,f.heightPx,f.widthMm,f.heightMm,f.areaMm2],[null,null,null,null,null]);assert.equal(read('blank').measurement.visibleBoundsPx,null);assert.equal(read('blank').measurement.areaMm2,null);assert.throws(()=>read('not-a-frame'),/stored/);assert.equal(act(act(initial(),'view'),'select','cropped').result.sourceRevision,0);});
test('Published 3D envelope and detached-only actions',()=>{const m=build(assets,anchors),x=readFileSync(new URL('../public/equipment/07-04/echo-cellcyte-gen2.glb',import.meta.url));assert.ok(x.length<60000);assert.equal(m.metrics.unit,'m');assertGeometry(x,m.raw);const j=JSON.parse(x.subarray(20,20+x.readUInt32LE(12)));
const inst=j.nodes.filter(n=>['frame','fixed_deck','rear_arch','under_deck'].includes(n.name));assert.ok(inst.every(n=>n.extras?.action===undefined));const bbox=[0,1,2].map(k=>Math.max(...inst.flatMap(n=>j.meshes[n.mesh].primitives.map(o=>n.translation[k]+j.accessors[o.attributes.POSITION].max[k])))-Math.min(...inst.flatMap(n=>j.meshes[n.mesh].primitives.map(o=>n.translation[k]+j.accessors[o.attributes.POSITION].min[k]))));[.4953,.32004,.4064].forEach((dimension,k)=>assert.ok(Math.abs(bbox[k]-dimension)<1e-5));assert.equal(j.nodes.find(n=>n.name==='select_cropped').extras.action,'select:cropped');});
// The sRGB conversion may differ by a last floating bit across Node/V8.
function assertMaterials(actual, expected) {
 assert.equal(actual.length, expected.length);
 actual.forEach((material, i) => {
  const reference=expected[i];
  const {baseColorFactor:a,...pa}=material.pbrMetallicRoughness;
  const {baseColorFactor:b,...pb}=reference.pbrMetallicRoughness;
  assert.deepEqual({...material,pbrMetallicRoughness:pa},{...reference,pbrMetallicRoughness:pb});
  assert.equal(a.length,4);
  assert.equal(b.length,4);
  assert.equal(a[3],b[3]);
  for(let j=0;j<3;j++)assert.ok(Number.isFinite(a[j])&&Number.isFinite(b[j])&&Math.abs(a[j]-b[j])<=1e-12,'RGB channel differs');
 });
}

test('GLB color guard accepts last-bit RGB drift but rejects real material changes',()=>{
 const fixture=[{name:'check',pbrMetallicRoughness:{baseColorFactor:[.25,.5,.75,1],metallicFactor:.04}}];
 const modified=structuredClone(fixture);
 modified[0].pbrMetallicRoughness.baseColorFactor[0]+=Number.EPSILON;
 assert.doesNotThrow(()=>assertMaterials(fixture,modified));
 modified[0].pbrMetallicRoughness.baseColorFactor[0]+=.001;
 assert.throws(()=>assertMaterials(fixture,modified),/RGB channel differs/);
 const alpha=structuredClone(fixture);
 alpha[0].pbrMetallicRoughness.baseColorFactor[3]=.99;
 assert.throws(()=>assertMaterials(fixture,alpha));
 const renamed=structuredClone(fixture);
 renamed[0].name='regression';
 assert.throws(()=>assertMaterials(fixture,renamed));
});

// Cross-runtime trig can change last floating bits without changing meshes or shape.
function assertGeometry(buffer,generated){
 const decode=b=>{assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);const n=b.readUInt32LE(12);assert.equal(b.readUInt32LE(16),0x4e4f534a);assert.equal(b.readUInt32LE(24+n),0x004e4942);return {doc:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};};
 const a=decode(buffer),b=decode(Buffer.from(generated));
 for(const k of ['meshes','scenes'])assert.deepEqual(a.doc[k],b.doc[k]);
 assertMaterials(a.doc.materials,b.doc.materials);
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
