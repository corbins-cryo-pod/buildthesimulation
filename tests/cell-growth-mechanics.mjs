import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation,stepSimulation,serializeSimulation,restoreSimulation,getMetrics,exportCSV} from '../src/lib/cell-growth/engine.js';
import {advanceCellMechanics,SHELL,passiveMembrane,surfaceGeometry,signedObstacle,MECHANICS} from '../src/lib/cell-growth/mechanics.js';
import {coneSurface} from '../src/lib/cell-growth/render-geometry.js';
import {add,sub,scale,dot,cross,unit,length,distance,pointSegmentDistance} from '../src/lib/cell-growth/geometry.js';
const close=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<=t,`${a} vs ${b}; tolerance ${t}`);
const make=(config={})=>{const s=createSimulation({source:'stem',cellCount:1,guidance:0,noise:0,branching:0,...config});s.world.obstacles=[];return s;};
const move=(cell,p)=>{const d=sub(p,cell.position);cell.position=[...p];cell.membrane.vertices=cell.membrane.vertices.map(v=>add(v,d));cell.nucleus.position=add(cell.nucleus.position,d);cell.mechanics.initialPosition=[...p];cell.mechanics.trail=[{timeHours:0,position:[...p]}];};
const withinNucleus=c=>{for(const [a,b,d]of c.membrane.triangles){const v=c.membrane.vertices,n=unit(cross(sub(v[b],v[a]),sub(v[d],v[a])));assert.ok(dot(sub(c.nucleus.position,v[a]),n)+c.nucleus.radius<.002,'nuclear sphere crosses cortex');}};

test('V2 shell has 162 physical vertices, closed oriented faces and Euler characteristic 2',()=>{
 const m=make().cells[0].membrane,edges=new Map();for(const f of m.triangles)for(let k=0;k<3;k++){const a=f[k],b=f[(k+1)%3],key=[a,b].sort((a,b)=>a-b).join(':');edges.set(key,(edges.get(key)||0)+1);}
 assert.equal(m.vertices.length,162);assert.equal(m.triangles.length,320);assert.equal(162-edges.size+320,2);assert.ok([...edges.values()].every(n=>n===2));assert.ok(surfaceGeometry(m.vertices).volume>0);
});

test('V2 membrane force is the negative independent finite-difference energy gradient',()=>{
 const s=make(),m=s.cells[0].membrane;m.vertices[27][0]+=.3;m.vertices[91][2]-=.18;
 const f=passiveMembrane(m,s.config).forces;
 for(let i=0;i<162;i+=13)for(let k=0;k<3;k++){const x=m.vertices[i][k],h=1e-5;m.vertices[i][k]=x+h;const a=passiveMembrane(m,s.config).energy;m.vertices[i][k]=x-h;const b=passiveMembrane(m,s.config).energy;m.vertices[i][k]=x;close(f[i][k],-(a-b)/(2*h),2e-5);}
});

test('V2 passive internal forces have zero resultant and zero torque',()=>{
 const s=make(),c=s.cells[0],p=passiveMembrane(c.membrane,s.config),force=[0,0,0],torque=[0,0,0];
 for(let i=0;i<p.forces.length;i++){for(let k=0;k<3;k++)force[k]+=p.forces[i][k];const t=cross(sub(c.membrane.vertices[i],c.position),p.forces[i]);for(let k=0;k<3;k++)torque[k]+=t[k];}
 assert.ok(length(force)<1e-7);assert.ok(length(torque)<1e-6);
});

test('V2 passive relaxation lowers energy and does not create lateral locomotion',()=>{
 const s=make({actin:0,microtubules:0,motility:0,adhesion:0}),c=s.cells[0],p=[...c.position],nucleusStart=[...c.nucleus.position],e=passiveMembrane(c.membrane,s.config).energy;
 stepSimulation(s,4);assert.ok(passiveMembrane(c.membrane,s.config).energy<e);assert.ok(Math.hypot(c.position[0]-p[0],c.position[2]-p[2])<.001);for(const k of [0,2])close(162*MECHANICS.vertexDrag*(c.position[k]-p[k])+MECHANICS.nucleusDrag*(c.nucleus.position[k]-nucleusStart[k]),0,1e-7);assert.ok(Math.abs(c.membrane.volumeStrain)<.025);assert.ok(c.membrane.minQuality>.5);
});

