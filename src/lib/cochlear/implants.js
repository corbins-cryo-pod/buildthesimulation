/**
 * Manufacturer-dimension references for the independent implant-inspection view.
 *
 * Values are millimetres unless the property name says otherwise. These are not
 * manufacturer CAD files, surgical predictions, or commercial processor models.
 * `geometry` contains explicitly documented reconstruction choices. In particular
 * contact outline, intermediate taper, and free-rest curvature are not published
 * manufacturing dimensions. No property here changes the electrical experiment.
 *
 * Inspection site indices run apical -> basal. They are model indices, NOT vendor
 * contact numbers and NOT the experiment's basal -> apical `contactIndex` values.
 */

const sources = {
  ci622: {
    label: 'Cochlear CI622 Physician’s Guide, D1144275-V3, April 2024',
    url: 'https://assets.cochlear.com/api/public/content/f54880005c87443c9326bbebc85d78e2?v=a67de1e6',
    pages: 'Printed pages 21, 46–48, 71',
    accessed: '2026-10-25',
  },
  ci632: {
    label: 'Cochlear CI632 Physician’s Guide, D1144281-V4, April 2024',
    url: 'https://assets.cochlear.com/api/public/content/4c09b3bcf6684f38b0134c52dcc6934a?v=916ac969',
    pages: 'Printed pages 51, 81–83',
    accessed: '2026-10-25',
  },
  ci632Markers: {
    label: 'Cochlear Slim Modiolar CI632 official specifications',
    url: 'https://www.cochlear.com/us/en/professionals/products-and-candidacy/nucleus/implant/electrodes/slim-modiolar',
    accessed: '2026-10-25',
  },
  flex28: {
    label: 'MED-EL SYNCHRONY 2 technical data — FLEX28',
    url: 'https://www.medel.com/hearing-solutions/cochlear-implants/synchrony2',
    accessed: '2026-10-25',
  },
  flexTopology: {
    label: 'MED-EL professional FLEX array description; updated June 21, 2023',
    url: 'https://blog.medel.pro/products-updates/flex-cochlear-implant-electrode-arrays/',
    accessed: '2026-10-25',
  },
  abManual: {
    label: 'AB Ultra 3D Surgeon Manual, 029-Q816-03 Rev A, December 15, 2021',
    url: 'https://www.advancedbionics.com/content/dam/advancedbionics/documents/regional/en-us/professionals/HiRes-Ultra-3D-Surgeons-Manual-FDA.pdf',
    pages: 'Printed pages 6, 30, 36, 40, 48',
    accessed: '2026-10-25',
  },
  abSpecs: {
    label: 'AB HiRes Ultra 3D technical specifications (indexed source; direct PDF unavailable)',
    url: 'https://www.advancedbionics.com/content/dam/advancedbionics/Documents/Regional/en-gb/Professional/Ultra-3D-Tech-Specs-Brochure.pdf',
    retrievalStatus: 'Manufacturer search-index record retained for provenance. Direct retrieval returned 404 during the 2026-10-25 source audit; the surgeon manual is the companion primary source.',
    accessed: '2026-10-25',
  },
  midScalaDesign: {
    label: 'AB HiFocus Mid-Scala electrode design white paper',
    url: 'https://www.advancedbionics.com/content/dam/advancedbionics/documents/regional/es/seorl-2025/imlpante-coclear-hiresultra3d/HiFocus%20Mid-Scala%20Electrode%20White%20Paper.pdf.coredownload.pdf',
    accessed: '2026-10-25',
  },
  slimJDesign: {
    label: 'AB HiFocus SlimJ electrode design white paper',
    url: 'https://www.advancedbionics.com/content/dam/advancedbionics/documents/regional/es/seorl-2025/imlpante-coclear-hiresultra3d/HiFocus%20SlimJ%20Electrode%20White%20Paper.pdf.coredownload.pdf',
    accessed: '2026-10-25',
  },
};

const commonNotes = [
  'Mechanical reference only. Electrical fields, neural responses, and commercial sound-processing strategies are not calculated in this inspection view.',
  'Published endpoint dimensions are retained. Intermediate taper, tip rounding, pad outline, and free-rest curvature are reconstructions, not manufacturing CAD.',
  'Inspection site numbers run from the apical tip toward the base; they are model labels, not manufacturer numbering or simulation source indices.',
  'Inserted placement follows one measured scala-tympani reference path; it is not a patient-specific placement or surgical prediction.',
];

