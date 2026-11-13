import fs from 'node:fs';
import crypto from 'node:crypto';
import v8 from 'node:v8';
import {normalizeStage1Settings} from '../../../src/lib/axon-interface/stage1-settings.mjs';
import {createStage1Cohort} from '../../../src/lib/axon-interface/identities.mjs';
import {createBipolarMorphology} from '../../../src/lib/axon-interface/bipolar.mjs';
import {stage1FieldSettings} from '../../../src/lib/axon-interface/stage1-protocol.mjs';
import {createStage1FieldModel,sampleMembraneTransfer,prepareMembraneSampling} from '../../../src/lib/axon-interface/stage2/nested-field.mjs';
import {embeddedCoil} from '../../../src/lib/axon-interface/stage2/embedded-coil.mjs';
import {integrateCableLink} from '../../../public/simulations/biohybrid-axon-interface/stage2/modules/magnetic.mjs';
import {conservativeInductionLoad} from '../../../src/lib/axon-interface/stage2/induction-conservative-load.mjs';
import {solveInductionReference} from '../../../src/lib/axon-interface/stage2/induction-precision-solve.mjs';
import {createOfflineNestedField,referenceAdmission} from './nested-offline-field.mjs';

const directory='docs/axon-interface/stage2',planPath=directory+'/nested-recovery-plan.json',plan=JSON.parse(fs.readFileSync(planPath));
const planar=Number(process.argv[2]),axial=Number(process.argv[3]),allowed=[plan.candidate,...plan.references,plan.retainedDiagnostic];
if(!allowed.some(x=>x.planarRefinement===planar&&x.axialRefinement===axial))throw new Error('Case was not predeclared');
const key=`${planar}-${axial}`,output=directory+`/nested-recovery-field-${key}.json`,started=performance.now();
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const paths=[planPath,'scripts/axon-interface/stage2/generate-nested-field.py','scripts/axon-interface/stage2/nested-offline-field.mjs','scripts/axon-interface/stage2/nested-induction-run.mjs',
 'src/lib/axon-interface/stage2/nested-field.mjs','src/lib/axon-interface/field-stage1.mjs','src/lib/axon-interface/field.mjs','src/lib/axon-interface/identities.mjs','src/lib/axon-interface/stage1-settings.mjs','src/lib/axon-interface/stage1-protocol.mjs','src/lib/axon-interface/bipolar.mjs',
 'src/lib/axon-interface/stage2/embedded-coil.mjs','src/lib/axon-interface/stage2/induction-conservative-load.mjs','src/lib/axon-interface/stage2/induction-quadrature.mjs','src/lib/axon-interface/stage2/induction-precision-solve.mjs','public/simulations/biohybrid-axon-interface/stage2/modules/magnetic.mjs'];
const sourceHashes=Object.fromEntries(paths.map(p=>[p,hash(p)]));
let report={schema:'axon-stage2-nested-recovery-field/1',complete:false,passed:false,planarRefinement:planar,axialRefinement:axial,sourceHashes,startedAt:new Date().toISOString()};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
try{
 const s=normalizeStage1Settings(plan.cohort),g=createStage1Cohort(s),m=createBipolarMorphology(s),coil=embeddedCoil(g.wells[0]);
 const offline=planar===2,create=offline?createOfflineNestedField:createStage1FieldModel;
 console.log('Building',key,{offline});
 const model=create({...stage1FieldSettings(s,m),radialRefinement:plan.baseRadialRefinement,axialRefinement:axial},{...g,morphology:m,constructPresent:true},{planarRefinement:planar});
 console.log('Mesh',key,model.diagnostics);global.gc?.();
 const load=conservativeInductionLoad(model,coil,{faceOrder:plan.quadrature.faceOrder,volumeRule:plan.quadrature.volumeRule});
 console.log('Source',key,load.diagnostics);global.gc?.();
 const {rowPtr,col,values,diag,boundary,diagnostics}=model;
 fs.writeFileSync(`/tmp/nested-recovery-assembly-${key}.v8`,v8.serialize({model:{rowPtr,col,values,diag,boundary,diagnostics},load,sourceHashes}));
 const solution=solveInductionReference(model,load.rhsMicroampPerSlew,{onProgress:p=>{if(p.iterations%1000===0)console.log('PCG',key,p);}});
 console.log('Solved',key,solution.diagnostics.relativeResidual,solution.diagnostics.iterations);
 const transfers=g.cells.map(cell=>{
  const prepared=prepareMembraneSampling(model,m,cell),high=sampleMembraneTransfer(solution,m,cell,{prepared}),low=sampleMembraneTransfer({...solution,potentialMvPerUa:solution.potentialLowMvPerUa},m,cell,{prepared});
  const scalar=Float64Array.from(high,(v,i)=>v+low[i]),centers=m.compartments.map(c=>[c.positionUm[0]+cell.xUm,c.positionUm[1]+cell.yUm,c.positionUm[2]].map(x=>x*1e-6)),p=new Float64Array(centers.length);
  for(let i=1;i<p.length;i++)p[i]=p[i-1]+1000*integrateCableLink(coil,centers[i-1],centers[i],plan.quadrature.primaryLineSubdivisions);
  const ref=scalar[m.somaIndex]+p[m.somaIndex];return Array.from(scalar,(v,i)=>v+p[i]-ref);
 });
 const sourceChanged=paths.filter(p=>hash(p)!==sourceHashes[p]);
 report={...report,complete:true,passed:!sourceChanged.length&&Math.abs(load.diagnostics.loadSumMicroampPerSlew)<=1e-15,transfers,mesh:model.diagnostics,assembly:load.diagnostics,solve:solution.diagnostics,sourceChanged,
  resourceAdmission:offline?referenceAdmission:{kind:'unchanged-browser-admission',...plan.browserAdmission},seconds:(performance.now()-started)/1000,peakRssKb:process.resourceUsage().maxRSS};
 // Save the exact candidate physical mesh for independent Python assembly.
 if(planar===plan.candidate.planarRefinement&&axial===plan.candidate.axialRefinement){
  const fixturePath='/tmp/axon-nested-recovery-fixture.json';
  fs.writeFileSync(fixturePath,JSON.stringify({points:model.points,tetrahedra:Array.from(model.tetrahedra),regions:Array.from(model.regions),conductivityByRegion:load.conductivityByRegion,boundary:model.boundary,segments:coil.segments,potentialMvPerAperS:Array.from(solution.potentialMvPerUa,(v,i)=>v+solution.potentialLowMvPerUa[i]),loadMicroampPerSlew:Array.from(load.rhsMicroampPerSlew)}));
  const provenance={fixtureSha256:hash(fixturePath),sourceHashes,planarRefinement:planar,axialRefinement:axial,solve:solution.diagnostics};
  fs.writeFileSync('/tmp/axon-nested-recovery-provenance.json',JSON.stringify(provenance,null,2)+'\n');
  report.independentFixture={path:fixturePath,sha256:provenance.fixtureSha256};
 }
}catch(error){report={...report,error:String(error.stack??error),seconds:(performance.now()-started)/1000,peakRssKb:process.resourceUsage().maxRSS};process.exitCode=1;}
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({key,complete:report.complete,passed:report.passed,error:report.error,seconds:report.seconds}));
if(!report.passed)process.exitCode=1;
