import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {action,advance,checkpoint,configure,createJob,csv,defaults,result,resumeCheckpoint} from '../public/equipment/14-10/solver.mjs';
const base=new URL('../public/equipment/14-10/',import.meta.url),get=k=>readFileSync(new URL(k,base)),put=(k,v)=>writeFileSync(new URL(k,base),JSON.stringify(v,null,2)+'\n');
const json=k=>JSON.parse(get(k));
const interrupted=advance(createJob(),60),uninterrupted=advance(createJob(),120),loaded=resumeCheckpoint(JSON.parse(JSON.stringify(checkpoint(interrupted)))),finished=advance(loaded,120);
const model=configure(defaults),b=get('cyclic-bend.glb'),g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
const baseplate=g.nodes.find(n=>n.name==='baseplate'),baseAcc=g.accessors[g.meshes[baseplate.mesh].primitives[0].attributes.POSITION];
const bbox=baseAcc.max.map((max,i)=>max-baseAcc.min[i]);
const reject=cb=>{try{cb();return false}catch{return true}};
const actual={
 'neutral-curvature':1/model.radiusNeutralM,
 'outside-strain':model.peakStrain,
 '20-trace-squares':model.baselineOhm,
 'cycle-99-flat-resistance':uninterrupted.history[98].flatResistanceOhm,
 'injected-first-event':uninterrupted.events[0]?.cycle,
 'restart-60-identical-rows':JSON.stringify(finished.history)===JSON.stringify(uninterrupted.history),
 'open-event-once':finished.events.length,
 'post-open-null':finished.history.slice(99).every(r=>r.flatResistanceOhm===null&&r.continuity==='open'),
 'double-neutral-radius-reduces-damage-fourfold':configure({...defaults,radiusMm:9.95}).damagePerCycle/model.damagePerCycle,
 'calibrated-life-threshold':advance(createJob({...defaults,injectedOpen:0,referenceLife:4}),10).events[0]?.cycle,
 'reject-tampered-checkpoint':reject(()=>resumeCheckpoint({...checkpoint(interrupted),sample:{...checkpoint(interrupted).sample,contactIds:['A','B']}})),
 'reject-incompatible-trace-length':reject(()=>configure({...defaults,radiusMm:14,lengthMm:12})),
 'nominal-base-width':bbox[0]
};
const cases=json('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=c.tolerance:actual[c.id]===c.expected)?'PASS':'FAIL'}));
const triangles=g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0);
const draws=g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0);
const metrics={bytes:b.length,triangles,draws,baseGltfXyzM:bbox};
const report={schema:'bts.flex-fatigue.verification.v1',cases,metrics,coverage:'Independent analytical and deterministic workflow checks; no independent fatigue-life measurement, hardware, or physical headset validation.'};
if(process.argv.includes('--write-proof')){
 put('verification.json',report);put('example-checkpoint.json',checkpoint(interrupted));put('example-history.json',result(finished));
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'14-10',model:'/equipment/14-10/cyclic-bend.glb',scale:{unit:'m',coordinateSystem:'glTF right-handed, +Y up, +Z operator/front'},metrics,
 implementation:'Desktop click and UI share DOM-independent action(); future WebXR client can use the same action. Physical headset not tested.',
 nodes:[{name:'jog_input',label:'Jog coupon between flat and 90°',action:{type:'jog'},nominalCenterM:[.071,.076,.048],diameterM:.022},{name:'bend_arm',axis:[0,1,0],travelDegrees:[0,90],positionM:[-.025,.084,.018]},{name:'moving_grip',coordinateFrame:'mandrel tangent in XZ; neutral-axis arc and remaining straight length'}, {name:'replaceable_mandrel',radiusM:[.002,.015]}]});
}
test('Locked analytical values, register acceptance and unit-scale geometry',()=>{
 assert.deepEqual(json('verification.json'),report);assert.ok(cases.every(c=>c.outcome==='PASS'));assert.deepEqual(finished.events,uninterrupted.events);assert.equal(finished.resumedAt,60);
 assert.ok(Math.abs(bbox[1]-.018)<1e-6&&Math.abs(bbox[2]-.22)<1e-6);
 assert.deepEqual(json('example-checkpoint.json'),checkpoint(interrupted));assert.deepEqual(json('example-history.json'),result(finished));
 assert.ok(['jog_input','replaceable_mandrel','moving_grip','bend_arm'].every(k=>g.nodes.some(n=>n.name===k)));
});
test('Shared action and exports preserve open state and revision; unavailable runs fail',()=>{
 let s={loaded:false,armBent:false,job:null};
 assert.throws(()=>action(s,{type:'jog'}),/Load/); assert.throws(()=>action(s,{type:'run',payload:{settings:defaults,cycle:60}}),/Load/);
 s=action(s,{type:'load'}); s=action(s,{type:'jog'});assert.equal(s.armBent,true);
 s=action(s,{type:'run',payload:{settings:defaults,cycle:60}});assert.equal(s.armBent,false);
 s=action(s,{type:'resume',payload:checkpoint(s.job)});
 s=action(s,{type:'run',payload:{settings:defaults,cycle:120}});
 const exported=csv(s.job).split('\n')[100].split(',');assert.deepEqual(exported.slice(0,8),['BTS-14-10-SYN-001','coupon-r1','J1','J2','3','100','50','200']);assert.deepEqual(exported.slice(-2),['','open']);assert.ok(Math.abs(Number(exported[8])-.01)<1e-12);
 const after=resumeCheckpoint(checkpoint(advance(createJob(),105)));assert.equal(advance(after,120).events.length,1);
 assert.throws(()=>configure({...defaults,radiusMm:2,couponThicknessUm:250}),/3%/);
});
