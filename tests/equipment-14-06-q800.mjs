import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {measure,analyzeHarmonic,replay,csv} from '../public/equipment/14-06/dma.mjs';
import {createStation,pose} from '../public/equipment/14-06/station.mjs';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`),load=n=>fs.readFileSync(new URL('../public/equipment/14-06/'+n,import.meta.url));
test('independent relaxation corner and elastic limit',()=>{
 const m=measure().result.fit;near(m.storageMpa,30);near(m.lossMpa,20);near(m.tanDelta,2/3);near(m.displacementAmplitudeUm,27);
 const e=measure({deltaMpa:0,e0Mpa:12}).result.fit;near(e.storageMpa,12);near(e.lossMpa,0);
});
test('equal-frequency 30 degree phase and 9 MPa ratio from shifted raw traces',()=>{
 const q=analyzeHarmonic(replay(13,.003,9*Math.cos(Math.PI/6),4.5,.81),13);
 near(q.magnitudeMpa,9);near(q.phaseDeg,30);near(q.storageMpa,9*Math.cos(Math.PI/6));near(q.lossMpa,4.5);
});
test('linear amplitude, declared temperature and portable output',()=>{
 const base=measure().result,changed=measure({strainPercent:.3,sampleId:'QA',siteId:'A1',parentRevision:8}).result;
 near(changed.fit.forceAmplitudeN/base.fit.forceAmplitudeN,2);near(changed.fit.storageMpa,base.fit.storageMpa);assert.equal(changed.revision,9);
 assert.match(csv(changed),/time_s,axial_strain_1,axial_stress_Pa,displacement_um,force_N/);
 assert.ok(measure({temperatureC:45}).result.fit.relaxationTimeS<base.fit.relaxationTimeS);
});
test('virtual furnace and coupon interlocks plus metric poses/action IDs',()=>{
 const s=createStation();assert.equal(pose(s.hit('Furnace_cap')).furnaceLiftM,.15);assert.equal(s.dispatch('acquire').error.code,'open-fixture');s.hit('Film_fixed_grip');s.hit('Furnace_cap');assert.equal(s.dispatch('acquire').error.code,'empty-grips');
 s.dispatch('reset');s.hit('Panel_measure_button');const a=pose(s.dispatch('viewPhase',0)),b=pose(s.dispatch('viewPhase',180));near(a.couponDimensionsM[1]-b.couponDimensionsM[1],.000054);
});
test('GLB envelope and all published checks',()=>{
 const b=load('q800.glb');assert.equal(b.readUInt32LE(8),b.length);const j=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
 assert.deepEqual(j.nodes.find(x=>x.name==='Base_460x560').scale,[.46,.061,.56]);
 assert.ok(JSON.parse(load('verification.json')).checks.every(c=>c.pass));
});
