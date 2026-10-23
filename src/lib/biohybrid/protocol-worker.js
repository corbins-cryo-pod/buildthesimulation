import {runProtocol} from './protocols.js';

// Cancellation terminates this worker. No incomplete case is represented as a
// completed experiment and no previous run can overwrite a newer UI request.
self.addEventListener('message',event=>{
  const {id,baseSettings,protocol}=event.data??{};
  try{
    const result=runProtocol(baseSettings,protocol,{onProgress:progress=>self.postMessage({id,type:'progress',...progress})});
    self.postMessage({id,type:'result',result});
  }catch(error){self.postMessage({id,type:'error',message:error instanceof Error?error.message:String(error)});}
});
