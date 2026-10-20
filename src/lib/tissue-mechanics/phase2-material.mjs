/** Finite-strain isotropic solids and multiplicative Maxwell return mapping.
 * mm, kPa, s. Row-major matrices. Pure trial evaluation: history is never mutated.
 * Budday et al. 2017, doi:10.1016/j.jmbbm.2017.07.014, equations 18–23.
 * The volumetric extension and macrocell discretization are documented separately.
 */
export const I3 = () => Float64Array.of(1,0,0,0,1,0,0,0,1);
export const det3=a=>a[0]*(a[4]*a[8]-a[5]*a[7])-a[1]*(a[3]*a[8]-a[5]*a[6])+a[2]*(a[3]*a[7]-a[4]*a[6]);
export function inv3(a){const d=det3(a);if(!Number.isFinite(d)||Math.abs(d)<1e-24)throw new Error('Singular tensor');return Float64Array.of((a[4]*a[8]-a[5]*a[7])/d,(a[2]*a[7]-a[1]*a[8])/d,(a[1]*a[5]-a[2]*a[4])/d,(a[5]*a[6]-a[3]*a[8])/d,(a[0]*a[8]-a[2]*a[6])/d,(a[2]*a[3]-a[0]*a[5])/d,(a[3]*a[7]-a[4]*a[6])/d,(a[1]*a[6]-a[0]*a[7])/d,(a[0]*a[4]-a[1]*a[3])/d);}
export function mul(a,b){const c=new Float64Array(9);for(let i=0;i<3;i++)for(let j=0;j<3;j++)for(let k=0;k<3;k++)c[3*i+j]+=a[3*i+k]*b[3*k+j];return c;}
export const transpose=a=>Float64Array.of(a[0],a[3],a[6],a[1],a[4],a[7],a[2],a[5],a[8]);
/** Symmetric Jacobi eigensystem; repeated eigenvalues need no special direction. */
export function symmetricEigen(input){
 const a=Float64Array.from(input),v=I3();
 for(let sweep=0;sweep<18;sweep++){
  let p=0,q=1,m=Math.abs(a[1]);if(Math.abs(a[2])>m){p=0;q=2;m=Math.abs(a[2]);}if(Math.abs(a[5])>m){p=1;q=2;m=Math.abs(a[5]);}
  if(m<1e-14*Math.max(1,Math.abs(a[0]),Math.abs(a[4]),Math.abs(a[8])))break;
  const apq=a[3*p+q],theta=(a[3*q+q]-a[3*p+p])/(2*apq),t=(theta>=0?1:-1)/(Math.abs(theta)+Math.sqrt(1+theta*theta)),c=1/Math.sqrt(1+t*t),s=t*c;
  a[3*p+p]-=t*apq;a[3*q+q]+=t*apq;a[3*p+q]=a[3*q+p]=0;
  for(let k=0;k<3;k++){if(k!==p&&k!==q){const x=a[3*k+p],y=a[3*k+q];a[3*k+p]=a[3*p+k]=c*x-s*y;a[3*k+q]=a[3*q+k]=s*x+c*y;}
   const x=v[3*k+p],y=v[3*k+q];v[3*k+p]=c*x-s*y;v[3*k+q]=s*x+c*y;}
 }
 return {values:Float64Array.of(a[0],a[4],a[8]),vectors:v};
}
export function spectral(values,v){const a=new Float64Array(9);for(let i=0;i<3;i++)for(let j=0;j<3;j++)for(let k=0;k<3;k++)a[3*i+j]+=v[3*i+k]*values[k]*v[3*j+k];return a;}
const norm2=a=>a.reduce((s,v)=>s+v*v,0);
function ogdenPrincipal(e,mu,alpha){
 const z=e.map(x=>Math.exp(alpha*x));const mean=(z[0]+z[1]+z[2])/3;
 return {energy:2*mu/(alpha*alpha)*(z[0]+z[1]+z[2]-3),stress:z.map(x=>2*mu/alpha*(x-mean)),z};
}
/** Solve the constrained logarithmic return mapping in two independent coordinates.
 * This minimizes W(e)+eta/dt ||e-etrial||^2 at sum(e)=0. Its envelope derivative
 * is the returned stress. No frozen-stress/fake-time approximation is used.
 */
