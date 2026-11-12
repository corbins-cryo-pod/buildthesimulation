import {solveReorderedLoad} from './reordered-solve.mjs';
import {solveInductionLoad} from './induction-solve.mjs';
import {makeCoil,integrateCableLink,coilDrive,inductanceEstimate} from '../../../../public/simulations/biohybrid-axon-interface/stage2/modules/magnetic.mjs';
import {prepareInductionLoad} from '../../../../public/simulations/biohybrid-axon-interface/stage2/modules/induction.mjs';
import {solveStage1Load,sampleMembraneTransfer} from '../field-stage1.mjs';
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
export function solveMagneticChannel(model,morphology,geometry,channelIndex,{coilOptions={},lineSubdivisions=8,reorder=false,onProgress=()=>{},shouldCancel=()=>false}={}){
 const coil=embeddedCoil(geometry.wells[channelIndex],coilOptions);onProgress({phase:'Assembling primary induction and tissue charge redistribution'});
 const load=prepareInductionLoad(model,coil),solution=(reorder?solveReorderedLoad:solveInductionLoad)(model,load.rhsMicroampPerSlew,{isCancelled:shouldCancel,onProgress});
 const transfers=geometry.cells.map(cell=>{
  const scalar=sampleMembraneTransfer(solution,morphology,cell),centers=morphology.compartments.map(c=>[c.positionUm[0]+cell.xUm,c.positionUm[1]+cell.yUm,c.positionUm[2]+(cell.zUm??0)]);
  const path=new Float64Array(centers.length);for(let i=1;i<path.length;i++)path[i]=path[i-1]+1000*integrateCableLink(coil,centers[i-1].map(x=>x*1e-6),centers[i].map(x=>x*1e-6),lineSubdivisions);
  const ref=scalar[morphology.somaIndex]+path[morphology.somaIndex];return {effective:Array.from(scalar,(v,i)=>v+path[i]-ref),scalar:Array.from(scalar),primaryPath:Array.from(path)};
 });
 return {coil,transfers,load,solution,diagnostics:{...solution.diagnostics,units:{transfer:'mV per (A/s)',load:'uA per (A/s)'},loadSumMicroampPerSlew:Array.from(load.rhsMicroampPerSlew).reduce((a,b)=>a+b,0)},inductance:inductanceEstimate(coil),
  limitations:['Tree-path quasipotential on the declared straight bipolar chain; transverse circumferential soma polarization is unresolved.','Ideal nonmagnetic insulating sidewall. The primary magnetic field penetrates it; the secondary electric field responds to its conductivity boundary.','The complete source/return winding lies within the sidewall. Arbitrarily rotated coils require a new admissible mesh.','No conductor skin/proximity effects, driver parasitics or temperature-dependent resistance.']};
}
export function coilSlew(t,dt,{peakA,pulseStartMs=.5,riseMs=.05,holdMs=0}){
 const overlap=(a,b,c,d)=>Math.max(0,Math.min(b,d)-Math.max(a,c));
 return peakA/(riseMs*.001)*(overlap(t,t+dt,pulseStartMs,pulseStartMs+riseMs)-overlap(t,t+dt,pulseStartMs+riseMs+holdMs,pulseStartMs+2*riseMs+holdMs))/dt;
}
export {coilDrive};
