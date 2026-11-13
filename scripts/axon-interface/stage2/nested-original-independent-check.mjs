// Original seed-2048 counterpart of the separately preserved seed-4079 study.
import fs from 'node:fs';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';
const dir='docs/axon-interface/stage2',planPath=dir+'/nested-original-cohort-plan.json',plan=JSON.parse(fs.readFileSync(planPath)),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const input='/tmp/axon-nested-original-fixture.json',provenance=JSON.parse(fs.readFileSync('/tmp/axon-nested-original-provenance.json')),output='/tmp/axon-nested-original-reference.json';
if(hash(input)!==provenance.fixtureSha256)throw new Error('Physical fixture bytes changed');
if(provenance.planarRefinement!==plan.candidate.planarRefinement||provenance.axialRefinement!==plan.candidate.axialRefinement)throw new Error('Wrong production candidate');
for(const [path,h] of Object.entries(provenance.sourceHashes))if(hash(path)!==h)throw new Error('Stale candidate source: '+path);
const paths=[planPath,'scripts/axon-interface/stage2/nested-original-independent-check.mjs','scripts/axon-interface/stage2/induction-conservative-reference.py'],sourceHashes=Object.fromEntries(paths.map(p=>[p,hash(p)]));
fs.mkdirSync(dir+'/logs',{recursive:true});const logPath=dir+'/logs/nested-original-independent.log',log=fs.openSync(logPath,'w');
const r=spawnSync(process.env.MRG_PYTHON??'python3',['scripts/axon-interface/stage2/induction-conservative-reference.py',input,output],{stdio:['ignore',log,log],env:{...process.env,OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1'},timeout:7200000});fs.closeSync(log);
const reference=r.status===0?JSON.parse(fs.readFileSync(output)):null,limit=plan.acceptance,rows=[];
if(reference){
 rows.push({name:'Independent original-equation residual',value:reference.relativeResidual,limit:limit.independentTrueResidual,pass:reference.relativeResidual<=limit.independentTrueResidual});
 rows.push({name:'Independent potential relative L2',value:reference.potentialRelativeL2,limit:limit.independentPotentialRelativeL2,pass:reference.potentialRelativeL2<=limit.independentPotentialRelativeL2});
 rows.push({name:'Independent load relative L2',value:reference.loadRelativeL2,limit:limit.independentLoadRelativeL2,pass:reference.loadRelativeL2<=limit.independentLoadRelativeL2});
 rows.push({name:'Independent absolute potential',value:reference.maximumPotentialErrorUvPerAperS,limit:limit.independentAbsolutePotentialUvPerAperS,units:'uV per (A/s)',pass:reference.maximumPotentialErrorUvPerAperS<=limit.independentAbsolutePotentialUvPerAperS});
}
const sourceChanged=Object.entries({...provenance.sourceHashes,...sourceHashes}).filter(([p,h])=>hash(p)!==h).map(([p])=>p),report={schema:'axon-stage2-nested-original-independent/1',complete:r.status===0,passed:r.status===0&&rows.every(x=>x.pass)&&!sourceChanged.length,rows,reference,sourceHashes,sourceChanged,fixtureProvenance:provenance,logSha256:hash(logPath),exitCode:r.status,error:r.error?.message??null,scope:'Independent NumPy/SciPy assembly from candidate physical points, tetrahedra, tensors and closed winding. JavaScript load and potential are comparisons only. No amplitude, baseline or time fitting.'};
fs.writeFileSync(dir+'/nested-original-independent-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