test('V2 polarized traction causes cell translation AND changing shape, with a lagging nucleus',()=>{
 const s=make(),c=s.cells[0];c.mechanics.polarity=[1,0,0];const start=[...c.position],shape=c.membrane.vertices.map(v=>sub(v,c.position));stepSimulation(s,4);
 assert.ok(c.position[0]-start[0]>3);assert.ok(Math.abs(c.position[2]-start[2])<.05);assert.ok(c.nucleus.position[0]<c.position[0]);
 assert.ok(Math.max(...c.membrane.vertices.map((v,i)=>distance(sub(v,c.position),shape[i])))>.3);withinNucleus(c);
 close(length(c.mechanics.netForce.map((x,k)=>x+c.mechanics.contactForce[k]-MECHANICS.vertexDrag*162*c.mechanics.velocity[k])),0,2e-6);
});

test('V2 substrate adhesion removes net motor traction at its zero limit',()=>{
 const none=make({adhesion:0}),normal=make();for(const s of [none,normal]){s.cells[0].mechanics.polarity=[1,0,0];stepSimulation(s,4);}
 assert.ok(none.cells[0].mechanics.displacement<.1);close(length(none.cells[0].mechanics.traction),0);assert.ok(normal.cells[0].mechanics.displacement>3);
});

test('V2 adhesion occupancy turns over rather than instantaneously resetting',()=>{
 const s=make();stepSimulation(s,2);const c=s.cells[0],before=[...c.membrane.adhesions];s.config.adhesion=0;stepSimulation(s,.05);assert.ok(c.membrane.adhesions.some(x=>x>0));assert.ok(c.membrane.adhesions.every((x,i)=>x<=before[i]));stepSimulation(s,5);assert.ok(c.mechanics.adhesionMean<.02);
});

test('V2 outer timestep refinement preserves the internally subcycled locomotion and shell geometry',()=>{
 const runs=[.05,.025,.0125].map(dtHours=>{const s=make({dtHours});s.cells[0].mechanics.polarity=[1,0,0];stepSimulation(s,4);return s.cells[0];});
 for(const c of runs.slice(0,2)){assert.ok(distance(c.position,runs[2].position)<.01);assert.ok(Math.abs(c.membrane.volume-runs[2].membrane.volume)/runs[2].membrane.volume<.001);}
});

test('V2 dense population adhesion can create a contact group, without a prescribed cluster',()=>{
 const run=cellAdhesion=>{const s=make({cellCount:2,motility:0,cellAdhesion});move(s.cells[0],[-10.5,0,0]);move(s.cells[1],[10.5,0,0]);stepSimulation(s,6);return s;};
 const sticking=run(1),separate=run(0);assert.equal(getMetrics(sticking).largestCluster,2);assert.equal(getMetrics(separate).largestCluster,1);
 assert.ok(distance(sticking.cells[0].position,sticking.cells[1].position)<distance(separate.cells[0].position,separate.cells[1].position)-1);
 const [a,b]=sticking.cells;assert.ok(distance(a.position,b.position)>=a.mechanics.collisionRadius+b.mechanics.collisionRadius-1e-7);
});

test('V2 grazing, narrow-gap and simultaneous solid contacts retain nonpenetrating shells',()=>{
 const s=make({motility:2}),c=s.cells[0];move(c,[0,0,0]);c.mechanics.polarity=[1,0,0];s.world.obstacles=[{id:'upper',shape:'box',position:[18,0,7],size:[2,30,5]},{id:'lower',shape:'box',position:[18,0,-7],size:[2,30,5]},{id:'grazing',shape:'sphere',position:[7,0,16],radius:6}];
 stepSimulation(s,12);for(const o of s.world.obstacles){assert.ok(signedObstacle(c.position,o).gap>=c.mechanics.collisionRadius-1e-6);for(const p of c.membrane.vertices)assert.ok(signedObstacle(p,o).gap>=-.000001);}
 withinNucleus(c);assert.ok(c.membrane.minQuality>=.1);assert.ok(c.mechanics.pathLength>1);assert.ok(c.position[0]<17);
});

