// Editorial browsing groups, not evidence or clinical-effectiveness rankings.
// Explicit placements handle mixed systems and architectures beyond interface_class.
export const deviceBrowseGroups = [
  { id: 'penetrating', title: 'Penetrating brain interfaces' },
  { id: 'surface', title: 'Brain-surface interfaces' },
  { id: 'depth', title: 'Brain depth leads' },
  { id: 'vascular', title: 'Vascular and fluid-space interfaces' },
  { id: 'peripheral', title: 'Peripheral nerve interfaces' },
  { id: 'spinal', title: 'Spinal interfaces' },
  { id: 'retinal', title: 'Retinal interfaces' },
  { id: 'auditory', title: 'Auditory interfaces' },
  { id: 'biohybrid', title: 'Biohybrid interfaces' },
  { id: 'other', title: 'Other sensors, actuators and reference designs' },
];
const placements = {
  penetrating: [25, 94, 194, 206],
  surface: [117, 137, 150, 175], // RNS spans surface strips and depth leads.
  depth: [100],
  vascular: [120, 187],
  spinal: [28, 182], // Mixed cortical/spinal systems stay in one browse location.
  biohybrid: [20, 21],
  other: [30, 31, 81, 132, 191, 196, 209],
};
const explicit = new Map(Object.entries(placements).flatMap(([id, orders]) => orders.map(order => [order, id])));
const byInterface = { intracortical: 'penetrating', ecog: 'surface', dbs: 'depth', seeg: 'depth', endovascular: 'vascular', pni: 'peripheral', scs: 'spinal', retinal: 'retinal', cochlear: 'auditory', brainstem: 'auditory' };
// Familiar reference architectures first; remaining cards retain the existing curated order.
const leads = { penetrating: [1, 4, 9, 2], surface: [7, 42, 41, 176], depth: [151, 152, 153, 100], vascular: [3, 189], peripheral: [10, 14, 6, 15], spinal: [167, 154, 156], retinal: [165, 177], auditory: [161, 168, 169, 55, 190] };
export function getDeviceBrowseGroup(entry) {
  const data = entry.data ?? entry;
  const id = explicit.get(Number(data.order)) ?? byInterface[data.interface_class] ?? 'other';
  return deviceBrowseGroups.find(group => group.id === id);
}
export function groupDeviceCardsForBrowsing(cards) {
  return deviceBrowseGroups.map(group => {
    // Use the first matching family member in the existing sorted input as its
    // anchor. This preserves family placement even when a newer representative
    // has a different anatomical target (for example Utah versus USEA).
    const members = cards.filter(card => getDeviceBrowseGroup(card.entries[0]).id === group.id);
    const priorities = leads[group.id] ?? [];
    const rank = card => {
      const matches = card.entries.map(entry => priorities.indexOf(Number(entry.order))).filter(index => index >= 0);
      return matches.length ? Math.min(...matches) : Infinity;
    };
    return { ...group, cards: members.sort((a, b) => rank(a) - rank(b)) };
  }).filter(group => group.cards.length);
}
