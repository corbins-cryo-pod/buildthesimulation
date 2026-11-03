import {clamp,distance,unit,sub,scale,add} from './geometry.js';

export function createWorld(mode,config){
  const planar=['culture','pattern','interface'].includes(mode);
  const w={mode,planar,substrateY:-5.8,sphereRadius:null,bounds:{min:[-450,-15,-350],max:[450,15,350]},obstacles:[],cue:{position:[200,0,0],strength:mode==='culture'?0:1},labels:[]};
  if(mode==='pattern')for(let i=-2;i<=2;i++)w.obstacles.push({id:`lane-${i+2}`,shape:'box',position:[0,0,70*i+35],size:[280,30,8]});
  if(mode==='gel'){w.bounds={min:[-180,-100,-150],max:[180,100,150]};w.cue.position=[140,0,0];}
  if(mode==='repair'){
    w.bounds={min:[-230,-65,-65],max:[230,65,65]};w.cue.position=[190,0,0];w.gapUm=300;
    for(const [i,p,size] of [[0,[0,0,65],[460,130,8]],[1,[0,0,-65],[460,130,8]],[2,[0,65,0],[460,8,130]],[3,[0,-65,0],[460,8,130]]])w.obstacles.push({id:`wall-${i}`,shape:'box',position:p,size});
  }
  if(mode==='interface'){
    w.bounds={min:[-280,-15,-180],max:[280,15,180]};
    for(let i=0;i<3;i++)w.obstacles.push({id:`electrode-${i}`,shape:'box',position:[(i-1)*60,-5,0],size:[24,8,24]});
    for(const z of [-55,55])w.obstacles.push({id:`channel-${z<0?'a':'b'}`,shape:'box',position:[20,0,z],size:[160,25,8]});
  }
  return w;
}

