import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAtlasEntries, clusterAtlasPoints, filterAtlasEntries, readAtlasState } from '../src/lib/atlas/data.js';
const device = (slug, modality = 'Intracortical', draft = false) => ({slug, data: {title: slug, modality, device_id: slug, draft}});
const org = (slug, extra = {}) => ({slug, body: '', data: {title: `${slug} (company brief)`, tags: [], kind: 'Company', region: 'American', draft: false, ...extra}});
const application = (slug, orgs, devices, draft = false) => ({slug, data: {title: slug, orgs, devices, modality: 'Intracortical', status: 'human', draft}});

test('atlas joins explicit study relationships and brief links without inventing ownership', () => {
  const a = org('A', {lat: 0, lon: 0}); a.body = '[Hardware](/devices/D/) [Same hardware](/devices/D/#model-3d) [Another study](/applications/S2/)';
  const entries = buildAtlasEntries([a, org('B'), org('hidden', {draft: true})], [device('D'), device('E'), device('draft', 'Intracortical', true)], [application('S1', ['A'], ['D', 'draft']), application('S2', ['B'], ['E']), application('hidden', ['A'], ['E'], true)], {D: {id: 'reference'}});
  assert.equal(entries.length, 2);
  assert.deepEqual(entries[0].devices.map(d => d.slug), ['D', 'E']);
  assert.deepEqual(entries[0].applications.map(a => a.slug), ['S1', 'S2']);
  assert.equal(entries[0].devices[0].hasModel, true);
  assert.equal(entries[0].devices[1].hasModel, false);
  assert.equal(entries[0].lat, 0); assert.equal(entries[0].lon, 0);
  assert.equal(entries[1].lat, null);
});

test('combined filters search hardware and study names while preserving unmapped organizations', () => {
  const entries = buildAtlasEntries([org('A', {location: 'Boston', tags: ['ecog']}), org('B', {kind: 'Lab', region: 'European'})], [device('Deep Probe')], [application('Speech study', ['A'], ['Deep Probe'])]);
  assert.equal(filterAtlasEntries(entries, {query: 'Boston probe speech', interfaceType: 'Intracortical'})[0].slug, 'A');
  assert.equal(filterAtlasEntries(entries, {interfaceType: 'Cortical surface'})[0].slug, 'A');
  assert.equal(filterAtlasEntries(entries, {kind: 'Lab', region: 'European'})[0].slug, 'B');
  assert.equal(filterAtlasEntries(entries, {kind: 'Lab', query: 'probe'}).length, 0);
  assert.equal(filterAtlasEntries(entries).length, 2);
});

test('projected clustering separates distant points and preserves coincident organizations', () => {
  const points = [{slug:'a',x:10,y:10}, {slug:'b',x:10,y:10}, {slug:'c',x:180,y:60}, {slug:'d',x:190,y:65}];
  const groups = clusterAtlasPoints(points, point => point, 42);
  assert.deepEqual(groups.map(g => g.entries.map(e => e.slug)), [['a','b'], ['c','d']]);
  assert.deepEqual(clusterAtlasPoints([], p => p), []);
});

test('shared atlas URLs validate facets and profile identities', () => {
  const entries = [{slug:'a',region:'American',interfaces:['Intracortical']}];
  assert.deepEqual(readAtlasState('?q=speech&kind=Lab&region=American&interface=Intracortical&org=a', entries), {query:'speech',kind:'Lab',region:'American',interfaceType:'Intracortical',selected:'a'});
  assert.deepEqual(readAtlasState('?kind=Unknown&region=Invalid&interface=Fake&org=missing', entries), {query:'',kind:'',region:'',interfaceType:'',selected:''});
});
