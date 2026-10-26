import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation,stepSimulation,serializeSimulation,restoreSimulation} from '../src/lib/cell-growth/engine.js';
import {registerNeuriteContact,advanceConnectivity,contactBondLoads,contactSteering,cellCueAt,runTransmissionAssay,ELECTRICAL_ASSAY,contactPersists} from '../src/lib/cell-growth/connectivity.js';
import {prepareNeuriteGraph,neuriteForces,settlementGain} from '../src/lib/cell-growth/neurite-mechanics.js';
import {sampleFilopodia} from '../src/lib/cell-growth/exploration.js';
import {add,sub,scale,length,distance,cross,SpatialHash} from '../src/lib/cell-growth/geometry.js';
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
function fixture(){
  const sim=createSimulation({cellCount:2,source:'immature',motility:0,branching:0,growthPulses:0,noise:0});
  for(const c of sim.cells){c.stage='maturing';c.ageHours=60;c.membrane.lastSolveHours=1e6;}
  const a=sim.segments.find(s=>s.cellId===0),b=sim.segments.find(s=>s.cellId===1);
  Object.assign(a,{kind:'axon',start:[0,0,0],end:[10,0,0],radius:.3});
  Object.assign(b,{kind:'dendrite',start:[5,0,1],end:[5,0,10],radius:.3});
  const tip=sim.tips.find(t=>t.segmentId===a.id);tip.kind='axon';tip.direction=[-1,0,0];
  return {sim,a,b,tip};
}
function mature(sim,hours=48,dt=.05){for(let t=0;t<hours-1e-9;t+=dt){sim.timeHours+=dt;advanceConnectivity(sim,dt);}}
function contactFixture(){const f=fixture();f.contact=registerNeuriteContact(f.sim,f.tip,f.b.id,[5,0,.5]);return f;}

