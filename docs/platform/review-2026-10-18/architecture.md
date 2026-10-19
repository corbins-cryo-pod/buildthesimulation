> Supporting audit for the [platform review](../REVIEW_2026-10-18.md). Inspected implementation: `4a15be0ca29bef6c1c6a963cb311b52ba8f34ba8`. Audit work crossed midnight UTC; the review is dated October 18 in America/New_York. Proposed work is not a shipped capability.

# Architecture and reproducibility review: BuildTheSimulation

Review base: `4a15be0ca29bef6c1c6a963cb311b52ba8f34ba8`, local repository `/workspace/scratch/c4f147c01b63/buildthesimulation`. This was a read-only source and built-artifact inspection. No full test run, expensive numerical experiment, browser session, or deployment was performed by this reviewer. One small deterministic recording-engine probe was run to verify a source-level RNG concern, as documented below. Findings about runtime cost are structural inferences unless an existing measured result is cited. The new default replay metadata records 159.27 seconds of computation; it is not a browser timing measurement.

## Overall assessment

The strongest foundation is already present: the original Cortex Laboratory separates morphology, cable dynamics, conductor coefficients, experiment protocol, worker execution, replay and evidence. The integrated interface reuses the actual human cable kernel, preserves full source morphologies, separates neural recordings from the stimulus artifact and exposes the idealizations. This is much more substantial than a visual demo. The next architecture step should make those boundaries reusable across the platform, while preserving the different scientific meanings of existing laboratories.

The platform should become one coherent *experiment system*, not one universal neuron model or one monolithic application. A reconstructed human cable, a reduced population cable, a phenomenological firing sandbox, a pathway illustration and a measured recording are different types of evidence. They can share selection, replay, plotting, device identity, export and provenance without pretending to be equivalent physics. The primary technical risk is now inconsistent contracts between otherwise valuable components, followed by unmeasured browser performance and incomplete integration testing.

A rewrite would damage the best part of the project: independently checked numerical kernels and pinned source assets. The recommended path is to wrap proven modules in explicit adapters, extract repeated infrastructure only when a second consumer needs it, and keep old routes working as focused teaching and verification instruments.

## What was inspected

| Surface | Actual current implementation | Architectural role and important distinction |
| --- | --- | --- |
| New interface laboratory | `src/components/CortexInterfaceLaboratory.jsx`, `src/lib/cortex/interface-*` | Twelve complete active human cables, joint planar finite-contact lead fields, stored replay, ideal recording and soma events. This should be the flagship integrated experiment. |
| Original Cortex Laboratory | `src/components/CortexLaboratory.jsx`, `src/lib/cortex/experiment.js`, active/passive kernels, `population.js`, `world.js` | Detailed source model inspection, current clamp, synaptic input, explicit source/return experiments and independent reference history. Keep as the source-model and numerical inspection bench. |
| Finite disk and geometry gallery | `finite-contact.js`, `finite-experiment.js`, `finite-ui.js`, `gallery-field.js`, their workers and validation scripts | Scoped field verification and intuition. Their accepted domains and boundary conditions do not transfer automatically to the new shank. |
| Cortical stimulation laboratory | `src/lib/stimulation/{anatomy,field,membrane,experiment,config}.js`, `CorticalStimulationLab.jsx` | Synthetic population with a reduced membrane model, immersed-sheet/full-space field approximation, interface/compliance model and recruitment summaries. Useful as a separate lower-cost model tier. |
| Cortical recording laboratory | Live route loads `public/scripts/cortex-v2/main.js`; engine and scene are in that directory | Seeded phenomenological activity, fabricated extracellular-like kernels, correlated noise and known source-event visibility. It is not the source of the new laboratory's membrane physics. |
| Peripheral nerve cross-section | `src/pages/sim.astro` | Original main-thread visual sandbox, proxy threshold activation, editable geometry and unversioned JSON import/export. The oldest and least contract-driven surface. |
| Finger Pathway Atlas V4 | `src/lib/finger-atlas-v4/*`, preserved cell manifest and cells, V4 page | Anatomical route illustration with preserved source geometry, explicit modeled registrations, adaptive LOD and bounded caches. It is a source of visualization infrastructure and anatomical context, not proof of a connected physiological network. |
| Finger Atlas V3 and original atlas | Preserved public assets, original viewer route, V4 preservation pipeline | Historical source geometries and comparison views. Preserve provenance and distinguish observed geometry from constructed connections. |
| Cell atlas | `CortexCellLibrary.jsx`, model registry/library, `/cells/` | Source identity, morphology and fit selection. It should provide the shared cell identity for every electrical experiment. |
| Device directory and model viewers | `src/lib/devices/*`, `DeviceModelViewer.tsx`, catalog/content | Physical geometry, source dimensions, documented/assumed/omitted evidence, identity and exports. Device sites are deliberately distinct from hardware channels. |
| Interface designer | `src/lib/designer/*`, `NeuralInterfaceDesigner.jsx` | Concept geometry, routing and checks. It already has bounded imports, explicit units, a versioned document and cancellation. A future adapter should pass its geometry into simulation only after conductor support checks. |
| Measured recordings | `RealRecordingExplorer.tsx`, `NeuropixelsExplorer.tsx` | Human binned threshold-crossing counts and mouse unit data, respectively. These are real data but are not mapped contact-for-contact to the displayed devices and are not raw voltages suitable for direct waveform validation. |
| Deployment and checks | `package.json`, `.github/workflows/*`, build verifiers and tests | Static Astro site, pinned lockfile, Node numerical/reference tests, built artifact checks. Browser behavior is an explicitly outstanding gate. |

