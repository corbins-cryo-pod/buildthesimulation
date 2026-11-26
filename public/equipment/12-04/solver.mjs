export const config=Object.freeze({sizePx:65,spacingNm:10,half:32,minContrast:.015});
export const manifest=Object.freeze({wide:'903ac210516da5e19f938100e2b8ff9a479ac3c7a69dba9fb62732f8661af926',narrow:'526f95e4f728ee423b59333c51342fcef946eee6e28ebad6ce7dd3051cc6e6ca'});
function source(a,k){
 if(a?.schema!=='bts.synthetic-psf-image.v1'||a.case!==k||a.id!=='LEICA-DEMO-'+k.toUpperCase()||a.revision!==1||a.sizePx!==65||a.spacingNm!==10||a.backgroundQ16!==1311||!Array.isArray(a.pixelsQ16)||a.pixelsQ16.length!==4225||a.pixelsQ16.some(v=>!Number.isInteger(v)||v<0||v>65535))throw Error('Invalid stored synthetic '+k+' image.');
 return a;
}
export async function loadPair(fetcher=fetch){
 const dst=await Promise.all(['wide','narrow'].map(async k=>{
  const response=await fetcher('/equipment/12-04/'+k+'.json');if(!response.ok)throw Error('Stored synthetic image unavailable.');
  const buf=await response.arrayBuffer(),hash=Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',buf)),v=>v.toString(16).padStart(2,'0')).join('');
  if(hash!==manifest[k])throw Error('Stored synthetic '+k+' image does not match the pinned fixture.');
  return source(JSON.parse(new TextDecoder().decode(buf)),k);
 }));
 return {wide:dst[0],narrow:dst[1]};
}
const pos=i=>(i-config.half)*config.spacingNm;
export function profile(a,axis,line){
 if(!['x','y'].includes(axis)||!Number.isInteger(line)||line<0||line>=config.sizePx)throw Error('Choose X or Y and a valid 0–64 synthetic image row or column.');
 const raw=Array.from({length:a.sizePx},(_,i)=>a.pixelsQ16[axis==='x'?line*a.sizePx+i:i*a.sizePx+line]/65535);
 const background=a.backgroundQ16/65535,peak=Math.max(...raw),idx=raw.indexOf(peak),threshold=(peak+background)/2;
 if(peak-background<config.minContrast)throw Error('No useful peak at this line. Move the line closer to the center.');
 let left=idx,right=idx;
 while(left>0&&raw[left-1]>=threshold)left--;
 while(right<raw.length-1&&raw[right+1]>=threshold)right++;
 if(left===0||right===raw.length-1)throw Error('The stored raster does not bracket both threshold crossings.');
 const cross=(i,j)=>pos(i)+(pos(j)-pos(i))*(threshold-raw[i])/(raw[j]-raw[i]);
 const lo=cross(left-1,left),hi=cross(right,right+1);
 return {id:a.id,revision:a.revision,case:a.case,sourceHash:manifest[a.case],axis,line,linePositionNm:pos(line),units:{position:'nm',intensity:'normalized synthetic Q16'},pixels:a.sizePx,spacingNm:a.spacingNm,background,peak,threshold,leftNm:lo,rightNm:hi,widthNm:hi-lo,samples:raw.map((value,i)=>({xNm:pos(i),value}))};
}
export function compare(pair,axis='x',line=32){
 if(!pair)throw Error('Wait for the stored synthetic pair.');
 const a=source(pair.wide,'wide'),b=source(pair.narrow,'narrow');
 const wide=profile(a,axis,line),narrow=profile(b,axis,line);
 return {schema:'bts.synthetic-psf-comparison.v1',equipmentId:'12-04',classification:'synthetic fixed image pair only; no hardware or biological measurement',wide,narrow,deltaNm:wide.widthNm-narrow.widthNm,ratio:wide.widthNm/narrow.widthNm};
}
export const initial=()=>({axis:'x',line:32,visible:'wide',result:null});
export function dispatch(s,pair,a,v){
 function ok(state,message){return {ok:true,state,message};}
 try{
  if(a==='reset')return ok(initial(),'Restored the center line.');
  if(a==='view')return ok({...s,visible:s.visible==='wide'?'narrow':'wide'},'Changed the read-only image view.');
  if(a==='axis'){
   if(!['x','y'].includes(v))throw Error('Choose X or Y.');
   return ok({...s,axis:v,result:null},'Changed profile direction.');
  }
  if(a==='line'){
   if(!Number.isInteger(v)||v<0||v>=65)throw Error('Choose a line index 0–64.');
   return ok({...s,line:v,result:null},'Moved image inspection line.');
  }
  if(a==='run')return ok({...s,result:compare(pair,s.axis,s.line)},'Read both stored profiles and interpolated their half-height crossings.');
  throw Error('Unknown image action.');
 }catch(e){return {ok:false,state:a==='run'?{...s,result:null}:s,message:e.message};}
}
export function csv(u){
 return ['# Wholly synthetic image pair, not measured; comparison at '+u.wide.axis+' line '+u.wide.line,
 '# Wide image '+u.wide.id+' SHA-256 '+u.wide.sourceHash,'# Narrow image '+u.narrow.id+' SHA-256 '+u.narrow.sourceHash,
 'position_nm,wide_normalized_intensity,narrow_normalized_intensity',...u.wide.samples.map((a,i)=>[a.xNm,a.value,u.narrow.samples[i].value].join(','))].join('\n')+'\n';
}