test('crossing geometry alone never creates a synapse; self and same-kind contacts are excluded',()=>{
  const {sim,a,b,tip}=fixture();mature(sim);assert.equal(sim.contacts.length,0);
  b.kind='axon';assert.equal(registerNeuriteContact(sim,tip,b.id,[5,0,0]),null);
  b.kind='dendrite';b.cellId=0;assert.equal(registerNeuriteContact(sim,tip,b.id,[5,0,0]),null);
});
test('recognition needs expressed organizers/receptivity, not only a nearby soma',()=>{
  const {sim,b,tip}=fixture();sim.cells[0].identity.organizer=0;assert.equal(registerNeuriteContact(sim,tip,b.id,[5,0,1]),null);
  sim.cells[0].identity.organizer=1;sim.cells[1].identity.receptivity=0;assert.equal(registerNeuriteContact(sim,tip,b.id,[5,0,1]),null);
});
test('a local physical encounter progresses through distinct contact, structure and transmission states',()=>{
  const {sim,contact,a,b,tip}=contactFixture();assert.equal(contact.status,'apposition');
  for(let i=0;i<10;i++)registerNeuriteContact(sim,tip,b.id,[5,0,.5]);assert.equal(sim.contacts.length,1);near(contact.dwellHours,0);
  mature(sim,.5);assert.equal(contact.status,'candidate');assert.equal(contact.conductanceNS,0);
  mature(sim,3);assert.equal(contact.status,'structural');assert.equal(contact.conductanceNS,0);
  mature(sim,20);assert.equal(contact.status,'functional');assert.ok(contact.conductanceNS>0);
  assert.ok(a.hasContactSite&&b.hasContactSite);
});
test('maturation needs support; turning off adhesion or losing a shaft removes transmission',()=>{
  const noSupport=contactFixture();noSupport.sim.config.synapticSupport=0;mature(noSupport.sim);assert.equal(noSupport.contact.status,'candidate');assert.equal(noSupport.contact.conductanceNS,0);
  for(const why of ['adhesion','shaft','separation']){const {sim,b,contact}=contactFixture();mature(sim);if(why==='adhesion')sim.config.cellAdhesion=0;if(why==='shaft')b.alive=false;if(why==='separation'){b.start[2]+=10;b.end[2]+=10;}mature(sim,.05);assert.equal(contact.status,'lost');assert.equal(contact.conductanceNS,0);}
});
test('contact bonds exert equal and opposite distributed loads and break at excessive separation',()=>{
  const {sim,b,contact}=contactFixture();mature(sim,1);b.start[2]+=.25;b.end[2]+=.25;
  const loads=contactBondLoads(sim);assert.equal(loads.length,2);assert.ok(length(loads[0].force)>0);near(length(add(loads[0].force,loads[1].force)),0);
  b.start[2]+=3;b.end[2]+=3;assert.equal(contactPersists(sim,contact),false);assert.deepEqual(contactBondLoads(sim),[]);
});
test('finite filopodia identify encountered shafts and never sense a remote partner',()=>{
  const {sim,a,b,tip}=fixture();a.end=[10,0,0];tip.direction=[1,0,0];tip.radius=.4;
  for(const c of sim.cells)c.position=[-100-c.id*50,0,-100];
  for(const p of tip.exploration.probes)Object.assign(p,{angle:0,length:5,target:5,remaining:1});
  for(const s of sim.segments)if(s!==a&&s!==b)s.alive=false;
  Object.assign(b,{start:[14,0,-5],end:[14,0,5]});
  const index=new SpatialHash(16);index.insert(b.id,b.start,b.end,b.radius);
  sampleFilopodia(sim,tip,index,0);assert.ok(tip.filopodia.some(p=>p.targetSegmentId===b.id));assert.equal(sim.contacts.length,1);assert.equal(sim.contacts[0].via,'filopodium');
  assert.ok(contactSteering(sim,tip)[0]>0);
  sim.contacts=[];b.start[0]=40;b.end[0]=40;const far=new SpatialHash(16);far.insert(b.id,b.start,b.end,b.radius);sampleFilopodia(sim,tip,far,0);assert.equal(sim.contacts.length,0);
});
test('optional chemical guidance decays with distance, saturates, and follows receptor sign',()=>{
  const {sim}=fixture();const cell=sim.cells[0];sim.cells[1].position=[0,0,0];
  assert.deepEqual(cellCueAt(sim,cell,[-10,0,0]).direction,[0,0,0]);
  sim.config.cellSignals=1;const close=cellCueAt(sim,cell,[-10,0,0]),far=cellCueAt(sim,cell,[-200,0,0]);assert.ok(close.concentration>far.concentration);assert.ok(close.direction[0]>0);assert.ok(close.occupancy<1);
  cell.identity.cueAttraction=0;cell.identity.cueRepulsion=1;assert.ok(cellCueAt(sim,cell,[-10,0,0]).direction[0]<0);
  sim.cells[1].identity.cueSecretion=0;near(cellCueAt(sim,cell,[-10,0,0]).concentration,0);
});
test('mature contacts transmit a delayed postsynaptic response in the frozen electrical assay',()=>{
  const {sim}=contactFixture();mature(sim);const before=JSON.stringify(sim),on=runTransmissionAssay(sim),off=runTransmissionAssay(sim,{transmission:false});
  assert.ok(on.spikes.some(s=>s.cellId===0));assert.ok(on.deliveries.length>0);assert.ok(on.cells[1].peakDepolarizationMV>.1);near(off.cells[1].peakDepolarizationMV,0);
  assert.ok(on.deliveries[0].timeMs>=on.spikes[0].timeMs+ELECTRICAL_ASSAY.delayMs-1e-8);assert.equal(JSON.stringify(sim),before);
  const theoretical=20-20*Math.log(1-15/(220/5));near(on.spikes[0].timeMs,theoretical,.06);
});
test('an apposition cannot transmit and electrical refinement preserves the response',()=>{
  const {sim}=contactFixture();const early=runTransmissionAssay(sim);assert.equal(early.edges.length,0);near(early.cells[1].peakDepolarizationMV,0);
  mature(sim);const coarse=runTransmissionAssay(sim,{dtMs:.1}),fine=runTransmissionAssay(sim,{dtMs:.025});near(coarse.cells[1].peakDepolarizationMV,fine.cells[1].peakDepolarizationMV,.04);
});
test('saved identity, neurite material and contact maturation are validated, and resume deterministically',()=>{
  const sim=createSimulation({source:'immature',cellCount:1,motility:.3});stepSimulation(sim,.5);const restored=restoreSimulation(serializeSimulation(sim));stepSimulation(sim,.2);stepSimulation(restored,.2);assert.deepEqual(restored,sim);
  for(const mutate of [s=>delete s.cells[0].identity,s=>s.segments[0].material.restLength=-1,s=>s.segments[0].material.anchor=[NaN,0,0]]){const bad=serializeSimulation(sim);mutate(bad);assert.throws(()=>restoreSimulation(bad));}
});

