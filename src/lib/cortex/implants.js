import { getDeviceModel, getContactGeometry } from '../devices/catalog.js';

// Laboratory revisions pin a scope AND coordinate frame, independently of the
// whole-device catalog revision. Existing Utah experiments retain their frame.
export const CORTEX_IMPLANTS = [
  { deviceId: 'BTSD-0001', revision: 1, catalogRevision: 1, key: 'utah',
    label: 'Utah Array · 1.5 mm', origin: 'tissue-facing substrate center',
    poseLimitUm: 2000, extracellular: true, translationUm: [0, 0, 0],
    recording: ['r4-c4', 'r4-c5'], sources: ['r3-c4', 'r3-c5'],
    summary: '100 physical shanks · 96 nominal channels. Ideal point sensing at apices; exposed areas and channel map unknown.' },
  { deviceId: 'BTSD-0002', revision: 1, catalogRevision: 2, key: 'neuralink-n1',
    label: 'Neuralink N1 · one 16-site thread', origin: 'distal end of the illustrative thread segment',
    poseLimitUm: 5000, extracellular: false, translationUm: [100, -200, 3500],
    recording: ['site-7', 'site-8'], sources: ['site-0', 'site-1'],
    summary: '2024 64 × 16 N1 configuration: one straight contact-bearing segment, 16 sites at 200 µm pitch. Not the full implant or a measured insertion trajectory.',
    notes: '3.6 mm displayed segment with 3.0 mm between first and last sites. Segment end margins, straight pose and 84-to-16 µm taper are illustrative, not a recovered thread mask. Thickness is the catalog’s 4.4 µm stack. The 12 × 20 µm pads are visual markers; actual exposed area stays unknown. Proximal routing, enclosure, insertion loop, traces and mechanics are omitted. Recording-only in this laboratory.' },
  { deviceId: 'BTSD-0004', revision: 1, catalogRevision: 2, key: 'neuropixels-1',
    label: 'Neuropixels 1.0 · one shank', origin: 'distal shank tip',
    poseLimitUm: 5000, extracellular: false, translationUm: [100, -200, 2000],
    recording: ['site-30', 'site-32'], sources: ['site-0', 'site-1'],
    summary: '10 mm × 70 µm × 24 µm silicon shank · 960 sites · 384 selectable hardware channels. This lab samples two ideal sites, without channel-bank or acquisition electronics.',
    notes: 'Full shank retained at true scale, including the portion outside the cortical box. 12 × 12 µm sites, 20 µm row pitch, 16 µm staggered column pitch. The catalog’s 200 µm tip-to-first-row offset is approximate. Tip-relative origin; contacts extend toward negative local Z. Recording-only. This non-human research probe is placed beside a human cell model for a mathematical comparison, not a human-use claim.' },
];

export const getCortexImplant = (id) => CORTEX_IMPLANTS.find(d => d.deviceId === id) ?? null;

export function getCortexImplantModel(id) {
  const definition = getCortexImplant(id), catalog = getDeviceModel(id);
  if (!definition || !catalog) return null;
  if (catalog.revision !== definition.catalogRevision)
    throw new Error('Catalog revision changed; explicitly migrate the laboratory implant adapter.');
  const single = id !== 'BTSD-0001';
  return { ...catalog, revision: definition.revision,
    id: single ? `${catalog.id}/cortex-single/1` : catalog.id,
    kind: id === 'BTSD-0002' ? 'cortex-n1-thread' : catalog.kind,
    name: definition.label,
    physicalSites: id === 'BTSD-0002' ? catalog.sitesPerThread : catalog.physicalSites,
    simultaneousChannels: id === 'BTSD-0002' ? catalog.sitesPerThread : catalog.simultaneousChannels,
    notes: definition.notes ?? catalog.notes,
    cortex: definition, catalogModelId: catalog.id, catalogRevision: catalog.revision,
    segmentLength: id === 'BTSD-0002' ? catalog.threadEndY - catalog.contactStartY : null,
  };
}

export function getCortexContacts(model) {
  if (model.kind === 'cortex-n1-thread') {
    return Array.from({ length: model.physicalSites }, (_, i) => ({
      id: `site-${i}`, threadIndex: 0, contactIndex: i,
      positionMm: [0, -model.threadThickness / 2, -model.segmentLength + model.firstSiteOffset + i * model.sitePitch],
      normal: [0, -1, 0], channel: null, contactAreaMm2: null,
      visualizationSizeMm: [model.visualContactWidth, model.visualContactLength],
      positionMeaning: 'illustrative pad center on one straight N1 segment; tip-relative, not measured implantation coordinates',
    }));
  }
  const sites = getContactGeometry(model);
  return model.cortex?.key === 'neuropixels-1'
    ? sites.map(s => ({ ...s, positionMm: [s.positionMm[0], s.positionMm[1], s.positionMm[2] - model.length], normal: [0, -1, 0] }))
    : sites;
}

export function implantTipPointsMm(model) {
  return model.cortex?.key === 'utah' || !model.cortex
    ? getCortexContacts(model).map(s => s.positionMm) : [[0, 0, 0]];
}

// Change only implant placement/contact selections. Never silently replace the
// cell, numerical resolution or current-clamp settings. Source IDs are inert
// placeholders for recording-only devices under the existing schema.
export function selectCortexImplant(config, deviceId) {
  const d = getCortexImplant(deviceId);
  if (!d) throw new Error('Unknown laboratory implant.');
  const c = structuredClone(config);
  c.implant = { deviceId, revision: d.revision, translationUm: [...d.translationUm], rotationDeg: [0, 0, 0] };
  c.recording.contactIds = [...d.recording];
  c.protocol.sourceContactIds = [...d.sources];
  if (!d.extracellular && c.protocol.mode === 'extracellular-stimulation') c.protocol.mode = 'intracellular-current';
  return c;
}
