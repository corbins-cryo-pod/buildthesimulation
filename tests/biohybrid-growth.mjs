import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateGrowth,normalizeGrowthSettings,hazardProbability,segmentSphereEncounter} from '../src/lib/biohybrid/growth.js';

const close=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol,`${a} differs from ${b} by more than ${tol}`);
const straight={graftCount:1,hostCount:0,angularDiffusionRadPerSqrtDay:0,cueStrength:0,branchProbabilityPerDay:0};

test('growth replay is deterministic and the seed changes trajectories',()=>{
  const a=simulateGrowth(),b=simulateGrowth(),c=simulateGrowth({seed:4282});
  assert.deepEqual(a,b);
  assert.notDeepEqual(a.paths,c.paths);
});

test('unconfined straight growth has the specified speed and measured path length',()=>{
  const r=simulateGrowth({...straight,days:2,speedUmPerDay:100,lengthUm:1000});
  close(r.paths[0].lengthUm,200);
  close(r.paths[0].points.at(-1).positionUm[0],200);
  close(r.metrics.totalLengthUm,200);
  close(r.paths[0].points.at(-1).day,2);
});

test('zero elongation produces no motion or branching and zero days stays at initialization',()=>{
  const r=simulateGrowth({speedUmPerDay:0,branchProbabilityPerDay:4,days:12});
  assert.equal(r.metrics.totalLengthUm,0);
  assert.equal(r.metrics.branchCount,0);
  assert.ok(r.paths.every(p=>p.points.length===1));
  assert.equal(r.encounters.length,0);
  const atZero=simulateGrowth({days:0});
  assert.equal(atZero.metrics.simulatedUntilDay,0);
  assert.ok(atZero.paths.every(p=>p.points.length===1));
});

test('every saved trajectory remains inside the finite cylindrical scaffold',()=>{
  const r=simulateGrowth({days:5,speedUmPerDay:1000,lengthUm:1000,radiusUm:12,dtDays:.5,
    angularDiffusionRadPerSqrtDay:2,branchProbabilityPerDay:1.5,maxPaths:12});
  for(const path of r.paths) {
    for(let i=0;i<path.points.length;i++) {
      const p=path.points[i];
      assert.ok(p.positionUm.every(Number.isFinite));
      assert.ok(p.positionUm[0]>=-1e-9 && p.positionUm[0]<=r.lengthUm+1e-9);
      assert.ok(Math.hypot(p.positionUm[1],p.positionUm[2])<=r.radiusUm+1e-9);
      assert.ok(p.day>=0 && p.day<=r.metrics.simulatedUntilDay+1e-9);
      if(i) assert.ok(p.day>path.points[i-1].day,'growth point times must increase');
    }
    const actual=path.points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(...p.positionUm.map((v,k)=>v-path.points[i].positionUm[k])),0);
    close(path.lengthUm,actual,1e-7);
  }
});

test('the outlet stops elongation and records actual travel rather than requested travel',()=>{
  const r=simulateGrowth({...straight,days:5,speedUmPerDay:200,lengthUm:150});
  close(r.paths[0].lengthUm,150);
  close(r.paths[0].points.at(-1).positionUm[0],150);
  close(r.paths[0].points.at(-1).day,.75);
  assert.equal(r.metrics.simulatedUntilDay,5);
});

test('segment crossing detects a small target even when neither endpoint is inside',()=>{
  const hit=segmentSphereEncounter([0,0,0],[500,0,0],[250,0,0],1);
  close(hit.fraction,.498);
  close(hit.positionUm[0],249);
  assert.equal(segmentSphereEncounter([0,5,0],[500,5,0],[250,0,0],1),null);
  const r=simulateGrowth({...straight,days:.5,dtDays:.5,speedUmPerDay:1000,
    targets:[{id:'small-target',positionUm:[250,0,0]}],targetRadiusUm:1,synapseProbability:1,maturationDelayDays:0});
  assert.equal(r.encounters.length,1);
  close(r.encounters[0].day,.249);
  assert.equal(r.candidateSynapses.length,1);
});

