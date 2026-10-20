import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {makePhase2Mesh,Phase2Solver,runHistory,solveStatic} from '../../src/lib/tissue-mechanics/phase2-core.mjs';
import {materialStep,PRESETS,I3} from '../../src/lib/tissue-mechanics/phase2-material.mjs';
const out='artifacts/tissue-phase2';mkdirSync(out,{recursive:true});
const summary=r=>{const {nodal,pressureKPa,...rest}=r;return rest;};
const cases=[];
for(const formulation of ['mixed','tetra'])for(const model of ['neo','mooney']){
 const p={n:4,model,formulation,branches:[],mu:.8,nu:.49,mix:.35,experiment:'compression',amplitude:.04};
 const start=performance.now(),s=solveStatic(p,{maxIterations:2000,tolerance:1e-7});assert.equal(s.status,'converged');
 cases.push({name:`${formulation}-${model}`,parameters:s.p,positions:Array.from(s.x),referencePositions:Array.from(s.mesh.X),tetrahedra:Array.from(s.mesh.tets),report:summary(s.report()),elapsedMs:performance.now()-start});
}
const material=[];
for(const model of ['ogden','neo','mooney'])for(const F of [[1.07,.08,.01,.02,.96,0,.01,.03,1.02],[.92,0,0,0,1.04,0,0,0,1.045]]){
 const p={mu:.52,alpha:-20.47,mix:.35,model,branches:[]},r=materialStep(F,p);material.push({F,p,energy:r.energy,P:Array.from(r.P)});
}
const paths=[];
for(const dt of [.5,.25,.125]){
 const p=PRESETS[0],records=[];let h=p.branches.map(()=>I3());
 for(let t=dt;t<=8+1e-8;t+=dt){const F=[1,.06*Math.min(t/2,1),0,0,1,0,0,0,1],r=materialStep(F,p,h,dt,true);h=r.next;records.push({time:t,P01:r.P[1],P00:r.P[0]});}
 paths.push({dt,records});
}
writeFileSync(`${out}/js-reference-cases.json`,JSON.stringify({version:1,node:process.version,cases,material,paths},null,2));
console.log('REFERENCE_CASES',cases.map(c=>({name:c.name,ms:c.elapsedMs,status:c.report.status,reaction:c.report.reactionMN})));
if(process.argv.includes('--full')){
 const protocols=[];for(const protocol of ['relaxation','creep','recovery','cyclic']){
  const start=performance.now(),r=runHistory({n:4,amplitude:.03,experiment:'shear'},{protocol,duration:10,ramp:2,dt:2,traction:.01},{budgetMs:25000,maxIterations:1500});
  const rec={protocol,complete:r.complete,status:r.status,time:r.time,elapsedMs:r.elapsedMs,frames:r.frames.map(f=>({time:f.time,...summary(f.report)}))};protocols.push(rec);console.log('PROTOCOL',protocol,r.complete,r.status,r.time,performance.now()-start);assert.equal(r.complete,true,`${protocol} failed`);
 }
 const sweep=[];
 for(const n of [4,8])for(const nu of [.45,.49,.499])for(const formulation of ['mixed','tetra']){
  const start=performance.now(),s=solveStatic({n,nu,formulation,model:'neo',mu:.8,branches:[],experiment:'compression',amplitude:.02},{maxIterations:3000,tolerance:1e-6});
  const rec={n,nu,formulation,elapsedMs:performance.now()-start,...summary(s.report())};sweep.push(rec);console.log('SWEEP',n,nu,formulation,rec.elapsedMs,rec.status,rec.reactionMN[1]);
 }
 writeFileSync(`${out}/verification.json`,JSON.stringify({node:process.version,environment:'Measured execution environment; timing excludes browser and network',protocols,sweep},null,2));
}
