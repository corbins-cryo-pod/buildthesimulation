import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initial,act} from '../public/equipment/16-10/solver.mjs';
import {assets,anchors} from '../public/equipment/16-10/geometry-source.mjs';
import {build} from '../public/equipment/16-10/mesh-writer.mjs';
test('Dry clearance, quarter turn and oversized failure',()=>{const r=act(initial(),'example');assert.deepEqual(r.result.clearance,{widthPerSideMm:14,depthPerSideMm:21,headroomMm:49,fit:true});assert.equal(act(act(r,'rotate'),'fit').result.clearance.depthPerSideMm,6);
 const x=act(act(r,'oversize'),'fit');assert.equal(x.result.clearance.widthPerSideMm,-2);assert.equal(x.result.clearance.fit,false);});
test('Physical scene guard and administrative acceptance',()=>{assert.equal(act(initial(),'basket').raised,false);const r=act(initial(),'example');assert.match(act(r,'lid').error,/Lower/);const a=act(r,'audit').audit;assert.equal(a.status,'interrupted');assert.equal(a.elapsedVirtualS,20);assert.equal(a.physicalCycleRan,false);assert.equal(a.completedCycleEntries.length,0);});
test('Asset reproducibility, meter frame and stable targets',()=>{const m=build(assets,anchors),b=readFileSync(new URL('../public/equipment/16-10/bransonic-1800.glb',import.meta.url));assertGeometry(b,m.raw);assert.equal(b.readUInt32LE(0),0x46546c67);assert.ok(b.length<150000);
 const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.equal(m.metrics.unit,'m');for(const k of ['lid','basket','coupon'])assert.equal(j.nodes.find(x=>x.name===k).extras.action,anchors[k].action);});

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