## Existing strengths to preserve

1. Numerical code is separated from rendering and runs in both Node and a browser worker. `active-cable.js` should remain the authoritative implementation until an independently verified replacement exists. `experiment.js` and `world.js` encode units, sample conventions and placement instead of taking physical properties from Three.js meshes.
2. There is unusually good evidence hygiene: original SWC and mechanisms, generation hashes, NEURON/LFPykit fixtures, exact-configuration matching in `experiment-evidence.js`, separate empirical and numerical claims and retained failures. The evidence matcher does not certify arbitrary current settings merely because a neighboring example passed.
3. The interface preserves complete morphologies and fails the experiment if support is invalid; it does not silently drop cells or replace invalid fields with point sources. Its stored recordings can be checked independently through KCL, as in `tests/interface-experiment.mjs`.
4. `interface-field.js` jointly solves active and floating pads and checks reciprocity/current balance. Its finite surface integration is distinct from its point approximation for compartment currents. That separation belongs in the common field contract.
5. The archive records protocol, geometry, waveform arrays and compartment history. Saved examples carry source-code fingerprints and a compressed-file checksum. Tests reject stale examples instead of merely trusting a screenshot.
6. Worker cancellation and stale-result suppression already exist in several variants. The original Cortex worker has request IDs, result transferables and a reused lifetime; designer and stimulation workers explicitly invalidate jobs. The new interface has worker identity checks and fetch aborts.
7. V4 already solves much of the rendering infrastructure problem: on-demand drawing, visibility handling, fixed quality budgets, adaptive cellular detail, bounded decoded assets, triangle-count eviction and preservation metadata. Those patterns are better starting points than adding another unrelated rendering framework.
8. Device geometry export has explicit unit distinctions and unknown channel mappings. Designer exports escape SVG text and guard spreadsheet formula prefixes in netlist CSV. These are useful existing defenses to preserve when adding interoperability.

## Ranked concrete issues and improvements

### 1. Shared scientific meaning is still implicit across routes — high priority, medium effort

There are several real conductor and neuron implementations, not merely duplicated helper functions:

- Original Cortex: full-space isotropic point/line transfers in `volume-conductor.js`, original human active cables and explicit source/return protocols.
- New interface: isotropic half-space, joint finite rectangular pads, infinite insulating backing, return at infinity and point transmembrane sources.
- Stimulation lab: diagonal anisotropic full-space Green function, uniform-source immersed sheets with two exposed faces, reduced Pospischil-style cable and a circuit/compliance approximation.
- Recording lab: synthetic spike kernels, inverse-distance gain with a softening length, correlated noise and known event filtering.

Unifying those under a generic `field` boolean would make future comparisons scientifically misleading. Add a capability manifest for each model: model ID/revision, domain, source type, boundary conditions, reference, conductivity type, supported geometry, event semantics, evidence class and numerical limits. A consumer should request a capability and receive an explicit supported/unsupported result. Do not silently fall back to a different solver.

