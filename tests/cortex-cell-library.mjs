import { extraRates } from '../src/lib/cortex/extra-channels.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { modelRegistry, eligibleModels } from '../src/lib/cortex/model-registry.js';
import { loadActiveModels, loadActiveModel, getActiveModel } from '../src/lib/cortex/model-library.js';
import { freshActiveConfig, validateConfig } from '../src/lib/cortex/config.js';
import { populationModels, populationCapacity, freshPopulation } from '../src/lib/cortex/population.js';
import { runExperiment } from '../src/lib/cortex/experiment.js';
const asset=path=>readFile(new URL('../public'+path,import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
await loadActiveModels(modelRegistry.map(m=>m.id),40,asset);

test('library has distinct published identities, actual source classes, datasets and atlas overlap',async()=>{
  assert.equal(modelRegistry.length,16);
  assert.equal(new Set(modelRegistry.map(m=>m.specimenId)).size,16);
  assert.equal(eligibleModels({cellClass:'excitatory'}).length,10);
  assert.equal(eligibleModels({cellClass:'inhibitory'}).length,6);
  assert.equal(eligibleModels({dataset:'human-epilepsy'}).length,2);
  assert.deepEqual(eligibleModels({atlasOnly:true}).map(m=>m.specimenId),[508378649]);
  await assert.rejects(loadActiveModel('invented/1',40,asset),/Unknown/);
  for(const entry of modelRegistry){
    const model=getActiveModel(entry.id), base=entry.dataset==='human-epilepsy'?'human-epilepsy':entry.specimenId===571654895?'allen571654895':'human-eap';
    const raw=await asset(`/models/cortex/${base}/${entry.specimenId}.swc`);
    assert.equal(hash(raw),model.sourceHashes[`${entry.specimenId}.swc`]);
    const c=freshActiveConfig();c.neuron.modelId=entry.id;c.membrane.sourceModelId=entry.id;
    assert.equal(validateConfig(c).neuron.modelId,entry.id);
    assert.equal(model.variants['40'].length,entry.nodes['40']);
    const generator=entry.specimenId===571654895?'cortex-active-model.py':entry.dataset==='human-eap'?'cortex-cell-library-model.py':'cortex-epilepsy-library-model.py';
    assert.equal(model.generatorSha256,hash(readFileSync(new URL('../scripts/'+generator,import.meta.url))));
    if(entry.id!==getActiveModel().id) assert.notEqual(model.fit,getActiveModel().fit,'Each cell owns its published fit');
  }
});

test('source-specific Kv2like behavior preserves the original guard difference',()=>{
  assert.equal(extraRates(-150,true)[5][1],.001);
  assert.ok(extraRates(-150,false)[5][1]<0);
});

test('population selection never duplicates target or specimens and conditioning cost covers every cell',()=>{
  const c=freshActiveConfig(),s=freshPopulation(),pool=populationModels(c,s),capacity=populationCapacity(c,s);
  assert.equal(new Set(pool.map(m=>m.specimenId)).size,pool.length);
  const inhibitory=populationModels(c,{...s,cellClass:'inhibitory'});
  assert.equal(inhibitory.length,7); // selected excitatory target plus six inhibitors
  assert.ok(inhibitory.slice(1).every(m=>m.class==='inhibitory'));
  c.neuron.modelId=inhibitory[1].id;c.membrane.sourceModelId=c.neuron.modelId;
  assert.equal(populationModels(c,{cellClass:'inhibitory'}).length,6);
  assert.equal(capacity.maxCells,16);
  c.solver.durationMs=1000;c.protocol.durationMs=500;c.solver.sampleMs=.5;
  assert.ok(populationCapacity(c,s).maxCells<16);
});

for(const dataset of ['human-eap','human-epilepsy']) {
  const fixture=JSON.parse(readFileSync(new URL(`./fixtures/cortex-library-${dataset}.json`,import.meta.url)));
  test(`${dataset}: independent reference provenance matches retained generators`,()=>{
    assert.equal(fixture.generatorSha256,hash(readFileSync(new URL('../scripts/cortex-library-native-reference.py',import.meta.url))));
    const generator=dataset==='human-eap'?'cortex-cell-library-model.py':'cortex-epilepsy-library-model.py';
    assert.equal(fixture.modelGeneratorSha256,hash(readFileSync(new URL('../scripts/'+generator,import.meta.url))));
  });
  for(const ref of fixture.cases) test(`${ref.id}: own fitted cell agrees with native NEURON`,()=>{
    const result=runExperiment(ref.config),n=result.diagnostics.compartments;
    let square=0,maximum=0,count=0;
    for(let frame=0;frame<ref.somaVoltageMv.length;frame++) {
      const error=result.membraneMv[frame*n+result.somaIndex]-ref.somaVoltageMv[frame];
      square+=error*error;maximum=Math.max(maximum,Math.abs(error));count++;
    }
    for(const sample of ref.snapshots) for(const [j,i] of ref.physicalIndices.entries()) {
      const error=result.membraneMv[sample.frame*n+i]-sample.voltageMv[j];
      square+=error*error;maximum=Math.max(maximum,Math.abs(error));count++;
    }
    assert.ok(Math.sqrt(square/count)<.1,`RMS ${Math.sqrt(square/count)} mV`);
    assert.ok(maximum<1,`Peak ${maximum} mV`);
    assert.equal(result.spikes.length,ref.spikeTimesMs.length);
    result.spikes.forEach((spike,i)=>assert.ok(Math.abs(spike.timeMs-ref.spikeTimesMs[i])<.1));
    assert.equal(result.initialization.startMv,dataset==='human-eap'?-80:-78);
  });
}
