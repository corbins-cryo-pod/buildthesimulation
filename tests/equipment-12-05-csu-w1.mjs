import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initial,reduce,reconstruct,report,picks,pixelPitchUm} from '../public/equipment/12-05/fixed-grid.mjs';
const d=new URL('../public/equipment/12-05/',import.meta.url);
test('Independent row/column alignment and 32 µm grid pitch',()=>{
 const s=reduce(initial(),'plane','middle'),r=reconstruct(s);
 assert.deepEqual(r.centroidPx.map(v=>v*pixelPitchUm),[72,58]);assert.equal(r.zUm,8);
 for(const [x,y] of [[20,13],[36,13],[52,13]])assert.equal(r.image[y*64+x],255);
 assert.equal((36-20)*pixelPitchUm,32);
 const u=reduce(reduce(s,'plane','upper'),'expression','registered'),q=reconstruct(u);
 assert.deepEqual(q.image,reconstruct(initial()).image);assert.deepEqual(q.correctionPx,[5,-4]);assert.equal(q.zUm,16);
});
test('Offline-only action contract and export',()=>{
 const s=initial();assert.throws(()=>reduce(s,'plane','unsupported'),/offline/);assert.throws(()=>reduce(s,'laser','run'),/offline/);
 const r=report(reduce(reduce(s,'plane','middle'),'expression','registered'));
 assert.deepEqual(r,JSON.parse(readFileSync(new URL('example-grid.json',d))));assert.equal(r.pixels.length,4096);assert.equal(r.deviceConnection,false);assert.equal(r.state.revision,2);
});
test('Genuine metric GLB, older assembly envelope and three card IDs',()=>{
 const b=readFileSync(new URL('csu-w1-tie.glb',d));assert.equal(b.subarray(0,4).toString(),'glTF');assert.equal(b.readUInt32LE(8),b.length);
 const gltf=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));const v=JSON.parse(readFileSync(new URL('vr.json',d)));
 for(const key of Object.keys(picks)){assert.ok(gltf.nodes.some(n=>n.name===key&&n.mesh!==undefined));assert.ok(v.interaction[key].boundsMinM[1]>=.04)}
 for(const [i,m] of [.480,.252,.327].entries())assert.ok(Math.abs(v.modeledT1AssemblyM[i]-m)<.0025);
 assert.ok(v.meshes>45&&b.length<1_000_000);
});