Acceptance gate: every displayed trace, event and result identifies its generating model; the same quantity name and unit cannot mean a physical prediction in one route and synthetic units in another without an explicit evidence-class distinction.

### 2. Replay updates do avoidable repeated work — high priority, small/medium effort

`CortexInterfaceLaboratory.jsx`'s `Plot` effect depends on `frame`. Every replay update resets three canvas dimensions, redraws axes, rescans complete arrays, recomputes min/max and mean, rebuilds two full signal paths and redraws the full raster. The default has 2,601 frames. The same Preact component also remaps all compartment `<option>` elements and contact metrics during replay. `interface-scene.js` renders continuously even while paused and has no visibility suspension.

The original `CortexElectricalPanel`/architecture already separates trace geometry from replay cursor; V4 uses a dirty renderer and visibility handling. Apply those patterns: memoize static traces by result/contact/component, use a small overlay for cursors, update numerical readouts at a bounded rate, render the 3D scene on playback/camera/selection changes and suspend when hidden. Avoid coupling the solver timestep, plot repaint rate and monitor refresh rate.

Acceptance gate: recorded traces do not rescan on cursor-only changes; a paused static scene generates no continuous renders after damping settles; hidden pages stop replay/render work. Measure 95th-percentile frame time on a declared representative laptop and mobile device before committing to a frame-rate target.

### 3. The new worker lifetime defeats its caches — high priority, medium effort

`interface-experiment.js` contains `conditionedStates` and `cachedField`, but `CortexInterfaceLaboratory.jsx` creates a new worker for each run and terminates it immediately after a result. Every new experiment reloads model assets and repeats conditioning/field work. The original Cortex workflow already retains a worker across completed runs.

Use one worker-owned experiment session with explicit job IDs. Retain immutable models, field basis and conditioned states behind bounded keys that include model asset hash, mesh, timestep, temperature/guard policy and settling duration. Termination remains a valid hard cancel; a subsequent job can create a new worker. Do not introduce cooperative cancel logic inside the trusted solver unless it can be tested without changing numerical results.

A second improvement is incremental result delivery: independent cells can finish in turn, but the current page receives only geometry, progress and one final full result. Publish complete per-cell chunks with a run ID, then mark the aggregate recording complete only when every selected cell contributes. A partial view must say how many cells are complete and must never look like the final all-cell signal.

Acceptance gate: a repeated identical run reuses assets/conditioning; cancel prevents old progress/results from replacing a newer run; reruns are numerically identical; cached bytes are bounded and reported.

### 4. Default-model bundling makes every solver expensive to load — high priority, medium effort

`model-library.js` statically imports `models/allen571654895.json`. Built assets currently include a 2,577,676-byte active-morphology chunk and worker bundles of approximately 2.56–2.66 MB each. This is before other requested specimen assets and Three.js. These are uncompressed built file sizes, not measured network transfer sizes.

Move the default model behind the same asset loader as other specimens, while retaining exact IDs and checksums. Separate lightweight metadata from morphology/fit payloads. Generate a manifest that lists each mesh asset, compressed size, decoded size and checksum. Keep workers thin and let immutable content-addressed assets benefit from browser caching.

Acceptance gate: loading controls and the scene does not parse all model geometry; fetching one model does not fetch other meshes; no change in exact numerical fixtures or source identity.

### 5. First replay delivery is monolithic and decoded on the main thread — high priority, medium/large effort

The default interface asset is 11,059,654 gzip bytes; its encoded archive is 25,671,008 bytes. Decoding expands quantized membrane samples to Float32 arrays, copies binary buffers and creates full object geometry. `accept()` then builds every mesh. These are reasonable amounts for many desktops, but there is no measured browser memory or long-task gate. The engine's 160 MB check counts only `totalNodes * frames * 4`, not geometry, decoder copies, plots, worker caches or GPU data.

Offer a small manifest/summary first, then geometry and the initial replay chunk, then later time windows or cells. Decode binary data in a worker and transfer arrays. Maintain an explicit total memory estimate, evict old replay chunks and preserve a full downloadable archive separately. The initial frame must not be a fake AP or an unmarked visual placeholder; it can be the first genuine chunk from the exact saved experiment.

