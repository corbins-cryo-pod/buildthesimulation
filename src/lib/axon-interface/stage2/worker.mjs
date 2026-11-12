import {runProtocol} from './protocol.mjs';
self.onmessage=async event=>{const {id,settings}=event.data??{};if(!Number.isSafeInteger(id))return;try{const result=await runProtocol(settings,{onProgress:progress=>self.postMessage({id,type:'progress',progress})});self.postMessage({id,type:'result',result});}catch(error){self.postMessage({id,type:'error',error:error.message});}};
