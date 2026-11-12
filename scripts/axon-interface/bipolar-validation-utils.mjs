/** Shared provenance and trace checks for the independent bipolar fixtures. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export const fileSha256=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export const snapshotSources=paths=>Object.fromEntries(Object.entries(paths).map(([name,file])=>[name,fileSha256(file)]));
export const changedSources=(paths,hashes)=>Object.entries(paths).filter(([name,file])=>fileSha256(file)!==hashes[name]).map(([name])=>name);
export function registerSource(paths,name,file){
  if(paths[name]&&fileSha256(paths[name])!==fileSha256(file))throw new Error(`Conflicting current source for ${name}; the field and membrane fixtures do not use identical code.`);
  paths[name]=file;
}
export function verifyFieldEvidence({fieldPath,fieldVersion,paths}){
  const fieldRoot=path.resolve(path.dirname(fieldPath),'../../..'),reports=[],failures=[];
  for(const filename of ['field-stage1-validation.json','field-stage1-dense-validation.json','field-stage1-domain-validation.json']){
    const relative='docs/axon-interface/'+filename,file=path.join(fieldRoot,relative);
    if(!fs.existsSync(file)){failures.push(`Missing ${filename}`);continue;}
    registerSource(paths,relative,file);
    const r=JSON.parse(fs.readFileSync(file)),problems=[];
    if(r.status!=='pass')problems.push('status is not pass');
    if(!Array.isArray(r.results)||!r.results.length||r.results.some(row=>row.status!=='pass'))problems.push('required numerical rows are absent or failing');
    if(r.modelVersion!==fieldVersion)problems.push('field version differs');
    if(!Array.isArray(r.sourceChangedDuringRun)||r.sourceChangedDuringRun.length)problems.push('field sources changed during the study');
    if(!r.sourceHashes||Object.keys(r.sourceHashes).length===0)problems.push('source hashes absent');
    for(const [name,expected] of Object.entries(r.sourceHashes??{})){
      const source=path.resolve(fieldRoot,name);
      if(!source.startsWith(fieldRoot+path.sep)){problems.push(`invalid source path ${name}`);continue;}
      if(!fs.existsSync(source)){problems.push(`missing source ${name}`);continue;}
      const actual=fileSha256(source);
      if(actual!==expected)problems.push(`stale source ${name}`);
      try{registerSource(paths,name,source);}catch(error){problems.push(error.message);}
    }
    for(const name of ['src/lib/axon-interface/field-stage1.mjs','src/lib/axon-interface/bipolar.mjs','src/lib/axon-interface/mrg.mjs'])if(!r.sourceHashes?.[name])problems.push(`missing core source hash ${name}`);
    reports.push({file:relative,sha256:fileSha256(file),status:r.status,modelVersion:r.modelVersion,requiredRows:r.results?.length??0,sourceHashes:r.sourceHashes??{},problems});
    failures.push(...problems.map(p=>`${filename}: ${p}`));
  }
  // The meshing vendor is part of the independently checked field, not an
  // unversioned implementation detail outside the reproduction contract.
  if(!reports.some(r=>r.sourceHashes['src/lib/axon-interface/vendor/cdt2d.mjs']))failures.push('No passing field report identifies the meshing vendor hash.');
  const baseField=path.join(path.dirname(fieldPath),'field.mjs');registerSource(paths,'src/lib/axon-interface/field.mjs',baseField);
  return {validated:reports.length===3&&failures.length===0,reports,failures};
}
export function compareTraces(a,b,{eventsA=a.activeSiteEventTimes??a.nodeEventTimes,eventsB=b.activeSiteEventTimes??b.nodeEventTimes}={}){
  const exactObservationTimestamps=a.timesMs.length===b.timesMs.length&&a.timesMs.every((t,i)=>t===b.timesMs[i]);
  if(!exactObservationTimestamps)throw new Error('Observation timestamps differ; interpolation, time shifting and rescaling are prohibited.');
  if(a.membraneMv.length!==b.membraneMv.length)throw new Error('Voltage trace site counts differ.');
  const rmsPerSiteMv=a.membraneMv.map((row,j)=>{
    if(row.length!==b.membraneMv[j].length)throw new Error('Voltage sample counts differ.');
    let sum=0;for(let k=0;k<row.length;k++)sum+=(row[k]-b.membraneMv[j][k])**2;return Math.sqrt(sum/row.length);
  });
  const identicalCrossingCounts=eventsA.length===eventsB.length&&eventsA.every((row,j)=>row.length===eventsB[j].length);
  let unmatchedCrossings=0,maximumCrossingTimeErrorMs=identicalCrossingCounts?0:null;
  for(let j=0;j<Math.max(eventsA.length,eventsB.length);j++){
    unmatchedCrossings+=Math.abs((eventsA[j]?.length??0)-(eventsB[j]?.length??0));
    if(identicalCrossingCounts)for(let k=0;k<eventsA[j].length;k++)maximumCrossingTimeErrorMs=Math.max(maximumCrossingTimeErrorMs,Math.abs(eventsA[j][k]-eventsB[j][k]));
  }
  return {exactObservationTimestamps,maximumSiteRmsMv:Math.max(...rmsPerSiteMv),rmsPerSiteMv,identicalCrossingCounts,unmatchedCrossings,maximumCrossingTimeErrorMs};
}
