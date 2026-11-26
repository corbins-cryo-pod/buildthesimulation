import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initial,act,solve} from '../public/equipment/10-07/solver.mjs';
import {assets,anchors} from '../public/equipment/10-07/geometry-source.mjs';
import {build} from '../public/equipment/10-07/mesh-writer.mjs';
test('Independent 90-degree transforms, axis bounds and invalid domain',()=>{const r=act(initial(),'move');assert.deepEqual(r.result.sample.tipSampleMm,[4,1,1]);assert.deepEqual(r.result.sample.tipSampleM,[.004,.001,.001]);const q=act(r,'limit');assert.deepEqual(q.result.local.appliedStageMm,[12.5,0,0]);assert.deepEqual(q.result.local.blockedAxes,['X']);assert.deepEqual(q.result.sample.tipSampleMm,[4,10.5,1]);assert.throws(()=>solve({xMm:101,yMm:0,zMm:0,yawDeg:0}),/requests/);});
test('Three source-scale stage components and original virtual targets',()=>{const m=build(assets,anchors),x=readFileSync(new URL('../public/equipment/10-07/sutter-mp285.glb',import.meta.url));assertGeometry(x,m.raw);assert.ok(x.length<175000);assert.equal(m.metrics.unit,'m');const j=JSON.parse(x.subarray(20,20+x.readUInt32LE(12)));for(const k of ['x','y','z'])assert.equal(j.nodes.find(x=>x.name==='joy_'+k).extras.action,'nudge:'+k.toUpperCase());for(const k of ['slide_x','slide_xy','slide_z'])assert.ok(j.nodes.find(x=>x.name===k));});

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
