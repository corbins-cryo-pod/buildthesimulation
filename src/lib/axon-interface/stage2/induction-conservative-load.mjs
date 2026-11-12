import {tetraGeometry} from '../../../../public/simulations/biohybrid-axon-interface/stage2/modules/induction.mjs';
import {tetrahedronRule,vectorPotentialSampler} from './induction-quadrature.mjs';

/** A closed finite winding has div(A)=0. In each constant diagonal tissue
 * tensor with sigma_x=sigma_y=t, integration by parts gives
 * b_i = -t integral_boundary N_i A.n - (sigma_z-t) integral_volume d_z N_i A_z.
 * Internal faces cancel before quadrature. This avoids integrating the large
 * solenoidal transverse field against a numerically imperfect volume rule.
 * The physical stiffness and zero outer boundary are unchanged.
 */
function closedPath(coil){
 const counts=new Map();for(const e of coil.segments){for(const [p,sign] of [[e.a,1],[e.b,-1]]){const key=p.join(',');counts.set(key,(counts.get(key)??0)+sign);}}
 if([...counts.values()].some(x=>x!==0))throw new Error('Conservative induction assembly requires a closed winding.');
}
function gauss01(n){
 if(![2,4,6,8].includes(n))throw new Error('Face quadrature supports 2, 4, 6 or 8 Gauss points per coordinate.');
 const rows=[];for(let i=1;i<=n;i++){
  let x=Math.cos(Math.PI*(i-.25)/(n+.5)),derivative;
  for(let k=0;k<30;k++){let p0=1,p1=x;for(let j=2;j<=n;j++){const p=((2*j-1)*x*p1-(j-1)*p0)/j;p0=p1;p1=p;}derivative=n*(x*p1-p0)/(x*x-1);const dx=p1/derivative;x-=dx;if(Math.abs(dx)<1e-15)break;}
  rows.push({x:(1+x)/2,w:1/((1-x*x)*derivative*derivative)});
 }return rows;
}
export function triangleRule(n=4){const g=gauss01(n),rows=[];for(const u of g)for(const v of g)rows.push({point:[1-u.x,u.x*(1-v.x),u.x*v.x],weight:2*u.x*u.w*v.w});return rows;}
function axialSampler(coil){
 const segments=coil.segments.filter(e=>e.b[2]!==e.a[2]).map(e=>{const d=e.b.map((x,i)=>x-e.a[i]),L=Math.hypot(...d);return [...e.a,...d.map(x=>x/L),L,(e.exclusionRadiusM??1e-12)**2];});
 return (x,y,z)=>{let Az=0;for(const [a,b,c,u,v,w,L,exclude2] of segments){const dx=x-a,dy=y-b,dz=z-c,s=dx*u+dy*v+dz*w,t=Math.max(0,Math.min(L,s));if((dx-t*u)**2+(dy-t*v)**2+(dz-t*w)**2<=exclude2)throw new Error('Induction volume sample intersects a conductor.');const rho2=(dx-s*u)**2+(dy-s*v)**2+(dz-s*w)**2;const integral=rho2<1e-32?(s>L?Math.log(s/(s-L)):Math.log((L-s)/(-s))):Math.asinh(s/Math.sqrt(rho2))-Math.asinh((s-L)/Math.sqrt(rho2));Az+=1e-7*w*integral;}return Az;};
}
export function conservativeInductionLoad(model,coil,{faceOrder=4,volumeRule='tetra4',isCancelled=()=>false,onProgress=()=>{}}={}){
 closedPath(coil);const start=performance.now(),s=model.settings,tensors=[[s.sigmaEndoTransverse,s.sigmaEndoTransverse,s.sigmaEndoLongitudinal],...[s.sigmaPerineurium,s.sigmaEpineurium,s.sigmaSurrounding,s.sigmaWellFluid].map(x=>[x,x,x])],rhs=new Float64Array(model.points.length),faces=new Map(),surfaceRule=triangleRule(faceOrder),volume=tetrahedronRule(volumeRule),sampleA=vectorPotentialSampler(coil),sampleAz=axialSampler(coil),A=[0,0,0];let faceCount=0,volumeCount=0;
 function integrateFace(ids,normal,sigma){
  if(sigma===0)return;const points=ids.map(i=>model.points[i]);faceCount++;
  for(const {point:w,weight} of surfaceRule){let x=0,y=0,z=0;for(let j=0;j<3;j++){x+=w[j]*points[j][0];y+=w[j]*points[j][1];z+=w[j]*points[j][2];}sampleA(x*1e-6,y*1e-6,z*1e-6,A);const flux=-sigma*weight*1e-6*(normal[0]*A[0]+normal[1]*A[1]+normal[2]*A[2]);for(let j=0;j<3;j++)rhs[ids[j]]+=w[j]*flux;}
 }
 for(let k=0;k<model.regions.length;k++){
  if(k%4096===0){if(isCancelled())throw new Error('Induction assembly cancelled.');onProgress({phase:'Conservative induction assembly',tetrahedron:k,total:model.regions.length});}
  const ids=Array.from(model.tetrahedra.subarray(4*k,4*k+4)),sigma=tensors[model.regions[k]],delta=sigma[2]-sigma[0];
  if(delta!==0){const points=ids.map(i=>model.points[i]),e=tetraGeometry(points);let az=0;volumeCount++;
   for(const {point:w,weight} of volume){let x=0,y=0,z=0;for(let j=0;j<4;j++){x+=w[j]*points[j][0];y+=w[j]*points[j][1];z+=w[j]*points[j][2];}az+=weight*sampleAz(x*1e-6,y*1e-6,z*1e-6);}
   for(let j=0;j<4;j++)rhs[ids[j]]-=delta*e.volumeUm3*e.gradientsPerUm[j][2]*az*1e-6;
  }
  for(let opposite=0;opposite<4;opposite++){
   const face=ids.filter((_,j)=>j!==opposite).sort((a,b)=>a-b),key=face.join(','),previous=faces.get(key);
   if(previous){faces.delete(key);integrateFace(face,previous.normal,previous.sigma-sigma[0]);}
   else{const [a,b,c]=face.map(i=>model.points[i]),d=model.points[ids[opposite]],u=b.map((x,j)=>x-a[j]),v=c.map((x,j)=>x-a[j]),normal=[(u[1]*v[2]-u[2]*v[1])/2,(u[2]*v[0]-u[0]*v[2])/2,(u[0]*v[1]-u[1]*v[0])/2];if(normal.reduce((q,x,j)=>q+x*(d[j]-a[j]),0)>0)for(let j=0;j<3;j++)normal[j]*=-1;faces.set(key,{ids:face,normal,sigma:sigma[0]});}
  }
 }
 for(const face of faces.values())integrateFace(face.ids,face.normal,face.sigma);
 return {rhsMicroampPerSlew:rhs,conductivityByRegion:tensors,diagnostics:{formulation:'closed-winding divergence-free boundary flux plus longitudinal anisotropic volume term',faceOrder,volumeRule,integratedFaces:faceCount,anisotropicTetrahedra:volumeCount,loadSumMicroampPerSlew:rhs.reduce((a,b)=>a+b,0),assemblySeconds:(performance.now()-start)/1000}};
}
