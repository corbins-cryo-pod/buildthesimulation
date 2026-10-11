// Shared, framework-independent discovery utilities.
// Use the same labels and ranking for header search and future directory entry points.
export const DISCOVERY_TYPES = ['Organizations', 'Devices', 'Applications', '3D models', 'Tools'];

const ALIASES = {
  'brain stent': ['stentrode', 'endovascular'],
  'surface electrode': ['ecog', 'cortical surface'],
  'brain surface': ['ecog', 'cortical surface'],
  'nerve cuff': ['cuff', 'peripheral nerve'],
  'speech restoration': ['speech', 'decoding'],
  'thought to text': ['speech', 'handwriting', 'typing'],
  'brain computer interface': ['bci', 'neural interface'],
  'brain implant': ['intracortical', 'neural implant'],
  'deep brain stimulation': ['dbs'],
  'spinal cord stimulation': ['scs'],
};

export const cleanDiscoveryTitle = title => String(title ?? '')
  .replace(/^\d+\s*[-—]\s*/, '')
  .replace(/\s*\((?:company|lab) brief\)$/i, '');

export function normalizeDiscoveryText(value) {
  return String(value ?? '').normalize('NFKD').toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function matched(text, q) {
  const terms = q.split(' ').filter(Boolean);
  return terms.length > 0 && terms.every(term => text.includes(term));
}

export function searchDiscovery(entries, query, limit = 24) {
  const q = normalizeDiscoveryText(query);
  if (!q) return [];
  const alternatives = [q, ...(ALIASES[q] ?? []).map(normalizeDiscoveryText)];
  return entries.map(entry => {
    const title = normalizeDiscoveryText(entry.title);
    const all = normalizeDiscoveryText([entry.title, entry.summary, entry.detail, ...(entry.keywords ?? [])].join(' '));
    const primary = matched(all, q);
    if (!primary && !alternatives.slice(1).some(alias => matched(all, alias))) return null;
    const score = (title === q ? 100 : title.startsWith(q) ? 70 : title.includes(q) ? 50 : 0)
      + (primary ? 20 : 4)
      + (normalizeDiscoveryText(entry.detail).includes(q) ? 5 : 0);
    return {...entry, score};
  }).filter(Boolean).sort((a,b) =>
    b.score - a.score ||
    DISCOVERY_TYPES.indexOf(a.type) - DISCOVERY_TYPES.indexOf(b.type) ||
    a.title.localeCompare(b.title)
  ).slice(0, Math.max(0, limit));
}
