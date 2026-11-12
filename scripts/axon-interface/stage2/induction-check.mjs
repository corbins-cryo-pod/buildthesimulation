/** Required production-field qualification. Original failed meshes stay archived. */
import fs from 'node:fs';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';
import {MAGNETIC_FIELD_METHOD} from '../../../src/lib/axon-interface/stage2/magnetic-coupling.mjs';
const dir='docs/axon-interface/stage2',collect=process.argv.includes('--collect'),rows=[];
if(!collect)for(const name of ['induction-production-fixture','induction-final-refinement-check','induction-conservative-independent-check']){
 const p=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=7000','scripts/axon-interface/stage2/'+name+'.mjs'],{stdio:'inherit',env:process.env,timeout:7200000});
 if(p.status!==0)rows.push({name:name+' completed successfully',pass:false,exitCode:p.status,error:p.error?.message??null});
}
const read=name=>{try{return JSON.parse(fs.readFileSync(dir+'/'+name));}catch{return null;}},hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const field=read('induction-conservative-diagnostic.json'),independent=read('induction-conservative-independent-validation.json');
for(const [name,report] of [['Conservative field refinement',field],['Independent physical assembly',independent]]){
 rows.push({name:name+' is complete and passes its fixed limits',pass:report?.complete===true&&report?.passed===true});
 const stale=Object.entries(report?.sourceHashes??{}).filter(([p,h])=>!fs.existsSync(p)||hash(p)!==h).map(([p])=>p);
 rows.push({name:name+' has current source hashes',pass:!!Object.keys(report?.sourceHashes??{}).length&&stale.length===0,stale});
 for(const row of report?.rows??[])rows.push({...row,name:name+': '+row.name});
}
rows.push({name:'Production actually uses the tested finer baseline and source rule',pass:MAGNETIC_FIELD_METHOD.radialRefinement===4&&MAGNETIC_FIELD_METHOD.axialRefinement===4&&MAGNETIC_FIELD_METHOD.faceOrder===8&&MAGNETIC_FIELD_METHOD.volumeRule==='tetra11'&&field?.runs?.[0]?.refinement===4&&field?.runs?.[0]?.axialRefinement===4&&field?.runs?.[1]?.refinement===5&&field?.runs?.[1]?.axialRefinement===4});
const paths=['src/lib/axon-interface/stage2/magnetic-coupling.mjs','src/lib/axon-interface/stage2/induction-precision-solve.mjs','src/lib/axon-interface/stage2/induction-conservative-load.mjs','scripts/axon-interface/stage2/induction-check.mjs'];
const report={schema:'axon-stage2-induction-validation/2',complete:true,passed:rows.every(r=>r.pass),rows,productionMethod:MAGNETIC_FIELD_METHOD,refinements:[4,5],axialRefinement:4,independentAssemblyScope:'Independent NumPy/SciPy reconstruction at radial 3/axial 3 verifies the physical assembly and solver; directional refinement separately qualifies the production 4/4 transfer.',transferRelativeL2Limit:.05,transfers:field?.runs?.map(r=>r.transfers)??[],sourceHashes:Object.fromEntries(paths.map(p=>[p,hash(p)])),evidenceCollectionMode:collect?'Aggregate the separately executed, hash-checked required studies.':'Execute the production fixture, finer field reference and independent assembly before aggregation.',scope:'Published four-cell benchmark, seed 2048, six-layer winding. This is not a per-run error certificate for every geometry.',retainedFailure:'retained/induction-vertex-coarse-failure.json'};
fs.writeFileSync(dir+'/induction-validation.json',JSON.stringify(report,null,2)+'\n');fs.appendFileSync(dir+'/induction-history.jsonl',JSON.stringify(report)+'\n');console.log(JSON.stringify({passed:report.passed,rows},null,2));if(!report.passed)process.exitCode=1;
