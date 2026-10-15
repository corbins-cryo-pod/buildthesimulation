# Finger Pathway Atlas V4

V4 replaces separate microscopic specimens with one deterministic world-registered cell graph. The production route remains `/simulations/finger-pathway-atlas/`; the standalone viewer is `/simulations/finger-pathway-atlas/viewer/`. The original viewer and untouched source assets remain available under `v3-viewer` and `assets/finger-pathway-atlas/v3`.

## Model

- 306 persistent cell identities in 78 modeled routes: 52 tactile, eight free-ending nociceptive, six proprioceptive, and 12 motor-unit examples.
- Primary sensory neurons have a soma-to-T-junction stem and a continuous peripheral/central axon. DRG is not a synaptic relay.
- Touch and conscious proprioception relay in ipsilateral cuneate, cross in medulla, relay in contralateral VPL and terminate at separate simplified cortical receivers.
- Nociceptive examples relay in the dorsal horn and cross in spinal cord before ascending through brainstem to thalamus and cortex.
- Motor routes use separate M1, spinal-interneuron and lower-motor identities, cross caudally in medulla, leave ventrally and bypass DRG. Median and radial muscle endpoints were corrected against retained source muscle mesh neighborhoods. Ulnar intrinsic-muscle placement remains qualitative.
- Local arbors and receptors are deterministic by cell ID. Meissner flattened terminal profiles, Pacinian closed lamellae, DRG satellite wrapping, distinct Ia/II spindle endings and human-inspired fragmented NMJs follow the comparison reference morphology. These are generated shapes, not EM segmentation.

## Rendering and interaction

All anatomy, somata, terminal fields and routes use the same millimeter coordinate system. Full cell recipes and low-detail paths exist independently of visibility. Camera navigation does not exchange microscopic scenes or multiply cell dimensions.

Initial anatomy is a 600,000-byte gzip scaffold: 41 source surfaces, 36,159 vertices, 76,856 triangles. A JSON fallback is included. No old 16 MB anatomical payload or offline HTML is fetched by V4. Fine geometry is generated after camera motion settles, cached by identity, and bounded to 4/8/14 visible cells with 24 cached entries. Local myelin meshes merge by material; distant paths remain identifiable. Rendering stops while idle or tab-hidden. Pixel ratio is bounded by selected quality. Mesh vertices near cells use local anchors to preserve small features at body-scale coordinates.

Region navigation, route families, individual cell selection, route isolation, whole-path highlighting, cell/ending focus, export of complete modeled cell maps, scale bar, source notes, fullscreen and a collapsible inspector are included. Focus uses actual intact object bounds and has portrait/landscape framing regressions. There are no section planes, cutaway windows or cross-section controls.

## Scientific scope

This is a representative anatomical construction, not all biological neurons in a finger, an experimentally measured connectome, or a solver-ready membrane model. Source figures span tissues/species and independently magnified panels. Synapses are explicit modeled graph attachments, not mapped subcellular contacts. Cortex is deliberately simplified. Cerebellar, autonomic, reticular and other collateral networks are outside this selected circuit. The supplied gross skin preserves its earlier upper-body crop.

The source comparison plates still show V3 on their left panels and are labeled accordingly. Original scientific figure files and attribution remain unchanged. See `public/assets/finger-pathway-atlas/v4/provenance.json` and `scaffold-provenance.json` for source records and derivation.

## Verification

`npm run build` includes model/morphology/focus regression tests and the existing repository tests. `node scripts/verify-finger-atlas-v4.mjs --build` checks published routes, asset presence, geometry/index validity, gzip identity, source hashes and startup payload. The original V3 geometry/reference verification remains in CI.

Offline inspection projected actual scaffold and cell mesh triangles for overview, Meissner, Pacinian, DRG, cuneate and motor-endplate views. This checks geometry appearance, not browser lighting or interaction. Interactive WebGL QA was unavailable in this managed environment because the supported browser-control skill was not present; no browser frame-rate claim is made.
