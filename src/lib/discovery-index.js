import { getCollection } from 'astro:content';
import { buildDeviceCodes } from './device-code.js';
import { compareDeviceEntries } from './device-order.js';
import { compareOrganizations, classifyOrganization } from './organization-classification.js';
import { resolveFacets } from './device-facets.js';
import { deviceModels } from './devices/catalog.js';
import { organizationDisplayName, organizationSearchNames } from './organization-names.js';
import { cleanDiscoveryTitle } from './discovery.js';
import { equipment, zones } from '../data/equipment/index.js';
import { revisionById } from '../data/equipment-revisions.js';
import prototypesRelease from '../data/equipment-prototypes-2026-11-27.json';

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
    ...(() => {
      const zoneName = Object.fromEntries(zones.map(zone => [zone.id, zone.name]));
      return equipment.filter(record => revisionById[record.id]).map(record => ({
        type: 'Equipment', title: `${record.id} · ${record.name}`,
        href: `/simulations/equipment/${record.id}/revised/`,
        detail: record.model ?? '', summary: record.purpose ?? '',
        keywords: [record.id, record.name ?? '', record.model ?? '', zoneName[record.id.slice(0, 2)] ?? ''],
      }));
    })(),
    ...(() => {
      const foundryLabs = [
      ['Foundry 01 · Utah Array', '/simulations/utah-array-fabrication/', 'Carry a 10 x 10 workpiece through modeled dicing, glass fill, shaping and inspection.', 'utah array silicon geometry and isolation foundry fabrication virtual'],
      ['Foundry 02 · Neuropixels 1.0', '/simulations/neuropixels-foundry/', 'Modeled lithography, deposition, polishing and etching; a blocked via changes synthetic AP and LFP recordings across bank selections.', 'neuropixels 1.0 active cmos, reference process foundry fabrication virtual'],
      ['Foundry 03 · Masmanidis 64D', '/simulations/masmanidis-64d-foundry/', 'All 64 metal paths traced from UCLA’s 2017 reticle, SOI-to-PCB flow, open and nominal signal paths through the published pin mapping.', 'masmanidis 64d passive silicon, open gds foundry fabrication virtual'],
      ['Foundry 04 · Flex-rigid ECoG', '/simulations/flex-rigid-ecog-foundry/', 'Patterning to assembly; one reference line on a 31-channel bank versus the shared-reference case.', 'flex-rigid ecog flexible surface array, 124 recording sites foundry fabrication virtual'],
      ['Foundry 05 · Self-closing nerve cuff', '/simulations/self-closing-cuff-foundry/', 'Build the modeled flexible stack, close it around an inert mandrel, compare curvature, fit and channel continuity.', 'self-closing nerve cuff soft peripheral interface, benchtop model foundry fabrication virtual'],
      ['Foundry 06 · Stentrode research prototype', '/simulations/stentrode-foundry/', 'Reconstructed eight-site scaffold; continuity and geometric seating on an inert test fixture.', 'stentrode research prototype endovascular scaffold, inert fixture foundry fabrication virtual'],
      ['Foundry 07 · TIME-4H', '/simulations/time-4h-foundry/', 'Pattern and fold a modeled flexible circuit; two independent return nets and channel continuity on a benchtop fixture.', 'time-4h folded thin film, ground topology foundry fabrication virtual'],
      ['Foundry 08 · Foundry tool fit', '/simulations/foundry/tool-fit/', 'Check size, resolution and process limits before assigning a register instrument.', 'foundry tool fit equipment compatibility, conditional gates foundry fabrication virtual'],
      ['Foundry 09 · Neuropixels family bench', '/simulations/neuropixels-family/', 'Compare documented shank, site and channel limits across variants and an ideal fault on a synthetic signal.', 'neuropixels family bench active cmos, capacity and routing foundry fabrication virtual'],
      ['Foundry 10 · PtNRGrid', '/simulations/ptnrgrid-foundry/', 'Compare array configurations and registered metal layers; which reconstructions need full-panel support or outside processing.', 'ptnrgrid large-panel thin film, pt-ag dealloying foundry fabrication virtual'],
      ['Foundry 11 · Four-mask mesh electronics', '/simulations/mesh-electronics-foundry/', 'Four separate mask layers; reconstructed conductor paths against connector placement and continuity checks.', 'four-mask mesh electronics su-8 and au, flexible routing foundry fabrication virtual'],
      ['Foundry 12 · Rolled microchannel scaffold', '/simulations/rolled-microchannels-foundry/', '84-lumen geometry versus the 59-lumen configuration; blockage and wire continuity as independent observations.', 'rolled microchannel scaffold passive microfluidics, geometry and continuity foundry fabrication virtual'],
      ['Foundry 13 · Photovoltaic retinal pixel', '/simulations/retinal-photovoltaic-foundry/', 'Published silicon pixel process and ideal photoelectric isolation; PRIMA architecture without assuming its unpublished process.', 'photovoltaic retinal pixel published silicon predecessor, device boundary foundry fabrication virtual'],
      ['Foundry 14 · Process handoff bench', '/simulations/foundry/process-handoff/', 'Why a candidate tool output does not automatically meet the next station’s conditions.', 'process handoff bench manufacturing handoffs, compatibility foundry fabrication virtual'],
      ['Foundry 15 · NeuroGrid and OECT', '/simulations/neurogrid-oect-foundry/', 'Separate the passive electrode stack from an organic-transistor route; ideal impedance and transfer checks.', 'neurogrid and oect passive electrode vs active transistor foundry fabrication virtual'],
      ['Foundry 16 · Utah and Slant geometry', '/simulations/utah-slant-compare/', 'Flat array versus measured slant envelope and modeled length gradients; dicing, isolation and continuity as separate checks.', 'utah and slant geometry bulk silicon, cut geometry foundry fabrication virtual'],
      ['Foundry 17 · Transparent graphene stacks', '/simulations/graphene-stack-compare/', 'Compare distinct published transparent graphene routes and how layer identity changes optical and electrical checks.', 'transparent graphene stacks transfer and direct-growth references foundry fabrication virtual'],
      ];
      return foundryLabs.map(([title, href, summary, keywords]) => ({type: 'Tools', title, href, detail: 'Interactive lab', summary, keywords: keywords.split(' ')}));
    })(),
    ...prototypesRelease.devices.map(device => ({
      type: 'Tools', title: `Prototype ${device.id} · ${device.title}`,
      href: device.href, detail: 'Interactive 3D prototype', summary: device.summary,
      keywords: [device.id, device.title, 'prototype', '3D', 'equipment'],
    })),
    ...[
      ['Cochlear Implant Laboratory', '/simulations/cochlear-implant/', 'Sound processing, finite-contact fields, auditory-nerve cable dynamics and reproducible implant experiments', 'cochlear implant hearing auditory nerve Rattay CIS n-of-m vocoder electrode recruitment spike raster threshold'],
      ['Cochlear Implant Methods and Validation', '/simulations/cochlear-implant/methods/', 'Model equations, independent numerical references, interpretation boundaries and experiment guide', 'cochlear auditory nerve methods validation finite disk Greenwood Rattay pulse charge numerical convergence'],
      ['Retina Laboratory', '/simulations/retinal-implant/', 'Unified electrical, PRIMA photovoltaic and optogenetic experiments, retinal response and published appearance baselines', 'retinal retina epiretinal implant phosphene axon map Argus vision prosthesis pulse2percept charge PRIMA photovoltaic optogenetic bipolar neuron'],
      ['Retinal Models and Verification', '/simulations/retinal-implant/methods/', 'Percept equations, field assumptions, independent references and sampling limits', 'retinal methods numerical verification convergence Watson Jansonius Beyeler Granley field current'],
      ['PRIMA Models and Verification', '/simulations/retinal-implant/prima/methods/', 'Published ProViSim reference, reduced circuit and half-space field assumptions, independent numerical validation', 'PRIMA methods reference validation circuit optical power ProViSim RPSim'],
      ['RPNI Design & Testing Laboratory', '/simulations/rpni-design/', 'Muscle-graft geometry, nerve routing, finite bipolar contacts, synthetic EMG and controlled design studies', 'RPNI regenerative peripheral nerve interface muscle graft motor unit electrode design crosstalk recording oxygen transport'],
      ['RPNI Model and Evidence', '/simulations/rpni-design/methods/', 'Electrical forward model, transport assumptions, primary RPNI studies and numerical verification', 'RPNI methods evidence validation equations muscle graft human rat'],
      ['Biohybrid Neural Interface Laboratory', '/simulations/biohybrid-interface/', 'Active engineered axonal bridge, host–graft synapses, finite electrode contacts and calculated recordings', 'biohybrid living electrode micro-TENN neural tissue graft engineered axon bridge Hodgkin Huxley synapse stimulation recording growth'],
      ['Biohybrid Methods and Validation', '/simulations/biohybrid-interface/methods/', 'Biophysical equations, evidence register, convergence studies and independent NEURON verification', 'biohybrid methods evidence references HH cable finite contact NEURON numerical validation growth limitations'],
      ['Biohybrid Crucial Questions and Answers', '/simulations/biohybrid-interface/questions/', '34 source-backed scientific questions, causal controls, source attribution and the next model-development decisions', 'biohybrid questions answers causal audit synapses off direct activation response sweep graft host recording threshold uncertainty'],
      ['Neural Interface Laboratory', '/cortex/interface/', 'Twelve active human neurons, finite surface contacts, stimulation and ideal recordings', 'cortex integrated neural interface laboratory finite shank electrode membrane voltage replay spike raster'],
      ['Cortex Laboratory', '/cortex/', 'Single active human cell, patch clamp, electrode stimulation and membrane replay', 'cortex laboratory recording stimulation Utah membrane physics finite disk single neuron'],
      ['Whole-Cell Remodeling Laboratory', '/simulations/whole-cell-remodeling/', 'Independent exploratory model of contraction, protrusion, selective waves and structural support', 'whole cell remodeling morphology growth cone neurite mechanics synthetic fluorescence seed experiment'],
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
      ['Laboratory Equipment Register', '/simulations/equipment/', 'Find instruments by research zone, inspect their 3D and simulation plans', 'equipment register instruments laboratory zone patch clamp microscope aligner'],
      ['Crystal Palace shared virtual lab', '/simulations/shared-virtual-lab/', 'One virtual lab plan, three connected experiment routes', 'crystal palace shared lab station experiment route handoff'],
      ['Revised equipment library', '/simulations/equipment/revised/', 'Revised Crystal Palace equipment previews by record, model and zone', 'revised equipment previews crystal palace library'],
      ['Lab updates', '/simulations/equipment/updates/', 'Crystal Palace equipment updates and verified workflows', 'lab updates equipment workflows verified'],
      ['Device foundry', '/simulations/foundry/', 'Virtual fabrication workflows for silicon probes, flexible arrays and peripheral cuffs', 'foundry fabrication virtual labs devices manufacturing'],
      ['Manufacturing workflow atlas', '/simulations/foundry/atlas/', 'Catalog devices, fabrication configurations, register matches and outside-facility steps', 'foundry atlas manufacturing workflow process route catalog'],
      ['Interactive equipment prototypes', '/simulations/equipment/prototypes/', 'Browser-tested interactive 3D teaching prototypes from the equipment register', 'prototypes interactive 3d equipment teaching'],
    ].map(([title, href, summary, keywords]) => ({
      type: 'Tools', title, href, detail: 'Interactive tool', summary, keywords: [keywords],
    })),
  ];
}
