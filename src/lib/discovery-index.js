import { getCollection } from 'astro:content';
import { buildDeviceCodes } from './device-code.js';
import { compareDeviceEntries } from './device-order.js';
import { compareOrganizations, classifyOrganization } from './organization-classification.js';
import { resolveFacets } from './device-facets.js';
import { deviceModels } from './devices/catalog.js';
import { organizationDisplayName, organizationSearchNames } from './organization-names.js';
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
  const deviceCodes = buildDeviceCodes(organizations, hardware, studies);
  return [
    ...companies.map(entry => {
      const program = classifyOrganization(entry).primary;
      return {
        type: 'Organizations', title: organizationDisplayName(entry.slug, entry.data.title),
        href: `/companies/?org=${entry.slug}`,
        detail: [entry.data.kind, program?.code].filter(Boolean).join(' · '),
        summary: entry.data.location ?? '',
        keywords: [...(entry.data.tags ?? []), ...organizationSearchNames(entry.slug), entry.data.description ?? '', entry.data.region ?? '', program?.name ?? '', ...(program?.interfaces ?? [])],
      };
    }),
    ...devices.map(entry => {
      const facets = resolveFacets(entry.data);
      return {
        type: 'Devices', title: cleanDiscoveryTitle(entry.data.title),
        href: `/devices/${entry.slug}/`,
        detail: [entry.data.modality, entry.data.status, deviceCodes[entry.slug]].filter(Boolean).join(' · '),
        summary: entry.data.description ?? '',
        keywords: [deviceCodes[entry.slug] ?? '', entry.data.interface_class ?? '', ...(entry.data.tags ?? []), ...(facets.axis ?? []), ...(facets.form ?? []), ...(facets.function ?? []), facets.regulatory ?? ''],
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
      ['Cochlear Implant Laboratory', '/simulations/cochlear-implant/', 'Sound processing, finite-contact fields, auditory-nerve cable dynamics and reproducible implant experiments', 'cochlear implant hearing auditory nerve Rattay CIS n-of-m vocoder electrode recruitment spike raster threshold'],
      ['Cochlear Implant Methods and Validation', '/simulations/cochlear-implant/methods/', 'Model equations, independent numerical references, interpretation boundaries and experiment guide', 'cochlear auditory nerve methods validation finite disk Greenwood Rattay pulse charge numerical convergence'],
      ['Retinal Implant Laboratory', '/simulations/retinal-implant/', 'Finite-contact electrical fields, published axon-map percepts, pulse schedules and reproducible experiments', 'retinal retina epiretinal implant phosphene axon map Argus vision prosthesis pulse2percept charge'],
      ['Retinal Models and Verification', '/simulations/retinal-implant/methods/', 'Percept equations, field assumptions, independent references and sampling limits', 'retinal methods numerical verification convergence Watson Jansonius Beyeler Granley field current'],
      ['RPNI Design & Testing Laboratory', '/simulations/rpni-design/', 'Muscle-graft geometry, nerve routing, finite bipolar contacts, synthetic EMG and controlled design studies', 'RPNI regenerative peripheral nerve interface muscle graft motor unit electrode design crosstalk recording oxygen transport'],
      ['RPNI Model and Evidence', '/simulations/rpni-design/methods/', 'Electrical forward model, transport assumptions, primary RPNI studies and numerical verification', 'RPNI methods evidence validation equations muscle graft human rat'],
      ['Biohybrid Neural Interface Laboratory', '/simulations/biohybrid-interface/', 'Active engineered axonal bridge, host–graft synapses, finite electrode contacts and calculated recordings', 'biohybrid living electrode micro-TENN neural tissue graft engineered axon bridge Hodgkin Huxley synapse stimulation recording growth'],
      ['Biohybrid Methods and Validation', '/simulations/biohybrid-interface/methods/', 'Biophysical equations, evidence register, convergence studies and independent NEURON verification', 'biohybrid methods evidence references HH cable finite contact NEURON numerical validation growth limitations'],
      ['Biohybrid Crucial Questions and Answers', '/simulations/biohybrid-interface/questions/', '34 source-backed scientific questions, causal controls, source attribution and the next model-development decisions', 'biohybrid questions answers causal audit synapses off direct activation response sweep graft host recording threshold uncertainty'],
      ['Neural Interface Laboratory', '/cortex/interface/', 'Twelve active human neurons, finite surface contacts, stimulation and ideal recordings', 'cortex integrated neural interface laboratory finite shank electrode membrane voltage replay spike raster'],
      ['Cortex Laboratory', '/cortex/', 'Single active human cell, patch clamp, electrode stimulation and membrane replay', 'cortex laboratory recording stimulation Utah membrane physics finite disk single neuron'],
      ['Cellular Electrophysiology Laboratory', '/simulations/cellular-electrophysiology/', 'Current clamp, membrane-channel kinetics and passive cable spread in one laboratory', 'current clamp membrane biophysics cable explorer soma ion channel voltage step steady state kinetics electrophysiology'],
      ['Cortex Population Laboratory', '/cortex/population/', 'Seeded random distance clouds, shells and grids of distinct human cells', 'cortex population laboratory randomize randomization shuffle seed distance cloud neurons stimulation'],
      ['Finger Pathway Atlas', '/simulations/finger-pathway-atlas/', '3D sensory and motor anatomy from fingertip to cortex', 'finger index touch motor hand nerve ganglion spinal cord brainstem medulla thalamus cortex anatomy atlas'],
      ['Finger Pathway Atlas V3', '/simulations/finger-pathway-atlas/v3/', 'Complete original anatomical atlas and detailed cellular specimens', 'finger atlas v3 original baseline sensory motor cells comparison'],
      ['Finger Pathway Atlas V4', '/simulations/finger-pathway-atlas/v4/', 'Continuous sensory and motor pathways with adaptive cellular detail', 'finger atlas v4 development troubleshooting pathways cells comparison'],
      ['Finger atlas reference images', '/simulations/finger-pathway-atlas/references/', '50 model-versus-tissue plates and 42 original figures', 'finger atlas reference histology microscopy myelin synapse Meissner Pacinian neuromuscular connectomics'],
      ['Cortical stimulation lab', '/simulations/cortical-stimulation/', 'Electrodes and tissue response', 'cortex stimulation experiment'],
      ['Cortical recording lab', '/simulations/cortex-slab/', 'Synthetic signals from neurons', 'recording depth electrodes'],
      ['Peripheral Nerve Regeneration Laboratory', '/simulations/nerve-regeneration/', 'Degeneration, repair, axon growth, remyelination and reproducible experiments', 'peripheral nerve regeneration Schwann myelin Wallerian conduit graft axon repair'],
      ['Nerve Regeneration Model and Evidence', '/simulations/nerve-regeneration/methods/', 'Equations, primary studies, assumptions and numerical verification', 'nerve regeneration methods evidence sources validation equations'],
      ['Peripheral nerve sandbox', '/sim/', 'Nerve cross-sections and pulses', 'peripheral nerve cuff simulation'],
      ['Neural interface designer', '/simulations/interface-designer/', 'Electrode geometry and routing', 'design electrode layout exports'],
      ['3D model finder', '/devices/models/', 'Reference hardware geometry', 'models inspect implants'],
    ].map(([title, href, summary, keywords]) => ({
      type: 'Tools', title, href, detail: 'Interactive tool', summary, keywords: [keywords],
    })),
  ];
}
