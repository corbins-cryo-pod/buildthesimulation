export const MODEL=Object.freeze({id:'Diener-Nano-tabletop-dormant',widthMm:540,depthMm:800,heightMm:775});
export const frames=Object.freeze({narrow:Object.freeze([650,850]),wide:Object.freeze([950,850])});
export const targets=Object.freeze({Chart_rotate_key:'rotate',Chart_frame_key:'cycle'});
export function compare(frame,orientationDeg){
 if(!Object.hasOwn(frames,frame))throw new RangeError('Select a listed example chart.');
 if(orientationDeg!==0&&orientationDeg!==90)throw new RangeError('A drawing orientation must be 0° or 90°.');
 const out=orientationDeg===0?[MODEL.widthMm,MODEL.depthMm]:[MODEL.depthMm,MODEL.widthMm];
 const margins=frames[frame].map((v,i)=>(v-out[i])/2);
 return {frame,revision:'1',orientationDeg,frameMm:[...frames[frame]],footprintMm:out,signedSideMarginsMm:margins,contained:margins.every(x=>x>=0)};
}
export function createStation(){
 let frame='narrow',deg=0,error=null;
 const read=()=>({...compare(frame,deg),error});
 function dispatch(key,value){
  error=null;
  try{
   if(key==='setFrame'){compare(value,deg);frame=value;}
   else if(key==='cycle'){frame=frame==='narrow'?'wide':'narrow';}
   else if(key==='rotate'){deg=deg===0?90:0;}
   else if(key==='reset'){frame='narrow';deg=0;}
  }catch(e){error=e.message;}
  return read();
 }
 return {read,dispatch,hit:node=>Object.hasOwn(targets,node)?dispatch(targets[node]):read()};
}
export function exportChart(s){
 return {schema:'bts.nano-footprint-chart.v1',equipment:'04-05',provenance:'nominal manufacturer housing against invented 2D rectangles; not installation or equipment data',units:'mm',model:MODEL,comparison:Object.fromEntries(Object.entries(s).filter(([k])=>k!=='error'))};
}
