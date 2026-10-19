> Supporting audit for the [platform review](../REVIEW_2026-10-18.md). Inspected implementation: `4a15be0ca29bef6c1c6a963cb311b52ba8f34ba8`. Audit work crossed midnight UTC; the review is dated October 18 in America/New_York. Proposed work is not a shipped capability.

# BuildTheSimulation experience audit

Prepared from the current repository on 2026-10-19 UTC. Repository root: `/workspace/scratch/c4f147c01b63/buildthesimulation`.

## Scope and confidence

This is a source-based review of the simulation product and its user experience. I inspected the new Neural Interface Laboratory, the original Cortex Laboratory and finite-disk mode, the field gallery, the older cortical recording and stimulation labs, the Cell Model Atlas, the neural interface designer, the Finger Pathway Atlas, and the peripheral cross-section simulator. I inspected the relevant components, routes, model interfaces, and styles. I did not run a browser, observe user sessions, measure rendering performance on a device, or claim that a proposed usability problem has been observed in a browser. The supported browser plugin was unavailable and the Sites workflow prohibits an improvised browser fallback.

The facts below distinguish an explicit behavior in source from its likely effect on a user. The recent interface fixes for async scene initialization, stale worker callbacks, background contrast, and the legend are present in the reviewed source; they are not listed as outstanding defects.

## Overall judgment

The site already has unusually valuable ingredients: sourced human cable models, actual compartment-voltage replay, controlled numerical examples, an increasingly honest finite-contact model, a substantial device catalog, a usable geometry editor, measured data excerpts, and an anatomically ambitious atlas. The core opportunity is to make those ingredients behave like an experiment system.

At present a user encounters a family of independently developed applications. Several are called laboratories, several draw similar neurons or contacts, and several offer current, voltage, spikes, and recording. They do not share a meaning of a run, cell identity, contact geometry, replay time, signal processing, or evidence state. The user must learn the software architecture to understand which tool answers a question. That is the central experience problem. A unified visual skin alone would leave it intact.

The proposed product should let a visitor ask: **What is my biological specimen? What is the interface? What input is applied? What is calculated? What changed between these two experiments? How much confidence should I place in that difference?** Those six questions should remain answerable in every workspace.

## What users can and cannot currently answer

| User question | Current capability | Current obstruction |
|---|---|---|
| Can I watch all twelve modeled cells change membrane voltage? | Yes, in the new interface lab, using actual saved compartment voltages and one palette. | The default is a finite prerecorded numerical window that loops; it is not continuously evolving network activity. The label “LIVE REPLAY” is easy to overread. |
| Can I stimulate chosen surface contacts and inspect a response? | Yes, the new lab lets users choose pads and run a coupled finite-contact calculation. | The field assumes an infinite backing plane and remote return. The visible shank's tip and sides are not electrical design variables yet. |
| Does a larger electrode improve recording? | Users can compare ideal signal amplitudes at differently sized pads. | Pad size and position vary together, all signals are automatically rescaled, and no hardware impedance/noise model is present. The current comparison cannot isolate an area effect or establish detection probability. |
| Which cell produced a feature in my recording? | Ground-truth cell events and the summed contact signal are available. | There is no event-linked per-cell contribution view, simultaneous selected-cell signal decomposition, or simulated detection/sorting pipeline. |
| Did stimulation cause an extra action potential? | Evoked and combined protocols exist; raw events and waveform-qualified soma events are calculated. | The new lab lacks the original lab's pinned-run comparison workflow and a matched no-stimulation counterfactual. A visual coincidence is insufficient. |
| Can I compare every recorded contact at once? | All eight are calculated and have amplitude summaries. | The new display is a single selected channel. The older synthetic recording lab already offers multiple trace panels, but from different physics. |
| Can I design a contact arrangement and test it? | The designer produces physical-scale contacts, routing, substrate, and exports. | There is no declared adapter from the designer's document to a supported field geometry. The new lab imports a fixed eight-pad design. |
| Can I choose a sourced cell in the atlas and carry it through the new experiment? | The Cell Model Atlas links electrical entries into the original Cortex Laboratory. | The new interface population is a fixed preset list with a count control, not a selectable specimen collection or a preserved experiment handoff. |
| Can I inspect anatomy from finger to cortex? | Yes, the atlas has region navigation, retained cell identity, detail loading, and source references. | Its modeled anatomical connections do not become electrical network connections. That distinction is correctly stated in its scope but is not represented as a shared capability system across the site. |
| Can I reproduce a previous experiment? | Strong in original Cortex and designer exports; the new lab exports a complete binary replay. | The new lab has no replay-import UI, and the peripheral app recreates unseeded random axons on import. Export does not consistently mean reproducible experiment. |

