/** One local entry point: fresh unit/reference evidence, optional real-browser checks. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=path.resolve(new URL('../',import.meta.url).pathname);process.chdir(root);
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const p=path.join(dir,e.name);return e.isDirectory()?walk(p):[p];});}
const sourceFiles=['overlay','scripts','tests','reference','docs'].flatMap(walk).filter(p=>!p.includes('__pycache__')&&!p.endsWith('.pyc')).sort();
const before=Object.fromEntries(sourceFiles.map(p=>[p,hash(p)]));const start=performance.now();const stages=[];
function run(name,cmd,args){const t=performance.now(),r=spawnSync(cmd,args,{encoding:'utf8',maxBuffer:16*1024*1024});fs.writeFileSync('reports/'+name+'.log',(r.stdout??'')+(r.stderr??''));stages.push({name,command:[cmd,...args],status:r.status===0?'pass':'fail',seconds:(performance.now()-t)/1000});if(r.status!==0)console.error(name,'failed; see reports/'+name+'.log');return r.status===0;}
fs.mkdirSync('reports',{recursive:true});
run('component-tests',process.execPath,['--test','--test-reporter=spec','tests/components.test.mjs']);
const fixtures=run('reference-fixtures',process.execPath,['scripts/reference-fixtures.mjs']);
if(fixtures)run('independent-reference','python3',['reference/verify.py']);
run('methods-build','python3',['scripts/build-methods.py']);run('standalone-build','python3',['scripts/build-standalone.py']);
if(process.argv.includes('--browser'))run('browser-qa','python3',['scripts/browser-qa.py']);
const changed=sourceFiles.filter(p=>hash(p)!==before[p]);
const independent=JSON.parse(fs.readFileSync('reports/independent-reference.json','utf8'));
const browser=process.argv.includes('--browser')?JSON.parse(fs.readFileSync('reports/browser-qa.json','utf8')):null;
const unitLog=fs.readFileSync('reports/component-tests.log','utf8');const n=Number(unitLog.match(/pass (\d+)/)?.[1]??0),failed=Number(unitLog.match(/fail (\d+)/)?.[1]??-1);
const report={schema:'axon-stage2.component-validation.v1',generatedAt:new Date().toISOString(),status:stages.every(x=>x.status==='pass')&&changed.length===0?'pass':'fail',scope:'Local component increment, not complete coupled Stage2',modelVersion:'axon-modalities-0.1.0-component-preview',completeStage2:false,biologicalValidation:false,neuralRecruitmentForNewModalities:false,
 baselineCommit:'90ff2502aec6a01f3b3a6c91bf28a6f848d8285a',repositoryChanged:false,deployed:false,unitTests:{passed:n,failed,skipped:0},independentComparisons:{passed:independent.requiredPass,failed:independent.requiredFail,unresolved:independent.unresolved},browserChecks:browser?{passed:browser.passed,failed:browser.failed,surface:browser.browser,navigationLimit:browser.navigationLimit,hostedDeploymentTested:false,fullAstroBuildTested:false}:null,
 acceptanceSha256:hash('docs/acceptance.json'),acceptanceUnchangedFromInitial:hash('docs/acceptance.json')===hash('reports/retained-failures/acceptance-before-tests.json'),sourceChangedDuringRun:changed,sourceHashes:before,
 runtime:{node:process.version,platform:os.platform(),architecture:os.arch(),cpu:os.cpus()[0]?.model??null,logicalCpus:os.cpus().length,totalMemoryBytes:os.totalmem(),executionSeconds:(performance.now()-start)/1000},stages,
 retainedFailures:['001-coil-lead-intersection.txt','002-optical-rare-event-ratios.json'],openReleaseGates:JSON.parse(fs.readFileSync('docs/acceptance.json','utf8')).releaseRequires,
 limitations:['Component tests do not establish coupled membrane behavior, biological validity, or clinical utility.','Three rare off-target optical estimates remain unresolved and their confinement headline is withheld.','Browser policies blocked navigation to localhost and file URLs. The delivered HTML and its real worker were exercised in memory without changing those policies.','Native Astro wrapper is supplied but full repository build and hosted deployment are not executed.']};
fs.writeFileSync('reports/validation.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({status:report.status,unitTests:report.unitTests,independent:report.independentComparisons,browser:report.browserChecks,acceptanceUnchanged:report.acceptanceUnchangedFromInitial,sourceChanges:changed,completeStage2:false},null,2));
if(report.status!=='pass'||!report.acceptanceUnchangedFromInitial)process.exitCode=1;
