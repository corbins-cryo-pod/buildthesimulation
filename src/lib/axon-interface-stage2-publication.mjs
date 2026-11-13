import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const STAGE2_STUDY_FILES=Object.freeze({
  coupling:'coupling-validation.json',surface:'surface-validation.json',spatial:'spatial-validation.json',
  'recording-field':'recording-field-validation.json',induction:'induction-validation.json',
  'magnetic-path':'magnetic-path-validation.json','magnetic-coupling':'magnetic-coupling-validation.json',
  'magnetic-policy':'magnetic-policy-validation.json','magnetic-propagation':'magnetic-propagation-validation.json',
  'nested-mesh':'nested-recovery-mesh-contracts.json','nested-default':'nested-recovery-validation.json',
  'nested-original':'nested-original-validation.json',
  'nested-recovery-independent':'nested-recovery-independent-validation.json',
  'nested-original-independent':'nested-original-independent-validation.json',protocol:'protocol-validation.json',
  'spectral-component':'spectral-component-validation.json','spectral-coupling':'spectral-coupling-validation.json',
  'spectral-spatial':'spectral-spatial-validation.json','spectral-protocol':'spectral-protocol-validation.json',
  'spectral-crosstalk':'spectral-crosstalk-validation.json',
});
export const STAGE2_ADDITIONAL_EVIDENCE=Object.freeze({
  browser:'docs/axon-interface/stage2/browser-validation.json',
  software:'docs/axon-interface/stage2/software-checkpoint.json',
  components:'labs/axon-stage2/reports/independent-reference.json',
});
const displayNames={recordingField:'recording-field',nestedMesh:'nested-mesh',nestedOriginal:'nested-original',
  nestedDefault:'nested-default',nestedOriginalIndependent:'nested-original-independent',
  nestedDefaultIndependent:'nested-recovery-independent',spectralCrosstalk:'spectral-crosstalk',
  magneticPropagation:'magnetic-propagation',spectralComponent:'spectral-component',spectralCoupling:'spectral-coupling',
  spectralSpatial:'spectral-spatial',spectralProtocol:'spectral-protocol',coupling:'coupling',
  magneticCoupling:'magnetic-coupling',magneticPath:'magnetic-path',magneticPolicy:'magnetic-policy',
  induction:'induction',surface:'surface',spatial:'spatial',protocol:'protocol'};
const directory='docs/axon-interface/stage2';
const hashFile=(root,file)=>{
  // Stored manifests use repository-relative paths and SHA-256, including for
  // reports consumed by later studies. Never read outside the publication root.
  if(typeof file!=='string'||path.isAbsolute(file))return null;
  const absolute=path.resolve(root,file);
  if(!absolute.startsWith(path.resolve(root)+path.sep))return null;
  try{return crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');}catch{return null;}
};
export function verifyStage2Sources(root,hashes){
  const entries=Object.entries(hashes??{}),stale=entries.filter(([file,hash])=>
    !/^[a-f0-9]{64}$/.test(hash)||hashFile(root,file)!==hash).map(([file])=>file);
  return {manifestPresent:entries.length>0,stale,current:entries.length>0&&stale.length===0};
}
export function stage2StudyStatus(study){
  if(!study)return 'Pending';
  if(!study.sourceVerification?.current)return 'Source changed / unverified';
  if(!study.sourceVerification?.evidenceMatches)return 'Evidence changed / uncollected';
  return study.complete&&study.passed?'Passed stated checks':'Failed / unresolved';
}
export function publishedStage2({root=process.cwd()}={}){
  const read=file=>{try{return JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));}catch{return null;}};
  const report=read(`${directory}/validation.json`)??{schema:'axon-stage2-validation/1',completeStage2:false,
    status:'development',openReleaseGates:['Final reproduction and release review pending.']};
  const sourceVerification=verifyStage2Sources(root,report.sourceHashes),gates=[...(report.openReleaseGates??[])];
  if(!sourceVerification.current)gates.push('Publication source manifest is missing or changed.');
  const verified={};
  for(const [name,file] of Object.entries(STAGE2_STUDY_FILES)){
    const relative=`${directory}/${file}`,study=read(relative),verification=verifyStage2Sources(root,study?.sourceHashes);
    const evidenceMatches=!!report.studies?.[name]?.sha256&&report.studies[name].sha256===hashFile(root,relative)
      &&report.evidenceFiles?.[relative]===hashFile(root,relative);
    const linkedEvidenceMatches=(study?.runFiles??[]).every(f=>f.sha256&&hashFile(root,f.path)===f.sha256)
      &&(!study?.fixtureProvenance||verifyStage2Sources(root,study.fixtureProvenance.sourceHashes).current);
    verified[name]=study?{...study,sourceVerification:{...verification,evidenceMatches:evidenceMatches&&linkedEvidenceMatches}}:null;
    if(!study?.complete||!study?.passed||!verification.current||!evidenceMatches||!linkedEvidenceMatches)
      gates.push(`${name}: required evidence is incomplete, failed, changed or unverified.`);
  }
  for(const [name,file] of Object.entries(STAGE2_ADDITIONAL_EVIDENCE)){
    const study=read(file),current=verifyStage2Sources(root,study?.sourceHashes).current;
    const passed=name==='components'?study?.requiredPass===65&&study?.requiredFail===0:
      study?.passed===true&&study?.modelVersion===report.modelVersion&&(name!=='browser'||study?.complete===true&&study?.hosted===true);
    if(!passed||!current||!report.evidenceFiles?.[file]||hashFile(root,file)!==report.evidenceFiles[file])
      gates.push(`${name}: release evidence is missing, changed or unverified.`);
  }
  const completeStage2=report.completeStage2===true&&gates.length===0;
  return {...report,sourceVerification,completeStage2,status:completeStage2?'qualified':'development-checkpoint',
    openReleaseGates:[...new Set(gates)],
    ...Object.fromEntries(Object.entries(displayNames).map(([property,name])=>[property,verified[name]])),
    conservativeInduction:read(`${directory}/induction-conservative-diagnostic.json`),
    conservativeIndependent:read(`${directory}/induction-conservative-independent-validation.json`),
    inductionQuadrature:read(`${directory}/induction-quadrature-diagnostic.json`),
    inductionQuadrature11:read(`${directory}/induction-quadrature-11-diagnostic.json`),
    inductionDirect:read(`${directory}/induction-direct-equilibrated-diagnostic.json`),
    retainedFailures:read(`${directory}/retained-failures.json`)??[]};
}