Acceptance gate: quick protocol/geometry inspection before the full download; loading progress has actual bytes or completed chunks; missing chunks are visibly pending; bounded peak memory includes CPU and estimated GPU allocations; data-saver users can opt into the full replay.

### 6. Provenance differs between saved and freshly computed results — high priority, small/medium effort

`scripts/interface-default.mjs` appends `solverSourceHashes` and `replayPrecisionMv`; the runtime `runInterfaceExperiment()` does not include equivalent build fingerprints. Both use `cortex-interface/1`, which is a schema version rather than an exact implementation revision. The saved archive is tested against a summary hash in CI, but the browser loads the archive without using its accompanying summary manifest.

Generate an engine manifest at build time and inject its commit/build hash, numerical source hashes, asset hashes, environment conventions and schema version into every result. Keep schema version, engine revision, model revision, design revision and evidence revision distinct. A checksum is primarily a corruption/staleness and scientific audit feature here, not a reason to imply hostile inputs are likely.

Acceptance gate: every exported result can answer which exact implementation and assets produced it; runtime and saved results have the same required provenance fields; an unavailable asset revision is rejected rather than silently substituted.

### 7. Device geometry, designer geometry and simulated contacts need a real adapter — high priority, medium/large effort

Device exports use millimeters (`positionMm`, area in mm²), the designer uses 2D micrometers (`x`, `y`, `w`, `h`, rotation), original Cortex uses posed `positionUm`, and new pads use `centerUm` in x/z on y=0. Device catalog contacts have nullable hardware channels; designer routing assigns conceptual channels. These cannot be merged by spreading objects or multiplying a few fields without a documented coordinate frame.

Define a device geometry document with explicit local frame, body surfaces, contact faces, shape dimensions, exposed area versus projected area, normals, material/interface model identifiers and physical-site versus hardware-channel mapping. Each adapter must retain the source object/revision and emit a transform record. Only supported planar pad designs should enter the first interface solver. Unsupported curved surfaces should be visible but not passed to the planar BEM under an approximate label that hides a different geometry.

Acceptance gate: mm↔µm round trip and rigid-pose tests; physical-contact IDs survive import/export; unknown hardware maps remain null; every drawn field surface is generated from the same numerical geometry document.

### 8. Experiments need a common, limited result envelope — medium/high priority, medium effort

Current results use differing names and layouts: `timeMs` versus `time`, `somaMv` versus `soma`, `neuralUv`, dictionary traces, different event definitions and frame conventions. Do not rewrite every engine to return an identical internal struct. Introduce an adapter envelope around native results:

- immutable experiment specification and canonical digest, separate from the editable draft;
- model/cell/device IDs and transforms;
- signal descriptors with units, sampling convention, reference and shape;
- numerical events with exact criteria and source compartment;
- evidence status with exact scope;
- payload manifest with chunk IDs, dtype, dimensions, byte order, precision and hashes;
- display state stored separately from experimental state.

This enables one trace inspector, replay cursor, export panel and comparison view without flattening distinct models. Keep a typed `eventKind`: `soma-action-potential`, `local-threshold-crossing`, `synthetic-source-event`, `measured-threshold-count` and eventually `detected-extracellular-event` are different records.

Acceptance gate: a plot component cannot show mV as µV; the spike raster cannot swap source events for detected events without changing its labels and metadata; any comparison lists changed scientific inputs.

### 9. Scientific validation is strong locally; browser and flagship route gates are missing — high priority, medium effort

Existing numerical tests cover channel/reference behavior, geometry, transforms, output buffers, KCL, finite-field invariants and stored replay fingerprints. These are substantive strengths. But `scripts/verify-cortex-build.mjs` targets the original Cortex route and worker; it does not verify the new interface route, methods, worker asset and example files. `/cortex/interface/` is also missing from `src/lib/discovery-index.js`.

The GitHub workflows run on pull requests and manual dispatch, not `push`. A direct-to-main publish therefore depends on the hosting build for npm tests/build, while the extra static verifiers in the GitHub workflow may not run automatically. The second rendering workflow duplicates an Astro build. Establish one required pipeline with deliberate fast and slow lanes instead of making every UI adjustment rerun every expensive reference computation multiple times.

