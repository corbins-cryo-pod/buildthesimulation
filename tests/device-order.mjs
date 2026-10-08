import test from 'node:test';
import assert from 'node:assert/strict';
import { compareDeviceEntries } from '../src/lib/device-order.js';
import { groupDeviceEntries } from '../src/lib/device-families.js';

const entry = (order, title, successRank) => ({ slug: String(order), order, data: { order, title, successRank } });

test('featured device order survives family grouping and highlights the cortical Utah array', () => {
  const entries = [entry(106, 'Neuropixels NXT'), entry(5, 'Utah Slanted', 7), entry(3, 'Stentrode', 3), entry(4, 'Neuropixels 1.0', 5), entry(2, 'Neuralink', 4), entry(1, 'Utah Array', 2)];
  const sorted = entries.sort(compareDeviceEntries);
  const cards = groupDeviceEntries(sorted);
  assert.deepEqual(cards.map(card => card.representative.order), [1, 2, 106, 3]);
  assert.deepEqual(cards[0].entries.map(e => e.order), [1, 5]);
  // A filter for the slanted variant still returns that exact device.
  assert.equal(groupDeviceEntries(sorted.filter(e => e.order === 5))[0].representative.order, 5);
});

test('remaining devices retain curated order with alphabetical ties and unranked entries last', () => {
  const entries = [entry(90, 'Zeta'), entry(80, 'Beta', 20), entry(81, '12 — Alpha', 20), entry(82, 'Gamma', 10)];
  assert.deepEqual(entries.sort(compareDeviceEntries).map(e => e.order), [82, 81, 80, 90]);
});
