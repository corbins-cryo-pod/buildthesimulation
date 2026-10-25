import {runAdvanced} from './engine.js';
let model=null;
function buffers(x,result=new Set()){
 if(ArrayBuffer.isView(x))result.add(x.buffer);
 else if(x&&typeof x==='object')for(const v of Object.values(x))buffers(v,result);
 return result;
}
self.onmessage=e=>{const {type,config,id}=e.data;if(type==='init'){model=e.data.model;return;}if(type!=='run')return;
 try{if(!model)throw Error('Cell data not initialized.');const result=runAdvanced(model,config,p=>self.postMessage({type:'progress',id,...p}));self.postMessage({type:'result',id,result},[...buffers(result)]);}
 catch(error){self.postMessage({type:'error',id,message:error.message});}};