Add a browser gate when supported browser tooling is available: load saved replay, select every cell, inspect a distal branch, change pad selection, run a small case, cancel, change inputs, scrub, switch examples, download exports, resize, navigate away, simulate WebGL failure and inspect console/network errors. Static string matches and Node worker adapters do not prove those interactions. This review did not perform browser verification.

Acceptance gate: interface is searchable; the actual built route references a valid bundled worker; all data assets and compressed decode paths load; race/cancel/unmount paths have behavioral tests; numerical changes trigger independent fixtures/refinement while cosmetic changes use the narrow relevant gates.

### 10. Existing documentation gives contradictory architecture guidance — medium priority, small effort

`docs/cortex/README.md` still says finite contact is not integrated, the human cell is the only selectable model and distinct-source diversity does not work. These statements contradict the current implementation and other documents. This is operationally important: another AI or developer can take that file as authoritative and plan the wrong integration.

Keep one generated/current capability table, one route/module ownership map and a dated milestone log. Historical documents should retain their findings but carry an explicit historical-scope banner and link to the current state. Reference documents must not be overwritten to make earlier failures disappear.

Acceptance gate: no current overview says a shipped feature is absent; all current claims map to a capability or exact evidence entry; stale-doc checks cover a small list of critical claims rather than brittle tests for arbitrary wording.

### 11. Historical slab engines create maintenance ambiguity — medium priority, small effort

There are `src/lib/sim/cortex/*`, `src/scripts/cortex-slab.ts`, `src/scripts/cortex-slab.mjs`, `public/scripts/cortex-slab.js` and the live `public/scripts/cortex-v2/*` implementation. The live route explicitly loads the last one. Earlier TS forward code truncates kernels at block ends, but that is a dormant-path issue; the live engine carries waveform tails and has a regression test. Future edits can easily fix the wrong implementation.

Mark unused implementations as historical with a manifest/README or move them into an explicit archived source area after checking references. Migrate the live recording lab under normal bundled source in a behavior-preserving step so dependency analysis and hashed assets apply consistently. Do not erase its history or mistake phenomenological recordings for a reusable membrane solver.

### 12. Older peripheral input handling has concrete defects — medium priority, small/medium effort

`src/pages/sim.astro` contains duplicate `dur`, `durVal`, `durMin` and `durMax` IDs and an extra closing label around lines 124–145. The page binds controls by ID, so the second train-duration control cannot have reliable behavior. The importer only checks truthiness of nerve/fascicles/electrodes, accepts arbitrary object structures and uses an imported axon count without an explicit import limit. The designer's versioned bounded parser is a better local precedent.

Repair the duplicate controls, add a schema version and finite/range/count validation, and separate seeded scientific inputs from view state. Treat failures as invalid imported files rather than letting malformed data reach drawing/allocation loops. This is a robustness improvement, not a claim of a demonstrated external security exploit.

Acceptance gate: unique DOM IDs, bounded import size and counts, rejection of nonfinite coordinates and incompatible versions, reproducible export/import with a recorded seed.

### 13. Accessibility needs actual experiment access, not just canvas labels — high priority, medium effort

The new interface has labeled controls, cell/compartment selectors and WebGL fallback, which are good foundations. Canvas aria labels identify the plot but do not expose its changing data. Its default autoplay is not disabled by `prefers-reduced-motion`; the CSS only stops the status pulse. Several important labels use 8–11 px text, and on narrow screens the entire control panel precedes the first scene.

Provide a tabular event list, selected sample values, keyboard next/previous spike and compartment navigation, accessible recording extrema and units, obvious focus and a reduced-motion default. Preserve direct numeric controls alongside mouse picking. Keep content usable at browser zoom and with WebGL unavailable. A compact experiment summary and early replay panel would help both accessibility and mobile comprehension.

Acceptance gate: the complete experiment can be configured, run/cancelled and inspected using the keyboard; screen-reader users can retrieve the actual selected values and event times; reduced-motion users do not receive automatic repeated playback.

### 14. Recording-channel count changes the synthetic neurons — high priority, small/medium effort

