// Synthetic static stack for display only. No specimen, optics, acquisition or decay model.
export const NX=32,NY=24,NZ=13;
export const spacingUm=Object.freeze([.5,.5,1.25]),originUm=Object.freeze([-8,-6,-6.25]);
export const initial=()=>({plane:5,voxel:null,result:null,error:'',revision:0});
const valid=(q,n)=>Number.isInteger(q)&&q>=0&&q<n;
function check(k){if(!valid(k,NZ))throw Error('Choose an integer plane from 0 to 12.');}
function value(x,y,z){return x>=4&&x<=11&&y>=6&&y<=13&&z>=2&&z<=6?70:x>=17&&x<=22&&y>=8&&y<=11&&z>=5&&z<=10?150:0;}
export function lookup(k,x,y){
 check(k);if(!valid(x,NX)||!valid(y,NY))throw Error('Select a voxel inside the displayed plane.');
 return {x,y,k,xUm:originUm[0]+x*spacingUm[0],yUm:originUm[1]+y*spacingUm[1],zUm:originUm[2]+k*spacingUm[2],value:value(x,y,k)};
}
export function plane(k,voxel=null,rev=0){
 check(k);const values=Array.from({length:NX*NY},(_,i)=>value(i%NX,Math.floor(i/NX),k));
 return {schema:'bts.synthetic-stack-plane.v1',deviceId:'12-08',sampleId:'inert-block-stack-01',kind:'synthetic digital values',revision:rev+1,parentRevision:rev,
   frame:{axes:['X right','Y down','Z plane index increases'],size:[NX,NY,NZ],spacingUm,originUm,originConvention:'index zero voxel center'},
   plane:{index:k,zUm:originUm[2]+k*spacingUm[2],width:NX,height:NY,order:'row-major X fastest',values,nonzero:values.filter(x=>x!==0).length,sum:values.reduce((a,b)=>a+b,0)},
   voxel,provenance:'Two original constant-valued rectangular blocks on a fixed inert synthetic grid. No data was acquired; no signal decay or microscopy settings.'};
}
export function act(s,id,p){
 if(id==='reset')return initial();
 if(id==='prev'||id==='next')return act(s,'select',Math.max(0,Math.min(NZ-1,s.plane+(id==='next'?1:-1))));
 if(id==='select')return act({...s,plane:p,voxel:null},'view');
 if(id==='voxel'){try{return act({...s,voxel:lookup(s.plane,p[0],p[1])},'view');}catch(e){return {...s,error:e.message}}}
 if(id==='view'){try{const result=plane(s.plane,s.voxel,s.revision);return {...s,result,revision:result.revision,error:''};}catch(e){return {...s,result:null,error:e.message};}}
 throw Error('Unknown read-only view action');
}
export function csv(r){return ['sampleId,revision,plane,xIndex,yIndex,x_um,y_um,z_um,synthetic_value',...r.plane.values.map((v,i)=>{const x=i%NX,y=Math.floor(i/NX);return [r.sampleId,r.revision,r.plane.index,x,y,originUm[0]+x*spacingUm[0],originUm[1]+y*spacingUm[1],r.plane.zUm,v].join(',');})].join('\n')+'\n';}
