import { simulate, runSweep, runEnsemble } from './model.mjs';
self.addEventListener('message',event=>{
 const {type,id,config,parameter,values,n}=event.data||{};
 try {
  if(type==='simulate')self.postMessage({type:'result',id,result:simulate(config)});
  else if(type==='sweep')self.postMessage({type:'sweep',id,result:runSweep(config,parameter,values)});
  else if(type==='ensemble')self.postMessage({type:'ensemble',id,result:runEnsemble(config,n)});
  else throw new Error('Unsupported RPNI computation.');
 }catch(error){self.postMessage({type:'error',id,message:error instanceof Error?error.message:String(error)});}
});
