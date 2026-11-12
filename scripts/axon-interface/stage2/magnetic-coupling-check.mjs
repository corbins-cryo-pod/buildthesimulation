import fs from 'node:fs';import {spawnSync} from 'node:child_process';import crypto from 'node:crypto';
import {createBipolarMorphology} from '../../../src/lib/axon-interface/bipolar.mjs';
import {simulateCable} from '../../../src/lib/axon-interface/stage2/membrane.mjs';
import {coilSlew} from '../../../src/lib/axon-interface/stage2/magnetic-coupling.mjs';
import {compareTraces} from '../bipolar-validation-utils.mjs';
const dir='docs/axon-interface/stage2',evidence=JSON.parse(fs.readFileSync(dir+'/induction-validation.json')),
 m=createBipolarMorphology(),transfer=evidence.transfers?.[1]?.[0],rows=[],started=performance.now();
if(!transfer||transfer.length!==m.compartments.length)throw new Error('Fine induction transfer fixture unavailable.');
const paths=['src/lib/axon-interface/stage2/membrane.mjs','src/lib/axon-interface/stage2/magnetic-coupling.mjs','src/lib/axon-interface/bipolar.mjs','scripts/axon-interface/stage2/native-reference.py','scripts/axon-interface/stage2/magnetic-coupling-check.mjs',dir+'/induction-validation.json',dir+'/coupling-acceptance.json'];
const hashes=()=>Object.fromEntries(paths.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')])),before=hashes();
const acceptance=JSON.parse(fs.readFileSync(dir+'/coupling-acceptance.json'));
for(const variant of [{name:'zero',peakA:0},{name:'10 A',peakA:10},{name:'100 A',peakA:100},{name:'100 A whole-cell block',peakA:100,silence:m.activeSiteIndices}]){
 let previous;
 for(const dtMs of [.000625,.0003125,.00015625]){
  const waveform=t=>coilSlew(t,dtMs,{peakA:variant.peakA}),r=simulateCable({morphology:m,dtMs,durationMs:6,equilibrationMs:50,traceStride:Math.round(.01/dtMs),saveCurrents:false,transferMvPerUa:transfer,waveform,silencedCompartments:variant.silence??[]});
  const check=(name,b,kind)=>{const c=compareTraces(r,b);rows.push({name,pass:c.maximumSiteRmsMv<=acceptance[kind+'MembraneMaximumSiteRmsMv']&&c.maximumCrossingTimeErrorMs<=acceptance[kind+'MaximumSpikeTimeMs']&&c.identicalCrossingCounts,...c,spikeCount:r.events.length});};
  if(previous){const c=compareTraces(previous,r);rows.push({name:variant.name+' time step '+(2*dtMs)+' -> '+dtMs,pass:c.maximumSiteRmsMv<=acceptance.timeMaximumSiteRmsMv&&c.maximumCrossingTimeErrorMs<=acceptance.timeMaximumSpikeTimeMs&&c.identicalCrossingCounts,...c,spikeCount:r.events.length});}previous=r;
  if(dtMs===.0003125){
   const fixture='/tmp/axon-stage2-magnetic-native-input.json',output='/tmp/axon-stage2-magnetic-native-output.json';
   fs.writeFileSync(fixture,JSON.stringify({parameters:m.parameters,dtMs,durationMs:6,equilibrationMs:50,traceStride:Math.round(.01/dtMs),saveCurrents:false,recordIndices:m.activeSiteIndices,silencedCompartments:variant.silence??[],transferMvPerUa:transfer,waveformUa:Array.from({length:Math.round(6/dtMs)},(_,i)=>waveform(i*dtMs))}));
   const p=spawnSync(process.env.MRG_PYTHON??'python3',['scripts/axon-interface/stage2/native-reference.py',fixture,output],{encoding:'utf8'});if(p.status!==0)throw new Error(p.stderr);
   check(variant.name+' native NEURON',JSON.parse(fs.readFileSync(output)),'native');
  }
 }
 console.log('Completed',variant.name);
}
const report={schema:'axon-stage2-magnetic-membrane-validation/1',complete:true,passed:rows.every(r=>r.pass)&&JSON.stringify(before)===JSON.stringify(hashes()),rows,acceptance,sourceHashes:before,sourceChanged:JSON.stringify(before)!==JSON.stringify(hashes()),runtimeSeconds:(performance.now()-started)/1000,fieldQualified:false,scope:'Conditional membrane implementation check using the saved finer induction coefficients. The field mesh itself remains unqualified. No propagating output is assumed; a negative fixture cannot qualify propagation delay or recording spatial convergence.'};
fs.writeFileSync(dir+'/magnetic-coupling-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,rows}));if(!report.passed)process.exitCode=1;
