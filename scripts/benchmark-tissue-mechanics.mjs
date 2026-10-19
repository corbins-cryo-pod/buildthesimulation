import {performance} from 'node:perf_hooks';
import {makeMesh, Solver, rampParameters} from '../src/lib/tissue-mechanics/core.mjs';
const results=[];
for(const n of [4,8,12])for(const experiment of ['shear','stretch','compression','indentation','micromotion']){
 const start=performance.now(),mesh=makeMesh({n,experiment,amplitude:experiment==='micromotion'?.01:.08});let s;
 for(const p of rampParameters(null,mesh.p)){
   s=new Solver(mesh,p,{initial:s?.x,maxIterations:600});
   while(s.step()&&performance.now()-start<25000){}
   if(s.status==='solving')s.status='time limit';
   if(s.status!=='converged')break;
 }
 const {nodal,...r}=s.report();results.push({n,experiment,elements:mesh.volumes.length,elapsedMs:Math.round(performance.now()-start),...r});
 console.log(n,experiment,results.at(-1).elapsedMs,s.status,s.iteration,s.residual,r.volumeRatio,r.contactForceMN,r.reactionMN);
}
if(process.argv.includes('--json'))console.log(JSON.stringify(results,null,2));
