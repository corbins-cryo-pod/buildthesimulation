import fs from 'node:fs';import crypto from 'node:crypto';
import {normalizeStage1Settings} from '../../../src/lib/axon-interface/stage1-settings.mjs';
import {createStage1Cohort} from '../../../src/lib/axon-interface/identities.mjs';
import {createBipolarMorphology} from '../../../src/lib/axon-interface/bipolar.mjs';
import {stage1FieldSettings} from '../../../src/lib/axon-interface/stage1-protocol.mjs';
import {createStage1FieldModel,sampleMembraneTransfer} from '../../../src/lib/axon-interface/field-stage1.mjs';
import {embeddedCoil} from '../../../src/lib/axon-interface/stage2/magnetic-coupling.mjs';
import {integrateCableLink} from '../../../public/simulations/biohybrid-axon-interface/stage2/modules/magnetic.mjs';
import {conservativeInductionLoad} from '../../../src/lib/axon-interface/stage2/induction-conservative-load.mjs';
import {solveInductionLoad} from '../../../src/lib/axon-interface/stage2/induction-solve.mjs';
const s=normalizeStage1Settings({axonCount:4,channelCount:1}),g=createStage1Cohort(s),m=createBipolarMorphology(s),coil=embeddedCoil(g.wells[0]),rows=[],runs=[],started=performance.now();
const sourcePaths=['src/lib/axon-interface/stage2/induction-conservative-load.mjs','scripts/axon-interface/stage2/induction-conservative-check.mjs'];
const sourceHashes=Object.fromEntries(sourcePaths.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const primary=g.cells.map(cell=>{const c=m.compartments.map(q=>[q.positionUm[0]+cell.xUm,q.positionUm[1]+cell.yUm,q.positionUm[2]].map(x=>x*1e-6)),p=new Float64Array(c.length);for(let i=1;i<c.length;i++)p[i]=p[i-1]+1000*integrateCableLink(coil,c[i-1],c[i],8);return p;});
for(const refinement of [2,4]){
 console.log('Building',refinement);const model=createStage1FieldModel({...stage1FieldSettings(s,m),radialRefinement:refinement,axialRefinement:refinement},{...g,morphology:m,constructPresent:true});
 const load=conservativeInductionLoad(model,coil,{faceOrder:8,volumeRule:'tetra11'}),solution=solveInductionLoad(model,load.rhsMicroampPerSlew),transfers=g.cells.map((cell,j)=>{const scalar=sampleMembraneTransfer(solution,m,cell),p=primary[j],ref=scalar[m.somaIndex]+p[m.somaIndex];return Array.from(scalar,(v,i)=>v+p[i]-ref);});
 runs.push({refinement,transfers,assembly:load.diagnostics,solve:solution.diagnostics});console.log('Solved',refinement,load.diagnostics,solution.diagnostics.relativeResidual);
 rows.push({name:'Current balance '+refinement,pass:Math.abs(load.diagnostics.loadSumMicroampPerSlew)<=1e-15,value:load.diagnostics.loadSumMicroampPerSlew});
 fs.writeFileSync('/tmp/induction-conservative-progress.json',JSON.stringify(runs));
}
for(let j=0;j<4;j++){const a=runs[0].transfers[j],b=runs[1].transfers[j],error=Math.sqrt(a.reduce((q,x,i)=>q+(x-b[i])**2,0)/b.reduce((q,x)=>q+x*x,0));rows.push({name:'Cell '+j+' transfer refinement',relativeL2:error,pass:error<=.05});}
const report={schema:'axon-stage2-conservative-induction-diagnostic/1',complete:true,passed:rows.every(r=>r.pass),rows,runs,sourceHashes,seconds:(performance.now()-started)/1000};
fs.writeFileSync('docs/axon-interface/stage2/induction-conservative-diagnostic.json',JSON.stringify(report,null,2)+'\n');console.log(rows);
