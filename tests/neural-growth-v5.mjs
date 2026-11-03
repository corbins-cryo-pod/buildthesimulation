import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {createExperiment,stepSimulation,intervene,measure,restoreSimulation,electrical,csv} from '../public/labs/neural-growth-v5/engine/experiments.js';
import {PROFILES} from '../public/labs/neural-growth-v5/engine/profiles.js';
import {createField,advanceField} from '../public/labs/neural-growth-v5/engine/environment.js';
import {advancePhysiology,cargoAudit} from '../public/labs/neural-growth-v5/engine/physiology.js';
import {passiveCable} from '../public/labs/neural-growth-v5/engine/cable.js';
import {exportSWC} from '../public/labs/neural-growth-v5/engine/core.js';
import {registerNeuriteContact,advanceConnectivity,runTransmissionAssay} from '../public/labs/neural-growth-v5/engine/connectivity.js';
import {prepareNeuriteGraph,neuriteForces} from '../public/labs/neural-growth-v5/engine/neurite-mechanics.js';
import {add,cross,length,distance} from '../public/labs/neural-growth-v5/engine/geometry.js';

test('V5: all ten preparations grow, retain independent state, and restore',()=>{
  const states=PROFILES.map(p=>createExperiment(p.id));
  for(const s of states){stepSimulation(s,4);const m=measure(s);assert.equal(s.timeHours,4);assert.ok(m.totalLength>0);assert.ok(m.cargoResidual<1e-7);assert.ok(Math.abs(m.totalLength-m.minorLength-m.totalAxonLength-m.totalDendriteLength)<1e-8);assert.deepEqual(restoreSimulation(s),s);}
  assert.equal(states.find(s=>s.config.profile==='arm').tips.filter(t=>t.active).length,1);
  assert.equal(states.find(s=>s.config.profile==='repair').cells.every(c=>c.mechanics.initialPosition[0]<-150),true);
});

test('V5: a complete checkpoint reproduces continuation exactly',()=>{
  const a=createExperiment('first',{seed:123});stepSimulation(a,6);const b=restoreSimulation(JSON.stringify(a));
  for(const s of [a,b]){intervene(s,{type:'parameter',key:'actin',value:.6});stepSimulation(s,2);}
  assert.deepEqual(a,b);assert.notDeepEqual(a.cells[0].position,createExperiment('first',{seed:124}).cells[0].position);
});

test('V5: transection removes distal topology, recycles material, and resumes',()=>{
  const s=createExperiment('arm');stepSimulation(s,10);const before=measure(s).totalLength,initialLost=s.cells[0].cargo.lost;
  intervene(s,{type:'cut',cellId:0});assert.ok(measure(s).totalLength<before);assert.ok(s.cells[0].cargo.lost>initialLost);assert.equal(s.tips.filter(t=>t.active).length,1);restoreSimulation(s);
  stepSimulation(s,2);restoreSimulation(s);assert.ok(measure(s).cargoResidual<1e-7);assert.ok(s.events.some(e=>e.type==='transection'));
  for(const seg of s.segments.filter(s=>s.alive&&s.parentId>=0))assert.ok(s.segments[seg.parentId].alive);
});

test('V5: zero-speed transport does not deliver queued material',()=>{
  const s=createExperiment('arm',{transportSpeed:0,cargoRate:0,excitation:'tonic'}),tip=s.tips[0],stock=tip.cargo;
  for(let i=0;i<20;i++)advancePhysiology(s,.05);
  assert.equal(tip.cargo,stock);assert.ok(s.cells[0].cargo.parcels.length>0);assert.ok(Math.abs(cargoAudit(s,s.cells[0]).residual)<1e-8);
  s.config.transportSpeed=120;for(let i=0;i<20;i++)advancePhysiology(s,.05);assert.ok(tip.cargo>stock);assert.ok(Math.abs(cargoAudit(s,s.cells[0]).residual)<1e-8);
});

