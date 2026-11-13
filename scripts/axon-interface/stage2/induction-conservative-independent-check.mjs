import fs from 'node:fs';import {spawnSync} from 'node:child_process';import crypto from 'node:crypto';
import {normalizeStage1Settings} from '../../../src/lib/axon-interface/stage1-settings.mjs';
import {createStage1Cohort} from '../../../src/lib/axon-interface/identities.mjs';
import {createBipolarMorphology} from '../../../src/lib/axon-interface/bipolar.mjs';
import {stage1FieldSettings} from '../../../src/lib/axon-interface/stage1-protocol.mjs';
import {createStage1FieldModel} from '../../../src/lib/axon-interface/field-stage1.mjs';
import {embeddedCoil} from '../../../src/lib/axon-interface/stage2/magnetic-coupling.mjs';
import {conservativeInductionLoad} from '../../../src/lib/axon-interface/stage2/induction-conservative-load.mjs';
import {solveInductionReference as solveInductionLoad} from '../../../src/lib/axon-interface/stage2/induction-precision-solve.mjs';
const s=normalizeStage1Settings({axonCount:4,channelCount:1}),g=createStage1Cohort(s),m=createBipolarMorphology(s),coil=embeddedCoil(g.wells[0]),rows=[];
const paths=['scripts/axon-interface/stage2/induction-conservative-reference.py','src/lib/axon-interface/stage2/induction-conservative-load.mjs','src/lib/axon-interface/stage2/induction-precision-solve.mjs','scripts/axon-interface/stage2/induction-conservative-independent-check.mjs'];
const hashes=()=>Object.fromEntries(paths.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')])),sourceHashes=hashes();
// Preserve the existing absolute criterion and add a meaningful relative check
// because these per-unit-slew fields are far smaller than the absolute bound.
const acceptance={maximumPotentialUvPerAperS:.001,potentialRelativeL2:1e-6,loadRelativeL2:1e-8,trueResidual:1e-9};
fs.writeFileSync('/tmp/conservative-independent-predeclared.json',JSON.stringify(acceptance));
for(const refinement of [3]){
 const input='/tmp/axon-conservative-fixture-'+refinement+'.json',output='/tmp/axon-conservative-reference-'+refinement+'.json';
 if(process.argv.includes('--reuse-existing-fixture')){const p=JSON.parse(fs.readFileSync('/tmp/axon-conservative-fixture-3-provenance.json'));if(crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex')!==p.fixtureSha256||Object.entries(p.sourceHashes).some(([f,h])=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')!==h))throw new Error('Stale physical fixture');}else{
 console.log('Independent fixture',refinement);const model=createStage1FieldModel({...stage1FieldSettings(s,m),radialRefinement:refinement,axialRefinement:refinement},{...g,morphology:m,constructPresent:true}),load=conservativeInductionLoad(model,coil,{faceOrder:8,volumeRule:'tetra11'}),solution=solveInductionLoad(model,load.rhsMicroampPerSlew);
 fs.writeFileSync(input,JSON.stringify({points:model.points,tetrahedra:Array.from(model.tetrahedra),regions:Array.from(model.regions),conductivityByRegion:load.conductivityByRegion,boundary:model.boundary,segments:coil.segments,potentialMvPerAperS:Array.from(solution.potentialMvPerUa,(v,i)=>v+(solution.potentialLowMvPerUa?.[i]??0)),loadMicroampPerSlew:Array.from(load.rhsMicroampPerSlew)}));
 }
 const logPath='docs/axon-interface/stage2/logs/independent-field-'+refinement+'.log';fs.mkdirSync('docs/axon-interface/stage2/logs',{recursive:true});const log=fs.openSync(logPath,'w');
 const p=spawnSync(process.env.MRG_PYTHON??'python3',['scripts/axon-interface/stage2/induction-conservative-reference.py',input,output],{stdio:['ignore',log,log],env:{...process.env,OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1'},timeout:7200000});fs.closeSync(log);p.stderr=fs.readFileSync(logPath,'utf8');
 if(p.status!==0){rows.push({name:'Independent conservative field '+refinement,pass:false,exitCode:p.status,error:p.stderr??p.error?.message??'Reference failed'});console.log(p.stdout,p.stderr);continue;}
 const r=JSON.parse(fs.readFileSync(output));rows.push({name:'Independent conservative field '+refinement,...r,pass:r.maximumPotentialErrorUvPerAperS<=acceptance.maximumPotentialUvPerAperS&&r.potentialRelativeL2<=acceptance.potentialRelativeL2&&r.loadRelativeL2<=acceptance.loadRelativeL2&&r.relativeResidual<=acceptance.trueResidual});console.log(rows.at(-1));
}
const sourceChanged=JSON.stringify(sourceHashes)!==JSON.stringify(hashes()),report={schema:'axon-stage2-conservative-independent-validation/1',complete:true,passed:rows.every(r=>r.pass)&&!sourceChanged,rows,acceptance,sourceHashes,sourceChanged,evidenceCollectionMode:process.argv.includes('--reuse-existing-fixture')?'Independent Python reconstruction from the saved physical field-3 fixture; unchanged JS physical-source hashes and exact fixture hash verified.':'Fresh physical fixture and independent reconstruction.'};fs.writeFileSync('docs/axon-interface/stage2/induction-conservative-independent-validation.json',JSON.stringify(report,null,2)+'\n');if(!report.passed)process.exitCode=1;
