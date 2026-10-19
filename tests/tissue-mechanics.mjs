import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,parameters,makeMesh,material,evaluate,deformation,Solver,embedPoints,advect} from '../src/lib/tissue-mechanics/core.mjs';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b} (tolerance ${t})`);
const sum=a=>a.reduce((s,v)=>s+v,0),I=[1,0,0,0,1,0,0,0,1];
const solve=(p,options={})=>{const mesh=makeMesh({n:4,...p}),s=new Solver(mesh,mesh.p,options);while(s.step()){}return s;};
test('rest mesh volumes, areas and closed oriented surface',()=>{
 const m=makeMesh({n:4});near(sum(m.volumes),1);near(sum(m.topArea),1);assert.equal(m.volumes.length,384);
 let enclosed=0;const edge=new Map();for(let i=0;i<m.surface.length;i+=3){const ids=Array.from(m.surface.slice(i,i+3)),v=ids.map(j=>m.X.slice(j*3,j*3+3));
  enclosed+=(v[0][0]*(v[1][1]*v[2][2]-v[1][2]*v[2][1])+v[0][1]*(v[1][2]*v[2][0]-v[1][0]*v[2][2])+v[0][2]*(v[1][0]*v[2][1]-v[1][1]*v[2][0]))/6;
  for(let a=0;a<3;a++){const key=[ids[a],ids[(a+1)%3]].sort((a,b)=>a-b).join(',');edge.set(key,(edge.get(key)||0)+1);}}
 near(enclosed,1);assert.ok([...edge.values()].every(v=>v===2));
});
test('reference state has zero energy, force and strain',()=>{const m=makeMesh({n:4}),d=evaluate(m,m.X,m.p,true);near(d.energy,0);near(Math.hypot(...d.g),0);near(d.peakStrain,0);near(d.minJ,1);near(d.maxJ,1);});
test('curved cap is a stress-free reference geometry',()=>{const m=makeMesh({n:4,curved:true}),d=evaluate(m,m.X);near(d.energy,0);near(Math.hypot(...d.g),0);});
test('rigid translation and finite rotation have zero internal energy',()=>{
 const m=makeMesh({n:4}),theta=.73,x=m.X.slice();for(let i=0;i<x.length;i+=3){x[i]=Math.cos(theta)*m.X[i]-Math.sin(theta)*m.X[i+1]+.23;x[i+1]=Math.sin(theta)*m.X[i]+Math.cos(theta)*m.X[i+1]-.18;x[i+2]+=.31;}
 const d=evaluate(m,x);near(d.energy,0);near(Math.hypot(...d.g),0,1e-12);
});
test('constitutive gradient matches central differences',()=>{
 const F=[1.08,.1,.01,.03,.95,.02,-.02,.04,1.01],mu=.8,lambda=7.2,m=material(F,mu,lambda),h=1e-6;
 for(let i=0;i<9;i++){const a=[...F],b=[...F];a[i]+=h;b[i]-=h;near(m.P[i],(material(a,mu,lambda).energy-material(b,mu,lambda).energy)/(2*h),2e-9);}
});
test('simple shear agrees with analytical energy and shear stress',()=>{const gamma=.15,mu=.8,m=material([1,gamma,0,0,1,0,0,0,1],mu,7.2);near(m.J,1);near(m.energy,mu*gamma*gamma/2);near(m.P[1],mu*gamma);});
test('homogeneous dilation agrees with analytical energy',()=>{const a=1.06,mu=.8,lambda=7.2,m=material([a,0,0,0,a,0,0,0,a],mu,lambda);near(m.energy,mu/2*(3*a*a-3)-3*mu*Math.log(a)+lambda/2*(3*Math.log(a))**2);});
test('inversion and singular deformation are explicitly rejected',()=>{assert.equal(material([-1,0,0,0,1,0,0,0,1],.8,7.2),null);assert.equal(material([0,0,0,0,1,0,0,0,1],.8,7.2),null);});
test('assembled force agrees with total energy differences',()=>{
 const m=makeMesh({n:4}),x=m.X.map((v,i)=>v+.007*Math.sin(i*.4)),d=evaluate(m,x),h=1e-6;
 for(const i of [17,42,73,151,211,286,330]){const a=x.slice(),b=x.slice();a[i]+=h;b[i]-=h;near(d.g[i],(evaluate(m,a).energy-evaluate(m,b).energy)/(2*h),1e-8);}
});
test('frictionless spherical penalty gradient is energy consistent',()=>{
 const m=makeMesh({n:4,experiment:'indentation',amplitude:.08}),x=m.X.slice(),d=evaluate(m,x),h=1e-6;
 const i=2+5*(4+5*2);for(let a=0;a<3;a++){const k=i*3+a,A=x.slice(),B=x.slice();A[k]+=h;B[k]-=h;near(d.g[k],(evaluate(m,A).energy-evaluate(m,B).energy)/(2*h),1e-8);}
 assert.ok(d.contactForce>0);assert.ok(d.maxPenetration>0);
});
test('affine FEM patch produces uniform deformation on all tetrahedra',()=>{
 const m=makeMesh({n:4}),F=[1.03,.08,0,0,.98,.02,0,0,1.01],x=m.X.map((_,i)=>{const r=i%3,b=i-r;return .1+F[r*3]*m.X[b]+F[r*3+1]*m.X[b+1]+F[r*3+2]*m.X[b+2];});
 for(let e=0;e<m.volumes.length;e++){const f=deformation(m,x,e);f.forEach((v,i)=>near(v,F[i]));}
});
test('pre-existing tract volume is invariant across refinement and depth',()=>{
 for(const n of [4,8,12])for(const depth of [.25,.5,.75]){const m=makeMesh({n,experiment:'micromotion',depth});near(sum(m.volumes),1-.25*.25*depth,1e-12);}
});
test('quasistatic shear converges, retains positive Jacobians and fixed boundaries',()=>{
 const s=solve({experiment:'shear'}),r=s.report();assert.equal(s.status,'converged');assert.ok(r.residual<=r.tolerance);assert.ok(r.minJ>.8);assert.ok(r.reactionMN[0]>0);
 for(let i=0;i<s.x.length;i++)if(s.bc.fixed[i])near(s.x[i],s.bc.target[i]);
});
test('unloaded sample is already at equilibrium',()=>{const s=solve({experiment:'shear',amplitude:0});assert.equal(s.iteration,0);assert.equal(s.status,'converged');near(s.report().energyMicroJ,0);});
test('iteration-limited solutions are never labeled converged',()=>{const s=solve({experiment:'shear'},{maxIterations:1});assert.equal(s.status,'iteration limit');assert.ok(s.residual>s.tolerance);});
test('linear material stiffness scaling gives the same shape and scales force',()=>{
 const a=solve({mu:.8}),b=solve({mu:1.6});for(let i=0;i<a.x.length;i++)near(a.x[i],b.x[i],1e-6);near(b.report().reactionMN[0],a.report().reactionMN[0]*2,1e-6);
});
test('millimetre/micrometre scaling preserves strain and scales force by length squared',()=>{
 const a=solve({size:1}),b=solve({size:.08});for(let i=0;i<a.x.length;i++)near(a.x[i]*.08,b.x[i],1e-6);near(b.report().reactionMN[0],a.report().reactionMN[0]*.08**2,1e-7);
});
test('barycentric anatomy follows exact affine displacement',()=>{
 const m=makeMesh({n:4}),p=Float64Array.from([.013,.333,.071,-.21,.81,-.11]),e=embedPoints(m,p),x=m.X.map((v,i)=>i%3===0?v+.12*m.X[i+1]:v),a=advect(m,x,e);
 assert.ok([...e.ids].every(i=>i>=0));near(a[0],p[0]+.12*p[1],1e-7);near(a[3],p[3]+.12*p[4],1e-7);near(a[1],p[1],1e-7);
});
test('out-of-domain anatomy is rejected rather than silently snapped',()=>{const m=makeMesh({n:4}),e=embedPoints(m,Float64Array.from([2,2,2]));assert.equal(e.ids[0],-1);assert.ok(Number.isNaN(advect(m,m.X,e)[0]));});
test('parameter guards reject bad numerical values and unsupported requests',()=>{
 for(const p of [{nu:.5},{mu:-1},{n:7},{size:NaN},{amplitude:1},{experiment:'cutting'},{drag:[0,0,Infinity]},{depth:.33}])assert.throws(()=>parameters(p));
 assert.ok(Object.isFrozen(DEFAULTS));
});

import {clipSegment,cropH01,tubeGeometry,validateSurfacePack} from '../src/lib/tissue-mechanics/anatomy.mjs';
test('segment clipping interpolates crossings instead of dropping endpoints',()=>{const q=clipSegment([-2,.5,0],[2,.5,0],[-.5,0,-.5],[.5,1,.5]);near(q.a[0],-.5);near(q.b[0],.5);assert.equal(clipSegment([-2,2,0],[2,2,0],[-.5,0,-.5],[.5,1,.5]),null);});
test('H01 crop preserves native relative source positions and radii',()=>{
 const fixture={units:'mm',templates:[{sourceId:'a',somaSourceNm:[1e6,2e6,3e6],paths:[{points:[[-.1,0,0],[.1,0,0]],radii:[.001,.001],role:'axon'}]},{sourceId:'b',somaSourceNm:[1e6,2.01e6,3e6],paths:[{points:[[-.1,0,0],[.1,0,0]],radii:[.001,.001],role:'dendrite'}]}]};
 const c=cropH01(fixture,'a',.08);assert.equal(c.segments.length,2);near(c.segments[0].a[1],.04);near(c.segments[1].a[1]-.04,.01);near(c.segments[0].ra,.001);assert.equal(c.selected,'a');
 const tubes=tubeGeometry(c.segments);assert.equal(tubes.positions.length,2*2*8*3);assert.ok([...tubes.positions].every(Number.isFinite));
});
test('geometry importer requires provenance and rejects rescaling/outside coordinates',()=>{
 const valid={schema:'bts-cellular-surface-v1',units:'um',dataset:'unit-test fixture; not biological data',sourceUrl:'https://example.org/test',license:'CC0',positions:[0,20,0,1,20,0,0,21,0],indices:[0,1,2]};
 const g=validateSurfacePack(valid,.08);near(g.positions[1],.02,1e-8);assert.throws(()=>validateSurfacePack({...valid,license:null},.08));assert.throws(()=>validateSurfacePack({...valid,positions:[0,200,0,1,20,0,0,21,0]},.08));assert.throws(()=>validateSurfacePack({...valid,indices:[0,1,8]},.08));
});

import {rampParameters} from '../src/lib/tissue-mechanics/core.mjs';
test('continuation avoids initial top-layer inversion in a refined compression solve',()=>{
 const mesh=makeMesh({n:12,experiment:'compression',amplitude:.08});let solver;
 for(const p of rampParameters(null,mesh.p)){solver=new Solver(mesh,p,{initial:solver?.x,maxIterations:600});while(solver.step()){}assert.equal(solver.status,'converged');}
 assert.ok(solver.report().minJ>.8);near(solver.p.amplitude,.08);
});
