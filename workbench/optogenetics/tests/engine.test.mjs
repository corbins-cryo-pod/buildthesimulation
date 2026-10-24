import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DEFAULT_CONFIG,runExperiment} from '../src/simulation.js';
const model=JSON.parse(fs.readFileSync(new URL('../data/cell-data.json',import.meta.url)));
const reports=[];
const small={...DEFAULT_CONFIG,protocol:'single',onsetMs:20,durationMs:80,dtMs:.01};
function run(name,config){const r=runExperiment(model,config);assert.ok(r.somaVoltageMv.every(Number.isFinite));assert.ok(r.diagnostics.maximumKclResidualNa<1e-8);reports.push({name,config:r.config,spikes:r.spikes,metrics:r.pulseMetrics,diagnostics:r.diagnostics});fs.writeFileSync(new URL('../validation/current-engine-checks.json',import.meta.url),JSON.stringify(reports,null,2));return r;}
test('full 250 ms default train: three distinct events and exact protocol dose',()=>{const r=run('Default train, current 0.005 ms timestep',DEFAULT_CONFIG);assert.equal(r.spikes.length,3);assert.equal(r.pulseMetrics.exactlyOnePulses,3);assert.equal(r.pulseMetrics.extraEvents,0);assert.equal(r.diagnostics.photonDoseScaleMs,15);assert.equal(r.localDoseUjMm2[r.somaIndex],15);});
let dark,negative;
test('zero-light control: no spikes, no current, resting voltage retained',()=>{dark=run('Zero light', {...small,light:{...DEFAULT_CONFIG.light,irradianceMwMm2:0}});assert.equal(dark.spikes.length,0);assert.ok(dark.photocurrentNa.every(x=>x===0));});
test('zero-expression control: same membrane trajectory as zero light',()=>{negative=run('Zero opsin expression',{...small,conductanceDensityScm2:0});assert.equal(negative.spikes.length,0);assert.ok(negative.photocurrentNa.every(x=>x===0));assert.deepEqual(negative.somaVoltageMv,dark.somaVoltageMv);assert.equal(negative.lightMwMm2[negative.somaIndex],1);});
test('single pulse and repeated runs are deterministic, including cached dark conditioning',()=>{const a=run('Single pulse',small),b=run('Deterministic repeat',small);assert.equal(a.spikes.length,1);assert.deepEqual(a.spikes,b.spikes);assert.deepEqual(a.somaVoltageMv,b.somaVoltageMv);assert.equal(b.diagnostics.conditioning,'reused identical state');});
test('fiber movement updates local exposure and actual computed currents',()=>{
 const light={...DEFAULT_CONFIG.light,kind:'fiber',powerMw:.05,positionUm:[-108,-90,51]};
 const a=run('Fiber toward soma',{...small,light});
 const b=run('Moved fiber',{...small,light:{...light,positionUm:[-500,-90,51]}});
 assert.notEqual(a.lightMwMm2[a.somaIndex],b.lightMwMm2[b.somaIndex]);assert.notDeepEqual(a.totalPhotocurrentNa,b.totalPhotocurrentNa);
 assert.equal(a.diagnostics.sourceEnergyUj,.25);
});
test('apical expression: nonexpressing soma has no photocurrent but can have membrane response',()=>{const a=run('Apical expression',{...small,expression:'apical'});for(let k=0;k<a.frames;k++)assert.equal(a.photocurrentNa[k*a.n+a.somaIndex],0);assert.ok(a.totalPhotocurrentNa.some(x=>x<0));});
test('ideal clamp: exact holding voltage and complete state trajectories',()=>{const a=run('Paired-pulse clamp',{...small,mode:'clamp',protocol:'paired',pulseWidthMs:5,pairGapMs:20,clampMv:-60});assert.equal(a.n,1);assert.equal(a.spikes.length,0);assert.ok(a.somaVoltageMv.every(v=>v===-60));assert.equal(a.opsinStates.length,a.frames*5);for(let k=0;k<a.frames;k++){const j=5*k;assert.ok(Math.abs(a.opsinStates[j]+a.opsinStates[j+1]+a.opsinStates[j+2]+a.opsinStates[j+3]-1)<1e-12);}});
test('unsupported section and excessive local exposure fail rather than silently substituting a model',()=>{assert.throws(()=>runExperiment(model,{...small,expression:'section',expressionSectionId:'absent'}));assert.throws(()=>runExperiment(model,{...small,light:{...DEFAULT_CONFIG.light,kind:'fiber',positionUm:[-.001,0,0],powerMw:1}}));});
