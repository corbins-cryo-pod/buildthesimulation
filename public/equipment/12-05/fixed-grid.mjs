// Data-only registration fixture. No relationship to an instrument or optics.
export const size=64, pixelPitchUm=2, ids=Object.freeze(['lower','middle','upper']);
const points=[16,32,48], shifts=[[0,0],[4,-3],[-5,4]];
export const picks=Object.freeze(Object.fromEntries(ids.map((id,i)=>['Synthetic_plane_card_'+i,{action:'plane',id}])));
export const initial=()=>({plane:'lower',expression:'raw',revision:0});
export function reduce(s,action,id) {
  if(action==='plane'&&ids.includes(id))return s.plane===id?s:{...s,plane:id,revision:s.revision+1};
  if(action==='expression'&&['raw','registered'].includes(id))return s.expression===id?s:{...s,expression:id,revision:s.revision+1};
  throw Error('Unknown offline plane or registration view.');
}
function get(id) {
  const i=ids.indexOf(id);if(i<0)throw Error('Unknown fixed plane.');
  return {dx:shifts[i][0],dy:shifts[i][1],zUm:8*i};
}
export function reconstruct(s) {
  const {dx,dy,zUm}=get(s.plane);
  if(!['raw','registered'].includes(s.expression))throw Error('Unknown registration view.');
  const raw=s.expression==='raw', ox=raw?dx:0,oy=raw?dy:0, image=new Uint8Array(size*size);
  // Immutable sparse lattice; each bead is an explicit five-pixel cross.
  for(const y of points)for(const x of points)for(const [u,v,level] of [[0,0,255],[1,0,110],[-1,0,110],[0,1,110],[0,-1,110]])image[(y+oy+v)*size+x+ox+u]=level;
  let sum=0,wx=0,wy=0;image.forEach((p,i)=>{sum+=p;wx+=(i%size)*p;wy+=Math.floor(i/size)*p;});
  return {image,zUm,rawOffsetPx:[dx,dy],correctionPx:raw?[0,0]:[-dx,-dy],centroidPx:[wx/sum,wy/sum]};
}
export function report(s) {
  const {image,...result}=reconstruct(s);
  return {schema:'bts.12-05.fixed-grid.v1',source:'authored synthetic nine-dot grid; not acquired or experimentally calibrated',imageOrder:'row-major; x right, y down, z increases with plane index',deviceConnection:false,pixelPitchUm,designPitchUm:32,width:size,height:size,state:s,...result,centroidUm:result.centroidPx.map(v=>v*pixelPitchUm),pixels:Array.from(image)};
}
