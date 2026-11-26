import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {initial,validate,inspect,windowPixel,dispatch} from '../public/equipment/13-06/solver.mjs';
const u=n=>new URL('../public/equipment/13-06/'+n,import.meta.url);
const json=n=>JSON.parse(readFileSync(u(n),'utf8')),f=validate(json('fixture.json')),rows=[];
const exact=(id,expected,actual,unit='',tolerance=0)=>{
 const pass=typeof expected==='number'?Math.abs(expected-actual)<=tolerance:expected===actual;
 rows.push({id,expected,actual,unit,tolerance,pass});assert.ok(pass,id);
};
test('native landmark geometry, coordinate and row-major pixel index',()=>{
 const q=inspect(f,initial());
 exact('A row-major index',1132,q.point.pixelIndex,'index');
 exact('A horizontal coordinate',30,q.point.centerNm[0],'nm');
 exact('A vertical coordinate',50,q.point.centerNm[1],'nm');
 exact('A raw value',228,q.point.rawADU,'ADU');
 exact('A–B Euclidean distance',60,q.landmarkSeparationNm,'nm');
 exact('Native signed determinant',384,q.orientationDeterminantPx2,'px²');
});
test('saved mirror changes orientation only and preserves source ID',()=>{
 const q=inspect(f,{...initial(),index:1,x:43});
 exact('Mirrored A index',1163,q.point.pixelIndex,'index');
 exact('A–B mirror distance',60,q.landmarkSeparationNm,'nm');
 exact('Mirror signed determinant',-384,q.orientationDeterminantPx2,'px²');
 assert.equal(q.imageId,'GLA2-EXH-M');assert.equal(q.basisImageId,'GLA2-EXH-A');assert.equal(q.point.rawADU,228);
 assert.deepEqual(dispatch(f,dispatch(f,initial(),'next').state,'next').state,initial());
});
test('contrast and untouched raw data',()=>{
 exact('Default window on A',228,windowPixel(228,0,255),'ADU');
 exact('Narrow window on A',255,windowPixel(228,80,160),'ADU');
 exact('Midpoint window reference',128,windowPixel(120,80,160),'ADU');
 const q=dispatch(f,initial(),'window',[80,160]);assert.ok(q.ok);
 assert.equal(inspect(f,q.state).point.rawADU,228);
});
test('malformed mirror, scale, limits and pixel rejected with state preserved',()=>{
 const b=structuredClone(f);b.images[1].pixels[0]+=1;
 assert.throws(()=>validate(b),/mirror does not match/);
 assert.throws(()=>validate({...f,frame:{...f.frame,pixelSizeNm:2}}),/scale/);
 const s=initial();
 for(const [a,v] of [['window',[161,160]],['window',[2,2]],['window',[0,256]],['pixel',{x:56}],['image',2],['beam',null]]){
  const q=dispatch(f,s,a,v);assert.ok(!q.ok);assert.equal(q.state,s);
 }
 exact('Malformed mirror or reversed contrast','Rejected','Rejected');
});
test('actual metric GLB and named sole read-only action',async()=>{
 const b=readFileSync(u('glacios2.glb')),doc=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),m=json('interaction.json');
 const ps=doc.meshes.flatMap(x=>x.primitives),stats={bytes:b.length,nodes:doc.nodes.length,primitives:ps.length,triangles:ps.reduce((a,x)=>a+doc.accessors[x.indices].count/3,0)};
 const update=process.env.BTS_UPDATE_13_06==='1';
 if(update)writeFileSync(u('asset-metrics.json'),JSON.stringify(stats,null,2)+'\n');else assert.deepEqual(json('asset-metrics.json'),stats);
 assert.ok(stats.bytes<2e6&&stats.primitives<=40&&stats.triangles<5e4);
 const scene=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;
 const g=n=>{const a=[];scene.traverse(o=>{if(o.name===n)a.push(o);});assert.equal(a.length,1,n);return a[0];};
 for(const n of [m.frame.placementAnchor,...Object.values(m.parts),...m.actions.map(a=>a.node)])g(n);
 assert.deepEqual(g(m.frame.placementAnchor).getWorldPosition(new Vector3()).toArray(),[0,0,0]);assert.deepEqual(m.ports,[]);
 assert.deepEqual(m.actions.map(a=>[a.action,a.mode]),[['next','read-only']]);
 const [w,h,d]=new Box3().setFromObject(g(m.parts.scale)).getSize(new Vector3()).toArray();
 exact('Authored cabinet body W',1.25,w,'m',.000001);exact('Authored cabinet body H',2.14,h,'m',.000001);exact('Authored cabinet body D',.93,d,'m',.000001);
 const cab=new Box3().setFromObject(g(m.parts.cabinet)),app=new Box3().setFromObject(g(m.parts.detachedReview));
 assert.ok(app.max.x<cab.min.x-.1&&Math.abs(cab.min.y)<.000001&&cab.max.y>2.19&&cab.max.y<2.21);
 assert.ok(g(m.actions[0].node).getWorldPosition(new Vector3()).z>0);
});
test('export example and independent evidence record',()=>{
 assert.deepEqual(json('example-review.json'),inspect(f,initial()));
 const output={scope:'Immutable digital replay of a native inert raster and its stored X reflection; authored metric geometry. No measurement, calibration, acquisition, 3D reconstruction or headset claim.',rows};
 if(process.env.BTS_UPDATE_13_06==='1')writeFileSync(u('verification.json'),JSON.stringify(output,null,2)+'\n');else assert.deepEqual(json('verification.json'),output);
});
