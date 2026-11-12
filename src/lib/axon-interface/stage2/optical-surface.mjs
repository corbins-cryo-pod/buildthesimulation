import {nearestWall,scatterHG} from '../../../../public/simulations/biohybrid-axon-interface/stage2/modules/optics.mjs';
import {rng,streamSeed,frame} from '../../../../public/simulations/biohybrid-axon-interface/stage2/modules/common.mjs';
export const OPTICAL_SURFACE_VERSION='soma-shell-transport-1.0';
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function sphereInterval(p,d,r){const b=dot(p,d),disc=b*b-dot(p,p)+r*r;if(disc<=0)return null;const q=Math.sqrt(disc);return [-b-q,-b+q];}
function ballSliceVolume(r,z0,z1){const a=Math.max(-r,z0),b=Math.min(r,z1);return b>a?Math.PI*(r*r*(b-a)-(b*b*b-a*a*a)/3):0;}
export function shellBandVolume(r,h,z0,z1){return ballSliceVolume(r+h/2,z0,z1)-ballSliceVolume(r-h/2,z0,z1);}
export function shellBandTrack(p,d,length,r,h,z0,z1){
 const out=sphereInterval(p,d,r+h/2);if(!out)return 0;
 let a=Math.max(0,out[0]),b=Math.min(length,out[1]);
 if(Math.abs(d[2])<1e-16){if(p[2]<z0||p[2]>z1)return 0;}else{const lo=(z0-p[2])/d[2],hi=(z1-p[2])/d[2];a=Math.max(a,Math.min(lo,hi));b=Math.min(b,Math.max(lo,hi));}
 if(b<=a)return 0;const inside=sphereInterval(p,d,r-h/2);return b-a-(inside?Math.max(0,Math.min(b,inside[1])-Math.max(a,inside[0])):0);
}
export function surfaceScene(geometry,morphology,channelIndex=0,options={}){
 const h=options.shellThicknessUm??.5;if(!Number.isFinite(h)||h<=0||h>2)throw new Error('Shell thickness must be (0,2] um.');
 const target=geometry.cells[channelIndex];if(!target)throw new Error('Optical source needs an existing addressed cell.');
 const wells=geometry.wells.map(w=>({id:w.id,x:w.center[0],y:w.center[1],r:w.innerRadiusUm,outer:w.innerRadiusUm+w.wallThicknessUm,half:w.halfLengthUm,wall:w.wallThicknessUm,ap:w.apertureRadiusUm}));
 const w=wells[channelIndex],radius=options.emitterRadiusUm??2;
 if(radius<=0||radius*radius+(w.r-.5)**2>=w.r*w.r)throw new Error('Emitter disk intersects the well liner.');
 return {geometry,morphology,wells,source:{center:[w.x+w.r-.5,w.y,0],radius,normal:[-1,0,0]},shellThicknessUm:h,
  detectors:geometry.cells.map(c=>({id:c.id,center:[c.xUm,c.yUm,0],radius:morphology.soma.radiusUm,bands:morphology.somaIndices.map(i=>{const q=morphology.compartments[i];return {compartmentIndex:i,z0:q.zUm-q.lengthUm/2,z1:q.zUm+q.lengthUm/2};})})),
  boxHalfUm:options.boxHalfUm??Math.max(400,geometry.fascicleRadiusUm*2)};
}
/** Uniform history weights are bounded analytically. The empirical Bernstein
 * interval is simultaneous across requested bands via a Bonferroni allocation.
 * Unlike empirical SE alone, it gives a positive upper bound after zero hits.
 */