function mechanicsFixture(){
  const segments=[{id:0,parentId:-1,start:[0,0,0],end:[3,0,0],anchorVertex:0},{id:1,parentId:0,start:[3,0,0],end:[6,1,0]},{id:2,parentId:1,start:[6,1,0],end:[8,3,0]}].map(s=>({...s,cellId:0,radius:.5,alive:true,ageHours:12}));
  const sim={config:{neuriteCoupling:1,somaSettlement:1,adhesion:.7},segments,contacts:[],world:{planar:true}},cell={id:0};const graph=prepareNeuriteGraph(sim,cell);
  segments[0].end[0]+=.2;segments[1].start=[...segments[0].end];segments[1].end[2]=.3;segments[2].start=[...segments[1].end];return {sim,cell,graph};
}
function moveJoint(graph,id,k,amount){if(id<0)graph.segments[0].start[k]+=amount;else{graph.byId.get(id).end[k]+=amount;for(const s of graph.segments)if(s.parentId===id)s.start[k]+=amount;}}
test('distributed axial/bending forces match an independent finite-difference energy gradient',()=>{
  const {sim,cell,graph}=mechanicsFixture(),f=neuriteForces(sim,cell,graph,false),eps=1e-5;
  for(const id of [-1,0,1,2])for(let k=0;k<3;k++){moveJoint(graph,id,k,eps);const hi=neuriteForces(sim,cell,graph,false).energy;moveJoint(graph,id,k,-2*eps);const lo=neuriteForces(sim,cell,graph,false).energy;moveJoint(graph,id,k,eps);near((id<0?f.roots.get(0):f.nodes.get(id))[k],-(hi-lo)/(2*eps),1e-6);}
});
test('internal neurite forces conserve total force and torque and transmit a restoring soma reaction',()=>{
  const {sim,cell,graph}=mechanicsFixture(),f=neuriteForces(sim,cell,graph,false);let net=[...f.roots.get(0)],torque=cross(graph.segments[0].start,f.roots.get(0));
  for(const s of graph.segments){net=add(net,f.nodes.get(s.id));torque=add(torque,cross(s.end,f.nodes.get(s.id)));}
  near(length(net),0);near(length(torque),0);assert.ok(f.roots.get(0)[0]>0);
  const g=settlementGain(sim,graph);assert.ok(g>0&&g<1);sim.config.adhesion=0;assert.equal(settlementGain(sim,graph),1);
});

