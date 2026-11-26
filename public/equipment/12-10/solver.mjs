export const pinned='4a3a8c84461e2b5bfa17bd6242bd11a8d1632488f69517149420dcc4951d4824';
export async function loadFixture(fetcher=fetch){
 const r=await fetcher('/equipment/12-10/fixture.json');if(!r.ok)throw Error('Stored inert mosaic fixture is unavailable.');
 const buf=await r.arrayBuffer(),hash=Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',buf)),v=>v.toString(16).padStart(2,'0')).join('');
 if(hash!==pinned)throw Error('The saved synthetic tile fixture does not match its published fingerprint.');
 return validate(JSON.parse(new TextDecoder().decode(buf)));
}
export function validate(f){
 if(f?.schema!=='bts.vs200-inert-mosaic-input.v1'||f.slideId!=='CAL-VS200-GRID-001'||f.revision!==1||f.pixelMm!==.5||f.slideMm?.join(',')!=='76,26,1'||f.mosaicOriginMm?.join(',')!=='8,2'||f.mosaicSizePx?.join(',')!=='116,44'||!Array.isArray(f.tiles)||f.tiles.length!==8||new Set(f.tiles.map(t=>t?.id)).size!==8)throw Error('Expected the named 8-tile inert fixture and exact published stage frame.');
 for(const t of f.tiles){
  if(!Number.isInteger(t?.row)||t.row<0||t.row>1||!Number.isInteger(t.column)||t.column<0||t.column>3||t.id!=='R'+t.row+'C'+t.column||t.widthPx!==32||t.heightPx!==24||!Array.isArray(t.originMm)||t.originMm.length!==2||!Array.isArray(t.pixels)||t.pixels.length!==768||t.pixels.some(v=>!Number.isInteger(v)||v<0||v>255))throw Error('Stored tile shape or identifier does not match the inert fixture.');
 }
 return f;
}
function originPx(f,t){
 const u=t.originMm.map((v,i)=>(v-f.mosaicOriginMm[i])/f.pixelMm),ref=[t.column*28,t.row*20];
 if(u.some((v,i)=>!Number.isFinite(v)||Math.abs(v-ref[i])>1e-9))throw Error(t.id+' tile offset disagrees with the fixed stage lattice.');
 return {origin:ref,residualPx:Math.hypot(u[0]-ref[0],u[1]-ref[1])};
}
function features(data,width,height,f){
 const marks=[],visited=new Set();
 for(let p=0;p<data.length;p++)if(data[p]>=230&&!visited.has(p)){
  const queue=[p];visited.add(p);let xs=0,zs=0;
  for(let i=0;i<queue.length;i++){
   const q=queue[i],x=q%width,z=Math.floor(q/width);xs+=x;zs+=z;
   for(const [u,v] of [[x-1,z],[x+1,z],[x,z-1],[x,z+1]])if(u>=0&&u<width&&v>=0&&v<height){const j=u+v*width;if(data[j]>=230&&!visited.has(j)){visited.add(j);queue.push(j);}}
  }
  const x=xs/queue.length,z=zs/queue.length;
  marks.push({id:'F'+(marks.length+1),pixelCenterIndex:[x,z],stageMm:[f.mosaicOriginMm[0]+(x+.5)*f.pixelMm,f.mosaicOriginMm[1]+(z+.5)*f.pixelMm],pixels:queue.length});
 }
 return marks;
}
export function stitch(value){
 const f=validate(value),[width,height]=f.mosaicSizePx,merged=Array(width*height).fill(-1),counts=Array(merged.length).fill(0);
 let overlapSamples=0,maxOverlapDifference=0,maxStageResidualPx=0;
 const tiles=f.tiles.map(t=>{
  const p=originPx(f,t),[ox,oz]=p.origin;maxStageResidualPx=Math.max(p.residualPx,maxStageResidualPx);
  for(let z=0;z<t.heightPx;z++)for(let x=0;x<t.widthPx;x++){
   const i=(oz+z)*width+ox+x,v=t.pixels[z*t.widthPx+x];
   if(merged[i]!==-1){overlapSamples++;maxOverlapDifference=Math.max(maxOverlapDifference,Math.abs(v-merged[i]));if(v!==merged[i])throw Error('Read-only overlap disagreement at tile '+t.id+'.');}
   merged[i]=v;counts[i]++;
  }
  return {id:t.id,originStageMm:t.originMm.slice(),originMosaicPx:[ox,oz],sizePx:[t.widthPx,t.heightPx]};
 });
 if(merged.includes(-1))throw Error('Stored tiles do not cover the expected mosaic.');
 return {schema:'bts.vs200-inert-mosaic.v1',equipmentId:'12-10',slideId:f.slideId,revision:f.revision,source:'Read-only registration of preauthored inert grid tiles, not scanned or measured',fixtureSha256:pinned,
  axes:{x:'left to right along slide length',z:'top to bottom across slide width',origin:'outer corner, pixel centers offset by one half-pixel',units:'mm'},
  slideSizeMm:f.slideMm,frame:{originMm:f.mosaicOriginMm,sizePx:f.mosaicSizePx,pixelMm:f.pixelMm},
  tiles,coverage:{covered:merged.length,uniqueOverlapPixels:counts.filter(v=>v>1).length,overlapSamples,maxOverlapDifference,maxStageResidualPx},fiducials:features(merged,width,height,f),pixels:merged};
}
export function point(report,id,px,pz){
 const t=report.tiles.find(q=>q.id===id);
 if(!t||!Number.isInteger(px)||!Number.isInteger(pz)||px<0||px>=t.sizePx[0]||pz<0||pz>=t.sizePx[1])throw Error('Choose a valid tile and an indexed pixel inside it.');
 const [x,z]=[px,pz].map((v,i)=>t.originMosaicPx[i]+v);
 return {tileId:id,tilePixel:[px,pz],mosaicPixel:[x,z],stageMm:[px,pz].map((v,i)=>t.originStageMm[i]+(v+.5)*report.frame.pixelMm),intensity:report.pixels[z*report.frame.sizePx[0]+x]};
}
export const initial=()=>({selected:6,x:6,z:8});
export function dispatch(s,report,a,v){
 try{
  if(a==='reset')return {ok:true,state:initial(),message:'Restored the example cursor.'};
  const n=a==='tile'?{...s,selected:v}:a==='next'?{...s,selected:(s.selected+1)%8}:a==='pixel'?{...s,...v}:null;
  if(!n||!Number.isInteger(n.selected)||n.selected<0||n.selected>7||!report)throw Error('Choose a stored inert tile.');
  point(report,report.tiles[n.selected].id,n.x,n.z);return {ok:true,state:n,message:'Reading '+report.tiles[n.selected].id+' and its registered stage position.'};
 }catch(e){return {ok:false,state:s,message:e.message};}
}
export const csv=r=>['# '+r.slideId+' rev '+r.revision+' · synthetic inert artifact; recorded stage units mm','fiducial_id,mosaic_x_px,mosaic_z_px,stage_x_mm,stage_z_mm,component_pixels',...r.fiducials.map(t=>[t.id,...t.pixelCenterIndex,...t.stageMm,t.pixels].join(','))].join('\n')+'\n';
