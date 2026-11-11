import test from 'node:test';
import assert from 'node:assert/strict';
import { createFieldModel, solveChannel, solveFieldLoad, prepareSampling, samplePrepared, sampleTransfer, reciprocalRecordingMv, normalizeFieldSettings, FIELD_DEFAULTS } from '../../src/lib/axon-interface/field.mjs';

test('Malformed conductivities, colliding regions and unknown settings are rejected',()=>{
 assert.throws(()=>normalizeFieldSettings({sigmaPerineurium:0}),/positive/);
 assert.throws(()=>normalizeFieldSettings({sigmaEndoLongitudinal:NaN}),/positive/);
 assert.throws(()=>normalizeFieldSettings({epineuriumRadiusUm:260}),/overlap/);
 assert.throws(()=>normalizeFieldSettings({silentAttenuation:.1}),/unsupported/);
 assert.throws(()=>normalizeFieldSettings({angularSegments:32.5}),/integer/);
});
test('Work budget is rejected before a large matrix is built',()=>{
 assert.throws(()=>createFieldModel({angularSegments:64,radialRefinement:4,axialRefinement:4}),/work budget exceeded/);
});
test('Finite source, sampling, cancellation and reciprocal units preserve contracts',()=>{
 const m=createFieldModel(), c={source:[355,0,0],return:[355,0,600],electrodeRadiusUm:75};
 assert.throws(()=>solveChannel(m,{...c,return:c.source}),/coincide/);
 assert.throws(()=>solveChannel(m,{...c,return:[355,0,100]}),/overlap/);
 assert.throws(()=>solveChannel(m,{...c,electrodeRadiusUm:10}),/unresolved/);
 assert.throws(()=>solveChannel(m,{...c,source:[1190,0,0]}),/boundary/);
 assert.throws(()=>solveChannel(m,c,{isCancelled:()=>true}),/cancelled/);
 const s=solveChannel(m,c);const points=[[0,0,0],[100,100,200]];
 assert.deepEqual(Array.from(samplePrepared(s,prepareSampling(m,points))),Array.from(sampleTransfer(s,points)));
 const v=sampleTransfer(s,points);
 assert.equal(reciprocalRecordingMv(s,points,[1000,0]),v[0]);
 assert.throws(()=>sampleTransfer(s,[[NaN,0,0]]),/finite/);
 assert.throws(()=>sampleTransfer(s,[[0,0,FIELD_DEFAULTS.halfLengthUm]]),/boundary/);
 assert.throws(()=>solveFieldLoad(m,[1,0]),/mesh node/);
 assert.throws(()=>solveFieldLoad(m,new Float64Array(m.points.length),{relativeTolerance:1e-4}),/may not be relaxed/);
});
