import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {publishedStage2} from '../src/lib/axon-interface-stage2-publication.mjs';
import {VERSION} from '../src/lib/axon-interface/stage2/settings.mjs';

const directory='dist/simulations/biohybrid-axon-interface/stage2';
const expected=publishedStage2();
const raw=JSON.parse(fs.readFileSync('docs/axon-interface/stage2/validation.json'));
const actual=JSON.parse(fs.readFileSync(`${directory}/validation.json`));
assert.deepEqual(actual,expected,'Built evidence must match the current publication verification.');
assert.equal(actual.modelVersion,VERSION,'Built evidence must identify the current runtime.');
if(raw.completeStage2)assert.equal(actual.completeStage2,true,'A claimed release has changed or missing evidence.');
const laboratory=fs.readFileSync(`${directory}/index.html`,'utf8');
const methods=fs.readFileSync(`${directory}/methods/index.html`,'utf8');
assert.ok(laboratory.includes(expected.completeStage2?'Numerical Stage 2 complete.':'Development checkpoint.'));
assert.ok(methods.includes(expected.completeStage2?'Numerical Stage 2 release gates passed.':'Stage 2 release gates remain open.'));
assert.ok(fs.existsSync(`${directory}/questions/index.html`));
const client=laboratory.match(/component-url="(\/_astro\/AxonStage2Laboratory\.[^"]+\.js)"/)?.[1];
assert.ok(client,'Stage 2 hydration component is absent.');
const code=fs.readFileSync(path.join('dist',client),'utf8');
const workers=[...code.matchAll(/["'](\/_astro\/[^"']*worker[^"']*\.js)["']/gi)].map(m=>m[1]);
assert.ok(workers.length,'Stage 2 numerical worker is absent.');
for(const asset of workers){
  const worker=fs.readFileSync(path.join('dist',asset),'utf8');
  assert.ok(worker.includes(VERSION),'Emitted worker has the wrong model version.');
  assert.ok(worker.includes('postMessage')&&worker.includes('onmessage'));
}
console.log(`Stage 2 build verified: current evidence, release label, methods, questions and ${workers.length} numerical worker.`);
