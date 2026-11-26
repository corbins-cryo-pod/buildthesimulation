import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initial,act,plane,lookup,csv} from '../public/equipment/12-08/solver.mjs';
import {assets,anchors} from '../public/equipment/12-08/geometry-source.mjs';
import {build} from '../public/equipment/12-08/mesh-writer.mjs';
test('Independent plane counts and exact physical lookup, export and failure',()=>{const p=plane(5);assert.equal(p.plane.nonzero,88);assert.equal(p.plane.sum,8080);assert.equal(plane(9).plane.nonzero,24);assert.equal(plane(0).plane.sum,0);assert.throws(()=>plane(13),/plane/);assert.deepEqual(lookup(5,17,8),{x:17,y:8,k:5,xUm:.5,yUm:-2,zUm:0,value:150});assert.match(csv(p),/,5,17,8,0.5,-2,0,150/);assert.equal(act(act(initial(),'select',0),'prev').result.plane.index,0);});
test('Metric GLB reprojection and no active shell controls',()=>{const m=build(assets,anchors),x=readFileSync(new URL('../public/equipment/12-08/lattice-lightsheet-7.glb',import.meta.url));assert.ok(x.length<95000);assert.equal(m.metrics.unit,'m');assertGeometry(x,m.raw);const j=JSON.parse(x.subarray(20,20+x.readUInt32LE(12)));assert.equal(j.nodes.find(x=>x.name==='viewer_next').extras.action,'next');assert.equal(j.nodes.find(x=>x.name==='shell').extras.action,undefined);});
// Cross-runtime trig can change last floating bits without changing meshes or shape.
function assertGeometry(buffer,generated){
 const decode=b=>{assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);const n=b.readUInt32LE(12);assert.equal(b.readUInt32LE(16),0x4e4f534a);assert.equal(b.readUInt32LE(24+n),0x004e4942);return {doc:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};};
 const a=decode(buffer),b=decode(Buffer.from(generated));
 for(const k of ['materials','nodes','meshes','scenes'])assert.deepEqual(a.doc[k],b.doc[k]);
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
