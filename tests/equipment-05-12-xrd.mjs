import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {bragg,scan,importLines,csv} from '../public/equipment/05-12/diffraction.mjs';
import {createStation,pose,radius,interactions} from '../public/equipment/05-12/station.mjs';
const u=n=>new URL('../public/equipment/05-12/'+n,import.meta.url),f=n=>fs.readFileSync(u(n)),j=n=>JSON.parse(f(n));
const near=(a,b,t)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('Bragg law and isolated Gaussian broadening preserve fitted center and centroid',()=>{
 const z={source:'single',wavelengthA:2,dA:2};near(bragg(2,2),60,1e-9);
 const a=scan({...z,instrumentFwhmDeg:.3,sampleFwhmDeg:.4}).result.peaks[0],b=scan(z).result.peaks[0];
 near(a.centerDeg,60,1e-9);near(a.fwhmDeg,.5,.0025);near(a.centroidDeg,b.centroidDeg,.0025);
});
test('NIST informational silicon line positions and UNL wavelength preset',()=>{
 const x=scan({wavelengthA:1.5405929}).result.peaks;
 for(const [i,o] of [28.441,47.301,56.120].entries())near(x[i].centerDeg,o,.001);
 assert.equal(scan().result.geometry.wavelengthA,1.7903);
});
test('invalid physics, angular undersampling and no in-range points are explicit',()=>{
 assert.equal(scan({source:'single',wavelengthA:2,dA:.5}).code,'forbidden');
 assert.equal(scan({instrumentFwhmDeg:.1,stepDeg:.1}).code,'sampling');
 assert.equal(scan({startDeg:10,endDeg:14}).code,'range');
});
test('reflection CSV contracts and clear overlap disclosure',()=>{
 const rows=importLines(f('example-reflections.csv').toString());assert.equal(rows.length,2);
 const data=scan({source:'import',wavelengthA:2,sampleId:'QA-IMPORT',siteId:'QA-01',parentRevision:5},{filename:'test.csv',lines:rows}).result;
 assert.equal(data.provenance.reference,'test.csv');assert.equal(data.revision,6);assert.match(csv(data),/two_theta_deg,intensity_au/);
 const overlap=scan({source:'import',wavelengthA:2},{filename:'repeat.csv',lines:[rows[0],{...rows[0],label:'duplicate'}]}).result;
 assert.ok(overlap.peaks.every(x=>x.status.startsWith('overlap')));
});
test('VR pose obeys 185 mm radius and theta/2theta, or rejects empty/open scan',()=>{
 const s=createStation();assert.equal(s.hit('Door_handle_left').open,true);assert.equal(s.dispatch('scan').error.code,'open-view');
 s.hit('Specimen_holder');s.hit('Door_handle_left');assert.equal(s.dispatch('scan').error.code,'empty-holder');
 s.dispatch('reset');const v=pose(s.dispatch('setAngle',60));near(v.detectorAngleRad,2*v.sampleAngleRad,1e-9);near(Math.hypot(...v.detectorOffsetM),radius,1e-9);assert.ok(s.dispatch('scan').result);
});
test('metric source and detector positions and documented VR mesh names',()=>{
 const b=f('dmax-b.glb');assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.readUInt32LE(8),b.length);
 const x=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))),m=j('vr-station.json');
 for(const [k,a] of [['Detector_radius_185mm',.185],['Fixed_incident_axis',-.185]])assert.equal(x.nodes.find(n=>n.name===k).translation[0],a);
 for(const n of Object.keys(interactions)){assert.ok(x.nodes.some(q=>q.name===n));assert.ok(m.hitTargets.find(q=>q.node===n).boundsM.min.length===3);}
 assert.ok(j('verification.json').cases.every(c=>c.pass));
});