test('neurite coupling prevents trailing soma roots even with settlement disabled',()=>{
 const config={cellCount:1,source:'immature',seed:101,motility:2,branching:0,growthPulses:0,noise:0,somaSettlement:0};
 const free=createSimulation({...config,neuriteCoupling:0}),coupled=createSimulation({...config,neuriteCoupling:1});stepSimulation(free,12);stepSimulation(coupled,12);
 const maxRoot=s=>Math.max(...s.segments.filter(n=>n.alive&&n.parentId<0).map(n=>distance(n.start,n.end)));
 assert.ok(maxRoot(free)>15);assert.ok(maxRoot(coupled)<6);assert.ok(coupled.cells[0].mechanics.displacement>1,'coupling must not implement an absolute soma freeze');
 for(const s of coupled.segments.filter(s=>s.alive&&s.parentId>=0))near(distance(s.start,coupled.segments[s.parentId].end),0);
 const m=coupled.cells[0].membrane;near(m.reserve*m.reserveCapacity,m.reserveCapacity+m.suppliedArea+m.recycledArea-m.usedArea,1e-6);
});
test('inhibitory output hyperpolarizes a connected target in the reduced assay',()=>{
 const {sim}=contactFixture();sim.cells[0].identity.transmitter='inhibitory';mature(sim);const result=runTransmissionAssay(sim);
 assert.ok(result.cells[1].peakHyperpolarizationMV<-.05);near(result.cells[1].peakDepolarizationMV,0);
});

test('coupled joint movement preserves daughter continuity and cannot sweep through a thin solid', async()=>{
 const {advanceNeuriteNodes}=await import('../src/lib/cell-growth/neurite-mechanics.js');
 const {sim,cell,graph}=mechanicsFixture();
 Object.assign(cell,{position:[-100,0,0],mechanics:{collisionRadius:5},membrane:{reserve:1,reserveCapacity:10000,usedArea:0,recycledArea:0}});
 sim.cells=[cell];sim.tips=[];sim.world={planar:false,bounds:{min:[-200,-200,-200],max:[200,200,200]},obstacles:[{shape:'box',position:[3.8,0,0],size:[.02,20,20]}]};
 // Only a root and its daughter: both begin on the near side of the wall.
 sim.segments=graph.segments.slice(0,2);sim.segments[0].end=[3,0,0];sim.segments[1].start=[3,0,0];sim.segments[1].end=[2,2,0];
 for(const s of sim.segments){s.material.restLength=distance(s.start,s.end);s.material.anchor=[...s.end];}
 const g=prepareNeuriteGraph(sim,cell),hash=new SpatialHash(16);for(const s of g.segments)hash.insert(s.id,s.start,s.end,s.radius);
 const forces={nodes:new Map([[0,[1e6,0,0]],[1,[0,0,0]]]),roots:new Map(),energy:0};
 advanceNeuriteNodes(sim,cell,g,forces,1,hash);
 assert.ok(sim.segments[0].end[0]>3,'a safe partial move is possible');
 assert.ok(sim.segments[0].end[0]+.5<3.79,'finite-radius joint cannot tunnel across the wall');
 near(distance(sim.segments[0].end,sim.segments[1].start),0);
 const m=cell.membrane;near(m.reserve*m.reserveCapacity,m.reserveCapacity+m.recycledArea-m.usedArea,1e-6);
});

test('retraction retains a material contact until its bearing shaft is withdrawn',async()=>{
 const {retractContactSites,contactAnchors}=await import('../src/lib/cell-growth/connectivity.js');
 const {sim,a,contact}=contactFixture();mature(sim);const point=contactAnchors(sim,contact).p;
 retractContactSites(sim,a,10,7.5);a.end=[7.5,0,0];near(distance(contactAnchors(sim,contact).p,point),0);assert.equal(contact.status,'functional');
 retractContactSites(sim,a,7.5,4.5);a.end=[4.5,0,0];assert.equal(contact.status,'lost');assert.equal(contact.conductanceNS,0);assert.match(contact.lostReason,/retracted/);
});

test('stress-free deposited material does not inherit a distant substrate tether',()=>{
 const sim=createSimulation({source:'immature',cellCount:1,branching:0,noise:0,growthPulses:0});
 sim.cells[0].membrane.lastSolveHours=1e6;stepSimulation(sim,2);
 const graph=prepareNeuriteGraph(sim,sim.cells[0]);assert.ok(graph.segments.length>10);
 for(const s of graph.segments)s.material.adhesion=.5;
 const f=neuriteForces(sim,sim.cells[0],graph);
 assert.ok(Math.max(...[...f.nodes.values()].map(length))<1e-7,'deposition alone must not generate an adhesive recoil load');
});