## Strengths to preserve and extend

1. **The original Cortex Laboratory's baseline workflow is already the right pattern.** `src/components/CortexLaboratory.jsx` pins a run, lists changed configuration fields, reports metrics, overlays traces only when the time grids match, and exports both runs. It states when a comparison is not aligned. This is more useful than creating another attractive but disconnected results dashboard.
2. **The new interface uses one physical pathway for both stimulation and recording.** The UX can now connect what the contact does, what the membrane does, and what the contact sees. Preserve the explicit distinction between neural signal, direct artifact, and total potential.
3. **The Cell Model Atlas separates electrical models from morphology-only references.** `src/pages/cells/index.astro` also states that previews are independently fit and that source axons may differ from the replacement axon in the active fit. This is strong provenance communication.
4. **The designer has real interaction depth.** It supports multiple selection, box selection, undo/redo, keyboard nudging, numeric editing, local persistence, clear unresolved routing, and multiple export formats. These are good shared interaction patterns for the rest of the platform.
5. **The field gallery uses shared physical axes and a common scale across the displayed comparison.** It exposes actual panel boundaries and supports keyboard inspection. Those choices make its figures interpretable.
6. **The atlas has a deliberate hierarchy of anatomical and cellular views.** It preserves identity while changing detail, budgets geometry explicitly, pauses when hidden, and offers a source map. This is a stronger approach than loading every detailed object all the time.
7. **The measured recording explorer is careful about what a raster means.** `src/components/RealRecordingExplorer.tsx` says that its rows are channels, its values are 10 ms counts, and its rate trace is not voltage. Keep this precision when adding detector features to simulations.

## Ranked findings and acceptance criteria

### 1. The launcher presents different scientific products as peer versions of the same thing

**Code evidence:** `src/pages/simulations/index.astro` offers Neural Interface Laboratory, Cortex Laboratory, Cortical stimulation lab, and Cortical recording lab as similar cards. The reduced stimulation tool says “Shape finite electrodes” and “realistic cellular scale”; its implementation uses synthetic reduced neurons. The recording lab renders 1,600 synthetic source units and waveform kernels. The original Cortex lab uses reconstructed human cable models. The new interface lab uses a new coupled finite-contact approximation. These are complementary capabilities, not interchangeable editions.

**Likely user impact:** A visitor may pick the more convenient tool and assume its recruitment or noise results are corroboration of the detailed human model. Long methods pages cannot fully repair an ambiguous first choice.

**Recommendation:** Organize the launcher by task: **Run a neural-interface experiment**, **Explore anatomy**, **Design an interface**, **Explore signal concepts**, and **Inspect source data**. Make the integrated lab the principal experiment entry. Keep the original tools available with short capability labels such as “reconstructed human cells,” “reduced synthetic cells,” “synthetic signal demonstration,” and “anatomy only.” Avoid calling the latter tools verified alternatives to each other.

**Acceptance:** In a first-click test, users can choose the tool for “compare ideal recordings from two contact geometries” and explain which available labs calculate membrane dynamics. Every launcher card displays its model class before entry.

### 2. Contact comparisons cannot currently isolate the design variable the user cares about

**Code evidence:** `src/lib/cortex/interface-field.js` hard-codes eight contacts with varying size and z position; `src/components/CortexInterfaceLaboratory.jsx` exposes selection but no geometry variant editing. It correctly notes that differences reflect both position and geometry. The designer is a different document model.

