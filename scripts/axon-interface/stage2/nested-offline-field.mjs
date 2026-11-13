/** Larger reference admission is offline only. No physical equation or solver
 * tolerance changes; the runtime module retains the original browser budget. */
import fs from 'node:fs';
import crypto from 'node:crypto';
const path=new URL('../../../src/lib/axon-interface/stage2/nested-field.mjs',import.meta.url),original=fs.readFileSync(path,'utf8');
const old='maxNodes:1800000,maxTetrahedra:11000000,maxNonzeros:60000000,maxEstimatedBytes:2100000000';
if(original.split(old).length!==2)throw new Error('Offline resource admission patch no longer matches');
const changed=original.replace(old,'maxNodes:3600000,maxTetrahedra:22000000,maxNonzeros:75000000,maxEstimatedBytes:2700000000')
 .replace("'../vendor/cdt2d.mjs'",JSON.stringify(new URL('../../../src/lib/axon-interface/vendor/cdt2d.mjs',import.meta.url).href))
 .replace("'../field.mjs'",JSON.stringify(new URL('../../../src/lib/axon-interface/field.mjs',import.meta.url).href));
export const referenceAdmission={kind:'offline-only-resource-increase',maxNodes:3600000,maxTetrahedra:22000000,maxNonzeros:75000000,maxEstimatedBytes:2700000000,sourceSha256:crypto.createHash('sha256').update(original).digest('hex'),physicalEquationUnchanged:true,solverAcceptanceUnchanged:true};
export const {createStage1FieldModel:createOfflineNestedField}=await import('data:text/javascript;base64,'+Buffer.from(changed).toString('base64'));
