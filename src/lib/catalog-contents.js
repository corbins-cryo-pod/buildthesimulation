import deviceOrganizations from '../data/device-organizations.json' with { type: 'json' };
import { organizationDisplayName } from './organization-names.js';

const alphabet = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
const cleanTitle = title => String(title ?? '').replace(/^\d+\s*[-—]\s*/, '').replace(/\s*\((company|lab) brief\)$/i, '');
const visible = entries => entries.filter(entry => !entry.data.draft);
const references = (body, collection) => new Set(
  [...String(body ?? '').matchAll(/(?:\]\(|href=["'])(?:https:\/\/buildthesimulation\.com)?\/(devices|designs|companies|applications)\/([^/\s)#?"']+)/g)]
    .filter(match => match[1] === collection).map(match => match[2])
);
const page = (entry, collection) => ({ slug: entry.slug, title: cleanTitle(entry.data.title), href: `/${collection}/${entry.slug}/` });
const byTitle = (a, b) => alphabet.compare(a.title, b.title);

// Only reviewed primary assignments may group a device under an organization.
// Study links and prose mentions are associations, never evidence of manufacture.
// Keep every published page, including entries without a matching primary brief.
export function buildCatalogContents(companies, hardware, applications, assignments = deviceOrganizations) {
  const devices = visible(hardware), studies = visible(applications);
  const usedDevices = new Set(), usedApplications = new Set();
  const groups = visible(companies).map(org => {
    const applicationRefs = references(org.body, 'applications');
    const orgStudies = studies.filter(app => (app.data.orgs ?? []).includes(org.slug) || applicationRefs.has(app.slug));
    const linkedDevices = devices.filter(device => assignments[device.slug]?.primaryOrganization === org.slug);
    const deviceSlugs = new Set(linkedDevices.map(device => device.slug));
    const linkedStudies = studies.filter(app => orgStudies.includes(app) || (app.data.devices ?? []).some(slug => deviceSlugs.has(slug)));
    linkedDevices.forEach(device => usedDevices.add(device.slug));
    linkedStudies.forEach(app => usedApplications.add(app.slug));
    return {
      organization: { ...page(org, 'companies'), title: organizationDisplayName(org.slug, org.data.title) },
      devices: linkedDevices.map(device => page(device, 'devices')).sort(byTitle),
      applications: linkedStudies.map(app => page(app, 'applications')).sort(byTitle),
    };
  }).sort((a, b) => byTitle(a.organization, b.organization));
  // Devices without a matching primary brief are grouped under their reviewed
  // development program (plain external link to the key paper or official page,
  // not a site brief). Programs that cannot be grounded stay in Miscellaneous.
  const developerGroups = new Map();
  for (const device of devices) {
    if (usedDevices.has(device.slug)) continue;
    const developer = assignments[device.slug]?.developer;
    if (!developer) continue;
    if (!developerGroups.has(developer.name)) {
      developerGroups.set(developer.name, { organization: { slug: null, title: developer.name, href: developer.url }, devices: [], deviceSlugs: new Set() });
    }
    const group = developerGroups.get(developer.name);
    group.devices.push(device);
    group.deviceSlugs.add(device.slug);
    usedDevices.add(device.slug);
  }
  const developerRows = [...developerGroups.values()].map(group => {
    const linkedStudies = studies.filter(app => (app.data.devices ?? []).some(slug => group.deviceSlugs.has(slug)) && !usedApplications.has(app.slug));
    linkedStudies.forEach(app => usedApplications.add(app.slug));
    return {
      organization: group.organization,
      devices: group.devices.map(device => page(device, 'devices')).sort(byTitle),
      applications: linkedStudies.map(app => page(app, 'applications')).sort(byTitle),
    };
  });
  groups.push(...developerRows);
  groups.sort((a, b) => byTitle(a.organization, b.organization));
  const unlinked = {
    organization: { slug: null, title: 'Miscellaneous', href: null },
    devices: devices.filter(device => !usedDevices.has(device.slug)).map(device => page(device, 'devices')).sort(byTitle),
    applications: studies.filter(app => !usedApplications.has(app.slug)).map(app => page(app, 'applications')).sort(byTitle),
  };
  if (unlinked.devices.length || unlinked.applications.length) groups.push(unlinked);
  return groups;
}
