import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {normalize} from '../../../src/lib/axon-interface/stage2/settings.mjs';
import {createBipolarMorphology} from '../../../src/lib/axon-interface/bipolar.mjs';
import {createStage1Cohort} from '../../../src/lib/axon-interface/identities.mjs';
import {stage1FieldSettings,propagatedArmOutput} from '../../../src/lib/axon-interface/stage1-protocol.mjs';
import {createStage1FieldModel,solveStage1Channel,sampleMembraneTransfer} from '../../../src/lib/axon-interface/field-stage1.mjs';
import {surfaceTransport,surfaceScene,surfaceCoefficients} from '../../../src/lib/axon-interface/stage2/optical-surface.mjs';
import {createPhotocurrent} from '../../../src/lib/axon-interface/stage2/photocurrent.mjs';
import {simulateCable} from '../../../src/lib/axon-interface/stage2/membrane.mjs';
import {compareTraces} from '../bipolar-validation-utils.mjs';
const dir='docs/axon-interface/stage2',a=JSON.parse(fs.readFileSync(dir+'/spatial-acceptance.json')),{anatomy:s}=normalize({axonCount:4}),g=createStage1Cohort(s),base=createBipolarMorphology(s),field=createStage1FieldModel(stage1FieldSettings(s,base),{...g,morphology:base,constructPresent:true}),readout=solveStage1Channel(field,g.channels[0]),rows=[],runs=[],start=performance.now();
const ptp=x=>Math.max(...x)-Math.min(...x),add=(name,pass,detail)=>rows.push({name,pass,...detail});let previous;
for(const level of a.levels){
 const m=createBipolarMorphology({...s,somaSegments:level.soma,stemSegments:level.stem,passiveSegments:level.passive}),surface=surfaceTransport(surfaceScene(g,m),{photons:a.photons,seed:s.seed}),fluence=surfaceCoefficients(surface,m,0),record=sampleMembraneTransfer(readout,m,g.cells[0]),recording=[];
 const optical={fluencePerMw:Array.from(fluence),emittedMw:a.emittedMw,gmaxMsCm2:5,pulseStartMs:.5,pulseWidthMs:2,expressionIndices:m.somaIndices,traceStride:Math.round(.01/a.dtMs)},photo=createPhotocurrent(m,optical);
 const r=simulateCable({morphology:m,dtMs:a.dtMs,durationMs:6,equilibrationMs:50,traceStride:optical.traceStride,saveCurrents:false,membraneMechanism:photo.mechanism,onSample:(t,c)=>recording.push(c.outer.reduce((v,x,i)=>v+x*record[i],0))}),central=propagatedArmOutput(r,m,'central',{notBeforeMs:.5}),peripheral=propagatedArmOutput(r,m,'peripheral',{notBeforeMs:.5});
 const current={level,central,peripheral,recordingPeakToPeakUv:ptp(recording),surfaceEnergyResidual:surface.energyResidual};runs.push(current);
 if(previous){for(const arm of ['central','peripheral']){const x=previous[arm],y=current[arm],same=x.recruited===y.recruited,da=x.recruited?x.times[2]-x.times[0]:null,db=y.recruited?y.times[2]-y.times[0]:null;const error=da!==null&&db!==null?Math.abs(da-db)/Math.abs(db):null;add(`${arm} propagation ${previous.level.soma}->${level.soma}`,same,{before:x,after:y});
   // Use physical monitor event delays; a missing propagating event is not zero error.
   if(error!==null)add(`${arm} conduction delay ${previous.level.soma}->${level.soma}`,error<=a.conductionDelayRelative,{relative:error});else add(`${arm} conduction delay ${previous.level.soma}->${level.soma}`,false,{reason:'No propagating events at one or both levels; no convergence claim.'});
  }const e=Math.abs(previous.recordingPeakToPeakUv-current.recordingPeakToPeakUv)/Math.abs(current.recordingPeakToPeakUv);add(`Reciprocal recording ${previous.level.soma}->${level.soma}`,e<=a.recordingPeakToPeakRelative,{relative:e});}
 if(level===a.levels[0]){
  const input='/tmp/axon-stage2-spatial-native-input.json',output='/tmp/axon-stage2-spatial-native-output.json';fs.writeFileSync(input,JSON.stringify({parameters:m.parameters,dtMs:a.dtMs,durationMs:6,equilibrationMs:50,traceStride:optical.traceStride,saveCurrents:false,recordIndices:m.activeSiteIndices,optical}));
  const native=spawnSync(process.env.MRG_PYTHON??'python3',['scripts/axon-interface/stage2/native-reference.py',input,output],{encoding:'utf8'});if(native.status)throw new Error(native.stderr);const comparison=compareTraces(r,JSON.parse(fs.readFileSync(output)));add('Actual nonuniform surface exposure versus native NEURON',comparison.maximumSiteRmsMv<=1&&comparison.maximumCrossingTimeErrorMs<=.1&&comparison.identicalCrossingCounts,comparison);
 }previous=current;console.log('Completed spatial level',level,current);
}
const report={schema:'axon-stage2-spatial-validation/1',complete:true,passed:rows.every(x=>x.pass),rows,runs,acceptance:a,runtimeSeconds:(performance.now()-start)/1000};fs.writeFileSync(dir+'/spatial-validation.json',JSON.stringify(report,null,2)+'\n');fs.appendFileSync(dir+'/spatial-history.jsonl',JSON.stringify(report)+'\n');console.log(rows);if(!report.passed)process.exitCode=1;
