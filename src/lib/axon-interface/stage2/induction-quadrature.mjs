import {tetraGeometry} from '../../../../public/simulations/biohybrid-axon-interface/stage2/modules/induction.mjs';

// Allocation-free evaluation of the same exact finite straight-segment A.
// No conductor softening; a point inside any finite wire is rejected.
export function vectorPotentialSampler(coil){
 const segments=coil.segments.map(e=>{
  const dx=e.b[0]-e.a[0],dy=e.b[1]-e.a[1],dz=e.b[2]-e.a[2],L=Math.hypot(dx,dy,dz);
  if(!(L>0))throw new Error('Zero-length winding segment.');
  return [...e.a,dx/L,dy/L,dz/L,L,(e.exclusionRadiusM??1e-12)**2];
 });
 return (x,y,z,out)=>{
  if(![x,y,z].every(Number.isFinite))throw new Error('Nonfinite field point.');
  let ax=0,ay=0,az=0;
  for(const [a,b,c,u,v,w,L,exclude2] of segments){
   const dx=x-a,dy=y-b,dz=z-c,s=dx*u+dy*v+dz*w,t=Math.max(0,Math.min(L,s));
   if((dx-t*u)**2+(dy-t*v)**2+(dz-t*w)**2<=exclude2)throw new Error('Field sample intersects finite conductor.');
   const rho2=(dx-s*u)**2+(dy-s*v)**2+(dz-s*w)**2;
   const integral=rho2<1e-32?(s>L?Math.log(s/(s-L)):Math.log((L-s)/(-s))):Math.asinh(s/Math.sqrt(rho2))-Math.asinh((s-L)/Math.sqrt(rho2));
   ax+=1e-7*integral*u;ay+=1e-7*integral*v;az+=1e-7*integral*w;
  }out[0]=ax;out[1]=ay;out[2]=az;return out;
 };
}

/** Diagnostic source quadrature; not a qualified production discretization.
 * Four equal-weight symmetric tetrahedron points integrate quadratics exactly.
 */
export function tetrahedronRule(rule){
 const high=(5+3*Math.sqrt(5))/20,low=(5-Math.sqrt(5))/20;
 if(rule==='centroid')return [{point:[.25,.25,.25,.25],weight:1}];
 if(rule==='tetra11'){
  // Keast (1986), degree-four formula. Weights normalized to unit volume.
  // https://people.math.sc.edu/Burkardt/datasets/quadrature_rules_tet/keast4_x.txt
  // https://people.math.sc.edu/Burkardt/datasets/quadrature_rules_tet/keast4_w.txt
  const rows=[{point:[.25,.25,.25,.25],weight:-.078933333333333333}];
  for(let i=0;i<4;i++)rows.push({point:Array.from({length:4},(_,j)=>i===j?11/14:1/14),weight:.045733333333333333});
  const a=.3994035761667992,b=.1005964238332008;
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)rows.push({point:Array.from({length:4},(_,k)=>k===i||k===j?a:b),weight:.149333333333333333});return rows;
 }
 if(!['vertex','tetra4'].includes(rule))throw new Error('Unknown induction quadrature rule.');
 return Array.from({length:4},(_,i)=>({point:Array.from({length:4},(_,j)=>rule==='vertex'?(i===j?1:0):(i===j?high:low)),weight:.25}));
}
export function quadratureInductionLoad(model,coil,{rule='tetra4',isCancelled=()=>false,onProgress=()=>{}}={}){
 const s=model.settings,conductivityByRegion=[[s.sigmaEndoTransverse,s.sigmaEndoTransverse,s.sigmaEndoLongitudinal],...[s.sigmaPerineurium,s.sigmaEpineurium,s.sigmaSurrounding,s.sigmaWellFluid].map(v=>[v,v,v])];
 const sample=vectorPotentialSampler(coil),rhs=new Float64Array(model.points.length),value=[0,0,0],E=[0,0,0];
 const weights=tetrahedronRule(rule);
 const nodes=rule==='vertex'?model.points.map(p=>sample(p[0]*1e-6,p[1]*1e-6,p[2]*1e-6,[0,0,0])):null;
 for(let k=0;k<model.regions.length;k++){
  if(k%4096===0){if(isCancelled())throw new Error('Induction quadrature cancelled.');onProgress({tetrahedron:k,total:model.regions.length});}
  const ids=Array.from(model.tetrahedra.subarray(4*k,4*k+4)),points=ids.map(i=>model.points[i]),e=tetraGeometry(points),sigma=conductivityByRegion[model.regions[k]];E.fill(0);
  if(nodes){for(const i of ids)for(let j=0;j<3;j++)E[j]-=nodes[i][j]/4;}
  else for(const {point:w,weight} of weights){let x=0,y=0,z=0;for(let j=0;j<4;j++){x+=w[j]*points[j][0];y+=w[j]*points[j][1];z+=w[j]*points[j][2];}sample(x*1e-6,y*1e-6,z*1e-6,value);for(let j=0;j<3;j++)E[j]-=weight*value[j];}
  for(let i=0;i<4;i++)rhs[ids[i]]+=e.volumeUm3*e.gradientsPerUm[i].reduce((sum,v,j)=>sum+v*sigma[j]*E[j],0)*1e-6;
 }
 return {rhsMicroampPerSlew:rhs,conductivityByRegion,rule};
}
