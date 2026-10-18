import {loadFieldPackage,STATUS,units} from '../js/field-sampler.js';
export async function runBrowserSuite(baseURL) {
  const root=new URL(baseURL),fetchStart=performance.now();
  const [manifest,heldout,tolerances]=await Promise.all([fetch(new URL('artifacts/disk-v1/field.json',root)).then(r=>r.json()),fetch(new URL('validation/heldout.json',root)).then(r=>r.json()),fetch(new URL('validation/tolerances.json',root)).then(r=>r.json())]);
  const binary=await fetch(new URL('artifacts/disk-v1/'+manifest.data.file,root)).then(r=>r.arrayBuffer());
  const fetchMilliseconds=performance.now()-fetchStart,heapBefore=performance.memory?.usedJSHeapSize??null,t0=performance.now();
  const field=await loadFieldPackage(manifest,binary),loadMilliseconds=performance.now()-t0,heapAfter=performance.memory?.usedJSHeapSize??null;
  const points=new Float64Array(heldout.pointsMeters.flat()),sample=field.sampleUnitPotential(points),cache=field.cacheUnitPotentials(points);
  const cached=field.combineCached(cache,new Float64Array([-2e-6]));
  const failures=[];let maxAbsoluteErrorVoltsPerAmp=0,maxRelativeError=0;
  for(let i=0;i<sample.values.length;i++){
    const err=Math.abs(sample.values[i]-heldout.sourcePotentialVoltsPerAmp[i]);maxAbsoluteErrorVoltsPerAmp=Math.max(maxAbsoluteErrorVoltsPerAmp,err);maxRelativeError=Math.max(maxRelativeError,err/Math.max(1,Math.abs(heldout.sourcePotentialVoltsPerAmp[i])));
    if(sample.status[i]!==STATUS.OK || !Number.isFinite(err) || err>tolerances.export_relative*Math.abs(heldout.sourcePotentialVoltsPerAmp[i])+tolerances.export_absolute_volts_per_amp)failures.push(`heldout:${i}`);
    if(cached.values[i]!==sample.values[i]*-2e-6)failures.push(`cached:${i}`);
  }
  const a=manifest.geometry.radiusMeters,R=manifest.domain.radialExtentMeters;
  const bad=new Float64Array([NaN,0,a, 0,0,0, 2*a,0,0, 0,0,-a, R,0,a, 0,0,11*a, a,0,.001*a]);
  const expected=[STATUS.NONFINITE,STATUS.ELECTRODE_SURFACE,STATUS.INSULATION,STATUS.INSULATION,STATUS.OUTSIDE_DOMAIN,STATUS.OUTSIDE_VALIDATED_REGION,STATUS.NEAR_RIM];
  const invalid=field.samplePotential(bad,new Float64Array([0]));
  for(let i=0;i<expected.length;i++)if(invalid.status[i]!==expected[i]||!Number.isNaN(invalid.values[i]))failures.push(`boundary:${i}`);
  if(Math.abs(units.voltsToMillivolts(units.microampsToAmps(2)*1000)-2)>1e-15)failures.push('SI-units');
  const corrupt=binary.slice(0);new Uint8Array(corrupt)[corrupt.byteLength-3]^=1;
  let corruptRejected=false;try{await loadFieldPackage(manifest,corrupt);}catch(e){corruptRejected=/SHA-256/.test(e.message);}if(!corruptRejected)failures.push('checksum');
  const performanceRuns=[];
  for(const n of [1000,10000,100000]){
    const batch=new Float64Array(n*3);for(let i=0;i<n;i++)batch.set(heldout.pointsMeters[i%heldout.pointsMeters.length],3*i);
    for(let i=0;i<3;i++)field.sampleUnitPotential(batch);
    const times=[];let sampled;
    for(let i=0;i<7;i++){const start=performance.now();sampled=field.sampleUnitPotential(batch);times.push(performance.now()-start);}
    times.sort((a,b)=>a-b);const ms=times[3];
    performanceRuns.push({pointCount:n,medianMilliseconds:ms,pointsPerSecond:n/ms*1000,repetitions:7,inputArrayBytes:batch.byteLength,outputArrayBytes:sampled.values.byteLength+sampled.status.byteLength,invalidCount:Array.from(sampled.status).filter(s=>s!==STATUS.OK).length});
  }
  return {environment:typeof document==='undefined'?'Chromium Web Worker':'Chromium main thread',userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency,loading:{fetchMilliseconds,loadMilliseconds,retainedFieldTypedArrayBytes:field.storageBytes,inputBinaryBytes:binary.byteLength,jsHeapBeforeBytes:heapBefore,jsHeapAfterBytes:heapAfter,memoryNote:'Exact retained typed arrays reported; Chromium JS heap measurements include unrelated allocations and do not isolate process memory.'},heldout:{tolerance:{relative:tolerances.export_relative,absoluteVoltsPerAmp:tolerances.export_absolute_volts_per_amp},pointCount:sample.values.length,maxAbsoluteErrorVoltsPerAmp,maxRelativeError,sampledUnitPotential:Array.from(sample.values),status:Array.from(sample.status)},checks:{cacheScaling:!failures.some(x=>x.startsWith('cached:')),unitConversions:!failures.includes('SI-units'),explicitBoundaryStatuses:!failures.some(x=>x.startsWith('boundary:')),checksumRejection:corruptRejected},performance:performanceRuns,passed:failures.length===0,failedGates:failures};
}
