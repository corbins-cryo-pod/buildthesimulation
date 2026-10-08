const cleanTitle = title => title.replace(/^\d+\s*[-—]\s*/, '').replace(/\s*\((company|lab) brief\)$/i, '');
const linkedSlugs = (body, collection) => [...(body ?? '').matchAll(/\]\(\/(devices|designs|applications)\/([^/\s)#?]+)/g)].filter(match => match[1] === collection).map(match => match[2]);
const visible = entries => entries.filter(entry => !entry.data.draft);

// Use explicit catalog relationships and links; association does not imply ownership.
export function buildAtlasEntries(companies, devices, applications, models = {}) {
  const hardware = new Map(visible(devices).map(entry => [entry.slug, entry]));
  const studies = visible(applications);
  return visible(companies).sort((a, b) => (a.data.sizeRank ?? Infinity) - (b.data.sizeRank ?? Infinity) || cleanTitle(a.data.title).localeCompare(cleanTitle(b.data.title))).map(org => {
    const appSlugs = new Set(linkedSlugs(org.body, 'applications'));
    const apps = studies.filter(app => (app.data.orgs ?? []).includes(org.slug) || appSlugs.has(app.slug));
    const deviceSlugs = new Set([...linkedSlugs(org.body, 'devices'), ...linkedSlugs(org.body, 'designs'), ...apps.flatMap(app => app.data.devices ?? [])]);
    const linkedDevices = [...deviceSlugs].map(slug => hardware.get(slug)).filter(Boolean).map(device => ({
      slug: device.slug, title: cleanTitle(device.data.title), description: device.data.description ?? '',
      interface: device.data.modality ?? 'Other', deviceId: device.data.device_id,
      hasModel: Boolean(models[device.data.device_id]),
    }));
    const interfaces = new Set([...linkedDevices.map(device => device.interface), ...apps.map(app => app.data.modality)].filter(Boolean));
    const tags = (org.data.tags ?? []).map(tag => tag.toLowerCase());
    for (const [type, matches] of [['Intracortical', ['intracortical']], ['Cortical surface', ['ecog', 'microecog', 'cortical surface']], ['Endovascular', ['endovascular']], ['Peripheral nerve', ['peripheral nerve', 'pni']], ['Noninvasive', ['noninvasive', 'eeg']]]) {
      if (tags.some(tag => matches.includes(tag))) interfaces.add(type);
    }
    const lat = org.data.lat, lon = org.data.lon;
    return {
      slug: org.slug, title: cleanTitle(org.data.title), kind: org.data.kind, region: org.data.region,
      description: org.data.description ?? '', location: org.data.location ?? '', website: org.data.website ?? '',
      lat: Number.isFinite(lat) && Number.isFinite(lon) ? lat : null,
      lon: Number.isFinite(lat) && Number.isFinite(lon) ? lon : null,
      reviewed: org.data.lastVerified?.toISOString().slice(0, 10) ?? '', tags: org.data.tags ?? [],
      interfaces: [...interfaces].sort(), devices: linkedDevices,
      applications: apps.map(app => ({slug: app.slug, title: cleanTitle(app.data.title), description: app.data.description ?? '', status: app.data.status ?? 'theoretical'})),
    };
  });
}

export function filterAtlasEntries(entries, {query = '', kind = '', region = '', interfaceType = ''} = {}) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter(entry => (!kind || entry.kind === kind) && (!region || entry.region === region) && (!interfaceType || entry.interfaces.includes(interfaceType)) && terms.every(term => [entry.title, entry.location, entry.description, ...entry.tags, ...entry.devices.map(d => d.title), ...entry.applications.map(a => a.title)].join(' ').toLocaleLowerCase().includes(term)));
}

// Cluster in projected screen space so geography remains correct at every zoom.
export function clusterAtlasPoints(points, project, radius = 42) {
  const groups = [];
  for (const point of points) {
    const pixel = project(point);
    let group = groups.find(group => Math.hypot(group.x - pixel.x, group.y - pixel.y) <= radius);
    if (!group) { group = {x: pixel.x, y: pixel.y, entries: []}; groups.push(group); }
    group.entries.push(point);
  }
  return groups;
}

export function readAtlasState(search, entries) {
  const params = new URLSearchParams(search);
  const allowed = (key, values) => values.includes(params.get(key)) ? params.get(key) : '';
  return {
    query: params.get('q') ?? '', kind: allowed('kind', ['Company', 'Lab']),
    region: allowed('region', [...new Set(entries.map(e => e.region))]),
    interfaceType: allowed('interface', [...new Set(entries.flatMap(e => e.interfaces))]),
    selected: entries.some(e => e.slug === params.get('org')) ? params.get('org') : '',
  };
}
