// Versioned geometry definitions. All dimensions and site coordinates are mm.
// Keep electrical channel selection separate from physical contact locations.
const utahSource = { label: 'Blackrock — Utah Array specifications and photographs', url: 'https://blackrockneurotech.com/products/utah-array/' };
const slantSource = { label: 'Blackrock — Slant Array specifications and side view', url: 'https://blackrockneurotech.com/products/slant-array/' };
export const deviceModels = {
  'BTSD-ACAD-0068': {
    id: 'neuropixels-opto-electrical-window', revision: 1, deviceId: 'BTSD-ACAD-0068', kind: 'surface-grid',
    name: 'Neuropixels Opto · electrical recording window', slug: '107-neuropixels-opto-photonic-prototype',
    physicalSites: 960, simultaneousChannels: 384, rows: 480, columns: 2,
    rowPitch: 0.02, columnPitch: 0.048, pitch: 0.02, siteSize: 0.012,
    thickness: 0.033, width: 0.07, length: 9.6,
    specs: [['Modeled crop', 'Two columns of 480 electrical contacts; optics omitted'], ['Physical sites / simultaneous channels', '960 / 384; no channel map'], ['Contact size', '12 × 12 µm TiN'], ['Along-row / between-column pitch', '20 µm / 48 µm'], ['Crop envelope / thickness', '70 µm × 9.6 mm / 33 µm'], ['Not modeled', 'Tip, base, emitters, waveguides, fibers, layers and thermal effects']],
    notes: 'Electrical contact window only, not the complete optical probe. The 2026 paper defines 960 TiN contacts in two columns of 480, at 20 µm along-shank pitch and 48 µm between columns. All contacts are 12 × 12 µm. The 70 µm width and 33 µm total shank thickness are reported; the 9.6 mm length is a recording-window crop with half-row-pitch margins, not the 10 mm full shank. Contact-face extents are 60 µm × 9.592 mm. Positions use a centered local crop coordinate system, not coordinates relative to the unknown tip origin. The 14 blue and 14 red optical emitters, photonic waveguides, tip, base, cables, internal layers and coating texture are omitted. Gold marks electrical contacts only. Geometric site IDs are not acquisition channel IDs. The 384 selectable channels are separate from 960 available sites. No optical fields, electrical fields, tissue response or thermal prediction is implemented.',
    sources: [{ label: 'Lakunina et al. (2026), Results, Figure 1 and fabrication methods', url: 'https://www.nature.com/articles/s41592-026-03076-z' }, { label: 'Published Supplementary Table 2, prototype dimensions', url: 'https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41592-026-03076-z/MediaObjects/41592_2026_3076_MOESM1_ESM.pdf' }], references: [],
  },
  'BTSD-ACAD-0056': {
    id: 'neuropixels-ultra-dense-window', revision: 1, deviceId: 'BTSD-ACAD-0056', kind: 'surface-grid',
    name: 'Neuropixels Ultra · 384-site dense window', slug: '83-neuropixels-ultra-high-density-probe',
    physicalSites: 384, simultaneousChannels: 384, rows: 48, columns: 8,
    pitch: 0.006, siteSize: 0.005, thickness: 0.024, width: 0.048, length: 0.288,
    specs: [['Modeled crop', '48 × 8 dense window; 384 contact faces'], ['Complete device', '6,144 available sites; 384 simultaneous channels'], ['Contact size / pitch', '5 × 5 µm / 6 µm centers'], ['Crop envelope', '48 × 288 µm with half-pitch margins'], ['Silicon thickness', '24 µm from NP 1.0 datasheet; Ultra reports identical shank form'], ['Not modeled', 'Full shank, tip, base, traces and switch/channel map']],
    notes: 'A flat cropped dense recording window, not the complete 6,144-site probe. The primary paper specifies 5 × 5 µm contacts at 6 µm center pitch and a 48 × 8 simultaneous dense configuration. Half-pitch margins define the 48 × 288 µm crop; contact-face outer extents are 47 × 287 µm. The silicon thickness is 24 µm from the NP 1.0 datasheet, which Ultra explicitly says has identical shank form. No tip position or probe-base origin is inferred. Full 768 × 8 site array, 10 mm shank, reference pad, switch groups, acquisition map, headstage and TiN surface texture are omitted. Exported IDs identify only geometric contact centers in this crop; they are not acquisition channel IDs. This model does not implement neural recording or electrical field simulation.',
    sources: [{ label: 'Ye et al. (2025), NP Ultra geometry and dense configuration', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12981004/' }, { label: 'Neuropixels 1.0 datasheet, thickness; Ultra reports identical shank form', url: 'https://www.neuropixels.org/_files/ugd/832f20_4a14406ba1204e60ae8534b09e201b49.pdf' }],
    references: [],
  },

  'BTSD-ACAD-0051': {
    id: 'ptnrgrid-1024-recording-patch', revision: 1, deviceId: 'BTSD-ACAD-0051', kind: 'surface-grid',
    name: 'PtNRGrid · 1,024-site recording patch', slug: '74-ptnrgrid-platinum-nanorod-surface-arrays',
    physicalSites: 1024, simultaneousChannels: null, rows: 32, columns: 32,
    pitch: 1, siteSize: 0.03, siteShape: 'circle', siteDepth: 0.002,
    thickness: 0.0066, width: 32, length: 32,
    specs: [['Modeled layout', '32 × 32 contacts, Figure 1C'], ['Contact diameter / pitch', '30 µm / 1 mm'], ['Parylene film / contact recess', '6.6 µm / approximately 2 µm'], ['Recording coverage', '32 × 32 mm cropped patch'], ['Not modeled', 'Perfusion holes, trace routes, cable, PCB and nanorod texture']],
    notes: 'Flat recording-patch reference for the 1,024-channel, 1 mm-pitch layout in Figure 1C. The 32 × 32 arrangement is stated in the figure; the 32 mm square uses the reported sensing coverage as a crop, not a recovered full outline. Circular contact faces are 30 µm across and recessed approximately 2 µm below the 6.6 µm film surface. The local circular wells are schematic openings at the contact diameter, not a recovered sidewall profile. Perfusion holes, gold interconnects, nanorod texture, cable, PCB, connector and cortical curvature are omitted. All contact coordinates are reconstructed from the regular layout; no acquisition map is inferred.',
    sources: [{ label: 'Tchoe et al. (2022), fabrication and Figure 1C', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9650779/' }],
    references: [{ label: 'Published PtNRGrid layouts, Figure 1', url: 'https://cdn.ncbi.nlm.nih.gov/pmc/blobs/2cf8/9650779/8e2a080ff0ff/nihms-1843201-f0001.jpg' }],
  },
  'BTSD-ACAD-0044': {
    id: 'active-microecog-196-recording-patch', revision: 1, deviceId: 'BTSD-ACAD-0044', kind: 'surface-grid',
    name: 'Active micro-ECoG · 196-site recording patch', slug: '65-active-microecog-auditory-cortex-array',
    physicalSites: 196, simultaneousChannels: null, rows: 14, columns: 14,
    pitch: 0.25, siteSize: 0.2, thickness: 0.025, width: 3.5, length: 3.5,
    specs: [['Physical sites / interface wires', '196 / 29; active multiplexing'], ['Layout', '14 × 14 sites, 250 µm center pitch'], ['Site size', '200 × 200 µm'], ['Recording-area envelope', 'Approximately 3.5 × 3.5 mm'], ['Multilayer thickness', 'Approximately 25 µm'], ['Omitted hardware', 'Switching layers, full film outline and cable']],
    notes: 'Flat recording-patch reference for the 2014 auditory-cortex array. Site count, matrix, pitch, size and multilayer thickness come from the paper. The 3.5 mm square uses the reported approximate recording-area envelope as a crop, not a recovered full film outline. Platinum contact faces are shown as surfaces without adding thickness above the published multilayer total. Switching electronics, interconnects, flexible cable and curved cortical placement are omitted. Electrical channel timing and tissue response are not modeled.',
    sources: [{ label: 'Escabí et al. (2014), electrode fabrication and Figure 1', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4137255/' }], references: [],
  },
  'BTSD-ACAD-0004': {
    id: 'neurograin-packaged-envelope', revision: 1, deviceId: 'BTSD-ACAD-0004', kind: 'chip-envelope',
    name: 'Neurograin · packaged chip envelope', slug: '25-neurograins-wireless-microimplant-network',
    physicalSites: 0, simultaneousChannels: null, width: 0.65, length: 0.65, thickness: 0.25,
    specs: [['Modeled structure', 'One packaged chiplet; no electrode geometry'], ['Packaged dimensions', '650 × 650 × 250 µm, Figure 1'], ['Bare stimulating ASIC', '500 × 500 µm, Figure 2; thickness not given'], ['Not modeled', 'Contact pads, coil, microwire, hub and network placement']],
    notes: 'A dimensioned package envelope, not a complete electrode model. Figure 1 gives 650 × 650 × 250 µm chiplets; Figure 2 gives a 500 × 500 µm stimulating ASIC. These are different reported structures, not interchangeable sizes. The plain cuboid preserves only the packaged dimensions. Contact pad geometry, internal coil, surface topography, optional stimulation microwire and hub are omitted. Zero exported sites means no site coordinates have been reconstructed, not that the device has no electrodes.',
    sources: [{ label: 'Lee et al. (2021), packaged chiplets in Figure 1', url: 'https://www.nature.com/articles/s41928-021-00631-8/figures/1' }, { label: 'Lee et al. (2021), stimulating ASIC in Figure 2', url: 'https://www.nature.com/articles/s41928-021-00631-8/figures/2' }], references: [],
  },
  'BTSD-ACAD-0005': {
    id: 'carbon-fiber-eight-fiber-row', revision: 1, deviceId: 'BTSD-ACAD-0005', kind: 'carbon-row',
    name: 'Carbon fiber · eight-fiber row', slug: '26-carbon-fiber-electrode-arrays-michigan',
    physicalSites: 8, simultaneousChannels: null, pitch: 0.1537, diameter: 0.0084, coreDiameter: 0.0068, length: 4.5,
    specs: [['Modeled structure', 'One eight-fiber row, not the full dual-sided board'], ['Coated / bare diameter', '8.4 / 6.8 µm'], ['Pitch', '153.7 ± 1 µm measured; 152.4 µm board design'], ['Fiber length', '4.5 mm nominal within reported 4-5 mm range'], ['Tip interface', 'Cut carbon face; PEDOT:pTS thickness unknown'], ['Not modeled', 'PCB, second row, PEG and silicon supports']],
    notes: 'One straight eight-fiber row at the measured mean pitch. The paper describes eight board traces per side, a 6.8 µm carbon core and 800 nm radial parylene-C coating, yielding an 8.4 µm outer diameter. Length is a nominal 4.5 mm within the 4-5 mm chronic-array range, not a measured individual probe. Flat cut tips are shown at the core diameter; PEDOT:pTS topography and electrochemical area are unknown. Board geometry, opposite row spacing, PEG insertion coating, silicon supports, wire connections and implanted pose are omitted. Contact area is exported as unknown.',
    sources: [{ label: 'Patel et al. (2015), fabrication and chronic-array methods', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4789140/' }], references: [],
  },
  'BTSD-ACAD-0003': {
    id: 'neurogrid-256-recording-patch', revision: 1, deviceId: 'BTSD-ACAD-0003', kind: 'surface-grid',
    name: 'NeuroGrid · 256-site recording patch', slug: '24-neurogrid-pedot-pss-surface-array',
    physicalSites: 256, simultaneousChannels: null, rows: 16, columns: 16,
    pitch: 0.03, siteSize: 0.01, thickness: 0.004, width: 0.48, length: 0.48,
    specs: [['Physical electrodes', '256-site version in Figure 1'], ['Site size', '10 × 10 µm'], ['Inter-electrode spacing', '30 µm, modeled as center pitch'], ['Film thickness', '4 µm'], ['Reconstructed patch', '16 × 16 sites; 480 × 480 µm cropped film'], ['Not modeled', 'Interconnects, bonding pads and full film outline']],
    notes: 'Recording patch only, laid flat. Published site size, spacing and film thickness are preserved. The 16 × 16 layout is reconstructed from the 256-site figure, not a recovered fabrication mask. The 480 µm square film boundary is a crop with a half-pitch margin, not the device outline. Interconnects, bonding pads, connector and curved cortical pose are omitted. Contact layer thickness and electrical channel map are unknown. No electrical or tissue-response model is supplied.',
    sources: [{ label: 'Khodagholy et al. (2015), Figure 1 and NeuroGrid design', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4308485/' }],
    references: [{ label: 'Published NeuroGrid photograph and 256-site micrograph', url: 'https://cdn.ncbi.nlm.nih.gov/pmc/blobs/c8a2/4308485/03ccdbc32c21/nihms-645113-f0001.jpg' }],
  },
  'BTSD-IMBCI-0010': {
    id: 'connexus-421-cortical-reference', revision: 1, deviceId: 'BTSD-IMBCI-0010', kind: 'connexus',
    name: 'Paradromics Connexus · 421-site reference', slug: '09-paradromics-connexus-acute-first-in-human',
    physicalSites: 421, simultaneousChannels: null,
    diameter: 10, bodyThickness: 1.5, ceramicDiameter: 8,
    pitch: 0.3, length: 1.5, shaftDiameter: 0.04, tipLength: 0.08,
    latticeRadiusSquared: 130,
    specs: [['Physical electrodes', '421 microwires'], ['Pitch / insertion depth', '300 µm / 1.5 mm — manufacturer reported'], ['Module diameter', 'Approximately 10 mm — nominal envelope'], ['Wire diameter', '40 µm visualization bound; older source reports <40 µm'], ['Reconstructed details', 'Array boundary, 1.5 mm housing thickness and tip shape'], ['Electrical contact area / channel map', 'Unknown; exported as null']],
    notes: 'Circular module reference guided by the 2024 manufacturer photograph. Count, pitch and depth follow public descriptions; the 421-point circularly cropped square lattice is a reconstruction, not a released contact map. A 10 mm envelope represents “about a centimeter”; housing thickness, ceramic face and 80 µm highlighted tip regions are illustrative. The 40 µm shafts use an upper-bound reference from older technical slides (<40 µm), not a measured current diameter. Those 2023 slides show a different, square package; its 9 mm dimension is not applied to this circular model. Exposed tip area, channel mapping, lead and internal electronics are not modeled.',
    sources: [
      { label: 'Paradromics — Connexus: 421 electrodes and 1.5 mm depth', url: 'https://paradromics.com/connexus/' },
      { label: 'Paradromics (2026) — 300 µm electrode spacing', url: 'https://paradromics.com/blog/paradromics-sfn-part-2/' },
      { label: 'Paradromics (2024) — circular, approximately 1 cm cortical module', url: 'https://paradromics.com/blog/neurotech-that-lasts/' },
      { label: 'Paradromics technical slides (2023), slide 71 — older package and <40 µm PtIr wires', url: 'https://www.bis.gov/media/documents/brain-computer-interface-export-controls-bci-day-1-.pdf' },
    ],
    references: [{ label: 'Paradromics — circular cortical module photograph (2024)', url: 'https://paradromics.com/wp-content/uploads/2024/05/Cortical-Module-Close-Up_Paradromics_2-copy.jpg' }],
  },
  'BTSD-0002': {
    id: 'neuralink-n1-64x16-2024-reference', revision: 1, deviceId: 'BTSD-0002', kind: 'neuralink',
    name: 'Neuralink N1 · 64 × 16 · 2024 reference', slug: '02-neuralink-n1',
    physicalSites: 1024, simultaneousChannels: 1024,
    threadCount: 64, sitesPerThread: 16, sitePitch: 0.2,
    threadMinWidth: 0.016, threadMaxWidth: 0.084, threadThickness: 0.0044,
    diameter: 24, bodyThickness: 9,
    fanPitch: 0.22, entryPitch: 0.085, threadStartY: 11.9, contactStartY: 20, threadEndY: 23.6, threadEndZ: 1.5,
    firstSiteOffset: 0.2, visualContactWidth: 0.012, visualContactLength: 0.02,
    specs: [['Physical sites', '1,024 · 64 threads × 16 sites'], ['Along-thread pitch', '200 µm — 2024 engineering interview'], ['Thread width / thickness', '16–84 µm / 4.4 µm stack described in interview'], ['Enclosure', 'Quarter-sized, about 9 mm thick; modeled at 24 × 9 mm'], ['Display pose', 'Unfurled fan; illustrative routing and thread spacing'], ['Contact shape / exposed area', '12 × 20 µm visual markers; actual area unknown'], ['Other described configuration', '128 threads × 8 sites (UCLH GB-PRIME); not modeled here'], ['Power', 'Skull-mounted, wireless, rechargeable (ClinicalTrials.gov); coil geometry not published in the sources used']],
    notes: 'Named 64-thread configuration described in 2024, not every N1 generation. UCLH later describes 128 threads × 8 sites. The fan is an unimplanted display pose, not a cortical placement map. 24 mm diameter approximates the quarter-sized enclosure; rim details, fan length, taper progression, spacing and 12 × 20 µm gold site markers are illustrative. The 4.4 µm thickness is the sum of the interview’s 2 µm polymer + 0.4 µm metal + 2 µm polymer layers. ClinicalTrials.gov describes the implant as skull-mounted, wireless and rechargeable, so it has a charging coil, but none of the cited sources gives its size or position, so no coil is drawn. UCLH describes the enclosure as the size of a ten-pence coin (about 24 mm), consistent with the modeled diameter. Actual contact shape/area, insertion loops, individual metal traces and internal electronics are unresolved. Camera detail views retain physical scale. Site IDs are geometric labels, not acquisition channel assignments.',
    sources: [
      { label: 'Neuralink — PRIME Study Progress Update (April 2024): 64 threads, 1,024 electrodes', url: 'https://neuralink.com/updates/prime-study-progress-update/' },
      { label: 'DJ Seo, Neuralink engineering interview (2024), 02:03–02:15 — pitch, thread stack and enclosure', url: 'https://lexfridman.com/elon-musk-and-neuralink-team-transcript/' },
      { label: 'ClinicalTrials.gov NCT06429735 — PRIME: N1 described as skull-mounted, wireless, rechargeable', url: 'https://clinicaltrials.gov/study/NCT06429735' },
      { label: 'UCLH (2025) — separately described 128 × 8 trial configuration', url: 'https://www.uclh.nhs.uk/news/uclh-evaluate-safety-and-functionality-neuralinks-brain-computer-interface-bci-technology' },
    ],
    references: [{ label: 'Neuralink — N1 exploded view from the 2024 PRIME update', url: 'https://cdn.buttercms.com/HsyAIkHURhOFMwmjO16q' }],
  },
  'BTSD-0003': {
    id: 'stentrode-16-500um-reference', revision: 2, deviceId: 'BTSD-0003', kind: 'stentrode',
    name: 'Synchron Stentrode · 16-contact reference', slug: '03-stentrode-synchron',
    physicalSites: 16, simultaneousChannels: 15,
    length: 40, diameter: 8, electrodeDiameter: 0.5,
    latticeRows: 20, latticeColumns: 6, strutWidth: 0.08, strutThickness: 0.04,
    contactThickness: 0.05, contactMountDiameter: 0.68, firstContactRow: 2, leadLength: 12, leadDiameter: 0.5,
    specs: [['Physical contacts', '16 platinum electrodes · one used as reference in the study'], ['Reference scaffold', '40 mm long × 8 mm diameter'], ['Contact diameter', '500 µm — Kacker et al. (2025)'], ['Published spacing', 'Approximately 3 mm; exact map unavailable'], ['Revision 2', 'Curved flat struts, contact mounts and schematic lead stub'], ['State', 'Nominal expanded reference; no vessel deformation']],
    notes: 'Named Kacker et al. (2025) reference, with 15 recording signals and one reference electrode; channel assignments remain unknown. Revision 2 uses curved flat struts and annular contact mounts guided by the manufacturer close-up. Lattice topology, 80 × 40 µm strut section, 680 µm mounts, 50 µm contact thickness and the 12 mm × 0.5 mm lead stub are illustrative. The staggered contact map is reconstructed. Nominal diameter is not a vessel-constrained deployment. The derived 0.196 mm² face area differs from SWITCH’s separately reported 0.3 mm² and a later preprint’s 300 µm disks. Internal wiring, delivery system and chest telemetry are omitted. Gold highlights electrodes.',
    sources: [
      { label: 'Kacker et al. (2025) — device dimensions, section 2.2 and Figure 1', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11956166/' },
      { label: 'University of Melbourne — full paper PDF', url: 'https://minerva-access.unimelb.edu.au/server/api/core/bitstreams/57a1e343-1a2d-4651-9380-1957524f0a05/content' },
      { label: 'SWITCH study (2023) — separately reported contact area', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9857731/' },
      { label: 'Schone et al. (2025 preprint) — separately reported 300 µm contacts', url: 'https://www.medrxiv.org/content/10.1101/2025.09.19.25335875v1.full' },
    ],
    references: [{ label: 'Synchron — electrode close-up and research library', url: 'https://synchron.com/research' }, { label: 'Synchron — contact mount and curved strut photograph', url: 'https://cdn.sanity.io/images/e828r2sn/production/5cfebc7a8c391f90bfffba4ffd35cc02d654c82a-2400x1600.jpg' }],
  },
  'BTSD-0001': {
    id: 'utah-10x10-1p5', revision: 1, deviceId: 'BTSD-0001', kind: 'utah',
    name: 'Utah Array · 10 × 10 · 1.5 mm',
    slug: '01-utah-microelectrode-array',
    physicalSites: 100, simultaneousChannels: 96,
    rows: 10, columns: 10, pitch: 0.4, baseWidth: 4, baseThickness: 0.2,
    minLength: 1.5, maxLength: 1.5, shaftRadius: 0.04, tipLength: 0.08,
    specs: [['Physical shanks', '100 (10 × 10)'], ['Wired channels', 'Typically 96; map not assigned'], ['Pitch', '400 µm center to center'], ['Substrate', '4 × 4 × 0.2 mm'], ['Shank length', '1.5 mm selected variant']],
    notes: 'Published pitch, footprint, substrate thickness and selected shank length. Shaft radius (40 µm), taper and 80 µm colored tip region are illustrative, not measured contact area. All 100 physical shanks are shown; no acquisition channel map is inferred. Leads and connector are omitted.',
    sources: [utahSource],
    references: [{ label: 'Manufacturer 10 × 10 array photograph', url: 'https://blackrockneurotech.com/wp-content/uploads/Array-edges-e1691617416409.jpg' }],
  },
  'BTSD-0005': {
    id: 'usea-10x10-0p5-1p5', revision: 1, deviceId: 'BTSD-0005', kind: 'utah',
    name: 'Utah Slanted Array · 0.5–1.5 mm',
    slug: '05-utah-slanted-electrode-array-usea',
    physicalSites: 100, simultaneousChannels: null,
    rows: 10, columns: 10, pitch: 0.4, baseWidth: 4, baseThickness: 0.2,
    minLength: 0.5, maxLength: 1.5, shaftRadius: 0.04, tipLength: 0.08,
    specs: [['Physical shanks', '100 (10 × 10)'], ['Pitch', '400 µm center to center'], ['Length gradient', '0.5–1.5 mm, linear by column'], ['Substrate', '4 × 4 × 0.2 mm (family assumption)'], ['Wired channels', 'Configuration-dependent; not assigned']],
    notes: 'Uses the manufacturer’s 0.5–1.5 mm feature description; its specification table separately lists custom 0.75–1.5 mm lengths. The exact ten-column progression is an idealization. Substrate dimensions follow the Utah family; shaft radius, taper and colored tip region are illustrative. Leads and connector are omitted.',
    sources: [slantSource, utahSource],
    references: [{ label: 'Manufacturer slanted-array side-view rendering', url: 'https://blackrockneurotech.com/wp-content/uploads/2023/04/1-Slant_Array_Electrode_Longevity_Array.png' }],
  },
  'BTSD-0004': {
    id: 'neuropixels-1p0-shank', revision: 1, deviceId: 'BTSD-0004', kind: 'neuropixels',
    name: 'Neuropixels 1.0 · recording shank',
    slug: '04-neuropixels-probe',
    physicalSites: 960, simultaneousChannels: 384,
    length: 10, width: 0.07, thickness: 0.024,
    siteSize: 0.012, rowPitch: 0.02, columnPitch: 0.016, firstSiteFromTip: 0.2,
    specs: [['Physical sites / simultaneous channels', '960 / 384'], ['Shank', '10 mm × 70 µm × 24 µm'], ['Contact size', '12 × 12 µm (144 µm²)'], ['Layout', '4 staggered columns, 2 sites per row'], ['Pitch', '20 µm between rows; 16 µm between column positions']],
    notes: 'Neuropixels 1.0 only; research recording probe. True-scale shank and sites. The 200 µm tip-to-first-row offset and tip outline are approximations. All 960 sites are shown; the selectable 384-channel mapping is not modeled. External base electronics, flex cable and headstage are omitted. Use Tip detail to see contacts at true scale.',
    sources: [
      { label: 'Neuropixels — 1.0 probe specifications and gallery', url: 'https://www.neuropixels.org/probe1-0' },
      { label: 'Steinmetz et al. (2021) — NP 1.0 / 2.0 geometry comparison', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8244810/' },
      { label: 'Allen Institute — contact geometry', url: 'https://allenswdb.github.io/background/neuropixels-description.html' },
    ],
    references: [{ label: 'Neuropixels Central — 1.0 product photograph', url: 'https://www.neuropixelscentral.org/neuropixels1' }],
  },
};

export function getDeviceModel(deviceId) { return deviceModels[deviceId] ?? null; }

// A presentation pose, never a patient-specific implantation trajectory.
export function getNeuralinkThread(model, thread) {
  const index = thread - (model.threadCount - 1) / 2;
  return { entryX: index * model.entryPitch, exitX: index * model.fanPitch };
}

// Right-handed local coordinates: substrate/tip plane is XY; insertion is +Z.
// Utah origin: center of substrate tissue-facing surface. NP origin: shank base.
export function getContactGeometry(model) {
  const sites = [];
  if (model.kind === 'chip-envelope') {
    // No contact geometry has been recovered from the package dimensions.
  } else if (model.kind === 'carbon-row') {
    for (let i = 0; i < model.physicalSites; i++) sites.push({ id: `site-${i}`, positionMm: [(i - (model.physicalSites - 1) / 2) * model.pitch, 0, model.length], normal: [0, 0, 1], channel: null, contactAreaMm2: null, positionMeaning: 'nominal cut tip center; coating geometry unknown' });
  } else if (model.kind === 'surface-grid') {
    for (let row = 0; row < model.rows; row++) for (let col = 0; col < model.columns; col++) {
      sites.push({ id: `r${row}-c${col}`, positionMm: [(col - (model.columns - 1) / 2) * (model.columnPitch ?? model.pitch), (row - (model.rows - 1) / 2) * (model.rowPitch ?? model.pitch), model.siteDepth ? -model.siteDepth : 0], normal: [0, 0, 1], channel: null, contactAreaMm2: model.siteShape === 'circle' ? Math.PI * (model.siteSize / 2) ** 2 : model.siteSize ** 2, positionMeaning: 'contact center in reconstructed flat recording patch; depth relative to film surface' });
    }
  } else if (model.kind === 'utah') {
    for (let row = 0; row < model.rows; row++) {
      for (let col = 0; col < model.columns; col++) {
        sites.push({ id: `r${row}-c${col}`, positionMm: [
          (col - (model.columns - 1) / 2) * model.pitch,
          (row - (model.rows - 1) / 2) * model.pitch,
          model.minLength + (model.maxLength - model.minLength) * col / (model.columns - 1),
        ], channel: null, contactAreaMm2: null, positionMeaning: 'shank apex; exposed-region centroid unknown' });
      }
    }
  } else if (model.kind === 'neuropixels') {
    for (let row = 0; row < model.physicalSites / 2; row++) {
      for (let side = 0; side < 2; side++) {
        const col = side * 2 + row % 2;
        sites.push({ id: `site-${row * 2 + side}`, positionMm: [
          (col - 1.5) * model.columnPitch, -model.thickness / 2,
          model.length - model.firstSiteFromTip - row * model.rowPitch,
        ], channel: null, contactAreaMm2: model.siteSize ** 2, positionMeaning: 'contact center' });
      }
    }
  } else if (model.kind === 'connexus') {
    const limit = Math.floor(Math.sqrt(model.latticeRadiusSquared));
    for (let row = -limit; row <= limit; row++) {
      for (let col = -limit; col <= limit; col++) {
        if (row * row + col * col > model.latticeRadiusSquared) continue;
        sites.push({ id: `site-${sites.length}`, latticeIndex: [col, row], positionMm: [col * model.pitch, row * model.pitch, model.length],
          channel: null, contactAreaMm2: null, positionMeaning: 'microwire apex in reconstructed circular lattice; exposed-region centroid unknown' });
      }
    }
  } else if (model.kind === 'neuralink') {
    for (let thread = 0; thread < model.threadCount; thread++) {
      const { exitX } = getNeuralinkThread(model, thread);
      for (let contact = 0; contact < model.sitesPerThread; contact++) {
        sites.push({ id: `site-${thread * model.sitesPerThread + contact}`, threadIndex: thread, contactIndex: contact,
          positionMm: [exitX, model.contactStartY + model.firstSiteOffset + contact * model.sitePitch, model.threadEndZ + model.threadThickness / 2],
          normal: [0, 0, 1], channel: null, contactAreaMm2: null,
          visualizationSizeMm: [model.visualContactWidth, model.visualContactLength],
          positionMeaning: 'illustrative pad center in unfurled display pose; not a cortical implantation coordinate' });
      }
    }
  } else if (model.kind === 'stentrode') {
    for (let i = 0; i < model.physicalSites; i++) {
      const row = model.firstContactRow + i;
      const angle = (row % 2) * Math.PI / model.latticeColumns;
      const normal = [Math.cos(angle), Math.sin(angle), 0];
      const radius = model.diameter / 2 + model.strutThickness / 2 + model.contactThickness;
      sites.push({ id: `site-${i}`, positionMm: [radius * normal[0], radius * normal[1], row * model.length / model.latticeRows],
        normal, channel: null, contactAreaMm2: Math.PI * (model.electrodeDiameter / 2) ** 2,
        areaMeaning: 'derived circular face area, not measured electrochemical area',
        positionMeaning: 'illustrative outward-facing disk center; not a manufacturer contact map' });
    }
  } else throw new Error(`Unsupported model kind: ${model.kind}`);
  return sites;
}

export function exportGeometry(model) {
  return { schemaVersion: 1, units: 'mm', coordinateSystem: model.id === 'neuropixels-opto-electrical-window' ? 'right-handed; electrical crop rows +Y, columns +X, surface normal +Z; not tip-relative or an implanted pose' : model.kind === 'stentrode' ? 'right-handed; scaffold longitudinal axis +Z; radial outward normals' : model.kind === 'neuralink' ? 'right-handed; display fan extends +Y; pad normals +Z; not an implanted pose' : 'right-handed; insertion +Z; see origin',
    origin: model.kind === 'chip-envelope' ? 'center of package; no implant pose or electrode coordinates' : model.kind === 'carbon-row' ? 'center of row at fiber roots; straight fibers extend +Z' : model.kind === 'surface-grid' ? 'center of flat recording face; film occupies negative Z' : model.kind === 'stentrode' ? 'center of proximal scaffold end; scaffold Z=0 to length; illustrative lead extends into negative Z' : ['utah', 'connexus'].includes(model.kind) ? 'center of tissue-facing substrate surface' : model.kind === 'neuralink' ? 'center of thread-facing enclosure surface; enclosure occupies negative Z' : 'center of shank base',
    model, sites: getContactGeometry(model),
    simulationNote: 'Geometric reference only. Assign channels, transform to tissue coordinates and supply a validated electrical model before simulation. Null area/channel values are unknown, not zero.' };
}
