import { companyBriefs } from '../data/company-briefs.js';
import { getDevicePhoto } from './device-photos.js';

// Short display labels drawn from the existing briefs, not new company research.
const topics = {
  2: ['Stentrode', 'Endovascular recording'],
  3: ['Connexus BCI', 'Speech and computer control'],
  5: ['Layer 7 Cortical Interface', 'Cortical surface recording'],
  6: ['Biohybrid interfaces / PRIMA', 'Biohybrid and retinal interfaces'],
  7: ['Graphene neural interfaces', 'Bidirectional neuromodulation'],
  8: ['Fleuron ultrasoft probe', 'Soft neural interfaces'],
  9: ['Brain Interchange', 'Closed-loop neuromodulation'],
  10: ['Flexible implantable BCI', 'Neural and speech decoding'],
  11: ['Beinao-1', 'Intracortical brain interfaces'],
  12: ['Implantable BCI', 'Motor decoding'],
  13: ['Intracortical BCI', 'Clinical translation and decoding'],
  14: ['WIMAGINE', 'Whole-body assistive control'],
  15: ['Microelectrode arrays', 'Robotic arm control'],
  16: ['Utah arrays / neuroprosthetics', 'Neural engineering'],
  17: ['Intracortical and EEG interfaces', 'Neural probes and translation'],
  18: ['BCI / biohybrid interfaces', 'Neuroengineering and decoding'],
  19: ['Recording and modulation', 'Decoding and biomaterials'],
  20: ['Nerve grafts / repair products', 'Peripheral nerve repair'],
  21: ['Intracortical BCI', 'Decoding and clinical translation'],
  22: ['Multimodal bioelectronics', 'Neural measurement and modulation'],
  23: ['Argus II', 'Retinal prostheses'],
  24: ['Orion', 'Visual cortical stimulation'],
  25: ['Silicon probes / electrode arrays', 'Electrophysiology tools'],
  26: ['Ultrasound BCI', 'Brain reading and modulation'],
  27: ['Mesh electronics', 'Injectable neural interfaces'],
  28: ['NeuroGrid', 'Surface electrophysiology'],
  29: ['Speech ECoG / BRAVO', 'Speech neuroprosthetics'],
  30: ['Micro-ECoG', 'Flexible cortical electronics'],
  31: ['NEO', 'Wireless epidural BCI'],
  32: ['Neural dust', 'Ultrasound-powered interfaces'],
  33: ['Neurograins', 'Distributed wireless interfaces'],
  34: ['Soft spinal interfaces', 'Neuroprosthetics'],
  35: ['Nanoelectronic threads', 'Ultraflexible neural recording'],
  36: ['Cochlear / brainstem implants', 'Auditory prostheses'],
  37: ['VNS Therapy', 'Vagus nerve stimulation'],
  38: ['Intracortical BCI', 'Robotic control and tactile feedback'],
  39: ['Modular Prosthetic Limb', 'Prosthetic limb control'],
  40: ['NET / StimNET', 'Multimodal neural interfaces'],
  41: ['PtNRGrid / µSEEG', 'Thin-film surface and depth interfaces'],
  42: ['Neuropixels Quad Base / NXT', 'High-capacity electrophysiology'],
  43: ['Magnetoelectric implants', 'Wireless power and stimulation'],
  44: ['MOTE', 'Optical wireless interfaces'],
  45: ['SCOPe / BISC', 'CMOS optical and electrical interfaces'],
  46: ['Neuropixels Opto', 'Recording and optogenetics'],
  47: ['NET / StimNET', 'Ultraflexible neural interfaces'],
  48: ['Magnetoelectric bioelectronics', 'Wireless power and circuits'],
  49: ['MOTE', 'Miniature optical interfaces'],
  50: ['Neuropixels Opto', 'Recording and optogenetics'],
  51: ['Neuropixels Opto', 'Integrated circuits and photonics'],
  52: ['RNS System', 'Responsive brain stimulation'],
  53: ['Percept / SenSight / Inceptiv', 'Brain and spinal neuromodulation'],
  54: ['Liberta RC / Proclaim XR', 'DBS and spinal cord stimulation'],
  55: ['Vercise Genus / WaveWriter', 'Brain and spinal neuromodulation'],
  56: ['Senza HFX iQ', 'Spinal cord stimulation'],
  57: ['Evoke', 'Closed-loop spinal cord stimulation'],
  58: ['Upper airway stimulation', 'Sleep apnea therapy'],
  59: ['Vagus nerve stimulation', 'Autoimmune neuromodulation'],
  60: ['Sacral neuromodulation', 'Bladder and bowel therapy'],
  61: ['Altius HFAC nerve block', 'Post-amputation pain'],
  62: ['Revi', 'Tibial neuromodulation'],
  63: ['SPRINT', 'Peripheral nerve stimulation'],
  64: ['ARC-IM', 'Implantable spinal stimulation'],
  65: ['Cochlear implant systems', 'Auditory prostheses'],
  66: ['HiRes Ultra 3D', 'Cochlear implants'],
  67: ['Nalu neurostimulation system', 'Peripheral stimulation for pain'],
  68: ['StimRouter', 'Peripheral nerve stimulation'],
  69: ['DOT', 'Therapeutic brain stimulation'],
  70: ['Brain-spine interface', 'Neural rehabilitation'],
  71: ['Cortical visual reconstruction', 'Visual neuroprostheses'],
  72: ['Flexible invasive BCI', 'Neural recording'],
  73: ['Endovascular stent-electrode BCI', 'Interventional brain interfaces'],
  74: ['Cochlear / auditory brainstem implants', 'Auditory prostheses'],
};

