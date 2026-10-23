import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';

export const RELEASED_SOLVER_PROVENANCE=JSON.parse(readFileSync(new URL('../fixtures/biohybrid-v1-provenance.json',import.meta.url),'utf8'));
const sha256=source=>createHash('sha256').update(source).digest('hex');

/** Verify the released source byte-for-byte after reversing import rewrites. */
export function verifyReleasedFixture(){
  const p=RELEASED_SOLVER_PROVENANCE;
  let restored=readFileSync(new URL(`../../${p.fixturePath}`,import.meta.url),'utf8');
  let importRewritesMatch=true;
  for(const rewrite of p.importRewrites){
    const source=`'${rewrite.to}'`,target=`'${rewrite.from}'`;
    if(restored.split(source).length-1!==1)importRewritesMatch=false;
    restored=restored.replace(source,target);
  }
  const reconstructedSourceSha256=sha256(restored);
  const sharedDependencies=p.sharedDependencies.map(dependency=>{
    const source=readFileSync(new URL(`../../${dependency.path}`,import.meta.url));
    const actualSha256=sha256(source);
    return {...dependency,actualSha256,passed:actualSha256===dependency.releasedSha256};
  });
  return {releaseCommit:p.releaseCommit,releasePath:p.releasePath,expectedSourceSha256:p.releaseSourceSha256,
    reconstructedSourceSha256,importRewritesMatch,sharedDependencies,
    passed:importRewritesMatch&&reconstructedSourceSha256===p.releaseSourceSha256&&sharedDependencies.every(item=>item.passed)};
}

/** Compare the complete released result; do not replace exact equality by ε. */
export function compareReleasedResult(current,released){
  const originalShape=result=>{
    const snapshot={...result,diagnostics:{...result.diagnostics}};
    delete snapshot.observationVersion;
    delete snapshot.diagnostics.elapsedMs;
    snapshot.recordings=result.recordings.map(record=>{
      const original={...record};delete original.graftUv;delete original.hostUv;return original;
    });
    return snapshot;
  };
  const actual=originalShape(current),expected=originalShape(released);
  const fieldsExact=Object.fromEntries([...new Set([...Object.keys(actual),...Object.keys(expected)])]
    .map(key=>[key,isDeepStrictEqual(actual[key],expected[key])]));
  return {runtime:process.version,criterion:'Exact same-runtime equality with the frozen released implementation; no numerical error allowance.',
    exclusions:['observationVersion (added observation metadata)','recordings[].graftUv and hostUv (added source observations)','diagnostics.elapsedMs (wall-clock measurement)'],
    fieldsExact,passed:isDeepStrictEqual(actual,expected),
    comparedValues:{voltage:released.voltageMv.length,time:released.timeMs.length,stimulus:released.stimulusUa.length,
      traces:released.traces.reduce((sum,trace)=>sum+trace.values.length,0),
      recordings:released.recordings.reduce((sum,record)=>sum+record.neuralUv.length+record.artifactUv.length+record.totalUv.length,0),
      spikes:released.spikes.length,synapticEvents:released.synapticEvents.length}};
}
