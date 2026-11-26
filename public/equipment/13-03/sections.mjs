export const fixture=Object.freeze({id:'BTS-INERT-SEALED-VOID-01',revision:1,dims:Object.freeze([48,32,24]),spacingUm:2,source:'Independent immutable digital block; no acquisition or specimen'});
export const targets=Object.freeze({Section_monitor_screen:'cyclePlane',Section_view_key:'center',Volume_measure_key:'measure'});
const modes=Object.freeze({XY:{max:23,center:10,axis:'Z'},XZ:{max:31,center:14,axis:'Y'}});
export function maskAt(x,y,z){
 return x>=14&&x<26&&y>=9&&y<19&&z>=6&&z<14?1:0;
}
export function section(mode,index){
 if(!Object.hasOwn(modes,mode)||!Number.isInteger(index)||index<0||index>modes[mode].max)throw Error('Choose a section index inside the reference.');
 const [w,h]=[fixture.dims[0],fixture.dims[mode==='XY'?1:2]],pixels=new Uint8Array(w*h);
 for(let j=0;j<h;j++)for(let x=0;x<w;x++)pixels[j*w+x]=mode==='XY'?maskAt(x,j,index):maskAt(x,index,j);
 return {mode,index,width:w,height:h,spacingUm:fixture.spacingUm,axis:modes[mode].axis,coordinateUm:(index+.5)*fixture.spacingUm,pixels};
}
export function measure(m){
 let count=0,x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity;
 for(let y=0;y<m.height;y++)for(let x=0;x<m.width;x++)if(m.pixels[y*m.width+x]){
  count++;x1=Math.min(x1,x);y1=Math.min(y1,y);x2=Math.max(x2,x);y2=Math.max(y2,y);
 }
 const d=m.spacingUm;
 return {present:count>0,sectionVoxelCount:count,cavityAreaUm2:count*d*d,sectionExtentUm:count?[(x2-x1+1)*d,(y2-y1+1)*d]:null,
  sectionEdgeBoundsUm:count?[x1*d,y1*d,(x2+1)*d,(y2+1)*d]:null};
}
export function volume(){
 let count=0;
 for(let iz=0;iz<fixture.dims[2];iz++)for(const v of section('XY',iz).pixels)count+=v;
 return {voidVoxelCount:count,cavityVolumeUm3:count*fixture.spacingUm**3};
}
export function file(s){
 const m=section(s.mode,s.index);
 return {schema:'buildthesimulation.inert-cavity-section.v1',fixture:{...fixture,dims:[...fixture.dims]},viewRevision:s.revision,plane:s.mode,index:s.index,coordinateUm:m.coordinateUm,
   axis:m.axis,coordinates:'All axes start at volume edge 0; voxel center = (index + 0.5) × spacing. Raster right and down correspond to increasing axes.',
   image:{pixelDimensions:[m.width,m.height],sampleSpacingUm:m.spacingUm,maskValues:{0:'solid',1:'pre-existing cavity'},pixels:Array.from(m.pixels)},
   measurement:s.result};
}
export function createStation(){
 const initial=()=>({mode:'XY',index:modes.XY.center,result:null,revision:0,error:null});let s=initial();
 function dispatch(k,p){
  if(k==='reset')return s=initial();
  if(k==='center')return s={...s,index:modes[s.mode].center,result:null,error:null};
  if(k==='cyclePlane')p=s.mode==='XY'?'XZ':'XY';
  if(['plane','cyclePlane'].includes(k)&&Object.hasOwn(modes,p))return s={...s,mode:p,index:modes[p].center,result:null,error:null};
  if(k==='index'&&Number.isInteger(p)&&p>=0&&p<=modes[s.mode].max)return s={...s,index:p,result:null,error:null};
  if(k==='measure')return s={...s,result:{...measure(section(s.mode,s.index)),...volume()},revision:s.revision+1,error:null};
  return s={...s,error:'Select a valid section.'};
 }
 return {read:()=>s,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(targets[n]):s};
}
