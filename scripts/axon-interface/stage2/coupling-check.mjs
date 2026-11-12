import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import crypto from 'node:crypto';
import {createBipolarMorphology} from '../../../src/lib/axon-interface/bipolar.mjs';
import {simulateCable as legacy} from '../../../src/lib/axon-interface/mrg.mjs';
import {simulateCable} from '../../../src/lib/axon-interface/stage2/membrane.mjs';
import {createPhotocurrent} from '../../../src/lib/axon-interface/stage2/photocurrent.mjs';
const dir='docs/axon-interface/stage2',raw=process.env.STAGE2_RAW??'/tmp/axon-stage2-reference';fs.mkdirSync(raw,{recursive:true});
const acceptance=JSON.parse(fs.readFileSync(dir+'/coupling-acceptance.json')),m=createBipolarMorphology(),rows=[],sourcePaths=['src/lib/axon-interface/stage2/membrane.mjs','src/lib/axon-interface/stage2/photocurrent.mjs','scripts/axon-interface/stage2/native-reference.py','scripts/axon-interface/stage2/mechanisms/axon_chr2.mod','docs/axon-interface/stage2/coupling-acceptance.json'];
const hashes=()=>Object.fromEntries(sourcePaths.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));const before=hashes(),started=performance.now();
function compare(a,b){let maxRms=0,maxTiming=0,counts=true;for(let j=0;j<a.membraneMv.length;j++){let e=0;for(let k=0;k<a.membraneMv[j].length;k++)e+=(a.membraneMv[j][k]-b.membraneMv[j][k])**2;maxRms=Math.max(maxRms,Math.sqrt(e/a.membraneMv[j].length));}
 for(let j=0;j<a.activeSiteEventTimes.length;j++){const x=a.activeSiteEventTimes[j],y=b.activeSiteEventTimes[j];if(x.length!==y.length)counts=false;for(let k=0;k<Math.min(x.length,y.length);k++)maxTiming=Math.max(maxTiming,Math.abs(x[k]-y[k]));}return {maxSiteRmsMv:maxRms,maxCrossingDifferenceMs:maxTiming,identicalCounts:counts,pass:maxRms<=1&&maxTiming<=.1&&counts};}
const common={morphology:m,durationMs:6,traceStride:16,saveCurrents:false};
const old=legacy(common),base=simulateCable(common);const sameKeys=['membraneMv','periaxonalMv','events','initialState','finalState'];rows.push({name:'Stage 1 no-mechanism equality',pass:sameKeys.every(k=>JSON.stringify(old[k])===JSON.stringify(base[k]))});
const fluence=m.compartments.map(c=>c.kind==='SOMA'?1:0);
const variants=[{name:'zero',power:0},{name:'subthreshold',power:1},{name:'recruited',power:5},{name:'soma-native-silenced',power:5,silence:m.somaIndices},{name:'whole-native-silenced',power:5,silence:m.activeSiteIndices},{name:'opsin-block',power:5,block:true}];
for(const variant of variants){let previous=null;for(const dtMs of [.000625,.0003125,.00015625]){
 const optical={fluencePerMw:fluence,emittedMw:variant.power,gmaxMsCm2:variant.block?0:5,pulseStartMs:.5,pulseWidthMs:2,expressionIndices:m.somaIndices,traceStride:Math.round(.01/dtMs)};
 const p=createPhotocurrent(m,optical),run=simulateCable({...common,dtMs,traceStride:Math.round(.01/dtMs),silencedCompartments:variant.silence??[],membraneMechanism:p.mechanism});
 if(previous)rows.push({name:`${variant.name} dt ${2*dtMs} -> ${dtMs}`,...compare(previous,run)});previous=run;
 if(dtMs===.0003125){const fixture={parameters:m.parameters,dtMs,durationMs:6,equilibrationMs:50,traceStride:Math.round(.01/dtMs),saveCurrents:false,recordIndices:m.activeSiteIndices,silencedCompartments:variant.silence??[],optical};
 const input=path.join(raw,variant.name+'-input.json'),output=path.join(raw,variant.name+'-native.json');fs.writeFileSync(input,JSON.stringify(fixture));
 const native=spawnSync(process.env.MRG_PYTHON??'python3',['scripts/axon-interface/stage2/native-reference.py',input,output],{encoding:'utf8'});if(native.status!==0)throw new Error(native.stderr+native.stdout);
 const ref=JSON.parse(fs.readFileSync(output));rows.push({name:variant.name+' native NEURON',...compare(run,ref),events:run.events.length,central:run.propagation.rightArm,opsin:p.diagnostics()});}
 }}
const report={schema:'axon-stage2-coupling-validation/1',complete:true,passed:rows.every(r=>r.pass)&&JSON.stringify(before)===JSON.stringify(hashes()),rows,acceptance,sourceHashes:before,sourceChanged:JSON.stringify(before)!==JSON.stringify(hashes()),runtimeSeconds:(performance.now()-started)/1000,biologicalValidation:false};
fs.writeFileSync(dir+'/coupling-validation.json',JSON.stringify(report,null,2)+'\n');fs.appendFileSync(dir+'/coupling-history.jsonl',JSON.stringify(report)+'\n');console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
