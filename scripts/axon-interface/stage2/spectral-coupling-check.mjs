import fs from 'node:fs';import {spawnSync} from 'node:child_process';import crypto from 'node:crypto';
import {createBipolarMorphology} from '../../../src/lib/axon-interface/bipolar.mjs';
import {simulateCable} from '../../../src/lib/axon-interface/stage2/membrane.mjs';
import {SPECTRAL_MODELS,createSpectralPhotocurrent} from '../../../src/lib/axon-interface/stage2/spectral-opsin.mjs';
import {propagatedArmOutput} from '../../../src/lib/axon-interface/stage1-protocol.mjs';
import {compareTraces} from '../bipolar-validation-utils.mjs';
const dir='docs/axon-interface/stage2',acceptance=JSON.parse(fs.readFileSync(dir+'/spectral-acceptance.json')),grid=JSON.parse(fs.readFileSync(dir+'/spectral-propagation-acceptance.json')),m=createBipolarMorphology(),rows=[],probes=[],selected=[],start=performance.now();
const paths=['src/lib/axon-interface/stage2/spectral-opsin.mjs','src/lib/axon-interface/stage2/membrane.mjs','scripts/axon-interface/stage2/spectral_reference.py','scripts/axon-interface/stage2/native-reference.py','scripts/axon-interface/stage2/mechanisms/axon_spectral.mod',dir+'/spectral-acceptance.json',dir+'/spectral-propagation-acceptance.json'];
const hashes=()=>Object.fromEntries(paths.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')])),before=hashes();
function optical(model,power,expression,dt,blocked=false){return {modelId:model.id,bins:[{nm:model.id==='chr2'?470:550,fluencePerMw:m.compartments.map(c=>c.kind==='SOMA'?1:0)}],emittedMw:power,expressionMultiplier:expression,rateScale:1,pulseStartMs:.5,pulseWidthMs:2,expressionIndices:m.somaIndices,traceStride:Math.round(.01/dt),blocked};}
function run(photo,dt,silence=[]){const p=createSpectralPhotocurrent(m,photo),r=simulateCable({morphology:m,dtMs:dt,durationMs:6,equilibrationMs:50,traceStride:Math.round(.01/dt),saveCurrents:false,membraneMechanism:p.mechanism,silencedCompartments:silence});return r;}
for(const model of SPECTRAL_MODELS){
 let choice;
 for(const expression of grid.expressionMultipliers)for(const power of grid.localIrradianceMwMm2){const r=run(optical(model,power,expression,.000625),.000625),central=propagatedArmOutput(r,m,'central',{notBeforeMs:.5}),peripheral=propagatedArmOutput(r,m,'peripheral',{notBeforeMs:.5});probes.push({modelId:model.id,power,expression,central,peripheral,spikes:r.events.length});if(!choice&&central.recruited&&peripheral.recruited)choice={modelId:model.id,power,expression};}
 rows.push({name:model.id+' positive propagating fixture found',pass:!!choice});if(!choice)continue;selected.push(choice);console.log('Selected',choice);
 for(const variant of ['zero','propagating','opsin-block','whole-cell-block']){let previous;
  for(const dt of acceptance.dtMs){const photo=optical(model,variant==='zero'?0:choice.power,choice.expression,dt,variant==='opsin-block'),silence=variant==='whole-cell-block'?m.activeSiteIndices:[],r=run(photo,dt,silence);
   const record=(name,reference)=>{const c=compareTraces(reference,r);rows.push({name,pass:c.maximumSiteRmsMv<=1&&c.maximumCrossingTimeErrorMs<=.1&&c.identicalCrossingCounts,...c,spikeCount:r.events.length});};
   if(previous)record(model.id+' '+variant+' dt '+2*dt+' -> '+dt,previous);previous=r;
   if(dt===.0003125){const input='/tmp/spectral-native-input.json',output='/tmp/spectral-native-output.json';fs.writeFileSync(input,JSON.stringify({parameters:m.parameters,dtMs:dt,durationMs:6,equilibrationMs:50,traceStride:Math.round(.01/dt),saveCurrents:false,recordIndices:m.activeSiteIndices,silencedCompartments:silence,spectral:photo}));const py=spawnSync(process.env.MRG_PYTHON??'python3',['scripts/axon-interface/stage2/native-reference.py',input,output],{encoding:'utf8'});if(py.status)throw new Error(py.stderr+py.stdout);record(model.id+' '+variant+' native NEURON',JSON.parse(fs.readFileSync(output)));}
  }
 }
}
const report={schema:'axon-stage2-spectral-coupling-validation/1',complete:true,passed:rows.every(r=>r.pass)&&JSON.stringify(before)===JSON.stringify(hashes()),rows,probes,selected,acceptance,grid,sourceHashes:before,runtimeSeconds:(performance.now()-start)/1000,scope:'Nonlinear cable implementation and time integration; uniform local irradiance fixtures. Actual nonuniform transported light is tested separately. Positive hypothetical expression fixtures are not measured physiological thresholds.'};fs.writeFileSync(dir+'/spectral-coupling-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,checks:rows.length,failed:rows.filter(r=>!r.pass)}));if(!report.passed)process.exitCode=1;