test('V5: material is conserved through branch growth and retraction',()=>{
  const s=createExperiment('branch',{cargoRate:0});stepSimulation(s,12);
  intervene(s,{type:'parameter',key:'actin',value:0});stepSimulation(s,4);
  const a=cargoAudit(s,s.cells[0]);assert.equal(a.supplied,0);assert.ok(a.incorporated+a.lost<=200+1e-7);assert.ok(Math.abs(a.residual)<1e-7);restoreSimulation(s);
});

test('V5: optional excitation models preserve valid state',()=>{
  const s=createExperiment('arm');for(const value of ['packets','tonic','excitable','oscillator']){intervene(s,{type:'parameter',key:'excitation',value});stepSimulation(s,2);restoreSimulation(s);if(value!=='packets')assert.equal(s.waves.length,0);}
  intervene(s,{type:'activate',cellId:0});assert.equal(s.segments[s.tips.find(t=>t.active).segmentId].excitation.a,1);
});

test('V5: invalid settings and corrupted checkpoints are rejected without mutation',()=>{
  const s=createExperiment('first'),original=JSON.stringify(s);
  for(const action of [{type:'parameter',key:'actin',value:NaN},{type:'parameter',key:'maxSegments',value:999},{type:'parameter',key:'excitation',value:'magic'}])assert.throws(()=>intervene(s,action));
  assert.equal(JSON.stringify(s),original);
  const bad=structuredClone(s);bad.cells[0].cargo.free++;assert.throws(()=>restoreSimulation(bad),/ledger/i);
  const gel=createExperiment('gel');gel.tissue.field.values[0]=-1;assert.throws(()=>restoreSimulation(gel),/field/i);
  const old=structuredClone(s);old.version='cell-growth/4.0.0';assert.throws(()=>restoreSimulation(old),/different engine/i);
  assert.throws(()=>createExperiment('first',{unrecognized:1}),/Unknown parameter/);
});

test('V5: segment exhaustion halts with an explicit computational limit',()=>{
  const s=createExperiment('branch',{maxSegments:100,excitation:'tonic'});stepSimulation(s,48);
  assert.ok(s.limits.reached);assert.equal(s.limits.reason,'Segment budget reached');assert.ok(s.timeHours<48);assert.ok(s.segments.length<=100);
  const t=s.timeHours;stepSimulation(s,1);assert.equal(s.timeHours,t);restoreSimulation(s);
});

test('V5: no-flux diffusion conserves cue and preserves positivity',()=>{
  const f=createField({bounds:{min:[0,0,0],max:[60,60,60]}},10);f.values[0]=1;
  advanceField(f,2,20000,0);assert.ok(f.values.every(v=>v>=0));assert.ok(Math.abs(f.values.reduce((a,b)=>a+b,0)-1)<1e-11);
});

test('V5: source/decay agrees with the analytic uniform solution at different steps',()=>{
  const make=()=>{const f=createField({bounds:{min:[0,0,0],max:[40,40,40]}},10);f.values.fill(.3);f.sources.fill(.8);return f;};
  const a=make(),b=make();advanceField(a,3,1800,.2);for(let i=0;i<60;i++)advanceField(b,.05,1800,.2);
  const exact=.3*Math.exp(-.2*3)+.8/.2*(1-Math.exp(-.2*3));for(const f of [a,b])assert.ok(Math.max(...f.values.map(v=>Math.abs(v-exact)))<1e-11);
});

test('V5: fields use physical time and cue-source inhibition changes the field',()=>{
  const a=createExperiment('gel'),b=restoreSimulation(a);intervene(b,{type:'parameter',key:'fieldSource',value:0});
  for(const s of [a,b])stepSimulation(s,1);assert.ok(a.tissue.field.values.some(v=>v>0));assert.ok(b.tissue.field.values.every(v=>v===0));assert.ok(Math.abs(a.tissue.field.timeHours-a.timeHours)<1e-9);
});

