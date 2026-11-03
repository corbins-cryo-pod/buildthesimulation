import {createExperiment,stepSimulation,restoreSimulation,intervene,measure,electrical,csv} from './engine/experiments.js';
import {exportSWC} from './engine/core.js';
let sim=null,token=0,playing=false,busy=false,checkpoints=[];
const yieldTask=()=>new Promise(r=>setTimeout(r,0));
const summary=()=>checkpoints.map(s=>({timeHours:s.timeHours,interventions:s.interventions.length}));
function checkpoint(force=false){if(!sim)return;const last=checkpoints.at(-1);if(last&&last.stepCount===sim.stepCount&&last.interventions.length===sim.interventions.length)return;if(force||!checkpoints.length||sim.timeHours-last.timeHours>=2-1e-8){checkpoints.push(structuredClone(sim));if(checkpoints.length>16)checkpoints.shift();}}
function send(extra={}){postMessage({type:'state',state:sim,metrics:measure(sim),playing,busy,checkpoints:summary(),...extra});}
async function advance(hours,myToken,continuous=false){
  const target=Math.min(168,sim.timeHours+hours);let last=performance.now();busy=true;
  while(sim.timeHours<target-1e-9&&myToken===token){
    const before=sim.timeHours;stepSimulation(sim,Math.min(.1,target-sim.timeHours));checkpoint();
    if(sim.limits.reached||sim.timeHours===before)break;
    if(performance.now()-last>150){send({target});last=performance.now();}
    await yieldTask();
  }
  if(myToken===token){busy=false;playing=false;checkpoint(true);send();}
}
self.onmessage=async({data:d})=>{
  try{
    if(d.type==='init'){++token;playing=busy=false;sim=createExperiment(d.profile,d.options);checkpoints=[];checkpoint(true);send({reset:true});}
    else if(d.type==='pause'){++token;playing=busy=false;if(sim){checkpoint(true);send();}}
    else if(d.type==='advance'||d.type==='play'){
      if(!sim)throw Error('Initialize an experiment first');
      if(d.type==='advance'&&(!Number.isFinite(d.hours)||d.hours<=0||d.hours>168))throw Error('Invalid advance interval');
      const t=++token;playing=d.type==='play';busy=true;send();await advance(d.type==='play'?168:d.hours,t,d.type==='play');
    }else if(d.type==='intervene'){
      ++token;playing=busy=false;intervene(sim,d.action);checkpoint(true);send();
    }else if(d.type==='restore'){
      ++token;playing=busy=false;const next=restoreSimulation(d.state);sim=next;checkpoints=[];checkpoint(true);send({reset:true});
    }else if(d.type==='rewind'){
      ++token;playing=busy=false;if(!Number.isInteger(d.index)||!checkpoints[d.index])throw Error('Unknown checkpoint');
      sim=restoreSimulation(checkpoints[d.index]);checkpoints=checkpoints.slice(0,d.index+1);send({reset:true});
    }else if(d.type==='assay'){
      ++token;playing=busy=false;const result=electrical(sim,d.cellId);postMessage({type:'assay',result});send();
    }else if(d.type==='compare'){
      const t=++token;playing=false;busy=true;send();
      const baseline=restoreSimulation(sim),changed=restoreSimulation(sim);intervene(changed,d.action);
      const hours=Number(d.hours??4);if(!Number.isFinite(hours)||hours<=0||hours>24)throw Error('Compare interval must be 0–24 h');
      const start=sim.timeHours,end=Math.min(168,start+hours),samples=[{hours:start,control:measure(baseline).totalLength,intervention:measure(changed).totalLength}];
      while(baseline.timeHours<end-1e-9&&t===token){
        const h=Math.min(.1,end-baseline.timeHours);stepSimulation(baseline,h);stepSimulation(changed,h);
        if(baseline.limits.reached||changed.limits.reached)throw Error('A comparison arm reached its resource limit; no completed comparison claimed');
        if(samples.length===0||baseline.timeHours-samples.at(-1).hours>=.5)samples.push({hours:baseline.timeHours,control:measure(baseline).totalLength,intervention:measure(changed).totalLength});
        await yieldTask();
      }
      if(t===token){busy=false;if(samples.at(-1).hours<end)samples.push({hours:end,control:measure(baseline).totalLength,intervention:measure(changed).totalLength});postMessage({type:'comparison',result:{startHours:start,endHours:end,seed:sim.config.seed,action:d.action,control:measure(baseline),intervention:measure(changed),samples,scope:'One paired seeded run; not a population confidence interval. Original growth state unchanged.'}});send();}
    }else if(d.type==='export'){
      if(!sim)throw Error('No state to export');
      const content=d.format==='csv'?csv(sim):d.format==='swc'?exportSWC(sim,d.cellId||0):JSON.stringify({ ...sim },null,2);
      postMessage({type:'export',format:d.format,content});
    }
  }catch(e){++token;playing=busy=false;postMessage({type:'error',message:e.message});if(sim)send();}
};
