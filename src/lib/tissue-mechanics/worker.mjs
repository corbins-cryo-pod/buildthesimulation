import {parameters,makeMesh,Solver,VERSION,rampParameters} from './core.mjs';
import {makePhase2Mesh,Phase2Solver,initialHistory,timeSettings,protocolAt,nextTime,PHASE2_VERSION} from './phase2-core.mjs';
let generation=0,last=null;
const yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0));
const key=p=>JSON.stringify([p.engine,p.n,p.size,p.curved,p.experiment,p.depth,p.preset,p.model,p.mu,p.nu,p.alpha,p.mix,p.scale,p.formulation,p.branches,p.handle]);
self.onmessage=async({data})=>{
 if(data.type==='stop'){generation++;return;}
 if(data.type!=='solve')return;
 const token=++generation,id=data.id,start=performance.now(),alive=()=>token===generation;
 const emit=(type,body)=>{if(alive())self.postMessage({type,id,elapsedMs:performance.now()-start,...body});};
 try{
  const legacy=data.params.engine==='legacy';const transient=!legacy&&data.settings?.protocol!=='static'&&data.settings?.protocol;
  const mesh=legacy?makeMesh(parameters(data.params)):makePhase2Mesh(data.params),goal=mesh.p;
  emit('mesh',{mesh,version:legacy?VERSION:PHASE2_VERSION});
  async function iterate(s,progress){let sent=performance.now();
   while(s.status==='solving'){
    const tick=performance.now();do{s.step();}while(s.status==='solving'&&performance.now()-tick<14);
    if(!alive())return false;
    if(performance.now()-start>25000)s.status='25 s compute budget reached';
    if(progress&&performance.now()-sent>450){emit('progress',{x:Float32Array.from(s.x),report:s.report(),params:s.p,...progress});sent=performance.now();}
    await yieldTask();if(!alive())return false;
   }return true;
  }
  if(transient){
   if(!['shear','stretch','compression'].includes(goal.experiment))throw new Error('Physical-time protocols support shear, stretch and compression. Select Static for contact or grabbing.');
   const spec=timeSettings(data.settings);let time=0,history=initialHistory(mesh,goal),x=mesh.X.slice(),totalDissipation=0,accepted=null,count=0;
   while(time<spec.duration-1e-10){
    const target=nextTime(time,spec),p=protocolAt(goal,target,spec),s=new Phase2Solver(mesh,p,{history,dt:target-time,initial:x,maxIterations:1400,tolerance:1e-5});
    emit('working',{physicalTime:time,targetTime:spec.duration,nextTime:target});
    if(!await iterate(s,null))return;
    if(s.status!=='converged'){
     emit('halted',{message:s.status,physicalTime:time,targetTime:spec.duration,complete:false,acceptedSteps:count});return;
    }
    const report=s.report();history=s.commit();x=s.x.slice();time=target;count++;totalDissipation+=report.dissipationIncrementMicroJ;
    accepted={x:Float32Array.from(x),params:p,report:{...report,totalDissipationMicroJ:totalDissipation},physicalTime:time,targetTime:spec.duration,accepted:true,complete:time>=spec.duration-1e-10};
    emit('frame',accepted);
    if(performance.now()-start>25000&&time<spec.duration){emit('halted',{message:'25 s compute budget reached',physicalTime:time,targetTime:spec.duration,complete:false,acceptedSteps:count});return;}
   }
   emit('done',{...accepted,accepted:false,history:history.map(a=>Array.from(a)),settings:spec});last=null;
  }else{
   let previous=last&&key(last.p)===key(goal)&&last.status==='converged'?last:null;
   const path=rampParameters(previous?.p,goal);let solver;
   for(let stage=0;stage<path.length;stage++){
    const p=path[stage];solver=legacy?new Solver(mesh,p,{initial:previous?.x,maxIterations:data.detailed?1000:400,tolerance:data.detailed?2e-6:1e-5}):new Phase2Solver(mesh,p,{initial:previous?.x,maxIterations:1400,tolerance:data.detailed?2e-6:1e-5});
    if(!await iterate(solver,{stage:stage+1,stages:path.length}))return;
    previous=solver;if(solver.status!=='converged')break;
   }
   last=solver;emit('done',{x:Float32Array.from(solver.x),report:solver.report(),params:solver.p,physicalTime:null,complete:solver.status==='converged'});
  }
 }catch(error){emit('error',{message:error instanceof Error?error.message:String(error)});}
};
