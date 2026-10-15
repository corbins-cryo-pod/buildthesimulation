// Device code: C or L (kind of the developing organization), stage 0-4, and
// regulatory letter. Same scale as the organization atlas codes.
const linked = (body, collection) => [...(body ?? '').matchAll(/\]\(\/(devices|designs|applications|companies)\/([^/\s)#?]+)/g)].filter(m => m[1] === collection).map(m => m[2]);
const APPROVED = new Set(['fda-approved', 'fda-authorized', 'fda-hde', 'ce-marked', 'nmpa-approved']);

// Judgment calls where the linked organizations disagree. Key: device slug.
const KIND_OVERRIDES = {
  '01-utah-microelectrode-array': 'C', // made by Blackrock Neurotech; the labs listed use it
};

export function deviceStage(data) {
  if (data.status === 'human') return data.regulatory && (data.regulatory === 'fda-cleared' || APPROVED.has(data.regulatory)) ? 4 : 3;
  return {preclinical: 2, research: 1, theoretical: 0}[data.status] ?? '?';
}

export function deviceRegulatory(data) {
  const r = data.regulatory;
  if (r === 'fda-cleared') return 'K';
  if (APPROVED.has(r)) return 'A';
  if (r === 'investigational' || r === 'registration-trial') return 'R';
  return data.status === 'human' ? '?' : 'R';
}

export function buildDeviceCodes(companies, devices, applications) {
  const orgs = new Map();
  const add = (slug, org) => { if (!orgs.has(slug)) orgs.set(slug, new Map()); orgs.get(slug).set(org.slug, org); };
  for (const org of companies.filter(o => !o.data.draft)) {
    const apps = applications.filter(a => (a.data.orgs ?? []).includes(org.slug) || linked(org.body, 'applications').includes(a.slug));
    for (const slug of new Set([...linked(org.body, 'devices'), ...linked(org.body, 'designs'), ...apps.flatMap(a => a.data.devices ?? [])])) add(slug, org);
  }
  const byOrg = new Map(companies.map(o => [o.slug, o]));
  const codes = {};
  for (const device of devices) {
    const bodyOrgs = linked(device.body, 'companies').map(s => byOrg.get(s)).filter(Boolean);
    for (const org of bodyOrgs) add(device.slug, org);
    const all = [...(orgs.get(device.slug)?.values() ?? [])];
    let kinds = new Set(all.map(o => o.data.kind === 'Lab' ? 'L' : 'C'));
    if (kinds.size > 1 && bodyOrgs.length) kinds = new Set(bodyOrgs.map(o => o.data.kind === 'Lab' ? 'L' : 'C'));
    const kind = KIND_OVERRIDES[device.slug] ?? (kinds.size === 1 ? [...kinds][0] : '?');
    codes[device.slug] = `${kind}${deviceStage(device.data)}${deviceRegulatory(device.data)}`;
  }
  return codes;
}
