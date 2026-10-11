import { getCollection } from 'astro:content';
import { compareDeviceEntries } from './device-order.js';
import { compareOrganizations, classifyOrganization } from './organization-classification.js';
import { resolveFacets } from './device-facets.js';
import { deviceModels } from './devices/catalog.js';
import { cleanDiscoveryTitle } from './discovery.js';

// One search index per deployment, not an embedded copy in every HTML page.
// Entries inherit titles, tags and status from the existing source catalogs.
export async function buildDiscoveryIndex() {
  const [organizations, hardware, studies] = await Promise.all([
    getCollection('companies'), getCollection('designs'), getCollection('applications'),
  ]);
  const companies = organizations.filter(entry => !entry.data.draft).sort(compareOrganizations);
  const devices = hardware.filter(entry => !entry.data.draft).sort(compareDeviceEntries);
  const applications = studies.filter(entry => !entry.data.draft).sort((a,b) => a.data.order - b.data.order);
  return [
    ...companies.map(entry => {
      const program = classifyOrganization(entry).primary;
      return {
        type: 'Organizations', title: cleanDiscoveryTitle(entry.data.title),
        href: `/companies/?org=${entry.slug}`,
        detail: [entry.data.kind, program?.code].filter(Boolean).join(' · '),
        summary: entry.data.location ?? '',
        keywords: [...(entry.data.tags ?? []), entry.data.description ?? '', entry.data.region ?? '', program?.name ?? '', ...(program?.interfaces ?? [])],
      };
    }),
    ...devices.map(entry => {
      const facets = resolveFacets(entry.data);
      return {
        type: 'Devices', title: cleanDiscoveryTitle(entry.data.title),
        href: `/devices/${entry.slug}/`,
        detail: [entry.data.modality, entry.data.status].filter(Boolean).join(' · '),
        summary: entry.data.description ?? '',
        keywords: [entry.data.device_id ?? '', entry.data.interface_class ?? '', ...(entry.data.tags ?? []), ...(facets.axis ?? []), ...(facets.form ?? []), ...(facets.function ?? []), facets.regulatory ?? ''],
      };
    }),
    ...applications.map(entry => ({
      type: 'Applications', title: cleanDiscoveryTitle(entry.data.title),
      href: `/applications/${entry.slug}/`,
      detail: entry.data.status ?? '', summary: entry.data.modality ?? '',
      keywords: [entry.data.description ?? '', ...(entry.data.tags ?? []), ...(entry.data.devices ?? []), ...(entry.data.orgs ?? [])],
    })),
    ...Object.values(deviceModels).map(model => ({
      type: '3D models', title: model.name, href: `/devices/${model.slug}/#model-3d`,
      detail: '3D reference', summary: 'Documented reconstruction',
      keywords: [model.deviceId, model.slug ?? '', ...(model.specs ?? []).flatMap(spec => spec)],
    })),
    ...[
      ['Cortical stimulation lab', '/simulations/cortical-stimulation/', 'Electrodes and tissue response', 'cortex stimulation experiment'],
      ['Cortical recording lab', '/simulations/cortex-slab/', 'Synthetic signals from neurons', 'recording depth electrodes'],
      ['Peripheral nerve sandbox', '/sim/', 'Nerve cross-sections and pulses', 'peripheral nerve cuff simulation'],
      ['Neural interface designer', '/devices/designer/', 'Electrode geometry and routing', 'design electrode layout exports'],
      ['3D model finder', '/devices/models/', 'Reference hardware geometry', 'models inspect implants'],
    ].map(([title, href, summary, keywords]) => ({
      type: 'Tools', title, href, detail: 'Interactive tool', summary, keywords: [keywords],
    })),
  ];
}
