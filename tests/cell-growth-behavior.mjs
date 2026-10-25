import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation,stepSimulation,serializeSimulation,restoreSimulation} from '../src/lib/cell-growth/engine.js';
import {createTipBehavior,advanceTipBehavior,plateDirection} from '../src/lib/cell-growth/behavior.js';
import {closestSegmentPoints,SpatialHash} from '../src/lib/cell-growth/geometry.js';

test('local growth episodes are asynchronous and integrate consistently across timestep partitions',()=>{
 const tips=Array.from({length:6},(_,i)=>({behavior:createTipBehavior(714,i,0)}));
 let mixed=false,retracted=false;
 for(let i=0;i<400;i++){
  const gains=tips.map(t=>advanceTipBehavior(t,.05));
  mixed ||= gains.some(g=>g>.8)&&gains.some(g=>g<.05);retracted ||= gains.some(g=>g<0);
 }
 assert.ok(mixed);assert.ok(retracted);
 const a={behavior:createTipBehavior(2,3,0)},b=structuredClone(a);let x=0,y=0;
 for(let i=0;i<100;i++)x+=advanceTipBehavior(a,.1)*.1;
 for(let i=0;i<400;i++)y+=advanceTipBehavior(b,.025)*.025;
 assert.ok(Math.abs(x-y)<1e-10);assert.equal(a.behavior.rng,b.behavior.rng);
});

test('saved episode, exploration and branch state resumes exactly; invalid episode imports fail',()=>{
 const s=createSimulation({source:'immature',cellCount:1,branching:3});stepSimulation(s,5);
 const b=restoreSimulation(serializeSimulation(s));stepSimulation(s,2);stepSimulation(b,2);assert.deepEqual(s,b);
 const bad=serializeSimulation(s);bad.tips[0].behavior.remaining=-1;assert.throws(()=>restoreSimulation(bad),/episode/);
});

test('plate growth crosses above a transverse shaft without shaft interpenetration',()=>{
 const s=createSimulation({source:'immature',cellCount:2,actin:2.5,tension:0,growthPulses:0,branching:0,noise:0,guidance:0,selfAvoidance:0,fasciculation:0,motility:0});s.world.obstacles=[];
 for(const c of s.cells){c.membrane.lastSolveHours=720;c.position=[-70,0,70+c.id*30];}
 const tip=s.tips[0],shaft=s.segments.find(n=>n.cellId===1);
 for(const t of s.tips)t.active=t===tip;
 for(const n of s.segments)n.alive=n.id===tip.segmentId||n===shaft;
 const root=s.segments[tip.segmentId];root.start=[-30,0,0];root.end=[-27.5,0,0];tip.direction=[1,0,0];tip.behavior.baseHeight=0;
 shaft.start=[0,0,-25];shaft.end=[0,0,25];
 stepSimulation(s,6);
 const tree=s.segments.filter(n=>n.alive&&n.cellId===0);
 assert.ok(tree.some(n=>n.end[0]>5),'growing process passes the crossing');
 const crossing=tree.find(n=>n.start[0]<=0&&n.end[0]>=0);assert.ok(crossing);assert.ok(crossing.end[1]>shaft.radius+crossing.radius);
 for(const n of tree)assert.ok(closestSegmentPoints(n.start,n.end,shaft.start,shaft.end).distance>=n.radius+shaft.radius-1e-7);
});

test('branching can leave a lateral bud behind an advancing tip and retains tree ancestry',()=>{
 const s=createSimulation({source:'immature',cellCount:1,branching:3,actin:1.5,seed:202,motility:0});s.world.obstacles=[];s.cells[0].membrane.lastSolveHours=720;
 stepSimulation(s,36);
 assert.ok(s.events.some(e=>e.type==='branch'&&e.mode==='lateral'));
 for(const n of s.segments.filter(n=>n.alive&&n.parentId>=0)){
  const p=s.segments[n.parentId];assert.ok(p.alive);assert.deepEqual(n.start,p.end);assert.ok(p.id<n.id);
 }
 assert.doesNotThrow(()=>restoreSimulation(serializeSimulation(s)));
});

test('plate routing does not climb its own nearby parent when cell segment IDs interleave',()=>{
 const parent={id:0,parentId:-1,cellId:0,alive:true,start:[-8,0,0],end:[-4,0,0],radius:1};
 const current={id:40,parentId:0,cellId:0,alive:true,start:[-4,0,0],end:[0,0,0],radius:1};
 const segments=[];segments[0]=parent;segments[40]=current;
 const sim={segments,world:{planar:true,bounds:{max:[100,15,100]}}},index=new SpatialHash(16);index.insert(0,parent.start,parent.end,1);
 const tip={segmentId:40,cellId:0,radius:2,behavior:{baseHeight:0}};
 assert.deepEqual(plateDirection(sim,tip,current.end,[1,0,0],index),[1,0,0]);
});
