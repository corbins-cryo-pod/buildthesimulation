import assert from 'node:assert/strict';
import {generateSites,evaluate,initialState,validateState} from '../public/scripts/nerve/model.js';
import {createEngine} from '../public/scripts/cortex-v2/engine.js';
const sites=generateSites(),s=initialState();
assert.deepEqual(sites,generateSites());
const zero=evaluate(sites,s.electrodes,0,s.spread,s.threshold,s.target);assert.equal(zero.total,0);
let previous=0;for(let a=0;a<=150;a+=5){const r=evaluate(sites,s.electrodes,a,s.spread,s.threshold,0);assert(r.total>=previous);previous=r.total;}
const focused=evaluate(sites,s.electrodes,s.amplitude,s.spread,s.threshold,0);assert(focused.target>focused.off);
assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))),s);
assert.throws(()=>validateState({...s,spread:0}));assert.throws(()=>validateState({...s,electrodes:[{x:Infinity,y:0}]}));
const cfg={seed:1337,nNeurons:20,bounds:{min:[-100,-100,0],max:[100,100,200]},sampleRateHz:8000,traceWindowS:2,baseUv:1800,r0Um:45,noiseUv:0,burstSeedProb:0,recruitRadiusUm:80,modStrength:0};
const a=createEngine({...cfg}),b=createEngine({...cfg}),els=[{x:0,y:0,z:100},{x:1000,y:1000,z:1400}];
for(let i=0;i<300;i++){a.step(4,els);b.step(4,els);}
assert.deepEqual(a.state.tracesByElectrode,b.state.tracesByElectrode);
assert(a.state.tracesByElectrode.every(t=>t.length===16000&&t.every(Number.isFinite)));
assert(a.state.detectedSpikes.some(s=>s.electrodeIndex===0));assert(!a.state.detectedSpikes.some(s=>s.electrodeIndex===1));
a.clearRecording();assert.equal(a.state.detectedSpikes.length,0);a.step(4,[els[0]]);assert.equal(a.state.tracesByElectrode.length,1);
// A spike near the end of a 4 ms block must retain its waveform in the next block.
const e=createEngine({...cfg,nNeurons:1});e.state.neurons[0].hz=1e8;e.step(4,[els[0]]);e.state.neurons[0].hz=0;e.step(4,[els[0]]);
assert(e.state.tracesByElectrode[0].slice(-32).some(v=>v!==0));
console.log('Simulation model checks passed.');
