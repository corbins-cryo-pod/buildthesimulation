/** Build-time publication of executed evidence. This module never enters a worker. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {MODEL_VERSION as CORE_VERSION} from './axon-interface/settings.mjs';
import {STAGE1_MODEL_VERSION,STAGE1_LIMITATIONS} from './axon-interface/stage1-settings.mjs';

const root=new URL('../../',import.meta.url),docs=new URL('docs/axon-interface/',root);
const standingLimitations=Object.freeze([
 'Measured engineered-cell morphologies and channel fits are unavailable; MRG-derived soma and stem conductances are exposed hypotheses, not calibrated human spiral-ganglion physiology.',
 'Species and preparation calibration remain unresolved, including the published cat conduction-velocity discrepancy. Subject-specific and heterogeneous tissue conductivities are not represented by the stated regional constants.',
 'The field is an ohmic imposed-drive model. Generated membrane fields contribute to recording but do not feed back into the cables; self-consistent ephaptic coupling and nonlinear circumferential soma polarization are absent.',
 'Electrode impedance, polarization, double-layer dynamics, electrochemical reactions, recording noise and amplifier saturation are not solved. Charge balance or Shannon arithmetic does not establish safety.',
 'Inhibition, adaptation beyond the stated channel mechanisms, synaptic variability, plasticity and activity-dependent circuit refinement are not modeled.',
 'There is no validated growth-to-connectivity mapping or empirically calibrated chronic change. Introduced projections, viable loading and anatomical target connections are imposed conditions rather than predicted outcomes.',
 'B3 contains no engineered-to-host junction. No human data validate the speculative junction mechanisms considered for the separate later architectures, and this model does not create such evidence.'
]);
export const REPORT_FILES=Object.freeze({
 nativeBuild:'native-build-report.json',
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
 apertureStudy:'browser-aperture-study.json',
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
 const evidenceMismatches=[];
 for(const entry of reproduction?.evidence??[]){
  const p=new URL(entry.report,root);
  if(!fs.existsSync(p)||createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==entry.reportSha256)evidenceMismatches.push(entry.report);
 }
 const required=['nativeBuild','membrane','field','coupled','integration','bipolar','somaSpatial','bipolarCoupled','wellField','denseWells','wellBoundary','protocol'];
 const verifiedEvidence=reproduction?.evidence??[];
 const evidenceComplete=verifiedEvidence.length===required.length&&required.every(key=>verifiedEvidence.some(entry=>entry.report==='docs/axon-interface/'+REPORT_FILES[key]&&entry.status==='pass'));
 const reproductionComplete=reproduction?.scope==='stage1-complete-numerical-and-integration'&&reproduction.status==='pass'&&
  ['executed','verified-existing-evidence'].includes(reproduction.mode)&&evidenceComplete&&
  reproduction.sourceChangedDuringRun?.length===0&&sourceMismatches.length===0&&evidenceMismatches.length===0;
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
  evidenceMismatches,
  originalHostEndpoint:'Under complete resection, no original H identity remains continuous: Y_original=0. New E outputs remain a separate conditional electrical endpoint.',
  limitations:[...STAGE1_LIMITATIONS,...standingLimitations],
  ...reports
 };
}