const profileData = [
  {
    id: 'cochlear-ci622', manufacturer: 'Cochlear', name: 'Slim Straight · CI622',
    family: 'lateral-wall', channelCount: 22, padCount: 22,
    activeSpanMm: 19.1, bodyLengthMm: 25,
    bodyLengthLabel: 'Tip to proximal 25 mm marker',
    nominalInsertionMm: 25,
    tipSizeMm: [0.35, 0.25], baseSizeMm: [0.6, 0.5],
    description: 'A slender straight lateral-wall carrier with 22 inward-facing platinum half-band contacts.',
    sources: [sources.ci622],
    measurements: {
      activeSpanMeaning: 'Active array length when straightened',
      contactPitchMm: [0.85, 0.95], contactPitchMeaning: 'Manufacturer centre-spacing range when straight',
      contactSurfaceAreaMm2: [0.14, 0.2],
      firstSiteFromTipMm: null,
      tipToMarkersMm: [20, 25],
      receiverToTipLeadMm: 105,
    },
    geometry: {
      restShape: 'straight', section: 'ellipse',
      firstSiteFromTipMm: 0.4, siteSpanMm: 19.1,
      sitePlacementStatus: 'Approximate uniform spacing within the documented active span; the 0.4 mm tip offset is schematic.',
      carrierBaseAtMm: 19.5, noseLengthMm: 0.25,
      contactShape: 'half-band', contactArcHalfRadians: Math.PI / 2,
      areaAtTipMm2: 0.14, areaAtBaseMm2: 0.2,
      contactAreaStatus: 'Published range; the interpolation between pads is a reconstruction.',
      pairedApicalSites: 0,
      markers: [
        { atMm: 20, widthMm: 0.35, color: '#f3f2e9', label: '20 mm white marker' },
        { atMm: 25, widthMm: 0.35, color: '#f3f2e9', label: '25 mm white marker' },
      ],
    },
    notes: [
      'The guide specifies 19.1 mm active length separately from the 20 and 25 mm insertion markers.',
      'Half-band surfaces face the modiolus. They are not complete metal rings.',
      'The marker widths, tip-to-first-pad offset, and per-pad distribution within the specified spacing/area ranges are schematic.',
      ...commonNotes,
    ],
  },
  {
    id: 'cochlear-ci632', manufacturer: 'Cochlear', name: 'Slim Modiolar · CI632',
    family: 'perimodiolar', channelCount: 22, padCount: 22,
    activeSpanMm: 14, bodyLengthMm: 18.4,
    bodyLengthLabel: 'Tip to most proximal white marker',
    nominalInsertionMm: 18.4,
    tipSizeMm: [0.35, 0.4], baseSizeMm: [0.475, 0.5],
    description: 'A slim precurved perimodiolar carrier with 22 closely spaced inward-facing contact pads.',
    sources: [sources.ci632, sources.ci632Markers],
    measurements: {
      activeSpanMeaning: 'Basal-to-apical active length when straightened',
      contactPitchMm: 0.6, contactPitchMeaning: 'Nominal centre spacing when curled; not a straightened pitch',
      contactSurfaceAreaMm2: [0.15, 0.16],
      firstSiteFromTipMm: null,
      tipToBasalContactMm: 14.4, tipToMarkersMm: [16.4, 17.4, 18.4],
      receiverToTipLeadMm: 98,
    },
    geometry: {
      restShape: 'tight-spiral', section: 'ellipse',
      restTurns: 1.05, restTipRadiusMm: 0.95, restBaseRadiusMm: 3.1, curvedLengthMm: 14.6,
      firstSiteFromTipMm: 0.4, siteSpanMm: 14,
      sitePlacementStatus: 'Uniform reconstruction in the straightened 14 mm span; 0.4 mm tip offset is derived from the published 14.4 mm tip-to-basal distance.',
      carrierBaseAtMm: 14.4, noseLengthMm: 0.24,
      contactShape: 'rounded-pad', contactArcHalfRadians: 1.12,
      areaAtTipMm2: 0.15, areaAtBaseMm2: 0.16,
      contactAreaStatus: 'Published range; rounded outline and area interpolation are schematic.',
      pairedApicalSites: 0,
      markers: [16.4, 17.4, 18.4].map((atMm) => ({
        atMm, widthMm: 0.3, color: '#f3f2e9', label: `${atMm} mm white marker`,
      })),
    },
    notes: [
      'The free-rest spiral is illustrative; its exact curvature is not supplied in the cited manufacturer dimensions.',
      'The 0.6 mm curled pitch and 14 mm straightened active length describe different measurement conditions.',
      'Inward pad orientation and surface-area range are documented; exact pad outline and intermediate taper are reconstructed.',
      ...commonNotes,
    ],
  },
  {
    id: 'medel-flex28', manufacturer: 'MED-EL', name: 'FLEX28',
    family: 'lateral-wall', channelCount: 12, padCount: 19,
    activeSpanMm: 23.1, bodyLengthMm: 28,
    bodyLengthLabel: 'Nominal array length',
    nominalInsertionMm: 28,
    tipSizeMm: [0.5, 0.4], baseSizeMm: [0.8, 0.8],
    description: 'A long flexible lateral-wall array with five apical single-contact sites and seven paired-contact sites.',
    sources: [sources.flex28, sources.flexTopology],
    measurements: {
      activeSpanMeaning: 'Manufacturer stimulation range',
      contactPitchMm: null,
      contactSurfaceAreaMm2: null,
      firstSiteFromTipMm: null,
      physicalPadTopology: '5 apical single pads + 7 paired sites = 19 pads at 12 channel positions',
      receiverElectrodeChannels: 12,
      receiverIndependentCurrentSources: 24,
    },
    geometry: {
      restShape: 'straight', section: 'ellipse',
      firstSiteFromTipMm: 1.2, siteSpanMm: 23.1,
      sitePlacementStatus: 'Uniform 2.1 mm site spacing derives from 23.1 mm / 11 intervals; the 1.2 mm tip offset is schematic.',
      carrierBaseAtMm: 24.3, noseLengthMm: 0.5,
      contactShape: 'oval-pad', contactArcHalfRadians: 0.82,
      approximatePadAreaMm2: 0.12,
      contactAreaStatus: 'Pad dimensions/area are unverified; 0.12 mm² is only a visible reconstruction footprint, with no electrical meaning.',
      singleApicalSites: 5,
      pairAzimuthRadians: [0, Math.PI],
      pairPlacementStatus: 'Two opposed pads illustrate the verified paired topology; exact circumferential orientation is unverified.',
      markers: [{ atMm: 27.7, widthMm: 0.45, color: '#4b9d6d', label: 'Green orientation marker · schematic position' }],
    },
    notes: [
      'Twelve channel positions carry nineteen physical platinum contacts: five apical singles plus seven pairs.',
      'SYNCHRONY 2’s 24 independent current sources do not imply 24 longitudinal electrode channels.',
      'Physical pad outline, exposed area, pair azimuth, exact tip offset, and orientation-marker position are not verified; their reconstruction is visual only.',
      'The 28 mm nominal length is distinct from the 23.1 mm stimulation range.',
      ...commonNotes,
    ],
  },
  {
    id: 'ab-slimj', manufacturer: 'Advanced Bionics', name: 'HiFocus SlimJ',
    family: 'lateral-wall', channelCount: 16, padCount: 16,
    activeSpanMm: 20, bodyLengthMm: 23,
    bodyLengthLabel: 'Tip to blue insertion marker; wing continues proximally',
    nominalInsertionMm: 23,
    tipSizeMm: [0.55, 0.26], baseSizeMm: [0.76, 0.56],
    description: 'A gently curved lateral-wall array with sixteen inward-facing pads, a flattened distal carrier, and a proximal wing.',
    sources: [sources.abManual, sources.abSpecs, sources.slimJDesign],
    measurements: {
      activeSpanMeaning: 'Approximate total span of active contacts',
      contactPitchMm: 1.3, contactPitchMeaning: 'Approximate centre-to-centre spacing',
      contactSurfaceAreaMm2: null, minimumContactSurfaceAreaMm2: 0.12,
      firstSiteFromTipMm: null,
      basalContactToMarkerMm: 3, tipToMarkersMm: [23],
      entrySizeMm: [0.79, 0.61], wingLengthMm: 10,
      independentOutputCircuits: 16,
    },
    geometry: {
      restShape: 'gentle-curve', section: 'ellipse', restBendRadians: 0.34,
      firstSiteFromTipMm: 0.5, sitePitchMm: 1.3,
      sitePlacementStatus: '19.5 mm centre span = 15 × 1.3 mm; 0.5 mm tip offset derived from the 23 mm marker and 3 mm basal-contact gap. Published dimensions are approximate.',
      carrierBaseAtMm: 20, noseLengthMm: 0.35,
      entrySizeMm: [0.79, 0.61], entryAtMm: 23,
      contactShape: 'rectangular-pad', contactArcHalfRadians: 0.86,
      approximatePadAreaMm2: 0.12,
      contactAreaStatus: 'The published 0.12 mm² is a minimum, not an exact nominal pad area; the rendered footprint/outline is approximate.',
      singleApicalSites: 16,
      markers: [{ atMm: 23, widthMm: 0.4, color: '#3977ab', label: '23 mm blue marker' }],
      wing: { startMm: 23, lengthMm: 10, widthMm: 0.6, heightMm: 1.3, status: 'Wing length is documented; its cross-section and taper are schematic.' },
    },
    notes: [
      'The surgeon manual distinguishes contact 16 (0.76 × 0.56 mm) from the wider entry region (0.79 × 0.61 mm).',
      'The approximately 20 mm active length is retained separately from the 19.5 mm span of fifteen 1.3 mm centre intervals.',
      'The slight free-rest curve, pad outline, marker width, and wing cross-section are reconstructed.',
      'Sixteen contacts and output circuits are physical hardware; current-steered virtual sites are not extra electrodes.',
      ...commonNotes,
    ],
  },
  {
    id: 'ab-mid-scala', manufacturer: 'Advanced Bionics', name: 'HiFocus Mid-Scala',
    family: 'mid-scala', channelCount: 16, padCount: 16,
    activeSpanMm: 15, bodyLengthMm: 23.7,
    bodyLengthLabel: 'Tip to proximal neck/jog',
    nominalInsertionMm: 18.5,
    tipSizeMm: [0.5, 0.5], baseSizeMm: [0.7, 0.7],
    description: 'An open precurved spiral with sixteen inward-facing stimulating pads and a separate inactive radiopaque marker.',
    sources: [sources.abManual, sources.abSpecs, sources.midScalaDesign],
    measurements: {
      activeSpanMeaning: 'Approximate total span of active contacts',
      contactPitchMm: 0.975, contactPitchMeaning: 'Approximate centre-to-centre spacing',
      contactSurfaceAreaMm2: null, minimumContactSurfaceAreaMm2: 0.12,
      firstSiteFromTipMm: null,
      basalContactToMarkerMm: 3, tipToMarkersMm: [5.4, 18.5],
      independentOutputCircuits: 16,
      additionalInactiveMarkerCount: 1,
    },
    geometry: {
      restShape: 'open-spiral', section: 'rounded-square',
      restTurns: 0.96, restTipRadiusMm: 1.75, restBaseRadiusMm: 3.8, curvedLengthMm: 18.5,
      firstSiteFromTipMm: 0.875, sitePitchMm: 0.975,
      sitePlacementStatus: '14.625 mm centre span = 15 × 0.975 mm; 0.875 mm tip offset derived from the 18.5 mm marker and 3 mm basal-contact gap. Published dimensions are approximate.',
      carrierBaseAtMm: 15.5, noseLengthMm: 0.4,
      contactShape: 'rectangular-pad', contactArcHalfRadians: 0.78,
      approximatePadAreaMm2: 0.12,
      contactAreaStatus: 'The published 0.12 mm² is a minimum, not an exact nominal pad area; the rendered footprint/outline is approximate.',
      singleApicalSites: 16,
      markers: [
        { atMm: 5.4, widthMm: 0.38, color: '#3977ab', label: 'Distal blue marker' },
        { atMm: 18.5, widthMm: 0.45, color: '#3977ab', label: '18.5 mm proximal blue marker' },
      ],
      inactiveMarkers: [{ atMm: 5.4, widthMm: 0.24, color: '#a8adb5', label: 'Inactive radiopaque marker · not a stimulating pad' }],
    },
    notes: [
      'The 18.5 mm tip-to-insertion-marker length is distinct from the 23.7 mm tip-to-neck/jog length.',
      'The approximately 15 mm active length is retained separately from the 14.625 mm span of fifteen 0.975 mm centre intervals.',
      'The inactive marker beneath the distal blue band is not a seventeenth stimulating contact.',
      'The open free-rest spiral and rounded-square cross-section are reconstructions from documented dimensions and design class.',
      ...commonNotes,
    ],
  },
];

