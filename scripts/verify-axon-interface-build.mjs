/** Verify the emitted site, current evidence, disclosed boundaries and worker. */
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {MODEL_VERSION as BENCHMARK_MODEL_VERSION} from '../src/lib/axon-interface/settings.mjs';
import {STAGE1_MODEL_VERSION} from '../src/lib/axon-interface/stage1-settings.mjs';
import {BIPOLAR_VERSION} from '../src/lib/axon-interface/bipolar.mjs';
import {FIELD_STAGE1_VERSION} from '../src/lib/axon-interface/field-stage1.mjs';
import {MRG_VERSION,MRG_SOURCE} from '../src/lib/axon-interface/mrg.mjs';
import {FIELD_VERSION} from '../src/lib/axon-interface/field.mjs';
import {scientificQuestions} from '../src/lib/axon-interface/evidence.mjs';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),dist=path.join(root,'dist');
const route='simulations/biohybrid-axon-interface';
function inside(base,relative){
  const resolved=path.resolve(base,relative.replace(/^\/+/,''));
  assert.ok(resolved.startsWith(base+path.sep),`Asset escaped its declared root: ${relative}`);
  return resolved;
}
const readArtifact=relative=>readFile(inside(dist,relative),'utf8');
const plain=html=>html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')
  .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&micro;/g,'µ').replace(/\s+/g,' ').trim();
const decodeCode=code=>code.replace(/\\u([\da-f]{4})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16)))
  .replace(/\\x([\da-f]{2})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16)));