export function returnMapping(trial,mu,eta,alpha,dt){
 if(!(dt>0&&mu>0&&eta>0&&Math.abs(alpha)>=.1))throw new Error('Invalid viscous increment');
 let e=Float64Array.from(trial),iterations=0;const c=2*eta/dt;
 for(;iterations<30;iterations++){
  const o=ogdenPrincipal(e,mu,alpha),r=e.map((x,i)=>o.stress[i]+c*(x-trial[i]));
  const g0=r[0]-r[2],g1=r[1]-r[2];if(Math.hypot(g0,g1)<1e-11*Math.max(1,mu,c))break;
  const d=o.z.map(z=>2*mu*z+c),a=d[0]+d[2],b=d[2],d11=d[1]+d[2],den=a*d11-b*b;
  const dx=(-d11*g0+b*g1)/den,dy=(b*g0-a*g1)/den;
  const old=o.energy+eta/dt*norm2(e.map((v,i)=>v-trial[i]));let step=1,accepted=false;
  for(let k=0;k<20;k++){const candidate=Float64Array.of(e[0]+step*dx,e[1]+step*dy,e[2]-step*(dx+dy)),next=ogdenPrincipal(candidate,mu,alpha);const objective=next.energy+eta/dt*norm2(candidate.map((v,i)=>v-trial[i]));
   if(Number.isFinite(objective)&&objective<=old+1e-4*step*(g0*dx+g1*dy)+1e-14){e=candidate;accepted=true;break;}step*=.5;}
  if(!accepted)throw new Error('Viscous local line search failed');
 }
 if(iterations===30)throw new Error('Viscous local return mapping did not converge');
 const o=ogdenPrincipal(e,mu,alpha),penalty=eta/dt*norm2(e.map((v,i)=>v-trial[i]));
 return {...o,e,potential:o.energy+penalty,dissipationIncrement:2*penalty,iterations};
}
/** Isochoric equilibrium energy/stress. Stress is Kirchhoff, trace free. */
export function elasticIso(F,{mu=.8,alpha=-16.07,model='ogden',mix=.25}={}){
 const J=det3(F);if(!(J>.08))return null;
 const b=mul(F,transpose(F)),s=J**(-2/3),B=b.map(v=>s*v),I1=B[0]+B[4]+B[8];
 let energy,tau=new Float64Array(9);
 if(model==='neo'||model==='mooney'){
  const fraction=model==='neo'?0:mix,C10=.5*mu*(1-fraction),C01=.5*mu*fraction,BB=mul(B,B),I2=.5*(I1*I1-(BB[0]+BB[4]+BB[8]));
  energy=C10*(I1-3)+C01*(I2-3);
  for(let i=0;i<9;i++)tau[i]=2*C10*B[i]+2*C01*(I1*B[i]-BB[i]);
  const mean=(tau[0]+tau[4]+tau[8])/3;tau[0]-=mean;tau[4]-=mean;tau[8]-=mean;
 }else if(model==='ogden'){
  const ev=symmetricEigen(B);if([...ev.values].some(v=>!(v>0)))return null;
  const e=ev.values.map(v=>.5*Math.log(v)),mean=(e[0]+e[1]+e[2])/3;for(let i=0;i<3;i++)e[i]-=mean;
  const o=ogdenPrincipal(e,mu,alpha);energy=o.energy;tau=spectral(o.stress,ev.vectors);
 }else throw new Error('Unknown constitutive law');
 return {J,energy,tau,P:mul(tau,transpose(inv3(F)))};
}
/** Cv^-1 represents the reference-frame viscous metric for each branch. */
export function materialStep(F,p,old=null,dt=null,commit=false){
 const eq=elasticIso(F,p);if(!eq)return null;
 const tau=eq.tau.slice(),invF=inv3(F),invFT=transpose(invF);let potential=eq.energy,stored=eq.energy,dissipation=0;
 const next=commit?[]:null;
 if(old&&p.branches?.length){
  for(let k=0;k<p.branches.length;k++){
   const {mu,eta}=p.branches[k],trialB=mul(mul(F,old[k]),transpose(F)),eigen=symmetricEigen(trialB);
   if([...eigen.values].some(v=>!(v>0)))return null;
   const trial=eigen.values.map(v=>.5*Math.log(v)),mean=(trial[0]+trial[1]+trial[2])/3;for(let i=0;i<3;i++)trial[i]-=mean;
   let r;try{r=returnMapping(trial,mu,eta,p.alpha,dt);}catch{return null;}const stress=spectral(r.stress,eigen.vectors);
   for(let i=0;i<9;i++)tau[i]+=stress[i];potential+=r.potential;stored+=r.energy;dissipation+=r.dissipationIncrement;
   if(commit){
    // Match det(be)=J^2 so that det(Cv^-1)=1, including compressible total F.
    const be=spectral(r.e.map(v=>Math.exp(2*v)*eq.J**(2/3)),eigen.vectors),cv=mul(mul(invF,be),invFT),scale=det3(cv)**(-1/3);
    for(let i=0;i<9;i++)cv[i]*=scale;next.push(cv);
   }
  }
 }
 return {J:eq.J,P:mul(tau,invFT),tau,energy:potential,storedEnergy:stored,dissipation,next};
}
export const MATERIAL_SOURCE='https://doi.org/10.1016/j.jmbbm.2017.07.014';
const rows=[
 ['cortex-unconditioned','Cortex · first cycle',.36,-16.07,1.78,10.18,.82,697.88,[.922,.963,.954,.861,.308]],
 ['basal-unconditioned','Basal ganglia · first cycle',.33,-17.23,.79,2.89,.29,48.71,[.915,.882,.945,.895,.318]],
 ['corona-unconditioned','Corona radiata · first cycle',.35,-20.80,1.18,2.51,.41,40.72,[.936,.915,.915,.897,-.71]],
 ['callosum-unconditioned','Corpus callosum · first cycle',.17,-21.41,.78,1.91,.30,22.85,[.907,.678,.894,.905,-1.77]],
 ['cortex-conditioned','Cortex · third cycle',.52,-20.47,1.35,2.92,.62,144.67,[.804,.935,.879,.962,.371]],
 ['basal-conditioned','Basal ganglia · third cycle',.22,-21.27,.61,2.44,.25,128.48,[.890,.946,.890,.954,-.40]],
 ['corona-conditioned','Corona radiata · third cycle',.18,-27.53,.87,2.45,.24,151.78,[.872,.963,.827,.948,-.90]],
 ['callosum-conditioned','Corpus callosum · third cycle',.05,-30.64,.54,1.92,.14,141.71,[.760,.897,.748,.972,-1.82]]
];
export const PRESETS=Object.freeze(rows.map(([id,label,mu,alpha,m1,e1,m2,e2,r2])=>Object.freeze({id,label,mu,alpha,model:'ogden',branches:[{mu:m1,eta:e1},{mu:m2,eta:e2}],source:MATERIAL_SOURCE,table:id.includes('unconditioned')?4:6,reportedR2:{shear:r2[0],shearRelaxation:r2[1],compression:r2[2],compressionRelaxation:r2[3],tension:r2[4]},uncertainty:'Source reports averaged fits, not parameter confidence intervals. The sensitivity multiplier is not a confidence interval.'})));
export function phase2Parameters(input={}){
 const preset=PRESETS.find(x=>x.id===input.preset)||PRESETS[0];const p={...preset,nu:.49,formulation:'mixed',stabilization:1,mix:.25,scale:1,...input};
 for(const k of ['mu','alpha','nu','mix','scale','stabilization'])if(!Number.isFinite(p[k]))throw new Error(`Invalid ${k}`);
 if(p.mu<.01||p.mu>20||Math.abs(p.alpha)<.1||Math.abs(p.alpha)>50||p.nu<.2||p.nu>.4995||p.mix<0||p.mix>1||p.scale<.25||p.scale>4||p.stabilization<0||p.stabilization>10)throw new Error('Material parameter outside supported range');
 if(!['mixed','tetra'].includes(p.formulation)||!['ogden','neo','mooney'].includes(p.model))throw new Error('Unsupported material or formulation');
 if(!Array.isArray(p.branches)||p.branches.length>2||p.branches.some(b=>!(Number.isFinite(b.mu)&&b.mu>0&&b.mu<=40&&Number.isFinite(b.eta)&&b.eta>0&&b.eta<=1e5)))throw new Error('Invalid Maxwell branches');
 const previous=Number.isFinite(input.scaleApplied)?input.scaleApplied:1;
 return {...p,mu:p.mu*p.scale/previous,branches:p.branches.map(b=>({mu:b.mu*p.scale/previous,eta:b.eta*p.scale/previous})),scaleApplied:p.scale};
}