**Likely user impact:** “Pad 3 has a larger signal than pad 1” can be mistaken for “30 µm is better than 12 µm,” despite different cell distances, orientations, and population contributions.

**Recommendation:** Add a **controlled comparison** action at a selected contact: duplicate this experiment, change only this contact's shape/area, preserve center, orientation, cells, drive, return configuration, and numerical settings. Offer explicit comparison constraints: same total current, same current density, or same terminal voltage where the model supports them. Record which condition is held constant; these are different experiments.

**Acceptance:** A size comparison has a machine-generated configuration diff showing exactly the intended geometry and any derived parameters. Shared time and amplitude scales are default. Unsupported comparison conditions are unavailable with a specific reason.

### 3. The integrated lab's plots hide useful comparisons through automatic scaling

**Code evidence:** Its `Plot` function always subtracts the mean from recordings and independently chooses a symmetric y range for the selected channel. The only recording plot is the chosen channel. `src/lib/cortex/gallery-ui.js` recomputes its shared color maximum from current amplitude each time, so multiplying all values by a positive factor preserves the normalized colors while changing legend numbers.

**Likely user impact:** A weak and strong recording can look equally large. Changing current can appear to leave a field unchanged. Reading the legend fixes this mathematically but creates unnecessary interpretive work.

**Recommendation:** Add fixed and automatic scale modes; default to a shared scale during comparisons. Make “raw reference” versus “subtract mean” an explicit display setting. Add a stacked eight-contact view with the selected trace emphasized. For maps provide **lock scale to this run** and visibly mark saturation. Preserve automatic scaling as a useful inspection option.

**Acceptance:** Doubling current at a locked scale doubles the plotted amplitude. Two contacts can be viewed on the same µV axis. Export includes display transformations separately from raw samples. The color range and normalization mode remain visible.

### 4. The new lab needs a matched baseline and event-centered workflow

**Code evidence:** `CortexLaboratory.jsx` has pinned runs, configuration diffs, and paired exports. `CortexInterfaceLaboratory.jsx` has three protocols, event counts, and preset recordings, but no equivalent comparison state. Its plots redraw around a whole-window cursor rather than a selected event.

**Recommendation:** Bring forward the original baseline tools. Add “Compare with stimulation off” using the exact same cells, positions, background currents, initialization, and observation window. Selecting a soma event should synchronize the 3D view, raster, membrane trace, contact trace, and stimulus marker. Add previous/next event, pre-event and post-event windows, and a restore-full-window control.

**Acceptance:** A user can show whether a new soma event is present, shifted, or absent relative to the matched baseline, with the exact settings difference and event definition visible. The product does not automatically call coincidence causal propagation.

### 5. The recording experience is not yet an instrument

**Code evidence:** The new lab has neural/artifact/total selection, contact peak-to-peak summaries, and raw exports. It does not expose timebase zoom, fixed voltage division, acquisition reference selection, multi-channel stacking, event-triggered averages, per-cell contribution traces, or acquisition filtering. The older recording app has gain/noise/filter controls, but its model is a synthetic waveform generator.

**Recommendation:** Build an **ideal recording instrument first**: channel bank, µV/div, ms/div, raw/reference choice, cursor measurement, channel overlays, and per-cell contributions. Later add an explicitly separate acquisition chain with impedance, filtering, noise, sampling, clipping, and detection when each part has a supported model. Do not graft the old synthetic noise slider onto the detailed model and describe it as hardware validation.

**Acceptance:** The user can distinguish source events from events detected in an acquired trace, identify which signal-processing stages are enabled, and export both ideal and processed signals with parameters. A channel comparison remains meaningful without relying on screen height.

### 6. Switching physics currently discards the experiment context

**Code evidence:** `src/components/CortexWorkspace.jsx` remounts different laboratory components and explicitly states that switching modes stops the run and resets the workspace. The new integrated lab is another route with separate controls and state. Atlas cell links point into the original lab.

