import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compare,center,snap,grid,mounts,initial,act,presets} from '../public/equipment/11-06/solver.mjs';
import {assets,anchors,surface} from '../public/equipment/11-06/geometry-source.mjs';
import {build} from '../public/equipment/11-06/mesh-writer.mjs';
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

test('register acceptance: pitch times interval count, plus exact volume overlap',()=>{
 const a=compare(presets.clear);assert.equal(a.centerDistanceMm,4*25);assert.equal(a.edgeGapMm,4*25-(80+70)/2);assert.equal(a.overlapMm3,0);assert.equal(a.status,'clear');
 const same=compare(presets.collision);assert.equal(same.overlapMm3,70*50*30);assert.equal(same.edgeGapMm,null);assert.equal(same.collision,true);
 const touch=compare({A:presets.clear.A,B:{col:15,row:14}});assert.equal(touch.status,'touching');assert.equal(touch.overlapMm3,0);assert.equal(touch.edgeGapMm,0);
 const edge=compare(presets.edge);assert.deepEqual(edge.overhangB,{left:0,right:35-12.5,rear:0,front:25-12.5});assert.equal(edge.fit,false);
 assert.deepEqual(center({col:0,row:0}),{x:-437.5,z:-362.5});assert.deepEqual(center({col:35,row:29}),{x:437.5,z:362.5});
 assert.throws(()=>center({col:36,row:0}),/valid hole/);assert.throws(()=>snap(451,0),/breadboard face/);
 const s=act(initial(),'snap',{x:161,z:-12});assert.equal(s.result.centerDistanceMm,300);assert.deepEqual(s.pos.B,{col:24,row:14});assert.equal(s.revision,2);
 const rejected=act(s,'place',{col:-1,row:8});assert.match(rejected.error,/valid hole/);assert.equal(rejected.result,s.result);assert.equal(rejected.revision,2);
});
test('GLB true-size rail, tabletop and dry blocks; 1,080 distinct perforations',()=>{
 const b=readFileSync(new URL('../public/equipment/11-06/sciencedesk-sdpm7590.glb',import.meta.url)),n=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+n)),m=build(assets,anchors);
 assertGeometry(b,m.raw);assert.ok(m.metrics.triangles<25000&&m.metrics.bytes<650000);
 const size=(name,k)=>{const x=j.nodes.find(x=>x.name===name),p=j.meshes[x.mesh].primitives.map(v=>j.accessors[v.attributes.POSITION]);
  return Math.max(...p.map(q=>q.max[k]))-Math.min(...p.map(q=>q.min[k]));};
 const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,a+' != '+b);
 for(const [name,ext] of [['frame',[1.1115,null,.9615]],['breadboard',[.9,.06,.75]],...Object.entries(mounts).map(([id,x])=>['mount_'+id,[x.width/1000,x.height/1000,x.depth/1000]])]){
  for(let k=0;k<3;k++)if(ext[k]!==null)close(size(name,k),ext[k]);
 }
 assert.deepEqual(j.nodes.filter(x=>x.extras?.action).map(x=>x.extras.action).sort(),['grid','select:A','select:B']);
 assert.equal(j.nodes.find(x=>x.name==='breadboard').translation[1],.782);
 const top=assets.filter(x=>x.t==='tile');assert.equal(top.length,1080);
 for(let j=0;j<grid.rows;j++)for(let i=0;i<grid.columns;i++){const tile=top[j*grid.columns+i],w=center({col:i,row:j});close(tile.p[0],w.x/1000);close(tile.p[2],w.z/1000);}
 const faces=m.faces.filter(f=>f.g==='breadboard'&&f.p.every(p=>p[1]===surface));assert.equal(faces.length,1080*8);
 assert.ok(faces.every(x=>x.n[1]>.999));
 // Ring polygons leave the geometric hole centers outside their triangulation.
 const side=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
 const inTri=(a,b,c,p)=>{const v=[side(a,b,p),side(b,c,p),side(c,a,p)];return v.every(x=>x>=0)||v.every(x=>x<=0);};
 for(const tile of [top[0],top[18+36*15],top.at(-1)]){const p=[tile.p[0],tile.p[2]];assert.ok(!faces.some(q=>{const [a,b,c,d]=q.p.map(x=>[x[0],x[2]]);return inTri(a,b,c,p)||inTri(a,c,d,p);}));}
});