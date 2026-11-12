/** Reproduce a checkpoint without turning missing/failed scientific gates green. */
import {VERSION} from '../../../src/lib/axon-interface/stage2/settings.mjs';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';
const root=path.resolve(new URL('../../..',import.meta.url).pathname);process.chdir(root);
const dir='docs/axon-interface/stage2',python=process.env.MRG_PYTHON??'python3',collect=process.argv.includes('--collect'),start=performance.now(),stages=[];
const read=p=>{try{return JSON.parse(fs.readFileSync(p));}catch{return null;}},hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):[d+'/'+e.name]);}
const files=[...walk('src/lib/axon-interface').filter(p=>p.endsWith('.mjs')||p.endsWith('.json')),...walk('public/simulations/biohybrid-axon-interface/stage2/modules'),...walk('scripts/axon-interface/stage2').filter(p=>/\.(mjs|py|mod|txt)$/.test(p)&&!p.includes('/x86_64/')),...walk('src/pages/simulations/biohybrid-axon-interface/stage2'),'src/pages/simulations/biohybrid-axon-interface/stage2.astro','src/components/AxonStage2Laboratory.jsx','src/lib/axon-interface-stage2-publication.mjs',dir+'/coupling-acceptance.json',dir+'/spatial-acceptance.json','package-lock.json'];
const snapshot=()=>Object.fromEntries(files.sort().map(p=>[p,hash(p)])),before=snapshot();
function run(name,cmd,args,options={}){const begin=performance.now(),result=spawnSync(cmd,args,{cwd:root,encoding:'utf8',maxBuffer:8e6,timeout:1200000,...options});fs.mkdirSync(dir+'/logs',{recursive:true});fs.writeFileSync(dir+'/logs/'+name+'.log',(result.stdout??'')+(result.stderr??'')+(result.error?'\n'+String(result.error):''));const stage={name,command:[cmd,...args],exitCode:result.status,pass:result.status===0,seconds:(performance.now()-begin)/1000};stages.push(stage);console.log(name,result.status===0?'passed':'failed');return stage;}
if(!collect){
 run('contracts',process.execPath,['--test','tests/axon-interface-stage2-contracts.mjs','tests/axon-interface-induction-solve.mjs','tests/axon-interface-induction-reference.mjs','tests/axon-interface-spectral.mjs']);
 run('components',process.execPath,['--test','tests/components.test.mjs'],{cwd:path.join(root,'labs/axon-stage2')});
 run('component-fixtures',process.execPath,['scripts/reference-fixtures.mjs'],{cwd:path.join(root,'labs/axon-stage2')});
 run('component-reference',python,['reference/verify.py'],{cwd:path.join(root,'labs/axon-stage2')});
 const bin=spawnSync(python,['-c','import sys,pathlib;print(pathlib.Path(sys.executable).parent)'],{encoding:'utf8'}).stdout?.trim();
 for(const d of ['scripts/axon-interface/mrg-modeldb','scripts/axon-interface/stage2/mechanisms'])run(d.endsWith('mrg-modeldb')?'compile-native':'compile-opsin',path.join(bin??'', 'nrnivmodl'),[],{cwd:path.join(root,d),env:{...process.env,CC:'gcc',CXX:'g++'}});
 for(const name of ['coupling','surface','spatial','induction','magnetic-path','magnetic-coupling','magnetic-policy','protocol','spectral-component','spectral-coupling','spectral-spatial','spectral-protocol','spectral-crosstalk'])run(name,process.execPath,['scripts/axon-interface/stage2/'+name+'-check.mjs'],{env:{...process.env,MRG_PYTHON:python},...(name==='induction'?{timeout:14400000}:{})});
 // These depend on the production-refinement field and independently built
 // physical fixture emitted by induction; no pre-existing /tmp file is needed.
 run('magnetic-propagation-probe',process.execPath,['scripts/axon-interface/stage2/magnetic-propagation-probe.mjs']);
 run('magnetic-propagation',process.execPath,['scripts/axon-interface/stage2/magnetic-propagation-check.mjs'],{env:{...process.env,MRG_PYTHON:python}});
 const tests=run('repository-tests','npm',['test'],{timeout:3600000}),build=run('site-build','npm',['run','build']);
 fs.writeFileSync(dir+'/software-checkpoint.json',JSON.stringify({schema:'axon-stage2-software-checkpoint/2',modelVersion:VERSION,recordedAt:new Date().toISOString(),passed:tests.pass&&build.pass,fullRepositoryTests:tests,siteBuild:build},null,2)+'\n');
}
const component=read('labs/axon-stage2/reports/independent-reference.json'),coupled=Object.fromEntries(['coupling','surface','spatial','induction','magnetic-path','magnetic-coupling','magnetic-policy','magnetic-propagation','induction-conservative-independent','protocol','spectral-component','spectral-coupling','spectral-spatial','spectral-protocol','spectral-crosstalk'].map(k=>[k,read(dir+'/'+k+'-validation.json')])),browser=read(dir+'/browser-validation.json');
const gates=Object.entries(coupled).filter(([k,r])=>!r?.complete||!r?.passed).map(([k])=>k+' numerical qualification remains incomplete or failed.');
for(const [name,r] of Object.entries(coupled)){const stale=Object.entries(r?.sourceHashes??{}).filter(([p,h])=>!fs.existsSync(p)||hash(p)!==h).map(([p])=>p);if(stale.length)gates.push(name+' evidence has stale source hashes: '+stale.join(', '));}
for(const s of stages)if(!s.pass)gates.push(s.name+' failed during this reproduction; an older report cannot substitute for it.');
if(component?.requiredFail!==0||component?.requiredPass!==65)gates.push('Independent component reference is missing or failing.');
if(!browser?.passed||!browser?.hosted||browser?.modelVersion!==VERSION)gates.push('Final hosted browser verification remains pending.');
if(browser?.sourceHashes&&Object.entries(browser.sourceHashes).some(([p,h])=>!fs.existsSync(p)||hash(p)!==h))gates.push('Hosted browser evidence does not match the current tested source.');
const software=read(dir+'/software-checkpoint.json');if(!software?.passed||software?.modelVersion!==VERSION)gates.push('Current-version complete site build and repository regression evidence remains pending.');

