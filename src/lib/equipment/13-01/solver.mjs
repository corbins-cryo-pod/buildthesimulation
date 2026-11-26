// Permanent synthetic grayscale fixtures; no microscopy or hardware operation.
export const W=240,H=96,PIXEL_UM=.05;
export const fixture=Object.freeze({normal:{label:'Normal stock reference',period:40},projected:{label:'Half-pitch projection reference',period:20}});
const raster=p=>Object.freeze(Array.from({length:W*H},(_,i)=>{const x=i%W,y=Math.floor(i/W);return x>=7&&(x-7)%p<Math.floor(p*.44)?213+(x+y)%5-2:26+(x+y)%5-2}));
const images=Object.freeze(Object.fromEntries(Object.entries(fixture).map(([k,v])=>[k,raster(v.period)])));
export const initial=()=>({frame:'normal',result:null,error:'',revision:0});
function pitch(pixels){
 const col=Array.from({length:W},(_,x)=>Array.from({length:H},(_,y)=>pixels[y*W+x]).reduce((a,b)=>a+b,0)/H),edges=[];
 for(let x=1;x<W;x++)if(col[x]>=128&&col[x-1]<128)edges.push(x);
 if(edges.length<3)throw Error('Too few reference peaks.');
 const ds=edges.slice(1).map((x,i)=>x-edges[i]).sort((a,b)=>a-b);return {pitchPx:ds[Math.floor(ds.length/2)],edgeIndices:edges};
}
export function inspect(frame,rev=0){
 if(!Object.hasOwn(images,frame))throw Error('Choose one of the stored grating images.');
 const data=images[frame],a=pitch(data),raw=pitch(images.normal).pitchPx;
 return {schema:'bts.synthetic-grating-pitch.v1',deviceId:'13-01',kind:'synthetic geometry',sampleId:'locked-raster-grating-01',frameId:frame,revision:rev+1,parentRevision:rev,
  raster:{width:W,height:H,pixelSpacingUm:[PIXEL_UM,PIXEL_UM],order:'row-major, top-left origin, X increases right',pixels:[...data],unit:'digital grayscale 0–255'},
  measurement:{pitchPx:a.pitchPx,pitchUm:a.pitchPx*PIXEL_UM,edgeIndices:a.edgeIndices,normalPitchPx:raw,ratio:a.pitchPx/raw},provenance:'Independent fixed geometric pair; column-average threshold and median edge-to-edge spacing. Not a measured SEM image or setting.'};
}
export function act(s,id,p){
 if(id==='reset')return initial();
 if(id==='toggle')return act(s,'select',s.frame==='normal'?'projected':'normal');
 if(id==='select')return act({...s,frame:p},'view');
 if(id==='view'){try{const result=inspect(s.frame,s.revision);return {...s,result,revision:result.revision,error:''};}catch(e){return {...s,result:null,error:e.message};}}
 throw Error('Unknown passive grating action');
}