const [lab,methods,questions,directory,validationText]=await Promise.all([
  readArtifact(`${route}/index.html`),readArtifact(`${route}/methods/index.html`),
  readArtifact(`${route}/questions/index.html`),readArtifact('simulations/index.html'),readArtifact(`${route}/validation.json`)
]);
for(const [label,html] of [['laboratory',lab],['methods',methods],['questions',questions]]){
  assert.ok(/<html\b/i.test(html)&&/<title\b/i.test(html),`${label} route is not an emitted HTML document.`);
  assert.ok(plain(html).length>500,`${label} route has no substantive rendered content.`);
}
assert.ok(directory.includes(`/${route}/`),'The laboratory is absent from the simulations directory.');
for(const suffix of ['methods/','questions/','validation.json'])assert.ok(lab.includes(`/${route}/${suffix}`),`The laboratory does not link to ${suffix}.`);
assert.equal((questions.match(/class="ax-question"/g)||[]).length,scientificQuestions.length,'The built questions page omits registered questions.');
assert.ok(/href="https:\/\//.test(questions),'The questions page lost its source links.');
const published=JSON.parse(validationText);
assert.equal(published.modelVersion,STAGE1_MODEL_VERSION,'Published model version differs from the laboratory.');
assert.equal(published.benchmarkModelVersion,BENCHMARK_MODEL_VERSION,'The motor benchmark version is missing.');
assert.equal(published.completeStage1,true,'Final Stage 1 release gates have not passed. Regenerate frozen evidence, then rebuild.');
assert.equal(published.biologicalValidation,false,'Numerical implementation is not biological validation.');
assert.equal(published.humanSpiralGanglionCalibration,false,'The hypothetical neuron must not claim human SG calibration.');
assert.equal(published.physiologicalDiameterRelationValidated,false,'The unresolved species relation must remain disclosed.');
assert.ok(/conditional/i.test(published.status),'The release status must retain its conditional model boundary.');
assert.ok(/not biological|not.*clinical/i.test(published.completeStage1Meaning),'The completion flag must define its numerical scope.');
assert.ok(Array.isArray(published.limitations)&&published.limitations.length>0,'Published limitations are missing.');
assert.deepEqual(published.missingOrFailingReports,[],'Required evidence is absent or failing.');
assert.deepEqual(published.sourceMismatches,[],'Published source provenance is stale.');
assert.deepEqual(published.evidenceMismatches,[],'Published evidence differs from the verified aggregate.');
const reportFiles={nativeBuild:'native-build-report.json',membrane:'mrg-numerical-report.json',field:'field-validation.json',coupled:'mrg-coupled-report.json',integration:'integration-validation.json',
 bipolar:'bipolar-numerical-report.json',somaSpatial:'bipolar-soma-spatial-report.json',bipolarCoupled:'bipolar-coupled-report.json',
 wellField:'field-stage1-validation.json',denseWells:'field-stage1-dense-validation.json',wellBoundary:'field-stage1-domain-validation.json',
 protocol:'stage1-protocol-validation.json',reproduction:'reproduction-stage1-report.json'};
for(const [key,filename] of Object.entries(reportFiles)){
 assert.ok(published[key],`The validation endpoint omits ${key} evidence.`);
 const current=JSON.parse(await readFile(path.join(root,'docs/axon-interface',filename),'utf8'));
 assert.deepEqual(published[key],current,`Published ${key} evidence is stale. Rebuild after ${filename} is generated.`);
}
const unchanged=value=>Array.isArray(value)?value.length===0:value===false;
async function verifyHashes(report,label){
 assert.ok(report.sourceHashes&&Object.keys(report.sourceHashes).length>0,`${label} source hashes are missing.`);
 assert.ok(unchanged(report.sourceChangedDuringRun),`${label} sources changed during verification.`);
 for(const [relative,expected] of Object.entries(report.sourceHashes)){
  const actual=createHash('sha256').update(await readFile(inside(root,relative))).digest('hex');
  assert.equal(actual,expected,`${label} source changed after verification: ${relative}`);
 }
}
const {membrane,field,coupled,integration,bipolar,somaSpatial,bipolarCoupled,wellField,denseWells,wellBoundary,protocol,reproduction}=published;
assert.equal(membrane.modelVersion,MRG_VERSION,'Published membrane version differs from the bundled solver.');
assert.equal(membrane.summary.requiredFail,0,'A required motor-membrane gate is failing.');
assert.equal(membrane.summary.numericalGatePassed,true,'Motor-membrane numerical verification did not pass.');
assert.equal(membrane.summary.biologicalValidation,false,'Equation verification cannot be published as biological validation.');
assert.equal(membrane.summary.activeSomaValidated,false,'The historical enlarged active-node failure cannot be relabeled validated.');
assert.equal(membrane.summary.publishedDiameterRelationValidated,false,'The species-relation limitation was lost.');
assert.ok(membrane.tests.filter(t=>t.required!==false).length>0&&membrane.tests.filter(t=>t.required!==false).every(t=>t.status==='pass'),'Motor-membrane required rows are absent or failing.');
assert.ok(membrane.retainedFailures.length>0&&membrane.tests.some(t=>t.required===false&&t.status==='fail'),'Retained failed motor studies must remain published.');
assert.ok(Array.isArray(membrane.conductionLiteratureComparison)&&membrane.conductionLiteratureComparison.length>0,'The measured species-relation discrepancy is missing.');
assert.equal(field.modelVersion,FIELD_VERSION,'Published benchmark field version differs from the solver.');
assert.equal(field.status,'pass','The benchmark field report did not pass.');
assert.ok(field.results.length>0&&field.results.every(t=>t.status==='pass'),'Benchmark field rows are absent or failing.');
assert.ok(field.retainedFailures.length>0,'The initial field-refinement failure must remain published.');
assert.equal(coupled.passed,true,'The motor/FEM native comparison did not pass.');
for(const intervention of ['assigned','proximal-silenced','whole-silenced']){
 const row=coupled.rows.find(r=>r.intervention===intervention);
 assert.ok(row&&row.status==='pass'&&row.exactObservationTimestamps===true,`Motor coupled ${intervention} evidence is absent, failing or time-transformed.`);
}
assert.equal(bipolar.modelVersion,BIPOLAR_VERSION,'Bipolar evidence does not describe the emitted morphology.');
assert.equal(bipolar.complete,true,'The bipolar component study is incomplete.');
assert.equal(bipolar.summary.requiredFail,0,'A required bipolar component gate failed.');
assert.equal(bipolar.summary.numericalGatePassed,true,'Bipolar component verification did not pass.');
assert.equal(bipolar.summary.biologicalValidation,false,'Bipolar equations are not biological validation.');
assert.equal(bipolar.supportedSomaSegments,5,'The default five-band approximation lacks component evidence.');
assert.ok(bipolar.tests.some(t=>t.required)&&bipolar.tests.filter(t=>t.required).every(t=>t.status==='pass'),'Bipolar required rows are absent or failing.');
assert.ok(bipolar.nativeComparisons.some(row=>row.id==='soma-only-silenced'),'The independent matched soma-only control is missing.');
assert.ok(bipolar.retainedFailures.some(study=>study.retainedFailedStudy?.some(row=>row.status==='fail')),'The failed coarse time step was discarded.');
assert.ok(bipolar.retainedFailures.some(study=>study.retainedComparisons?.some(row=>!row.passed)),'The failed coarse soma approximation was discarded.');
assert.equal(somaSpatial.complete,true,'The actual-well soma study is incomplete.');
assert.equal(somaSpatial.authoritative,true,'Exploratory soma refinement cannot authorize release.');
assert.equal(somaSpatial.fieldValidated,true,'The soma study lacks current verified field evidence.');
assert.equal(somaSpatial.supportedSomaSegments,5,'The five-band production soma has not met its declared refinement selection.');
const selected=somaSpatial.comparisons.findIndex(row=>row.from===somaSpatial.supportedSomaSegments);
assert.ok(selected>=0&&somaSpatial.comparisons[selected].passed&&somaSpatial.comparisons[selected+1]?.passed,'Two successive supported soma refinements must pass.');
for(const level of somaSpatial.levels)assert.equal(level.cases.length,somaSpatial.acceptance.amplitudeGridUa.length*somaSpatial.acceptance.controls.length,'The soma study omitted an amplitude/intervention.');
assert.equal(bipolarCoupled.passed,true,'The actual-well native/time comparison did not pass.');
assert.equal(bipolarCoupled.fieldValidated,true,'The actual-well comparison used unverified field sources.');
assert.equal(bipolarCoupled.summary.biologicalValidation,false,'Native agreement must not claim biology.');
assert.equal(bipolarCoupled.rows.length,bipolarCoupled.acceptance.nativeAmplitudeGridUa.length*bipolarCoupled.acceptance.controls.length,'A declared native case is absent.');
assert.equal(bipolarCoupled.temporalRows.length,bipolarCoupled.acceptance.temporalAmplitudeGridUa.length*bipolarCoupled.acceptance.controls.length*(bipolarCoupled.acceptance.timeStepsMs.length-1),'A declared temporal comparison is absent.');
for(const row of [...bipolarCoupled.rows,...bipolarCoupled.temporalRows])assert.ok(row.status==='pass'&&row.exactObservationTimestamps===true&&row.identicalCrossingCounts===true,'A coupled reference comparison is failing or uses altered observation times.');
assert.ok(bipolarCoupled.rows.every(row=>row.exactSharedInitialState===true),'Matched native cases do not share the unmodified equilibrium.');
assert.equal(bipolarCoupled.outcomes.length,bipolarCoupled.acceptance.nativeAmplitudeGridUa.length,'Causal outcomes, including negative results, are missing.');
for(const [name,report] of [['well field',wellField],['dense wells',denseWells],['well boundary',wellBoundary]]){
 assert.equal(report.modelVersion,FIELD_STAGE1_VERSION,`${name} describes a different field implementation.`);
 assert.equal(report.status,'pass',`${name} numerical study did not pass.`);
 assert.ok(report.results.length>0&&report.results.every(row=>row.status==='pass'),`${name} contains absent or failed numerical rows.`);
 await verifyHashes(report,name);
}
assert.ok(wellField.sourceHashes['src/lib/axon-interface/vendor/cdt2d.mjs'],'The field meshing dependency is absent from provenance.');
assert.equal(integration.status,'pass','The integration/worker report did not pass.');
assert.equal(integration.summary.failed,0,'Integration includes failed current checks.');
assert.equal(integration.summary.skipped,0,'Required integration checks were skipped.');
assert.ok(integration.summary.passed>0,'Integration has no executed passing checks.');
assert.equal(protocol.status,'pass','The full Stage 1 protocol report did not pass.');
assert.ok(protocol.tests.length>0&&protocol.tests.every(row=>row.status==='pass'),'Protocol conditions include an absent or failed check.');
for(const [name,cohort] of [['small cohort',protocol.smallCohort],['full cohort',protocol.fullCohort]]){
 assert.equal(cohort?.status,'pass',`${name} was not completed successfully.`);
 assert.equal(cohort.auditValid,true,`${name} does not satisfy its matched audit.`);
 assert.equal(cohort.physicalWellCount,cohort.cohortCount,`${name} dropped physical wells.`);
 assert.equal(cohort.resolvedCellChannelPairs,cohort.cohortCount*cohort.channelCount,`${name} omitted driven cells.`);
 assert.equal(cohort.completedInterventionSolves,4*cohort.resolvedCellChannelPairs,`${name} omitted matched interventions.`);
 assert.equal(cohort.noSkippedCells,true,`${name} skipped cells.`);assert.equal(cohort.noSkippedControls,true,`${name} skipped controls.`);
 assert.ok(unchanged(cohort.sourceChangedDuringRun),`${name} sources changed during execution.`);
}
assert.ok(protocol.fullCohort.cohortCount>=200,'The complete Stage 1 release lacks an executed few-hundred-cell protocol.');
assert.equal(reproduction.status,'pass','Full reproduction is not passing. Regenerate on frozen source, then rebuild.');
assert.equal(reproduction.scope,'stage1-complete-numerical-and-integration','Reproduction must include the complete Stage 1 scope.');
assert.ok(['executed','verified-existing-evidence'].includes(reproduction.mode),'The aggregate must disclose whether evidence was regenerated or verified from existing reports.');
assert.equal(reproduction.summary.failed,0,'A required aggregate evidence check failed.');
assert.equal(reproduction.summary.requiredEvidenceCount,12,'The complete evidence set must retain all twelve required components.');
assert.equal(reproduction.evidence.length,12,'Required evidence entries are missing.');
assert.ok(Object.keys(reproduction.frozenAcceptance).length>=8&&Object.values(reproduction.frozenAcceptance).every(row=>row.status==='pass'&&row.sha256===row.expectedSha256),'A frozen acceptance file was changed or omitted.');
for(const entry of reproduction.evidence){
 assert.equal(entry.status,'pass',`Aggregate evidence failed: ${entry.name}`);
 assert.ok(entry.sourceHashCount>0,`Evidence lacks source provenance: ${entry.name}`);
 const reportPath=inside(root,entry.report),bytes=await readFile(reportPath);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.reportSha256,`Evidence changed after aggregate verification: ${entry.report}`);
 assert.ok(entry.measurementCompletedAt,`Evidence lacks its original measurement timestamp: ${entry.name}`);
 const producingCommand=entry.producerCommand??entry.capturedExecution?.arguments;
 assert.ok(Array.isArray(producingCommand)&&producingCommand.length>0,`Evidence lacks a reproducible producer command: ${entry.name}`);
}
if(reproduction.mode==='verified-existing-evidence'){
 assert.equal(reproduction.measurementsRegenerated,false,'Verification of existing evidence must not claim regenerated measurements.');
 assert.deepEqual(reproduction.commandsExecutedThisInvocation,[],'Existing-evidence aggregation must not invent executed study commands.');
 assert.ok(reproduction.evidence.every(entry=>entry.mode==='verified-from-existing'&&entry.executedByThisInvocation===false),'Existing evidence must retain its actual execution provenance.');
}else{
 assert.equal(reproduction.measurementsRegenerated,true,'Executed reproduction must regenerate measurements.');
 assert.ok(reproduction.commandsExecutedThisInvocation.length>=12&&reproduction.commandsExecutedThisInvocation.every(command=>command.status==='pass'),'Executed reproduction contains failed or absent required commands.');
 assert.ok(reproduction.evidence.every(entry=>entry.mode==='executed'&&entry.executedByThisInvocation===true),'Executed evidence must identify this invocation.');
}
for(const script of ['field-validate.mjs','mrg-validate.mjs','mrg-coupled-validate.mjs','bipolar-validate.mjs','field-stage1-validate.mjs','field-stage1-dense-validate.mjs','field-stage1-domain-validate.mjs','bipolar-soma-spatial.mjs','bipolar-coupled-validate.mjs','stage1-protocol-validate.mjs']){
 assert.ok(reproduction.evidence.some(entry=>entry.producerCommand?.some(argument=>path.basename(argument)===script)),`The aggregate omits evidence produced by ${script}.`);
}
for(const name of ['nativeBuild','integration'])assert.ok(reproduction.evidence.some(entry=>entry.name===name&&entry.status==='pass'),`Missing current ${name} evidence.`);
assert.equal(published.nativeBuild.status,'pass','Native mechanisms were not rebuilt on the recorded source.');
// Successful source stability is represented by the empty change list plus
// exact hashes, not by a fabricated passing source-stability stage.
for(const [label,report] of [['native build',published.nativeBuild],['motor membrane',membrane],['motor coupling',coupled],['integration',integration],['bipolar',bipolar],['soma spatial',somaSpatial],['well/native coupling',bipolarCoupled],['protocol',protocol],['reproduction',reproduction]])await verifyHashes(report,label);
assert.ok(reproduction.sourceHashes['src/lib/axon-interface/vendor/cdt2d.mjs'],'Reproduction omits the meshing vendor.');
const labText=plain(lab),methodText=plain(methods);
assert.ok(!methodText.includes('[object Object]'),'The rendered parameter register contains object placeholders.');
assert.ok(/model boundary/i.test(labText)&&/conditional/i.test(labText),'The laboratory lost its conditional model boundary.');
assert.ok(/hypothetical/i.test(methodText)&&/circumferential/i.test(methodText)&&/(?:not|no|un)calibrat|not[^.]{0,60}biological/i.test(methodText),'Methods must disclose hypothetical biology and the unresolved circumferential approximation.');
assert.ok(/original/i.test(methodText)&&/identity|identities/i.test(methodText)&&/resection/i.test(methodText)&&/new E|engineered/i.test(methodText),'Original identities and replacement outputs must remain distinct.');
assert.ok(/Y_original=0|Y_original = 0/.test(published.originalHostEndpoint),'The strict original-host endpoint must follow the complete-resection topology.');
assert.ok(/(?:native\s+NEURON|NEURON[^.]{0,80}own cable solver)/i.test(methodText)&&/independent\s+Python/i.test(methodText),'Independent-reference provenance is missing.');
assert.ok(/ModelDB/i.test(methodText)&&methodText.includes(MRG_SOURCE.commit),'The pinned primary model source must remain visible.');
assert.ok(/diameter relation/i.test(methodText)&&/cat/i.test(methodText)&&/slower/i.test(methodText),'The physiological-calibration discrepancy is missing.');
assert.ok(/retained failures/i.test(methodText)&&/spontaneous/i.test(methodText),'Convergence and active-soma failures must remain visible in methods.');
assert.ok(/µm|micromet(?:er|re)/i.test(labText),'Anatomy must disclose physical units.');
const component=lab.match(/component-url="(\/_astro\/AxonInterfaceLaboratory\.[^"\s]+\.js)"/)?.[1];
assert.ok(component,'The laboratory hydration component is not emitted.');
const visited=new Set(),chunks=[];
async function inspectModule(asset){
  if(visited.has(asset))return;visited.add(asset);
  const code=await readArtifact(asset);chunks.push(code);
  const imports=[...code.matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?)["'](\.\/[^"']+\.js)["']/g)].map(m=>m[1]);
  for(const spec of new Set(imports))await inspectModule(path.posix.normalize(path.posix.join(path.posix.dirname(asset),spec)));
}
await inspectModule(component);
const javascript=decodeCode(chunks.join('\n'));
assert.ok(/stored membrane voltage|saved.*voltages/i.test(javascript)&&/replay/i.test(javascript),'Saved-voltage replay disclosure is missing from the emitted client.');
assert.ok(/physical scale|cells, wells & contacts/i.test(javascript)&&/×1/.test(javascript),'Actual bipolar well/cell scale disclosure is missing.');
assert.ok(/Central soma.band|central soma.band/i.test(javascript),'A local soma band must not be labeled as the whole-body mean.');
assert.ok(/threshold crossing/i.test(javascript)&&/source of depolarization/i.test(javascript),'First crossing must not be presented as causal localization.');
assert.ok(/full modeled cable|full modelled cable/i.test(javascript)&&/Central 2\.4 mm window/i.test(javascript),'Anatomy and full-cable replay require distinct extent labels.');
assert.ok(/Color saturation only/i.test(javascript)&&/milliseconds|\bms\b/i.test(javascript),'Replay must distinguish electrical time and color saturation from solver clipping.');
const workers=[...new Set([...javascript.matchAll(/["'](\/_astro\/[^"']*worker[^"']*\.js)["']/gi)].map(m=>m[1]))];
assert.ok(workers.length>0,'No emitted worker asset is referenced by the laboratory.');
assert.ok(!/new Worker\([^)]*["'](?:data:|blob:)/i.test(javascript),'The worker must be a normal published JavaScript asset.');
for(const worker of workers){
  const workerPath=inside(dist,worker),info=await stat(workerPath),code=await readArtifact(worker);
  assert.ok(info.size>1000&&!/^\s*<(?:!doctype|html)/i.test(code),`${worker} is not a JavaScript numerical worker.`);
  for(const version of [STAGE1_MODEL_VERSION,BENCHMARK_MODEL_VERSION,BIPOLAR_VERSION,MRG_VERSION,FIELD_VERSION,FIELD_STAGE1_VERSION])assert.ok(code.includes(version),`${worker} is missing ${version}.`);
  assert.ok(/onmessage/.test(code)&&/postMessage/.test(code),`${worker} lacks the worker message contract.`);
  const syntax=spawnSync(process.execPath,['--check',workerPath],{encoding:'utf8'});
  assert.equal(syntax.status,0,`${worker} cannot be parsed as JavaScript: ${syntax.stderr}`);
}
console.log(`Axon-interface build checks passed: laboratory, methods, ${scientificQuestions.length} questions, current motor/bipolar/well/reference/full-cohort evidence, frozen source hashes, scientific boundaries, anatomy/replay disclosures and ${workers.length} emitted worker asset.`);
