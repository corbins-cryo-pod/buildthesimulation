// Distal neural-contact windows, not pulse-generator cases or complete cables.
// All lengths are mm. Contact z is the band CENTER, measured along +Z from
// the distal edge of the modeled window. No unknown physical tip is invented.
const sensightManual = {
  label: 'Medtronic SenSight B33005/B33015 implant manual (2021), pp. 8–10; manufacturer document, academic mirror',
  url: 'https://trajectoryguide.greydongilmore.com/static/medtronic_sensight_B33005_B33015_manual_2021.pdf',
};
const abbottSsed = {
  label: 'FDA P140009/S039, Tables 2/10 and Figure 1: Abbott Infinity lead family',
  url: 'https://www.accessdata.fda.gov/cdrh_docs/pdf14/P140009S039B.pdf',
};
const abbottMaterials = {
  label: 'St. Jude Medical / Abbott lead manual (2017), Table 3: Pt/Ir and polycarbonate urethane; manufacturer manual, academic mirror',
  url: 'https://trajectoryguide.greydongilmore.com/static/stjude_lead_manual_2017.pdf',
};
const abbottCompatibility = {
  label: 'Abbott MRI support: full-system component table lists Liberta RC 62400 and leads 6170–6173',
  url: 'https://www.neuromodulation.abbott/us/en/healthcare-professionals/mri-support.html',
};
const cartesiaSsed = {
  label: 'FDA P150031/S028, Table 2: DB-2201 and DB-2202 lead dimensions',
  url: 'https://www.accessdata.fda.gov/cdrh_docs/pdf15/P150031S028B.pdf',
};
const medtronicReport = {
  label: 'Medtronic 2024 Product Performance Report, p. 185: Vectris 977A2 specifications',
  url: 'https://www.medtronic.com/content/dam/medtronic-wide/public/united-states/products/neurological/2024-product-performance-report-neuromodulation.pdf',
};
const vectrisMaterials = {
  label: 'Medtronic Closed-Loop SCS study protocol, implant-component materials for 977A2 compact leads',
  url: 'https://cdn.clinicaltrials.gov/large-docs/54/NCT05177354/Prot_003.pdf',
};
const medtronicCompatibility = {
  label: 'Medtronic SCS US product list: Vectris SureScan leads and Inceptiv compatibility',
  url: 'https://www.medtronic.com/content/dam/medtronic-wide/public/united-states/products/neurological/scs-us-product-list.pdf',
};
const nevroSsed = {
  label: 'FDA original Senza P130022, Table 2: percutaneous-lead family dimensions',
  url: 'https://www.accessdata.fda.gov/cdrh_docs/pdf13/P130022B.pdf',
};
const nevroCompatibility = {
  label: 'Nevro HFX iQ Information for Prescribers, Rev D: LEAD1058 compatibility and 5 mm spacing',
  url: 'https://www.nevro.com/app/uploads/2025/02/10001223_Information_For_Prescribers_Rev_D_Clean.pdf',
};
const evokeSsed = {
  label: 'FDA Evoke P190002, Table 2: 12-contact percutaneous-lead specifications',
  url: 'https://www.accessdata.fda.gov/cdrh_docs/pdf19/P190002B.pdf',
};
const evokeManual = {
  label: 'Saluda Evoke User Manual, Table 15-4: 12C lead materials, 3 mm contact length and 7 mm pitch',
  url: 'https://www.accessdata.fda.gov/cdrh_docs/pdf19/P190002C.pdf',
};
const avistaManual = {
  label: 'Boston Scientific Avista MRI SC-2408 lead directions for use, pp. 1 and 12',
  url: 'https://www.bostonscientific.com/content/dam/elabeling/nm/91063583-01_RevC_Avista_MRI_Lead_DFU_en-USA_S.pdf',
};
const wavewriterManual = {
  label: 'Boston Scientific WaveWriter Alpha/Alpha Prime IPG manual: compatible Avista MRI leads',
  url: 'https://www.bostonscientific.com/content/dam/elabeling/nm/92469342-02_WaveWriter_Alpha_and_WaveWriter_Alpha_Prime_Implantable_Pulse_Generator_multi-OUS_s.pdf',
};
const rnsManual = {
  label: 'NeuroPace RNS-300M user manual: DL-330-10 variant and 1.27 mm lead diameter',
  url: 'https://www.neuropace.com/wp-content/uploads/2021/02/rns-system-manual-300m.pdf',
};
const rnsContactMeasurement = {
  label: 'In vivo and in vitro electrochemical impedance spectroscopy (2024), Table 1: NeuroPace depth-contact dimensions',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11801193/',
};
const rnsPitchStudy = {
  label: 'Henin et al. (2019), Methods: 10 mm RNS electrode spacing is center to center',
  url: 'https://www.nature.com/articles/s41598-018-37561-z',
};

