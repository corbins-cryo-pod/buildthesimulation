/** Multi-seed numerical robustness study. This is not biological calibration.
 * Runs each public environment for up to 72 model hours; capacity stops remain
 * explicit. Geometry is audited at 12 h intervals, not only the final picture.
 * Reproduce: node scripts/validate-cell-growth-cohort.mjs [seed-count (default 16)]
 */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {MODEL_VERSION,PRESETS,createSimulation,stepSimulation,getMetrics,serializeSimulation,restoreSimulation} from '../src/lib/cell-growth/engine.js';
import {SpatialHash,closestSegmentPoints,distance} from '../src/lib/cell-growth/geometry.js';
import {shaftProfile} from '../src/lib/cell-growth/morphogenesis.js';

const files=['engine','geometry','mechanics','behavior','exploration','morphogenesis','shaft-mechanics'].map(n=>`src/lib/cell-growth/${n}.js`).concat('scripts/validate-cell-growth-cohort.mjs');
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
const studyStarted=performance.now(),sourceSha256=await hashes(),seedCount=Math.max(1,Math.min(32,Number(process.argv[2])||16));
const seeds=Array.from({length:seedCount},(_,i)=>(101+Math.imul(i,104729))>>>0),runs=[];
const pointDistance=(p,a,b)=>{
 const d=b.map((x,k)=>x-a[k]),q=p.map((x,k)=>x-a[k]),dd=d.reduce((n,x)=>n+x*x,0);
 const t=dd?Math.max(0,Math.min(1,d.reduce((n,x,k)=>n+x*q[k],0)/dd)):0;
 return Math.hypot(...q.map((x,k)=>x-t*d[k]));
};
function boxCrosses(s,o){
 let lo=0,hi=1;
 for(let k=0;k<3;k++){
  const a=o.position[k]-o.size[k]/2-s.radius+1e-7,b=o.position[k]+o.size[k]/2+s.radius-1e-7,d=s.end[k]-s.start[k];
  if(Math.abs(d)<1e-14){if(s.start[k]<a||s.start[k]>b)return false;}
  else{const u=(a-s.start[k])/d,v=(b-s.start[k])/d;lo=Math.max(lo,Math.min(u,v));hi=Math.min(hi,Math.max(u,v));if(lo>hi)return false;}
 }
 return hi>=lo;
}
function audit(sim){
 const out={topology:0,solids:0,foreignSomata:0,foreignShafts:0,boundaries:0,taper:0,budgetResidualUm2:0,shaftPairsChecked:0};
 const live=sim.segments.filter(s=>s.alive),hash=new SpatialHash(16),profiles=shaftProfile(sim);
 for(const s of live)hash.insert(s.id,s.start,s.end,s.radius);
 for(const s of live){
  if(s.parentId>=0&&(!sim.segments[s.parentId]?.alive||distance(s.start,sim.segments[s.parentId].end)>1e-7))out.topology++;
  for(const o of sim.world.obstacles)if(o.shape==='sphere'?pointDistance(o.position,s.start,s.end)<o.radius+s.radius-1e-7:boxCrosses(s,o))out.solids++;
  for(const c of sim.cells)if(c.id!==s.cellId&&pointDistance(c.position,s.start,s.end)<c.mechanics.collisionRadius+s.radius-1e-7)out.foreignSomata++;
  for(const p of [s.start,s.end]){
   if(sim.world.sphereRadius&&Math.hypot(...p)+s.radius>sim.world.sphereRadius+1e-7)out.boundaries++;
   for(let k=0;k<3;k++)if(!(sim.world.planar&&k===1)&&(p[k]<sim.world.bounds.min[k]+s.radius-1e-7||p[k]>sim.world.bounds.max[k]-s.radius+1e-7))out.boundaries++;
  }
  for(const id of hash.query(s.start,s.end,s.radius+2)){
   const other=sim.segments[id];if(id<=s.id||other.cellId===s.cellId)continue;out.shaftPairsChecked++;
   if(closestSegmentPoints(s.start,s.end,other.start,other.end).distance<s.radius+other.radius-1e-7)out.foreignShafts++;
  }
  const p=profiles.get(s.id);if(!p||p.r0<=0||p.r1<=0||p.r0>s.radius+1e-10||p.r1>s.radius+1e-10)out.taper++;
 }
 for(const c of sim.cells){const m=c.membrane;out.budgetResidualUm2=Math.max(out.budgetResidualUm2,Math.abs(m.reserve*m.reserveCapacity-(m.reserveCapacity+m.suppliedArea+m.recycledArea-m.usedArea)));}
 out.passed=['topology','solids','foreignSomata','foreignShafts','boundaries','taper'].every(k=>out[k]===0)&&out.budgetResidualUm2<1e-6;
 return out;
}
const report=()=>({concurrency:4,wallSeconds:(performance.now()-studyStarted)/1000,schema:'cell-growth-cohort-verification/1',modelVersion:MODEL_VERSION,empiricalCalibration:false,runtime:process.version,sourceSha256,seedCount,seeds,requestedHours:72,checkpointHours:12,runs,completed:runs.length===seedCount*PRESETS.length,allAcceptancePassed:runs.length===seedCount*PRESETS.length&&runs.every(r=>r.passed),scope:'Numerical robustness across seeds and four declared environments. Geometry checks are discrete checkpoints, not continuous-time proof or a match to recorded neurons. Capacity-limited runs retain their actual reached time.'});
const save=()=>writeFile('src/data/cell-growth-cohort-validation.json',JSON.stringify(report(),null,2)+'\n');
async function runOne(seed,preset){
 const started=performance.now(),sim=createSimulation({...preset.config,seed}),checkpoints=[];
 for(let target=12;target<=72;target+=12){
  stepSimulation(sim,target-sim.timeHours);const a=audit(sim),m=getMetrics(sim);
  checkpoints.push({timeHours:sim.timeHours,audit:a,totalLengthUm:m.totalLength,branches:m.branches,activeTips:m.activeTips,liveSegments:m.liveSegments});
  console.log(JSON.stringify({mode:preset.id,seed,hours:sim.timeHours,pass:a.passed,segments:m.liveSegments,elapsedSeconds:Math.round((performance.now()-started)/1000)}));
  if(sim.limits.reached||!a.passed)break;
 }
 const restored=restoreSimulation(serializeSimulation(sim));
 const replay=JSON.stringify(restored)===JSON.stringify(sim),m=getMetrics(sim);
 const scalarMetrics={totalAxonLength:m.totalAxonLength,totalDendriteLength:m.totalDendriteLength,branches:m.branches,activeTips:m.activeTips,contacts:m.contacts,meanDisplacement:m.meanDisplacement,liveSegments:m.liveSegments};
 const run={mode:preset.id,seed,config:sim.config,requestedHours:72,reachedHours:sim.timeHours,limits:sim.limits,wallSeconds:(performance.now()-started)/1000,checkpoints,metrics:scalarMetrics,counters:sim.counters,exactRoundTrip:replay,passed:replay&&checkpoints.every(x=>x.audit.passed)};
 if(!run.passed){await writeFile(`/tmp/cell-growth-failure-${preset.id}-${seed}.json`,JSON.stringify(sim));throw new Error(`Cohort geometry failed: ${preset.id}, seed ${seed}. Snapshot preserved in /tmp.`);}
 return run;
}
if(!isMainThread){
 const result=await runOne(workerData.seed,PRESETS.find(p=>p.id===workerData.mode));
 parentPort.postMessage(result);
}else{
 // Independent seeds run in isolated workers. Each worker owns its entire
 // simulation and random state; scheduling cannot change numerical outcomes.
 const tasks=seeds.flatMap(seed=>PRESETS.map(p=>({seed,mode:p.id}))),active=new Set();
 let cursor=0;
 const dispatch=async()=>{
  while(cursor<tasks.length){
   const task=tasks[cursor++];
   const run=await new Promise((resolve,reject)=>{
    const worker=new Worker(new URL(import.meta.url),{workerData:task});active.add(worker);
    worker.once('message',result=>{active.delete(worker);resolve(result);});
    worker.once('error',reject);
    worker.once('exit',code=>{active.delete(worker);if(code!==0)reject(new Error(`Cohort worker exited with ${code}`));});
   });
   runs.push(run);runs.sort((a,b)=>a.seed-b.seed||PRESETS.findIndex(p=>p.id===a.mode)-PRESETS.findIndex(p=>p.id===b.mode));
   if(JSON.stringify(await hashes())!==JSON.stringify(sourceSha256))throw new Error('Source changed during cohort study; regenerate from the final source.');
   // One queued write chain avoids concurrent workers overwriting newer results.
   await queueSave();
  }
 };
 let saving=Promise.resolve();
 const queueSave=()=>saving=saving.then(save);
 try{await Promise.all(Array.from({length:4},dispatch));}
 catch(error){await Promise.all([...active].map(w=>w.terminate()));await saving;throw error;}
 await queueSave();
 console.log(JSON.stringify({completed:report().completed,passed:report().allAcceptancePassed,runs:runs.length,wallSeconds:report().wallSeconds}));
 if(!report().allAcceptancePassed)process.exitCode=1;
}
