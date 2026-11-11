import membrane from '../../../../docs/axon-interface/mrg-numerical-report.json';
import field from '../../../../docs/axon-interface/field-validation.json';
import coupled from '../../../../docs/axon-interface/mrg-coupled-report.json';
import integration from '../../../../docs/axon-interface/integration-validation.json';
import reproduction from '../../../../docs/axon-interface/reproduction-report.json';
import {MODEL_VERSION,LIMITATIONS} from '../../../lib/axon-interface/settings.mjs';
export const prerender=true;
export function GET(){const componentsPass=membrane.summary.requiredFail===0&&field.results.every(x=>x.status==='pass')&&coupled.passed;return new Response(JSON.stringify({modelVersion:MODEL_VERSION,status:componentsPass?'development; numerical components verified at declared fixtures':'development; a numerical verification gate failed',summary:membrane.summary.requiredPass+' membrane checks, '+field.results.filter(x=>x.status==='pass').length+' field checks and '+integration.summary.passed+' software checks pass. Full reproduction: '+reproduction.status+'. Complete biological Stage 1 remains incomplete.',completeStage1:false,physiologicalDiameterRelationValidated:false,membrane,field,coupled,integration,reproduction,limitations:LIMITATIONS},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});}

