import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation,stepSimulation,serializeSimulation,restoreSimulation} from '../src/lib/cell-growth/engine.js';
import {createExploration,advanceExploration,advanceActinWaves,waveDrive,shaftProfile,wavePosition} from '../src/lib/cell-growth/morphogenesis.js';
import {relaxYoungShafts} from '../src/lib/cell-growth/shaft-mechanics.js';
import {somaOutline,taperedPath} from '../src/lib/cell-growth/microscopy-render.js';
import {interpolateMorphology} from '../src/lib/cell-growth/presentation.js';
import {SpatialHash,distance} from '../src/lib/cell-growth/geometry.js';
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);

function packetFixture(){
 const segments=[
  {id:0,cellId:0,parentId:-1,start:[0,0,0],end:[100,0,0],alive:true,waveSource:{rng:1,remaining:100}},
  {id:1,cellId:0,parentId:0,start:[100,0,0],end:[100,0,100],alive:true},
  {id:2,cellId:0,parentId:0,start:[100,0,0],end:[100,0,-100],alive:true},
 ];
 return {timeHours:0,config:{growthPulses:1,actin:1,microtubules:1,seed:3},cells:[{stage:'immature'}],segments,
  tips:[1,2].map(id=>({active:true,segmentId:id,exploration:createExploration(5,id)})),
  waves:[{id:0,cellId:0,segmentId:0,offset:0,speed:150,amplitude:1,rng:9,bornHours:0}],counters:{wavesLaunched:1,waveArrivals:0}};
}

test('actin packets travel at finite speed along a bent tree and choose one daughter',()=>{
 const s=packetFixture();advanceActinWaves(s,.25);near(s.waves[0].offset,37.5);assert.equal(s.counters.waveArrivals,0);
 advanceActinWaves(s,.5);assert.equal(s.waves.length,1);assert.notEqual(s.waves[0].segmentId,0);near(s.waves[0].offset,12.5);
 const p=wavePosition(s,s.waves[0]);near(p[0],100);near(Math.abs(p[2]),12.5);
 advanceActinWaves(s,.6);assert.equal(s.waves.length,0);assert.equal(s.counters.waveArrivals,1);
 assert.equal(s.tips.filter(t=>t.exploration.arrivals===1).length,1);
});

test('wave transport is invariant to timestep partition on a fixed arbor',()=>{
 const a=packetFixture(),b=packetFixture();advanceActinWaves(a,.7);for(let i=0;i<7;i++)advanceActinWaves(b,.1);
 assert.equal(a.waves[0].segmentId,b.waves[0].segmentId);near(a.waves[0].offset,b.waves[0].offset);assert.equal(a.waves[0].rng,b.waves[0].rng);
});

test('wave sources are independently seeded, and each zero driver suppresses packets',()=>{
 const s=createSimulation({source:'immature',cellCount:1});for(const root of s.segments)root.waveSource={rng:root.id+21,remaining:0};
 advanceActinWaves(s,4);assert.ok(new Set(s.segments.map(n=>n.waveSource.remaining)).size>1);assert.ok(s.counters.waveArrivals>0);
 for(const key of ['actin','microtubules','growthPulses']){const f=packetFixture();f.config[key]=0;advanceActinWaves(f,.1);assert.equal(f.waves.length,0);assert.equal(f.counters.waveArrivals,0);}
});

test('the growth-episode control continuously blends the wave-dependent drive',()=>{
 const tip={exploration:{pulse:.2}},cell={stage:'immature'};
 const full=waveDrive(tip,cell,.8,1);near(waveDrive(tip,cell,.8,.5),(1+full)/2);assert.equal(waveDrive(tip,cell,.8,0),1);
 assert.ok(waveDrive({exploration:{pulse:1}},cell,.8,1)>full);
});

test('individual filopodia extend and retract independently without render-clock input',()=>{
 const tip={exploration:createExploration(8,4),status:'extending'};let mixed=false;
 for(let i=0;i<100;i++){const before=tip.exploration.probes.map(p=>p.length);advanceExploration(tip,.01,{actin:1});const deltas=tip.exploration.probes.map((p,j)=>p.length-before[j]);mixed ||= deltas.some(x=>x>0)&&deltas.some(x=>x<0);}
 assert.ok(mixed);assert.ok(new Set(tip.exploration.probes.map(p=>p.rng)).size===9);
 advanceExploration(tip,1,{actin:0});assert.ok(tip.exploration.probes.every(p=>p.length===0));
});