export function createField(w,h){
  const origin=[...w.bounds.min],shape=w.bounds.max.map((v,i)=>Math.max(1,Math.ceil((v-origin[i])/h)));
  // Only gel and repair use a volumetric scalar proxy; dish has no phantom field.
  const n=shape.reduce((a,b)=>a*b,1);if(n>100000)throw Error('Field grid exceeds memory budget');
  return {origin,h,shape,values:Array(n).fill(0),sources:Array(n).fill(0),mask:Array(n).fill(1),units:'relative cue activity',timeHours:0};
}
export function fieldIndex(f,p){const q=p.map((x,i)=>clamp(Math.floor((x-f.origin[i])/f.h),0,f.shape[i]-1));return(q[2]*f.shape[1]+q[1])*f.shape[0]+q[0];}
export function sampleField(f,p){return f?f.values[fieldIndex(f,p)]:0;}
export function fieldGradient(f,p){if(!f)return[0,0,0];return p.map((_,i)=>{const a=[...p],b=[...p];a[i]-=f.h;b[i]+=f.h;return(sampleField(f,b)-sampleField(f,a))/(2*f.h);});}
export function advanceField(f,dt,D,decay){
  if(dt<=0)return;
  const steps=Math.max(1,Math.ceil(dt/(D?f.h*f.h/(6*D)*.8:dt))),h=dt/steps,[nx,ny,nz]=f.shape;
  const half=Math.exp(-decay*h/2),sourceIntegral=decay?-Math.expm1(-decay*h/2)/decay:h/2;
  for(let step=0;step<steps;step++){
    for(let i=0;i<f.values.length;i++)if(f.mask[i])f.values[i]=f.values[i]*half+f.sources[i]*sourceIntegral;
    const next=[...f.values],r=D*h/(f.h*f.h);
    for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
      const i=(z*ny+y)*nx+x;if(!f.mask[i])continue;
      for(const [ok,j] of [[x>0,i-1],[x+1<nx,i+1],[y>0,i-nx],[y+1<ny,i+nx],[z>0,i-nx*ny],[z+1<nz,i+nx*ny]])if(ok&&f.mask[j])next[i]+=r*(f.values[j]-f.values[i]);
    }
    f.values=next.map((v,i)=>f.mask[i]?v*half+f.sources[i]*sourceIntegral:0);
  }
  f.timeHours=Number((f.timeHours+dt).toFixed(12));
}
export function initTissue(sim){
  const active=['gel','repair'].includes(sim.config.mode);
  sim.tissue={field:active?createField(sim.world,sim.config.fieldGrid):null,agents:[],bridge:{current:false,ever:false,firstHours:null,frontProxUm:0,frontDistUm:0},history:[]};
  if(sim.config.mode==='repair')for(let side of [-1,1])for(let i=0;i<6;i++)sim.tissue.agents.push({id:sim.tissue.agents.length,type:'repair-support',side,position:[side*(155+i*7),((i%3)-1)*18,(Math.floor(i/3)-.5)*24],distance:0});
  if(sim.tissue.field){const f=sim.tissue.field;
    for(let i=0;i<f.sources.length;i++){const x=i%f.shape[0];if(x===f.shape[0]-1)f.sources[i]=sim.config.fieldSource*.08;}
  }
}
export function advanceTissue(sim,dt){
  const t=sim.tissue,f=t.field;if(!f)return;
  f.sources.fill(0);
  for(let i=0;i<f.sources.length;i++)if(i%f.shape[0]===f.shape[0]-1)f.sources[i]=sim.config.fieldSource*.08;
  for(const a of t.agents){
    // Effective support-cell migration assay, not a fitted Schwann-cell model.
    const move=Math.min(Math.abs(a.position[0]),2*sim.config.glialSupport*dt);
    a.position[0]-=a.side*move;a.distance+=move;
    f.sources[fieldIndex(f,a.position)]+=.12*sim.config.glialSupport;
  }
  const substeps=Math.ceil(dt/sim.config.fieldStepHours);
  for(let i=0;i<substeps;i++)advanceField(f,dt/substeps,sim.config.fieldDiffusion,sim.config.fieldDecay);
  if(t.agents.length){const prox=Math.max(...t.agents.filter(a=>a.side<0).map(a=>a.position[0])),dist=Math.min(...t.agents.filter(a=>a.side>0).map(a=>a.position[0]));
    const b=t.bridge;b.frontProxUm=clamp(prox+150,0,300);b.frontDistUm=clamp(150-dist,0,300);b.current=dist-prox<=20;
    if(b.current&&!b.ever){b.firstHours=sim.timeHours+dt;b.ever=true;}
  }
}
export function tissueSteering(sim,point){
  const f=sim.tissue?.field,g=fieldGradient(f,point);let v=scale(unit(g),Math.min(1,Math.hypot(...g)*100)*sim.config.guidance);
  if(sim.config.mode==='pattern')v=add(v,[sim.config.guidance*.5,0,0]);
  if(sim.config.mode==='repair'){
    v=add(v,[sim.config.guidance*.4,-point[1]*.002,-point[2]*.002]);
    const nearest=sim.tissue.agents.reduce((best,a)=>!best||distance(a.position,point)<distance(best.position,point)?a:best,null);
    if(nearest&&distance(nearest.position,point)<30)v=add(v,scale(unit(sub(nearest.position,point)),.15*sim.config.glialSupport));
  }
  return v;
}
export function validateTissue(sim){
  const t=sim.tissue;if(!t||!Array.isArray(t.agents)||t.agents.length>1000||!t.bridge)throw Error('Invalid tissue state');
  const b=t.bridge;if(typeof b.current!=='boolean'||typeof b.ever!=='boolean'||!(b.firstHours===null||Number.isFinite(b.firstHours)&&b.firstHours>=0)||!Number.isFinite(b.frontProxUm)||!Number.isFinite(b.frontDistUm))throw Error('Invalid bridge state');
  const f=t.field;
  if(Boolean(f)!==['gel','repair'].includes(sim.config.mode))throw Error('Missing or unexpected tissue field');
  if(f&&(!Number.isFinite(f.timeHours)||Math.abs(f.timeHours-sim.timeHours)>1e-6||f.mask.some(x=>x!==0&&x!==1)))throw Error('Invalid field clock or mask');
  if(f){if(!Array.isArray(f.shape)||f.shape.length!==3||f.shape.some(n=>!Number.isInteger(n)||n<1)||f.shape.reduce((a,b)=>a*b,1)>100000||!Number.isFinite(f.h)||f.h<=0||!Array.isArray(f.origin)||f.origin.length!==3||f.origin.some(x=>!Number.isFinite(x)))throw Error('Invalid field geometry');const n=f.shape.reduce((a,b)=>a*b,1);for(const k of ['values','sources','mask'])if(!Array.isArray(f[k])||f[k].length!==n||f[k].some(x=>!Number.isFinite(x)||x<0))throw Error('Invalid field data');}
  for(const a of t.agents)if(!Array.isArray(a.position)||a.position.length!==3||a.position.some(x=>!Number.isFinite(x))||![-1,1].includes(a.side))throw Error('Invalid support agent');
}
