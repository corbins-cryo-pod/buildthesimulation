// Fixed digital geometry images only. No time, sample, acquisition pipeline or biological data.
export const W=128,H=96;
export const spacingMm=Object.freeze([.25,.20]);
export const fixtures=Object.freeze({
 complete:Object.freeze({label:'Complete rectangle',box:Object.freeze([43,33,83,61])}),
 cropped:Object.freeze({label:'Edge-clipped rectangle',box:Object.freeze([100,33,140,61])}),
 blank:Object.freeze({label:'Blank reference',box:null})
});
const raster=box=>Object.freeze(Array.from({length:W*H},(_,i)=>{const x=i%W,y=Math.floor(i/W);return box&&x>=box[0]&&x<box[2]&&y>=box[1]&&y<box[3]?212:29;}));
const images=Object.freeze(Object.fromEntries(Object.entries(fixtures).map(([k,f])=>[k,raster(f.box)])));
export const initial=()=>({frame:'complete',result:null,error:'',revision:0});
const num=v=>Number(v.toFixed(9));
export function read(frame,rev=0){
 if(!Object.hasOwn(images,frame))throw Error('Choose a stored geometric image.');
 const pixels=images[frame];let l=W,r=-1,t=H,b=-1,visiblePixels=0;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(pixels[y*W+x]>=128){visiblePixels++;l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
 const edgeClipped=visiblePixels>0&&(l===0||r===W-1||t===0||b===H-1),okay=visiblePixels>0&&!edgeClipped;
 const widthPx=okay?r-l+1:null,heightPx=okay?b-t+1:null;
 return {schema:'bts.static-raster-bounds.v1',deviceId:'07-04',kind:'original synthetic nonbiological image',sourceId:'inert-raster-rectangle-01',sourceRevision:0,readRevision:rev+1,frameId:frame,
  raster:{width:W,height:H,spacingMm,pixelOrigin:'top-left; coordinates at pixel centers, X right and Y down',dataOrder:'row-major',grayscale:[...pixels]},
  measurement:{status:okay?'complete':edgeClipped?'edge-clipped':'blank',widthPx,heightPx,widthMm:okay?num(widthPx*spacingMm[0]):null,heightMm:okay?num(heightPx*spacingMm[1]):null,areaMm2:okay?num(visiblePixels*spacingMm[0]*spacingMm[1]):null,edgeClipped,visiblePixels,visibleBoundsPx:visiblePixels?[l,t,r,b]:null},
  provenance:'Static locked geometric fixture and pixel-count arithmetic. No camera, acquisition, time metadata, culture, device settings or optical accuracy claim.'};
}
export function act(s,id,p){
 if(id==='reset')return initial();
 if(id==='select')return act({...s,frame:p},'view');
 if(id==='view'){try{const r=read(s.frame,s.revision);return {...s,result:r,error:'',revision:r.readRevision};}catch(e){return {...s,result:null,error:e.message}}}
 throw Error('Unknown static drawing action');
}
