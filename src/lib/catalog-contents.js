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
  const unlinked = {
    organization: null,
    devices: devices.filter(device => !usedDevices.has(device.slug)).map(device => page(device, 'devices')).sort(byTitle),
    applications: studies.filter(app => !usedApplications.has(app.slug)).map(app => page(app, 'applications')).sort(byTitle),
  };
  if (unlinked.devices.length || unlinked.applications.length) groups.push(unlinked);
  return groups;
}
