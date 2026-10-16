# Finger Pathway Atlas V4

V4 integrates the original V3 detailed cellular models and anatomical surfaces into one deterministic world-registered cell graph. V3 and V4 have independent public pages at `/simulations/finger-pathway-atlas/v3/` and `/simulations/finger-pathway-atlas/v4/`, with separate simulation listings, version navigation and shared reference plates. The existing `/simulations/finger-pathway-atlas/` route remains a V4 alias. The complete original V3 viewer and its untouched source assets remain under `v3-viewer` and `assets/finger-pathway-atlas/v3`; V4 uses `/simulations/finger-pathway-atlas/viewer/`.

## Model

- 306 persistent cell identities in 78 modeled routes: 52 tactile, eight free-ending nociceptive, six proprioceptive, and 12 motor-unit examples.
- Primary sensory neurons have a soma-to-T-junction stem and a continuous peripheral/central axon. DRG is not a synaptic relay.
- Touch and conscious proprioception relay in ipsilateral cuneate, cross in medulla, relay in contralateral VPL and terminate at separate cortical receivers with simplified overview rendering.
- Nociceptive examples relay in the dorsal horn and cross in spinal cord before ascending through brainstem to thalamus and cortex.
- Motor routes use separate M1, spinal-interneuron and lower-motor identities, cross caudally in medulla, leave ventrally and bypass DRG. Median and radial muscle endpoints were corrected against retained source muscle mesh neighborhoods. Ulnar intrinsic-muscle placement remains qualitative.
- Original V3 DRG membranes and satellite patches, spinal/brainstem/thalamic arbors, cutaneous endings, NMJ components and all ten measured human cortical trace templates are retained at exactly 0.001 mm per micrometre. Each cell has a deterministic source-template registration. Original axon/stem ports join the continuous V4 trajectories. SA-II and group-II spindle endings, which lack corresponding V3 templates, retain separately labeled modeled details.
- Source mesh vertices, normals, indices, colors and original captured centerlines are preserved. Two support envelopes close the old Pacinian and spindle inspection openings while preserving their lamellar/capsule complexity. Tissue blocks, generic section planes, window rims and disconnected context fragments are excluded outside the dedicated paired M1/S1 inspection.
- Cortical traces retain their measured source IDs, layer and region. Their S1/M1 placement and long-range connection are illustrative, not measured cortical identities. V3 optional modeled spines/boutons remain available at High detail.

## Rendering and interaction

All anatomy, somata, terminal fields and routes use the same millimeter coordinate system. Full cell recipes and low-detail paths exist independently of visibility. Whole-body navigation retains world registration and physical cell dimensions; paired cortical inspection uses two cameras in local coordinates with explicit world origins.

Initial anatomy is a 1,030,739-byte gzip scaffold containing all 86 original anatomical surfaces (41 bones, four muscles, 35 cortical surfaces, five CNS structures and skin). Near the camera, individual surfaces swap to exact original V3 position/index arrays: 523,602 vertices / 1,053,311 triangles in total. These original surfaces are loaded individually, not at startup.

The cell manifest preserves 159 original source templates. Cellular meshes are compressed individually and loaded on demand; retaining the complete original geometry requires about 67 MB of compressed assets in total, but the entire collection is not required at startup. The largest individual source template is about 4 MB. Decoded cellular templates have a 64 MB / 48-template cache. Rendered cellular details are bounded by source triangle cost and 4/8/14 objects, with a 24-entry / 1.8-million-triangle cache. An inspected original model is never decimated to fit the object budget. Whole-anatomy originals have a separate bounded cache. Original arbors replace provisional local trees; there are no duplicate procedural arbors under the restored mesh.

Rendering stops while idle or tab-hidden. Source loading is coalesced, timed out and retryable. Delayed inspection requests cannot override a later selection or manual navigation. Pixel ratio is bounded by selected quality. Mesh vertices use local source anchors and rigid transforms to preserve micrometre features at body-scale coordinates.

Region navigation, route families, individual cell selection, route isolation, whole-path highlighting, cell/ending focus, export of complete cell registrations and source manifests (already-loaded centerlines are explicitly labeled), scale bar, source notes, fullscreen and a collapsible inspector are included. Focus uses actual intact object bounds and has portrait/landscape framing regressions. The paired cortical inspection now supplies the two requested cross sections; all peripheral inspection stays intact.

## Scientific scope

This is a representative anatomical construction, not all biological neurons in a finger, an experimentally measured connectome, or a solver-ready membrane model. Source figures span tissues/species and independently magnified panels. Synapses are explicit modeled graph attachments, not mapped subcellular contacts. Cortical overview rendering is simplified; original detailed source arbors load when inspected. Cerebellar, autonomic, reticular and other collateral networks are outside this selected circuit. The supplied gross skin preserves its earlier upper-body crop.