**Recommendation:** Introduce a shared experiment record with specimen IDs, rigid placements, design revision, tissue/boundary assumptions, waveform, solver settings, derived outputs, evidence, and view state. A field adapter should identify what can be carried over and what is incompatible. A mode change should create a new run variant, preserving the prior result and camera/selection where meaningful.

**Acceptance:** Selecting another supported field method never silently changes the cell, protocol, or return. Incompatible settings are listed. A previous result remains retrievable, with its own immutable configuration.

### 7. Cell and contact identity need to persist across tools

**Code evidence:** The Cell Model Atlas opens `/cortex/?cell=...`; the new interface uses `INTERFACE_PRESETS.slice(0,count)`. The designer uses its own contact IDs and geometry; the new field imports a fixed `INTERFACE_DESIGN`. The device registry and original Cortex adapters cover a limited subset of catalog devices.

**Recommendation:** Add a specimen collection and a design selection that travel with the experiment. “Add to experiment” from the atlas should preserve source identity, morphology version, and fitted model. “Test this contact layout” from the designer should perform an explicit capability check and mapping. A catalog device should show supported simulation adapters, missing dimensions, and hypothetical features rather than a universal launch button.

**Acceptance:** An imported design retains contact IDs, exposed areas, center coordinates, and orientation. No unsupported shape is silently converted to a point or rectangle. The twelve-cell roster is inspectable before running and each ID opens its provenance.

### 8. Color currently carries incompatible meanings across applications

**Code evidence:** Original Cortex population states include gold for unsupported placement and teal before computation; detailed Vm runs blue to orange. The finite-disk mode also uses gold for exclusion. The new interface uses a continuous voltage scale with gold tones near depolarization and gray for unavailable values. Atlas colors encode pathway classes; field maps use signed potential or magnitude.

**Recommendation:** Establish a color contract by quantity. Vm always uses one palette with numeric limits. Signed potential, magnitude, cell identity, and status use separate visual encodings. Show unsupported status as a badge, hatching, outline, or a clearly named neutral treatment, not a color that also means a particular membrane voltage. A legend should name the quantity and unit, not merely “activity.”

**Acceptance:** The same Vm maps to the same displayed base color in every electrical lab. Unknown/uncomputed/excluded/failed states are distinguishable in grayscale and text. Color-only selection is never required.

### 9. Physical scale is handled honestly but not consistently enough for easy comparison

**Code evidence:** The new scene renders physical micrometre geometry with a 100 µm bar. The atlas operates in millimetres and applies a display-only minimum fiber radius in distant views. Cell atlas previews are independently fitted to each frame. Those distinctions are documented, but their controls and visual conventions differ.

**Recommendation:** Use a shared **physical / readable** display switch, with readable enlargement explicitly labeled and excluded from exports. Keep a camera-plane scale bar and coordinate reference in every view. Add same-scale preview mode in the cell atlas. Offer linked overview and detail cameras so a close-up keeps its spatial context; do not repeatedly require the user to orbit back out.

**Acceptance:** A selected cell has the same stated dimensions in atlas, setup, and result views. Any radius enlargement is signaled on screen. A user can compare two morphologies at common scale and return from compartment detail to the exact prior overview.

### 10. Replay controls need one time vocabulary and an honest source label

**Code evidence:** The new interface loops a 260 ms window at selectable ms/sec and automatically plays accepted data. It labels the panel “LIVE REPLAY.” The original lab has next-soma-event and phase controls. The older synthetic recording lab has real-time speed multipliers and a two-second window. The peripheral display puts the present at 75% of the plot width.

**Recommendation:** Standardize simulation time, playback speed, source type, and computation state. Use labels such as **computed replay**, **prerecorded default**, **measured data**, or **running synthetic demonstration**. Provide common pause, scrub, step, event-jump, loop, and reset controls, with the zero-time definition visible. Preserve different scientific time scales; standardize meaning, not numeric duration.

**Acceptance:** Users can tell whether a loop creates new numerical activity. A scrub pauses consistently, the selected time is shared by all panes, and all exported time origins are declared. Reduced-motion preferences suppress automatic playback unless the user opts in.

