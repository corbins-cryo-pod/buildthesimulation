const iso=a=>Object.freeze(a);
export const grid=Object.freeze({shape:iso([32,24,14]),spacingUm:iso([.4,.5,1.2]),edgeOriginUm:iso([-6.4,-6,2.4]),order:'X fastest, then Y, then Z. +X right, +Y up, +Z increases with plane index; origin is the lower voxel edge.'});
export const names=Object.freeze({0:'Background',17:'A · Rectangular prism',35:'B · Step prism'});
export const profiles=Object.freeze(['complete','gap']);
const shapes=Object.freeze([
 {id:17,boxes:[[[5,5,2],[10,12,7]]]},
 {id:35,boxes:[[[18,7,5],[24,11,7]],[[22,7,8],[24,11,11]]]}
]);
export function xyz(index, offset=.5){
 check(index);return index.map((v,i)=>grid.edgeOriginUm[i]+(v+offset)*grid.spacingUm[i]);
}
function check(idx){if(idx.length!==3||idx.some((x,i)=>!Number.isInteger(x)||x<0||x>=grid.shape[i]))throw new RangeError('Voxel index lies outside this fixed grid.')}
function profile(k){if(!profiles.includes(k))throw new RangeError('Unknown fixed stack profile.');return k}
function authored(idx){
 return shapes.find(s=>s.boxes.some(([low,high])=>idx.every((v,i)=>v>=low[i]&&v<=high[i])))?.id??0;
}
export function labelAt(idx,k='complete'){
 check(idx);profile(k);return k==='gap'&&idx[2]===9?null:authored(idx);
}
export function plane(z,k='complete'){
 const centerZUm=xyz([0,0,z])[2];profile(k);
 const [nx,ny]=grid.shape,missing=labelAt([0,0,z],k)===null;
 return {index:z,centerZUm,available:!missing,shapeXY:[nx,ny],labels:missing?null:Array.from({length:nx*ny},(_,i)=>labelAt([i%nx,Math.floor(i/nx),z],k))};
}
const summaries=new Map();
export function measurements(k='complete'){
 profile(k);if(summaries.has(k))return summaries.get(k);
 const [nx,ny,nz]=grid.shape, rows=shapes.map(s=>({id:s.id,name:names[s.id],observedVoxels:0,min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]}));
 const volume=grid.spacingUm.reduce((a,b)=>a*b);
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const a=[x,y,z],id=labelAt(a,k),f=rows.find(r=>r.id===id);if(!f)continue;
  f.observedVoxels++;a.forEach((v,i)=>{f.min[i]=Math.min(f.min[i],v);f.max[i]=Math.max(f.max[i],v)});
 }
 const out=rows.map(({id,name,observedVoxels,min,max})=>({id,name,observedVoxels,
  observedVolumeUm3:observedVoxels*volume,boundsIndexInclusive:[min,max],
  observedEdgeBoundsUm:[xyz(min,0),xyz(max,1)],
  observedExtentUm:min.map((v,i)=>(max[i]-v+1)*grid.spacingUm[i])}));
 summaries.set(k,out);return out;
}
export const blank=()=>({profile:'complete',z:5,xy:[7,8],revision:0,report:null});
export function selection(s){
 const index=[...s.xy,s.z],id=labelAt(index,s.profile);
 return {index,centerUm:xyz(index),label:id,description:id===null?'Missing plane':names[id]};
}
export function action(s,a){
 if(a.type==='reset')return blank();
 if(a.type==='cycle'||a.type==='set-plane'){
  const z=a.type==='cycle'?(s.z+1)%grid.shape[2]:a.payload;xyz([0,0,z]);
  return {...s,z,report:null};
 }
 if(a.type==='set-profile')return {...s,profile:profile(a.payload),report:null};
 if(a.type==='pick'){
  const {x,y}=a.payload??{};check([x,y,s.z]);return {...s,xy:[x,y],report:null};
 }
 if(a.type!=='inspect')throw new RangeError('Only passive authored-stack inspection is available.');
 const revision=s.revision+1,missingIndices=s.profile==='gap'?[9]:[];
 return {...s,revision,report:{schema:'bts.toy-volume-inspection.v1',sampleId:'INERT-CAD-SHAPES-A-B',revision,parentRevision:s.revision||null,
  provenance:'Analytic preauthored toy labels, not acquired or reconstructed SEM data.',
  profile:s.profile,grid,missingIndices,observedOnly:missingIndices.length>0,
  selected:selection(s),currentPlane:plane(s.z,s.profile),objects:measurements(s.profile)}};
}
