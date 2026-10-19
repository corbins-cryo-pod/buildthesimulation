// Bounded scans retain all sampled classifications, including nonmonotonicity.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadFiniteContact,finiteCellConfig,prepareFiniteNodes} from '../src/lib/cortex/finite-contact.js';
import {loadActiveModel} from '../src/lib/cortex/model-library.js';
import {getModelMetadata} from '../src/lib/cortex/model-registry.js';
import {makeWorld} from '../src/lib/cortex/world.js';
import {runFiniteExperiment} from '../src/lib/cortex/finite-experiment.js';
const dir=process.argv[2];if(!dir)throw Error('Supply scratch output directory');await mkdir(dir,{recursive:true});
const read=p=>readFile(new URL('../public'+p,import.meta.url));
const field=await loadFiniteContact(read),id='allen-human-601927090/1';
const gates={thresholdRelativeChange:.02,somaWaveformMaxMv:1,allMembraneWaveformMaxMv:2,crossingTimeMaxMs:.1};
const report={schema:'cortex-finite-rigor/1',model:id,gates,fieldSha256:field.manifest.data.sha256,
 scope:'One cell, fixed physical placement, one biphasic waveform, 0–100 µA. Scans can miss narrower intervals. Local crossings are not action potentials. No biological validation.',cases:[],comparisons:[]};
await loadActiveModel(id,10,read);const fixed=finiteCellConfig(id,10).neuron.somaUm;
const inputs=[],traces={};
for(const mesh of [40,20,10])for(const dt of [.005,.0025]){
 await loadActiveModel(id,mesh,read);
 const config=finiteCellConfig(id,mesh);config.neuron.somaUm=[...fixed];config.solver.dtMs=dt;
 const world=makeWorld(config),nodes=world.neuron.nodes;const cache=new Map();
 const classify=r=>({local:r.responseAnalysis.membraneThresholdCrossings.compartmentCount>0,soma:r.responseAnalysis.soma.thresholdEventCount>0,waveform:r.responseAnalysis.soma.waveformEvidenceCount>0,localCount:r.responseAnalysis.membraneThresholdCrossings.compartmentCount,somaCount:r.responseAnalysis.soma.thresholdEventCount});
 const run=amplitude=>{if(cache.has(amplitude))return cache.get(amplitude);const c=structuredClone(config);c.protocol.amplitudeUa=amplitude;const r=runFiniteExperiment(c,()=>{},{field});if(!r.membraneMv.every(Number.isFinite))throw Error('Nonfinite response');cache.set(amplitude,r);return r;};
 const scan=[0,1,...Array.from({length:20},(_,i)=>(i+1)*5)].map(amplitudeUa=>({amplitudeUa,...classify(run(amplitudeUa))}));
 const boundaries=[];
 for(const kind of ['local','soma','waveform'])for(let i=1;i<scan.length;i++)if(scan[i-1][kind]!==scan[i][kind]){
   let lo=scan[i-1].amplitudeUa,hi=scan[i].amplitudeUa;const left=scan[i-1][kind];
   for(let k=0;k<10&&hi-lo>.1;k++){const mid=(hi+lo)/2;if(classify(run(mid))[kind]===left)lo=mid;else hi=mid;}
   boundaries.push({kind,lowerUa:lo,upperUa:hi,lowerClassification:left,upperClassification:!left,direction:left?'loss':'onset'});
 }
 const key=`mesh${mesh}-dt${dt}`,one=run(1),somaTrace=Array.from(one.timeMs,(_,k)=>one.membraneMv[k*nodes.length+one.somaIndex]);
 const entry={key,meshUm:mesh,dtMs:dt,config,scan,boundaries,somaTraceAtOneUa:somaTrace};report.cases.push(entry);
 const amps=[...new Set([0,1,100,...boundaries.flatMap(b=>[b.lowerUa,b.upperUa])])];
 for(const amp of amps){const r=run(amp),caseId=`${key}-ua${amp}`;
   inputs.push({id:caseId,specimenId:601927090,config:r.config,nodes,orientationRadians:getModelMetadata(id).orientationRadians,unitAppliedMvPerUa:Array.from(prepareFiniteNodes(field,nodes,r.config).unitFieldMv)});
   traces[caseId]={classification:classify(r),timeMs:Array.from(r.timeMs),voltageMv:Array.from(r.membraneMv),firstCrossingMs:Array.from(r.firstCrossingByCompartment,v=>Number.isFinite(v)?v:null),somaSpikeTimesMs:r.spikes.map(s=>s.timeMs)};
 }
 console.log(JSON.stringify({key,boundaries,scan:scan.map(s=>[s.amplitudeUa,s.localCount,s.somaCount])}));
}
for(const a of report.cases)for(const b of report.cases){
 if(!((a.meshUm===b.meshUm&&a.dtMs===2*b.dtMs)||(a.meshUm===2*b.meshUm&&a.dtMs===b.dtMs)))continue;
 const compared=[];
 for(const kind of ['local','soma','waveform']){
 const aa=a.boundaries.filter(x=>x.kind===kind),bb=b.boundaries.filter(x=>x.kind===kind);
 if(!aa.length&&!bb.length){compared.push({kind,status:'not-assessed',reason:'No transition bracket in the bounded scan'});continue;}
 if(aa.length!==bb.length||aa.some((x,i)=>x.direction!==bb[i].direction)){compared.push({kind,status:'fail',reason:'Boundary topology changes with refinement'});continue;}
 compared.push({kind,transitions:aa.map((x,i)=>{const y=bb[i],relativeChange=Math.abs((x.lowerUa+x.upperUa)-(y.lowerUa+y.upperUa))/(y.lowerUa+y.upperUa);return {relativeChange,status:relativeChange<=gates.thresholdRelativeChange?'pass':'fail'};})});
 }
 report.comparisons.push({a:a.key,b:b.key,maxSomaWaveformDifferenceAtOneUaMv:Math.max(...a.somaTraceAtOneUa.map((v,i)=>Math.abs(v-b.somaTraceAtOneUa[i]))),thresholds:compared});
}
const paths=['scripts/cortex-finite-rigor.mjs','src/lib/cortex/finite-experiment.js','src/lib/cortex/active-cable.js','src/lib/cortex/active-channels.js','src/lib/cortex/finite-contact.js'];
report.sourceHashes={};for(const p of paths)report.sourceHashes[p]=createHash('sha256').update(await readFile(p)).digest('hex');
await writeFile(`${dir}/inputs.json`,JSON.stringify({gates,cases:inputs}));
await writeFile(`${dir}/browser-traces.json`,JSON.stringify(traces));
await writeFile('docs/cortex/finite-neural-rigor.json',JSON.stringify(report,null,2)+'\n');
