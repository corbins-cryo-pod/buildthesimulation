import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createStation,save,pose,scale,camera,image,targets} from '../public/equipment/12-02/reticle.mjs';
const get=n=>fs.readFileSync(new URL('../public/equipment/12-02/'+n,import.meta.url));
test('image-derived pixel pitch doubles and physical pitch remains 36.5 µm',()=>{
 const s=createStation(),r=s.hit('Sealed_reticle').result;
 assert.equal(r.meanSpacingPx,50);assert.equal(r.measuredPitchUm,36.5);assert.equal(r.fovWidthUm,292);
 s.hit('Controller_magnification_dial');const b=s.hit('Controller_capture_key');
 assert.equal(b.result.meanSpacingPx,100);assert.equal(b.result.measuredPitchUm,36.5);assert.equal(b.result.fovWidthUm,146);
 assert.equal(save(b).measurementRevision,2);assert.equal(save(b).camera.widthPx,400);
 assert.equal(pose(b).nosepieceRotationRad,-2*Math.PI/3);assert.equal(image(b).length,camera.widthPx*camera.heightPx);
});
test('out-of-focus rejects measurement without revising and blocks stale export',()=>{
 const s=createStation();s.dispatch('measure');s.dispatch('focus',8);const b=s.dispatch('measure');
 assert.match(b.error,/focus band/);assert.equal(b.revision,1);assert.equal(b.result,null);assert.throws(()=>save(b),/Measure/);
 assert.throws(()=>scale(40),/Choose/);s.dispatch('focus',0);assert.equal(s.dispatch('measure').revision,2);
});
test('metric model/base plus semantic hit contract',()=>{
 const gb=get('nikon-ti2-optical.glb'),j=JSON.parse(gb.subarray(20,20+gb.readUInt32LE(12))),m=JSON.parse(get('vr-station.json'));
 assert.equal(gb.length,m.bytes);assert.equal(j.extras.baseWidthMm,240);assert.equal(j.extras.baseDepthMm,495.3);
 for(const h of m.hitTargets){assert.ok(j.nodes.some(n=>n.name===h.node));assert.equal(targets[h.node],h.action);}
 assert.ok(JSON.parse(get('verification.json')).checks.every(c=>c.pass));
});