test('each filopodium and lamellar sector has a timestep-independent renewal stream',()=>{
 const a={exploration:createExploration(22,3),status:'extending'},b=structuredClone(a);
 advanceExploration(a,2,{actin:1});for(let i=0;i<200;i++)advanceExploration(b,.01,{actin:1});
 for(const key of ['sectors','probes'])for(let i=0;i<a.exploration[key].length;i++){
  const p=a.exploration[key][i],q=b.exploration[key][i];assert.equal(p.rng,q.rng);near(p.remaining,q.remaining);near(p.target,q.target);near(p.length??p.activity,q.length??q.activity);
 }
});

function shaftFixture(){
 const segments=[
  {id:0,parentId:-1,cellId:0,start:[-5,0,0],end:[0,0,0]},
  {id:1,parentId:0,cellId:0,start:[0,0,0],end:[3,0,3]},
  {id:2,parentId:1,cellId:0,start:[3,0,3],end:[6,0,0]},
 ].map(s=>({...s,alive:true,ageHours:1,branchOrder:0,radius:.2}));
 const sim={config:{adhesion:.4},segments,tips:[{active:true,segmentId:2}],cells:[{id:0,membrane:{reserve:.5,reserveCapacity:100,suppliedArea:0,usedArea:50,recycledArea:0}}],world:{bounds:{min:[-100,-100,-100],max:[100,100,100]},obstacles:[]},counters:{shaftRelaxations:0}};
 const index=new SpatialHash(16);for(const s of segments)index.insert(s.id,s.start,s.end,s.radius);return {sim,index};
}

test('young shafts relax continuously while preserving topology and membrane accounting',()=>{
 const {sim,index}=shaftFixture(),before=structuredClone(sim.segments);relaxYoungShafts(sim,.1,index);
 assert.ok(sim.segments[1].end[2]<3);assert.ok(distance(sim.segments[1].end,before[1].end)<=.060000001);
 assert.deepEqual(sim.segments[1].end,sim.segments[2].start);assert.deepEqual(sim.segments[0],before[0]);
 const m=sim.cells[0].membrane;near(m.reserve*m.reserveCapacity,m.reserveCapacity+m.suppliedArea+m.recycledArea-m.usedArea);
});

test('established shafts stay anchored and joint relaxation cannot sweep through a thin barrier',()=>{
 const mature=shaftFixture();mature.sim.segments[1].ageHours=13;const before=structuredClone(mature.sim.segments);relaxYoungShafts(mature.sim,1,mature.index);assert.deepEqual(mature.sim.segments,before);
 const blocked=shaftFixture();blocked.sim.world.obstacles=[{shape:'box',position:[3,0,1.9],size:[.1,2,.05]}];
 const p=structuredClone(blocked.sim.segments);relaxYoungShafts(blocked.sim,12,blocked.index);assert.deepEqual(blocked.sim.segments,p);
});

test('surface taper remains inside physical collision envelopes and continuous along an unbranched shaft',()=>{
 const s=createSimulation({source:'immature',cellCount:1,branching:0,motility:0});stepSimulation(s,4);const profiles=shaftProfile(s);
 for(const n of s.segments.filter(n=>n.alive)){
  const p=profiles.get(n.id);assert.ok(p.r0>0&&p.r1>0&&p.r0<=n.radius&&p.r1<=n.radius);
  const parent=s.segments[n.parentId];if(parent?.alive&&profiles.get(parent.id).r1<=n.radius)near(p.r0,profiles.get(parent.id).r1);
 }
});

