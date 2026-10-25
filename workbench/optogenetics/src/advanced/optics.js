import { lightAt as fiberOrUniform } from '../optics.js';
import { spectralWeight, OPSINS } from './opsins.js';
function basis(normal,rotationDeg=0){
 const ref=Math.abs(normal[2])<.9?[0,0,1]:[0,1,0];
 let u=[normal[1]*ref[2]-normal[2]*ref[1],normal[2]*ref[0]-normal[0]*ref[2],normal[0]*ref[1]-normal[1]*ref[0]];
 const len=Math.hypot(...u);u=u.map(x=>x/len);
 const v=[normal[1]*u[2]-normal[2]*u[1],normal[2]*u[0]-normal[0]*u[2],normal[0]*u[1]-normal[1]*u[0]],r=rotationDeg*Math.PI/180;
 return {u:u.map((x,k)=>x*Math.cos(r)+v[k]*Math.sin(r)),v:v.map((x,k)=>x*Math.cos(r)-u[k]*Math.sin(r))};
}
/** Exact solid angle of a uniformly radiating rectangle in a homogeneous medium.
 * Scalar fluence L*Omega, NOT irradiance onto a receiver plane. Optional empirical
 * exp(-mu_loss*r) omits scattered light; not a Monte Carlo tissue solution.
 */
function ledFluence(point,e,attenuationMmInv=0){
 if(!e.enabled||e.powerMw===0)return 0;
 const d=point.map((x,k)=>x-e.positionUm[k]),z=d.reduce((s,x,k)=>s+x*e.normal[k],0);
 if(z<=0)return 0; // one-sided emitter
 const {u,v}=basis(e.normal,e.rotationDeg??0),x=d.reduce((s,q,k)=>s+q*u[k],0),y=d.reduce((s,q,k)=>s+q*v[k],0);
 const a=e.widthUm/2,b=e.heightUm/2,term=(xx,yy)=>Math.atan2(xx*yy,z*Math.hypot(xx,yy,z));
 const omega=term(x+a,y+b)-term(x-a,y+b)-term(x+a,y-b)+term(x-a,y-b);
 return e.powerMw*1e6/(Math.PI*e.widthUm*e.heightUm)*Math.max(0,omega)*Math.exp(-attenuationMmInv*Math.hypot(...d)/1000);
}
function sourceField(point,source,device,opsinId=null){
 if(source.kind==='microled'){
  let sum=0;for(const e of device.emitters){
   const physical=ledFluence(point,e,source.absorptionMmInv+source.lossMmInv);
   sum+=physical*(opsinId?spectralWeight(opsinId,e.wavelengthNm)*e.wavelengthNm/OPSINS[opsinId].peakNm:1);
  }return sum;
 }
 let value=source.kind==='fiber'?fiberOrUniform(point,{...source,wavelengthNm:470}):source.irradianceMwMm2;
 if(opsinId)value*=spectralWeight(opsinId,source.wavelengthNm)*source.wavelengthNm/OPSINS[opsinId].peakNm;
 return value;
}
function sourcePowers(source,device){
 if(source.kind==='uniform')return {opticalMw:null,electricalMw:null,deviceHeatMw:0};
 if(source.kind==='fiber')return {opticalMw:source.powerMw,electricalMw:null,deviceHeatMw:0};
 const active=device.emitters.filter(x=>x.enabled);
 const opticalMw=active.reduce((s,e)=>s+e.powerMw,0),electricalMw=active.reduce((s,e)=>s+e.powerMw/e.efficiency,0);
 return {opticalMw,electricalMw,deviceHeatMw:electricalMw-opticalMw};
}
export {basis,ledFluence,sourceField,sourcePowers};
