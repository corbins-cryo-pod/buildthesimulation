> Supporting audit for the [platform review](../REVIEW_2026-10-18.md). Inspected implementation: `4a15be0ca29bef6c1c6a963cb311b52ba8f34ba8`. Audit work crossed midnight UTC; the review is dated October 18 in America/New_York. Proposed work is not a shipped capability.

# Device catalog and interface-design review for the integrated Cortex Interface Laboratory

Reviewed 19 October 2026 against the working source tree at `/workspace/scratch/c4f147c01b63/buildthesimulation`. This is a read-only architecture and evidence audit, not a new validation of every catalog device. Counts below were computed from every catalog entry and every registered geometry. I inspected the shared geometry contracts, adapters, designer, representative source-specific models, and the new interface field contract. I did not independently reread the complete scientific literature for all 142 published devices or simulate their performance.

## The central conclusion

The site already contains the ingredients for a distinctive instrument: documented hardware, editable micrometer geometry, active human cells, finite-contact fields, recording, stimulation, and replay. Its principal weakness is that these ingredients still speak several different physical languages. Connecting their pages is easy; connecting their assumptions is the real work.

The integrated laboratory should become the place where a device hypothesis is made explicit, run against a controlled neuronal experiment, compared with a counterfactual, and saved with enough evidence for someone else to reproduce or challenge the result. A beautiful shank and moving voltage are necessary for understanding. They become scientifically useful when the user can ask, “What changed, what was held fixed, what was measured, and how much of this is supported?”

The new eight-contact shank is a valuable experimental fixture. It is not yet an optimized neural interface, a simulation of all catalog devices, or a complete finite-body electrical model. Its greatest opportunity is to supply a disciplined route from the existing catalog to those capabilities.

## What is actually in the repository

| Resource | Computed inventory | Meaning |
| --- | ---: | --- |
| Design Markdown entries | 144 | Includes two draft entries, so not the public count. |
| Published device/design briefs | 142 | 47 intracortical, 28 ECoG, 27 peripheral nerve, 7 SCS, 5 DBS, 3 cochlear, 3 endovascular, 2 sensing, 2 retinal, 2 brainstem, 16 other. |
| Published evidence-stage tags | 60 human; 71 preclinical; 10 research; 1 theoretical | These are editorial study-stage labels. “Human” is not a regulatory approval or a geometry-validation badge. |
| Application briefs | 65 | A device used in a particular study or program; potential bridge from hardware to experimental tasks. |
| Organization briefs | 89 | Provenance and organizational context. |
| Registered 3D configurations | 36 | About one quarter of the published device briefs have a registered, dimensioned geometric reference. |
| Exported geometric sites | 28,372 | Counts include large arrays and repeated hardware-family geometries; this is not 28,372 independently verified electrodes. |
| Site records with numerical geometric area | 26,578 | A derived geometric face area, not electrochemical effective area or an impedance calibration. |
| Site records with unknown area | 1,794 | Preserved as null, including N1, Connexus, Utah, USEA, carbon fibers, and some exposed/segmented contacts. |
| Registered models with structured documented/reconstructed/omitted lists | 23 of 36 | All 36 have notes and source links; 13 retain the distinctions mainly in prose. |
| Acquisition channel assignments in geometry exports | 0 | All contact `channel` values remain null. Geometry IDs must not silently become manufacturer acquisition addresses. |
| Existing Cortex catalog adapters | 3 | Utah, one illustrative N1 thread, and NP1. N1 and NP1 are deliberately recording-only in that laboratory. |

The 36 geometry types include 13 surface grids/contact windows, eight cylindrical lead windows, four planar probes, two Utah arrays, and nine other individual configurations. The sum includes a Neurograin package envelope with zero recovered contact sites. A package without contact geometry must remain a package, rather than being promoted into an electrical electrode through a generic default.

