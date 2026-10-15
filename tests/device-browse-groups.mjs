import test from 'node:test';
import assert from 'node:assert/strict';
import { getDeviceBrowseGroup, groupDeviceCardsForBrowsing } from '../src/lib/device-browse-groups.js';
import { groupDeviceEntries } from '../src/lib/device-families.js';
const entry = (order, interface_class) => ({ order, slug: String(order), interface_class });
test('anatomical sequence preserves every card and prioritizes familiar architectures', () => {
  const entries = [entry(161, 'cochlear'), entry(2, 'intracortical'), entry(9, 'intracortical'), entry(4, 'intracortical'), entry(1, 'intracortical'), entry(7, 'ecog'), entry(151, 'dbs'), entry(3, 'endovascular'), entry(14, 'pni'), entry(167, 'scs'), entry(165, 'retinal'), entry(20, 'ecog'), entry(209, 'other')];
  const cards = groupDeviceEntries(entries);
  const groups = groupDeviceCardsForBrowsing(cards);
  assert.deepEqual(groups.map(group => group.id), ['penetrating', 'surface', 'depth', 'vascular', 'peripheral', 'spinal', 'retinal', 'auditory', 'biohybrid', 'other']);
  assert.deepEqual(groups[0].cards.map(card => card.representative.order), [1, 4, 9, 2]);
  assert.equal(new Set(groups.flatMap(group => group.cards)).size, cards.length);
});
test('families stay intact and filtered variants retain their actual anatomy', () => {
  const full = groupDeviceCardsForBrowsing(groupDeviceEntries([entry(1, 'intracortical'), entry(5, 'pni')]));
  assert.equal(full.length, 1);
  assert.equal(full[0].id, 'penetrating');
  assert.equal(full[0].cards[0].entries.length, 2);
  const filtered = groupDeviceCardsForBrowsing(groupDeviceEntries([entry(5, 'pni')]));
  assert.equal(filtered[0].id, 'peripheral');
  assert.deepEqual(groupDeviceCardsForBrowsing([]), []);
});
test('mixed systems and special architectures use explicit editorial placements', () => {
  for (const [order, iface, expected] of [[100,'intracortical','depth'], [187,'other','vascular'], [28,'ecog','spinal'], [19,'pni','peripheral'], [8,'intracortical','penetrating'], [21,'other','biohybrid'], [209,'other','other']]) {
    assert.equal(getDeviceBrowseGroup(entry(order, iface)).id, expected);
  }
});