export const cleanCompanyTitle = title => title.replace(/^\d+\s*[-—]\s*/, '').replace(/\s*\((?:historical )?(?:company|lab) brief\)$/i, '');

function contentsLabel(title) {
  const label = title.replace(/\s*\([^)]*\)/g, '').trim();
  const patterns = [
    [/^(What they(?:’|')re building|What they (?:are|were) building|The technology)/i, 'The technology'],
    [/^What to watch|^Key questions/i, 'Key questions'],
    [/^How .* fits|^Where .* sits/i, 'The BCI landscape'],
    [/^The big idea/i, 'Biohybrid interfaces'],
    [/^Proof.of.concept/i, 'Preclinical evidence'],
    [/^What else .* PRIMA/i, 'PRIMA'],
    [/^Why .* matters|^Why .* belongs|^Why .* interesting|^Why it.s worth/i, 'Research context'],
    [/^Featured (groups|labs)/i, 'Research groups'],
    [/^Human\/clinical/i, 'Clinical progress'],
    [/^Company activity|^Company notes/i, 'Company direction'],
    [/^Stage and evidence/i, 'Evidence and status'],
    [/^Where the papers/i, 'Research collaborations'],
    [/^Evidence of .* training|^Ecosystem hub/i, 'Training'],
    [/^Institutional signal|^Evidence of active/i, 'Research program'],
    [/^Clean claims/i, 'Evidence'],
    [/^A landmark result/i, 'Handwriting decoding'],
    [/^Related work/i, 'Related work'],
    [/^What the group page/i, 'Research directions'],
  ];
  return patterns.find(([pattern]) => pattern.test(label))?.[1] ?? label;
}

export function linkedDeviceSlugs(body) {
  return [...new Set([...body.matchAll(/\]\(\/devices\/([^/\s)]+)\/?(?:#[^)]+)?\)/g)].map(match => match[1]))];
}

export function getCompanyBrief(entry, formatting, headings, devices) {
  const bespoke = companyBriefs[entry.slug];
  if (bespoke) return { ...bespoke, kind: entry.data.kind, longName: false };
  const name = cleanCompanyTitle(entry.data.title);
  const [platform, focus] = topics[entry.data.order] ?? [devices[0] ? cleanCompanyTitle(devices[0].data.title) : 'Neural interfaces', entry.data.tags.filter(tag => !/^(company|lab|academic|american|european|chinese|other)$/i.test(tag)).slice(0, 3).join(' / ') || 'Neurotechnology'];
  const photoEntry = devices.find(device => getDevicePhoto(device.data.device_id));
  const sections = headings.filter(item => item.depth === 2);
  const companyType = entry.body.match(/\*Company type:\*\s*([^\n]+)/i)?.[1];
  return {
    name,
    kind: entry.data.kind,
    headline: [name],
    longName: name.length > 24,
    deck: entry.data.description ?? '',
    region: { American: 'North America', European: 'Europe', Chinese: 'China' }[entry.data.region] ?? (entry.data.location?.includes('Australia') ? 'Oceania' : 'International'),
    structure: companyType?.replace(/\s*\([^)]*\)/g, '').replace(/\.$/, '') ?? (entry.data.kind === 'Lab' ? 'Research organization' : 'Company'),
    platform,
    focus,
    photoDeviceId: photoEntry?.data.device_id,
    deviceSlug: photoEntry?.slug,
    deviceName: photoEntry ? cleanCompanyTitle(photoEntry.data.title) : undefined,
    photoTitle: photoEntry ? cleanCompanyTitle(photoEntry.data.title) : undefined,
    contents: Object.fromEntries(sections.map(section => [section.slug, contentsLabel(section.text)])),
    sources: (formatting?.sources ?? []).map(source => ({ ...source, section: sections[source.sectionIndex]?.slug ?? 'top-of-brief' })),
  };
}
