import test from 'node:test';import assert from 'node:assert/strict';
import {createBipolarMorphology} from '../src/lib/axon-interface/bipolar.mjs';
import {normalize,budget} from '../src/lib/axon-interface/stage2/settings.mjs';
import {SPECTRAL_MODELS,actionWeight,effectivePhotonFlux,createSpectralPhotocurrent} from '../src/lib/axon-interface/stage2/spectral-opsin.mjs';
import {experimentChannels,wavelengthTransport} from '../src/lib/axon-interface/stage2/spectral-protocol.mjs';
import {createStage1Cohort} from '../src/lib/axon-interface/identities.mjs';
import {triangleRule,conservativeInductionLoad} from '../src/lib/axon-interface/stage2/induction-conservative-load.mjs';
test('Photon conversion uses one spectral weight and retains blue crosstalk',()=>{
 const model=SPECTRAL_MODELS[1],flux=effectivePhotonFlux(model,[{nm:470,irradianceMwMm2:1}]);assert.ok(Math.abs(flux-7.334707838909728e14)<1);
 assert.equal(actionWeight(model,470),.31);assert.throws(()=>actionWeight(SPECTRAL_MODELS[0],590),/extrapolation/);
 const bins=[{nm:470,irradianceMwMm2:.3},{nm:550,irradianceMwMm2:.7}];assert.equal(effectivePhotonFlux(model,bins),bins.reduce((s,b)=>s+effectivePhotonFlux(model,[b]),0));
});
test('Physical sources multiply trial rows, never the original-host census',()=>{
 for(const spectralFamilyCount of [2,3,4]){const {settings,anatomy}=normalize({modality:'spectral',spectralFamilyCount,channelCount:1,amplitudes:[0,.002]}),g=createStage1Cohort(anatomy),channels=experimentChannels(settings,g);assert.equal(channels.length,spectralFamilyCount);assert.equal(g.cells.length,4);assert.equal(new Set(channels.map(c=>c.id)).size,channels.length);assert.equal(budget(settings,createBipolarMorphology(anatomy)).explicitChannels,channels.length);assert.notEqual(wavelengthTransport(settings,470).muScatterPerMm,wavelengthTransport(settings,550).muScatterPerMm);}
 assert.throws(()=>normalize({spectralFamilyCount:5}));assert.throws(()=>normalize({spectralRateScale:3}));
});
test('Whole-cell conductance and current survive soma mesh refinement',()=>{
 const currents=[];for(const somaSegments of [5,9,13]){const m=createBipolarMorphology({somaSegments}),photo=createSpectralPhotocurrent(m,{modelId:'chrimson',bins:[{nm:550,fluencePerMw:m.compartments.map(c=>c.kind==='SOMA'?1:0)}],emittedMw:5,expressionMultiplier:20}),v=m.compartments.map(()=>-60);let output;for(let k=0;k<1000;k++)output=photo.mechanism(.5+k*.001,.001,v);currents.push(Array.from(output.currentNa).reduce((a,b)=>a+b,0));assert.ok(photo.diagnostics().massError<1e-10);}
 assert.ok(Math.abs(currents[0]-currents[1])<1e-12&&Math.abs(currents[0]-currents[2])<1e-12);
});
test('Spectral block removes current without removing optical exposure or occupancy',()=>{
 const m=createBipolarMorphology(),options={modelId:'chr2',bins:[{nm:470,fluencePerMw:m.compartments.map(c=>c.kind==='SOMA'?1:0)}],emittedMw:5,traceStride:1},a=createSpectralPhotocurrent(m,options),b=createSpectralPhotocurrent(m,{...options,blocked:true}),v=m.compartments.map(()=>-80);
 for(let k=0;k<100;k++){a.mechanism(.5+k*.001,.001,v);b.mechanism(.5+k*.001,.001,v);}assert.deepEqual(a.history.occupancy,b.history.occupancy);assert.deepEqual(a.diagnostics().effectivePhotonFluxPerMm2S,b.diagnostics().effectivePhotonFluxPerMm2S);assert.ok(b.history.photocurrentNa.flat().every(x=>x===0));assert.ok(a.history.photocurrentNa.flat().some(x=>x<0));
});
test('Triangle surface quadrature reproduces independent analytic simplex moments',()=>{
 const factorial=n=>n<2?1:n*factorial(n-1);
 for(const order of [2,4,8])for(let a=0;a<order;a++)for(let b=0;b<order-a;b++){const expected=2*factorial(a)*factorial(b)/factorial(a+b+2),actual=triangleRule(order).reduce((s,q)=>s+q.weight*q.point[1]**a*q.point[2]**b,0);assert.ok(Math.abs(actual-expected)<5e-14);}
});
test('Conservative induction rejects an open winding before any mesh solve',()=>{assert.throws(()=>conservativeInductionLoad({}, {segments:[{a:[0,0,0],b:[0,0,1]}]}),/closed winding/);});
