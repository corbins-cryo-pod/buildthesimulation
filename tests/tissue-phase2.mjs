import test from 'node:test';
import assert from 'node:assert/strict';
import {I3,det3,inv3,mul,transpose,symmetricEigen,spectral,elasticIso,materialStep,PRESETS,phase2Parameters} from '../src/lib/tissue-mechanics/phase2-material.mjs';
import {makePhase2Mesh,evaluatePhase2,initialHistory,Phase2Solver,solveStatic,runHistory,config,timeSettings,protocolAt} from '../src/lib/tissue-mechanics/phase2-core.mjs';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b} within ${t}`);
const norm=a=>Math.hypot(...a);
const F=[1.04,.05,-.01,.01,.98,.02,0,.01,1.01];
const testP={mu:.36,alpha:-16.07,model:'ogden',mix:.25,branches:[{mu:1.78,eta:10.18},{mu:.82,eta:697.88}]};
function rotated(){const a=.67;return [Math.cos(a),-Math.sin(a),0,Math.sin(a),Math.cos(a),0,0,0,1];}
test('symmetric eigensystem reconstructs including repeated eigenvalues',()=>{
 for(const A of [I3(),[2,.3,-.2,.3,1.2,.1,-.2,.1,3],[3,0,0,0,3,0,0,0,1]]){const {values,vectors}=symmetricEigen(A);spectral(values,vectors).forEach((v,i)=>near(v,A[i],1e-12));}
});
test('all laws are stress free at rest and rigid rotation',()=>{
 for(const model of ['neo','mooney','ogden'])for(const f of [I3(),rotated()]){const a=elasticIso(f,{...testP,model});near(a.energy,0,1e-12);near(norm(a.P),0,1e-11);}
});
test('isochoric laws ignore pure dilation',()=>{
 for(const model of ['neo','mooney','ogden']){const f=I3().map(v=>v*1.08),a=elasticIso(f,{...testP,model});near(a.energy,0,1e-12);near(norm(a.P),0,1e-11);}
});
test('neo, Mooney–Rivlin and Ogden gradients match finite differences',()=>{
 for(const model of ['neo','mooney','ogden']){const p={...testP,model},r=elasticIso(F,p);for(let i=0;i<9;i++){const A=[...F],B=[...F],h=1e-6;A[i]+=h;B[i]-=h;near(r.P[i],(elasticIso(A,p).energy-elasticIso(B,p).energy)/(2*h),5e-8);}}
});
test('Ogden alpha=2 and neo-Hookean coincide',()=>{const a=elasticIso(F,{...testP,alpha:2}),b=elasticIso(F,{...testP,model:'neo'});near(a.energy,b.energy,1e-12);a.P.forEach((v,i)=>near(v,b.P[i],1e-12));});
test('finite multiplicative Maxwell incremental potential has the correct gradient',()=>{
 const old=[I3(),I3()],p=testP,r=materialStep(F,p,old,.4);for(let i=0;i<9;i++){const A=[...F],B=[...F],h=1e-6;A[i]+=h;B[i]-=h;near(r.P[i],(materialStep(A,p,old,.4).energy-materialStep(B,p,old,.4).energy)/(2*h),1e-7);}
});
test('local return mapping is objective under superposed finite rotation',()=>{
 const Q=rotated(),old=[I3(),I3()],a=materialStep(F,testP,old,.4,true),b=materialStep(mul(Q,F),testP,old,.4,true);near(a.energy,b.energy,1e-11);mul(Q,a.P).forEach((v,i)=>near(v,b.P[i],1e-10));a.next.forEach((h,k)=>h.forEach((v,i)=>near(v,b.next[k][i],1e-10)));
});
test('trial evaluations never mutate committed history',()=>{const old=[I3(),I3()],copy=old.map(x=>Array.from(x));materialStep(F,testP,old,2,true);assert.deepEqual(old.map(x=>Array.from(x)),copy);});
test('viscous metric stays symmetric, positive and isochoric through changing loads',()=>{
 let old=[I3(),I3()];for(let i=0;i<30;i++){const f=[1,.1*Math.sin(i/5),0,0,1,.02*Math.cos(i/5),0,0,1],a=materialStep(f,testP,old,.2,true);old=a.next;assert.ok(a.dissipation>=0);for(const C of old){near(det3(C),1,1e-10);near(C[1],C[3],1e-12);assert.ok([...symmetricEigen(C).values].every(v=>v>0));}}
});
test('stress relaxation is independent of how often a trial is evaluated',()=>{
 const old=[I3(),I3()];const a=materialStep(F,testP,old,.5,true);for(let i=0;i<12;i++)materialStep(F,testP,old,.5);const b=materialStep(F,testP,old,.5,true);a.P.forEach((v,i)=>near(v,b.P[i],1e-14));
});
test('fixed deformation relaxes with nonnegative dissipation and decreasing stored energy',()=>{
 let old=[I3(),I3()],previous=Infinity;for(let i=0;i<30;i++){const r=materialStep(F,testP,old,1,true);assert.ok(r.storedEnergy<=previous+1e-11);assert.ok(r.dissipation>=0);old=r.next;previous=r.storedEnergy;}
});
test('small-strain relaxation converges toward the analytical generalized Maxwell response',()=>{
 const gamma=1e-5,f=[1,gamma,0,0,1,0,0,0,1],T=10,p={...testP,alpha:2};
 const exact=gamma*(p.mu+p.branches.reduce((s,b)=>s+b.mu*Math.exp(-T*b.mu/b.eta),0));
 function error(dt){let h=[I3(),I3()],r;for(let t=0;t<T-1e-9;t+=dt){r=materialStep(f,p,h,dt,true);h=r.next;}return Math.abs(r.P[1]-exact)/exact;}
 assert.ok(error(.05)<.004);assert.ok(error(.05)<error(.2)*.35);
});
test('mixed and full-volume assembly pass energy-gradient checks',()=>{
 for(const formulation of ['mixed','tetra']){const m=makePhase2Mesh({n:4,formulation,nu:.49}),x=m.X.map((v,i)=>v+.003*Math.sin(i*.3)),r=evaluatePhase2(m,x,m.p),h=1e-6;
  for(const i of [17,42,73,151,211,286,330]){const a=x.slice(),b=x.slice();a[i]+=h;b[i]-=h;near(r.g[i],(evaluatePhase2(m,a,m.p).energy-evaluatePhase2(m,b,m.p).energy)/(2*h),5e-7);}}
});
test('history-dependent global assembly has a consistent gradient',()=>{
 const m=makePhase2Mesh({n:4}),x=m.X.map((v,i)=>v+.002*Math.sin(i*.3)),history=initialHistory(m),ctx={history,dt:.5},r=evaluatePhase2(m,x,m.p,false,ctx),h=1e-6;
 for(const i of [17,151,286]){const a=x.slice(),b=x.slice();a[i]+=h;b[i]-=h;near(r.g[i],(evaluatePhase2(m,a,m.p,false,ctx).energy-evaluatePhase2(m,b,m.p,false,ctx).energy)/(2*h),5e-7);}
});
test('mixed formulation penalizes a localized interior nodal perturbation',()=>{const m=makePhase2Mesh({n:4}),x=m.X.slice();x[3*(2+5*(2+5*2))]+=.005;assert.ok(evaluatePhase2(m,x).energy>1e-7);});
test('rigid rotation leaves mixed volume energy and residual zero',()=>{const m=makePhase2Mesh({n:4}),Q=rotated(),x=m.X.map((v,i)=>{const r=i%3,b=i-r;return Q[3*r]*m.X[b]+Q[3*r+1]*m.X[b+1]+Q[3*r+2]*m.X[b+2]+.1;});const r=evaluatePhase2(m,x);near(r.energy,0,1e-11);near(norm(r.g),0,1e-10);});
test('published study presets preserve region, cycle, source and poor-fit warnings',()=>{
 assert.equal(PRESETS.length,8);const a=PRESETS.find(x=>x.id==='cortex-unconditioned');near(a.mu,.36);near(a.branches[0].eta,10.18);assert.equal(a.table,4);assert.ok(PRESETS.find(x=>x.id==='callosum-conditioned').reportedR2.tension<0);
});
test('invalid physical and constitutive settings are rejected',()=>{
 for(const p of [{alpha:0},{nu:.5},{mix:-1},{scale:Infinity},{model:'fake'},{branches:[{mu:-1,eta:2}]}])assert.throws(()=>phase2Parameters(p));
 for(const p of [{dt:0},{duration:Infinity},{protocol:'fake'},{dt:.00001}])assert.throws(()=>timeSettings(p));
});
test('force control frees the upper face and preserves the fixed base',()=>{
 const m=makePhase2Mesh({n:4,forceControlled:true,traction:.01}),s=new Phase2Solver(m,m.p);for(let i=0;i<m.X.length/3;i++){if(m.uv[i*3+1]===1)assert.equal(s.bc.fixed[i*3],0);if(m.uv[i*3+1]===0)assert.equal(s.bc.fixed[i*3],1);}
});
test('unconverged time increments cannot commit material history',()=>{const m=makePhase2Mesh({n:4,amplitude:.08}),s=new Phase2Solver(m,m.p,{history:initialHistory(m),dt:.1,maxIterations:1});while(s.step()){}assert.notEqual(s.status,'converged');assert.throws(()=>s.commit());});
test('budget exhaustion reports incomplete physical time, not fabricated completion',()=>{const r=runHistory({n:4,amplitude:.02},{duration:10,ramp:2,dt:2},{budgetMs:1});assert.equal(r.complete,false);assert.ok(r.time<r.targetTime);assert.equal(r.frames.length,0);});
test('static equilibrium converges with positive volumes',()=>{const s=solveStatic({n:4,amplitude:.03});assert.equal(s.status,'converged');assert.ok(s.report().minJ>.9);assert.ok(s.report().maxMacroVolumeError<.01);});
test('time protocol ends at exact physical times and recovery is force release',()=>{const s=timeSettings({protocol:'recovery',duration:20}),p=protocolAt(config({n:4}),11,s);assert.equal(p.forceControlled,true);assert.equal(p.traction,0);});
test('material normalization is idempotent and stiffness sensitivity preserves relaxation times',()=>{const a=config({n:4,scale:1.25}),b=config(a);near(a.mu,b.mu);a.branches.forEach((v,i)=>{near(v.mu,b.branches[i].mu);near(v.eta/v.mu,PRESETS[0].branches[i].eta/PRESETS[0].branches[i].mu);});});
test('cyclic vertical loading reverses its prescribed displacement',()=>{const p=config({n:4,experiment:'stretch',amplitude:.03}),spec=timeSettings({protocol:'cyclic',duration:10,ramp:2,dt:1}),load=protocolAt(p,7.5,spec),m=makePhase2Mesh(load),s=new Phase2Solver(m,m.p);const i=Array.from(m.topArea).findIndex(x=>x>0);near(s.bc.target[3*i+1],m.X[3*i+1]-.03);});
