// Original seed-2048 counterpart of the separately preserved seed-4079 study.
import fs from 'node:fs';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';
const dir='docs/axon-interface/stage2',planFile=dir+'/nested-original-cohort-plan.json',plan=JSON.parse(fs.readFileSync(planFile)),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const cases=[plan.candidate,...plan.references,plan.retainedDiagnostic],key=x=>`${x.planarRefinement}-${x.axialRefinement}`,file=x=>`${dir}/nested-original-field-${key(x)}.json`;
const valid=r=>r?.complete&&r.passed&&Object.entries(r.sourceHashes).every(([p,h])=>fs.existsSync(p)&&hash(p)===h);
if(!process.argv.includes('--collect'))for(const c of cases){
 if(process.argv.includes('--resume')&&fs.existsSync(file(c))&&valid(JSON.parse(fs.readFileSync(file(c))))){console.log('Reusing completed identical-source case',key(c));continue;}
 const r=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=6144','scripts/axon-interface/stage2/nested-original-induction-run.mjs',String(c.planarRefinement),String(c.axialRefinement)],{stdio:'inherit',timeout:7200000});
 if(r.status!==0){console.error('Field case did not complete',key(c),r.status,r.error?.message);break;}
}
const runs=cases.map(c=>({case:c,report:fs.existsSync(file(c))?JSON.parse(fs.readFileSync(file(c))):null})),rows=[];
for(const {case:c,report:r} of runs)rows.push({name:`Executed and source-current field ${key(c)}`,pass:!!valid(r)});
const candidate=runs[0].report;
for(let j=1;j<=plan.references.length;j++){
 const reference=runs[j].report,axis=plan.references[j-1].axis;
 if(!valid(candidate)||!valid(reference))continue;
 for(let cell=0;cell<plan.cohort.axonCount;cell++){
  const a=candidate.transfers[cell],b=reference.transfers[cell],numerator=a.reduce((s,v,i)=>s+(v-b[i])**2,0),denominator=b.reduce((s,v)=>s+v*v,0),relativeL2=denominator?Math.sqrt(numerator/denominator):numerator===0?0:Infinity;
  rows.push({name:`Cell ${cell} ${axis} refinement`,cell,axis,relativeL2,limit:plan.acceptance.eachCellEachDirectionTransferRelativeL2,pass:relativeL2<=plan.acceptance.eachCellEachDirectionTransferRelativeL2});
 }
}
const low=runs.at(-1).report,retainedDiagnostic=[];
if(valid(low)&&valid(candidate))for(let cell=0;cell<plan.cohort.axonCount;cell++){const a=low.transfers[cell],b=candidate.transfers[cell],relativeL2=Math.sqrt(a.reduce((s,v,i)=>s+(v-b[i])**2,0)/b.reduce((s,v)=>s+v*v,0));retainedDiagnostic.push({name:`Cell ${cell} rejected-candidate axial 1-to-2`,relativeL2,limit:.05,pass:relativeL2<=.05});}
const result={schema:'axon-stage2-nested-recovery-convergence/1',complete:rows.length===cases.length+8,passed:rows.length===cases.length+8&&rows.every(x=>x.pass),rows,retainedDiagnostic,sourceHashes:{[planFile]:hash(planFile),['scripts/axon-interface/stage2/nested-original-induction-check.mjs']:hash(import.meta.filename)},runFiles:cases.map(c=>({path:file(c),sha256:fs.existsSync(file(c))?hash(file(c)):null})),generatedAt:new Date().toISOString()};
fs.writeFileSync(dir+'/nested-original-validation.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
