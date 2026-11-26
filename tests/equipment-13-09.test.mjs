import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initial,act,output} from '../public/equipment/13-09/solver.mjs';
import {assets,anchors} from '../public/equipment/13-09/geometry-source.mjs';
import {build} from '../public/equipment/13-09/mesh-writer.mjs';
test('Ordered inert document annotations retain source, coordinates and revision lineage',()=>{const s=act(initial(),'example'),o=output(s);assert.equal(o.sourceId,'inert-drawing-01');assert.equal(o.documentRevision,2);assert.deepEqual(o.notes.map(n=>[n.feature,n.parentRevision,n.ordinal,n.sourceId]),[['upper-notch',0,1,o.sourceId],['center-cross',1,2,o.sourceId]]);assert.deepEqual(o.notes[0].xyMm,[-10,11]);assert.match(act(s,'add').error,/already/);assert.equal(act(s,'add',['unknown','outline-mark']).revision,2);assert.throws(()=>act(s,'device-state'),/Unknown/);});
test('Metric source reproduces asset, actions only on detached annotation desk',()=>{const m=build(assets,anchors),x=readFileSync(new URL('../public/equipment/13-09/leica-em-afs2.glb',import.meta.url));assert.ok(x.length<500000);assert.equal(m.metrics.unit,'m');assertGeometry(x,m.raw);const j=JSON.parse(x.subarray(20,20+x.readUInt32LE(12)));assert.equal(j.nodes.find(x=>x.name==='add_note').extras.action,'add');assert.equal(j.nodes.find(x=>x.name==='locked_platform').extras.action,undefined);});
// Cross-runtime trig can change last floating bits without changing meshes or shape.
function assertGeometry(buffer,generated){
 const decode=b=>{assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);const n=b.readUInt32LE(12);assert.equal(b.readUInt32LE(16),0x4e4f534a);assert.equal(b.readUInt32LE(24+n),0x004e4942);return {doc:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};};
 const a=decode(buffer),b=decode(Buffer.from(generated));
 for(const k of ['meshes','scenes'])assert.deepEqual(a.doc[k],b.doc[k]);
 // JavaScript engine versions can round sRGB-to-linear conversion at the final bit.
 // Keep alpha, material identity and parameters exact; only tolerate numeric RGB noise.
 assert.equal(a.doc.materials.length,b.doc.materials.length);
 a.doc.materials.forEach((p,i)=>{
  const q=b.doc.materials[i],stripRgb=m=>{
   const params={...m.pbrMetallicRoughness},[r,g,b,alpha]=params.baseColorFactor;
   assert.equal(params.baseColorFactor.length,4);
   assert.ok([r,g,b].every(Number.isFinite));
   return {...m,pbrMetallicRoughness:{...params,baseColorFactor:[null,null,null,alpha]}};
  };
  assert.deepEqual(stripRgb(p),stripRgb(q));
  const rgbP=p.pbrMetallicRoughness.baseColorFactor,rgbQ=q.pbrMetallicRoughness.baseColorFactor;
  for(let channel=0;channel<3;channel++)assert.ok(Math.abs(rgbP[channel]-rgbQ[channel])<=1e-12,p.name+' RGB channel '+channel);
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
