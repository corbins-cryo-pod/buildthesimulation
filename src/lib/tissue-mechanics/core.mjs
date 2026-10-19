/** Tissue Mechanics v1. Finite-strain tetrahedral FEM, no rendering dependencies.
 * Internal units: mm, kPa, mN, microjoules. 1 kPa mm^2 = 1 mN.
 * Compressible neo-Hookean material; NOT a calibrated constitutive fit to brain.
 * Quasistatic minimization: optimizer iterations are NOT physical time.
 */
export const VERSION = 'tissue-mechanics-1.0.0';
export const DEFAULTS = Object.freeze({ n: 8, size: 1, mu: 0.8, nu: 0.45,
  experiment: 'shear', amplitude: 0.08, curved: false, depth: 0.75,
  handle: [0, 1, 0], drag: [0, 0.08, 0], penalty: 100 });
const SPLIT = [[0,1,3,7],[0,3,2,7],[0,2,6,7],[0,6,4,7],[0,4,5,7],[0,5,1,7]];
const det = a => a[0]*(a[4]*a[8]-a[5]*a[7])-a[1]*(a[3]*a[8]-a[5]*a[6])+a[2]*(a[3]*a[7]-a[4]*a[6]);
export function inverse(a) {
  const d = det(a); if (!Number.isFinite(d) || Math.abs(d)<1e-24) throw new Error('Singular reference element');
  return [(a[4]*a[8]-a[5]*a[7])/d,(a[2]*a[7]-a[1]*a[8])/d,(a[1]*a[5]-a[2]*a[4])/d,
    (a[5]*a[6]-a[3]*a[8])/d,(a[0]*a[8]-a[2]*a[6])/d,(a[2]*a[3]-a[0]*a[5])/d,
    (a[3]*a[7]-a[4]*a[6])/d,(a[1]*a[6]-a[0]*a[7])/d,(a[0]*a[4]-a[1]*a[3])/d];
}
export function parameters(input = {}) {
  const p = { ...DEFAULTS, ...input };
  if (![4,8,12].includes(p.n)) throw new Error('Resolution must be 4, 8 or 12');
  for (const k of ['size','mu','nu','amplitude','depth','penalty']) if (!Number.isFinite(p[k])) throw new Error(`Invalid ${k}`);
  if (p.size < 0.01 || p.size > 10 || p.mu < 0.05 || p.mu > 20 || p.nu < 0.2 || p.nu > 0.49) throw new Error('Material or length outside supported range');
  if (Math.abs(p.amplitude)>0.2 || ![0.25,0.5,0.75].includes(p.depth) || p.penalty<10 || p.penalty>1000) throw new Error('Load outside supported range');
  if (!['grab','stretch','compression','shear','indentation','micromotion'].includes(p.experiment)) throw new Error('Unknown experiment');
  for (const k of ['handle','drag']) if (!Array.isArray(p[k]) || p[k].length!==3 || !p[k].every(Number.isFinite)) throw new Error(`Invalid ${k}`);
  if (p.drag.some(v=>Math.abs(v)>0.2) || p.handle.some(v=>Math.abs(v)>1.01)) throw new Error('Drag outside supported range');
  return p;
}
/** Deterministic displacement continuation; avoids collapsing the top element layer. */
export function rampParameters(old,goal){
  goal=parameters(goal);old=old||{...goal,amplitude:0,drag:[0,0,0]};
  const delta=Math.max(Math.abs(goal.amplitude-old.amplitude),...goal.drag.map((v,i)=>Math.abs(v-old.drag[i])));
  const count=Math.max(1,Math.ceil(delta*goal.n/.25));
  return Array.from({length:count},(_,i)=>{const t=(i+1)/count;return {...goal,amplitude:old.amplitude+(goal.amplitude-old.amplitude)*t,drag:goal.drag.map((v,j)=>old.drag[j]+(v-old.drag[j])*t)};});
}
export function makeMesh(input = {}) {
  const p = parameters(input), {n,size:L} = p, X=[], uv=[], tets=[], used=new Set(), faces=new Map();
  const id=(i,j,k)=>i+(n+1)*(j+(n+1)*k);
  const axis=i=>p.experiment!=='micromotion'?i/n-.5:i<=n/4?-.5+.375*i/(n/4):i<=3*n/4?-.125+.25*(i-n/4)/(n/2):.125+.375*(i-3*n/4)/(n/4);
  for(let k=0;k<=n;k++)for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){
    const x=axis(i),y=j/n,z=axis(k);
    // Mild geometric cap, not a subject-specific cortical surface or pia layer.
    const cap=p.curved&&p.experiment!=='micromotion'?1-0.18*(x*x+z*z):1;
    X.push(x*L,y*L*cap,z*L);uv.push(x,y,z);
  }
  for(let k=0;k<n;k++)for(let j=0;j<n;j++)for(let i=0;i<n;i++){
    const cx=(axis(i)+axis(i+1))/2,cz=(axis(k)+axis(k+1))/2;
    if(p.experiment==='micromotion'&&Math.abs(cx)<.125&&Math.abs(cz)<.125&&j/n>=1-p.depth)continue;
    const v=[id(i,j,k),id(i+1,j,k),id(i,j+1,k),id(i+1,j+1,k),id(i,j,k+1),id(i+1,j,k+1),id(i,j+1,k+1),id(i+1,j+1,k+1)];
    for(const s of SPLIT)tets.push(...s.map(a=>v[a]));
  }
  const gradients=new Float64Array(tets.length*3), volumes=new Float64Array(tets.length/4);
  for(let e=0;e<volumes.length;e++){
    const ids=tets.slice(e*4,e*4+4), a=ids[0]*3, dm=[];
    for(let r=0;r<3;r++)for(let c=1;c<4;c++)dm.push(X[ids[c]*3+r]-X[a+r]);
    const inv=inverse(dm);volumes[e]=Math.abs(det(dm))/6;
    for(let r=0;r<3;r++){
      gradients[e*12+r]=-inv[r]-inv[3+r]-inv[6+r];
      for(let b=1;b<4;b++)gradients[e*12+b*3+r]=inv[(b-1)*3+r];
    }
    ids.forEach(v=>used.add(v));
    for(let opposite=0;opposite<4;opposite++){
      let f=ids.filter((_,k)=>k!==opposite), key=[...f].sort((a,b)=>a-b).join(',');
      if(faces.has(key)){faces.delete(key);continue;}
      const A=f.map(i=>X.slice(i*3,i*3+3)), ab=A[1].map((x,i)=>x-A[0][i]),ac=A[2].map((x,i)=>x-A[0][i]);
      const cross=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
      if(cross.reduce((s,x,i)=>s+x*(X[ids[opposite]*3+i]-A[0][i]),0)>0)[f[1],f[2]]=[f[2],f[1]];
      faces.set(key,f);
    }
  }
  const surface=Uint32Array.from([...faces.values()].flat()), topArea=new Float64Array(X.length/3), boundary=new Uint8Array(X.length/3);
  for(let f=0;f<surface.length;f+=3){
    const ids=Array.from(surface.slice(f,f+3));ids.forEach(i=>boundary[i]=1);
    if(!ids.every(i=>uv[i*3+1]===1))continue;
    const a=ids[0]*3,b=ids[1]*3,c=ids[2]*3;
    const u=[X[b]-X[a],X[b+1]-X[a+1],X[b+2]-X[a+2]],v=[X[c]-X[a],X[c+1]-X[a+1],X[c+2]-X[a+2]];
    const area=Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2;
    ids.forEach(i=>topArea[i]+=area/3);
  }
  return { p,X:Float64Array.from(X), uv:Float64Array.from(uv), tets:Uint32Array.from(tets), gradients,volumes,surface,topArea,boundary,used };
}
/** Energy and first Piola stress; returns null for rejected/inverted deformation. */
export function material(F,mu,lambda) {
  const J=det(F);if(!Number.isFinite(J)||J<=0.08)return null;
  const log=Math.log(J),s=lambda*log-mu, inv=inverse(F),P=new Float64Array(9);
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)P[i*3+j]=mu*F[i*3+j]+s*inv[j*3+i];
  return {J,energy:.5*mu*(F.reduce((s,v)=>s+v*v,0)-3)-mu*log+.5*lambda*log*log,P};
}
export function deformation(mesh,x,e,F=new Float64Array(9)){
  F.fill(0);
  for(let a=0;a<4;a++){const i=mesh.tets[e*4+a]*3,g=e*12+a*3;
    for(let r=0;r<3;r++)for(let c=0;c<3;c++)F[r*3+c]+=x[i+r]*mesh.gradients[g+c];}
  return F;
}
export function boundaries(mesh,input=mesh.p){
  const p=parameters(input), fixed=new Uint8Array(mesh.X.length),target=mesh.X.slice(), handles=new Uint8Array(mesh.X.length/3),L=p.size,eps=1e-8;
  const fix=(i,axes,displacement=[0,0,0],loaded=false)=>{for(const a of axes){fixed[i*3+a]=1;target[i*3+a]=mesh.X[i*3+a]+displacement[a];}if(loaded)handles[i]=1;};
  for(let i=0;i<mesh.X.length/3;i++){
    const [x,y,z]=mesh.uv.slice(i*3,i*3+3);
    if(!mesh.used.has(i)){fix(i,[0,1,2]);continue;}
    if(y===0)fix(i,[0,1,2]);
    if(p.experiment==='micromotion'){
      if(Math.abs(x)===.5||Math.abs(z)===.5)fix(i,[0,1,2]);
      const inside=Math.abs(x)<=.125+eps&&Math.abs(z)<=.125+eps&&y>=1-p.depth-eps;
      if(inside&&mesh.boundary[i])fix(i,[0,1,2],[p.amplitude*L,0,0],true);
    }else if(p.experiment==='grab'){
      if(mesh.boundary[i]&&y>0&&Math.hypot(x-p.handle[0],y-p.handle[1],z-p.handle[2])<=.27)fix(i,[0,1,2],p.drag.map(v=>v*L),true);
    }else if(y===1&&['shear','stretch','compression'].includes(p.experiment)){
      if(p.experiment==='shear')fix(i,[0,1,2],[p.amplitude*L,0,0],true);
      else fix(i,[1],[0,(p.experiment==='compression'?-1:1)*Math.abs(p.amplitude)*L,0],true);
    }
  }
  return {fixed,target,handles};
}
export function evaluate(mesh,x,p=mesh.p,diagnostic=false){
  const mu=p.mu,lambda=2*mu*p.nu/(1-2*p.nu),g=new Float64Array(x.length),F=new Float64Array(9);
  let energy=0,minJ=Infinity,maxJ=-Infinity,volume=0,maxPenetration=0,contactForce=0;
  const nodal=diagnostic?new Float64Array(x.length/3*3):null,weights=diagnostic?new Float64Array(x.length/3):null;
  let peakStrain=0,peakStress=0;
  for(let e=0;e<mesh.volumes.length;e++){
    deformation(mesh,x,e,F);const m=material(F,mu,lambda);
    if(!m)return {energy:Infinity,g,minJ:0,maxJ:Infinity};
    const V=mesh.volumes[e];energy+=V*m.energy;minJ=Math.min(minJ,m.J);maxJ=Math.max(maxJ,m.J);volume+=V*m.J;
    for(let a=0;a<4;a++){const i=mesh.tets[e*4+a]*3,h=e*12+a*3;
      for(let r=0;r<3;r++)g[i+r]+=V*(m.P[r*3]*mesh.gradients[h]+m.P[r*3+1]*mesh.gradients[h+1]+m.P[r*3+2]*mesh.gradients[h+2]);}
    if(diagnostic){
      let norm=0;const sigma=new Float64Array(9);
      for(let r=0;r<3;r++)for(let c=0;c<3;c++){
        let C=0,B=0;for(let a=0;a<3;a++){C+=F[a*3+r]*F[a*3+c];B+=F[r*3+a]*F[c*3+a];}
        norm+=((C-(r===c?1:0))*.5)**2;
        sigma[r*3+c]=(mu*(B-(r===c?1:0))+(r===c?lambda*Math.log(m.J):0))/m.J;
      }
      const mean=(sigma[0]+sigma[4]+sigma[8])/3;
      const vm=Math.sqrt(1.5*sigma.reduce((s,v,i)=>s+(v-(i%4===0?mean:0))**2,0)),strain=Math.sqrt(norm);
      peakStrain=Math.max(peakStrain,strain);peakStress=Math.max(peakStress,vm);
      for(let a=0;a<4;a++){const i=mesh.tets[e*4+a];weights[i]+=V;nodal[i*3]+=strain*V;nodal[i*3+1]+=vm*V;nodal[i*3+2]+=m.J*V;}
    }
  }
  if(p.experiment==='indentation'){
    const radius=.2*p.size,center=[0,1.2*p.size-Math.abs(p.amplitude)*p.size,0],k=p.penalty*p.mu/p.size;
    for(let i=0;i<mesh.topArea.length;i++)if(mesh.topArea[i]){
      const dx=x[i*3]-center[0],dy=x[i*3+1]-center[1],dz=x[i*3+2]-center[2],d=Math.hypot(dx,dy,dz),penetration=radius-d;
      if(penetration<=0)continue;if(d<1e-12)return {energy:Infinity,g,minJ:0,maxJ:Infinity};
      const force=k*mesh.topArea[i]*penetration;
      energy+=.5*force*penetration;g[i*3]-=force*dx/d;g[i*3+1]-=force*dy/d;g[i*3+2]-=force*dz/d;
      contactForce+=-force*dy/d;maxPenetration=Math.max(maxPenetration,penetration);
    }
  }
  if(diagnostic)for(let i=0;i<weights.length;i++)if(weights[i])for(let a=0;a<3;a++)nodal[i*3+a]/=weights[i];
  return {energy,g,minJ,maxJ,volume,maxPenetration,contactForce,peakStrain,peakStress,nodal};
}
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
/** Restartable L-BFGS with Armijo backtracking; fixed DOFs eliminated exactly. */
export class Solver {
  constructor(mesh,p=mesh.p,{initial=null,tolerance=1e-5,maxIterations=400}={}){
    this.mesh=mesh;this.p=parameters(p);this.bc=boundaries(mesh,p);this.x=initial?.length===mesh.X.length?Float64Array.from(initial):mesh.X.slice();
    for(let i=0;i<this.x.length;i++)if(this.bc.fixed[i])this.x[i]=this.bc.target[i];
    this.tolerance=tolerance;this.maxIterations=maxIterations;this.iteration=0;this.history=[];this.status='solving';
    this.current=evaluate(mesh,this.x,p);this.project(this.current.g);this.residual=this.norm(this.current.g);
    if(!Number.isFinite(this.current.energy))this.status='invalid initial deformation';
  }
  project(g){for(let i=0;i<g.length;i++)if(this.bc.fixed[i])g[i]=0;}
  norm(g){return Math.sqrt(dot(g,g))/(this.p.mu*this.p.size*this.p.size);}
  step(){
    if(this.status!=='solving')return false;
    if(this.residual<=this.tolerance){this.status='converged';return false;}
    if(this.iteration>=this.maxIterations){this.status='iteration limit';return false;}
    const q=this.current.g.slice(),alpha=[];
    for(let h=this.history.length-1;h>=0;h--){const H=this.history[h];alpha[h]=H.rho*dot(H.s,q);for(let i=0;i<q.length;i++)q[i]-=alpha[h]*H.y[i];}
    const last=this.history.at(-1),scale=last?dot(last.s,last.y)/dot(last.y,last.y):1/(this.p.mu*this.p.size);
    for(let i=0;i<q.length;i++)q[i]*=scale;
    for(let h=0;h<this.history.length;h++){const H=this.history[h],b=H.rho*dot(H.y,q);for(let i=0;i<q.length;i++)q[i]+=H.s[i]*(alpha[h]-b);}
    for(let i=0;i<q.length;i++)q[i]=-q[i];
    let slope=dot(q,this.current.g);
    if(!Number.isFinite(slope)||slope>=0){this.history=[];for(let i=0;i<q.length;i++)q[i]=-this.current.g[i]/(this.p.mu*this.p.size);slope=dot(q,this.current.g);}
    let step=1,candidate,trial,accepted=false;
    for(let k=0;k<32;k++){
      candidate=this.x.map((v,i)=>v+step*q[i]);trial=evaluate(this.mesh,candidate,this.p);
      if(Number.isFinite(trial.energy)&&trial.energy<=this.current.energy+1e-4*step*slope){accepted=true;break;}step*=.5;
    }
    if(!accepted){this.status='line search stalled';return false;}
    this.project(trial.g);
    const s=candidate.map((v,i)=>v-this.x[i]),y=trial.g.map((v,i)=>v-this.current.g[i]),sy=dot(s,y);
    if(sy>1e-12*Math.sqrt(dot(s,s)*dot(y,y))&&sy>1e-30){this.history.push({s,y,rho:1/sy});if(this.history.length>8)this.history.shift();}
    this.x=candidate;this.current=trial;this.residual=this.norm(trial.g);this.iteration++;
    if(this.residual<=this.tolerance)this.status='converged';
    return this.status==='solving';
  }
  report(){
    const d=evaluate(this.mesh,this.x,this.p,true),reaction=[0,0,0];
    for(let i=0;i<this.bc.handles.length;i++)if(this.bc.handles[i])for(let a=0;a<3;a++)if(this.bc.fixed[i*3+a])reaction[a]+=d.g[i*3+a];
    const restVolume=this.mesh.volumes.reduce((s,v)=>s+v,0);
    return {status:this.status,iterations:this.iteration,residual:this.residual,tolerance:this.tolerance,energyMicroJ:d.energy,
      minJ:d.minJ,maxJ:d.maxJ,volumeRatio:d.volume/restVolume,peakStrain:d.peakStrain,peakStressKPa:d.peakStress,
      contactForceMN:d.contactForce,contactPenetrationMM:d.maxPenetration,reactionMN:reaction,nodal:d.nodal};
  }
}
/** Barycentric material embedding. Outside points rejected, never silently clamped. */
export function embedPoints(mesh,points){
  if(points.length%3||!Array.from(points).every(Number.isFinite))throw new Error('Invalid embedding coordinates');
  const ids=new Int32Array(points.length/3).fill(-1),weights=new Float64Array(points.length/3*4);
  // Uniform spatial buckets over reference tetrahedron bounds, built once.
  const n=mesh.p.n,L=mesh.p.size,bin=(v,a)=>Math.max(0,Math.min(n-1,Math.floor((v/L+(a===1?0:.5))*n)));
  if(!mesh.buckets){
    mesh.buckets=new Map();
    for(let e=0;e<mesh.volumes.length;e++){
      const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
      for(let a=0;a<4;a++)for(let r=0;r<3;r++){const v=mesh.X[mesh.tets[e*4+a]*3+r];lo[r]=Math.min(lo[r],v);hi[r]=Math.max(hi[r],v);}
      for(let z=bin(lo[2],2);z<=bin(hi[2],2);z++)for(let y=bin(lo[1],1);y<=bin(hi[1],1);y++)for(let x=bin(lo[0],0);x<=bin(hi[0],0);x++){
        const key=x+n*(y+n*z);if(!mesh.buckets.has(key))mesh.buckets.set(key,[]);mesh.buckets.get(key).push(e);
      }
    }
  }
  for(let i=0;i<ids.length;i++)for(const e of mesh.buckets.get(bin(points[i*3],0)+n*(bin(points[i*3+1],1)+n*bin(points[i*3+2],2)))||[]){
    const origin=mesh.tets[e*4]*3,dx=[points[i*3]-mesh.X[origin],points[i*3+1]-mesh.X[origin+1],points[i*3+2]-mesh.X[origin+2]],w=[1,0,0,0];
    for(let a=1;a<4;a++){w[a]=dx.reduce((s,v,r)=>s+v*mesh.gradients[e*12+a*3+r],0);w[0]-=w[a];}
    if(w.every(v=>v>=-1e-7&&v<=1+1e-7)){ids[i]=e;weights.set(w,i*4);break;}
  }
  return {ids,weights};
}
export function advect(mesh,x,embedding){
  const out=new Float32Array(embedding.ids.length*3);
  for(let i=0;i<embedding.ids.length;i++){
    const e=embedding.ids[i];if(e<0){out.fill(NaN,i*3,i*3+3);continue;}
    for(let a=0;a<4;a++)for(let r=0;r<3;r++)out[i*3+r]+=embedding.weights[i*4+a]*x[mesh.tets[e*4+a]*3+r];
  }
  return out;
}