test('no targets yields neither encounters nor candidate synapses',()=>{
  const r=simulateGrowth({hostCount:0,days:10,synapseProbability:1});
  assert.deepEqual(r.targets,[]);
  assert.deepEqual(r.encounters,[]);
  assert.deepEqual(r.candidateSynapses,[]);
  const explicit=simulateGrowth({targets:[],hostCount:3,synapseProbability:1});
  assert.deepEqual(explicit.targets,[]);
});

test('formation probability changes candidate outcomes without changing the growth geometry',()=>{
  const zero=simulateGrowth({synapseProbability:0}),one=simulateGrowth({synapseProbability:1});
  assert.deepEqual(zero.paths,one.paths);
  assert.equal(zero.encounters.length,one.encounters.length);
  assert.ok(one.encounters.length>0);
  assert.equal(zero.candidateSynapses.length,0);
  assert.equal(one.candidateSynapses.length,one.encounters.filter(e=>e.candidateDay<=one.settings.days).length);
});

test('candidate formation requires an encounter, successful trial, and a separate maturation interval',()=>{
  const settings={...straight,speedUmPerDay:100,targets:[{id:'t',positionUm:[100,0,0]}],targetRadiusUm:2,
    synapseProbability:1,maturationDelayDays:.5};
  const early=simulateGrowth({...settings,days:1.2}),later=simulateGrowth({...settings,days:2});
  assert.equal(early.encounters.length,1);
  assert.equal(early.candidateSynapses.length,0);
  assert.equal(early.metrics.pendingCandidates,1);
  assert.equal(later.candidateSynapses.length,1);
  const candidate=later.candidateSynapses[0],event=later.encounters.find(e=>e.id===candidate.encounterId);
  assert.ok(event);
  assert.equal(candidate.targetId,event.targetId);
  close(candidate.day,event.day+.5);
  assert.equal(candidate.functionalValidation,false);
  assert.equal(later.metrics.functionalSynapsesValidated,0);
});

test('branch hazard preserves no-event probability when time intervals are partitioned',()=>{
  const rate=.8,p=hazardProbability(rate,.6),p1=hazardProbability(rate,.2),p2=hazardProbability(rate,.4);
  close(1-p,(1-p1)*(1-p2),1e-14);
  assert.equal(hazardProbability(0,1),0);
  assert.equal(hazardProbability(1,0),0);
});

test('positive branch hazard creates child paths while the path cap is enforced',()=>{
  const r=simulateGrowth({...straight,days:4,lengthUm:10000,branchProbabilityPerDay:4,maxPaths:3});
  assert.equal(r.metrics.pathCount,3);
  assert.equal(r.metrics.branchCount,2);
  assert.ok(r.metrics.blockedBranches>0);
  for(const path of r.paths.filter(p=>p.parentId)) {
    const parent=r.paths.find(p=>p.id===path.parentId);
    assert.ok(parent);
    assert.ok(path.birthDay>0);
    assert.equal(path.points[0].day,path.birthDay);
  }
});

test('vertex limit returns an explicit truncated result at a completed global time step',()=>{
  const r=simulateGrowth({days:8,maxVertices:20,branchProbabilityPerDay:0});
  assert.equal(r.metrics.truncated,true);
  assert.ok(r.metrics.vertexCount<=20);
  assert.equal(r.metrics.vertexCount,r.paths.reduce((n,p)=>n+p.points.length,0));
  assert.ok(r.metrics.simulatedUntilDay<r.settings.days);
  assert.ok(r.paths.every(p=>p.points.every(q=>q.day<=r.metrics.simulatedUntilDay+1e-12)));
  assert.ok(r.encounters.every(e=>e.day<=r.metrics.simulatedUntilDay+1e-12));
});

test('growth rejects invalid values, caps, and target positions rather than silently correcting them',()=>{
  for(const settings of [{speedUmPerDay:-1},{days:NaN},{dtDays:0},{synapseProbability:1.1},{graftCount:3,maxPaths:2},{seed:1.5}]) {
    assert.throws(()=>normalizeGrowthSettings(settings));
  }
  assert.throws(()=>simulateGrowth({targets:[{id:'outside',positionUm:[1001,0,0]}]}));
  assert.throws(()=>hazardProbability(-1,.1));
});
