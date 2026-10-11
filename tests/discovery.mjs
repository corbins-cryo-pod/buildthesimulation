import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanDiscoveryTitle, normalizeDiscoveryText, searchDiscovery } from '../src/lib/discovery.js';

const entries = [
  {type:'Devices',title:'Neuralink N1',href:'/devices/n1/',detail:'Intracortical',summary:'Flexible thread array',keywords:['implant']},
  {type:'Organizations',title:'Neuralink',href:'/companies/?org=neuralink',detail:'C3R',summary:'Human studies',keywords:[]},
  {type:'Devices',title:'Synchron Stentrode',href:'/devices/stentrode/',detail:'Endovascular',summary:'Stent electrode',keywords:['brain stent']},
  {type:'Applications',title:'Speech neuroprosthesis',href:'/applications/speech/',detail:'Human evidence',summary:'Speech decoding',keywords:['communication']},
  {type:'Devices',title:'ECoG grid',href:'/devices/ecog/',detail:'Cortical surface',summary:'Surface recording',keywords:[]},
];

test('normalizes human-facing titles and punctuation', () => {
  assert.equal(cleanDiscoveryTitle('02 — Neuralink N1'), 'Neuralink N1');
  assert.equal(cleanDiscoveryTitle('12 - Neuralink (Company brief)'), 'Neuralink');
  assert.equal(normalizeDiscoveryText('ÉCoG — Grid'), 'ecog grid');
});

test('rank exact organization name before related device', () => {
  const matches = searchDiscovery(entries, 'Neuralink');
  assert.equal(matches[0].type, 'Organizations');
  assert.equal(matches.length, 2);
});

test('useful aliases resolve without duplicating source records', () => {
  assert.equal(searchDiscovery(entries, 'brain stent')[0].title, 'Synchron Stentrode');
  assert.equal(searchDiscovery(entries, 'surface electrode')[0].title, 'ECoG grid');
  assert.equal(searchDiscovery(entries, 'speech restoration')[0].type, 'Applications');
});

test('empty, unmatched, and limited queries behave predictably', () => {
  assert.deepEqual(searchDiscovery(entries, '  '), []);
  assert.deepEqual(searchDiscovery(entries, 'unlisted fabricated implant'), []);
  assert.equal(searchDiscovery(entries, 'neuralink', 1).length, 1);
});
