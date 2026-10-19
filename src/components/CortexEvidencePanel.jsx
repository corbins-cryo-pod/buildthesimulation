import {assessExperimentEvidence} from '../lib/cortex/experiment-evidence.js';
export default function CortexEvidencePanel({config}){
 const status=assessExperimentEvidence(config);
 return <details class="cx-evidence"><summary>Scientific evidence for this experiment</summary>
   <dl>{['field','native','refinement','propagation','selectivity','biological'].map(key=><div key={key}><dt>{key[0].toUpperCase()+key.slice(1)}</dt><dd>{status[key]}</dd></div>)}</dl>
   <a href="/cortex/validation/">Finite-contact validation results and limitations</a>
 </details>;
}
