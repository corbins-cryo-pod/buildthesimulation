import {parameters,makeMesh,Solver,VERSION,rampParameters} from './core.mjs';
let generation=0,last=null;
const yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0));
const key=p=>JSON.stringify([p.n,p.size,p.curved,p.experiment,p.depth]);
self.onmessage=async({data})=>{
  if(data.type==='stop'){generation++;return;}
  if(data.type!=='solve')return;
  const token=++generation,id=data.id,start=performance.now();
  try{
    const goal=parameters(data.params),mesh=last&&key(last.p)===key(goal)?last.mesh:makeMesh(goal);
    let previous=last&&last.mesh===mesh?last:null;
    if(goal.experiment==='grab'&&JSON.stringify(previous?.p.handle)!==JSON.stringify(goal.handle))previous=null;
    const path=rampParameters(previous?.p,goal),stages=path.length;
    self.postMessage({type:'mesh',id,mesh:{...mesh,buckets:undefined},version:VERSION});
    let solver;
    for(let stage=1;stage<=stages;stage++){
      if(token!==generation)return;
      const p=path[stage-1];
      solver=new Solver(mesh,p,{initial:previous?.x,maxIterations:data.detailed?1000:400,tolerance:data.detailed?2e-6:1e-5});
      let sent=0;
      while(solver.status==='solving'){
        const slice=performance.now();
        do{solver.step();}while(solver.status==='solving'&&performance.now()-slice<16);
        if(token!==generation)return;
        if(performance.now()-start>25000)solver.status='25 s compute budget reached';
        if(performance.now()-sent>90){
          const report=solver.report();self.postMessage({type:'progress',id,x:Float32Array.from(solver.x),report,stage,stages,params:p,elapsedMs:performance.now()-start});sent=performance.now();
        }
        await yieldTask();if(token!==generation)return;
      }
      previous=solver;last=solver;
      if(solver.status!=='converged')break;
    }
    if(token===generation&&solver)self.postMessage({type:'done',id,x:Float32Array.from(solver.x),report:solver.report(),params:solver.p,elapsedMs:performance.now()-start});
  }catch(error){if(token===generation)self.postMessage({type:'error',id,message:error instanceof Error?error.message:String(error)});}
};
