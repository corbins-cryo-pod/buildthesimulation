import { loadFiniteContact } from './finite-contact.js';
import { loadActiveModel } from './model-library.js';
import { runFiniteExperiment } from './finite-experiment.js';
import { resultBuffers } from './buffers.js';
let generation = 0;
self.onmessage = async ({data}) => {
  const token=++generation;
  try {
    const [field] = await Promise.all([loadFiniteContact(),loadActiveModel(data.config.neuron.modelId,data.config.neuron.segmentLengthUm)]);
    if(token!==generation)return;
    const result=runFiniteExperiment(data.config, p=>self.postMessage({type:'progress',id:data.id,...p}), {field});
    self.postMessage({type:'result',id:data.id,result},resultBuffers(result));
  } catch(e) {
    if(token===generation)self.postMessage({type:'error',id:data.id,message:e.message});
  }
};
