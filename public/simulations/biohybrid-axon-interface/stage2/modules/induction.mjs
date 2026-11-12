import {vec3,sub,cross,dot,scale,add,finite} from './common.mjs';
import {coilField,integrateCableLink} from './magnetic.mjs';
/** P1 tetrahedron gradients in reciprocal micrometers, volume in um3. */
export function tetraGeometry(points) {
 if(!Array.isArray(points)||points.length!==4)throw new Error('Four vertices required.');points.forEach(p=>vec3(p));
 const a=sub(points[1],points[0]),b=sub(points[2],points[0]),c=sub(points[3],points[0]),det=dot(a,cross(b,c));if(Math.abs(det)<1e-15)throw new Error('Degenerate tetrahedron.');
 const grads=[cross(b,c),cross(c,a),cross(a,b)].map(g=>scale(g,1/det));grads.unshift(scale(add(add(grads[0],grads[1]),grads[2]),-1));return {volumeUm3:Math.abs(det)/6,gradientsPerUm:grads};
}
/** Weak RHS: K phi = integral grad(N) . sigma . E_primary dV.
 * The existing Stage 1 stiffness uses um and S/m, with RHS in uA and result V.
 * This unit-slew RHS is therefore numeric microamps per (A/s).
 */
export function inductionLoadFromNodalE({points,tetrahedra,regions,conductivityByRegion},nodeE) {
 if(!Array.isArray(points)||points.length>300000||!nodeE||nodeE.length!==points.length)throw new Error('Induction node budget/shape invalid.');
 if(tetrahedra.length!==regions.length*4||regions.length>2000000)throw new Error('Induction tetrahedron budget/shape invalid.');
 nodeE.forEach(v=>vec3(v,'primary E coefficient'));const rhs=new Float64Array(points.length);
 for(let ti=0;ti<regions.length;ti++){
  const ids=Array.from(tetrahedra.slice(4*ti,4*ti+4));if(ids.some(x=>!Number.isInteger(x)||x<0||x>=points.length)||new Set(ids).size!==4)throw new Error('Bad tetrahedron index.');
  const sigma=conductivityByRegion[regions[ti]];vec3(sigma,'conductivity tensor diagonal');if(sigma.some(x=>x<=0))throw new Error('Conducting elements require positive tensor diagonal.');
  const e=tetraGeometry(ids.map(i=>points[i])),avg=[0,0,0];for(const id of ids)for(let j=0;j<3;j++)avg[j]+=nodeE[id][j]/4;
  for(let v=0;v<4;v++)rhs[ids[v]]+=e.volumeUm3*e.gradientsPerUm[v].reduce((s,g,j)=>s+g*sigma[j]*avg[j],0)*1e-6;
 }
 return rhs;
}
export function prepareInductionLoad(model,coil) {
 const s=model.settings,conductivityByRegion=[[s.sigmaEndoTransverse,s.sigmaEndoTransverse,s.sigmaEndoLongitudinal],...[s.sigmaPerineurium,s.sigmaEpineurium,s.sigmaSurrounding,s.sigmaWellFluid].map(v=>[v,v,v])];
 const nodeE=model.points.map(p=>scale(coilField(p.map(v=>v*1e-6),coil).AperA,-1));
 return {rhsMicroampPerSlew:inductionLoadFromNodalE({...model,conductivityByRegion},nodeE),nodePrimaryEPerSlew:nodeE,conductivityByRegion};
}
/** Integration adapter; requires caller's unchanged Stage 1 solve/sample functions.
 * Not enabled in the standalone UI: production-mesh convergence has not run.
 */
export function coupledInductionTransfer({model,coil,morphology,cell,solveStage1Load,sampleMembraneTransfer}) {
 if(typeof solveStage1Load!=='function'||typeof sampleMembraneTransfer!=='function')throw new Error('Provide the pinned Stage 1 FEM functions.');
 const load=prepareInductionLoad(model,coil),solution=solveStage1Load(model,load.rhsMicroampPerSlew);
 const secondary=sampleMembraneTransfer(solution,morphology,cell),centers=morphology.compartments.map(c=>[c.positionUm[0]+cell.xUm,c.positionUm[1]+cell.yUm,c.positionUm[2]]);
 let integral=0;const effective=new Float64Array(centers.length);effective[0]=secondary[0];
 for(let i=1;i<centers.length;i++){integral+=integrateCableLink(coil,centers[i-1].map(x=>x*1e-6),centers[i].map(x=>x*1e-6),8);effective[i]=secondary[i]+1000*integral;}
 return {effectiveCableMvPerAperS:effective,secondaryMvPerAperS:Array.from(secondary),diagnostics:solution.diagnostics,releaseQualified:false,
  interpretation:'Tree-cable path potential from magnetic induction plus scalar charge-redistribution correction. This is not a global conservative magnetic electric field.',
  pending:['Production-mesh induction reference and boundary/line/surface quadrature refinement','Finite winding exclusion geometry and tissue intersection checks','New-drive membrane convergence and independent native solver comparison']};
}