### 11. Round-trip reproducibility is uneven

**Code evidence:** The designer can import its own JSON and has local autosave. Original Cortex imports configuration and exports result provenance. The new interface exports full binary replay but has no user import control. `src/pages/sim.astro` uses `Math.random()` and wall-clock initialization, exports counts rather than generated axon states or a random seed, and rebuilds axons on import.

**Recommendation:** Define one experiment package: immutable configuration, source versions and checksums, software revision, random seeds, units, solver settings, optional complete results, and view state. Separate **open recorded results** from **rerun configuration**. Mark legacy configuration-only exports accurately until upgraded.

**Acceptance:** Export → import → replay reproduces the same stored samples, cell IDs, and selected contact. Recompute either meets declared tolerances or reports a version mismatch. A randomized teaching simulation exports a seed and deterministic scheduler state or says explicitly that its export will not recreate activity.

### 12. There is a concrete duplicate-control defect in the peripheral app

**Code evidence:** `src/pages/sim.astro` contains two `id="dur"` range inputs, two instances each of `durVal`, `durMin`, and `durMax`, and an extra closing label around lines 131–145. Its `$` helper uses `document.getElementById`, so listeners and synchronization target only the first matching duration control.

**Likely impact:** A second visible slider may be nonfunctional or disagree with the actual pulse duration. Browser behavior has not been tested, but the duplicate IDs and binding ambiguity are directly established in source.

**Recommendation:** Remove the accidental duplicate and enforce unique IDs in generated routes. Replace mouse-only interaction with pointer events and provide numeric contact editing if the legacy app remains publicly supported.

**Acceptance:** One duration control exists, its readout and actual pulse agree after input and import, the page has no duplicate IDs, and contact manipulation works with touch and keyboard alternatives.

### 13. Mobile and accessibility need a deliberate product mode

**Code evidence:** The new interface's mobile layout places the full controls before the scene; many hints are 8–11 px. Its canvas is described with ARIA, and selectors provide alternatives for cell/contact selection, but plot samples have no navigable data view. The atlas compresses details and controls inside an iframe with a substantial minimum height. The designer has the strongest keyboard editing. The older peripheral app uses mousedown/mousemove/mouseup.

**Recommendation:** Provide a mobile **inspect a computed experiment** mode with the scene first, a persistent playback bar, and a bottom sheet for selected object or trace. Keep full setup available rather than compressing all desktop controls simultaneously. Add keyboard-accessible trace cursors, tabular sample summaries, meaningful focus order, and adequate touch targets. User-facing task text should not depend on 8 px captions.

**Acceptance:** At 390 px width, a user can load a default, select a cell, pause at an event, read Vm, switch a recording contact, and return to overview without precision tapping or horizontal page scrolling. All primary actions work without a pointer. Screen-reader users can obtain the selected time/value and current experiment status.

### 14. Performance should be budgeted around the user's task, not just renderer FPS

**Code evidence:** The new experiment stores every compartment voltage as Float32, with a 160 MB replay-array budget. Binary decoding copies buffers. The initial default downloads the complete compressed recording before acceptance. The scene renders on every animation frame even when playback is paused. The atlas already uses detail budgets, visibility handling, and on-demand rendering.

**Recommendation:** Adopt explicit budgets for first usable view, complete result download, peak decoded memory, time to first partial signal, and background-tab work. Load geometry and a small preview first, then stream or chunk replay windows when feasible. Keep numeric precision and scientific output sampling independent of display reduction. Pause rendering in hidden tabs and render static scenes on demand. Cache stable geometry and field bases, not results from mismatched configurations.

**Acceptance:** Measure actual desktop and mobile behavior on named devices. The default has a visible progress state with bytes/cells where available, cancel remains responsive, and a failed large download offers a smaller example. A paused hidden tab performs no ongoing frame work. Changing display quality never changes the stored scientific result.

### 15. Error recovery should tell users what is preserved and what action helps

**Code evidence:** The interface distinguishes computation failure and offers stop; the finite disk rejects unsupported whole cells; the atlas can retain pathways when surface loading fails; the synthetic recording app throws after WebGL creation fails, preventing the rest of its setup. Error affordances differ substantially.