test('V5: a frozen passive cable stays at rest with zero stimulus',()=>{
  const s=createExperiment('arm');stepSimulation(s,6);const original=JSON.stringify(s),a=passiveCable(s,0,{currentPA:0});
  assert.ok(a.samples.every(x=>Math.abs(x.somaMV+65)<1e-9&&Math.abs(x.distalMV+65)<1e-9));assert.equal(JSON.stringify(s),original);
});

test('V5: passive soma agrees with the analytic RC charging solution',()=>{
  const s=createExperiment('first'),a=passiveCable(s,0,{dtMs:.025}),g=s.cells[0].membrane.area*.001,c=s.cells[0].membrane.area*.01;
  const sample=a.samples.find(x=>x.timeMs>=40),exact=-65+10/g*(1-Math.exp(-(sample.timeMs-20)*g/c));assert.ok(Math.abs(sample.somaMV-exact)<.006);
});

test('V5: halving the passive cable step converges on the grown tree',()=>{
  const s=createExperiment('arm');stepSimulation(s,6);const out=[.1,.05,.025].map(dtMs=>passiveCable(s,0,{dtMs}));
  const at=a=>a.samples.find(s=>s.timeMs>=40).distalMV,coarse=Math.abs(at(out[0])-at(out[2])),fine=Math.abs(at(out[1])-at(out[2]));assert.ok(fine<coarse);assert.ok(fine<.01);
});

test('V5: network and passive assays never mutate growth; absent edges transmit nothing',()=>{
  const s=createExperiment('pair');stepSimulation(s,2);const original=JSON.stringify(s),a=electrical(s);
  assert.equal(JSON.stringify(s),original);assert.equal(a.blocked.deliveries.length,0);assert.equal(a.enabled.edges.length,0);assert.equal(a.enabled.deliveries.length,0);assert.deepEqual(a.enabled.spikes,a.blocked.spikes);assert.ok(a.enabled.spikes.length>0);
});

test('V5: CSV labels physical units and SWC references only live parents',()=>{
  const s=createExperiment('arm');stepSimulation(s,4);intervene(s,{type:'cut',cellId:0});const swc=exportSWC(s).split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>l.trim().split(/\s+/).map(Number));
  const ids=new Set(swc.map(r=>r[0]));for(const r of swc)assert.ok(r[6]===-1||ids.has(r[6]));assert.match(csv(s),/^timeHours,totalLength,minorLength/);assert.ok(swc.length>1);assert.equal(Number(csv(s).trim().split('\n').at(-1).split(',')[1]),measure(s).totalLength);
});

test('V5: a contact matures before transmission, and cutting it abolishes transmission',()=>{
  const s=createExperiment('pair',{motility:0,branching:0});for(const c of s.cells){c.stage='maturing';c.ageHours=60;}
  const a=s.segments.find(n=>n.cellId===0),b=s.segments.find(n=>n.cellId===1),tip=s.tips.find(t=>t.segmentId===a.id);
  Object.assign(a,{kind:'axon',start:[0,0,0],end:[10,0,0],radius:.3});Object.assign(b,{kind:'dendrite',start:[5,0,1],end:[5,0,10],radius:.3});tip.kind='axon';tip.direction=[-1,0,0];
  const contact=registerNeuriteContact(s,tip,b.id,[5,0,.5]);assert.equal(contact.status,'apposition');assert.equal(runTransmissionAssay(s).edges.length,0);
  for(let i=0;i<480;i++){s.timeHours+=.05;advanceConnectivity(s,.05);}
  assert.equal(contact.status,'functional');const on=runTransmissionAssay(s),off=runTransmissionAssay(s,{transmission:false});assert.ok(on.deliveries.length>0);assert.ok(on.cells[1].peakDepolarizationMV>.1);assert.equal(off.deliveries.length,0);assert.equal(off.cells[1].peakDepolarizationMV,0);
  intervene(s,{type:'cut',tipId:tip.id});assert.equal(contact.status,'lost');assert.equal(contact.candidate,false);assert.equal(runTransmissionAssay(s).deliveries.length,0);
});

