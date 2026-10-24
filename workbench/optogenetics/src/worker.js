import { runExperiment } from './simulation.js';
import { createSweep, summarizeTrial } from './sweep.js';
let cellModel = null;
const transferable = result => Object.values(result).filter(v=>ArrayBuffer.isView(v)).map(v=>v.buffer);
self.onmessage = event => {
  const {type,model,config,id,levels,widths}=event.data;
  if(type==='init'){cellModel=model;return;}
  if(!['run','sweep'].includes(type))return;
  try {
    if(!cellModel)throw new Error('Neuron model is missing. Reload the laboratory.');
    if(type==='run'){
      const result=runExperiment(cellModel,config,p=>self.postMessage({type:'progress',id,...p}));
      self.postMessage({type:'result',id,result},transferable(result));
    }else{
      const sweep=createSweep(cellModel,config,levels,widths);
      for(let i=0;i<sweep.trials.length;i++){
        const result=runExperiment(cellModel,sweep.trials[i],p=>self.postMessage({type:'progress',id,
          progress:(i+p.progress)/sweep.trials.length,stage:`Response map ${i+1}/${sweep.trials.length} · ${p.stage}`}));
        self.postMessage({type:'sweep-item',id,index:i,total:sweep.trials.length,summary:summarizeTrial(result),result},transferable(result));
      }
      self.postMessage({type:'sweep-done',id,total:sweep.trials.length});
    }
  }catch(error){self.postMessage({type:'error',id,message:error.message||String(error)});}
};