export function boundedMean(sum,sum2,N,B,delta){
 if(!(N>1&&B>0&&delta>0&&delta<1))throw new Error('Invalid bounded confidence calculation.');
 const mean=sum/N,variance=Math.max(0,(sum2-sum*sum/N)/(N-1)),log=Math.log(4/delta);
 const radius=Math.sqrt(2*variance*log/N)+7*B*log/(3*(N-1));
 return {mean,standardError:Math.sqrt(variance/N),lower:Math.max(0,mean-radius),upper:Math.min(B,mean+radius),radius,delta,bound:B};
}
export function surfaceTransport(scene,{photons=128000,seed=4079,muAbsPerMm=.2,muScatterPerMm=10,anisotropy=.9,reflectivity=.85,maxEvents=400,familyAlpha=.001,totalChannels=1}={},onProgress=()=>{}){
 if(!Number.isInteger(photons)||photons<100||photons>2048000||!Number.isInteger(maxEvents)||maxEvents<20||maxEvents>1000)throw new Error('Optical history/event budget invalid.');
 if(scene.detectors.length>16||photons*maxEvents*scene.detectors.length>14e9)throw new Error('Optical work budget exceeded; no photons or cells were removed.');
 for(const [x,lo,hi] of [[muAbsPerMm,.0001,100],[muScatterPerMm,0,1000],[anisotropy,-.99,.99],[reflectivity,0,.9999],[familyAlpha,1e-8,.1]])if(!Number.isFinite(x)||x<lo||x>hi)throw new Error('Invalid optical transport parameter.');
 const random=rng(streamSeed(seed,'surface-photons')),mu=(muAbsPerMm+muScatterPerMm)/1000,albedo=muScatterPerMm/(muAbsPerMm+muScatterPerMm),maxRetention=Math.max(albedo,reflectivity),src=scene.source,f=frame(src.normal),H=scene.boxHalfUm,h=scene.shellThicknessUm;
 const flat=scene.detectors.flatMap((c,ci)=>c.bands.map(b=>({...b,cellIndex:ci,cellId:c.id,center:c.center,r:c.radius,volume:shellBandVolume(c.radius,h,b.z0,b.z1)}))),D=flat.length;
 const sums=new Float64Array(D),squares=new Float64Array(D),hits=new Uint32Array(D);let absorbed=0,wallAbsorbed=0,escaped=0,truncated=0,events=0,remainingSum=0;
 const maximum=flat.map(d=>2*Math.sqrt((d.r+h/2)**2-(d.r-h/2)**2)/(1-maxRetention)*1e6/d.volume);
 for(let photon=0;photon<photons;photon++){
  const rho=src.radius*Math.sqrt(random()),angle=2*Math.PI*random(),p=src.center.map((x,j)=>x+rho*(Math.cos(angle)*f.u[j]+Math.sin(angle)*f.v[j]));
  const cos=Math.sqrt(random()),sin=Math.sqrt(1-cos*cos),az=2*Math.PI*random();let d=f.n.map((x,j)=>x*cos+sin*(Math.cos(az)*f.u[j]+Math.sin(az)*f.v[j])),weight=1,done=false;
  const track=new Float64Array(D);
  for(let event=0;event<maxEvents;event++){
   events++;const free=-Math.log(random())/mu;let escape=Infinity;for(let j=0;j<3;j++)if(Math.abs(d[j])>1e-15)escape=Math.min(escape,((d[j]>0?H:-H)-p[j])/d[j]);
   const hit=nearestWall(p,d,scene.wells),wall=hit?.t??Infinity,len=Math.min(free,escape,wall);
   if(!(len>=0)||!Number.isFinite(len))throw new Error('Invalid photon boundary distance.');
   for(let c=0;c<scene.detectors.length;c++){
    const det=scene.detectors[c],relative=p.map((x,j)=>x-det.center[j]);
    const outer=sphereInterval(relative,d,det.radius+h/2);if(!outer||outer[1]<0||outer[0]>len)continue;
    for(let b=0;b<det.bands.length;b++){const k=c*det.bands.length+b,q=flat[k];track[k]+=weight*shellBandTrack(relative,d,len,q.r,h,q.z0,q.z1);}
   }
   for(let j=0;j<3;j++)p[j]+=len*d[j];
   if(escape<=free&&escape<=wall){escaped+=weight;done=true;break;}
   if(wall<=free){wallAbsorbed+=weight*(1-reflectivity);weight*=reflectivity;const nd=dot(d,hit.normal);d=d.map((x,j)=>x-2*nd*hit.normal[j]);for(let j=0;j<3;j++)p[j]+=d[j]*2e-7;}
   else{absorbed+=weight*(1-albedo);weight*=albedo;d=scatterHG(d,anisotropy,random);}
   if(weight<=1e-12){truncated+=weight;remainingSum+=weight;done=true;break;}
  }
  if(!done){truncated+=weight;remainingSum+=weight;}
  for(let j=0;j<D;j++){const v=track[j]*1e6/flat[j].volume;if(v>maximum[j]*(1+1e-9))throw new Error('Photon exceeded analytic contribution bound.');sums[j]+=v;squares[j]+=v*v;if(v>0)hits[j]++;}
  if((photon+1)%8000===0)onProgress({fraction:(photon+1)/photons,phase:`Membrane photon histories ${photon+1}/${photons}`});
 }
 const bands=flat.map((d,j)=>({...d,...boundedMean(sums[j],squares[j],photons,maximum[j],familyAlpha/(totalChannels*D)),hits:hits[j],truncationUpperBias:remainingSum/photons*maximum[j],units:'mW/mm2 per emitted mW'}));
 for(const b of bands){b.upper+=b.truncationUpperBias;b.status=b.hits>=100&&b.standardError/b.mean<=.2?'sampled':'rare event; upper bound retained';}
 const energy={absorbed:absorbed/photons,wallAbsorbed:wallAbsorbed/photons,escaped:escaped/photons,truncated:truncated/photons};
 return {modelVersion:OPTICAL_SURFACE_VERSION,bands,energy,energyResidual:Math.abs(Object.values(energy).reduce((a,b)=>a+b,0)-1),settings:{photons,seed,muAbsPerMm,muScatterPerMm,anisotropy,reflectivity,maxEvents,familyAlpha,totalChannels,shellThicknessUm:h,boxHalfUm:H},events,
  intervalMethod:'Two-sided empirical Bernstein interval for independent bounded photon-history contributions; Bonferroni allocation over all requested channels and soma bands. Includes worst-case discarded-weight tail. Bounds refer to the finite shell transport model, not to biological calibration.',
  limitations:['Scalar fluence in a thin spherical shell; angular membrane absorption is homogenized.','Optical coefficients are hypothetical uniform effective values; somata do not refract or occlude rays.','Opaque specular liner; geometric apertures. No wavelength-dependent dielectric layers.','Finite-domain escape is lost; shell and domain convergence require separate tests.','Confidence intervals quantify Monte Carlo sampling only; deterministic shell and biological errors remain.']};
}
export function surfaceCoefficients(report,morphology,cellIndex,stat='mean'){
 const out=new Float64Array(morphology.compartments.length);for(const b of report.bands)if(b.cellIndex===cellIndex)out[b.compartmentIndex]=b[stat];return out;
}
