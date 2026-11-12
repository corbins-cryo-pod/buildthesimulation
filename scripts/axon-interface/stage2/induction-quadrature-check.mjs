import fs from 'node:fs';import {spawnSync} from 'node:child_process';import crypto from 'node:crypto';
import {normalizeStage1Settings} from '../../../src/lib/axon-interface/stage1-settings.mjs';
import {createStage1Cohort} from '../../../src/lib/axon-interface/identities.mjs';
import {createBipolarMorphology} from '../../../src/lib/axon-interface/bipolar.mjs';
import {stage1FieldSettings} from '../../../src/lib/axon-interface/stage1-protocol.mjs';
import {createStage1FieldModel,sampleMembraneTransfer} from '../../../src/lib/axon-interface/field-stage1.mjs';
import {embeddedCoil} from '../../../src/lib/axon-interface/stage2/magnetic-coupling.mjs';
import {integrateCableLink} from '../../../public/simulations/biohybrid-axon-interface/stage2/modules/magnetic.mjs';
import {quadratureInductionLoad} from '../../../src/lib/axon-interface/stage2/induction-quadrature.mjs';
import {solveInductionLoad} from '../../../src/lib/axon-interface/stage2/induction-solve.mjs';
const rules=process.argv.includes('--tetra11')?['tetra11']:['vertex','tetra4'];
const s=normalizeStage1Settings({axonCount:4,channelCount:1}),g=createStage1Cohort(s),m=createBipolarMorphology(s),rows=[],runs=[],start=performance.now();
const paths=['src/lib/axon-interface/stage2/induction-quadrature.mjs','src/lib/axon-interface/stage2/induction-solve.mjs','src/lib/axon-interface/field-stage1.mjs','scripts/axon-interface/stage2/induction-quadrature-check.mjs'];
const hashes=()=>Object.fromEntries(paths.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')])),before=hashes();
const relative=(a,b)=>Math.sqrt(a.reduce((e,x,i)=>e+(x-b[i])**2,0)/b.reduce((e,x)=>e+x*x,0));
const coil=embeddedCoil(g.wells[0]),primary=g.cells.map(cell=>{
 const centers=m.compartments.map(c=>[c.positionUm[0]+cell.xUm,c.positionUm[1]+cell.yUm,c.positionUm[2]]),path=new Float64Array(centers.length);
 for(let i=1;i<path.length;i++)path[i]=path[i-1]+1000*integrateCableLink(coil,centers[i-1].map(x=>x*1e-6),centers[i].map(x=>x*1e-6),8);return path;
});
for(const refinement of [1,2]){
 const model=createStage1FieldModel({...stage1FieldSettings(s,m),radialRefinement:refinement,axialRefinement:refinement},{...g,morphology:m,constructPresent:true});
 for(const rule of rules){
  console.log('Integrating',refinement,rule,model.points.length);
  const load=quadratureInductionLoad(model,coil,{rule}),solution=solveInductionLoad(model,load.rhsMicroampPerSlew),transfers=g.cells.map((cell,j)=>{
   const scalar=sampleMembraneTransfer(solution,m,cell),path=primary[j],ref=scalar[m.somaIndex]+path[m.somaIndex];return Array.from(scalar,(v,i)=>v+path[i]-ref);
  });
  const run={refinement,rule,transfers,diagnostics:solution.diagnostics};runs.push(run);console.log('Solved',refinement,rule,solution.diagnostics.relativeResidual);
  if(refinement===2&&rule==='vertex'){
   const fixture='/tmp/axon-induction-fine.json';fs.writeFileSync(fixture,JSON.stringify({points:model.points,tetrahedra:Array.from(model.tetrahedra),regions:Array.from(model.regions),conductivityByRegion:load.conductivityByRegion,boundary:model.boundary,segments:coil.segments,potentialMvPerAperS:Array.from(solution.potentialMvPerUa),loadMicroampPerSlew:Array.from(load.rhsMicroampPerSlew)}));
   console.log('Fine independent fixture saved');
  }
 }
 fs.writeFileSync('/tmp/induction-quadrature-progress.json',JSON.stringify(runs));
}
for(const rule of rules){
 const [coarse,fine]=runs.filter(x=>x.rule===rule);
 for(let i=0;i<g.cells.length;i++){const error=relative(coarse.transfers[i],fine.transfers[i]);rows.push({name:`${rule} cell ${i} transfer refinement`,relativeL2:error,pass:error<=.05});}
}
const report={schema:'axon-stage2-induction-quadrature-diagnostic/1',complete:true,passed:rows.every(r=>r.pass),productionRule:'vertex',rows,runs,sourceHashes:before,sourceChanged:JSON.stringify(before)!==JSON.stringify(hashes()),seconds:(performance.now()-start)/1000,meaning:'Supplemental diagnostic. Higher-order source integration does not change the original 5% mesh criterion or erase failed tests.'};
fs.writeFileSync('docs/axon-interface/stage2/induction-quadrature'+(rules[0]==='tetra11'?'-11':'')+'-diagnostic.json',JSON.stringify(report,null,2)+'\n');console.log(rows);
