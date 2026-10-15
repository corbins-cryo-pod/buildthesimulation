// Implanted shanks only. Dimensions and contact coordinates are millimetres.
// +Z points from the shank base towards the insertion tip; contacts face -Y.
const np2Paper = { label: 'Steinmetz et al. (2021), Neuropixels 2.0: probe design and fabrication', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8244810/' };
const np2Datasheet = { label: 'imec Neuropixels 2.0 manufacturer datasheet: shank, site and tip dimensions', url: 'https://www.neuropixels.org/_files/ugd/328966_2b39661f072d405b8d284c3c73588bc6.pdf' };
const qbDatasheet = { label: 'imec Neuropixels 2.0 Quad Base manufacturer datasheet', url: 'https://www.neuropixels.org/_files/ugd/328966_4e39ab2e46424dc9b3efa446d286ab0f.pdf' };
const npTechnology = { label: 'Neuropixels Central technology: NXT implanted geometry identical to Neuropixels 2.0', url: 'https://www.neuropixelscentral.org/technology' };
const probeTable = { label: 'Bill Karsh / Harris Lab ProbeTable, NP2010/NP2020 lateral contact offsets', url: 'https://github.com/billkarsh/ProbeTable/blob/main/Tables/probe_features.json' };
const nhpDatasheet = { label: 'imec Neuropixels NHP manufacturer datasheet: NP1032 long linear variant', url: 'https://www.neuropixels.org/_files/ugd/328966_4228a68261964794ad55f98d80ac3f45.pdf' };

function np2Contacts() {
  const contacts = [];
  for (let shankIndex = 0; shankIndex < 4; shankIndex++) {
    const shankX = (shankIndex - 1.5) * 0.25;
    for (let row = 0; row < 640; row++) for (let col = 0; col < 2; col++) {
      contacts.push({ shankIndex, x: shankX + 0.027 + col * 0.032 - 0.035, z: 10 - 0.2 - row * 0.015, size: 0.012 });
    }
  }
  return contacts;
}

function np2Model(deviceId, id, name, slug, simultaneousChannels, sources, variantNotes) {
  return {
    id, revision: 2, deviceId, kind: 'planar-probe', name, slug,
    appearance: { substrate: 'silicon', contact: 'titanium-nitride' },
    physicalSites: 5120, simultaneousChannels,
    width: 0.07, thickness: 0.024, length: 10, tipLength: 0.175,
    shankCount: 4, shankPitch: 0.25, contactLayout: np2Contacts(),
    modeledScope: 'Four implanted shanks and 5,120 recording faces; electronics base, cables and tip reference contacts omitted.',
    specs: [['Selected architecture', 'Four shanks; 1,280 recording sites per shank'], ['Physical sites / simultaneous channels', `5,120 / ${simultaneousChannels.toLocaleString('en-US')}`], ['Each shank', '10 mm × 70 µm × 24 µm'], ['Shank pitch / total outer span', '250 µm / 820 µm'], ['Recording sites / center pitch', '12 × 12 µm; 15 µm axial, 32 µm lateral'], ['Chisel taper length', '175 µm, published design; no out-of-plane sharpening'], ['Tip to first recording row', '200 µm reconstruction; exact registration unresolved']],
    fidelity: {
      documented: ['Four 10 mm × 70 µm × 24 µm shanks', '250 µm shank centers', '640 rows × 2 contacts per shank', '12 µm square contacts; 15 µm axial and 32 µm lateral pitch', '175 µm planar chisel taper from paper/datasheet', '27 µm leftmost contact-center offset in primary ProbeTable'],
      reconstructed: ['Straight, coplanar, undeformed shanks', '200 µm tip-to-first-recording-row registration', 'Simple triangular taper; measured edge profile not recovered'],
      omitted: ['Large tip reference electrode on each shank', 'Base and headstage', 'Internal CMOS layers, traces and coatings', 'Manufacturing deflection, sharpening and anatomical placement', 'Acquisition channel map'],
    },
    notes: `${variantNotes} All 5,120 recording faces are reconstructed at the published relative pitch. The 200 µm tip-to-first-row offset is explicitly approximate; exported positions are not a released fabrication mask. The asymmetric lateral centers (27 and 59 µm from the left edge of each 70 µm shank) follow the primary ProbeTable, rather than centering the site columns on the shank. Tip-reference contacts are omitted and are not included in the 5,120 recording-site count. The 175 µm taper follows the paper/datasheets; ProbeTable separately lists 206 µm, so the outline is a named published-design reference and not interchangeable with every hardware revision. Silicon-body and porous-TiN contact appearances distinguish the documented materials; color and roughness are visual approximations, and silicon-nitride/oxide surface layers are not separately meshed. No channel selection, electrical fields, tissue response or mechanical deformation is simulated.`,
    sources, references: [],
  };
}

export const probeDeviceModels = {
  'BTSD-ACAD-0058': np2Model('BTSD-ACAD-0058', 'neuropixels-2p0-alpha-four-shank', 'Neuropixels 2.0 alpha · four implanted shanks', '88-neuropixels-20-alpha-probe', 384,
    [np2Paper, np2Datasheet, probeTable], 'The four-shank 2021 alpha architecture is selected. Its 384 readout channels are shared across the probe; single-shank hardware is a separate variant.'),
  'BTSD-ACAD-0066': np2Model('BTSD-ACAD-0066', 'neuropixels-2p0-quad-base-shanks', 'Neuropixels Quad Base · four implanted shanks', '104-neuropixels-20-quad-base-probe', 1536,
    [qbDatasheet, probeTable], 'Quad Base retains the four-shank contact geometry, with 384 recording channels per shank. The wider electronics base is outside the implanted-shank model.'),
  'BTSD-ACAD-0067': np2Model('BTSD-ACAD-0067', 'neuropixels-nxt-four-shank-reference', 'Neuropixels NXT · four implanted shanks', '106-neuropixels-nxt-np30-prototype', 1536,
    [npTechnology, np2Datasheet, probeTable], 'NXT is modeled through the official statement that its shank geometry and site layout are identical to Neuropixels 2.0. Thus the 5,120 physical recording sites are a documented-family inference, not a separately counted NXT mask. Its channel allocation differs; no channel map is assigned.'),
  'BTSD-ACAD-0057': {
    id: 'neuropixels-nhp-long-np1032-shank', revision: 2, deviceId: 'BTSD-ACAD-0057', kind: 'planar-probe',
    appearance: { substrate: 'silicon', contact: 'titanium-nitride' },
    name: 'Neuropixels NHP · NP1032 long linear shank', slug: '85-neuropixels-10-nhp-long-shank',
    physicalSites: 4416, simultaneousChannels: 384,
    width: 0.125, thickness: 0.122, length: 45, tipLength: 0.342, tipBevelAngle: 25, shankCount: 1, shankPitch: 0,
    contactLayout: Array.from({ length: 4416 }, (_, i) => ({ x: (i % 2 - 0.5) * 0.103, z: 45 - 0.36 - Math.floor(i / 2) * 0.02, size: 0.012, shankIndex: 0 })),
    modeledScope: 'Current NP1032 45 mm linear implanted shank; distinct from the 90 µm, staggered research probe in the 2025 paper.',
    specs: [['Named hardware variant', 'NP1032 NHP Long, manufacturer linear layout'], ['Recording sites / channels', '4,416 / 384'], ['Shank dimensions', '45 mm × 125 µm × 122 µm'], ['Site size / axial pitch', '12 × 12 µm / 20 µm'], ['Lateral center pitch', '103 µm, two aligned columns'], ['Tip taper / sharpening', '342 µm in-plane taper; approximately 25° out-of-plane bevel'], ['Tip-to-first-row offset', '360 µm reconstruction; exact registration unresolved']],
    fidelity: {
      documented: ['NP1032 identity and 45 mm shank length', '125 µm width and 122 µm total thickness', 'Two aligned columns; 4,416 12 µm square recording sites', '103 µm lateral and 20 µm axial pitch', '342 µm planar taper and approximately 25° out-of-plane sharpening from manufacturer datasheet'],
      reconstructed: ['Straight undeformed shank', 'Symmetric lateral placement; 11 µm centers from each edge', '360 µm tip-to-first-row offset', 'Ideal planar backside bevel terminating at the contact-facing tip; edge rounding and grinding marks unresolved'],
      omitted: ['Tip reference electrode', 'Base, flex, headstage and guide tube', 'Stress-compensation layers and internal traces', 'Channel map and anatomical pose'],
    },
    notes: 'Manufacturer NP1032 Long linear variant only. The catalog article also discusses a 2025 research probe with 90 µm silicon and staggered recording sites; those values are not mixed into this 122 µm total-thickness linear model. The 342 µm in-plane taper and approximately 25° out-of-plane sharpening follow the manufacturer datasheet and its Figure 2 SEM. The backside bevel is reconstructed as an ideal plane over approximately 262 µm of the distal shank, preserving the contact face; the measured ground edge profile is unavailable, so this is not an insertion-mechanics model. Recording faces use the documented two-column 103 µm spacing and 20 µm along-shank pitch. Lateral centering and 360 µm tip-to-first-row offset are reconstructed, not a recovered mask registration. Silicon-body and porous-TiN contact appearances follow the stated materials; colors and roughness are illustrative. Large tip reference electrode, proximal assembly, materials stack and acquisition map are omitted. Derived planar square-contact areas are geometric, not electrochemical effective areas.',
    sources: [nhpDatasheet, { label: 'imec NHP product page: NP1032 long variant identification', url: 'https://www.neuropixels.org/probes-nhp' }, { label: 'Trautmann et al. (2025): separate earlier 90 µm staggered research version', url: 'https://www.nature.com/articles/s41593-025-01976-5' }], references: [],
  },
};
