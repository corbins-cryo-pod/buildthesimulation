const shape=Object.freeze([16,12,8]),tileNames=['left','right'],docSchema='bts.synthetic-tile-volume.v1';
export const seamDemo=Object.freeze([[1048,-148,680],[1064,-148,680],[1080,-148,680]].map(Object.freeze));
export const dims=level=>shape.map(x=>x/(2**level));
const arr3=x=>Array.isArray(x)&&x.length===3, validId=x=>typeof x==='string'&&/^[A-Za-z0-9._-]{1,60}$/.test(x);
const origin=[1000,-200,500],pitch=[8,8,40];
const levelFactor=level=>{if(level!==0&&level!==1)throw Error('Only native and 2× display levels exist.');return 2**level};
export function makeExample(){
 const [X,Y,Z]=shape,tiles=tileNames.map((id,i)=>{
  const labels=[],signal=[];
  for(let z=0;z<Z;z++)for(let y=0;y<Y;y++)for(let x=i*X/2;x<(i+1)*X/2;x++){
   const main=x>=2&&x<=13&&y>=5&&y<=7&&z>=3&&z<=5;
   const branch=x>=10&&x<=13&&y>=9&&y<=11&&z>=3&&z<=5;
   const bend=x>=1&&x<=3&&y>=3&&y<=7&&z>=3&&z<=5;
   const label=main||bend?17:branch?52:0;
   labels.push(label);signal.push(30+(x*13+y*17+z*7)%34+(label?102:5));
  }
  return {id,offsetVox:[i*X/2,0,0],shapeVox:[X/2,Y,Z],labels,signal};
 });
 return {schema:docSchema,volumeId:'BTS-SYN-TILES-001',revision:'synthetic-r1',originNm:[...origin],voxelSizeNm:[...pitch],shapeVox:[...shape],encoding:'little-grid-x-fastest-in-JSON-array',originConvention:'lower voxel corner',tiles};
}
export function readVolume(doc){
 if(!doc||doc.schema!==docSchema||!validId(doc.volumeId)||!validId(doc.revision)||!arr3(doc.originNm)||!doc.originNm.every(x=>Number.isSafeInteger(x)&&Math.abs(x)<=1e8)||!arr3(doc.voxelSizeNm)||!doc.voxelSizeNm.every(x=>Number.isInteger(x)&&x>=1&&x<=10000)||!arr3(doc.shapeVox)||!doc.shapeVox.every((v,i)=>v===shape[i])||!Array.isArray(doc.tiles)||doc.tiles.length!==2||doc.originConvention!=='lower voxel corner'||doc.encoding!=='little-grid-x-fastest-in-JSON-array')throw Error('Expected a v1 two-tile 16 × 12 × 8 synthetic volume, in nanometers.');
 const raw=[];for(let i=0;i<2;i++){
  const [width,Y,Z]=[8,12,8],t=doc.tiles[i],O=[i*width,0,0],S=[width,Y,Z],L=width*Y*Z;
  if(!t||t.id!==tileNames[i]||!arr3(t.offsetVox)||!t.offsetVox.every((x,j)=>x===O[j])||!arr3(t.shapeVox)||!t.shapeVox.every((x,j)=>x===S[j])||!Array.isArray(t.labels)||t.labels.length!==L||!t.labels.every(x=>Number.isInteger(x)&&x>=0&&x<=65535)||!Array.isArray(t.signal)||t.signal.length!==L||!t.signal.every(x=>Number.isInteger(x)&&x>=0&&x<=255))throw Error('Invalid tile bounds or label/signal encoding.');
  raw.push({id:t.id,offsetVox:O,shapeVox:S,labels:[...t.labels],signal:[...t.signal]});
 }
 const coarse=raw.map((t,i)=>{
  const labels=[],signal=[];
  for(let z=0;z<4;z++)for(let y=0;y<6;y++)for(let x=0;x<4;x++){
   const tally=new Map();let sum=0;
   for(let dz=0;dz<2;dz++)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const j=2*x+dx+8*(2*y+dy+12*(2*z+dz)),id=t.labels[j];sum+=t.signal[j];tally.set(id,(tally.get(id)??0)+1)}
   labels.push([...tally.entries()].sort(([a,n],[b,m])=>m-n||a-b)[0][0]);signal.push(Math.round(sum/8));
  }
  return {id:t.id,offsetVox:[i*4,0,0],shapeVox:[4,6,4],labels,signal};
 });
 return {volumeId:doc.volumeId,revision:doc.revision,originNm:[...doc.originNm],voxelSizeNm:[...doc.voxelSizeNm],levels:[raw,coarse]};
}
export function worldFromIndex(volume,level,index,centers=true) {
 const f=levelFactor(level), d=dims(level);
 if(!arr3(index)||!index.every((x,i)=>Number.isInteger(x)&&x>=0&&x<d[i]))throw Error('Index is outside this scale.');
 return index.map((v,i)=>volume.originNm[i]+(v+(centers?.5:0))*f*volume.voxelSizeNm[i]);
}
export function lookup(volume,level,worldNm) {
 const factor=levelFactor(level);
 if(!arr3(worldNm)||!worldNm.every(Number.isFinite))throw Error('Supply finite world x, y, z in nm.');
 const index=worldNm.map((u,i)=>Math.floor((u-volume.originNm[i])/(volume.voxelSizeNm[i]*factor))),d=dims(level);
 if(index.some((u,i)=>u<0||u>=d[i]))throw Error('Point is outside the registered volume.');
 const i=index[0]>=d[0]/2?1:0,t=volume.levels[level][i],local=index.map((u,j)=>u-t.offsetVox[j]),k=local[0]+t.shapeVox[0]*(local[1]+t.shapeVox[1]*local[2]);
 return {level,worldNm:[...worldNm],indexVox:index,tileId:t.id,tileLocalVox:local,segmentId:t.labels[k],intensity:t.signal[k],voxelSizeNm:volume.voxelSizeNm.map(a=>a*factor)};
}
export function initial(doc=makeExample()){
 const v=readVolume(doc),w=worldFromIndex(v,0,[6,6,4]);
 return {volume:v,level:0,cursor:w,revision:0,nextNode:1,nodes:[],edits:[]};
}
function append(state,pos){
 const seen=lookup(state.volume,state.level,pos),native=lookup(state.volume,0,pos),previous=state.nodes.at(-1);
 if(native.segmentId===0||seen.segmentId!==native.segmentId)throw Error('Annotation must use a non-background point whose native and displayed segment IDs agree.');
 if(previous&&previous.segmentId!==native.segmentId)throw Error('Trace stays on one segment. Clear it to start another.');
 const node={id:'node-'+state.nextNode,worldNm:[...pos],segmentId:native.segmentId,prevNodeId:previous?.id??null},revision=state.revision+1;
 return {...state,cursor:[...pos],nextNode:state.nextNode+1,nodes:[...state.nodes,node],revision,edits:[...state.edits,{revision,type:'add-node',nodeId:node.id,captureLevel:state.level,segmentId:native.segmentId,worldNm:[...pos]}]};
}
export function action(s,{type,payload}){
 switch(type){
  case 'zoom':return {...s,level:1-s.level};
  case 'select':lookup(s.volume,s.level,payload);return {...s,cursor:[...payload]};
  case 'slice':{
   if(!Number.isInteger(payload)||payload<0||payload>=shape[2])throw Error('Select base slice 0 to 7.');
   return {...s,cursor:[s.cursor[0],s.cursor[1],s.volume.originNm[2]+(payload+.5)*s.volume.voxelSizeNm[2]]};
  }
  case 'add':return append(s,s.cursor);
  case 'clear': return {...s,nodes:[],revision:s.revision+1,edits:[...s.edits,{revision:s.revision+1,type:'clear'}]};
  case 'demo': if(s.volume.volumeId!=='BTS-SYN-TILES-001'||s.volume.revision!=='synthetic-r1')throw Error('Use the bundled seam example for the predefined trace.');return action(seamDemo.reduce(append,action(s,{type:'clear'})),{type:'select',payload:seamDemo[1]});
  case 'load':return initial(payload);
  default:throw Error('Unknown console action.');
 }
}
export function exportAnnotation(s){
 return {schema:'bts.connectomics.annotation.v1',deviceId:'01-04',origin:'synthetic-geometry-only',volumeId:s.volume.volumeId,volumeRevision:s.volume.revision,annotationRevision:s.revision,coordinateFrame:'axis-aligned XYZ, lower corner registration, right-handed; units nm',originNm:s.volume.originNm,voxelSizeNm:s.volume.voxelSizeNm,selection:lookup(s.volume,s.level,s.cursor),nodes:s.nodes,edits:s.edits};
}