Source paths: `src/content/designs`, `src/content/applications`, `src/content/companies`, `src/content/config.ts`, `src/lib/devices/catalog.js`, `models-probes.js`, `models-surface.js`, `models-leads.js`, `models-peripheral.js`, and `implant-contacts.js`.

## What is already strong and should be preserved

The registry distinguishes named variants instead of mixing generations. The Neuropixels models separate the 2017 20 µm thickness from the later NP1 24 µm datasheet; N1 distinguishes the selected 64-by-16 configuration from later 128-by-8 descriptions; the NHP model distinguishes a manufacturer NP1032 variant from an earlier research probe. These distinctions are unusually valuable and should remain visible during simulation import.

The models also preserve partial scope: a recording-window crop is not a whole implant, a display fan is not an implantation trajectory, and an exposed tip of unknown area is not a known finite disk. Unknown values are null rather than zero. The GLB export correctly converts internal millimeters to meters, and JSON records a coordinate system and origin. Geometry versions are pinned by the Cortex adapter, which throws when the catalog revision changes until an explicit migration is made. These are foundations for a reliable scientific platform, not administrative details.

The Neural Interface Designer has genuine functionality: up to 4,096 contacts; circles, squares, rectangles, ellipses and rings; micrometer coordinates; multiple layout patterns; contact-to-pad assignment; clearance-aware routing; independent metal planes; unresolved nets; editable assumptions; physical-scale SVG and JSON exports. It correctly calls its outputs concept geometry, not qualified fabrication masks. Its material dropdown is a label and its trace resistance uses an explicit sheet-resistance assumption. It does not quietly infer an electrode impedance from contact diameter.

The newer cortical stimulation laboratory already has relevant circuit concepts: a contact access matrix, signed source weights, a local return, parallel capacitance and charge-transfer resistance, compliance accounting, and delivered-charge reporting. This should be treated as reusable knowledge, with its assumptions checked before any code is transplanted.

## The physical contracts are currently disconnected

1. The device registry is primarily geometry in millimeters. It supplies contact locations and some areas, not a validated conductor/interface model.
2. The designer is planar layout in micrometers. Its substrate thickness is metadata, its routes are concept centerlines, and its JSON cannot presently load into a physiological laboratory.
3. The existing Cortex adapters transform three selected catalog configurations into tissue coordinates. Ideal point recording remains distinct from finite contact physics.
4. The older cortical stimulation lab uses prescribed uniform source current on full-space sheets or spheres. A planar sheet exposes both faces; its modeled electrochemical area is twice its projected area. It does not solve equipotential metal surfaces or an insulating shank.
5. The new Interface Laboratory uses eight equipotential rectangular contacts solved jointly in a homogeneous half-space. The contacts are one-sided and inactive contacts float. It uses reciprocal coefficients for stimulation and recording. Its visible finite shank is electrically replaced by an infinite insulating backing plane.

These are legitimate different models. They become misleading if the same UI terms imply the same boundary problem. In particular, copying the older RC interface implementation without changing its two-sided area and access matrix would produce an inconsistent one-sided shank model. Copying a “PtIr” or “TiN” label would not transfer measured electrochemical properties.

The new field API currently takes conductivity and panel resolution, with `INTERFACE_DESIGN.contacts` fixed internally. Shank width, thickness, taper, back surface and tip do not influence its electrical solution. A user can learn about finite contact size and placement within this approximation. The user cannot yet infer how a narrower or longer pointed body changes recording or stimulation around its edges.

## Priority 0: make the scientific meaning visible in the instrument

The default experience should clearly distinguish commanded current, delivered current, extracellular potential, membrane voltage, neural recording, stimulation artifact, detector output, and ground-truth soma events. These are different observables. Sharing colors or axes between them without explicit units invites incorrect interpretation.

The visible shaft should have an inspectable “electrical boundary” view: a ghosted plane representing the current approximation, with its physical extent shown as infinite rather than silently hidden. Once the finite-body solution exists, that view can switch to the actual insulated surfaces. This makes a limitation understandable through the scene itself rather than burying it in a methods page.

