import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {outlines,initial,act,read} from '../public/equipment/07-15/solver.mjs';
import {assets,anchors} from '../public/equipment/07-15/geometry-source.mjs';
import {build} from '../public/equipment/07-15/mesh-writer.mjs';
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

test('independently count fixed-area regions, including a degenerate line',()=>{
 const rectangle=read('rectangle'),notch=read('notched'),flat=read('flat');
 assert.equal(rectangle.area,8*6);
 assert.equal(notch.area,8*3+5*4);
 assert.equal(flat.area,null);assert.equal(flat.status,'degenerate');
 assert.throws(()=>read('arbitrary'),/stored geometric outline/);
 assert.throws(()=>act(initial(),'instrument'),/Unknown detached/);
 assert.throws(()=>{outlines.rectangle.vertices[0][0]=42},TypeError);
 const s=act(act(initial(),'view'),'select','rectangle');
 assert.equal(s.result.area,48);assert.equal(s.result.readRevision,2);
 assert.equal(s.result.sourceRevision,0);assert.equal(s.result.instrumentStateModeled,false);
 s.result.vertices[0][0]=42;assert.equal(read('rectangle').vertices[0][0],0);
 assert.equal(act(s,'reset').outline,'notched');
});
test('original GLB metric bounds and geometry; all actions detached',()=>{
 const b=readFileSync(new URL('../public/equipment/07-15/synthecon-rccs4d.glb',import.meta.url)),n=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+n));
 const m=build(assets,anchors);assertGeometry(b,m.raw);assert.ok(m.metrics.triangles<1000&&m.metrics.bytes<100000);
 for(const [name,fixed] of [['base_shell',[.203,.229,.210]],['nominal_housing',[.241,.114,.241]]]){
  const node=j.nodes.find(x=>x.name===name);assert.ok(node);
  const a=j.meshes[node.mesh].primitives.map(v=>j.accessors[v.attributes.POSITION]);
  for(let k=0;k<3;k++)assert.ok(Math.abs(Math.max(...a.map(x=>x.max[k]))-Math.min(...a.map(x=>x.min[k]))-fixed[k])<1e-5);
 }
 assert.deepEqual(j.nodes.filter(x=>x.extras?.action).map(x=>x.extras.action).sort(),['select:flat','select:notched','select:rectangle','view']);
 assert.ok(j.nodes.filter(x=>x.extras?.action).every(x=>x.translation[0]>.3));
 assert.ok(j.nodes.filter(x=>['base_shell','nominal_housing','opaque_cover'].includes(x.name)).every(x=>!x.extras.action));
});