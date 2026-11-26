const route='/equipment/13-06/';
const fail=m=>{throw new Error(m)};
export const initial=()=>({index:0,low:0,high:255,x:12,y:20});
export const loadFixture=async()=>{const r=await fetch(route+'fixture.json');if(!r.ok)fail('Archive HTTP '+r.status);return validate(await r.json());};
export function validate(f){
 if(f?.schema!=='bts.synthetic-image-archive.v1'||f.sampleId!=='GLA2-INERT-SYMBOL-001'||f.revision!==1||typeof f.source!=='string')fail('Unsupported immutable synthetic archive.');
 const {sizePx,pixelSizeNm,rowOrigin}=f.frame??{};
 if(sizePx?.join()!=='56,56'||pixelSizeNm!==2.5||rowOrigin!=='top')fail('Invalid synthetic image scale or frame.');
 if(!Array.isArray(f.images)||f.images.length!==2)fail('Invalid archive index.');
 for(const [i,a] of f.images.entries()){
  if(a.id!==['GLA2-EXH-A','GLA2-EXH-M'][i]||a.orientation!==['native','mirror-x'][i]||a.basisImageId!==f.images[0].id||!Array.isArray(a.pixels)||a.pixels.length!==3136||!a.pixels.every(n=>Number.isInteger(n)&&n>=0&&n<=255))fail('Malformed source raster or identifier.');
  const pts=['A','B','C'].map(k=>a.landmarks?.[k]);
  for(const q of pts)if(!Array.isArray(q)||q.length!==2||!q.every(n=>Number.isInteger(n)&&n>=0&&n<56)||a.pixels[q[1]*56+q[0]]!==228)fail('Invalid fiducial pixel.');
 }
 const [a,b]=f.images;
 for(let y=0;y<56;y++)for(let x=0;x<56;x++)if(a.pixels[y*56+x]!==b.pixels[y*56+55-x])fail('Stored mirror does not match its source.');
 for(const k of 'ABC'){const [x,y]=a.landmarks[k];if(b.landmarks[k].join()!==[55-x,y].join())fail('Stored landmark mirror does not match.');}
 return f;
}
export function inspect(f,s){
 const a=f.images[s.index];if(!a)fail('No archived image at that index.');
 const [w,h]=f.frame.sizePx,k=s.y*w+s.x;if(!Number.isInteger(s.x)||!Number.isInteger(s.y)||s.x<0||s.x>=w||s.y<0||s.y>=h)fail('Pixel outside the stored raster.');
 const [A,B,C]=['A','B','C'].map(key=>a.landmarks[key]),scale=f.frame.pixelSizeNm;
 const xy1=B.map((x,i)=>x-A[i]),xy2=C.map((x,i)=>x-A[i]);
 return {schema:'bts.synthetic-image-review.v1',kind:'synthetic-digital-replay',sampleId:f.sampleId,revision:f.revision,source:f.source,imageId:a.id,basisImageId:a.basisImageId,imageIndex:s.index,orientation:a.orientation,frame:f.frame,landmarks:a.landmarks,point:{column:s.x,row:s.y,pixelIndex:k,centerNm:[s.x*scale,s.y*scale],rawADU:a.pixels[k]},landmarkSeparationNm:Math.hypot(...xy1)*scale,orientationDeterminantPx2:xy1[0]*xy2[1]-xy1[1]*xy2[0],displayWindowADU:[s.low,s.high]};
}
export function windowPixel(raw,low,high){
 if(![low,high].every(Number.isInteger)||low<0||high>255||low>=high)fail('Set an increasing 8-bit display window.');
 return Math.round(255*Math.min(1,Math.max(0,(raw-low)/(high-low))));
}
export function dispatch(f,s,action,value){
 try{
  let t={...s};
  switch(action){
   case 'reset':t=initial();break;
   case 'next':t.index=(s.index+1)%f.images.length;break;
   case 'image':if(!Number.isInteger(value)||!f.images[value])fail('No archived image at that index.');t.index=value;break;
   case 'window': t.low=value[0];t.high=value[1];windowPixel(0,t.low,t.high);break;
   case 'pixel': Object.assign(t,value);break;
   default: fail('Unsupported archive action.');
  }
  inspect(f,t);
  return {ok:true,state:t,message:'Read-only exhibit; stored pixels are unchanged.'};
 }catch(e){return {ok:false,state:s,message:e.message};}
}
