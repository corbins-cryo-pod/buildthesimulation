// Bounded neural sensitivity study, not biological or independent-solver validation.
import {readFile,writeFile} from 'node:fs/promises';
import {loadFiniteContact,finiteCellConfig} from '../src/lib/cortex/finite-contact.js';
import {loadActiveModel} from '../src/lib/cortex/model-library.js';
import {runFiniteExperiment as runExperiment} from '../src/lib/cortex/finite-experiment.js';
const read=p=>readFile(new URL('../public'+p,import.meta.url));
const field=await loadFiniteContact(read),id='allen-human-601927090/1';
const cases=[];
for(const mesh of [40,20,10]){
  await loadActiveModel(id,mesh,read);
  for(const dt of [.005,.0025]){
    const config=finiteCellConfig(id,mesh);config.solver.dtMs=dt;
    const run=amplitude=>{config.protocol.amplitudeUa=amplitude;const r=runExperiment(config,()=>{},{field});if(!r.membraneMv.every(Number.isFinite))throw Error('Nonfinite membrane response');return r;};
    const low=run(0),r=run(1),high=run(100);
    const fires=r=>r.responseAnalysis.soma.thresholdEventCount>0;
    let bracket=null;
    if(!fires(low)&&fires(high)){
      let a=0,b=100;
      for(let k=0;k<12&&(b-a)>.005*Math.max(b,.1);k++){let m=(a+b)/2;if(fires(run(m)))b=m;else a=m;}
      bracket={lowerNoncrossingUa:a,upperCrossingUa:b,definition:'Somatic -25 mV upward crossing; bisection assumes local monotonicity, not a global excitability threshold'};
    }
    const entry={meshUm:mesh,dtMs:dt,compartments:r.diagnostics.compartments,
      zeroCurrentSomaEvents:low.responseAnalysis.soma.thresholdEventCount,
      oneUaResponse:r.responseAnalysis,hundredUaResponse:high.responseAnalysis,
      bracket,somaTraceAtOneUa:Array.from(r.timeMs,(_,k)=>r.membraneMv[k*r.diagnostics.compartments+r.somaIndex])};
    cases.push(entry);console.log(JSON.stringify({mesh,dt,bracket,oneUaExcursion:r.diagnostics.maxExcursionMv}));
  }
}
const comparisons=[];
for(let i=0;i<cases.length;i++)for(let j=i+1;j<cases.length;j++){
 const a=cases[i],b=cases[j];
 if(!((a.meshUm===b.meshUm)||(a.dtMs===b.dtMs&&a.meshUm===2*b.meshUm)))continue;
 const thresholdChange=a.bracket&&b.bracket?Math.abs(a.bracket.upperCrossingUa-b.bracket.upperCrossingUa)/b.bracket.upperCrossingUa:null;
 comparisons.push({a:{mesh:a.meshUm,dt:a.dtMs},b:{mesh:b.meshUm,dt:b.dtMs},maxSomaWaveformDifferenceMv:Math.max(...a.somaTraceAtOneUa.map((v,k)=>Math.abs(v-b.somaTraceAtOneUa[k]))),thresholdRelativeChange:thresholdChange,thresholdGate:thresholdChange===null?'not-assessed':thresholdChange<=.02?'pass':'fail'});
}
const report={schemaVersion:'finite-disk-neural-sensitivity/1',model:id,fieldSha256:field.manifest.data.sha256,
 scope:'Single placement and waveform. Does not resolve historical convergence failures. No independent NEURON comparison or biological validation performed.',cases,comparisons};
await writeFile(new URL('../docs/cortex/finite-contact-integration-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(comparisons,null,2));
