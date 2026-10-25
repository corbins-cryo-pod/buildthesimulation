import { loadPerceptReference } from './percept.mjs';
import { simulateExperiment } from './engine.mjs';
let referencePromise;
self.onmessage=async({data})=>{if(data.type!=='run')return;const {id,config}=data;try{referencePromise??=loadPerceptReference().catch(e=>{referencePromise=null;throw e;});self.postMessage({type:'progress',id,progress:{phase:'reference',progress:.02,message:'Loading checked scientific reference data'}});const reference=await referencePromise;const result=await simulateExperiment(config,reference,{onProgress:progress=>self.postMessage({type:'progress',id,progress})});self.postMessage({type:'result',id,result});}catch(e){self.postMessage({type:'error',id,message:e.message||String(e)});}};