const commonOmissions = ['Distal physical tip outside crop', 'Full cable and proximal connector', 'Internal conductors and insulation layers', 'Patient-specific curvature and implantation pose'];
const commonNotes = 'The model ends at the outer contact edges; its flat end faces are crop planes, not recovered physical lead tips. No contact-metal thickness or internal cable structure is inferred. Ring areas, where exported, are ideal cylindrical lateral areas rather than certified electrochemically active areas. Source-informed pale insulation and silver Pt/Ir shading replace the generic gold appearance; optical finish is illustrative, with no invented internal wires. No electrical field or tissue-response prediction is included.';
const directionalNotes = 'The 1-3-3-1 topology and axial dimensions are documented. The six directional contacts use illustrative 90° arcs separated by 30° gaps because the reviewed sources do not establish a manufactured arc boundary. Their areas are deliberately unknown. Angular zero is an arbitrary display orientation; it is not an anatomical direction or a recovered orientation-marker registration.';

function ringBands(count, contactLength, edgeGap) {
  return Array.from({ length: count }, (_, i) => ({
    z: contactLength / 2 + i * (contactLength + edgeGap),
    length: contactLength,
    segments: 1,
  }));
}

function directionalBands(contactLength, edgeGap, documentedArc = false) {
  return [1, 3, 3, 1].map((segments, i) => ({
    z: contactLength / 2 + i * (contactLength + edgeGap),
    length: contactLength,
    segments,
    ...(segments === 3 ? { rotation: 0, gapAngle: Math.PI / 6, ...(!documentedArc ? { areaUnknown: true } : {}) } : {}),
  }));
}

