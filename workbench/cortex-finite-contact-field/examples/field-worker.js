import {loadFieldPackage,STATUS_NAMES} from '../js/field-sampler.js';
let field,cache;
self.onmessage=async event=>{
  try{
    if(event.data.type==='init'){
      const url=new URL('../artifacts/disk-v1/field.json',import.meta.url),manifest=await fetch(url).then(r=>r.json());
      const binary=await fetch(new URL(manifest.data.file,url)).then(r=>r.arrayBuffer());
      field=await loadFieldPackage(manifest,binary);cache=field.cacheUnitPotentials(new Float64Array(event.data.pointsMeters));
      if(cache.status.some(s=>s!==0))throw new Error(Array.from(cache.status,s=>STATUS_NAMES[s]).join(', '));
      self.postMessage({type:'ready',unitPotentials:Array.from(cache.unitPotentials),storageBytes:field.storageBytes});
    }else if(event.data.type==='current'){
      if(!field)throw new Error('Initialize worker first');
      const currentAmps=event.data.currentMicroamps*1e-6;
      const {values,status}=field.combineCached(cache,new Float64Array([currentAmps]));
      self.postMessage({type:'potential',currentMicroamps:event.data.currentMicroamps,potentialMillivolts:Array.from(values,v=>v*1000),status:Array.from(status)});
    }else throw new Error('Unknown worker message');
  }catch(e){self.postMessage({type:'error',message:e.message});}
};
