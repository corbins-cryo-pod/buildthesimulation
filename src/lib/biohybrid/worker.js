import {runSimulation} from './model.js';
self.addEventListener('message',event=>{
  const {id,settings}=event.data??{};
  try{
    const result=runSimulation(settings,{onProgress:progress=>self.postMessage({id,type:'progress',progress})});
    const transfer=[result.timeMs.buffer,result.voltageMv.buffer,result.stimulusUa.buffer,
      ...result.traces.map(t=>t.values.buffer),...result.recordings.flatMap(r=>[r.neuralUv.buffer,r.artifactUv.buffer,r.totalUv.buffer])];
    self.postMessage({id,type:'result',result},transfer);
  }catch(error){self.postMessage({id,type:'error',message:error instanceof Error?error.message:String(error)});}
});
