import fs from 'node:fs';import {spawnSync} from 'node:child_process';import crypto from 'node:crypto';
import {normalize} from '../../../src/lib/axon-interface/stage2/settings.mjs';
import {createBipolarMorphology} from '../../../src/lib/axon-interface/bipolar.mjs';
import {createStage1Cohort} from '../../../src/lib/axon-interface/identities.mjs';
import {stage1FieldSettings,propagatedArmOutput} from '../../../src/lib/axon-interface/stage1-protocol.mjs';
import {createStage1FieldModel,solveStage1Channel,sampleMembraneTransfer} from '../../../src/lib/axon-interface/field-stage1.mjs';
import {surfaceTransport,surfaceScene,surfaceCoefficients} from '../../../src/lib/axon-interface/stage2/optical-surface.mjs';
import {createSpectralPhotocurrent,SPECTRAL_MODELS} from '../../../src/lib/axon-interface/stage2/spectral-opsin.mjs';
import {wavelengthTransport} from '../../../src/lib/axon-interface/stage2/spectral-protocol.mjs';
import {simulateCable} from '../../../src/lib/axon-interface/stage2/membrane.mjs';
import {compareTraces} from '../bipolar-validation-utils.mjs';
const dir='docs/axon-interface/stage2',a=JSON.parse(fs.readFileSync(dir+'/spectral-acceptance.json')),{settings,anatomy:s}=normalize({modality:'spectral'}),g=createStage1Cohort(s),base=createBipolarMorphology(s),field=createStage1FieldModel(stage1FieldSettings(s,base),{...g,morphology:base,constructPresent:true}),readout=solveStage1Channel(field,g.channels[0]),rows=[],runs=[],selected={},start=performance.now();
const emittedGrid=[.002,.005,.01],dt=.0003125,photons=128000;
// This fixed supplemental grid is declared before calculation. Choose the
// first positive coarse sample, never a sample chosen by convergence success.
const acceptance={...a,emittedGrid,photons,expressionByModel:{chr2:20,chrimson:20,vfchrimson:10,'hypothetical-green':10}};const previous={};
for(const level of a.levels){
 const m=createBipolarMorphology({...s,somaSegments:level.soma,stemSegments:level.stem,passiveSegments:level.passive}),record=sampleMembraneTransfer(readout,m,g.cells[0]),surfaces={};
 for(const nm of [470,550])surfaces[nm]=surfaceTransport(surfaceScene(g,m),{photons,seed:s.seed,...wavelengthTransport(settings,nm)});
 for(const model of SPECTRAL_MODELS){const nm=model.id==='chr2'?470:550,bins=[{nm,fluencePerMw:Array.from(surfaceCoefficients(surfaces[nm],m,0))}],expressionMultiplier=acceptance.expressionByModel[model.id];
  let run,photo,recording;
  const powers=selected[model.id]?[selected[model.id]]:emittedGrid;
  for(const emittedMw of powers){recording=[];photo={modelId:model.id,bins,emittedMw,expressionMultiplier,pulseStartMs:.5,pulseWidthMs:2,expressionIndices:m.somaIndices,traceStride:Math.round(.01/dt)};const mechanism=createSpectralPhotocurrent(m,photo);run=simulateCable({morphology:m,dtMs:dt,durationMs:6,equilibrationMs:50,traceStride:photo.traceStride,saveCurrents:false,membraneMechanism:mechanism.mechanism,onSample:(_t,c)=>recording.push(c.outer.reduce((v,x,i)=>v+x*record[i],0))});
   const central=propagatedArmOutput(run,m,'central',{notBeforeMs:.5}),peripheral=propagatedArmOutput(run,m,'peripheral',{notBeforeMs:.5});runs.push({modelId:model.id,level,emittedMw,expressionMultiplier,central,peripheral,recordingPeakToPeakUv:Math.max(...recording)-Math.min(...recording)});
   if(central.recruited&&peripheral.recruited){selected[model.id]??=emittedMw;break;}
  }
  const current=runs.at(-1),prior=previous[model.id];rows.push({name:model.id+' propagates at soma '+level.soma,pass:current.central.recruited&&current.peripheral.recruited});
  if(prior){for(const arm of ['central','peripheral']){const before=prior[arm],after=current[arm],da=before.recruited?before.times[2]-before.times[0]:null,db=after.recruited?after.times[2]-after.times[0]:null,error=da!==null&&db!==null?Math.abs(da-db)/Math.abs(db):null;rows.push({name:model.id+' '+arm+' delay '+prior.level.soma+' -> '+level.soma,relative:error,pass:error!==null&&error<=a.spaceConductionDelayRelative});}
   const error=Math.abs(prior.recordingPeakToPeakUv-current.recordingPeakToPeakUv)/Math.abs(current.recordingPeakToPeakUv);rows.push({name:model.id+' reciprocal recording '+prior.level.soma+' -> '+level.soma,relative:error,pass:error<=a.spaceRecordingPeakToPeakRelative});
  }else{const input='/tmp/spectral-spatial-native-input.json',output='/tmp/spectral-spatial-native-output.json';fs.writeFileSync(input,JSON.stringify({parameters:m.parameters,dtMs:dt,durationMs:6,equilibrationMs:50,traceStride:photo.traceStride,saveCurrents:false,recordIndices:m.activeSiteIndices,spectral:photo}));const py=spawnSync(process.env.MRG_PYTHON??'python3',['scripts/axon-interface/stage2/native-reference.py',input,output],{encoding:'utf8'});if(py.status)throw new Error(py.stderr);const c=compareTraces(run,JSON.parse(fs.readFileSync(output)));rows.push({name:model.id+' actual transported field native NEURON',...c,pass:c.maximumSiteRmsMv<=1&&c.maximumCrossingTimeErrorMs<=.1&&c.identicalCrossingCounts});}
  previous[model.id]=current;console.log('Completed',model.id,level.soma,current.emittedMw);
 }
}
const paths=['src/lib/axon-interface/stage2/spectral-opsin.mjs','src/lib/axon-interface/stage2/optical-surface.mjs','scripts/axon-interface/stage2/spectral-spatial-check.mjs'],report={schema:'axon-stage2-spectral-spatial-validation/1',complete:true,passed:rows.every(r=>r.pass),rows,runs,selected,acceptance,sourceHashes:Object.fromEntries(paths.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')])),runtimeSeconds:(performance.now()-start)/1000};fs.writeFileSync(dir+'/spectral-spatial-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,checks:rows.length,failed:rows.filter(r=>!r.pass)}));if(!report.passed)process.exitCode=1;
