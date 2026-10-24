import { fabricate } from './model.js';
self.onmessage=({data})=>{try{self.postMessage({id:data.id,result:fabricate(data.project,data.stage)});}catch(error){self.postMessage({id:data.id,error:error.message});}};
