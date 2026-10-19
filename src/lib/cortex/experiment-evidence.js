import evidence from './models/finite-evidence.json' with {type:'json'};
export const evidenceRegistry=evidence;
const signature=c=>({neuron:c.neuron,conductivity:c.tissue.conductivitySPerM,solver:c.solver,waveform:Object.fromEntries(['mode','amplitudeUa','startMs','phaseUs','gapUs'].map(k=>[k,c.protocol[k]]))});
function equal(a,b){
  if(typeof a==='number'&&typeof b==='number')return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-10;
  if(a&&b&&typeof a==='object'&&typeof b==='object')return Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&equal(a[k],b[k]));
  return a===b;
}
export function assessExperimentEvidence(config,fieldModel=null,supported=true){
 const finite=fieldModel?.model==='cortex-finite-disk/1';
 const base={biological:'Not validated against independent experiments.',propagation:'Not established by local crossings or somatic waveform evidence.',selectivity:'Not established. Synthetic axon and tissue assumptions limit interpretation.'};
 if(!finite)return {...base,field:'Analytical point-source conductor; finite contact and shank boundaries are absent.',native:'Selected point-source reference cases exist. This panel does not certify the current configuration.',refinement:'Historical firing-boundary convergence failures remain unresolved; no general threshold accuracy claim.'};
 const pinned=fieldModel.packageSha256===evidence.fieldSha256&&equal(fieldModel.centerUm,[0,0,1000])&&equal(fieldModel.normal,[0,0,1]);
 const match=supported&&pinned?evidence.cases.find(row=>equal(signature(row.config),signature(config))):null;
 const familySignature=c=>{const s=signature(c);delete s.neuron.segmentLengthUm;delete s.solver.dtMs;delete s.waveform.amplitudeUa;return s;};
 const sameFamily=pinned&&evidence.cases.some(row=>equal(familySignature(structuredClone(row.config)),familySignature(structuredClone(config))));
 return {...base,field:!supported?'Excluded: whole-cell placement is outside the accepted field region.':pinned?'Pinned disk potential has analytical, mesh and domain checks; applies only within accepted coverage.':'Field provenance or placement does not match the checked configuration.',
 native:match?`${match.status==='pass'?'Passed':'FAILED'} matched-case NEURON gates. Maximum soma / membrane difference: ${match.maxSomaErrorMv.toPrecision(3)} / ${match.maxMembraneErrorMv.toPrecision(3)} mV.`:'Not assessed for this exact cell, placement, waveform and solver configuration.',
 refinement:sameFamily?'Scoped scan: coarse spatial refinement failed; final 20→10 µm local-onset bracket met 2%. Somatic threshold not bracketed. Recruitment counts remain mesh-sensitive.':'Not assessed for this configuration. Passing field checks does not establish neuronal convergence.',matchedCaseId:match?.id??null,matchedCaseStatus:match?.status??'not-assessed',evidenceSchema:evidence.schema};
}
export function evidenceText(status){return Object.entries(status).filter(([key])=>['field','native','refinement','propagation','selectivity','biological'].includes(key)).map(([key,value])=>`${key[0].toUpperCase()+key.slice(1)}: ${value}`).join('\n');}
