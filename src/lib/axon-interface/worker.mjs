import {runProtocol,runStudy} from './protocol.mjs';
self.onmessage=({data})=>{
 const {id,settings,study}=data??{};
 if(!Number.isSafeInteger(id))return self.postMessage({id,type:'error',message:'A run needs a safe integer request identity.'});
 try{let last=0;const onProgress=p=>{const t=performance.now();if(t-last>120||p.fraction===1){self.postMessage({id,type:'progress',...p});last=t;}};
 const result=study?runStudy(settings,study,{onProgress}):runProtocol(settings,{onProgress});
 self.postMessage({id,type:study?'study':'result',result});
 }catch(error){self.postMessage({id,type:'error',message:error instanceof Error?error.message:String(error)});}
};