test('soma silhouette uses mesh boundaries instead of projected interior vertices',()=>{
 const s=createSimulation({source:'immature',cellCount:1}),c=s.cells[0],project=p=>({x:p[0],y:p[2]});
 const outline=somaOutline(c,project);assert.ok(outline.length>=8&&outline.length<60);
 const minR=Math.min(...outline.map(p=>Math.hypot(p[0]-c.position[0],p[1]-c.position[2])));assert.ok(minR>c.radius*.8);
 const arcs=[];const mock={moveTo(){},lineTo(){},closePath(){},arc(...args){arcs.push(args);}};
 taperedPath(mock,{x:0,y:0},{x:10,y:0},1,.5);assert.equal(arcs.length,2);assert.ok(arcs.every(a=>a[5]===true));
});

test('presentation interpolation has exact endpoints and never changes solver or replay state',()=>{
 const a=createSimulation({source:'immature',cellCount:1,motility:0});stepSimulation(a,1);const b=serializeSimulation(a);stepSimulation(b,.2);
 const saved=JSON.stringify([a,b]),middle=interpolateMorphology(a,b,.5);assert.equal(interpolateMorphology(a,b,0),a);assert.equal(interpolateMorphology(a,b,1),b);near(middle.timeHours,1.1);assert.equal(JSON.stringify([a,b]),saved);
 for(const n of middle.segments.filter(s=>s.alive&&s.parentId>=0))assert.ok(distance(n.start,middle.segments[n.parentId].end)<1e-8);
});

test('displayed packets interpolate along a bent neurite rather than jumping or cutting corners',()=>{
 const before=packetFixture();Object.assign(before,{buds:[],config:{seed:1},timeHours:1,cells:[],tips:[]});
 before.waves[0].offset=80;
 const after=structuredClone(before);after.timeHours=2;after.waves[0].segmentId=1;after.waves[0].offset=30;
 const middle=interpolateMorphology(before,after,.5),position=wavePosition(middle,middle.waves[0]);
 near(position[0],100);near(position[2],5);assert.equal(middle.waves[0].segmentId,1);
 assert.equal(before.waves[0].offset,80);assert.equal(after.waves[0].offset,30);
 after.waves[0].id=5;after.waves[0].bornHours=1.75;
 assert.equal(interpolateMorphology(before,after,.5).waves.length,0);
});

test('branch buds and waves survive save/restore exactly, with malformed new state rejected',()=>{
 const a=createSimulation({source:'immature',cellCount:1,branching:3,seed:202,motility:0});stepSimulation(a,10);const b=restoreSimulation(serializeSimulation(a));stepSimulation(a,1);stepSimulation(b,1);assert.deepEqual(a,b);
 for(const change of [s=>delete s.counters.budsBorn,s=>s.tips[0].exploration.probes[0].rng=-1,s=>s.tips[0].exploration.sectors[0].remaining=-1,s=>s.tips[0].shape.height=NaN,s=>s.cells[0].budSource={rng:1,remaining:-1}]){const bad=serializeSimulation(a);change(bad);assert.throws(()=>restoreSimulation(bad));}
});

test('withdrawal ending at a branch junction cannot reactivate and move its parent',()=>{
 const sim=createSimulation({source:'immature',cellCount:1,actin:0,growthPulses:0,branching:0,noise:0,guidance:0,motility:0});
 const cell=sim.cells[0];cell.membrane.lastSolveHours=1e6;cell.position=[-50,0,0];
 const [parent,child,sister]=sim.segments;
 Object.assign(parent,{start:[0,0,0],end:[3,0,0],radius:.3});
 Object.assign(child,{parentId:parent.id,rootId:parent.id,start:[3,0,0],end:[3.15,0,0],radius:.3});
 Object.assign(sister,{parentId:parent.id,rootId:parent.id,start:[3,0,0],end:[3,0,5],radius:.3});
 for(const s of sim.segments)s.alive=[parent,child,sister].includes(s);
 const tip=sim.tips[0];for(const t of sim.tips)t.active=t===tip;
 Object.assign(tip,{segmentId:child.id,kind:'dendrite',direction:[1,0,0],mt:1,stallHours:3});
 stepSimulation(sim,.05);assert.equal(child.alive,false);assert.equal(tip.active,false);assert.equal(tip.segmentId,parent.id);
 sim.config.actin=3;stepSimulation(sim,.2);assert.deepEqual(parent.end,[3,0,0]);assert.deepEqual(sister.start,parent.end);
});
