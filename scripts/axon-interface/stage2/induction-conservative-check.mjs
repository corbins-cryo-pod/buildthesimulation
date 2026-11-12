import fs from 'node:fs';import crypto from 'node:crypto';import v8 from 'node:v8';
import {normalizeStage1Settings} from '../../../src/lib/axon-interface/stage1-settings.mjs';
import {createStage1Cohort} from '../../../src/lib/axon-interface/identities.mjs';
import {createBipolarMorphology} from '../../../src/lib/axon-interface/bipolar.mjs';
import {stage1FieldSettings} from '../../../src/lib/axon-interface/stage1-protocol.mjs';
import {createStage1FieldModel,sampleMembraneTransfer} from '../../../src/lib/axon-interface/field-stage1.mjs';
import {embeddedCoil} from '../../../src/lib/axon-interface/stage2/magnetic-coupling.mjs';
import {integrateCableLink} from '../../../public/simulations/biohybrid-axon-interface/stage2/modules/magnetic.mjs';
import {conservativeInductionLoad} from '../../../src/lib/axon-interface/stage2/induction-conservative-load.mjs';
import {solveInductionReference} from './induction-refinement-solve.mjs';
const s=normalizeStage1Settings({axonCount:4,channelCount:1}),g=createStage1Cohort(s),m=createBipolarMorphology(s),coil=embeddedCoil(g.wells[0]),rows=[],runs=[],started=performance.now();
const sourcePaths=['src/lib/axon-interface/stage2/induction-conservative-load.mjs','src/lib/axon-interface/stage2/induction-precision-solve.mjs','src/lib/axon-interface/field-stage1.mjs','scripts/axon-interface/stage2/induction-refinement-solve.mjs','scripts/axon-interface/stage2/induction-conservative-check.mjs'];
const sourceHashes=Object.fromEntries(sourcePaths.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const primary=g.cells.map(cell=>{const c=m.compartments.map(q=>[q.positionUm[0]+cell.xUm,q.positionUm[1]+cell.yUm,q.positionUm[2]].map(x=>x*1e-6)),p=new Float64Array(c.length);for(let i=1;i<c.length;i++)p[i]=p[i-1]+1000*integrateCableLink(coil,c[i-1],c[i],8);return p;});
const reusedReference=process.argv.includes('--reuse-verified-reference')?JSON.parse(fs.readFileSync('docs/axon-interface/stage2/induction-fine4-precision-reference.json')):null;
if(reusedReference){for(const [p,h] of Object.entries(reusedReference.sourceHashes)){if(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==h)throw new Error('Reference source changed: '+p);}if(!reusedReference.relocationProof.normalizedSourcesIdentical||reusedReference.solve.relativeResidual>1e-10||reusedReference.solve.recurrenceResidual>2e-12)throw new Error('Unqualified reference');}
for(const refinement of reusedReference?[3]:[3,4]){
 console.log('Building',refinement);const model=createStage1FieldModel({...stage1FieldSettings(s,m),radialRefinement:refinement,axialRefinement:4},{...g,morphology:m,constructPresent:true});
 console.log('Mesh built',refinement,model.diagnostics);
 const load=conservativeInductionLoad(model,coil,{faceOrder:8,volumeRule:'tetra11'});
 console.log('Source assembled',refinement,load.diagnostics);
 // Expensive physical assembly is a recoverable diagnostic checkpoint, not
 // a qualified result. The cache is never used by production or acceptance.
 const {rowPtr,col,values,diag,boundary,diagnostics}=model;
 fs.writeFileSync('/tmp/induction-conservative-assembled-'+refinement+'.v8',v8.serialize({model:{rowPtr,col,values,diag,boundary,diagnostics},load,sourceHashes}));
 const solver=solveInductionReference;
 const solution=solver(model,load.rhsMicroampPerSlew,{onProgress:p=>{if(p.iterations%1000===0)console.log('PCG',refinement,p);}}),transfers=g.cells.map((cell,j)=>{const high=sampleMembraneTransfer(solution,m,cell),low=solution.potentialLowMvPerUa?sampleMembraneTransfer({...solution,potentialMvPerUa:solution.potentialLowMvPerUa},m,cell):new Float64Array(high.length),scalar=Float64Array.from(high,(v,i)=>v+low[i]),p=primary[j],ref=scalar[m.somaIndex]+p[m.somaIndex];return Array.from(scalar,(v,i)=>v+p[i]-ref);});
 runs.push({refinement,axialRefinement:4,transfers,assembly:load.diagnostics,solve:solution.diagnostics,arithmetic:'Production two-component solution/residual with exact axial-column block preconditioner'});console.log('Solved',refinement,load.diagnostics,solution.diagnostics.relativeResidual);
 rows.push({name:'Current balance '+refinement,pass:Math.abs(load.diagnostics.loadSumMicroampPerSlew)<=1e-15,value:load.diagnostics.loadSumMicroampPerSlew});
 fs.writeFileSync('/tmp/induction-conservative-progress.json',JSON.stringify(runs));
}
if(reusedReference)runs.push(reusedReference);
for(let j=0;j<4;j++){const a=runs[0].transfers[j],b=runs[1].transfers[j],error=Math.sqrt(a.reduce((q,x,i)=>q+(x-b[i])**2,0)/b.reduce((q,x)=>q+x*x,0));rows.push({name:'Cell '+j+' transfer refinement',relativeL2:error,pass:error<=.05});}
const prior=JSON.parse(fs.readFileSync('docs/axon-interface/stage2/induction-conservative-3-to-4-failure.json'));
for(let j=0;j<4;j++){const a=prior.runs[0].transfers[j],b=runs[0].transfers[j],error=Math.sqrt(a.reduce((q,x,i)=>q+(x-b[i])**2,0)/b.reduce((q,x)=>q+x*x,0));rows.push({name:'Cell '+j+' axial 3-to-4 refinement at radial 3',relativeL2:error,pass:error<=.05});}
const report={schema:'axon-stage2-conservative-induction-diagnostic/1',complete:true,passed:rows.every(r=>r.pass),rows,runs,sourceHashes,evidenceCollectionMode:reusedReference?'Fresh production radial 3 / axial 4; reuse of executed fine 4 with identical algorithm and physical-source hashes.':'Fresh production 3/4 and reference 4/4.',seconds:(performance.now()-started)/1000};
fs.writeFileSync('docs/axon-interface/stage2/induction-conservative-diagnostic.json',JSON.stringify(report,null,2)+'\n');console.log(rows);
