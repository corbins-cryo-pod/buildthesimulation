import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initial,act,defaults,check} from '../public/equipment/16-05/solver.mjs';
import {assets,anchors} from '../public/equipment/16-05/geometry-source.mjs';
import {build} from '../public/equipment/16-05/mesh-writer.mjs';
test('Independent 60–144–156 triangle and signed axial failure',()=>{const d={...defaults(),widthMm:288};const x=check(d);assert.equal(x.clearance.apertureMarginMm,36);assert.equal(x.clearance.doorPlaneMarginMm,50);assert.equal(x.clearance.fits,true);const over=check({...d,depthMm:736});assert.equal(over.clearance.doorPlaneMarginMm,-11);assert.equal(over.clearance.fits,false);});
test('Geometry state and immutable nonoperational status',()=>{const r=act(initial(),'example');assert.equal(r.section,true);assert.equal(r.result.operatingState,'not modeled');assert.equal(r.result.loadedContentsModeled,false);assert.throws(()=>act(r,'unlock'),/Unknown/);assert.match(act(act(r,'set',{heightMm:0}),'check').error,/ranges/);});
test('Asset regeneration, meter scale and noninteractive latch',()=>{const m=build(assets,anchors),r=readFileSync(new URL('../public/equipment/16-05/3870ea-tray-gauge.glb',import.meta.url));assertGeometry(r,m.raw);assert.equal(r.readUInt32LE(0),0x46546c67);assert.ok(r.length<110000);
const j=JSON.parse(r.subarray(20,20+r.readUInt32LE(12)));assert.equal(m.metrics.unit,'m');assert.equal(j.nodes.find(x=>x.name==='carrier').extras.action,'check');assert.equal(j.nodes.find(x=>x.name==='locked_latch').extras.action,undefined);assert.match(j.nodes.find(x=>x.name==='locked_latch').extras.label,/Locked/);});

// Cross-runtime trig can change last floating bits without changing meshes or shape.
function assertGeometry(buffer,generated){
 const decode=b=>{assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);const n=b.readUInt32LE(12);assert.equal(b.readUInt32LE(16),0x4e4f534a);assert.equal(b.readUInt32LE(24+n),0x004e4942);return {doc:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};};
 const a=decode(buffer),b=decode(Buffer.from(generated));
 for(const k of ['nodes','meshes','scenes'])assert.deepEqual(a.doc[k],b.doc[k]);
 // The final bit of linearized RGB can differ across JavaScript engines.
 const baseColor=m=>m.pbrMetallicRoughness.baseColorFactor;
 const stripRgb=m=>({...m,pbrMetallicRoughness:{...m.pbrMetallicRoughness,baseColorFactor:[null,null,null,baseColor(m)[3]]}});
 assert.equal(a.doc.materials.length,b.doc.materials.length);
 a.doc.materials.forEach((p,i)=>{
  const q=b.doc.materials[i],rgb=baseColor(p),other=baseColor(q);
  assert.equal(rgb.length,4);assert.equal(other.length,4);assert.deepEqual(stripRgb(p),stripRgb(q));
  for(let j=0;j<3;j++){assert.ok(Number.isFinite(rgb[j])&&Number.isFinite(other[j]));assert.ok(Math.abs(rgb[j]-other[j])<=1e-12,p.name+' RGB '+j);}
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
