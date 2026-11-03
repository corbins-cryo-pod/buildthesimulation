import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createExperiment,stepSimulation,measure,restoreSimulation} from '../public/labs/neural-growth-v5/engine/experiments.js';
import {PROFILES} from '../public/labs/neural-growth-v5/engine/profiles.js';
import {createField,advanceField} from '../public/labs/neural-growth-v5/engine/environment.js';
import {passiveCable} from '../public/labs/neural-growth-v5/engine/cable.js';

const report={model:'neural-growth/5.0.0',generatedAt:new Date().toISOString(),node:process.version,evidence:'Executed software verification and numerical diagnostics. No biological calibration or predictive validation.',tests:null,presets:[],numerics:{},growthStepDiagnostic:[],sourceSHA256:{}};
const tests=spawnSync(process.execPath,['--test','--test-reporter=tap','tests/neural-growth-v5.mjs'],{encoding:'utf8',maxBuffer:4e6});
report.tests={passed:tests.status===0,total:Number(tests.stdout.match(/# tests (\d+)/)?.[1]||0),pass:Number(tests.stdout.match(/# pass (\d+)/)?.[1]||0),fail:Number(tests.stdout.match(/# fail (\d+)/)?.[1]||0),cases:tests.stdout.split('\n').filter(l=>/^(ok|not ok) \d+ -/.test(l))};
if(tests.status!==0){console.error(tests.stdout,tests.stderr);throw Error('V5 test suite failed');}
console.log(`${report.tests.pass} V5 tests passed`);
for(const p of PROFILES){
  const start=performance.now(),s=createExperiment(p.id);stepSimulation(s,p.hours);restoreSimulation(s);const m=measure(s);
  assert.equal(s.timeHours,p.hours);assert.equal(s.limits.reached,false);assert.ok(m.cargoResidual<1e-6);
  const replay=restoreSimulation(s),continued=restoreSimulation(s);stepSimulation(replay,.25);stepSimulation(continued,.25);assert.deepEqual(replay,continued);
  const result={profile:p.id,seed:s.config.seed,hours:s.timeHours,cells:s.cells.length,stages:s.cells.map(c=>c.stage),totalLengthUm:m.totalLength,minorLengthUm:m.minorLength,axonLengthUm:m.totalAxonLength,dendriteLengthUm:m.totalDendriteLength,branchPoints:m.branches,activeTips:m.activeTips,segments:m.liveSegments,functionalContacts:m.functionalSynapses,cargoResidual:m.cargoResidual,minMeshQuality:Math.min(...m.perCell.map(c=>c.meshQuality)),maxAbsoluteAreaStrain:Math.max(...m.perCell.map(c=>Math.abs(c.areaStrain))),tipCappedAttempts:s.limits.tipLimitedCount,fieldMinimum:s.tissue.field?Math.min(...s.tissue.field.values):null,fieldTimeHours:s.tissue.field?.timeHours??null,checkpointReplayExact:true,wallSeconds:(performance.now()-start)/1000};report.presets.push(result);console.log(`${p.id}: ${p.hours} h, ${m.liveSegments} segments, ${m.branches} branch points`);
}
const makeField=()=>{const f=createField({bounds:{min:[0,0,0],max:[100,100,100]}},20);f.values[62]=1;return f;};
// All requested intervals are below the positivity bound, so each refinement
// changes the actual step (0.05 h would be automatically split into 0.025 h).
const fields=[.025,.0125,.00625,.003125].map(dt=>{const f=makeField();for(let i=0;i<Math.round(1/dt);i++)advanceField(f,dt,1800,0);return {dt,f};});
const ref=fields.at(-1).f.values;report.numerics.diffusion=fields.map(({dt,f})=>({dtHours:dt,massError:Math.abs(f.values.reduce((a,b)=>a+b,0)-1),minimum:Math.min(...f.values),rmsErrorToFinest:Math.sqrt(f.values.reduce((a,v,i)=>a+(v-ref[i])**2,0)/ref.length)}));
assert.ok(report.numerics.diffusion.every(v=>v.minimum>=0&&v.massError<1e-10));assert.ok(report.numerics.diffusion[1].rmsErrorToFinest<report.numerics.diffusion[0].rmsErrorToFinest);
const cableState=createExperiment('arm');stepSimulation(cableState,6);report.numerics.passiveCable=[.1,.05,.025].map(dtMs=>{const a=passiveCable(cableState,0,{dtMs}),at=a.samples.find(s=>s.timeMs>=40);return {dtMs,timeMs:at.timeMs,somaMV:at.somaMV,distalMV:at.distalMV};});
for(const seed of [7,714,2026])for(const dtHours of [.1,.05,.025]){const s=createExperiment('first',{seed,dtHours});stepSimulation(s,12);const m=measure(s);report.growthStepDiagnostic.push({seed,dtHours,hours:12,totalLengthUm:m.totalLength,branches:m.branches,cargoResidual:m.cargoResidual});}
report.growthStepScope='This small stochastic step-size diagnostic is not a coupled-model convergence proof. Random event scheduling and topology can differ with dt. Do not interpret exact seed replay at fixed dt as timestep convergence.';
for(const name of await readdir('public/labs/neural-growth-v5/engine'))if(name.endsWith('.js'))report.sourceSHA256[`engine/${name}`]=createHash('sha256').update(await readFile(`public/labs/neural-growth-v5/engine/${name}`)).digest('hex');
for(const name of ['worker.js','app.js','renderer.js','styles.css','index.html'])report.sourceSHA256[name]=createHash('sha256').update(await readFile(`public/labs/neural-growth-v5/${name}`)).digest('hex');
const json=JSON.stringify(report,null,2)+'\n';await mkdir('docs/neural-growth-v5',{recursive:true});await writeFile('docs/neural-growth-v5/verification.json',json);await writeFile('public/labs/neural-growth-v5/verification.json',json);console.log('V5 verification report written.');