test('V2 mature membrane attachments remain connected and their moving-root area is accounted',()=>{
 const s=createSimulation({cellCount:3,seed:25,source:'immature'});stepSimulation(s,12);
 for(const c of s.cells){for(const r of s.segments.filter(r=>r.alive&&r.parentId===-1&&r.cellId===c.id))close(distance(r.start,c.membrane.vertices[r.anchorVertex]),0,1e-9);const m=c.membrane;close(m.reserve*m.reserveCapacity,m.reserveCapacity+m.suppliedArea+m.recycledArea-m.usedArea,1e-6);withinNucleus(c);}
});

test('V2 full mechanics, mesh, nucleus, cortex and random state resume exactly',()=>{
 const a=make({cellCount:2});stepSimulation(a,2);const b=restoreSimulation(JSON.stringify(serializeSimulation(a)));stepSimulation(a,2);stepSimulation(b,2);assert.deepEqual(serializeSimulation(a),serializeSimulation(b));assert.match(exportCSV(a),/meanDisplacement/);
});

test('V2 import rejects malformed mechanical state before entering the solver',()=>{
 const saved=serializeSimulation(make());for(const change of [s=>s.cells[0].nucleus.radius=-1,s=>s.cells[0].membrane.adhesions[0]=2,s=>s.cells[0].membrane.restLengths[0]=0,s=>s.cells[0].membrane.triangles[0][0]=1,s=>s.cells[0].mechanics.collisionRadius=1,s=>delete s.config.bending]){const s=structuredClone(saved);change(s);assert.throws(()=>restoreSimulation(s));}
});

test('V2 growth-cone membrane is a closed finite-radius reconstruction of its solved rim',()=>{
 const s=createSimulation({cellCount:1,source:'immature'});stepSimulation(s,.5);const t=s.tips[0],g=coneSurface(t),edges=new Map();for(const f of g.triangles)for(let k=0;k<3;k++){const key=[f[k],f[(k+1)%3]].sort((a,b)=>a-b).join(':');edges.set(key,(edges.get(key)||0)+1);}
 assert.ok([...edges.values()].every(n=>n===2));assert.equal(g.vertices.length-edges.size+g.triangles.length,2);assert.ok(g.vertices.every(p=>Math.hypot(p[0],p[2])<=t.radius+1e-9));assert.ok(surfaceGeometry(g.vertices,g.triangles).volume>0);
});

test('V2 morphology metrics include measured branch angles and projected dendritic coverage',()=>{
 const s=createSimulation({cellCount:2,source:'immature',branching:2});stepSimulation(s,18);const metrics=getMetrics(s);for(const c of metrics.perCell){assert.ok(c.dendriticFieldArea>=0);assert.ok(c.branchAngles.every(a=>a>=0&&a<=180));assert.ok(c.displacement>=0);assert.ok(c.pathLength+1e-6>=c.displacement);}
});

test('V2 approaching foreign growth cones remain separate and stabilize without a prescribed target layout',()=>{
 const s=createSimulation({source:'immature',cellCount:2,guidance:0,noise:0,branching:0,actin:2,tension:0,cellAdhesion:1,selfAvoidance:0,fasciculation:0});s.world.obstacles=[];
 for(const t of s.tips)t.active=false;for(const n of s.segments)n.alive=false;
 const a=s.segments[0],b=s.segments.find(n=>n.cellId===1),ta=s.tips[0],tb=s.tips.find(t=>t.cellId===1);
 Object.assign(a,{start:[-12,0,0],end:[-4,0,0],radius:.5,kind:'axon',alive:true});Object.assign(b,{start:[12,0,0],end:[4,0,0],radius:.5,kind:'dendrite',alive:true});
 Object.assign(ta,{active:true,direction:[1,0,0],kind:'axon',mt:1});Object.assign(tb,{active:true,direction:[-1,0,0],kind:'dendrite',mt:1});
 s.cells.forEach((c,i)=>{c.position=[i?100:-100,0,0];c.ageHours=20;c.membrane.lastSolveHours=720;c.axonRootId=i?b.id:a.id;});
 for(let i=0;i<30;i++){stepSimulation(s,.05);assert.ok(distance(s.segments[ta.segmentId].end,s.segments[tb.segmentId].end)>=ta.radius+tb.radius-1e-7,'growth cone envelopes overlap');}
 assert.ok(s.contacts.some(c=>c.candidate));assert.ok([ta,tb].some(t=>t.status==='stabilized'));
});

