import {range,integer,vec3,add,sub,scale,dot,norm,unit,frame,rng,streamSeed,meanSE,VERSION} from './common.mjs';
export const OPTICAL_DEFAULTS=Object.freeze({cells:4,pitchUm:40,somaRadiusUm:10,wellRadiusUm:13,wallUm:2.5,halfLengthUm:70,apertureRadiusUm:3.5,boxHalfUm:180,emitterRadiusUm:2,reflectivity:.85,muAbsPerMm:.2,muScatterPerMm:10,anisotropy:.9,photons:16000,batches:8,maxEvents:400,seed:2048});
export function opticalScene(input={}) {
 for(const k of Object.keys(input))if(!(k in OPTICAL_DEFAULTS))throw new Error(`Unsupported optical setting ${k}.`);
 const s={...OPTICAL_DEFAULTS,...input};integer(s.cells,'cell count',1,16);range(s.pitchUm,'well pitch',10,200);range(s.somaRadiusUm,'soma radius',1,12.5);range(s.wellRadiusUm,'well radius',s.somaRadiusUm+.5,50);range(s.wallUm,'wall thickness',.5,10);range(s.halfLengthUm,'half length',20,200);range(s.apertureRadiusUm,'aperture radius',.1,s.wellRadiusUm);range(s.emitterRadiusUm,'emitter radius',.1,5);range(s.boxHalfUm,'box half extent',80,1000);
 if(s.pitchUm<=2*(s.wellRadiusUm+s.wallUm))throw new Error('Optical wells overlap.');if(s.emitterRadiusUm**2+(s.wellRadiusUm-.5)**2>=s.wellRadiusUm**2)throw new Error('Emitter disk crosses the cylindrical wall.');
 if(s.halfLengthUm-s.wallUm<=s.somaRadiusUm)throw new Error('Soma intersects an endcap.');
 const side=Math.ceil(Math.sqrt(s.cells)),wells=Array.from({length:s.cells},(_,i)=>({id:'W'+String(i+1).padStart(4,'0'),x:(i%side-(side-1)/2)*s.pitchUm,y:(Math.floor(i/side)-(side-1)/2)*s.pitchUm,r:s.wellRadiusUm,outer:s.wellRadiusUm+s.wallUm,half:s.halfLengthUm,wall:s.wallUm,ap:s.apertureRadiusUm}));
 for(const w of wells)if(Math.max(Math.abs(w.x)+w.outer,Math.abs(w.y)+w.outer,w.half)>=s.boxHalfUm)throw new Error('Outer optical boundary intersects a well.');
 const detectors=wells.map((w,i)=>({id:'E'+String(i+1).padStart(4,'0'),center:[w.x,w.y,0],radius:s.somaRadiusUm}));
 const source={center:[wells[0].x+wells[0].r-.5,wells[0].y,0],normal:[-1,0,0],radius:s.emitterRadiusUm,angular:'lambertian'};
 return {settings:s,wells,detectors,source,boxHalfUm:s.boxHalfUm};
}
function wallContains(p,w){const r2=(p[0]-w.x)**2+(p[1]-w.y)**2,z=Math.abs(p[2]);return z<w.half&&r2<w.outer**2&&(r2>w.r**2||(z>w.half-w.wall&&r2>w.ap**2));}
/** Exact ray intersections with finite cylindrical wall/endcap solids. */
export function nearestWall(p,d,wells) {
 let nearest=null;const eps=1e-7;
 for(const w of wells) {
  const x=p[0]-w.x,y=p[1]-w.y,A=d[0]**2+d[1]**2,B=2*(x*d[0]+y*d[1]),candidates=[];
  if(A>1e-20)for(const radius of [w.r,w.outer,w.ap]){const D=B*B-4*A*(x*x+y*y-radius*radius);if(D<0)continue;for(const t of [(-B-Math.sqrt(D))/(2*A),(-B+Math.sqrt(D))/(2*A)])if(t>eps)candidates.push({t,normal:[(x+t*d[0])/radius,(y+t*d[1])/radius,0]});}
  if(Math.abs(d[2])>1e-15)for(const z of [-w.half,-w.half+w.wall,w.half-w.wall,w.half]){const t=(z-p[2])/d[2];if(t>eps)candidates.push({t,normal:[0,0,1]});}
  for(const hit of candidates){if(nearest&&hit.t>=nearest.t)continue;const a=add(p,scale(d,hit.t-eps/2)),b=add(p,scale(d,hit.t+eps/2));if(wallContains(a,w)!==wallContains(b,w))nearest={...hit,wellId:w.id};}
 }
 return nearest;
}
function boxExit(p,d,H){let t=Infinity;for(let j=0;j<3;j++)if(Math.abs(d[j])>1e-15)t=Math.min(t,((d[j]>0?H:-H)-p[j])/d[j]);return t;}
export function sphereTrackLength(p,d,length,detector) {
 const r=sub(p,detector.center),b=dot(r,d),c=dot(r,r)-detector.radius**2,disc=b*b-c;if(disc<=0)return 0;
 const root=Math.sqrt(disc),lo=Math.max(0,-b-root),hi=Math.min(length,-b+root);return Math.max(0,hi-lo);
}
export function scatterHG(d,g,random) {
 const u=random(),cos=g===0?2*u-1:(1+g*g-((1-g*g)/(1-g+2*g*u))**2)/(2*g),sin=Math.sqrt(Math.max(0,1-cos*cos)),az=2*Math.PI*random();
 const f=frame(d);return unit(add(scale(f.n,cos),add(scale(f.u,sin*Math.cos(az)),scale(f.v,sin*Math.sin(az)))));
}
export function photonBatch(scene,options={}) {
 const s={...OPTICAL_DEFAULTS,...scene.settings,...options};integer(s.photons,'photons per batch',1,1000000);integer(s.maxEvents,'maximum scattering/boundary events',1,2000);integer(s.seed,'seed',0,4294967295);
 range(s.muAbsPerMm,'absorption',0,100);range(s.muScatterPerMm,'scattering',0,1000);range(s.anisotropy,'anisotropy',-.99,.99);range(s.reflectivity,'liner reflectivity',0,.9999);
 if(!scene||!Array.isArray(scene.wells)||!Array.isArray(scene.detectors)||scene.detectors.length>16)throw new Error('Invalid optical scene.');
 const src=scene.source;vec3(src.center);vec3(src.normal);range(src.radius,'emitter radius',0,50);range(scene.boxHalfUm,'box extent',1,10000);if(src.center.some(x=>Math.abs(x)>=scene.boxHalfUm)||scene.wells.some(w=>wallContains(src.center,w)))throw new Error('Source is outside the conducting optical domain.');
 for(const detector of scene.detectors){vec3(detector.center);range(detector.radius,'detector radius',.01,1000);}
 if(!['lambertian','collimated'].includes(src.angular))throw new Error('Unsupported emitter angular distribution.');
 const random=rng(s.seed),f=frame(src.normal),mu=(s.muAbsPerMm+s.muScatterPerMm)/1000,N=s.photons;
 const sum=new Float64Array(scene.detectors.length),sum2=new Float64Array(sum.length),hits=new Uint32Array(sum.length);
 let absorbed=0,wallAbsorbed=0,escaped=0,truncated=0,totalEvents=0;
 for(let photon=0;photon<N;photon++) {
  const radial=src.radius*Math.sqrt(random()),angle=2*Math.PI*random();let p=add(src.center,add(scale(f.u,radial*Math.cos(angle)),scale(f.v,radial*Math.sin(angle))));
  if(scene.wells.some(w=>wallContains(p,w)))throw new Error('Emitter point intersects optical wall.');
  const cos=src.angular==='collimated'?1:Math.sqrt(random()),sin=Math.sqrt(1-cos*cos),az=2*Math.PI*random();let d=add(scale(f.n,cos),add(scale(f.u,sin*Math.cos(az)),scale(f.v,sin*Math.sin(az)))),weight=1,done=false;
  const track=new Float64Array(sum.length);
  for(let event=0;event<s.maxEvents;event++) {
   totalEvents++;const free=mu>0?-Math.log(random())/mu:Infinity,escape=boxExit(p,d,scene.boxHalfUm),hit=nearestWall(p,d,scene.wells),wall=hit?.t??Infinity,length=Math.min(free,escape,wall);
   if(!(length>=0)||!Number.isFinite(length))throw new Error('Optical ray failed to reach a finite boundary.');
   for(let j=0;j<sum.length;j++)track[j]+=weight*sphereTrackLength(p,d,length,scene.detectors[j]);p=add(p,scale(d,length));
   if(escape<=free&&escape<=wall){escaped+=weight;done=true;break;}
   if(wall<=free){wallAbsorbed+=weight*(1-s.reflectivity);weight*=s.reflectivity;d=sub(d,scale(hit.normal,2*dot(d,hit.normal)));p=add(p,scale(d,2e-7));}
   else {const loss=weight*s.muAbsPerMm/(s.muAbsPerMm+s.muScatterPerMm);absorbed+=loss;weight-=loss;if(weight>0)d=scatterHG(d,s.anisotropy,random);}
   if(weight<=1e-12){truncated+=weight;done=true;break;}
  }
  if(!done)truncated+=weight;
  for(let j=0;j<sum.length;j++){sum[j]+=track[j];sum2[j]+=track[j]*track[j];if(track[j]>0)hits[j]++;}
 }
 const fluence=scene.detectors.map((q,j)=>{const volume=4*Math.PI*q.radius**3/3,factor=1e6/volume,mean=sum[j]/N,variance=N>1?Math.max(0,(sum2[j]-sum[j]**2/N)/(N-1)):0;return {id:q.id,fluencePerEmittedMw:mean*factor,standardErrorPerEmittedMw:N>1?Math.sqrt(variance/N)*factor:null,photonsIntersecting:hits[j]};});
 const energy={absorbed:absorbed/N,wallAbsorbed:wallAbsorbed/N,escaped:escaped/N,truncated:truncated/N};
 return {fluence,energy,energyResidual:Math.abs(Object.values(energy).reduce((a,b)=>a+b,0)-1),events:totalEvents,seed:s.seed,photons:N};
}
export function opticalAssay(input={},onProgress=()=>{}) {
 const scene=opticalScene(input),s=scene.settings;integer(s.batches,'independent batches',2,16);integer(s.photons,'total photons',100,200000);if(s.photons%s.batches!==0)throw new Error('Photon count must divide into equal batches.');
 if(s.photons*s.maxEvents*s.cells>150000000)throw new Error('Optical work budget exceeded; reduce explicit inputs.');
 const batches=[];for(let k=0;k<s.batches;k++){batches.push(photonBatch(scene,{photons:s.photons/s.batches,seed:streamSeed(s.seed,'photons:'+k)}));onProgress({fraction:(k+1)/s.batches,phase:'Photon batch '+(k+1)+' / '+s.batches});}
 const perCell=scene.detectors.map((q,j)=>{const stat=meanSE(batches.map(b=>b.fluence[j].fluencePerEmittedMw));return {id:q.id,meanFluencePerMw:stat.mean,batchStandardError:stat.se,photonsIntersecting:batches.reduce((n,b)=>n+b.fluence[j].photonsIntersecting,0)};});
 const worstOther=Math.max(0,...perCell.slice(1).map(x=>x.meanFluencePerMw));
 const offTargetAdequate=perCell.length>1&&perCell.slice(1).every(c=>c.photonsIntersecting>=100&&c.meanFluencePerMw>0&&c.batchStandardError/c.meanFluencePerMw<=.2);
 for(const c of perCell)c.samplingStatus=c.photonsIntersecting>=100&&c.meanFluencePerMw>0&&c.batchStandardError/c.meanFluencePerMw<=.2?'finite-sample batch estimate':'rare-event estimate unresolved; zero empirical SE is not a zero uncertainty bound';
 const energy=Object.fromEntries(Object.keys(batches[0].energy).map(k=>[k,batches.reduce((sum,b)=>sum+b.energy[k],0)/batches.length]));
 return {schema:'axon-stage2.optical-transport.v1',modelVersion:VERSION,settings:s,scene,perCell,batchSeeds:batches.map(b=>b.seed),energy,energyResidual:Math.abs(Object.values(energy).reduce((a,b)=>a+b,0)-1),
  confinement:{estimate:offTargetAdequate?perCell[0].meanFluencePerMw/worstOther:null,rawRatioDiagnosticOnly:worstOther>0?perCell[0].meanFluencePerMw/worstOther:null,status:offTargetAdequate?'Finite-sample ratio only; membrane recruitment and convergence not established.':perCell.length===1?'No off-target cell in this scene.':'Off-target fluence unresolved at this photon budget; not infinite isolation.',adequacyRule:'All off-target detectors: at least 100 intersecting photon histories and batch standard error <=20% of the mean. Estimated display rule, not biological validation.'},
  recruitment:null,limits:['Volume-mean soma detector fluence, not a converged membrane-surface irradiance estimator.','Uniform optical properties are hypothetical and identical in tissue and cavity; no refractive-index contrast or Fresnel boundaries.','Finite wall/endcap geometry, opaque specular liner, open apertures. Liner reflectivity is an assumption, not a measurement.','Somata do not displace or refract optical paths; optically homogeneous detector volumes.','Photons leaving the finite box are lost. Domain-size and photon-budget convergence are not yet release-qualified.','Zero detector hits do not establish zero crosstalk. Truncated photon weight is counted as unresolved, not absorbed heat.','Electrical safety, full bioheat and neural recruitment are not computed by this assay.']};
}
export function ledEnergy({emittedMw,pulseMs,efficiency=.2,repetitionHz=20,channels=1}) {
 range(emittedMw,'emitted optical power',0,1000);range(pulseMs,'light duration',0,1000);range(efficiency,'wall-plug efficiency',.001,1);range(repetitionHz,'repetition frequency',0,10000);integer(channels,'active emitters',1,1000000);
 const duty=pulseMs*repetitionHz/1000;if(duty>1)throw new Error('Optical pulses overlap.');
 return {emittedEnergyUj:emittedMw*pulseMs,electricalEnergyUj:emittedMw*pulseMs/efficiency,junctionWasteHeatUj:emittedMw*pulseMs*(1/efficiency-1),aggregateElectricalMw:channels*emittedMw*duty/efficiency,aggregateJunctionHeatMw:channels*emittedMw*duty*(1/efficiency-1),temperatureRiseC:null,safetyVerdict:null};
}
