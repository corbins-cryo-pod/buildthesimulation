import {readFileSync,writeFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';import {defaults,sweep,analogTrace} from '../../../public/equipment/10-01/solver.mjs';
const dir=new URL('../../../public/equipment/10-01/',import.meta.url);export const declared=JSON.parse(readFileSync(new URL('benchmarks.json',dir),'utf8'));
export function cases(){
 const a=sweep({...defaults,durationMs:400}),v=sweep({...defaults,mode:'VC',step:10}),c=sweep({...defaults,cmPf:66}),r=sweep({...defaults,mode:'VC',step:100,gain:10});let err=0;try{sweep({...defaults,connected:false})}catch{err=1}
 const ix=(ms)=>Math.round(ms/1000/a.dtS);const values=[a.summary.tauMs,a.columns.membraneV[ix(21.5)]*1000,a.columns.membraneV[ix(404)]*1000,a.columns.electrodeV[ix(5)]*1000,v.columns.currentA[ix(5)]*1e12,v.columns.currentA[ix(20)]*1e12,v.summary.tauMs,c.summary.tauMs,err,Number(r.summary.clippedSamples>0)];
 return declared.cases.map((q,i)=>({...q,actual:values[i],passed:Math.abs(q.expected-values[i])<=q.tol}));
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const rows=cases();if(rows.some(r=>!r.passed))throw Error(JSON.stringify(rows));writeFileSync(new URL('verification.json',dir),JSON.stringify({scope:declared.scope,rows},null,2)+'\n');
 const tr=analogTrace(sweep(defaults));tr.dtS*=100;tr.channels[0].samples=tr.channels[0].samples.filter((_,i)=>i%100===0);tr.provenance.nativeDtS=.00001;tr.provenance.subsampling='Every 100th point for a compact IC tutorial fixture; not an antialiasing resampler.';writeFileSync(new URL('primary-example.json',dir),JSON.stringify(tr,null,2)+'\n');console.log(rows);
}
