import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {assessExperimentEvidence,evidenceRegistry} from '../src/lib/cortex/experiment-evidence.js';
import {finiteCellConfig} from '../src/lib/cortex/finite-contact.js';
import {loadActiveModel} from '../src/lib/cortex/model-library.js';
const model={model:'cortex-finite-disk/1',packageSha256:evidenceRegistry.fieldSha256,centerUm:[0,0,1000],normal:[0,0,1]};
test('the actual default finite workspace resolves to its matched reference case',async()=>{
  await loadActiveModel(evidenceRegistry.model,40,p=>readFile(new URL('../public'+p,import.meta.url)));
  const config=finiteCellConfig(evidenceRegistry.model,40);
  assert.equal(assessExperimentEvidence(config,model).matchedCaseStatus,'pass');
});
test('evidence matches exact experiment and rejects changed forcing, geometry and field provenance',()=>{
  const row=evidenceRegistry.cases.find(c=>c.config.protocol.amplitudeUa===1);
  assert.ok(row);
  const c=structuredClone(row.config),before=JSON.stringify(c);
  assert.equal(assessExperimentEvidence(c,model).matchedCaseId,row.id);
  assert.equal(JSON.stringify(c),before,'evidence assessment must not mutate simulation configuration');
  for(const edit of [c=>c.neuron.somaUm[2]++,c=>c.protocol.amplitudeUa+=.123,c=>c.protocol.phaseUs++,c=>c.solver.settleMs++,c=>c.tissue.conductivitySPerM=.4]){
    const modified=structuredClone(c);edit(modified);assert.equal(assessExperimentEvidence(modified,model).matchedCaseStatus,'not-assessed');
  }
  assert.equal(assessExperimentEvidence(c,{...model,packageSha256:'wrong'}).matchedCaseStatus,'not-assessed');
  assert.equal(assessExperimentEvidence(c,{...model,centerUm:[0,0,1001]}).matchedCaseStatus,'not-assessed');
  assert.equal(assessExperimentEvidence(c,model,false).matchedCaseStatus,'not-assessed');
  assert.match(assessExperimentEvidence(c,model).biological,/Not validated/);
});
test('published evidence fingerprints match source and report files',async()=>{
  for(const [path,expected]of Object.entries({...evidenceRegistry.sourceHashes,...evidenceRegistry.reportHashes})){
    const bytes=await readFile(new URL('../'+path,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,`Stale evidence: ${path}; rerun the affected scientific study before updating the registry.`);
  }
});
test('reported scientific statuses follow declared gates and preserve initial field failures',async()=>{
  const native=JSON.parse(await readFile(new URL('../docs/cortex/finite-native-comparison.json',import.meta.url)));
  for(const row of native.cases){
    const pass=row.crossingClassificationMatch&&row.maxSomaErrorMv<=native.gates.somaWaveformMaxMv&&row.maxMembraneErrorMv<=native.gates.allMembraneWaveformMaxMv&&(row.maxSharedCrossingTimeErrorMs===null||row.maxSharedCrossingTimeErrorMs<=native.gates.crossingTimeMaxMs);
    assert.equal(row.status,pass?'pass':'fail');
  }
  const field=JSON.parse(await readFile(new URL('../docs/cortex/gallery-independent-comparison.json',import.meta.url)));
  assert.equal(Object.keys(field.initialStudy).length,4);
  assert.ok(Object.values(field.initialStudy).some(v=>v.status==='fail'));
  for(const row of Object.values(field.shapes)){
    const checks=[row.meshChange,row.domainChange,row.bemDifference,...(row.analyticalDiskDifference?[row.analyticalDiskDifference]:[])];
    assert.equal(row.status,checks.every(r=>r.potential<=field.gates.potential&&r.field<=field.gates.field)?'pass':'fail');
  }
});
