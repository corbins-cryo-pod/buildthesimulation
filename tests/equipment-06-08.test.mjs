import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initial,act,compare,frames,witness} from '../public/equipment/06-08/solver.mjs';
import {assets,anchors} from '../public/equipment/06-08/geometry-source.mjs';
import {build} from '../public/equipment/06-08/mesh-writer.mjs';
test('Independent positive, negative, tangent and invalid drawings',()=>{const values=['roomy','narrow','tangent'].map(s=>{const q=compare(s);return [q.marginXMm,q.marginZMm,q.contained]});assert.deepEqual(values,[[6,5,true],[-2,4,false],[0,0,true]]);const s=act(act(initial(),'view'),'select','outside');assert.equal(s.result,null);assert.match(s.error,/stored/);assert.deepEqual([witness.widthMm,witness.depthMm],[72,92]);assert.ok(Object.isFrozen(witness)&&Object.isFrozen(frames.narrow));assert.equal(compare('narrow').relatedToPhysicalFit,false);});
test('Published nominal body dimensions and no attached actions',()=>{const m=build(assets,anchors),x=readFileSync(new URL('../public/equipment/06-08/fluigent-flow-ez.glb',import.meta.url));assert.ok(x.length<115000);assert.equal(m.metrics.unit,'m');assertGeometry(x,m.raw);const j=JSON.parse(x.subarray(20,20+x.readUInt32LE(12)));
const inst=j.nodes.filter(n=>['body','side_trim','upper_inset','inactive_inset','lower_inset','fixed_front_cap','feet'].includes(n.name));assert.ok(inst.every(n=>n.extras?.action===undefined));const bbox=[0,1,2].map(k=>Math.max(...inst.flatMap(n=>j.meshes[n.mesh].primitives.map(o=>n.translation[k]+j.accessors[o.attributes.POSITION].max[k])))-Math.min(...inst.flatMap(n=>j.meshes[n.mesh].primitives.map(o=>n.translation[k]+j.accessors[o.attributes.POSITION].min[k]))));[.0718,.131,.0919].forEach((dimension,k)=>assert.ok(Math.abs(bbox[k]-dimension)<1e-5));assert.equal(j.nodes.find(n=>n.name==='select_narrow').extras.action,'select:narrow');});
// Cross-runtime trig can change last floating bits without changing meshes or shape.
function assertGeometry(buffer,generated){
 const decode=b=>{assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);const n=b.readUInt32LE(12);assert.equal(b.readUInt32LE(16),0x4e4f534a);assert.equal(b.readUInt32LE(24+n),0x004e4942);return {doc:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};};
 const a=decode(buffer),b=decode(Buffer.from(generated));
 for(const k of ['materials','meshes','scenes'])assert.deepEqual(a.doc[k],b.doc[k]);
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
