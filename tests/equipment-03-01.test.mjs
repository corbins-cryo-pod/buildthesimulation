import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initial,act} from '../public/equipment/03-01/solver.mjs';
import {assets,anchors} from '../public/equipment/03-01/geometry-source.mjs';
import {build} from '../public/equipment/03-01/mesh-writer.mjs';
test('Independent 100 µm optical step shadow and normal case',()=>{const r=act(initial(),'example');assert.equal(r.result.lightShadow.shadowCells,4);assert.ok(Math.abs(r.result.lightShadow.analyticalLengthMm-.1)<1e-12);assert.equal(act(act(r,'set',{angleDeg:0}),'read').result.lightShadow.shadowCells,0);});
test('Physical fit and cover guards',()=>{assert.match(act(initial(),'seat').error,/cover/);let r=act(initial(),'example');assert.match(act(r,'cover').error,/Remove/);r=act(act(r,'set',{diameterMm:110}),'seat');assert.equal(r.seated,false);assert.match(r.error,/exceeds/);});
test('Reproducible metric GLB and target nodes',()=>{const m=build(assets,anchors),x=readFileSync(new URL('../public/equipment/03-01/bjd-1800-witness.glb',import.meta.url));assertGeometry(x,m.raw);assert.ok(x.length<500000);assert.equal(m.metrics.unit,'m');const j=JSON.parse(x.subarray(20,20+x.readUInt32LE(12)));for(let i=1;i<=6;i++)assert.equal(j.nodes.find(x=>x.name==='recess_'+i).extras.action,'pocket:'+i);});

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
