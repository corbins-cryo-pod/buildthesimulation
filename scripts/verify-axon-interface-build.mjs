/** Verify the emitted site, current evidence, disclosed boundaries and worker. */
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {MODEL_VERSION} from '../src/lib/axon-interface/settings.mjs';
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
assert.equal(published.modelVersion,MODEL_VERSION,'Published model version differs from the laboratory.');
assert.equal(published.completeStage1,false,'This release must not claim complete biological Stage 1.');
assert.equal(published.physiologicalDiameterRelationValidated,false,'The unresolved physiological relation must remain disclosed.');
assert.ok(/development/i.test(published.status),'The published status must retain its development boundary.');
assert.ok(Array.isArray(published.limitations)&&published.limitations.length>0,'Published limitations are missing.');
const reportFiles={membrane:'mrg-numerical-report.json',field:'field-validation.json',coupled:'mrg-coupled-report.json',integration:'integration-validation.json',reproduction:'reproduction-report.json'};
for(const [key,filename] of Object.entries(reportFiles)){
  assert.ok(published[key],`The validation endpoint omits ${key} evidence.`);
  const current=JSON.parse(await readFile(path.join(root,'docs/axon-interface',filename),'utf8'));
  assert.ok(JSON.stringify(published[key])===JSON.stringify(current),`Published ${key} evidence is stale. Rebuild after the final ${filename} is generated.`);
}
const {membrane,field,coupled,integration,reproduction}=published;
assert.equal(membrane.modelVersion,MRG_VERSION,'Published membrane version differs from the bundled solver.');
assert.equal(membrane.summary.requiredFail,0,'A required membrane gate is failing.');
assert.equal(membrane.summary.numericalGatePassed,true,'Membrane numerical verification did not pass.');
assert.equal(membrane.summary.biologicalValidation,false,'Equation verification cannot be published as biological validation.');
assert.equal(membrane.summary.activeSomaValidated,false,'The failed active-soma model cannot be relabeled validated.');
assert.equal(membrane.summary.publishedDiameterRelationValidated,false,'The species-relation limitation was lost.');
assert.ok(membrane.tests.some(t=>t.required!==false)&&membrane.tests.filter(t=>t.required!==false).every(t=>t.status==='pass'),'Membrane required rows are absent or failing.');
assert.ok(membrane.retainedFailures.length>0&&membrane.tests.some(t=>t.required===false&&t.status==='fail'),'Retained failed membrane studies must remain published.');
assert.ok(Array.isArray(membrane.conductionLiteratureComparison)&&membrane.conductionLiteratureComparison.length>0,'The measured species-relation discrepancy is missing.');
assert.equal(field.modelVersion,FIELD_VERSION,'Published field version differs from the bundled solver.');
assert.equal(field.status,'pass','The field report did not pass.');
assert.ok(field.results.length>0&&field.results.every(t=>t.status==='pass'),'The field report has missing or failed current rows.');
assert.ok(field.retainedFailures.length>0,'The initial field-refinement failure must remain published.');
assert.equal(coupled.passed,true,'The production FEM/native NEURON comparison did not pass.');
for(const intervention of ['assigned','proximal-silenced','whole-silenced']){
  const row=coupled.rows.find(r=>r.intervention===intervention);
  assert.ok(row&&row.status==='pass'&&row.exactObservationTimestamps===true,`Coupled ${intervention} evidence is missing, failing or uses transformed timestamps.`);
}
assert.equal(integration.status,'pass','The integration/worker report did not pass.');
assert.equal(integration.summary.failed,0,'Integration includes failed current checks.');
assert.equal(integration.summary.skipped,0,'Required integration checks were skipped.');
assert.ok(integration.summary.passed>0,'Integration evidence has no executed passing checks.');
assert.equal(reproduction.status,'pass','Full reproduction is not passing. Regenerate on frozen source, then rebuild.');
assert.equal(reproduction.scope,'full-numerical-and-integration','Reproduction must include both independent numerical references and integration.');
assert.equal(reproduction.acceptanceChanged,false,'The reproduction reports changed acceptance criteria.');
assert.deepEqual(reproduction.sourceChangedDuringRun,[],'Source changed during the published reproduction.');
assert.ok(reproduction.stages.length>0&&reproduction.stages.every(s=>s.status==='pass'),'Reproduction contains a failed or unexecuted stage.');
// A separate source-stability stage is emitted only on failure. Successful
// stability is established by the empty change list and exact hashes.
for(const name of ['native-mechanism-build','field-numerical-studies','mrg-numerical-studies','coupled-fem-neuron-reference','integration-tests'])assert.ok(reproduction.stages.some(s=>s.name===name&&s.status==='pass'),`Reproduction omits ${name}.`);
assert.ok(Object.keys(reproduction.sourceHashes).length>0,'Reproduction source hashes are missing.');
for(const [relative,expected] of Object.entries(reproduction.sourceHashes)){
  const actual=createHash('sha256').update(await readFile(inside(root,relative))).digest('hex');
  assert.equal(actual,expected,`Numerical source changed after reproduction: ${relative}`);
}
const labText=plain(lab),methodText=plain(methods);
assert.ok(!methodText.includes('[object Object]'),'The rendered parameter register contains object placeholders.');
assert.ok(/model boundary/i.test(labText)&&/development/i.test(labText),'The laboratory lost its model/development boundary.');
assert.ok(/Stage\s*1[^.]{0,180}(?:not yet|not established|incomplete|unmet)/i.test(methodText),'Methods must explain that complete Stage 1 remains unmet.');
assert.ok(/original.host[^.]{0,150}not modeled|original.host ratio is not modeled/i.test(methodText),'Original-host addressability must remain distinct from calculated outputs.');
assert.ok(/(?:native\s+NEURON|NEURON[^.]{0,80}own cable solver)/i.test(methodText)&&/independent\s+Python/i.test(methodText),'Independent-reference provenance is missing.');
assert.ok(/ModelDB/i.test(methodText)&&methodText.includes(MRG_SOURCE.commit),'The pinned primary model source must remain visible.');
assert.ok(/diameter relation/i.test(methodText)&&/cat/i.test(methodText)&&/slower/i.test(methodText),'The physiological-calibration discrepancy is missing.');
assert.ok(/retained failures/i.test(methodText)&&/spontaneous/i.test(methodText),'Convergence and active-soma failures must remain visible in methods.');
assert.ok(/µm|micromet(?:er|re)/i.test(labText)&&/markers\s*×\s*2/i.test(labText),'Anatomy must disclose physical units and marker enlargement.');
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
assert.ok(/saved nodal voltages|stored nodal voltage/i.test(javascript)&&/replay/i.test(javascript),'Saved-voltage replay disclosure is missing from the emitted client.');
assert.ok(/full modeled cable|full modelled cable/i.test(javascript)&&/Central 2\.4 mm window/i.test(javascript),'Anatomy and full-cable replay require distinct extent labels.');
assert.ok(/Color saturation only/i.test(javascript)&&/milliseconds|\bms\b/i.test(javascript),'Replay must distinguish electrical time and color saturation from solver clipping.');
const workers=[...new Set([...javascript.matchAll(/["'](\/_astro\/[^"']*worker[^"']*\.js)["']/gi)].map(m=>m[1]))];
assert.ok(workers.length>0,'No emitted worker asset is referenced by the laboratory.');
assert.ok(!/new Worker\([^)]*["'](?:data:|blob:)/i.test(javascript),'The worker must be a normal published JavaScript asset.');
for(const worker of workers){
  const workerPath=inside(dist,worker),info=await stat(workerPath),code=await readArtifact(worker);
  assert.ok(info.size>1000&&!/^\s*<(?:!doctype|html)/i.test(code),`${worker} is not a JavaScript numerical worker.`);
  for(const version of [MODEL_VERSION,MRG_VERSION,FIELD_VERSION])assert.ok(code.includes(version),`${worker} is missing ${version}.`);
  assert.ok(/onmessage/.test(code)&&/postMessage/.test(code),`${worker} lacks the worker message contract.`);
  const syntax=spawnSync(process.execPath,['--check',workerPath],{encoding:'utf8'});
  assert.equal(syntax.status,0,`${worker} cannot be parsed as JavaScript: ${syntax.stderr}`);
}
console.log(`Axon-interface build checks passed: laboratory, methods, ${scientificQuestions.length} questions, current numerical/coupled/integration/reproduction reports, frozen source hashes, scientific boundaries, anatomy/replay disclosures and ${workers.length} emitted worker asset.`);