test('V2 filopodial sensing stops at a thin barrier and at the modeled boundary',async()=>{
 const {sampleFilopodia}=await import('../src/lib/cell-growth/exploration.js');const {SpatialHash}=await import('../src/lib/cell-growth/geometry.js');
 const s=createSimulation({source:'immature',cellCount:1,actin:1}),t=s.tips[0],segment=s.segments[t.segmentId];segment.end=[0,0,0];t.direction=[1,0,0];t.radius=1;t.forces.membrane=0;
 const hash=new SpatialHash(16);s.world.obstacles=[{id:'thin',shape:'box',position:[2.5,0,0],size:[.1,5,1]}];sampleFilopodia(s,t,hash,1);
 let sensed=false;for(let i=0;i<30;i++){t.behavior.clock=i*.15;sampleFilopodia(s,t,hash,.15);for(const p of t.filopodia)if(p.blocked){sensed=true;assert.ok(p.end[0]<2.5-.05-.08);} }assert.ok(sensed);assert.ok(t.filopodia.some(p=>!p.blocked));
 s.world.obstacles=[];s.world.bounds.max[0]=2;sampleFilopodia(s,t,hash,1);for(const p of t.filopodia)assert.ok(p.end[0]<=1.92+1e-8);
});

test('V2 retraction reports a signed physical rate and preserves the material ledger',()=>{
 const s=createSimulation({source:'immature',cellCount:1,guidance:0,noise:0,branching:0});s.world.obstacles=[];s.cells[0].membrane.lastSolveHours=720;stepSimulation(s,4);s.config.actin=0;
 let observed=false;for(let i=0;i<100;i++){stepSimulation(s,.05);if(s.tips.some(t=>t.active&&t.forces.speed<0)){observed=true;assert.ok(getMetrics(s).perCell[0].retractionRate>0);break;}}
 assert.ok(observed);const m=s.cells[0].membrane;close(m.reserve*m.reserveCapacity,m.reserveCapacity+m.suppliedArea+m.recycledArea-m.usedArea,1e-6);
});


test('V2 reducing the actual mechanical integration step converges cell motion and shell geometry',()=>{
 const states=[.0125,.00625,.003125].map(h=>{const s=make();s.cells[0].mechanics.polarity=[1,0,0];for(let k=0;k<80;k++){advanceCellMechanics(s,s.cells[0],.05,[],[],h);s.timeHours=Number(((k+1)*.05).toFixed(12));}return s.cells[0];});
 const error=c=>distance(c.position,states[2].position),shapeError=c=>Math.sqrt(c.membrane.vertices.reduce((sum,v,i)=>sum+distance(v,states[2].membrane.vertices[i])**2,0)/162);
 assert.ok(error(states[1])<error(states[0]));assert.ok(error(states[0])<.05);assert.ok(shapeError(states[1])<shapeError(states[0]));assert.ok(shapeError(states[0])<.05);
});


test('V2 neurite initiation cannot seed retained geometry through a nearby thin obstacle',()=>{
 const s=make({source:'precursor'}),c=s.cells[0];move(c,[0,0,0]);c.ageHours=7.99;c.membrane.lastSolveHours=720;
 const wall={id:'initiation-wall',shape:'box',position:[9.8,0,0],size:[.1,30,40]};s.world.obstacles=[wall];stepSimulation(s,.05);
 assert.ok(c.initialized);assert.ok(s.segments.length>0);for(const n of s.segments.filter(n=>n.alive)){
   assert.ok(n.start[0]<=9.75-n.radius&&n.end[0]<=9.75-n.radius,'initial shaft crosses the barrier');
 }
 for(const t of s.tips.filter(t=>t.active))assert.ok(signedObstacle(s.segments[t.segmentId].end,wall).gap>=t.radius-1e-7);
});