The source comparison plates still show V3 on their left panels and are labeled accordingly. Original scientific figure files and attribution remain unchanged. See `public/assets/finger-pathway-atlas/v4/provenance.json` and `scaffold-provenance.json` for source records and derivation.

## Verification

`npm run build` includes model/morphology/focus regression tests and the existing repository tests. `node scripts/verify-finger-atlas-v4.mjs --build` checks published routes, asset presence, geometry/index validity, gzip identity, source hashes and startup payload. The original V3 geometry/reference verification remains in CI.

Preservation tests compare original V3 geometry bytes, material values, source paths, source-template coverage, world-port continuity and actual object framing. Offline inspection projects actual restored source anatomy and cell mesh triangles. This checks geometry appearance, not browser lighting or interaction. Interactive WebGL QA was unavailable in this managed environment because the supported browser-control skill was not present; no browser frame-rate claim is made.

## October 15 — paired M1/S1 sections and cylindrical fibers (current implementation)

This milestone supersedes the earlier no-section cortical-view description above. V3 and all original source assets remain available. V4 filters the **display** to left precentral/postcentral cortex, retaining peripheral, spinal, brainstem and thalamic anatomy. The underlying source archive remains intact.

- The cortex stop opens paired coronal inspection panes; linked pan/zoom, gyrus, six-layer, layer-VI/white-matter and axon presets keep both areas visible. The panes represent separate anterior/posterior planes. The shape is a modeled gyrus ribbon with MRI-inspired gray/white appearance, **not an MRI segmentation**.
- Six curved layers follow a shared pia/white-matter geometry. M1 thickness 3.4 mm and S1 thickness 2.2 mm, fractional boundaries, cell counts (290 M1, 330 S1), and sparse packing are declared priors. M1 IV remains thin. A subset of VI cells has soma-connected corticothalamic examples; motor corticospinal output originates in V. Outputs below the section are continuation ports, not fabricated synapses.
- Main long-range and retained-source paths now use lit, instanced cylindrical meshes at all distances. A display radius floor preserves visibility; the paired view can disable it for physical dimensions. Saved radii are never changed by zoom. Main route identities and all 306 graph cells remain present; cortex graph endpoints/landmarks move together into the modeled layers.
- H01: twelve largest connected `.0.swc` neurite components from the official 104-proofread-neuron release, two sampled from each L1–L6. Densest 15-µm source soma clusters (excluding isolated classifier outliers) were sampled against the official layer volume at 4×4×4.224 µm. SWC xyz require the **anisotropic (32,32,33) nm conversion**, while radii are already nm. This was independently checked against the original proofread skeleton 1072605926 (zero coordinate error for the checked node and matching radius). Original source hashes, IDs, retained topology and units accompany the assets.
- Each source tree is a temporal-cortex morphology reference transplanted rigidly to each modeled region, not a measured M1/S1 cell. Nonbranching source chains use ≤0.7 µm positional RDP simplification with junction/leaf endpoints retained; disconnected extra SWC fragments are excluded. Whole H01 connectivity, EM membrane surfaces and the petabyte image volume are not replicated. Layer-VI modeled continuations start at actual source axon nodes. No duplicate procedural arbor remains under an imported tree.
- The references page includes primary H01, MRI/M1 layer and DKI sources, with a proposed diffusion fitting → orientation peaks → anatomical tracking → cylinder pipeline. No DKI dataset has been fit or used to claim individual axon spacing, caliber or synaptic wiring.

The renderer's added cortical sample is exported separately from the original route graph. Original V3 trace inspection is still accessible from “Selected V3 cell.” H01 downloads are lazy, use a local gzip/fallback asset and retry when toggled after a failed request.


Verification for this milestone: all 231 repository tests passed in the final complete `npm run build`, after the H01 soma refinements, upstream integration and route-selection fixes. Build produced 460 routes. Original V3 mesh/plate verification, V4 static asset checks and Cortex Laboratory artifact verification passed; V4 asset checks were rerun against the final build. Seven new regressions cover layer order/thickness, nonoverlapping somata, separate VI white-matter lanes, retained graph attachments, source-layer/scale integrity, removal of duplicate arbors and cylinder endpoint/radius/picking behavior. Offline geometry projection was inspected at gyrus, laminar and deep-layer scales. Supported interactive browser/WebGL QA is unavailable in this environment; no runtime frame-rate or interaction pass is claimed.


Integration with PR #279: retained its machine-readable cortex bibliography and both BigBrain references; updated its declared layer fractions and scope to match the current construction. The earlier `sensorimotor-cortex.mjs` implementation remains in source as the prior checkpoint, but its renderer/control prototype hooks are no longer loaded. `cortical-model.mjs`, `cortical-sections.mjs` and `tubes.mjs` now own the explicit viewer integration. This prevents the earlier renderer hook from moving one cortex scene between the two new scissored panes. Original V3 remains unchanged.
