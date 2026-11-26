import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import {cap,defaults,frame,baseTransform,synthetic,measure} from '../public/equipment/05-08/optics.mjs';
import {createStation,pose,targets} from '../public/equipment/05-08/station.mjs';
import {makeStudyZIP} from '../public/equipment/05-08/archive.mjs';
const dir=new URL('../public/equipment/05-08/',import.meta.url),bin=n=>fs.readFileSync(new URL(n,dir)),json=n=>JSON.parse(bin(n));
const near=(x,y,t)=>assert.ok(Math.abs(x-y)<=t,`${x} differs from ${y}`);
test('documented volume and angle: spherical-cap geometry in mm and µL',()=>{
 near(cap(90,5).radiusMm,Math.cbrt(3*5/(2*Math.PI)),1e-10);
 for(const angle of [40,55,90,120,140]){const r=cap(angle,5),h=r.heightMm;near(Math.PI*h*h*(3*r.radiusMm-h)/3,5,1e-10);}
});
test('recover semicircle, acute, and overhanging profiles without using hidden angle truth',()=>{
 for(const angle of [55,90,125]){
  const i=synthetic({thetaDeg:angle}).image;delete i.provenance.cap;
  const z=measure(i).result;near(z.angles.leftDeg,angle,.35);near(z.angles.rightDeg,angle,.35);assert.ok(z.fit.radialRmsPx<.2);
 }
});
test('image-space rotation invariance is distinct from physical tilt',()=>{
 for(const d of [-8,0,8]){
  const i=synthetic({thetaDeg:107,imageRollDeg:d}).image,r=measure(i).result,b=baseTransform(frame.width,i.baseline);
  near(r.angles.leftDeg,107,.5);for(const q of [r.fit.leftContactPx,r.fit.rightContactPx])near(b.local(...q)[1],0,1e-9);
 }
});
test('one-pixel movement predicts angle sensitivity and noise is repeatable',()=>{
 const image=synthetic().image,nom=measure(image).result,up=measure(image,{baseline:{...image.baseline,yAtCenterPx:image.baseline.yAtCenterPx-1}}).result;
 near(nom.angles.leftDeg-up.angles.leftDeg,180/Math.PI*Math.asin(.015/cap(90,5).radiusMm),.04);
 assert.ok(nom.uncertainty.angleSpreadDeg>nom.uncertainty.baselineOnePixelDeg);
 const a=synthetic({noise:12}).image,b=synthetic({noise:12}).image;assert.deepEqual(a.pixels,b.pixels);near(measure(a).result.angles.leftDeg,90,.5);
});
test('blank or clipped image, missing baseline and invalid pixel scale are rejected',()=>{
 const blank={width:100,height:100,pixels:new Uint8Array(10000).fill(225),baseline:{angleDeg:0,yAtCenterPx:75}};
 assert.equal(measure(blank).code,'contour');assert.equal(measure({...blank,baseline:null}).code,'setting');
 for(let y=30;y<60;y++)blank.pixels[y*100]=30;
 assert.equal(measure(blank).code,'clipped');assert.equal(measure(blank,{umPerPx:0}).code,'setting');
});
test('independent state, stage travel, LED interlock and curve fit use the same pose',()=>{
 const a=createStation();assert.equal(a.dispatch('capture').error.code,'sample');
 a.hit('Manual_syringe_knob');assert.ok(pose(a.read()).drop);a.hit('Light_switch');assert.equal(a.hit('Camera_focus_knob').error.code,'illumination');
 a.hit('Light_switch');a.dispatch('configure',{focusMm:12});assert.equal(a.dispatch('capture').error.code,'focus');near(pose(a.read()).stageLiftM,.012,1e-10);
 a.dispatch('configure',{focusMm:0});a.hit('Camera_focus_knob');assert.ok(a.dispatch('fit').result);
 a.hit('Coupon');assert.equal(a.read().image,null);assert.equal(pose(a.read()).drop,null);
});
test('nominal GLB bounds, stable VR ray IDs and explicit data metadata',()=>{
 const b=bin('dsa100b.glb');assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.length,b.readUInt32LE(8));
 const j=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))),m=json('vr-station.json');
 const base=j.nodes.find(n=>n.name==='Base_pan_555x375');near(base.scale[0],.555,1e-8);near(base.scale[2],.375,1e-8);assert.equal(m.nodeCount,j.nodes.length);
 for(const [k,a] of Object.entries(targets)){assert.ok(j.nodes.some(n=>n.name===k));const d=m.interactionTargets.find(n=>n.node===k);assert.equal(d.action,a);assert.ok(d.boundsM.min.every((x,i)=>x<d.boundsM.max[i]));}
 const p=measure(synthetic().image,{sampleId:'BTS-A',contactId:'C-2',parentRevision:5}).result;
 assert.equal(p.revision,6);assert.equal(p.contactId,'C-2');assert.ok(json('output-schema.json').required.every(k=>Object.hasOwn(p,k)));
});
test('portable PNG, output record and ZIP central directory',async()=>{
 const p=bin('example-silhouette.png'),result=json('example-fit.json');assert.deepEqual(p.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]));
 assert.deepEqual(result,measure(synthetic().image).result);
 const z=Buffer.from(await makeStudyZIP(result,p).arrayBuffer());assert.equal(z.readUInt32LE(0),0x04034b50);
 assert.equal(z.readUInt16LE(z.length-12),2);assert.ok(z.includes('sensor.png')&&z.includes('fit.json'));
 assert.ok(json('verification.json').cases.every(x=>x.pass));
});
