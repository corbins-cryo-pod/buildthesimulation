import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initial,act,read,poses,model} from '../public/equipment/15-14/solver.mjs';
import {assets,anchors} from '../public/equipment/15-14/geometry-source.mjs';
import {build} from '../public/equipment/15-14/mesh-writer.mjs';
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

test('independent normal, exact tangent, and two-edge overrun',()=>{
 const a=read('center');assert.deepEqual(a.marginsMm,{left:42,right:42,rear:22,front:22});assert.equal(a.minimumClearanceMm,22);
 const b=read('touch');assert.equal(b.status,'touching');assert.equal(22+18,40);assert.equal(b.marginsMm.front,0);
 const c=read('overrun');assert.equal(c.status,'outside');assert.equal(c.minimumClearanceMm,-9);assert.equal(c.marginsMm.right,60-(50+18));assert.equal(c.marginsMm.front,40-(31+18));
 assert.equal(c.deviceStateModeled,false);assert.equal(c.sourceRevision,0);
 assert.throws(()=>read('other'),/stored dry gauge position/);assert.throws(()=>act(initial(),'operate'),/Unknown detached/);
 assert.throws(()=>{poses.center.x=8},TypeError);
 const s=act(act(initial(),'view'),'select','touch');assert.equal(s.revision,2);assert.equal(s.result.minimumClearanceMm,0);s.result.centerMm.x=99;assert.equal(read('touch').centerMm.x,34);
 assert.equal(act(s,'reset').pose,'center');
});
test('exact authored mesh dimensions and interactions strictly on the detached gauge',()=>{
 const b=readFileSync(new URL('../public/equipment/15-14/concept-cabinet-dry-gauge.glb',import.meta.url)),n=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+n)),m=build(assets,anchors);
 assertGeometry(b,m.raw);assert.ok(m.metrics.triangles<3500&&m.metrics.bytes<200000);
 const extent=(key,k)=>{const x=j.nodes.find(x=>x.name===key);assert.ok(x);const p=j.meshes[x.mesh].primitives.map(v=>j.accessors[v.attributes.POSITION]);
  return [x.translation[k]+Math.min(...p.map(q=>q.min[k])),x.translation[k]+Math.max(...p.map(q=>q.max[k]))];};
 const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,a+' != '+b);
 for(const [k,d] of [.420,.232,.340].entries()){const n=extent('concept_case',k);close(n[1]-n[0],d);}
 close(extent('rail_right',0)[0]-extent('rail_left',0)[1],model.widthMm*.001);
 close(extent('rail_front',2)[0]-extent('rail_rear',2)[1],model.depthMm*.001);
 for(const k of [0,2]){const n=extent('gauge_puck',k);close(n[1]-n[0],model.radiusMm*.002);}
 assert.deepEqual(j.nodes.filter(x=>x.extras?.action).map(x=>x.extras.action).sort(),['select:center','select:overrun','select:touch','view']);
 assert.ok(j.nodes.filter(x=>x.extras?.action).every(x=>x.translation[0]>.3));assert.ok(!j.nodes.find(x=>x.name==='concept_case').extras.action);
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