**Recommendation:** Standardize states: loading assets, validating configuration, solving, cancelled, complete, unsupported, numerical failure, render-only failure. Show the affected object, preserved data, and the smallest meaningful next action. Keep traces and exports available if 3D rendering fails. Never imply that an excluded cell is inactive.

**Acceptance:** An unavailable source mesh, lost graphics context, incompatible contact, cancelled run, and solver-domain failure each produce a distinct recoverable message. Previously complete runs are retained unless explicitly discarded. No unsuccessful run is silently displayed with a current configuration label.

### 16. A coherent visual identity would improve orientation without erasing instrument readability

**Code evidence:** Global Layout uses the site's Bodoni family and paper/dark themes. The new interface intentionally forces system fonts for h1/h2 inside a dark panel. The designer, older labs, and atlas each have their own control and spacing vocabulary.

**Recommendation:** Keep the site's editorial typography for page titles, experiment names, and section navigation; use a consistent readable sans/mono system for dense instrument values and controls. Make dark scientific viewports a deliberate common component, not an accidental whole-page identity. Use one selected-state shape, focus treatment, spacing system, and run toolbar across apps.

**Acceptance:** A user recognizes the same project, selection, run, playback, export, and evidence controls across all supported labs. Light and dark site modes retain adequate contrast. Visual QA occurs at desktop, tablet, and phone widths rather than relying on a successful build.

## Proposed coherent workspace

### Additional high-priority issue: draft controls and completed results are visually mixed

**Code evidence:** In `src/components/CortexInterfaceLaboratory.jsx`, the scene effect calls `setContacts(config.activeContacts, contact)` while the membrane replay comes from the completed `result`. `dirty` displays a notice when controls differ, but changing a stimulation pad immediately changes the outline on the replayed scene. The numerical samples still belong to the earlier configuration.

**Interpretive risk:** A user can see a newly selected pad beside the old membrane response and reasonably associate the two. A textual “Run to update” notice reduces the risk but does not make the scene itself unambiguous.

**Recommendation:** Separate `ExperimentDraft` from immutable `RunResults`. In Observe, active-pad outlines, physical geometry, stimulus markers, and recordings come entirely from the selected run. Show draft edits as a clearly distinct preview or in Setup. A “View draft / View recorded run” switch should make the source of the current scene explicit. Applying an edit must not overwrite the selected run's visual identity.

**Acceptance:** Changing a pad without running cannot make the existing replay appear driven by the new pad. Every displayed plot and contact state is traceable to the same run ID. A draft overlay is labeled and distinguishable without relying on color alone.

### Additional instrument requirement: ideal neural component is not recoverable acquired signal

The root numerical review reports that one saved evoked example has approximately **5.034 V** of ideal direct artifact at the stimulated contact, approximately **31–122 mV** at other contacts, and a largest neural component on the order of **44.1 µV**. These values were provided by the root's archive inspection, not measured independently during this static UX review. They illustrate why showing a clean neural component is useful for analysis but must not imply that a physical amplifier could recover it during stimulation.

The instrument should separately identify **commanded contact current**, **delivered current under the selected source model**, **known ideal neural contribution**, **ideal total contact potential**, and **acquired/processed trace**. In the present ideal-current implementation, commanded and delivered current are equal by assumption; a compliance-limited source should only be introduced with an explicit supported model. Automatic SI-prefix selection should show V or mV for large artifacts rather than unwieldy millions of µV, while preserving a fixed underlying unit in exports. A matched comparison needs a locked gain and a visible scale change if the user switches between neural and artifact views. No acquisition path should be shown as calculated before its bandwidth, impedance, saturation, and recovery behavior exist.

**Acceptance:** The artifact-dominated example is readable in appropriate units, the clean neural view is labeled “ideal component,” and the user cannot mistake it for a recovered hardware recording. Display scaling and unit prefixes do not alter exported samples.

### A. Start with a question