test('V5: shaft mechanics match energy gradients and conserve internal force and torque',()=>{
  const segments=[{id:0,parentId:-1,start:[0,0,0],end:[3,0,0],anchorVertex:0},{id:1,parentId:0,start:[3,0,0],end:[6,1,0]},{id:2,parentId:1,start:[6,1,0],end:[8,3,0]}].map(s=>({...s,cellId:0,radius:.5,alive:true,ageHours:12}));
  const sim={config:{neuriteCoupling:1,somaSettlement:1,adhesion:.7},segments,contacts:[],world:{planar:true}},cell={id:0},graph=prepareNeuriteGraph(sim,cell);
  segments[0].end[0]+=.2;segments[1].start=[...segments[0].end];segments[1].end[2]=.3;segments[2].start=[...segments[1].end];
  const f=neuriteForces(sim,cell,graph,false),eps=1e-5;
  const move=(id,k,v)=>{if(id<0)graph.segments[0].start[k]+=v;else{graph.byId.get(id).end[k]+=v;for(const s of graph.segments)if(s.parentId===id)s.start[k]+=v;}};
  for(const id of [-1,0,1,2])for(let k=0;k<3;k++){move(id,k,eps);const hi=neuriteForces(sim,cell,graph,false).energy;move(id,k,-2*eps);const lo=neuriteForces(sim,cell,graph,false).energy;move(id,k,eps);assert.ok(Math.abs((id<0?f.roots.get(0):f.nodes.get(id))[k]+(hi-lo)/(2*eps))<1e-6);}
  let net=[...f.roots.get(0)],torque=cross(graph.segments[0].start,f.roots.get(0));for(const s of graph.segments){net=add(net,f.nodes.get(s.id));torque=add(torque,cross(s.end,f.nodes.get(s.id)));}assert.ok(length(net)<1e-7);assert.ok(length(torque)<1e-7);
});

test('V5: worker advance, compare, export and rewind use real saved states',async()=>{
  const url=new URL('../public/labs/neural-growth-v5/worker.js',import.meta.url).href;
  const worker=new Worker(`const {parentPort,workerData}=require('node:worker_threads');globalThis.self=globalThis;globalThis.postMessage=d=>parentPort.postMessage(d);import(workerData).then(()=>{parentPort.on('message',data=>self.onmessage({data}));postMessage({type:'ready'});});`,{eval:true,workerData:url});
  const wait=(predicate)=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{worker.off('message',on);reject(Error('Worker timeout'));},15000);function on(d){if(d.type==='error'){clearTimeout(timeout);worker.off('message',on);reject(Error(d.message));}else if(predicate(d)){clearTimeout(timeout);worker.off('message',on);resolve(d);}}worker.on('message',on);});
  const command=async(d,p)=>{const pending=wait(p);worker.postMessage(d);return pending;};
  try{await wait(d=>d.type==='ready');await command({type:'init',profile:'arm'},d=>d.type==='state');
    const before=await command({type:'advance',hours:2},d=>d.type==='state'&&!d.busy&&d.state.timeHours===2);
    const compared=await command({type:'compare',hours:1,action:{type:'parameter',key:'transportSpeed',value:0}},d=>d.type==='comparison');assert.equal(compared.result.endHours,3);
    const saved=await command({type:'export',format:'json'},d=>d.type==='export');assert.deepEqual(JSON.parse(saved.content),before.state);
    const rewound=await command({type:'rewind',index:0},d=>d.type==='state');assert.equal(rewound.state.timeHours,0);assert.ok(rewound.state.segments.length<before.state.segments.length);
  }finally{await worker.terminate();}
});