function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

/** The five named reference devices. Generic experiment settings are separate. */
export const IMPLANT_PROFILES = freezeDeep(profileData);
export const DEFAULT_IMPLANT_PROFILE_ID = 'cochlear-ci622';

/** Optional generic mechanical reference. This does not represent live sources. */
export const GENERIC_IMPLANT_PROFILE = freezeDeep({
  id: 'generic', manufacturer: 'Laboratory', name: 'Generic reference array',
  family: 'lateral-wall', channelCount: 12, padCount: 12,
  activeSpanMm: 16, bodyLengthMm: 18, bodyLengthLabel: 'Illustrative mechanical reference length',
  nominalInsertionMm: 18, tipSizeMm: [0.35, 0.35], baseSizeMm: [0.6, 0.6],
  description: 'A generic mechanical reference, independent of the calculated source-array geometry.',
  sources: [], measurements: {},
  geometry: {
    restShape: 'straight', section: 'ellipse', firstSiteFromTipMm: 0.8, siteSpanMm: 16,
    sitePlacementStatus: 'Illustrative equally spaced sites.', carrierBaseAtMm: 16.8, noseLengthMm: 0.3,
    contactShape: 'oval-pad', contactArcHalfRadians: 0.9, approximatePadAreaMm2: 0.1,
    contactAreaStatus: 'Generic visual footprint only.', singleApicalSites: 12, markers: [],
  },
  notes: ['This generic inspection object is not the calculated experimental source array.', ...commonNotes],
});

