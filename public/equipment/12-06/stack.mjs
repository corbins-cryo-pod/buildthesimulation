export const fixture=Object.freeze({id:'BTS-INERT-STACK-BLOCKS-01',revision:1,size:Object.freeze([64,48,21]),spacingUm:Object.freeze([2,2,5]),source:'Original digital geometric test pattern; no optical acquisition'});
export const targets=Object.freeze({Workstation_monitor_screen:'cyclePlane',Workstation_stack_button:'measure',Inert_stack_window:'center'});
const limit={XY:20,XZ:47},middle={XY:7,XZ:20},windows=Object.freeze({normal:[12,225],high:[80,215]});
export function voxel(x,y,z){
 if(x>=22&&x<=33&&y>=17&&y<=24&&z>=5&&z<=10)return 210;
 if(x>=42&&x<=48&&y>=28&&y<=35&&z>=12&&z<=17)return 119;
 return 17+(11*x+5*y+3*z)%11;
}
export function section(mode,index){
 if(!Object.hasOwn(limit,mode)||!Number.isInteger(index)||index<0||index>limit[mode])throw Error('Section index is outside the stack.');
 const xy=mode==='XY', width=fixture.size[0], height=fixture.size[xy?1:2], spacing=[2,xy?2:5],data=new Uint8Array(width*height);
 for(let row=0;row<height;row++)for(let x=0;x<width;x++)data[row*width+x]=xy?voxel(x,row,index):voxel(x,index,row);
 return {mode,index,width,height,spacingUm:spacing,fixedAxis:xy?'Z':'Y',fixedCoordinateUm:index*(xy?5:2),data};
}
export function displayIntensity(v,k='normal'){
 const [a,b]=windows[k]??windows.normal;return Math.max(0,Math.min(1,(v-a)/(b-a)));
}
export function measure(m){
 const edges=[Infinity,Infinity,-Infinity,-Infinity];let voxelCount=0;
 for(let y=0;y<m.height;y++)for(let x=0;x<m.width;x++)if(m.data[y*m.width+x]>=185){
  voxelCount++;edges[0]=Math.min(edges[0],x);edges[1]=Math.min(edges[1],y);edges[2]=Math.max(edges[2],x);edges[3]=Math.max(edges[3],y);
 }
 if(!voxelCount)return {present:false,voxelCount:0,extentUm:null,edgeBoundsUm:null,signalThreshold:185};
 const p=m.spacingUm;return {present:true,voxelCount,extentUm:[(edges[2]-edges[0]+1)*p[0],(edges[3]-edges[1]+1)*p[1]],
  edgeBoundsUm:[(edges[0]-.5)*p[0],(edges[1]-.5)*p[1],(edges[2]+.5)*p[0],(edges[3]+.5)*p[1]],signalThreshold:185};
}
export function file(s){
 const m=section(s.mode,s.index);
 return {schema:'buildthesimulation.inert-voxel-section.v1',fixture:{...fixture,size:[...fixture.size],spacingUm:[...fixture.spacingUm]},viewRevision:s.revision,
  mode:s.mode,index:s.index,fixedAxis:m.fixedAxis,fixedCoordinateUm:m.fixedCoordinateUm,origin:'voxel center at 0 µm, horizontal and vertical indices increase right and down',
  pixelResolution:[m.width,m.height],planeSpacingUm:m.spacingUm,displayWindow:s.window,rawIntensity:Array.from(m.data),measurement:s.result};
}
export function createStation(){
 const initial=()=>({mode:'XY',index:7,window:'normal',result:null,revision:0,error:null});let s=initial();
 function dispatch(k,p){
  if(k==='reset')return s=initial();
  if(k==='center')return s={...s,index:middle[s.mode],result:null,error:null};
  if(k==='cyclePlane')p=s.mode==='XY'?'XZ':'XY';
  if(['cyclePlane','plane'].includes(k)&&Object.hasOwn(middle,p))return s={...s,mode:p,index:middle[p],result:null,error:null};
  if(k==='index'&&Number.isInteger(p)&&p>=0&&p<=limit[s.mode])return s={...s,index:p,result:null,error:null};
  if(k==='window'&&Object.hasOwn(windows,p))return s={...s,window:p,error:null};
  if(k==='measure')return s={...s,result:measure(section(s.mode,s.index)),revision:s.revision+1,error:null};
  return s={...s,error:'Choose an available section index or view.'};
 }
 return {read:()=>s,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(targets[n]):s};
}
