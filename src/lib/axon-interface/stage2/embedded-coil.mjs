import {makeCoil} from '../../../../public/simulations/biohybrid-axon-interface/stage2/modules/magnetic.mjs';
/** Coupled release geometry: complete winding lies within the pre-existing
 * excluded sidewall. The component bench retains arbitrary orientations, but
 * these cannot silently substitute an unmeshed conductor in the tissue solve. */
export function embeddedCoil(well,{layers=6,segmentsPerTurn=48,layerPitchUm=5,trackWidthUm=.4,trackThicknessUm=.4}={}){
 const r=well.innerRadiusUm+.4*well.wallThicknessUm,returned=well.innerRadiusUm+.72*well.wallThicknessUm;
 const coil=makeCoil({radiusUm:r,returnRadiusUm:returned,layers,segmentsPerTurn,layerPitchUm,trackWidthUm,trackThicknessUm,viaRadiusUm:Math.min(trackWidthUm,trackThicknessUm)/2,centerUm:[...well.center],axis:[0,0,1]});
 for(const e of coil.segments){
  const a=e.a.map((x,j)=>x*1e6-well.center[j]),b=e.b.map((x,j)=>x*1e6-well.center[j]),dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy,t=den?Math.max(0,Math.min(1,-(a[0]*dx+a[1]*dy)/den)):0;
  const min=Math.hypot(a[0]+t*dx,a[1]+t*dy),max=Math.max(Math.hypot(a[0],a[1]),Math.hypot(b[0],b[1])),margin=e.exclusionRadiusM*1e6;
  if(min-margin<=well.innerRadiusUm||max+margin>=well.innerRadiusUm+well.wallThicknessUm||Math.max(Math.abs(a[2]),Math.abs(b[2]))+margin>=well.halfLengthUm-well.wallThicknessUm)throw new Error('Finite winding leaves the explicitly excluded insulating wall; coupled geometry is unsupported.');
 }
 return {...coil,containment:'Every complete finite-width segment is enclosed in the meshed insulating sidewall. No conducting tissue is silently replaced by a wire.'};
}