/** Return a known immutable profile. Unknown IDs are rejected rather than hidden. */
export function getImplantProfile(id = DEFAULT_IMPLANT_PROFILE_ID) {
  if (id === 'generic') return GENERIC_IMPLANT_PROFILE;
  const found = IMPLANT_PROFILES.find((profile) => profile.id === id);
  if (!found) throw new RangeError(`Unknown implant reference profile: ${String(id)}`);
  return found;
}

/**
 * Physical-pad metadata for inspection/picking, without requiring a mesh build.
 * `implantContactIndex` is contiguous over physical pads. `channelIndex` and
 * `siteIndex` are apical-first model grouping indices. They never refer to the
 * processor's contactIndex. The two pads of a FLEX28 pair share one site index.
 */
export function getImplantContactMap(profileOrId = DEFAULT_IMPLANT_PROFILE_ID) {
  const profile = typeof profileOrId === 'string' ? getImplantProfile(profileOrId) : profileOrId;
  if (!profile?.geometry || !Number.isInteger(profile.channelCount)) throw new TypeError('A valid implant profile is required.');
  const g = profile.geometry;
  const pitch = g.sitePitchMm ?? g.siteSpanMm / Math.max(1, profile.channelCount - 1);
  const result = [];
  for (let siteIndex = 0; siteIndex < profile.channelCount; siteIndex++) {
    const paired = Array.isArray(g.pairAzimuthRadians) && siteIndex >= g.singleApicalSites;
    const azimuths = paired ? g.pairAzimuthRadians : [0];
    for (let padInSite = 0; padInSite < azimuths.length; padInSite++) {
      const implantContactIndex = result.length;
      result.push({
        index: implantContactIndex, implantContactIndex,
        siteIndex, channelIndex: siteIndex, siteNumber: siteIndex + 1,
        padInSite, padsAtSite: azimuths.length,
        distanceFromTipMm: g.firstSiteFromTipMm + siteIndex * pitch,
        azimuthRadians: azimuths[padInSite],
        shape: g.contactShape,
        label: `Site ${siteIndex + 1} · pad ${padInSite + 1}${paired ? ' of 2' : ' of 1'}`,
        grouping: paired ? 'Paired site' : 'Single-pad site',
        numberingNote: 'Apical-first model site index; not manufacturer numbering or a simulation source index.',
      });
    }
  }
  if (result.length !== profile.padCount) throw new Error(`Pad topology does not match ${profile.id}.`);
  return result;
}

