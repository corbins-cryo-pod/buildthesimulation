export const housing=Object.freeze({model:'Harrick PDC-32G-2',revision:'2025 documentary exterior',widthMm:254,depthMm:203.2,heightMm:215.9});
export const defaults=Object.freeze({gaugeW:280,gaugeD:230,xMm:0,yMm:0,yawDeg:0});
export const limits=Object.freeze({gaugeW:[170,450],gaugeD:[170,450],xMm:[-75,75],yMm:[-75,75],yawDeg:[0,90]});
export function validate(p){
 if(!p||typeof p!=='object')throw Error('Enter the synthetic bench dimensions.');
 const v={};for(const [k,[a,b]] of Object.entries(limits)){if(!Number.isFinite(p[k])||p[k]<a||p[k]>b)throw Error(k+' must be in '+a+'–'+b+'.');v[k]=p[k]}return v;
}
export function fit(p,revision=1,parentRevision=null){
 const v=validate(p),θ=v.yawDeg*Math.PI/180,c=Math.abs(Math.cos(θ)),s=Math.abs(Math.sin(θ)),w=housing.widthMm*c+housing.depthMm*s,d=housing.widthMm*s+housing.depthMm*c;
 const clean=x=>Math.abs(x)<1e-10?0:x;
 const m={leftMm:clean((v.gaugeW-w)/2+v.xMm),rightMm:clean((v.gaugeW-w)/2-v.xMm),frontMm:clean((v.gaugeD-d)/2+v.yMm),backMm:clean((v.gaugeD-d)/2-v.yMm)},minimumMm=Math.min(...Object.values(m));
 return {schema:'bts.enclosure-footprint.report.v1',deviceId:'03-12',origin:'synthetic-external-gauge',housing,revision,parentRevision,dimensionsUnit:'mm',rotationUnit:'degree',frame:'right-handed from above, X right, Y away, positive yaw from X toward Y',gauge:v,projectionMm:{width:w,depth:d},marginsMm:m,minimumMm,status:minimumMm<0?'interference-in-gauge':minimumMm===0?'zero-reserve':'clear-in-gauge',scope:'Static bounding rectangle only; excludes all service, airflow, physical installation, accessories, connection and treatment assumptions.'};
}
export const initial=()=>({p:{...defaults},grid:true,revision:0,result:null});
export function action(s,{type,payload}){
 switch(type){
  case 'grid':return {...s,grid:!s.grid};
  case 'quarterTurn':return {...s,p:{...s.p,yawDeg:s.p.yawDeg===0?90:0},result:null};
  case 'configure':return {...s,p:validate(payload),result:null};
  case 'inspect':{const p=payload===undefined?s.p:validate(payload);return {...s,p,revision:s.revision+1,result:fit(p,s.revision+1,s.revision||null)};}
  case 'reset':return initial();
  default:throw Error('Only exterior inspection actions are supported.');
 }
}
