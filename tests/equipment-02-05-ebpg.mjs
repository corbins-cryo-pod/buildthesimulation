import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,example,frame,solve,estimate,doseAt,pointAcceptance,advance,exportResult} from '../public/equipment/02-05/solver.mjs';
import {buildParts,model} from '../public/equipment/02-05/model-source.mjs';
const near=(x,y,t)=>assert.ok(Math.abs(x-y)<=t, x+' vs '+y+' tolerance '+t);
const p={...example,rectangles:[{id:'reference',x:-.5,y:-.5,w:1,h:1,factor:1}]};
test('02-05: independently derived charge and beam-on time',()=>{
 const c={...defaults,dose:100,current:1};
 const t=estimate(p,c);near(t.chargeC,1e-12,1e-22);near(t.beamOnS,.001,1e-12);near(t.shots,40000,0);near(t.minDwellNs,25,1e-8);
 near(estimate(p,{...c,current:2}).beamOnS,.0005,1e-12);
});
test('02-05: padded normalized point superposition and conservation',()=>{
 const a=pointAcceptance();assert.equal(a.pass,true);near(a.combined,2,1e-6);near(a.combined,a.isolated,1e-10);
});
test('02-05: independent exact Gaussian square response at center',()=>{
 // For a square of width twice alpha, with eta=0, the center is erf(1)^2.
 const q={...example,rectangles:[{id:'square',x:-.007,y:-.007,w:.014,h:.014,factor:1}]};
 const c={...defaults,eta:0,dose:100};
 near(doseAt(q,c,0,0),71.0144692600,0.0001);
});
test('02-05: two distinct vectors sum, and current does not change dose map',()=>{
 const c=defaults,q={...p,rectangles:[{id:'second',x:.15,y:.3,w:.08,h:.1,factor:.5}]};
 const a=solve(p,c),b=solve(q,c),ab=solve({...p,rectangles:[...p.rectangles,...q.rectangles]},c),fast=solve(p,{...c,current:2});
 for(let i=0;i<a.map.length;i++){near(ab.map[i],a.map[i]+b.map[i],1e-10);near(fast.map[i],a.map[i],1e-10);}
 near(fast.timing.beamOnS,a.timing.beamOnS/2,1e-12);
});
test('02-05: ready example and output contract',()=>{
 const a=solve(example,defaults);assert.equal(a.map.length,frame.n**2);assert.ok(a.peak>400);assert.ok(a.clearedUm2>0);assert.ok(a.contour.length>0);
 const e=exportResult(example,defaults,a,'test');assert.equal(e.sample.parentRevision,'r0');assert.equal(e.sample.state,'exposed, undeveloped');assert.equal(e.dose.length,65536);assert.equal(e.origin,'simulated');
});
test('02-05: incompatible sample, field, duplicate ID and fast dwell rejected',()=>{
 assert.throws(()=>solve({...p,substrate:'GaAs'},defaults),/Si chip/);
 assert.throws(()=>solve({...p,rectangles:[{...p.rectangles[0],x:500}]},defaults),/field/);
 assert.throws(()=>solve({...p,rectangles:[...p.rectangles,...p.rectangles]},defaults),/unique/);
 assert.throws(()=>solve(p,{...defaults,current:350}),/8 ns/);
});
test('02-05: chamber interlocks and exposure sequence',()=>{
 assert.throws(()=>advance('idle','write'),/Interlock/);
 assert.throws(()=>advance('open','pump'),/Interlock/);
 let state='idle';for(const a of ['vent','open','mount','align','seal','pump','transfer','write','finish','return','vent','unload'])state=advance(state,a);
 assert.equal(state,'unloaded');
});
test('02-05: glTF asset matches editable model, names and dimensional anchors',()=>{
 const a=JSON.parse(readFileSync(new URL('../public/equipment/02-05/ebpg5200.gltf',import.meta.url)));assert.deepEqual(a,model());
 const p=buildParts();assert.equal(new Set(p.map(x=>x.name)).size,p.length);
 for(const k of ['lock-door','sample-holder','xy-stage','chamber-cover','beam-indicator'])assert.ok(a.nodes.some(x=>x.name===k));
 assert.equal(p.filter(x=>x.name.startsWith('cassette-slot-')).length,10);
 for(const k of p.filter(x=>/^table-\d$/.test(x.name)))near(k.scale[0],.0762,1e-12);
 near(p.find(x=>x.name==='sample-chip').scale[0],.010,1e-12);
 assert.equal(Buffer.from(a.buffers[0].uri.split(',')[1],'base64').length,a.buffers[0].byteLength);
});