A concrete behavioral probe confirmed a hidden coupling in the live recording engine. `public/scripts/cortex-v2/engine.js` uses the same `rand` stream for firing, network modulation, burst recruitment and every electrode's noise samples. Therefore adding a recording channel consumes extra random numbers and changes subsequent neural events, even when `noiseUv: 0`, `burstSeedProb: 0` and `modStrength: 0`.

With the same seed 1337, 20 cells, 8 kHz sampling, 100 steps of 4 ms and otherwise identical configurations, one recording contact produced 30 source events while two contacts produced 24. This is an instrumentation-only change altering simulated physiology. The existing deterministic test compares identical channel configurations and does not catch this invariant.

Use independent deterministic streams for physiology, network/background processes, per-neuron variation and per-channel instrument noise. Derive channel noise seeds from stable contact IDs rather than array order. Record their seed/version policy in the experiment. The new active-cable interface does not use this stochastic event engine; do not import this coupling when adding its noise/acquisition model.

Acceptance gate: adding/removing/reordering passive recording channels or changing noise level leaves the source event sequence and neural membrane dynamics exactly unchanged. Identical physiological inputs reproduce identical source histories.

### 15. Pending input and completed run must remain visibly separate — high priority, small/medium effort

The new interface shows a pending-controls notice, but `setContacts(config.activeContacts, contact)` updates the shank's selection rings immediately while `setFrame(result, ...)` still shows the previous run's membrane and contact-current data. Users can therefore see a prospective pad selection beside a computed historical response. This is especially risky when the page is meant to explain causal stimulation effects.

Make `ExperimentDraft` and immutable `RunResult` explicit states. The scene should distinguish or separately switch between draft geometry/protocol and the computed run, and every plot/replay title should name its run. A pending pad can be outlined as a draft choice while the actual delivered current remains tied solely to the completed result. Avoid making the draft look as if it has already caused the displayed firing.

Acceptance gate: modifying a contact or protocol cannot change a computed-run label, field, event, waveform or applied-current highlight; it changes only the explicit pending draft until a new run completes.

### 16. Fast geometry sweeps need retained source currents — medium/high priority, medium effort

For recording-only experiments where cells, drives and conductor feedback assumptions are fixed, contact-position/geometry sweeps can reuse a full-precision transmembrane-current history and reproject it through new lead fields. This can turn a repeated multi-minute cable solve into a much cheaper forward-model comparison. The optimization is exact only within the one-way coupling assumptions and with the actual retained currents.

The current saved replay archive contains rounded per-compartment Vm at 0.01 mV precision, not full per-compartment membrane-current histories. It does not already provide an exact source-current cache, and inferring currents from rounded Vm without an error study is not an equivalent replacement. Add an optional full-precision source-current cache, or a validated compressed basis with a declared error budget. Stimulation or electrode-boundary changes that alter the imposed extracellular field require rerunning the cable; a no-drive recording sweep must not be reused as an evoked result.

Acceptance gate: cached recording-only reprojections match a full rerun within a predeclared tolerance; cache keys cover all source-dynamics inputs; changes that affect membrane dynamics invalidate the cache; approximation/quantization is recorded in export metadata.

## Proposed shared architecture without a rewrite

Use five stable boundaries rather than moving every file into a new framework.

1. **Experiment specification.** An editable `ExperimentDraft` produces an immutable versioned specification that names the cells, complete morphology/fit revisions, device geometry, tissue, stimulus, background drive, numerical settings and intended outputs. Separate view state from scientific input. Canonical serialization produces a run key; changing a camera never changes this key.
2. **Model adapters.** Existing original-cable, reduced-cable, point/line conductor, finite-disk, joint-pad and synthetic-recording engines retain their algorithms. Each adapter declares capabilities, validates the specification and produces a planned job. The new flagship initially consumes only the original active cable and joint-pad field.
3. **Execution and asset session.** A worker owns exact assets, bounded conditioned states and field matrices. It sends job-identified progress and immutable result chunks. Cancellation and cache eviction are common infrastructure. Numerical integration remains independent of display scheduling.
4. **Result and evidence store.** Store signals with units/reference/sample convention, compartment/event maps, full provenance and exact evidence applicability. Binary chunks are content-addressed and independently decodable. Replay quantization belongs to storage metadata, not to the solver settings.
5. **Inspection surfaces.** Shared trace/raster/selected-compartment widgets consume descriptors. The 3D renderer consumes physical geometry plus voltage samples and a display policy. Device, cell and anatomy pages can launch an experiment using source IDs and transforms instead of copying model data.

