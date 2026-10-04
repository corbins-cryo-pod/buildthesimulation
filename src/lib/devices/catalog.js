// Versioned geometry definitions. All dimensions and site coordinates are mm.
// Keep electrical channel selection separate from physical contact locations.
const utahSource = { label: 'Blackrock — Utah Array specifications and photographs', url: 'https://blackrockneurotech.com/products/utah-array/' };
const slantSource = { label: 'Blackrock — Slant Array specifications and side view', url: 'https://blackrockneurotech.com/products/slant-array/' };
export const deviceModels = {
  'BTSD-0003': {
    id: 'stentrode-16-500um-reference', revision: 1, deviceId: 'BTSD-0003', kind: 'stentrode',
    name: 'Synchron Stentrode · 16-contact reference', slug: '03-stentrode-synchron',
    physicalSites: 16, simultaneousChannels: 16,
    length: 40, diameter: 8, electrodeDiameter: 0.5,
    latticeRows: 20, latticeColumns: 6, strutRadius: 0.04,
    contactThickness: 0.05, firstContactRow: 2,
    specs: [['Physical contacts', '16 platinum electrodes'], ['Reference scaffold', '40 mm long × 8 mm diameter'], ['Contact diameter', '500 µm — Kacker et al. (2025)'], ['Published spacing', 'Approximately 3 mm; exact map unavailable'], ['Modeled layout', 'Illustrative staggered strip on cylindrical lattice'], ['State', 'Nominal expanded reference; no vessel deformation']],
    notes: 'Named reference configuration from Kacker et al. (2025), not a universal or current production specification. Lattice topology, 80 µm strut diameter, 50 µm contact thickness and exact contact positions are illustrative. Deployed diameter depends on vessel constraint. The 500 µm disks have a derived face area of 0.196 mm²; this is not the 0.3 mm² area reported separately by SWITCH, or the 300 µm diameter in a later preprint. Leads, insulation, delivery system and chest telemetry are omitted. Gold highlights contacts, not their real material color.',
    sources: [
      { label: 'Kacker et al. (2025) — device dimensions, section 2.2 and Figure 1', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11956166/' },
      { label: 'University of Melbourne — full paper PDF', url: 'https://minerva-access.unimelb.edu.au/server/api/core/bitstreams/57a1e343-1a2d-4651-9380-1957524f0a05/content' },
      { label: 'SWITCH study (2023) — separately reported contact area', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9857731/' },
      { label: 'Schone et al. (2025 preprint) — separately reported 300 µm contacts', url: 'https://www.medrxiv.org/content/10.1101/2025.09.19.25335875v1.full' },
    ],
    references: [{ label: 'Synchron — electrode close-up and research library', url: 'https://synchron.com/research' }],
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

// Right-handed local coordinates: substrate/tip plane is XY; insertion is +Z.
// Utah origin: center of substrate tissue-facing surface. NP origin: shank base.
export function getContactGeometry(model) {
  const sites = [];
  if (model.kind === 'utah') {
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
  } else if (model.kind === 'stentrode') {
    for (let i = 0; i < model.physicalSites; i++) {
      const row = model.firstContactRow + i;
      const angle = (row % 2) * Math.PI / model.latticeColumns;
      const normal = [Math.cos(angle), Math.sin(angle), 0];
      const radius = model.diameter / 2 + model.strutRadius + model.contactThickness;
      sites.push({ id: `site-${i}`, positionMm: [radius * normal[0], radius * normal[1], row * model.length / model.latticeRows],
        normal, channel: null, contactAreaMm2: Math.PI * (model.electrodeDiameter / 2) ** 2,
        areaMeaning: 'derived circular face area, not measured electrochemical area',
        positionMeaning: 'illustrative outward-facing disk center; not a manufacturer contact map' });
    }
  } else throw new Error(`Unsupported model kind: ${model.kind}`);
  return sites;
}

export function exportGeometry(model) {
  return { schemaVersion: 1, units: 'mm', coordinateSystem: model.kind === 'stentrode' ? 'right-handed; scaffold longitudinal axis +Z; radial outward normals' : 'right-handed; insertion +Z; see origin',
    origin: model.kind === 'stentrode' ? 'center of proximal scaffold end; scaffold extends from Z=0 to length' : model.kind === 'utah' ? 'center of tissue-facing substrate surface' : 'center of shank base',
    model, sites: getContactGeometry(model),
    simulationNote: 'Geometric reference only. Assign channels, transform to tissue coordinates and supply a validated electrical model before simulation. Null area/channel values are unknown, not zero.' };
}