export const leadDeviceModels = {
  'BTSD-FDA-0002': {
    id: 'sensight-b33005-contact-window', revision: 2, deviceId: 'BTSD-FDA-0002', kind: 'cylindrical-lead',
    appearance: { substrate: 'polyurethane', contact: 'platinum-iridium' },
    name: 'SenSight B33005 · directional contact window', slug: '151-medtronic-percept-sensight-dbs',
    licensedGlb: '/models/dbs-leads/medtronic-sensight-b33005.glb',
    licensedModel: { meshName: 'Medtronic B33005', source: 'Lead-DBS electrode model library', license: 'GNU GPLv3', url: 'https://github.com/netstim/leaddbs', site: 'https://www.lead-dbs.org/' },
    physicalSites: 8, simultaneousChannels: null, diameter: 1.36, length: 7.5,
    contacts: directionalBands(1.5, 0.5),
    modeledScope: 'Distal 7.5 mm contact window of the B33005 lead; Percept IPG and full lead omitted.',
    specs: [['Selected lead', 'SenSight B33005; 0.5 mm spacing variant'], ['Contacts / levels', '8 / 4; 1-3-3-1'], ['Lead diameter', '1.36 mm nominal'], ['Band length / axial gap', '1.5 / 0.5 mm'], ['Contact-window span', '7.5 mm'], ['Directional arcs', '90° visual approximation; area unknown']],
    fidelity: {
      documented: ['B33005 identity', '1.36 mm diameter', '1.5 mm bands and 0.5 mm gaps', '1-3-3-1 contact topology'],
      reconstructed: ['Straight cropped cylinder', 'Schematic 90° directional arcs and angular orientation'],
      omitted: [...commonOmissions, 'Orientation and bilateral markers'],
    },
    notes: `Nominal manufacturer dimensions for the B33005 variant, not B33015 or legacy 3387/3389. The interactive geometry and GLB download are the Lead-DBS electrode-model mesh (GNU GPLv3), which supersedes the earlier dimension-based contact-window reconstruction; the documented measurements below still describe the device. ${directionalNotes} ${commonNotes}`,
    sources: [sensightManual, { label: 'Medtronic SenSight product page: current lead-family identification', url: 'https://www.medtronic.com/en-us/healthcare-professionals/products/neurological/deep-brain-stimulation/dbs-therapy-leads/sensight-directional-lead.html' }],
    references: [],
  },
  'BTSD-FDA-0003': {
    id: 'abbott-6172-contact-window', revision: 2, deviceId: 'BTSD-FDA-0003', kind: 'cylindrical-lead',
    appearance: { substrate: 'polyurethane', contact: 'platinum-iridium' },
    name: 'Abbott 6172 · directional contact window', slug: '152-abbott-liberta-rc-dbs',
    licensedGlb: '/models/dbs-leads/abbott-6172-directed-lead.glb',
    licensedModel: { meshName: 'St. Jude Directed 6172 (short)', source: 'Lead-DBS electrode model library', license: 'GNU GPLv3', url: 'https://github.com/netstim/leaddbs', site: 'https://www.lead-dbs.org/' },
    physicalSites: 8, simultaneousChannels: null, diameter: 1.295, length: 7.5,
    contacts: directionalBands(1.5, 0.5),
    modeledScope: 'Distal 7.5 mm contact window of the compatible 6172 directional lead; Liberta RC IPG omitted.',
    specs: [['Selected compatible lead', 'Abbott 6172; 0.5 mm spacing'], ['Contacts / levels', '8 / 4; 1-3-3-1'], ['Lead diameter', '1.295 mm; Table 2 rounds to 1.30 mm'], ['Band length / axial gap', '1.5 / 0.5 mm'], ['Contact-window span', '7.5 mm'], ['Directional arcs', '90° visual approximation; area unknown']],
    fidelity: {
      documented: ['6172 compatible with Liberta RC', '1.295 mm family diameter', '1.5 mm bands, 0.5 mm gaps and 7.5 mm span', '1-3-3-1 contact topology'],
      reconstructed: ['Straight contact-window crop', 'Schematic 90° directional arcs and angular orientation'],
      omitted: [...commonOmissions, 'Orientation marker'],
    },
    notes: `Selected 6172 lead from Abbott’s full-system component table. Table 10 supplies 1.5 mm bands and 1.295 mm diameter; Table 2 rounds diameter to 1.30 mm. Pt/Ir appearance follows the manufacturer materials table and FDA Table 10; FDA Table 2 instead lists MP35N. The 2017 manual also lists a 1.27 mm lead diameter, so this reference retains the selected FDA nominal geometry rather than silently mixing revisions. Dimensions belong to the Infinity-family lead, which Abbott lists with Liberta RC, not the Liberta generator case. The interactive geometry and GLB download are the Lead-DBS mesh named 'St. Jude Directed 6172 (short)' (GNU GPLv3), which supersedes the earlier dimension-based contact-window reconstruction. ${directionalNotes} ${commonNotes}`,
    sources: [abbottSsed, abbottMaterials, abbottCompatibility], references: [],
  },
  'BTSD-FDA-0004': {
    id: 'vercise-cartesia-db2202-contact-window', revision: 2, deviceId: 'BTSD-FDA-0004', kind: 'cylindrical-lead',
    appearance: { substrate: 'polyurethane', contact: 'platinum-iridium' },
    name: 'Vercise Cartesia DB-2202 · directional window', slug: '153-boston-scientific-vercise-genus-dbs',
    licensedGlb: '/models/dbs-leads/vercise-directed-db2202.glb',
    licensedModel: { meshName: 'Boston Scientific Vercise Directed', source: 'Lead-DBS electrode model library', license: 'GNU GPLv3', url: 'https://github.com/netstim/leaddbs', site: 'https://www.lead-dbs.org/' },
    physicalSites: 8, simultaneousChannels: null, diameter: 1.3, length: 7.5,
    contacts: directionalBands(1.5, 0.5, true),
    modeledScope: 'Distal 7.5 mm contact window of the eight-contact Cartesia DB-2202 lead.',
    specs: [['Selected lead', 'Cartesia DB-2202; eight-contact variant'], ['Contacts / levels', '8 / 4; 1-3-3-1'], ['Lead diameter', '1.3 mm'], ['Band length / axial gap', '1.5 / 0.5 mm'], ['Contact-window span', '7.5 mm'], ['Directional contacts', '90° circumferential arcs; FDA description']],
    fidelity: {
      documented: ['DB-2202 identity and eight contacts', '1.3 mm diameter', '1.5 mm bands and 0.5 mm gaps', '7.5 mm contact span', '90° circumferential segments'],
      reconstructed: ['Straight cropped cylinder', 'Equally spaced angular centers and arbitrary zero orientation'],
      omitted: [...commonOmissions, 'Orientation marker', 'Cartesia X and HX variants'],
    },
    notes: `This is DB-2202, not the 16-contact Cartesia X/HX. The FDA device description explicitly gives 90° directional arcs; equally spaced centers leave 30° insulating gaps. Angular zero is an arbitrary display orientation. The FDA separately reports 6.0 mm² ring and 1.5 mm² segment areas; those rounded reported values are not substituted for the ideal geometric surfaces. The interactive geometry and GLB download are the Lead-DBS eight-contact 'Vercise Directed' mesh (GNU GPLv3), which supersedes the earlier dimension-based contact-window reconstruction; Lead-DBS publishes one directed Vercise variant, not separate DB-2201 and DB-2202 meshes. ${commonNotes}`,
    sources: [cartesiaSsed, { label: 'Boston Scientific Genus leads: standard and Cartesia variants', url: 'https://www.bostonscientific.com/en-EU/products/deep-brain-stimulation-systems/vercise-genus-dbs/leads.html' }], references: [],
  },
  'BTSD-FDA-0005': {
    id: 'vectris-977a2-contact-window', revision: 2, deviceId: 'BTSD-FDA-0005', kind: 'cylindrical-lead',
    appearance: { substrate: 'polyurethane', contact: 'platinum-iridium' },
    name: 'Vectris SureScan 977A2 · compact window', slug: '154-medtronic-inceptiv-closed-loop-scs',
    physicalSites: 8, simultaneousChannels: null, diameter: 1.3, length: 52,
    contacts: ringBands(8, 3, 4),
    modeledScope: 'Distal 52 mm contact window of an Inceptiv-compatible Vectris 977A2 compact lead.',
    specs: [['Selected lead family', 'Vectris SureScan 977A2 compact'], ['Ring contacts', '8'], ['Lead diameter', '1.3 mm'], ['Contact length / edge gap', '3 / 4 mm'], ['Center pitch / window span', '7 / 52 mm']],
    fidelity: {
      documented: ['977A2 compact identity', '1.3 mm diameter', 'Eight 3 mm contacts', '4 mm edge gaps and 52 mm span'],
      reconstructed: ['Straight contact-window crop', 'Ideal flush cylindrical contact surfaces'],
      omitted: [...commonOmissions, 'MRI shielding and marker details', 'Inceptiv pulse generator'],
    },
    notes: `Selected 977A2 compact family, not the 977A1 subcompact lead with 1.5 mm gaps. Medtronic explicitly lists the compact lead as compatible with Inceptiv closed-loop technology. ${commonNotes}`,
    sources: [medtronicReport, medtronicCompatibility, vectrisMaterials], references: [],
  },
  'BTSD-FDA-0006': {
    id: 'nevro-lead1058-contact-window', revision: 2, deviceId: 'BTSD-FDA-0006', kind: 'cylindrical-lead',
    appearance: { substrate: 'polyurethane', contact: 'platinum-iridium' },
    name: 'Nevro LEAD1058 · percutaneous contact window', slug: '155-nevro-senza-hfx-iq-scs',
    physicalSites: 8, simultaneousChannels: null, diameter: 1.4, length: 59,
    contacts: ringBands(8, 3, 5),
    modeledScope: 'Distal contact window of the HFX iQ-compatible LEAD1058 family; diameter uses original Senza labeling.',
    specs: [['Selected compatible family', 'LEAD1058; eight contacts, 5 mm spacing'], ['Lead diameter', '1.4 mm; original Senza family labeling'], ['Contact length', '3 mm derived from FDA span limits'], ['Edge gap / center pitch', '5 / 8 mm'], ['Contact-window span', '59 mm derived']],
    fidelity: {
      documented: ['LEAD1058 family is listed for HFX iQ', 'Eight contacts and 5 mm spacing', 'Original family diameter 1.4 mm'],
      reconstructed: ['3 mm bands from FDA span and gap limits', '59 mm window = 8 × 3 + 7 × 5', 'Straight pose'],
      omitted: [...commonOmissions, 'Current-revision manufacturing tolerances', 'HFX iQ pulse generator'],
    },
    notes: `Variant-specific compatibility and 5 mm gaps come from current HFX iQ labeling. The original Senza SSED gives eight contacts, 1.4 mm diameter, 1–9 mm gaps and 31–87 mm spans. Both span endpoints imply 3 mm bands: (31 − 7 × 1) / 8 = (87 − 7 × 9) / 8 = 3. Reusing that nominal family diameter/band length for LEAD1058 is explicit; current revision tolerances are unverified. ${commonNotes}`,
    sources: [nevroSsed, nevroCompatibility], references: [],
  },
  'BTSD-FDA-0007': {
    id: 'saluda-evoke-12-contact-window', revision: 2, deviceId: 'BTSD-FDA-0007', kind: 'cylindrical-lead',
    appearance: { substrate: 'polyurethane', contact: 'platinum-iridium' },
    name: 'Saluda Evoke · 12-contact percutaneous window', slug: '156-saluda-evoke-closed-loop-scs',
    physicalSites: 12, simultaneousChannels: null, diameter: 1.32, length: 80,
    contacts: ringBands(12, 3, 4),
    modeledScope: 'One 80 mm distal contact window from the original Evoke twelve-contact percutaneous lead.',
    specs: [['Lead reference', 'Original P190002 percutaneous lead'], ['Ring contacts / diameter', '12 / 1.32 mm'], ['Contact length', '3 mm; user manual Table 15-4'], ['Edge gap / center pitch', '4 / 7 mm'], ['Contact-window span', '80 mm']],
    fidelity: {
      documented: ['Twelve contacts', '1.32 mm diameter', '3 mm bands and 7 mm center pitch', '4 mm edge gaps and 80 mm contact span'],
      reconstructed: ['Straight contact-window pose'],
      omitted: [...commonOmissions, 'Second implanted lead', 'Later CAP24 paddle architecture', 'Closed-loop pulse generator'],
    },
    notes: `This is the original P190002 twelve-contact percutaneous architecture, not a later paddle. The original user manual Table 15-4 directly specifies 3 mm contacts at 7 mm center pitch, consistent with the FDA 80 mm span and eleven 4 mm edge gaps. It also specifies Pellethane lead insulation and Pt/Ir electrodes. The published 12.44 mm² contact area agrees with the ideal cylinder to rounding. ${commonNotes}`,
    sources: [evokeSsed, evokeManual], references: [],
  },
  'BTSD-FDA-0022': {
    id: 'avista-sc2408-contact-window', revision: 2, deviceId: 'BTSD-FDA-0022', kind: 'cylindrical-lead',
    appearance: { substrate: 'polyurethane', contact: 'platinum-iridium' },
    name: 'Avista MRI SC-2408 · eight-contact window', slug: '171-boston-scientific-wavewriter-spinal-cord-stimulation',
    physicalSites: 8, simultaneousChannels: null, diameter: 1.6, length: 31,
    contacts: ringBands(8, 3, 1),
    modeledScope: 'Distal 31 mm contact window of a WaveWriter-compatible Avista MRI SC-2408 lead.',
    specs: [['Selected compatible lead', 'Avista MRI SC-2408'], ['Ring contacts / diameter', '8 / 1.6 mm'], ['Contact length / edge gap', '3 / 1 mm'], ['Center pitch', '4 mm'], ['Contact-window span', '31 mm derived']],
    fidelity: {
      documented: ['SC-2408 identity', '1.6 mm diameter', 'Eight 3 mm contacts', '1 mm edge gap'],
      reconstructed: ['31 mm contact window = 8 × 3 + 7 × 1', 'Straight crop'],
      omitted: [...commonOmissions, 'MRI shielding and radiolucency', 'WaveWriter pulse generator', 'Infinion and paddle variants'],
    },
    notes: `Selected SC-2408 cylindrical lead, not every WaveWriter lead or paddle. ${commonNotes}`,
    sources: [avistaManual, wavewriterManual], references: [],
  },
  'BTSD-FDA-0001': {
    id: 'rns-dl330-10-contact-window', revision: 2, deviceId: 'BTSD-FDA-0001', kind: 'cylindrical-lead',
    appearance: { substrate: 'silicone', contact: 'platinum-iridium' },
    name: 'NeuroPace DL-330-10 · depth-contact window', slug: '150-neuropace-rns-system',
    physicalSites: 4, simultaneousChannels: null, diameter: 1.27, length: 32,
    contacts: ringBands(4, 2, 8),
    modeledScope: 'One 32 mm contact window of a DL-330-10 depth lead; RNS can also use surface-strip leads.',
    specs: [['Selected variant', 'DL-330-10 depth lead'], ['Ring contacts / diameter', '4 / 1.27 mm'], ['Contact length', '2 mm; independent electrode study'], ['Center pitch / edge gap', '10 / 8 mm'], ['Contact-window span', '32 mm derived']],
    fidelity: {
      documented: ['DL-330-10 variant and 1.27 mm diameter', 'Four contacts', '10 mm center pitch in RNS study', '2 mm cylinder height in electrode study'],
      reconstructed: ['Use of measured family contact height for DL-330-10', '32 mm straight crop'],
      omitted: [...commonOmissions, 'Cortical strip variant', '3.5 mm pitch variant', 'RNS cranial neurostimulator'],
    },
    notes: `Manufacturer labeling identifies the 10 mm-spacing variant; the Henin study explicitly defines that RNS spacing as center to center. The 2 mm band height is reported for the DL-330-3.5 member in the independent electrode-measurement paper and is explicitly transferred to this lead family, rather than inferred from a photograph. That family transfer needs confirmation against a dimensioned DL-330-10 drawing. ${commonNotes}`,
    sources: [rnsManual, rnsPitchStudy, rnsContactMeasurement], references: [],
  },
};