The key transfer from the recording lab is user interaction: multiple contact traces, stable time windows, raw export and a clear distinction between source events and detected events. The key transfer from the stimulation lab is experimental thinking about delivered current, interface voltage and charge—not its membrane kinetics or its full-space sheet field. The key transfer from the atlas is multiscale camera/LOD/provenance, not invented physiological connectivity. The key transfer from the designer is editable contact geometry with units and validation, not a foundry-ready or electrochemically validated device.

## Transition sequence and acceptance gates

| Stage | Deliverable | Relative effort | Main risk | Gate |
| --- | --- | --- | --- | --- |
| A. Stabilize current flagship | Search/build coverage, clear status/loading, stale docs, keyboard/reduced-motion behavior, preserve exact numerical results | Small/medium | Accidental physics changes during polish | Existing reference and saved replay hashes unchanged; route/asset checks; browser checklist when tooling exists |
| B. Measure and remove repeated work | Plot/cursor separation, demand rendering, worker retention, asset/model split, timing/memory report | Medium | Stale buffers or cross-run state | Repeat/cancel/rerun determinism, bounded memory, measured browser long tasks and frame time |
| C. Common experiment envelope | Model capability descriptors, exact engine manifests, signal/event descriptors, evidence adapter | Medium | Generic schema hides scientific differences | Unit/frame/reference contract tests; old exports still readable; no silent migrations |
| D. Reusable device geometry | Designer/catalog adapters for supported planar contacts; source-revision transform log | Medium/large | Wrong frame, exposed area or hardware mapping | Transform/area/normal round trips; solver geometry equals visible geometry; unsupported forms rejected |
| E. Controlled comparisons | A/B protocol and geometry comparison with full changed-input list and matched cells/drive | Medium | Confounding contact position with size or baseline with stimulation | Identical-source baseline pairs; deterministic differences; event attribution stated as method, not assumed |
| F. Streaming investigation | Chunked long replay, independent-cell execution scheduling, resource estimator, checkpointed jobs | Large | Partial results mistaken for final or hidden low fidelity | Exact reconstructed aggregate, partial-state labels, no silent dropped cells/samples, resumable immutable chunks |
| G. New scientific capability | True finite shank/side/back/return geometry, electrode interface and acquisition chain, independently validated detector | Large/research | New calculations look authoritative before validation | Separate reference solver; mesh/domain/timestep convergence; withheld measurements where available; exact evidence-scoped release |

Each stage should be useful on its own. Do not wait for a general framework before fixing the flagship's first-run experience, and do not use a polished first-run experience as evidence that the full finite-shank physics is solved.

## Suggested platform performance and reliability budget

Set budgets from measurements rather than asserting they are already met. A useful initial target set is: meaningful controls/geometry before the full replay download, no long synchronous decode or mesh construction blocking interaction, bounded main-thread work during replay, zero continuous rendering when paused/hidden, cancellation feedback within one UI update, and a visible total memory estimate before expensive runs. Declare the device/browser used for each result.

For regression automation, retain cheap algebra/unit tests on every change; run numerical fixture comparisons when kernels/assets/protocols change; run slow convergence studies as explicit scientific jobs with immutable outputs. Browser tests should exercise the built artifacts rather than dev-only imports. Deployment should record commit, test summary, asset manifest and rollback target. A successful upload is not proof that a page has passed its runtime interaction checklist.

## Reproducibility standard for the flagship

A downloaded experiment should be enough to reconstruct its meaning years later. It should contain schema version, engine/source revision, model and source-data hashes, geometry with explicit frame and units, every waveform parameter including return/reference, background-drive definition and timing, solver/sample settings, event criteria, exact result descriptors, evidence applicability, numerical warnings, quantization and export scope. It should distinguish requested settings from delivered settings once interface/compliance physics is introduced.

The flagship's result should support three separate questions: what was computed, how accurately was that computation verified, and what observation supports its relevance to real tissue. These are separate records, and the interface should make each discoverable. That distinction is what allows the project to become both visually compelling and technically defensible as it grows.
