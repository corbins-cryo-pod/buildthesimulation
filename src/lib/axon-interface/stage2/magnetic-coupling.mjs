import {solveReorderedLoad} from './reordered-solve.mjs';
import {solveInductionReference as solveInductionLoad} from './induction-precision-solve.mjs';
import {integrateCableLink,coilDrive,inductanceEstimate} from '../../../../public/simulations/biohybrid-axon-interface/stage2/modules/magnetic.mjs';
import {conservativeInductionLoad} from './induction-conservative-load.mjs';
import {solveStage1Load,sampleMembraneTransfer} from '../field-stage1.mjs';
export const MAGNETIC_FIELD_METHOD=Object.freeze({radialRefinement:4,axialRefinement:4,faceOrder:8,volumeRule:'tetra11'});
import {embeddedCoil} from './embedded-coil.mjs';
export {embeddedCoil};
export function solveMagneticChannel(model,morphology,geometry,channelIndex,{coilOptions={},lineSubdivisions=8,reorder=false,onProgress=()=>{},shouldCancel=()=>false}={}){
 const coil=embeddedCoil(geometry.wells[channelIndex],coilOptions);onProgress({phase:'Assembling primary induction and tissue charge redistribution'});
 const load=conservativeInductionLoad(model,coil,{...MAGNETIC_FIELD_METHOD,isCancelled:shouldCancel,onProgress}),solution=(reorder?solveReorderedLoad:solveInductionLoad)(model,load.rhsMicroampPerSlew,{isCancelled:shouldCancel,onProgress});
 const transfers=geometry.cells.map(cell=>{
  const high=sampleMembraneTransfer(solution,morphology,cell),low=solution.potentialLowMvPerUa?sampleMembraneTransfer({...solution,potentialMvPerUa:solution.potentialLowMvPerUa},morphology,cell):new Float64Array(high.length),scalar=Float64Array.from(high,(v,i)=>v+low[i]),centers=morphology.compartments.map(c=>[c.positionUm[0]+cell.xUm,c.positionUm[1]+cell.yUm,c.positionUm[2]+(cell.zUm??0)]);
  const path=new Float64Array(centers.length);for(let i=1;i<path.length;i++)path[i]=path[i-1]+1000*integrateCableLink(coil,centers[i-1].map(x=>x*1e-6),centers[i].map(x=>x*1e-6),lineSubdivisions);
  const ref=scalar[morphology.somaIndex]+path[morphology.somaIndex];return {effective:Array.from(scalar,(v,i)=>v+path[i]-ref),scalar:Array.from(scalar),primaryPath:Array.from(path)};
 });
 return {coil,transfers,load,solution,diagnostics:{...solution.diagnostics,units:{transfer:'mV per (A/s)',load:'uA per (A/s)'},loadSumMicroampPerSlew:Array.from(load.rhsMicroampPerSlew).reduce((a,b)=>a+b,0)},inductance:inductanceEstimate(coil),
  assembly:load.diagnostics,fieldMethod:MAGNETIC_FIELD_METHOD,
  limitations:['Tree-path quasipotential on the declared straight bipolar chain; transverse circumferential soma polarization is unresolved.','Ideal nonmagnetic insulating sidewall. The primary magnetic field penetrates it; the secondary electric field responds to its conductivity boundary.','The complete source/return winding lies within the sidewall. Arbitrarily rotated coils require a new admissible mesh.','No conductor skin/proximity effects, driver parasitics or temperature-dependent resistance.','Mesh-refinement studies qualify the published benchmark; this run does not independently repeat the published radial and axial refinement studies for each parameter choice.']};
}
export function coilSlew(t,dt,{peakA,pulseStartMs=.5,riseMs=.05,holdMs=0}){
 const overlap=(a,b,c,d)=>Math.max(0,Math.min(b,d)-Math.max(a,c));
 return peakA/(riseMs*.001)*(overlap(t,t+dt,pulseStartMs,pulseStartMs+riseMs)-overlap(t,t+dt,pulseStartMs+riseMs+holdMs,pulseStartMs+2*riseMs+holdMs))/dt;
}
export {coilDrive};
