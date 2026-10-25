/** Incremental homogeneous Pennes heat equation, finite differences, fixed-zero
 * ΔT outer boundary. Qopt=mu_a*fluence; independent microLED electrical loss.
 * Frozen neuronal kinetics: temperatures are an uncoupled diagnostic only.
 */
import {sourceField,sourcePowers} from './optics.js';
import {pulseAt} from '../simulation.js';
function makeHeatGrid(cfg){
 const n=cfg.gridN,h=cfg.spacingUm*1e-6,size=n**3;
 const center=cfg.centerUm,min=center.map(x=>x-(n-1)*cfg.spacingUm/2);
 return {n,h,size,min,spacingUm:cfg.spacingUm,temperature:new Float64Array(size),scratch:new Float64Array(size),qOpt:new Float64Array(size),qDevice:new Float64Array(size),rhoCp:cfg.densityKgM3*cfg.heatCapacityJkgK,conductivity:cfg.conductivityWmK,perfusionPerS:cfg.perfusionPerS};
}
function weightsAt(grid,point){
 const f=point.map((x,k)=>(x-grid.min[k])/grid.spacingUm),n=grid.n;
 if(f.some(x=>x<0||x>n-1))return null;
 const a=f.map(x=>Math.min(n-2,Math.max(0,Math.floor(x)))),v=f.map((x,k)=>x-a[k]);
 const result=[];for(let z=0;z<2;z++)for(let y=0;y<2;y++)for(let x=0;x<2;x++)result.push({index:(a[2]+z)*n*n+(a[1]+y)*n+a[0]+x,w:(x?v[0]:1-v[0])*(y?v[1]:1-v[1])*(z?v[2]:1-v[2])});
 return result;
}
function temperatureAt(g,point){const w=weightsAt(g,point);return w?w.reduce((s,a)=>s+a.w*g.temperature[a.index],0):NaN;}
function heatSources(g,source,device,deviceHeatFraction=1){
 const n=g.n,volume=g.h**3;let opt=0,dev=0;
 for(let z=1;z<n-1;z++)for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){
  const i=z*n*n+y*n+x,p=[x,y,z].map((a,k)=>g.min[k]+a*g.spacingUm);
  const q=sourceField(p,source,device)*source.absorptionMmInv*1e6;
  g.qOpt[i]=q;opt+=q*volume;
 }
 if(source.kind==='microled')for(const e of device.emitters){
  if(!e.enabled)continue;
  const P=e.powerMw*(1/e.efficiency-1)*deviceHeatFraction/1000;
  if(P===0)continue;
  const weights=weightsAt(g,e.positionUm);
  if(!weights||weights.some(({index,w})=>w>1e-12&&(index%n===0||index%n===n-1||Math.floor(index/n)%n===0||Math.floor(index/n)%n===n-1||Math.floor(index/(n*n))===0||Math.floor(index/(n*n))===n-1)))throw Error('An active microLED heat source is on/outside the thermal boundary. Recenter or enlarge the thermal grid.');
  for(const a of weights)g.qDevice[a.index]+=P*a.w/volume;
  dev+=P;
 }
 return {absorbedOpticalMw:opt*1000,depositedDeviceMw:dev*1000};
}
/** Exposed for independent analytic-mode validation. */
function heatStep(g,dtMs,drive){
 const dt=dtMs/1000,n=g.n,n2=n*n,T=g.temperature,U=g.scratch;
 const f=g.conductivity*dt/(g.rhoCp*g.h*g.h),b=g.perfusionPerS*dt;
 if(6*f+b>1+1e-12)throw Error('Thermal explicit stability bound exceeded.');
 let loss=0,perf=0,stored=0,peak=0;
 const joulesPerK=g.rhoCp*g.h**3;
 for(let z=1;z<n-1;z++)for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){
  const i=z*n2+y*n+x,old=T[i];
  const next=(1-6*f-b)*old+f*(T[i-1]+T[i+1]+T[i-n]+T[i+n]+T[i-n2]+T[i+n2])+dt*(g.qOpt[i]+g.qDevice[i])*drive/g.rhoCp;
  U[i]=next;stored+=next*joulesPerK;peak=Math.max(peak,next);perf+=b*old*joulesPerK;
  const faces=(x===1)+(x===n-2)+(y===1)+(y===n-2)+(z===1)+(z===n-2);
  loss+=faces*f*old*joulesPerK;
 }
 g.temperature=U;g.scratch=T;
 return {storedJ:stored,boundaryLossJ:loss,perfusionLossJ:perf,peakC:peak};
}
function runThermal(config,pulses,timeMs,points,onProgress){
 const cfg=config.thermal,g=makeHeatGrid(cfg),powers=heatSources(g,config.source,config.device,cfg.deviceHeatFraction);
 const pixelWeights=points.map(p=>weightsAt(g,p)),frames=timeMs.length;
 const values=new Float32Array(points.length*frames),peakC=new Float64Array(frames),centerC=new Float64Array(frames);
 const edges=[...new Set(pulses.flatMap(p=>[p.startMs,p.endMs]))].sort((a,b)=>a-b);
 const alpha=g.conductivity/g.rhoCp,stableDt=900/(6*alpha/(g.h*g.h)+g.perfusionPerS);
 let t=0,edge=0,steps=0,inputJ=0,opticalJ=0,deviceJ=0,lossJ=0,perfJ=0,storedJ=0,maxResidual=0,maximumC=0;
 function save(k){
  let maximum=0;for(const x of g.temperature)maximum=Math.max(maximum,x);peakC[k]=maximum;maximumC=Math.max(maximumC,maximum);
  centerC[k]=g.temperature[Math.floor(g.n/2)*(g.n*g.n+g.n+1)];
  for(let i=0;i<points.length;i++)values[k*points.length+i]=pixelWeights[i]?pixelWeights[i].reduce((s,a)=>s+a.w*g.temperature[a.index],0):NaN;
 }
 save(0);
 for(let k=1;k<frames;k++){
  while(t<timeMs[k]-1e-9){
   while(edge<edges.length&&edges[edge]<=t+1e-9)edge++;
   const dt=Math.min(cfg.dtMs,stableDt,timeMs[k]-t,(edges[edge]??Infinity)-t),drive=pulseAt(t+dt/2,pulses),r=heatStep(g,dt,drive);
   opticalJ+=powers.absorbedOpticalMw*dt*1e-6*drive;deviceJ+=powers.depositedDeviceMw*dt*1e-6*drive;
   inputJ=opticalJ+deviceJ;lossJ+=r.boundaryLossJ;perfJ+=r.perfusionLossJ;storedJ=r.storedJ;maximumC=Math.max(maximumC,r.peakC);
   maxResidual=Math.max(maxResidual,Math.abs(inputJ-storedJ-lossJ-perfJ));t+=dt;steps++;
  }save(k);
  if(k%50===0)onProgress?.({progress:k/(frames-1),stage:'Solving tissue heat diffusion'});
 }
 const sourceP=sourcePowers(config.source,config.device),onMs=pulses.reduce((s,p)=>s+p.endMs-p.startMs,0);
 return {timeMs,temperatureRiseC:values,peakC,centerC,pointsCount:points.length,grid:{n:g.n,spacingUm:g.spacingUm,minUm:g.min,finalRiseC:Float32Array.from(g.temperature)},diagnostics:{...powers,steps,maximumC,absorbedFractionOfEmitted:sourceP.opticalMw>0?powers.absorbedOpticalMw/sourceP.opticalMw:null,stableStepLimitMs:stableDt,sourcePower:sourceP,opticalEnergyUj:opticalJ*1e6,deviceHeatEnergyUj:deviceJ*1e6,storedEnergyUj:storedJ*1e6,boundaryLossUj:lossJ*1e6,perfusionLossUj:perfJ*1e6,energyResidualJ:maxResidual,emittedEnergyUj:sourceP.opticalMw===null?null:sourceP.opticalMw*onMs,outsidePoints:pixelWeights.filter(x=>!x).length,
  limitations:['Homogeneous tissue; source heat deposited into surrounding voxels. No GaN, metal, encapsulant conduction or LED junction temperature.','Fixed-zero temperature-rise boundary; grid-averaged peaks depend strongly on voxel size and domain. The included LED refinement changed peak ΔT from 0.557 °C at 80 µm to 1.012 °C at 48 µm. Hotspots are unresolved; not a tissue-safety assessment.','One-way heat diagnostic: no thermal feedback into voltage, channel rates, chloride equilibrium or firing.','Optical heating uses the same approximate LED fluence as neurons. Light lost to the empirical attenuation term is not rerouted as diffuse light.']}};
}
export {makeHeatGrid,weightsAt,temperatureAt,heatSources,heatStep,runThermal};
