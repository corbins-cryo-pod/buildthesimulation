// Editorial relationships, grounded in the primary sources on each device page.
// A family is not a claim that its records are duplicates or interchangeable.
export const deviceFamilies = [
  { id: 'neuropixels', title: 'Neuropixels', featured: 106, members: [106,107,104,83,85,88,4], kind: 'Generations and parallel branches', summary: 'NXT / NP3.0 is the latest announced generation, still a prototype. Opto, Ultra and NHP solve different problems and remain separate branches.', changes: {
    106: 'Prototype: 1,536 channels, with up to 912 assigned to one shank. Purchase availability is a forecast.',
    107: 'Optical branch: electrical recording plus waveguides and 28 optical emitters.',
    104: 'Quad Base: four shanks, 1,536 simultaneous channels, 384 per shank.',
    83: 'Ultra: 6,144 small, densely packed sites, with 384 simultaneous recording channels.',
    85: 'NHP: 45-mm shank, thicker mechanics and 4,416 selectable sites for deep primate access.',
    88: '2.0 alpha: aligned dense sites, one/four-shank options and 384 channels per probe.',
    4: '1.0 baseline: 960 selectable sites and 384 simultaneous channels.'
  } },
  { id: 'utah', title: 'Utah arrays', featured: 1, members: [1,5], kind: 'Parallel structural variants', summary: 'The slanted array targets different depths in peripheral nerves. It does not supersede the standard cortical Utah array.', changes: {
    5: 'Unequal shank lengths sample nerve fascicles at different depths.',
    1: 'Standard silicon-array family for cortical recording and stimulation.'
  } },
  { id: 'net', title: 'Nanoelectronic threads', featured: 98, members: [98,71,27], kind: 'Recording lineage and stimulation branch', summary: 'StimNET is the latest documented branch here, designed for stimulation. Modular NET remains a distinct high-channel-count recording system.', changes: {
    98: '2023: 32 contacts; polyimide and reinforced iridium-oxide contacts for stimulation and recording.',
    71: '2022: eight-shank, 128-channel modules, assembled into distributed recording arrays.',
    27: '2017: NET-50 / NET-10 SU-8 recording threads with eight/four contacts.'
  } },
  { id: 'active-ecog', title: 'Active flexible ECoG', featured: 65, members: [65,29], kind: 'Published hardware lineage', summary: 'The 2014 auditory-cortex configuration is the most recent documented design in this catalog, not a claim about present-day product availability.', changes: {
    65: '2014: 196 sites, 200-µm contacts and 250-µm pitch in a different array layout.',
    29: '2011: 360 sites, 300-µm contacts and 500-µm spacing with active multiplexing.'
  } },
  { id: 'mit-polymer-fiber', title: 'MIT all-polymer drawn fibers', featured: 146, members: [146,143], kind: 'Published hardware lineage', summary: 'The 2017 graphite-polymer design develops the 2015 all-polymer fiber. Tin-wire and hydrogel-hybrid devices are different architectures, not hidden revisions.', changes: {
    146: '2017: graphite-doped conductive polymer, about 4.1× lower sheet resistance; six electrodes, one waveguide and two fluidic channels.',
    143: '2015: two all-polymer cross-section variants with optical, electrical and fluidic functions.'
  } },
  { id: 'cwru-spiral-cuff', title: 'CWRU/Ardiem spiral cuff', featured: 10, members: [10,13], kind: 'Design and sensory-study records', recordsLabel: 'Related study records', summary: 'These sheets cover the same self-sizing cuff design family. The standard four-contact photograph appears once; the sensory study is a deployment record, not a second cuff architecture. The ITIS 33-contact prototype has its own catalog entry.', changes: {
    10: 'Standard self-sizing design family, with the credited four-contact reference photograph.',
    13: 'Upper-limb sensory research deployment; exact participant hardware is not identified by the standard reference photograph.'
  } },
  { id: 'dot-platform', title: 'DOT magnetoelectric platform', featured: 175, members: [175,117], kind: 'Research prototype and clinical program', recordsLabel: 'Related platform records', summary: 'The photograph documents the 2024 research prototype. The Motif program is a separate clinical record; this image does not establish its later implant geometry.', changes: {
    175: 'Motif clinical-program record; use the research gallery only as a dated prototype reference.',
    117: '2024 published research hardware, with the photographed implant and its 10 mm scale.'
  } },
  { id: 'argus-ii', title: 'Argus II', featured: 38, members: [38,165], kind: 'Engineering and regulatory records', recordsLabel: 'Related system records', summary: 'Two sheets document the same Argus II system. The implant gallery appears once on the engineering sheet; the other sheet records regulatory context.', changes: {
    38: 'Engineering sheet and credited implant gallery.',
    165: 'Regulatory evidence sheet for the same system; not a second hardware generation.'
  } },
  { id: 'singer-two-film', title: 'Two-film ME stimulators', featured: 129, members: [129,128], kind: 'Two configurations in one 2020 study', summary: 'The fully implanted PZT assembly is highlighted. The external PVDF headstage is a different configuration, not an earlier publication or an obsolete product.', changes: {
    129: 'Fully implanted PZT/Metglas assembly with stereotrode; 175 mm³ whole assembly.',
    128: 'External PVDF/Metglas headstage connected to an implanted array; 500 mm³ whole assembly.'
  } }
];
export function getDeviceFamily(order) {
  return deviceFamilies.find(family => family.members.includes(Number(order))) ?? null;
}
export function groupDeviceEntries(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const family = getDeviceFamily(entry.order);
    const key = family?.id ?? entry.slug;
    if (!groups.has(key)) groups.set(key, {family, entries: []});
    groups.get(key).entries.push(entry);
  }
  return [...groups.values()].map(group => ({...group,
    representative: group.entries.find(entry => entry.order === group.family?.featured) ?? group.entries[0]
  }));
}
