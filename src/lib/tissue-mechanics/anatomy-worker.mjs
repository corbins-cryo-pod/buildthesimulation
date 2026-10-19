import {embedPoints} from './core.mjs';
import {cropH01,tubeGeometry,validateSurfacePack} from './anatomy.mjs';
self.onmessage=({data})=>{
 try{
  const {mesh,id}=data;
  const crop=data.surface?null:cropH01(data.pack,data.sourceId,mesh.p.size);
  const geometry=data.surface?validateSurfacePack(data.surface,mesh.p.size):tubeGeometry(crop.segments);
  const embedding=embedPoints(mesh,geometry.positions);
  if([...embedding.ids].some(i=>i<0))throw new Error('Some anatomy lies outside the reference mechanics mesh. No clamping was performed.');
  self.postMessage({id,geometry,embedding,crop});
 }catch(error){self.postMessage({id:data.id,error:error instanceof Error?error.message:String(error)});}
};