Show per-contact exposed geometric area, current share, phase duration and charge per phase. At 10 µA for 200 µs, the total phase charge is 2 nC. If one 12-by-24 µm contact carries it, the geometric charge density is approximately 0.694 mC/cm². This is an accounting result, not a safety conclusion. With several active contacts, compute density from each actual current, not from total current divided by an arbitrary aggregate area. Neither a material label nor zero net biphasic charge supplies a universal tissue or electrode safety verdict.

**Acceptance gate:** a selected experiment’s exported file contains the exact boundary model, exposed-face convention, return definition, contact currents, phase charges, area provenance, neural source approximation, and all omitted interface/electronics effects. No “validated device” or “safe” badge is inferred from successful computation.

## Priority 1: connect hardware with a versioned Device Experiment Contract

Create one structured contract shared by the catalog adapter, designer, solver, renderer, exports and saved experiment. The rendered body and the solver boundary should derive from this same contract, with any approximation represented explicitly.

The contract should include:

- Stable device/configuration identity, model revision and source snapshot hash; a distinction between a catalog reference, a hypothetical derivative, and a custom design.
- Units, handedness, local origin, tissue transform and anatomy transform. Keep geometry stored in one canonical unit and convert only at input/output boundaries.
- Closed insulating bodies or explicit infinite boundaries, plus separately tagged conductive contact surfaces. Contact centers are useful metadata but cannot substitute for surfaces.
- Contact shape and dimensions, surface normals or surface parameterization, exposed-face convention, substrate recess, geometric area, and electrochemical area only when actually established.
- Channel topology: physical site ID, acquisition channel, switch/bank constraints, enabled recording, current-drive capability, current source/return assignment, and missing mappings.
- Tissue medium and interface models with their own versions, measured parameter sets, applicability ranges, and uncertainty.
- A per-parameter evidence record: value, unit, source URL, source location, selected variant, evidence type, uncertainty, extraction date and reviewer. Evidence types should include reported measurement, manufacturer specification, derived quantity, family inference, reconstruction, user assumption, and unknown.

The existing prose fidelity notes must survive migration. A 24 µm NP1 thickness from a later datasheet cannot silently replace the 20 µm research geometry in an older saved experiment. An illustrative 12-by-20 µm N1 marker cannot become a real exposed contact area because an import tool needs a number. If a contact area is unknown, offer an explicitly hypothetical derivative with a user-specified area and a new design ID.

There are 1,628 exported site records without a single normal. This is not 1,628 errors: rings and cylindrical surfaces legitimately have distributed normals, and Utah/Connexus positions are apices rather than recovered contact faces. It demonstrates why a field adapter needs a surface contract and cannot rely only on `positionMm`, `normal`, and `contactAreaMm2`.

**Acceptance gate:** round-trip a supported catalog shank and a simple designer layout through the contract without changing positions, units, identities or unknowns; demonstrate that their rendered and solver surfaces coincide; reject unsupported shapes and missing required physical parameters; preserve existing experiments byte-for-byte or provide explicit version migration.

## Priority 2: provide a controlled geometry experiment before ranking geometries

Eight pads of different sizes at different depths make a useful recording array. They do not, by themselves, isolate a contact-size effect. A nearer large pad can win because of distance; a farther small pad can lose because of position. This confound must become an intentional comparison tool.

Add a “hold everything else fixed” experiment. Freeze the same cells, placement, morphology, fit, membrane state, drive, source-current realization, reference and numerical resolution. Replace one contact at the same center and orientation with 12-by-12, 20-by-20, 30-by-30 and 12-by-24 µm variants. Provide equal-current, equal-phase-charge, and equal-total-energy comparisons when the necessary electrical model exists. These answer different questions and must remain separately named.

