import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createStation,file,calibration,raster,pose,targets} from '../public/equipment/10-05/optics.mjs';
const get=n=>fs.readFileSync(new URL('../public/equipment/10-05/'+n,import.meta.url));
test('paired focal planes recover hand-audited target coordinates and visible raster',()=>{
 const s=createStation(),a=s.hit('Etched_reference_coupon');assert.deepEqual(a.capture.pixel,[32,33]);assert.deepEqual([a.capture.xUm,a.capture.yUm,a.capture.zUm],[-40,15,0]);
 assert.ok(raster(a)[33*81+32]>200);
 s.hit('Focus_dial');const b=s.hit('Etched_reference_coupon');assert.equal(b.capture.id,'ETCH-B');assert.deepEqual(b.capture.pixel,[49,26]);
 assert.deepEqual([b.capture.xUm,b.capture.yUm,b.capture.zUm],[45,-20,80]);assert.ok(raster(b)[21*81+49]>200);
 assert.ok(Math.abs(pose(b).objectiveY-pose(a).objectiveY-.00008)<1e-12);
});
test('mid-plane rejection and pan inverse use a stable sample coordinate',()=>{
 const s=createStation();s.dispatch('focus',40);const m=s.dispatch('pick');assert.match(m.error,/No in-focus/);assert.equal(m.capture,null);assert.ok(raster(m)[33*81+32]<70);
 s.dispatch('focus',80);s.dispatch('pan',{x:25,y:0});assert.match(s.dispatch('pick',{u:19,v:10}).error,/No in-focus/);
 const p=s.dispatch('pick',{u:44,v:26});assert.equal(p.capture.pixel[0],44);assert.equal(p.capture.xUm,45);assert.equal(p.revision,1);
 const b=file(p);assert.equal(b.calibration.pixelUm,5);assert.equal(b.couponId,'BTS-ETCH-2PLANE-01');
 assert.match(s.dispatch('pan',{x:999,y:20}).error,/range/);assert.equal(s.read().stageXUm,25);
});
test('documentary model and public VR hit manifest describe same scene',()=>{
 const gb=get('slicescope-optical.glb'), j=JSON.parse(gb.subarray(20,20+gb.readUInt32LE(12))),m=JSON.parse(get('vr-station.json'));
 assert.equal(m.bytes,gb.length);assert.equal(j.extras.mountWidthMm,157.2);assert.equal(j.extras.mountDepthMm,300);
 for(const h of m.hitTargets){assert.ok(j.nodes.some(n=>n.name===h.node));assert.equal(targets[h.node][0],h.action);}
 assert.equal(raster(createStation().read()).length,calibration.widthPx*calibration.heightPx);assert.ok(JSON.parse(get('verification.json')).checks.every(c=>c.pass));
});
