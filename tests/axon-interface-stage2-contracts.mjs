import test from 'node:test';import assert from 'node:assert/strict';
import {DEFAULTS,normalize,budget} from '../src/lib/axon-interface/stage2/settings.mjs';
import {createBipolarMorphology} from '../src/lib/axon-interface/bipolar.mjs';
import {createStage1Cohort} from '../src/lib/axon-interface/identities.mjs';
import {simulateCable as old} from '../src/lib/axon-interface/mrg.mjs';
import {simulateCable} from '../src/lib/axon-interface/stage2/membrane.mjs';
import {createPhotocurrent} from '../src/lib/axon-interface/stage2/photocurrent.mjs';
import {surfaceScene,surfaceTransport,boundedMean} from '../src/lib/axon-interface/stage2/optical-surface.mjs';
import {embeddedCoil,coilSlew} from '../src/lib/axon-interface/stage2/magnetic-coupling.mjs';
import {qualifySelectivity} from '../src/lib/axon-interface/stage2/causal-selectivity.mjs';
import {exportCsv} from '../src/lib/axon-interface/stage2/exports.mjs';
const {anatomy}=normalize({axonCount:4}),m=createBipolarMorphology(anatomy),g=createStage1Cohort(anatomy);
test('Malformed settings, unsupported pulse timing and unsafe work never silently repair',()=>{
 for(const input of [null,[],{bogus:1},{amplitudes:[0,NaN]},{amplitudes:[0,0]},{amplitudes:[.1,0]},{dtMs:.01},{photons:1},{axonCount:1,channelCount:2},{opticalPulseMs:.1001},{wellApertureRadiusUm:2}])assert.throws(()=>normalize(input));
 const s=normalize({axonCount:16,channelCount:4}).settings;assert.throws(()=>budget(s,m),/budget exceeded/);
 assert.doesNotThrow(()=>budget(normalize({axonCount:4,channelCount:4,amplitudes:[0,.001,.002]}).settings,m));
});
test('Normalization is immutable and cannot relabel a completed grid',()=>{const input={amplitudes:[0,.001]},s=normalize(input).settings;input.amplitudes[1]=.002;assert.equal(s.amplitudes[1],.001);assert.ok(Object.isFrozen(s)&&Object.isFrozen(s.amplitudes));});
test('No mechanism exactly preserves Stage 1 voltages, membrane currents and state',()=>{
 const options={morphology:m,durationMs:.1,saveCurrents:true},a=old(options),b=simulateCable(options);
 for(const key of Object.keys(a).filter(k=>k!=='diagnostics'&&k!=='version'&&k!=='modelVersion'))assert.deepEqual(b[key],a[key],key);
});
test('An outward transmembrane current changes the membrane, and an opsin block preserves photons',()=>{
 const fluence=m.compartments.map(c=>c.kind==='SOMA'?5:0),active=createPhotocurrent(m,{fluencePerMw:fluence,emittedMw:1}),blocked=createPhotocurrent(m,{fluencePerMw:fluence,emittedMw:1,blocked:true}),v=m.compartments.map(()=>-80);
 for(let i=0;i<100;i++){active.mechanism(.5+i*.001,.001,v);blocked.mechanism(.5+i*.001,.001,v);}
 assert.ok(active.history.photocurrentNa.some(r=>r.some(x=>x<0)));assert.ok(blocked.history.photocurrentNa.every(r=>r.every(x=>x===0)));
 assert.deepEqual(active.history.occupancy,blocked.history.occupancy);assert.equal(active.diagnostics().maxIrradianceMwMm2,blocked.diagnostics().maxIrradianceMwMm2);
 assert.ok(active.diagnostics().massError<=1e-8);assert.ok(active.diagnostics().minOccupancy>=-1e-12);
 assert.throws(()=>createPhotocurrent(m,{fluencePerMw:[1],emittedMw:1}));
});
test('Seed reproduces independent photon histories; zero hits retain nonzero upper confidence',()=>{
 const scene=surfaceScene(g,m),options={photons:100,seed:81,maxEvents:20};assert.deepEqual(surfaceTransport(scene,options),surfaceTransport(scene,options));
 assert.ok(boundedMean(0,0,128000,1e6,.001).upper>0);assert.throws(()=>surfaceTransport(scene,{photons:99}));
});
test('Closed finite winding is contained; complete ramp has zero net current change',()=>{
 const c=embeddedCoil(g.wells[0]);assert.ok(c.containment);assert.throws(()=>embeddedCoil(g.wells[0],{trackWidthUm:20}));
 let sum=0;for(let i=0;i<2000;i++)sum+=coilSlew(i*.001,.001,{peakA:5})*.001;assert.ok(Math.abs(sum)<1e-7);
});
test('Causal filtering never erases an off-target to invent an exclusive channel',()=>{
 let x=qualifySelectivity({assigned:[[1,1]],regionalSilenced:[[0,1]],wholeSilenced:[[0,0]]},['E1','E2']);assert.equal(x.exclusiveCount,0);assert.equal(x.sharedOnlyCount,1);
 x=qualifySelectivity({assigned:[[1,0]],regionalSilenced:[[0,0]],wholeSilenced:[[0,0]],opsinBlocked:[[1,0]]},['E1','E2']);assert.equal(x.exclusiveCount,0);
});
test('Matrix export preserves every declared sample, cell and control',()=>{
 const p={amplitude:.001,matrices:{assigned:[[1,0]],regionalSilenced:[[0,0]]},pairs:[{channelIndex:0,cellIndex:0,channelId:'C1',cellId:'E1'},{channelIndex:0,cellIndex:1,channelId:'C1',cellId:'E2'}]},r={points:[p],units:{amplitude:'mW emitted'}};
 const csv=exportCsv(r,'matrix');assert.equal(csv.trim().split('\n').length,3);assert.match(csv,/C1,E1,1,0/);assert.match(csv,/C1,E2,0,0/);assert.throws(()=>exportCsv(r,'unknown'));
});