For recording, first replay precisely the same transmembrane currents through each reciprocal lead field. This isolates the measurement geometry without rerunning the membrane solver or accidentally changing the source. Then run a separate experiment in which altered stimulation changes neural dynamics. Those two causal questions should have distinct results.

Report peak-to-peak signal, waveform shape/correlation, channel-to-channel redundancy, spatial sensitivity, and contribution of each cell. Do not call a voltage amplitude “detectability” until noise, filtering and a detector have been supplied. Show the counterfactual waveform from the same cell on the same axes, with a shared scale and difference trace. A geometry ranking should change visibly when the optimization objective changes.

A second sweep should move the same neuron through an explicit position/orientation grid. A third should repeat over the source model ensemble. Save trial-level results, not just the favorite picture. The primary literature gives good reasons to treat position and trial variability as first-class variables; experimental studies have not universally found a simple geometry-to-yield relationship.

**Acceptance gate:** a zero-change comparison returns zero difference; swapping only pad size changes no neural source current in a recording-only experiment; mirrored symmetric placements give the expected symmetry; all plots disclose normalization; rankings include sensitivity across locations rather than a single favorable placement.

## Priority 3: solve the actual finite shank, and prove where the planar approximation holds

The most consequential missing geometry is the insulating body itself. A finite shank permits fields around its sides, back and tip; an infinite insulating plane cannot. A long pointed outline is not an electrical feature until it enters the boundary-value problem.

Build a watertight finite-body model with the same eight contacts, then solve jointly for contact potentials and currents with insulating side/back/tip boundaries and a stated distant return or explicit return electrode. Start with a homogeneous isotropic conductor, which allows clean comparison with the current model. Add layers, anisotropy, encapsulation and recesses only after the simpler problem is verified.

A staged verification sequence is preferable to one elaborate demonstration: analytical disk/plane benchmark; rectangular finite-contact convergence; one finite slab; finite shank with a single active contact; all eight contacts with floating inactive surfaces; local bipolar return; reciprocal neural recording. Verify units, charge/current conservation, reciprocity, boundary residuals, domain-size dependence, mesh refinement, and independent implementation agreement. Include points in front of, beside, behind and beyond the tip. Tests restricted to the front central plane will miss the very effect this development is meant to resolve.

Then produce an error map of the existing half-space approximation versus finite-body results as a function of position, contact size, shank width and tip proximity. This turns the earlier model into a documented fast approximation with an applicability envelope rather than discarding it. Use an offline high-resolution solve to build reusable response bases if a full solve is too costly in the browser.

**Acceptance gate:** preregister tolerances on potential, field gradients and application-level response metrics; demonstrate convergence and independent agreement over the intended operating volume; invalidate or clearly relabel results outside that volume. A mesh residual alone does not establish neural threshold accuracy.

## Priority 4: complete the recording and stimulation instrument

The current ideal conductor explains geometry-dependent transfer. To evaluate a neural interface, the next layer is the measurement and drive chain.

For recording, implement an explicitly selected electrode-interface impedance spectrum, amplifier input impedance, voltage/current noise, bandwidth, sampling, reference scheme, saturation and recovery. Keep raw ideal neural voltage available. Derive thermal-noise estimates from the real part of the frequency-dependent impedance over the selected bandwidth when using that model; do not substitute a nominal 1 kHz magnitude for all frequencies. Keep biological background separate from amplifier/electrode noise. A seeded detector can then produce a detected raster alongside ground truth, with misses, false positives and latency. “Recording yield” is then an operational metric with a stated algorithm and noise environment.

For stimulation, reuse the existing circuit-accounting architecture only after adapting it to one-sided contact areas and the new access matrix. Separate command, delivered current, contact polarization, tissue voltage and terminal voltage. Add a stated compliance controller, recovery/discharge assumption and measured material parameter sets where available. Treat the older TiN and IrOx scalar circuit values as sensitivity examples, as their existing documentation already does.

