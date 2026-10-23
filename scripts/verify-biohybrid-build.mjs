/** Verify the actual published routes, linked assets and scientific disclosures. */
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {BIOHYBRID_QUESTIONS} from '../src/lib/biohybrid/questions.js';
import {MODEL_VERSION,OBSERVATION_VERSION} from '../src/lib/biohybrid/model.js';
import {PROTOCOL_VERSION} from '../src/lib/biohybrid/protocols.js';

const read=path=>readFile(new URL(`../dist/${path}`,import.meta.url),'utf8');
const lab=await read('simulations/biohybrid-interface/index.html');
const methods=await read('simulations/biohybrid-interface/methods/index.html');
const questions=await read('simulations/biohybrid-interface/questions/index.html');
const directory=await read('simulations/index.html');
const search=await read('search-index.json');
for(const text of ['Controlled experiments','Signal sources','34 crucial questions','Load mixed-activation example'])assert.ok(lab.includes(text),`Laboratory missing ${text}`);
assert.ok(methods.includes('Retained failed supplemental diagnostic'),'Methods must retain the failed storage-precision diagnostic');
assert.ok(methods.includes('Float64')&&methods.includes('Float32'),'Methods must distinguish recording and replay precision');
assert.ok(methods.includes('0.001273'),'Methods must show the actual failed diagnostic, not only a pass summary');
assert.ok(methods.includes('native NEURON'),'Methods must name the independently executed reference');
assert.ok(methods.includes('signed differences')&&methods.includes('negative physical conduction time'),'Methods must distinguish first-event order from physical propagation');
assert.ok(methods.includes('successfulTransmission')&&methods.includes('Neither field alone establishes synaptic dependence'),'Legacy temporal metrics need an explicit causal interpretation limit');
assert.ok(methods.includes('shared graft/host axon-diameter'),'Diameter studies must disclose both affected populations');
assert.ok(methods.includes('Two original exact-literal regression comparisons failed'),'The cross-runtime exact-literal failure must remain visible');
assert.equal(BIOHYBRID_QUESTIONS.length,34);
for(const question of BIOHYBRID_QUESTIONS){
 assert.ok(questions.includes(`id="${question.id}"`),`Question ${question.id} not emitted`);
 assert.ok(question.sources.every(source=>/^https:\/\//.test(source.url)||source.url==='/simulations/biohybrid-interface/methods/'),`Question ${question.id} has an unsupported source URL`);
}
assert.ok(directory.includes('/simulations/biohybrid-interface/'),'Laboratory missing from directory');
assert.ok(search.includes('/simulations/biohybrid-interface/questions/'),'Questions missing from search index');
const component=lab.match(/component-url="(\/_astro\/BiohybridLaboratory\.[^"\s]+\.js)"/)?.[1];
assert.ok(component,'Built laboratory component URL not found');
const visited=new Set();
const chunks=[];
async function inspectModule(path){
 if(visited.has(path))return;visited.add(path);
 const code=await read(path);chunks.push(code);
 for(const match of code.matchAll(/(?:from|import)\s*[\"'](\.\/[^\"']+\.js)[\"']/g))await inspectModule(`_astro/${match[1].slice(2)}`);
}
await inspectModule(component.slice(1));
const javascript=chunks.join('\n');
const workerNames=[...new Set([...javascript.matchAll(/(?:protocol-)?worker-[A-Za-z0-9_-]+\.js/g)].map(match=>match[0]))];
assert.equal(workerNames.length,2,'Both numerical and protocol worker bundles must be linked');
for(const worker of workerNames){
 const code=await read(`_astro/${worker}`);
 assert.ok(code.includes(MODEL_VERSION)&&code.includes(OBSERVATION_VERSION),`${worker}: scientific versions not bundled`);
 if(worker.startsWith('protocol-'))assert.ok(code.includes(PROTOCOL_VERSION),'Protocol schema missing from worker');
}
try{await access(new URL('../dist/__biohybrid-stage2-mobile-qa.html',import.meta.url));assert.fail('Temporary mobile QA page must not be published');}catch(error){if(error.code!=='ENOENT')throw error;}
console.log(`Biohybrid build checks passed: laboratory, Methods, ${BIOHYBRID_QUESTIONS.length} questions, directory/search, ${workerNames.join(', ')}; retained precision failure visible.`);
