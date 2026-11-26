import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initial,act,read,points,source} from '../public/equipment/15-04/solver.mjs';
import {assets,anchors} from '../public/equipment/15-04/geometry-source.mjs';
import {build} from '../public/equipment/15-04/mesh-writer.mjs';
// Cross-runtime trig can change last floating bits without changing meshes or shape.
function assertGeometry(buffer,generated){
 const decode=b=>{assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);const n=b.readUInt32LE(12);assert.equal(b.readUInt32LE(16),0x4e4f534a);assert.equal(b.readUInt32LE(24+n),0x004e4942);return {doc:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};};
 const a=decode(buffer),b=decode(Buffer.from(generated));
 assertPortableMaterials(a.doc.materials,b.doc.materials);
 for(const k of ['meshes','scenes'])assert.deepEqual(a.doc[k],b.doc[k]);
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

test('authored three-four-five geometry, signed difference, and unbridged gap',()=>{
 const a=read(1),b=read(2);
 assert.deepEqual(a.deltaMm,{x:3,y:4,length:5});assert.equal(a.elapsedS,1/2);assert.equal(a.videoProcessed,false);
 assert.deepEqual(b.deltaMm,{x:3,y:-4,length:5});
 assert.equal(read(3).coordinateMm,null);assert.equal(read(3).deltaMm,null);assert.equal(read(3).status,'missing');
 assert.deepEqual(read(4).coordinateMm,{x:13,y:8});assert.equal(read(4).deltaMm,null);assert.equal(read(4).elapsedS,null);
 assert.equal(read(6).deltaMm.length,5);
 assert.throws(()=>read(7),/stored index/);assert.throws(()=>act(initial(),'import',[]),/Unknown display/);
 assert.throws(()=>{points[0].coordinateMm.x=30},TypeError);assert.throws(()=>{source.units.coordinate='px'},TypeError);
 let s=act(initial(),'next');assert.equal(s.index,2);assert.equal(s.revision,2);s.result.coordinateMm.x=20;assert.equal(read(2).coordinateMm.x,6);
 s=act(s,'select',3);assert.equal(s.result.sourceRevision,0);assert.equal(s.result.status,'missing');assert.equal(act(s,'reset').index,1);
 const n=act(s,'select',6);assert.equal(act(n,'next'),n);
});
test('metric authored GLB and only named illustration interaction targets',()=>{
 const b=readFileSync(new URL('../public/equipment/15-04/waypoint-console.glb',import.meta.url)),n=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+n)),m=build(assets,anchors);
 assertGeometry(b,m.raw);assert.ok(m.metrics.triangles<2600&&m.metrics.bytes<150000);
 const dim=(name,k)=>{const x=j.nodes.find(x=>x.name===name),p=j.meshes[x.mesh].primitives.map(v=>j.accessors[v.attributes.POSITION]);return Math.max(...p.map(q=>q.max[k]))-Math.min(...p.map(q=>q.min[k]));};
 assert.ok(Math.abs(dim('desk',0)-1.25)<1e-7);assert.ok(Math.abs(dim('desk',2)-.684)<1e-7);assert.ok(Math.abs(dim('display',0)-.56)<1e-7);
 assert.deepEqual(j.nodes.filter(x=>x.extras?.action).map(x=>x.extras.action).sort(),['next','previous','reset','view']);
 assert.ok(!j.nodes.some(x=>/camera|arena|laser|acquisition/i.test(x.name)));
});
// GLB color conversion uses Math.pow. Different runtimes may round RGB by a bit.
function assertPortableMaterials(actual,expected){
 assert.equal(actual.length,expected.length,'material count');
 for(let i=0;i<actual.length;i++){
  const {pbrMetallicRoughness:a,...aMeta}=actual[i],{pbrMetallicRoughness:b,...bMeta}=expected[i];
  assert.deepEqual(aMeta,bMeta);
  assert.ok(a&&b,'PBR material fields required');
  const {baseColorFactor:x,...aPbr}=a,{baseColorFactor:y,...bPbr}=b;
  assert.deepEqual(aPbr,bPbr);
  assert.ok(Array.isArray(x)&&Array.isArray(y)&&x.length===4&&y.length===4,'RGBA factor required');
  for(let k=0;k<4;k++){
   assert.ok([x[k],y[k]].every(v=>Number.isFinite(v)&&v>=0&&v<=1),'factor must be finite and in [0,1]');
   if(k===3)assert.equal(x[k],y[k],'alpha factor');
   else assert.ok(Math.abs(x[k]-y[k])<=1e-12,'RGB factor differs beyond 1e-12');
  }
 }
}
test('GLB color comparison allows RGB roundoff and rejects unrelated material changes',()=>{
 const material=(r,name='slate',roughness=.6,alpha=1)=>[{name,pbrMetallicRoughness:{baseColorFactor:[r,.4,.2,alpha],metallicFactor:.04,roughnessFactor:roughness}}];
 assert.doesNotThrow(()=>assertPortableMaterials(material(.3),material(.3+1e-16)));
 assert.throws(()=>assertPortableMaterials(material(.3),material(.301)),/RGB factor/);
 assert.throws(()=>assertPortableMaterials(material(.3),material(NaN)),/factor must be finite/);
 assert.throws(()=>assertPortableMaterials(material(.3),material(1.0001)),/factor must be finite/);
 assert.throws(()=>assertPortableMaterials(material(.3),[]),/material count/);
 assert.throws(()=>assertPortableMaterials(material(.3),material(.3,'steel')));
 assert.throws(()=>assertPortableMaterials(material(.3),material(.3,'slate',.6000000000000001)));
 assert.throws(()=>assertPortableMaterials(material(.3),material(.3,'slate',.6,.9999999999999999)),/alpha factor/);
});