Do not equate low impedance with maximal stimulation efficiency or long-term durability. Gold and platinum microelectrodes exhibit different impedance-size scaling under reported measurement conditions; a material-name dropdown therefore cannot support a universal area-to-impedance law. Interface effects can also change temporal current distributions, which a purely resistive equipotential boundary does not capture.

**Acceptance gate:** ideal-source mode reproduces the current conductor results; finite amplifier impedance produces expected limiting behavior; white/noise spectral tests recover the requested bandwidth-limited variance; compliance changes delivered rather than only displayed current; phase charge is computed from actual delivered samples; electrode and amplifier parameters carry source/assumption labels.

## Priority 5: turn “ideal” into a testable multiobjective design search

There is no universal ideal electrode independent of target, neuron distribution, bandwidth, allowed tissue displacement, manufacturing process, current limits and uncertainty. The laboratory can offer something more useful: a Pareto set of designs under an explicit experiment contract.

Begin with a small parameter family: shank width/thickness, taper length, contact size/aspect ratio, pitch, site count, and recording/stimulation assignment. Optimize only quantities represented by available physics. Initially this means reciprocal sensitivity, ideal signal contrast, source-separation matrix conditioning, target/off-target simulated activation, phase charge, current and conductor energy. Add real SNR, compliance, polarization, mechanics and thermal quantities only when their corresponding models exist.

Use surrogate or linear lead-field screening to eliminate weak candidates, then verify finalists with the full active-neuron solver. A field-gradient proxy is not a final activation prediction. Evaluate finalists over position, orientation, model-fit and material uncertainty, and retain tradeoffs rather than one “winner.” The robust design is the one whose claimed advantage survives plausible uncertainty, not the one tuned to a favorable single soma location.

**Acceptance gate:** every objective has an equation and unit; every constraint has a source or declared assumption; the optimizer cannot improve a visual-only parameter; a baseline and all trial configurations are retained; finalists are rerun at refined resolution; held-out cell placements test whether an apparent advantage generalizes.

## Creative features that would make this platform exceptional

**An experiment lineage view.** A saved result should show which catalog variant, custom modifications, membrane model, field basis, circuit assumptions, dataset and code revision produced it. Clicking a dimension should reveal its source and whether it was measured, inferred or chosen. A user should be able to duplicate a result, change one quantity, and see a precise difference summary.

**A sensitivity lens in the 3D scene.** Selecting a recording contact could reveal its reciprocal sensitivity field over the actual morphology. Selecting a cell could show its contribution to each channel, with contributions summing back to the total recording. This connects visible voltage propagation with the measured waveform instead of leaving them as neighboring animations.

**A geometry intervention bench.** Move or resize one virtual contact while replaying a fixed saved current realization. This is computationally efficient and visually immediate. The scene can show why a contact that is farther from the soma still captures an axonal component. A separate “rerun stimulation” action then makes the causal change explicit.

**An uncertainty map.** Color the hardware by evidence strength in a dedicated view: documented dimensions, reconstructed offsets, unknown exposed surfaces. Keep this separate from the membrane-voltage palette. The earlier unwanted yellow/blue split should not return as a biological category; uncertainty belongs to the model and its claims.

**A hardware-to-experiment path.** Device page → supported geometry → named adapter → experiment preset → verified result. Unsupported devices should explain the specific missing ingredient, such as contact surface, channel map or interface measurement, and permit a hypothetical derivative without impersonating the commercial device. Application briefs can supply the experimental question, rather than merely linking to hardware.

**A designer feedback loop.** The layout editor should receive geometric constraints and simulation results, allowing the user to see whether a candidate contact arrangement can actually route within a selected process. Routing feasibility, neural performance and mechanical feasibility are distinct gates. None should silently stand in for the others.

## Concrete near-term corrections and consistency tasks

