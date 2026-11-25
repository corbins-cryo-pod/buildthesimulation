export const defaults={rate:30,minutes:2,angle:0,azimuth:0,rpm:0,maskFraction:.5,maskGap:0,maskThickness:.5,redeposition:0};
export function exampleSample(){return {schema:"bts.ionmill.sample.v1",sampleId:"AU-COUPON-001",revision:0,material:"Au (illustrative calibrated-rate coupon)",widthMm:10,heightMm:10,nx:64,ny:64,thicknessNm:Array(4096).fill(200)}}
export function validateSample(s){
 if(!s||s.schema!=="bts.ionmill.sample.v1"||typeof s.sampleId!=="string"||!s.sampleId.trim()||!Number.isInteger(s.revision)||s.revision<0||typeof s.material!=="string")throw Error("Unsupported sample schema or missing identifier/revision/material");
 if(![s.nx,s.ny].every(v=>Number.isInteger(v)&&v>=8&&v<=96)||![s.widthMm,s.heightMm].every(v=>Number.isFinite(v)&&v>=0.1&&v<=100)||Math.hypot(s.widthMm,s.heightMm)>100)throw Error("Grid 8–96 per axis; coupon diagonal must fit the 100 mm carrier");
 if(!Array.isArray(s.thicknessNm)||s.thicknessNm.length!==s.nx*s.ny||!s.thicknessNm.every(v=>Number.isFinite(v)&&v>=0&&v<=100000))throw Error("Expected finite nonnegative thickness in nm, up to 100000 nm");
 return s
}
export function runMill(s,c){
 validateSample(s);
 const ranges={rate:[0,500],minutes:[0,60],angle:[0,80],azimuth:[0,360],rpm:[0,45],maskFraction:[0,1],maskGap:[0,2],maskThickness:[0.001,2],redeposition:[0,0.5]};
 for(const [k,[lo,hi]] of Object.entries(ranges))if(!Number.isFinite(c[k])||c[k]<lo||c[k]>hi)throw Error(k+" outside supported range "+lo+"–"+hi);
 const nx=s.nx,ny=s.ny,w=s.widthMm,h=s.heightMm,dx=w/nx,dy=h/ny,old=s.thicknessNm,max=Math.max(...old),min=Math.min(...old);
 const fraction=new Array(nx*ny).fill(0),removed=fraction.slice(),deposited=fraction.slice();
 const theta=c.angle*Math.PI/180,cos=Math.cos(theta),tan=Math.tan(theta),a=c.azimuth*Math.PI/180;
 const turns=c.rpm*c.minutes,whole=Math.floor(turns),rem=turns-whole,phases=[];
 if(turns===0)phases.push([a,1]);else{
  if(whole>0)for(let k=0;k<72;k++)phases.push([a+2*Math.PI*(k+0.5)/72,whole/(turns*72)]);
  if(rem>1e-12){const n=Math.max(1,Math.ceil(72*rem));for(let k=0;k<n;k++)phases.push([a+2*Math.PI*rem*(k+0.5)/n,rem/(turns*n)])}
 }
 function blocked(x,y,z,ux,uy){
  if(c.maskFraction>0){
   let lo=Math.max(0,max/1e6+c.maskGap-z),hi=max/1e6+c.maskGap+c.maskThickness-z;
   for(const [p,v,left,right] of [[x,ux,0,w*c.maskFraction],[y,uy,0,h]]){
    if(Math.abs(v)<1e-12){if(p<left||p>=right){lo=1;hi=0}}else{const q=(left-p)/v,r=(right-p)/v;lo=Math.max(lo,Math.min(q,r));hi=Math.min(hi,Math.max(q,r))}
   }
   if(hi>=lo&&hi>=0)return true
  }
  if(max!==min&&tan>1e-9){
   const step=Math.min(dx,dy)*0.5/Math.max(Math.abs(ux),Math.abs(uy));
   const limit=(max/1e6-z);
   for(let zz=step;zz<=limit;zz+=step){
    const xx=x+ux*zz,yy=y+uy*zz;if(xx<0||xx>=w||yy<0||yy>=h)break;
    if(old[Math.floor(yy/dy)*nx+Math.floor(xx/dx)]/1e6>z+zz+1e-12)return true
   }
  }
  return false
 }
 for(const [phi,weight] of phases){const ux=tan*Math.cos(phi),uy=tan*Math.sin(phi);
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=j*nx+i;if(blocked((i+0.5)*dx,(j+0.5)*dy,old[k]/1e6,ux,uy))fraction[k]+=weight}
 }
 let sum=0,weights=0;const dose=c.rate*c.minutes*cos;
 for(let k=0;k<old.length;k++){fraction[k]=Math.max(0,Math.min(1,fraction[k]));removed[k]=Math.min(old[k],dose*(1-fraction[k]));sum+=removed[k];weights+=fraction[k]}
 if(weights>0)for(let k=0;k<old.length;k++)deposited[k]=c.redeposition*sum*fraction[k]/weights;
 const thicknessNm=old.map((v,k)=>Math.max(0,v-removed[k]+deposited[k]));
 const depositSum=deposited.reduce((a,b)=>a+b,0);
 return {schema:"bts.ionmill.result.v1",provenance:"simulated; user-supplied normal-incidence rate; no measured material calibration",sample:{...s,revision:s.revision+1,thicknessNm},parentRevision:s.revision,controls:{...c},frame:{origin:"lower-left coupon corner",x:"column increasing",y:"row increasing",z:"outward normal",pitchMm:[dx,dy],order:"row-major",angle:"source direction from +z; azimuth from +x toward +y"},shadowFraction:fraction,removedNm:removed,redepositedNm:deposited,normalDoseNm:c.rate*c.minutes,projectedDoseNm:dose,meanRemovedNm:sum/old.length,meanRedepositedNm:depositSum/old.length,removedVolumeMm3:sum*dx*dy/1e6,redepositedVolumeMm3:depositSum*dx*dy/1e6}
}