const after=snapshot(),changed=files.filter(p=>before[p]!==after[p]);if(changed.length)gates.push('Scientific source changed during reproduction.');
const report={schema:'axon-stage2-validation/1',generatedAt:new Date().toISOString(),status:gates.length?'development-checkpoint':'qualified',completeStage2:gates.length===0,modelVersion:VERSION,biologicalValidation:false,
 evidenceCollectionMode:collect?'Aggregate existing study outputs; not a claim of a new all-studies rerun.':'Fresh studies from one entry point.',sourceChangedDuringRun:collect?null:changed,sourceHashes:after,
 runtime:{node:process.version,platform:os.platform(),architecture:os.arch(),cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,totalMemoryBytes:os.totalmem(),seconds:(performance.now()-start)/1000},stages,
 components:{requiredPass:component?.requiredPass??0,requiredFail:component?.requiredFail??null,unresolved:component?.unresolved??null},studies:Object.fromEntries(Object.entries(coupled).map(([k,r])=>[k,{complete:r?.complete??false,passed:r?.passed??false,checks:r?.rows?.length??0,sha256:fs.existsSync(dir+'/'+k+'-validation.json')?hash(dir+'/'+k+'-validation.json'):null}])),browser,openReleaseGates:gates,
 nextStage:gates.length?'Stage 3 remains blocked by Stage 2 release gates; PR #390 is preserved as a separate unqualified draft.':'Numerical Stage 2 is complete within its published model limits. Stage 3 may be reviewed next; existing PR #390 is not automatically qualified or merged.',
 limitations:['Source hashes identify this checkpoint. Passing rows verify stated equations only.','The original-host win condition is zero under complete resection; introduced outputs never replace original identities.','Retained failures and supplemental diagnostics stay separate from required release gates.']};
fs.writeFileSync(dir+'/validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,studies:report.studies,openReleaseGates:gates},null,2));
if(!collect&&gates.length)process.exitCode=1;