- Give every registered geometry the same structured fidelity fields; preserve existing prose.
- Reconcile the NP1 brief with the registry: the brief still calls the tip outline approximate, while the registry now cites a 175 µm manufacturer taper. Keep the still-approximate 200 µm first-row registration distinct.
- Centralize model capability labels: geometry available, contact surfaces available, recording adapter available, stimulation boundary available, circuit model available, numerical benchmark available, biological calibration available. A single “3D model available” badge cannot communicate these differences.
- Add the new hypothetical shank to the same identity/provenance system without assigning a real-device catalog identity.
- Keep NP1 recording-only as a real device reference; a stimulation-capable derivative should be explicitly hypothetical.
- Export raw data and configuration separately from a replay animation. A repeated recorded window should remain labeled replay.
- Make unknowns queryable: the catalog should help discover where one measurement would unlock a new simulation family.

## Primary scientific and manufacturer references consulted

The following support specific modeling choices or cautions, not a blanket validation of the site. Search returned primary-paper abstracts or indexed full-text passages; several direct PMC opens encountered their access interstitial, so this review does not claim a fresh complete reading of every linked paper.

1. Neuropixels manufacturer, **1.0 Probe**: https://www.neuropixels.org/probe1-0 — 960 selectable sites, 384 simultaneous channels, 10 mm shank, 70 × 24 µm cross section, and on-chip acquisition. Supports preserving site/channel and geometry distinctions.
2. Neuropixels official support and design files: https://www.neuropixels.org/support — source for variant-specific specifications and channel-map documentation. Acquisition mapping should be imported from a named source, not invented from site indices.
3. **Finite Element Analysis of a Floating Microstimulator**: https://pmc.ncbi.nlm.nih.gov/articles/PMC3062506/ — explicitly examines finite substrate width, contact shape and spacing, explaining why an infinite substrate is not universally equivalent to a finite shank.
4. **Analysis of deep brain stimulation electrode characteristics for neural recording**: https://pmc.ncbi.nlm.nih.gov/articles/PMC4108584/ — reciprocal unit-current field calculation and projection of compartmental transmembrane currents. Supports the shared stimulation/recording operator for an appropriately specified linear conductor.
5. **Model-based analysis of cortical recording with silicon microelectrodes**: https://pubmed.ncbi.nlm.nih.gov/16055377/ — coupled cable/FEM examination of contact size, position, edema and encapsulation. Supports the need for explicit shank/media models and controlled comparisons.
6. **Impedance scaling for gold and platinum microelectrodes**: https://pmc.ncbi.nlm.nih.gov/articles/PMC8819721/ — material-dependent scaling under specified experimental conditions; a universal impedance-from-area rule is not justified.
7. **Variability of acute extracellular action potential measurements with multisite silicon probes**: https://pmc.ncbi.nlm.nih.gov/articles/PMC3473102/ — reports substantial trial variation and no simple average geometry effect across the tested parameters. Supports ensemble comparisons rather than a universal device ranking.
8. **Tissue and electrode capacitance reduce neural activation volumes during deep brain stimulation**: https://pmc.ncbi.nlm.nih.gov/articles/PMC3653320/ — time-dependent conductor/interface effects depend on control mode. Supports separating ideal-source and circuit-limited experiments; its specific DBS parameters should not automatically become microcontact constants.
9. **Modeling the electrode-electrolyte interface for recording and stimulating electrodes**: https://pubmed.ncbi.nlm.nih.gov/17945606/ — finite-element analysis including the interface and its frequency/amplitude dependence. Supports making the interface a separately versioned model.

## Recommended order of work

First make the integrated instrument numerically coherent and inspectable, including correct replay, units, contact currents, event attribution and honest boundary labels. Next add the shared device contract and a same-center geometry comparison. Then solve and validate the actual finite shank. Add measured or explicitly assumed recording/stimulation electronics on that foundation. Finally connect the designer and catalog to constrained, uncertainty-aware optimization.

This order makes each release scientifically more capable, not merely larger. The destination is a reproducible experimental environment in which geometry, neural dynamics and measurement are connected causally and every result can be traced back to its assumptions.
