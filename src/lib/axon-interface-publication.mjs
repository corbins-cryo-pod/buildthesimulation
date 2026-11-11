/** Build-time publication of executed evidence. This module never enters a worker. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {MODEL_VERSION as CORE_VERSION} from './axon-interface/settings.mjs';
import {STAGE1_MODEL_VERSION,STAGE1_LIMITATIONS} from './axon-interface/stage1-settings.mjs';

const root=new URL('../../',import.meta.url),docs=new URL('docs/axon-interface/',root);
export const REPORT_FILES=Object.freeze({
 membrane:'mrg-numerical-report.json',
 field:'field-validation.json',
 coupled:'mrg-coupled-report.json',
 integration:'integration-validation.json',
 bipolar:'bipolar-numerical-report.json',
 somaSpatial:'bipolar-soma-spatial-report.json',
 bipolarCoupled:'bipolar-coupled-report.json',
 wellField:'field-stage1-validation.json',
 denseWells:'field-stage1-dense-validation.json',
 wellBoundary:'field-stage1-domain-validation.json',
 protocol:'stage1-protocol-validation.json',
 amplitudeProbe:'stage1-amplitude-probe.json',
 reproduction:'reproduction-stage1-report.json'
});
export function readEvidenceFile(name){
 const p=new URL(name,docs);return fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):null;
}
function numericalPass(report){
 if(!report)return false;
 if(report.status==='pass'||report.passed===true)return true;
 if(report.summary?.numericalGatePassed===true&&report.summary.requiredFail===0)return true;
 return report.numericalComparisonsPassed===true&&report.authoritative===true;
}
export function publishedEvidence(){
 const reports=Object.fromEntries(Object.entries(REPORT_FILES).map(([key,file])=>[key,readEvidenceFile(file)]));
 const reproduction=reports.reproduction;
 const sourceMismatches=[];
 for(const [relative,expected] of Object.entries(reproduction?.sourceHashes??{})){
  const p=new URL(relative,root);
  if(!fs.existsSync(p)||createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==expected)sourceMismatches.push(relative);
 }
 const required=['membrane','field','coupled','integration','bipolar','somaSpatial','bipolarCoupled','wellField','denseWells','wellBoundary','protocol'];
 const reproductionComplete=reproduction?.scope==='stage1-complete-numerical-and-integration'&&reproduction.status==='pass'&&
  reproduction.sourceChangedDuringRun?.length===0&&sourceMismatches.length===0;
 const completeStage1=required.every(key=>numericalPass(reports[key]))&&reproductionComplete;
 const membraneCount=reports.membrane?.summary?.requiredPass??0,bipolarCount=reports.bipolar?.summary?.requiredPass??0;
 const wellCount=['wellField','denseWells','wellBoundary'].reduce((n,key)=>n+(reports[key]?.results?.filter(t=>t.status==='pass').length??0),0);
 return {
  schema:'buildthesimulation.axon-interface.validation.v2',
  modelVersion:STAGE1_MODEL_VERSION,benchmarkModelVersion:CORE_VERSION,
  publishedAt:new Date().toISOString(),
  status:completeStage1?'Conditional Stage 1: numerical gates passed at declared fixtures':'Development: final Stage 1 source verification pending',
  completeStage1,
  completeStage1Meaning:'Explicit fixed-topology bipolar replacement, physical well/electrode field, original identity accounting, architecture-appropriate controls and the executed numerical/integration release gates. This flag is not biological or clinical validation.',
  biologicalValidation:false,humanSpiralGanglionCalibration:false,physiologicalDiameterRelationValidated:false,
  summary:membraneCount+' motor-membrane checks, '+bipolarCount+' bipolar checks and '+wellCount+' explicit-well checks pass. '+(completeStage1?'Current-source Stage 1 numerical evidence and release verification passed.':'Final Stage 1 reproduction is pending.'),
  requiredReports:required,missingOrFailingReports:required.filter(key=>!numericalPass(reports[key])),
  sourceMismatches,
  originalHostEndpoint:'Under complete resection, no original H identity remains continuous: Y_original=0. New E outputs remain a separate conditional electrical endpoint.',
  limitations:[...STAGE1_LIMITATIONS],
  ...reports
 };
}
