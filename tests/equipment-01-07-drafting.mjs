import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {sample,createStation,dimensionRows,file,pose,targets,svgSheet} from '../public/equipment/01-07/draft.mjs';
const read=n=>fs.readFileSync(new URL('../public/equipment/01-07/'+n,import.meta.url));
test('10 mm specimen anchors survive two zoom steps and 30 degree view rotation',()=>{
 const st=createStation(),pre=file(st.read());for(const x of ['zoomIn','zoomIn','rotateView'])st.dispatch(x);
 const post=file(st.read());assert.deepEqual(post.view,{zoom:4,rotationDeg:30});assert.equal(post.annotations[0].lengthMm,10);
 assert.deepEqual(post.annotations,pre.annotations);assert.deepEqual(post.specimenOverlay,pre.specimenOverlay);
 assert.equal(post.revision,pre.revision);
});
test('imported datum translates endpoints without changing measurements and preserves document lineage',()=>{
 const st=createStation(),d={...sample(),parentRevision:12,datum:{xMm:15,yMm:30}};assert.equal(st.dispatch('load',d).error,null);
 const q=file(st.read());assert.equal(q.revision,13);assert.deepEqual(q.annotations[0].sheetEndpointsMm,[[15,30],[25,30]]);assert.equal(q.annotations[0].lengthMm,10);
 const wrong={...d,dimensions:[{id:'BAD',from:'A',to:'MISSING'}]};assert.equal(st.dispatch('load',wrong).error.code,'outline');assert.deepEqual(file(st.read()).annotations,q.annotations);
});
test('sheet export remains 420 × 297 mm and rotation does not alter native SVG coordinates',()=>{
 const s=createStation(),a=svgSheet(s.read());for(const k of ['zoomIn','zoomIn','rotateView'])s.dispatch(k);
 assert.equal(svgSheet(s.read()),a);assert.match(a,/width="420mm" height="297mm"/);assert.match(a,/data-from="A" data-to="B"/);assert.match(a,/>10 mm</);
});
test('metric worktop, animated hinge and named ray targets',()=>{
 const s=createStation();assert.equal(s.hit('Tilt_lock_knob').tiltDeg,15);assert.ok(Math.abs(pose(s.read()).hingeRotationRad-Math.PI/12)<1e-12);assert.equal(s.hit('Drawer_pull').drawer,true);
 const b=read('drafting-table.glb'),j=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));assert.deepEqual(j.nodes.find(n=>n.name==='Worktop_1100x650').scale,[1.1,.028,.65]);
 for(const k of Object.keys(targets))assert.ok(j.nodes.some(n=>n.name===k));
 assert.ok(JSON.parse(read('verification.json')).checks.every(x=>x.pass));
});
