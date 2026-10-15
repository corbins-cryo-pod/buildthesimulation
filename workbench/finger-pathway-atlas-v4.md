# Finger Pathway Atlas V4

V4 integrates the original V3 detailed cellular models and anatomical surfaces into one deterministic world-registered cell graph. The production route remains `/simulations/finger-pathway-atlas/`; the standalone viewer is `/simulations/finger-pathway-atlas/viewer/`. The original viewer and untouched source assets remain available under `v3-viewer` and `assets/finger-pathway-atlas/v3`.

## Model

- 306 persistent cell identities in 78 modeled routes: 52 tactile, eight free-ending nociceptive, six proprioceptive, and 12 motor-unit examples.
- Primary sensory neurons have a soma-to-T-junction stem and a continuous peripheral/central axon. DRG is not a synaptic relay.
- Touch and conscious proprioception relay in ipsilateral cuneate, cross in medulla, relay in contralateral VPL and terminate at separate cortical receivers with simplified overview rendering.
- Nociceptive examples relay in the dorsal horn and cross in spinal cord before ascending through brainstem to thalamus and cortex.
- Motor routes use separate M1, spinal-interneuron and lower-motor identities, cross caudally in medulla, leave ventrally and bypass DRG. Median and radial muscle endpoints were corrected against retained source muscle mesh neighborhoods. Ulnar intrinsic-muscle placement remains qualitative.
- Original V3 DRG membranes and satellite patches, spinal/brainstem/thalamic arbors, cutaneous endings, NMJ components and all ten measured human cortical trace templates are retained at exactly 0.001 mm per micrometre. Each cell has a deterministic source-template registration. Original axon/stem ports join the continuous V4 trajectories. SA-II and group-II spindle endings, which lack corresponding V3 templates, retain separately labeled modeled details.
- Source mesh vertices, normals, indices, colors and original captured centerlines are preserved. Two support envelopes close the old Pacinian and spindle inspection openings while preserving their lamellar/capsule complexity. Tissue blocks, section planes, window rims and disconnected context fragments are excluded.
- Cortical traces retain their measured source IDs, layer and region. Their S1/M1 placement and long-range connection are illustrative, not measured cortical identities. V3 optional modeled spines/boutons remain available at High detail.

## Rendering and interaction

All anatomy, somata, terminal fields and routes use the same millimeter coordinate system. Full cell recipes and low-detail paths exist independently of visibility. Camera navigation does not exchange microscopic scenes or multiply cell dimensions.

Initial anatomy is a 1,030,739-byte gzip scaffold containing all 86 original anatomical surfaces (41 bones, four muscles, 35 cortical surfaces, five CNS structures and skin). Near the camera, individual surfaces swap to exact original V3 position/index arrays: 523,602 vertices / 1,053,311 triangles in total. These original surfaces are loaded individually, not at startup.

The cell manifest preserves 159 original source templates. Cellular meshes are compressed individually and loaded on demand; retaining the complete original geometry requires about 67 MB of compressed assets in total, but the entire collection is not required at startup. The largest individual source template is about 4 MB. Decoded cellular templates have a 64 MB / 48-template cache. Rendered cellular details are bounded by source triangle cost and 4/8/14 objects, with a 24-entry / 1.8-million-triangle cache. An inspected original model is never decimated to fit the object budget. Whole-anatomy originals have a separate bounded cache. Original arbors replace provisional local trees; there are no duplicate procedural arbors under the restored mesh.

Rendering stops while idle or tab-hidden. Source loading is coalesced, timed out and retryable. Delayed inspection requests cannot override a later selection or manual navigation. Pixel ratio is bounded by selected quality. Mesh vertices use local source anchors and rigid transforms to preserve micrometre features at body-scale coordinates.

Region navigation, route families, individual cell selection, route isolation, whole-path highlighting, cell/ending focus, export of complete cell registrations and source manifests (already-loaded centerlines are explicitly labeled), scale bar, source notes, fullscreen and a collapsible inspector are included. Focus uses actual intact object bounds and has portrait/landscape framing regressions. There are no section planes, cutaway windows or cross-section controls.

## Scientific scope

This is a representative anatomical construction, not all biological neurons in a finger, an experimentally measured connectome, or a solver-ready membrane model. Source figures span tissues/species and independently magnified panels. Synapses are explicit modeled graph attachments, not mapped subcellular contacts. Cortical overview rendering is simplified; original detailed source arbors load when inspected. Cerebellar, autonomic, reticular and other collateral networks are outside this selected circuit. The supplied gross skin preserves its earlier upper-body crop.

The source comparison plates still show V3 on their left panels and are labeled accordingly. Original scientific figure files and attribution remain unchanged. See `public/assets/finger-pathway-atlas/v4/provenance.json` and `scaffold-provenance.json` for source records and derivation.

## Verification

`npm run build` includes model/morphology/focus regression tests and the existing repository tests. `node scripts/verify-finger-atlas-v4.mjs --build` checks published routes, asset presence, geometry/index validity, gzip identity, source hashes and startup payload. The original V3 geometry/reference verification remains in CI.

Preservation tests compare original V3 geometry bytes, material values, source paths, source-template coverage, world-port continuity and actual object framing. Offline inspection projects actual restored source anatomy and cell mesh triangles. This checks geometry appearance, not browser lighting or interaction. Interactive WebGL QA was unavailable in this managed environment because the supported browser-control skill was not present; no browser frame-rate claim is made.
