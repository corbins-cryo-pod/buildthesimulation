import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {acquire,makeExample} from '../public/equipment/07-03/optics.mjs';
import {reservationFromObservation,samplesFromExposure} from '../public/equipment/07-03/handoff.mjs';
import {validateSamples, analyze} from '../public/equipment/07-02/solver.mjs';
const load = name => JSON.parse(readFileSync(new URL('../public/equipment/'+name,import.meta.url)));
test('the 07-02 importer accepts the published microscopy reservation', () => {
  const sample = acquire({...makeExample(),fixture:'neurites',sampleId:'NEURITE-001',mode:'fluorescence'}).metadata;
  const reserved = reservationFromObservation(sample);
  assert.deepEqual(reserved,load('07-03/example-reservation.json'));
  assert.deepEqual(validateSamples(reserved,120),reserved);
  assert.throws(()=>reservationFromObservation(acquire(makeExample()).metadata),/specimen/);
});
test('an incubator specimen returns through microscopy with its identifier, contact IDs and revisions', () => {
  const prior = load('07-02/example-result.json');
  prior.samples[0].contactIds = ['pad-2'];
  const [identity] = samplesFromExposure(prior);
  const observation = acquire({...makeExample(),...identity,fixture:'neurites',sampleId:identity.sampleId}).metadata;
  const reserved = reservationFromObservation(observation);
  const trace = {readings:prior.chamber,events:prior.events,provenance:prior.provenance};
  const [after] = analyze(trace,reserved).samples;
  assert.equal(after.sampleId,identity.sampleId);
  assert.deepEqual(after.contactIds,['pad-2']);
  assert.equal(after.revision,identity.parentRevision+2);
  assert.deepEqual(after.history.slice(-3).map(row=>row.deviceId),['07-02','07-03','07-02']);
  assert.equal(after.history.at(-2).pixelSizeUm,observation.pixelSizeUm);
});
test('a missing or contradictory upstream record fails before attaching an image', () => {
  assert.throws(()=>samplesFromExposure({samples:[]}),/07-02/);
  const wrong = load('07-02/example-result.json');
  wrong.samples[0].revision++;
  assert.throws(()=>samplesFromExposure(wrong),/disagree/);
});
