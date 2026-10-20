/** Mixed P1 / macrocell-P0 mechanics with physical-time multiplicative Maxwell history.
 * Six conforming tetrahedra per parent cell; one independent hydrostatic pressure.
 * Pressure is statically condensed: p=K*(Jbar-1), with full deviatoric integration
 * and shear-scale local volume fluctuation stabilization. Not an exactly
 * incompressible or generally inf-sup-stable arbitrary-tetrahedron formulation.
 */
import {makeMesh,parameters,boundaries,deformation,Solver,rampParameters} from './core.mjs';
import {I3,inv3,transpose,mul,materialStep,phase2Parameters} from './phase2-material.mjs';
export const PHASE2_VERSION='tissue-mechanics-2.0.0';
export function config(input={}){const material=phase2Parameters(input);return parameters({...input,...material});}
export function makePhase2Mesh(input={}){
 const p=config(input),mesh=makeMesh(p);if(mesh.volumes.length%6)throw new Error('Mixed formulation requires the ordered six-tet macrocells');
 mesh.macroVolumes=new Float64Array(mesh.volumes.length/6);
 for(let e=0;e<mesh.volumes.length;e++)mesh.macroVolumes[Math.floor(e/6)]+=mesh.volumes[e];
 return mesh;
}
export function initialHistory(mesh,p=mesh.p){return Array.from({length:p.branches.length},()=>{const x=new Float64Array(mesh.volumes.length*9);for(let e=0;e<mesh.volumes.length;e++)x.set(I3(),e*9);return x;});}
export function bulkModulus(p){const mu0=p.mu+p.branches.reduce((s,b)=>s+b.mu,0);return 2*mu0*(1+p.nu)/(3*(1-2*p.nu));}
function nodeForce(mesh,g,e,P){for(let a=0;a<4;a++){const i=3*mesh.tets[4*e+a],h=12*e+3*a,V=mesh.volumes[e];for(let r=0;r<3;r++)g[i+r]+=V*(P[3*r]*mesh.gradients[h]+P[3*r+1]*mesh.gradients[h+1]+P[3*r+2]*mesh.gradients[h+2]);}}
export function physicalBoundaries(mesh,p){
 const bc=boundaries(mesh,p);
 if(p.signedCycle&&['stretch','compression'].includes(p.experiment)){const sign=p.experiment==='compression'?-1:1;for(let i=0;i<mesh.topArea.length;i++)if(mesh.topArea[i])bc.target[3*i+1]=mesh.X[3*i+1]+sign*p.amplitude*p.size;}
 if(p.forceControlled){for(let i=0;i<mesh.topArea.length;i++)if(mesh.topArea[i]){for(let a=0;a<3;a++)bc.fixed[3*i+a]=0;bc.handles[i]=0;}}
 return bc;
}
export function evaluatePhase2(mesh,x,p=mesh.p,diagnostic=false,{history=null,dt=null,commit=false}={}){
 const count=mesh.volumes.length,K=bulkModulus(p),mu0=p.mu+p.branches.reduce((s,b)=>s+b.mu,0),stab=p.stabilization*mu0;
 const g=new Float64Array(x.length),Fs=new Float64Array(count*9),Js=new Float64Array(count),Ps=new Float64Array(count*9),means=new Float64Array(count/6),vols=mesh.macroVolumes;
 const next=commit?initialHistory(mesh,p):null,F=new Float64Array(9);let energy=0,storedEnergy=0,dissipation=0,minJ=Infinity,maxJ=-Infinity,volume=0;
 for(let e=0;e<count;e++){
  deformation(mesh,x,e,F);const old=history?.map(b=>b.subarray(e*9,e*9+9));const m=materialStep(F,p,old,dt,commit);
  if(!m||!Number.isFinite(m.energy))return {energy:Infinity,g,minJ:0,maxJ:Infinity};
  Fs.set(F,e*9);Js[e]=m.J;Ps.set(m.P,e*9);const V=mesh.volumes[e];energy+=V*m.energy;storedEnergy+=V*m.storedEnergy;dissipation+=V*m.dissipation;
  means[Math.floor(e/6)]+=V*m.J/vols[Math.floor(e/6)];minJ=Math.min(minJ,m.J);maxJ=Math.max(maxJ,m.J);volume+=V*m.J;
  if(commit&&m.next)for(let b=0;b<m.next.length;b++)next[b].set(m.next[b],e*9);
 }
 const pressure=new Float64Array(means.length);let maxMacroVolumeError=0,maxVolumeFluctuation=0;
 for(let c=0;c<means.length;c++){pressure[c]=K*(means[c]-1);maxMacroVolumeError=Math.max(maxMacroVolumeError,Math.abs(means[c]-1));if(p.formulation==='mixed'){const E=.5*K*vols[c]*(means[c]-1)**2;energy+=E;storedEnergy+=E;}}
 let peakStrain=0,peakStress=0;const nodal=diagnostic?new Float64Array(x.length):null,weights=diagnostic?new Float64Array(x.length/3):null;
 for(let e=0;e<count;e++){
  const c=Math.floor(e/6),J=Js[e],F=Fs.subarray(e*9,e*9+9),P=Ps.subarray(e*9,e*9+9),cofactor=transpose(inv3(F)),V=mesh.volumes[e];
  const fluct=J-means[c];maxVolumeFluctuation=Math.max(maxVolumeFluctuation,Math.abs(fluct));
  const pr=p.formulation==='mixed'?pressure[c]+stab*fluct:K*(J-1);
  const E=p.formulation==='mixed'?.5*stab*V*fluct*fluct:.5*K*V*(J-1)**2;energy+=E;storedEnergy+=E;
  for(let i=0;i<9;i++)P[i]+=pr*J*cofactor[i];nodeForce(mesh,g,e,P);
  if(diagnostic){
   const C=mul(transpose(F),F),sigma=mul(P,transpose(F));let norm=0;for(let i=0;i<9;i++){norm+=.25*(C[i]-(i%4===0?1:0))**2;sigma[i]/=J;}
   const mean=(sigma[0]+sigma[4]+sigma[8])/3;const vm=Math.sqrt(1.5*sigma.reduce((s,v,i)=>s+(v-(i%4===0?mean:0))**2,0)),strain=Math.sqrt(norm);
   peakStrain=Math.max(peakStrain,strain);peakStress=Math.max(peakStress,vm);
   for(let a=0;a<4;a++){const i=mesh.tets[e*4+a];weights[i]+=V;nodal[i*3]+=V*strain;nodal[i*3+1]+=V*vm;nodal[i*3+2]+=V*J;}
  }
 }
 let maxPenetration=0,contactForce=0,externalWork=0;
 if(p.experiment==='indentation'){
  const radius=.2*p.size,centerY=1.2*p.size-Math.abs(p.amplitude)*p.size,k=p.penalty*mu0/p.size;
  for(let i=0;i<mesh.topArea.length;i++)if(mesh.topArea[i]){
   const dx=x[3*i],dy=x[3*i+1]-centerY,dz=x[3*i+2],d=Math.hypot(dx,dy,dz),penetration=radius-d;if(penetration<=0)continue;
   if(d<1e-12)return {energy:Infinity,g,minJ:0,maxJ:Infinity};const force=k*mesh.topArea[i]*penetration;
   energy+=.5*force*penetration;g[3*i]-=force*dx/d;g[3*i+1]-=force*dy/d;g[3*i+2]-=force*dz/d;contactForce+=-force*dy/d;maxPenetration=Math.max(maxPenetration,penetration);
  }
 }
 if(p.forceControlled){const axis=p.experiment==='shear'?0:1,sign=p.experiment==='compression'?-1:1;for(let i=0;i<mesh.topArea.length;i++)if(mesh.topArea[i]){const f=sign*p.traction*mesh.topArea[i];g[3*i+axis]-=f;externalWork+=f*(x[3*i+axis]-mesh.X[3*i+axis]);}energy-=externalWork;}
 if(diagnostic)for(let i=0;i<weights.length;i++)if(weights[i])for(let r=0;r<3;r++)nodal[3*i+r]/=weights[i];
 return {energy,g,minJ,maxJ,volume,maxPenetration,contactForce,peakStrain,peakStress,nodal,pressure,meanJ:means,maxMacroVolumeError,maxVolumeFluctuation,storedEnergy,dissipation,externalWork,next};
}
export class Phase2Solver extends Solver{
 constructor(mesh,input=mesh.p,{history=null,dt=null,...options}={}){
  // input is already normalized: do not apply sensitivity twice.
  const p=parameters(input);const evaluator=(m,x,p,d=false)=>evaluatePhase2(m,x,p,d,{history,dt});
  super(mesh,p,{maxIterations:1200,historyLimit:32,...options,evaluator,boundaryFactory:physicalBoundaries});this.materialHistory=history;this.dt=dt;
 }
 report(){const base=super.report(),d=this.evaluate(this.mesh,this.x,this.p,false);let displacement=0,area=0;const axis=this.p.experiment==='shear'?0:1;
  for(let i=0;i<this.mesh.topArea.length;i++){const A=this.mesh.topArea[i];area+=A;displacement+=A*(this.x[i*3+axis]-this.mesh.X[i*3+axis]);}
  return {...base,storedEnergyMicroJ:d.storedEnergy,dissipationIncrementMicroJ:d.dissipation,maxMacroVolumeError:d.maxMacroVolumeError,maxVolumeFluctuation:d.maxVolumeFluctuation,pressureKPa:d.pressure,loadedDisplacementMM:displacement/area,appliedForceMN:this.p.forceControlled?(this.p.experiment==='compression'?-1:1)*(this.p.traction||0)*area:null,formulation:this.p.formulation,model:this.p.model,bulkKPa:bulkModulus(this.p)};
 }
 commit(){if(this.status!=='converged')throw new Error('Cannot commit unconverged material history');return evaluatePhase2(this.mesh,this.x,this.p,false,{history:this.materialHistory,dt:this.dt,commit:true}).next;}
}
export function solveStatic(input,{initial=null,maxIterations=1200,tolerance=1e-5}={}){
 const mesh=makePhase2Mesh(input),goal=mesh.p;let s;
 for(const p of rampParameters(null,goal)){s=new Phase2Solver(mesh,p,{initial:s?.x||initial,maxIterations,tolerance});while(s.step()){}if(s.status!=='converged')break;}return s;
}
export function timeSettings(input={}){
 const t={protocol:'relaxation',duration:30,ramp:2,dt:2,traction:.02,...input};
 if(!['relaxation','creep','recovery','cyclic'].includes(t.protocol)||![t.duration,t.ramp,t.dt,t.traction].every(Number.isFinite)||t.duration<1||t.duration>600||t.ramp<=0||t.ramp>t.duration/2||t.dt<=0||t.dt>10||t.dt>t.duration||t.duration/t.dt>600||Math.abs(t.traction)>.5)throw new Error('Invalid physical-time protocol');return t;
}
/** Reproducible loading histories. Recovery releases force, not prescribed displacement. */
export function protocolAt(goal,t,spec){
 let amplitude=goal.amplitude*Math.min(1,t/spec.ramp),forceControlled=false,traction=0;
 if(spec.protocol==='creep'){forceControlled=true;traction=spec.traction*Math.min(1,t/spec.ramp);amplitude=0;}
 else if(spec.protocol==='recovery'&&t>spec.duration/2){forceControlled=true;traction=0;amplitude=0;}
 else if(spec.protocol==='cyclic'){amplitude=goal.amplitude*Math.sin(2*Math.PI*t/spec.duration);}
 return {...goal,amplitude,forceControlled,traction,signedCycle:spec.protocol==='cyclic'};
}
export function nextTime(time,spec){
 const dt=time<spec.ramp?Math.min(spec.dt,spec.ramp/4):spec.dt;
 let next=Math.min(spec.duration,time+dt);for(const event of [spec.ramp,spec.duration/2])if(time<event-1e-10&&next>event)next=event;
 return next;
}
/** CPU driver for reproducible tests/benchmarks. Browser uses equivalent yielding steps. */
export function runHistory(input,settings={},options={}){
 const spec=timeSettings(settings);if(!['shear','stretch','compression'].includes(input.experiment||'shear'))throw new Error('Time protocols currently support shear, stretch and compression');
 const mesh=makePhase2Mesh(input),goal=mesh.p,frames=[];let history=initialHistory(mesh,goal),x=mesh.X.slice(),time=0,totalDissipation=0;
 const start=performance.now();const budget=options.budgetMs??25000;
 while(time<spec.duration-1e-10){
  const target=nextTime(time,spec),dt=target-time,p=protocolAt(goal,target,spec),s=new Phase2Solver(mesh,p,{history,dt,initial:x,maxIterations:options.maxIterations||800,tolerance:options.tolerance||1e-5});
  while(s.step()){if(performance.now()-start>budget){s.status='compute budget reached';break;}}
  if(s.status!=='converged')return {mesh,frames,history,x,time,targetTime:spec.duration,complete:false,status:s.status,elapsedMs:performance.now()-start};
  const report=s.report();history=s.commit();x=s.x.slice();time=target;totalDissipation+=report.dissipationIncrementMicroJ;
  frames.push({time,x:x.slice(),report:{...report,totalDissipationMicroJ:totalDissipation},params:p});
  if(performance.now()-start>budget&&time<spec.duration)return {mesh,frames,history,x,time,targetTime:spec.duration,complete:false,status:'compute budget reached',elapsedMs:performance.now()-start};
 }
 return {mesh,frames,history,x,time,targetTime:spec.duration,complete:true,status:'converged',elapsedMs:performance.now()-start};
}
