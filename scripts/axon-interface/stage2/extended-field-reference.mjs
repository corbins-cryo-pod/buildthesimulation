/** Offline refinement admission only; the Stage 1 implementation stays intact.
 * The sole numerical-setting change admits radial factor 5 for verification.
 * Physical assembly, memory budgets and all residual limits remain identical.
 */
import fs from 'node:fs';import crypto from 'node:crypto';
const basePath=new URL('../../../src/lib/axon-interface/field.mjs',import.meta.url),wellPath=new URL('../../../src/lib/axon-interface/field-stage1.mjs',import.meta.url);
const base=fs.readFileSync(basePath,'utf8'),well=fs.readFileSync(wellPath,'utf8');
const old="if (s.radialRefinement > 4 || s.axialRefinement > 4) fail('refinement exceeds declared maximum 4');";
if(base.split(old).length!==2)throw new Error('Reference admission patch no longer matches its declared source.');
const extended=base.replace(old,"if (s.radialRefinement > 5 || s.axialRefinement > 4) fail('offline reference refinement exceeds radial 5 / axial 4');");
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const transformed=well.replace("'./field.mjs'",JSON.stringify(uri(extended))).replace("'./vendor/cdt2d.mjs'",JSON.stringify(new URL('../../../src/lib/axon-interface/vendor/cdt2d.mjs',import.meta.url).href));
export const referenceAdmission={sourceSha256:{base:crypto.createHash('sha256').update(base).digest('hex'),well:crypto.createHash('sha256').update(well).digest('hex')},soleChange:'Admit offline radial factor 5; axial cap 4, physical assembly, memory budgets and acceptance limits unchanged.'};
export const {createStage1FieldModel:createOfflineReferenceFieldModel}=await import(uri(transformed));
