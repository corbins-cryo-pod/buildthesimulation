import { simulate, runEnsemble, runSensitivity } from './model.mjs';
self.addEventListener('message',event=>{
  const {type,id,config,n,parameter,values}=event.data||{};
  try {
    if(type==='simulate')self.postMessage({type:'result',id,result:simulate(config)});
    else if(type==='ensemble')self.postMessage({type:'ensemble',id,result:runEnsemble(config,n)});
    else if(type==='sensitivity')self.postMessage({type:'sensitivity',id,result:runSensitivity(config,parameter,values)});
    else throw new Error('Unknown numerical request');
  } catch(error) {self.postMessage({type:'error',id,message:error instanceof Error?error.message:String(error)});}
});
