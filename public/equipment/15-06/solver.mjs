const base='/equipment/15-06/',ok=(x,msg)=>{if(!x)throw Error(msg);};
const shape=[32,24,3],size=shape[0]*shape[1];
export const initial=()=>({index:0,showAnnotation:true});
export const load=async()=>{const r=await fetch(base+'saved-phantom.json');ok(r.ok,'Archive HTTP '+r.status);return validate(await r.json());};
function decode(runs){
 const a=new Uint8Array(size);let off=0;
 ok(Array.isArray(runs),'Missing stored label rows.');
 for(const e of runs){
  ok(Array.isArray(e)&&e.length===2&&[0,1].includes(e[0])&&Number.isInteger(e[1])&&e[1]>0&&off+e[1]<=size,'Invalid binary runs.');
  a.fill(e[0],off,off+e[1]);off+=e[1];
 }
 ok(off===size,'Stored raster is incomplete.');return a;
}
export function validate(f){
 ok(f?.schema==='bts.synthetic-two-layer-phantom.v1'&&f.archiveId==='SS1276-GEOMETRIC-FRAMES-001'&&f.revision===1&&typeof f.source==='string','Unsupported fixed phantom.');
 ok(f.shapeVox?.join()==='32,24,3'&&f.spacingMm?.join()==='0.2,0.25,0.5'&&f.missingIndices?.join()==='2'&&f.planes?.length===2,'Invalid frame, spacing or missing-plane list.');
 const planes=new Map();
 for(const q of f.planes){
  const i=q.index;
  ok([0,1].includes(i)&&!planes.has(i)&&q.id==='FRAME-'+i&&q.object?.id==='OUTLINE-'+i&&q.annotation?.id==='ANNOTATION-'+i,'Invalid or duplicate fixed frame or layer identifiers.');
  planes.set(i,{id:q.id,objectId:q.object.id,annotationId:q.annotation.id,object:decode(q.object.runs),annotation:decode(q.annotation.runs)});
 }
 return {metadata:f,planes};
}
export function info(m,s){
 const f=m.metadata,k=s.index,p=m.planes.get(k);
 ok(Number.isInteger(k)&&k>=0&&k<shape[2]&&typeof s.showAnnotation==='boolean','Saved plane index or display flag is invalid.');
 const r={schema:'bts.synthetic-two-layer-review.v1',kind:'synthetic-fixed-label-review',archiveId:f.archiveId,revision:f.revision,source:f.source,spacingMm:f.spacingMm,index:k,zMm:k*f.spacingMm[2],frameId:p?.id??null,objectLayerId:p?.objectId??null,annotationLayerId:p?.annotationId??null,annotationVisible:s.showAnnotation,coverage:p?'stored':'missing',result:null};
 if(!p)return r;
 let obj=0,mask=0,common=0,x0=Infinity,x1=-Infinity;
 for(let i=0;i<size;i++){
  if(p.object[i]){obj++;const x=i%shape[0];x0=Math.min(x0,x);x1=Math.max(x1,x);}
  mask+=p.annotation[i];common+=p.object[i]*p.annotation[i];
 }
 r.result={objectPixels:obj,objectAreaMm2:obj*f.spacingMm[0]*f.spacingMm[1],objectWidthMm:obj?(x1-x0+1)*f.spacingMm[0]:null,annotationPixels:mask,intersectionPixels:common};
 return r;
}
export function act(m,s,a,v){
 try{
  const t=a==='next'?{...s,index:(s.index+1)%shape[2]}:a==='select'?{...s,index:v}:a==='overlay'?{...s,showAnnotation:!s.showAnnotation}:a==='reset'?initial():null;
  ok(t,'Unsupported viewer action.');const q=info(m,t);
  return {ok:true,state:t,message:q.coverage==='missing'?'No stored frame. All layer measurements are unknown.':q.result.objectPixels?'Label and annotation are kept as independent stored layers.':'This is a stored empty object frame; its annotation layer still exists.'};
 }catch(e){return {ok:false,state:s,message:e.message};}
}