The landing page should offer three concrete experiments rather than a long list of implementation names: **Record twelve firing cells**, **Stimulate a selected cell population**, and **Compare two contact geometries**. Each opens an already computed, inspectable result with a short statement of its model and an editable copy of the setup. Additional links lead to anatomy, devices, design, measured data, and legacy teaching demonstrations.

### B. One experiment shell, four views

Use persistent experiment identity and selection across **Setup**, **Observe**, **Compare**, and **Evidence**. These are views into one record, not separate simulations that reset one another.

- **Setup:** specimen roster, placement, contact geometry and roles, medium/return, waveform, background drive, and resource estimate. Show a schematic of the actual boundary model alongside the rendered implant when they differ.
- **Observe:** a physical scene and a linked instrument panel visible at the same time. Below them, one timeline and raster. Selecting a cell or contact updates the inspector and linked traces. A compact breadcrumb says exactly what is selected, for example “Cell 7 → apical dendrite → compartment 143.”
- **Compare:** baseline and variant share time, camera, axes, and measurement windows. A short configuration diff sits above change plots. Users can separate geometry effects from changed position, specimen, or current conditions. Include paired no-stimulation control and a recorded setup snapshot.
- **Evidence:** configuration-specific numerical scope, sources, current limitations, reproducibility package, and measured validation status. Put the few immediately relevant limits in the persistent toolbar; reserve detailed equations and histories for this view.

### C. Contact selection should expose role, not rely on gesture memory

A contact has a physical identity and several possible roles. Clicking it should inspect it by default. The inspector shows “stimulating,” “recording channel,” and “reference/return” only where supported. Setting a role is an explicit control. This avoids the current split where clicking in one scene toggles stimulation while a separate selector changes recording. Use a small per-contact current timeline and current sign, not only an active checkbox.

### D. An event should be the bridge between membrane and instrument

Click a raster mark to pause around the event, show the cell's soma and selected branches, highlight its contribution at all contacts, and display the stimulus waveform on the same time axis. Offer “sum of all cells” and “selected cell contribution” without rerunning when the required contributions were retained. State whether the event came from known model state or a detector applied to a noisy/acquired trace.

### E. The anatomy atlas should be a contextual map, not an implied electrical solver

Keep anatomical exploration as its own view with the same specimen/provenance inspector. “Open electrical model” is available only for entries with an actual matched fit. A morphology-only entry should show what data are missing. A user can bookmark an anatomical location and create an illustrative electrical test placement, but the handoff must retain the distinction between source region, modeled location, and measured connectivity. This enables cross-scale coherence without pretending the entire finger pathway is an electrically validated connectome.

## Suggested implementation order

1. **Immediate quality pass:** fix the peripheral duplicate controls; finish supported-browser QA of the new lab; rename replay source labels; make visible scale transformations explicit; fix remaining mobile and keyboard blockers.
2. **Shared run record and shell:** immutable completed runs, setup drafts, cell/contact identity, result import, persistence, common status and evidence vocabulary. Port the original Cortex baseline workflow before developing more new simulation surfaces.
3. **Controlled experiments:** size/shape variant at fixed center, matched no-stimulation control, fixed axes, source-current accounting, linked event inspection, and comparison exports. This is the most direct route from a compelling demonstration to an interpretable research tool.
4. **Recording instrument:** simultaneous channels, cursor/timebase controls, ideal per-cell contribution traces, then separately validated acquisition and detection stages. Keep source events and detected events distinct.
5. **Geometry handoffs:** designer-to-field capability adapter and device-to-experiment adapters with explicit dimension provenance. Expand the supported physics only when the required conductor solutions and verification are ready.
6. **Anatomy handoffs and scale:** shared specimen inspector, physical/readable rendering controls, common-scale comparisons, and bookmarked cross-scale context. Avoid treating modeled atlas routes as fitted electrical networks.

The success criterion should be a complete user journey: select a sourced cell set, choose a supported interface, reproduce a baseline, change one justified design variable, see linked membrane and recording consequences, inspect the relevant evidence, and reopen the exact experiment later. More simulations are valuable only when they strengthen that journey.
