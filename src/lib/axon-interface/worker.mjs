import {runProtocol,runStudy} from './protocol.mjs';
import {runStage1Protocol,runStage1Study} from './stage1-protocol.mjs';
self.onmessage=async ({data})=>{
 const {id,settings,study}=data??{};
 if(!Number.isSafeInteger(id))return self.postMessage({id,type:'error',message:'A run needs a safe integer request identity.'});
 try{let last=0;const onProgress=p=>{const t=performance.now();if(t-last>120||p.fraction===1){self.postMessage({id,type:'progress',...p});last=t;}};
 const stage1=settings?.mode==='b3-fixed-topology';
 const result=await (study?(stage1?runStage1Study:runStudy)(settings,study,{onProgress}):(stage1?runStage1Protocol:runProtocol)(settings,{onProgress}));
 self.postMessage({id,type:study?'study':'result',result});
 }catch(error){self.postMessage({id,type:'error',message:error instanceof Error?error.message:String(error)});}
};

