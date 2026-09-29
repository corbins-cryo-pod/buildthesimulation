import assert from 'node:assert/strict';
import {createEngine} from '../public/scripts/cortex-v2/engine.js';
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
