> Supporting audit for the [platform review](../REVIEW_2026-10-18.md). Inspected implementation: `4a15be0ca29bef6c1c6a963cb311b52ba8f34ba8`. Audit work crossed midnight UTC; the review is dated October 18 in America/New_York. Proposed work is not a shipped capability.

# Scientific audit of field, electrode, stimulation and recording models

Audit date: 19 October 2026 UTC. Repository: `/workspace/scratch/c4f147c01b63/buildthesimulation`; inspected HEAD `4a15be0ca29bef6c1c6a963cb311b52ba8f34ba8`. This is a read-only review. No implementation changes, broad sweeps, new biological validation or browser verification were performed. Existing reports were read, the saved interface example was decoded for amplitude/charge calculations, and a delegated legacy audit performed two bounded deterministic diagnostics. Its complete evidence is in [legacy field audit](legacy-fields.md).

## Main assessment

The strongest foundation is the original human-cell cable engine plus the explicitly scoped finite-disk verification, followed by the new interface laboratory's consistent reciprocal stimulation/recording architecture. The platform does not yet implement the physical experiment its most ambitious visuals suggest: a finite insulating shank, real electrode interfaces, tissue surrounding all sides, and a recording acquisition chain operating during stimulation.

That gap is now concrete enough to organize a defensible program of work. The priority is not adding hundreds of cells or all catalog devices. It is completing a small, independently checked chain from a fabrication-level geometry through tissue potential and membrane currents to the voltage an actual recording system could acquire. The existing 12-cell example is a useful controlled test bench for that chain.

## Model inventory: do not merge unlike boundary problems

All source paths below are relative to the repository root stated above.

| Model | Actual field/recording problem | Evidence that currently supports it | Scope that must not be inherited |
|---|---|---|---|
| Original `/cortex/` | Infinite homogeneous isotropic full-space point stimulation; point or straight line neuronal sources; ideal point sensing; explicit point return for bipolar stimulation | Analytical identities, selected NEURON/LFPykit comparisons, unit/gauge/conservation tests and historical refinement reports | Finite contact area, probe boundary, electrochemistry, acquisition electronics, arbitrary configurations or general threshold accuracy |
| Finite disk | Equipotential 25 µm-radius contact in an insulating plane; homogeneous half-space; grounded 50 mm outer cylinder; restricted sampling region | Independent analytical potential, mesh and domain checks; 36 matched finite-field NEURON cases on one cell/placement family | Electric-field gradients, contact edge density, new shapes, larger cells, populations, finite shaft, or recording |
| Geometry gallery | Single equipotential planar contact at infinity return; collocation BEM; Gaussian runtime evaluation; disk/square/rectangle/ring | Analytical disk checks, sampled refinement and independent finite-volume comparison | Lowest displayed height is not fully covered by independent comparison; geometry is not connected to the neuron engine |
| New `/cortex/interface/` | Eight jointly solved ideal equipotential rectangular contacts on an infinite insulating plane; independent human cells on one side; reciprocal ideal recordings | Conservation, weak constraints, reciprocity, independent rectangular integration, sampled mesh changes; exact 12-cell examples and independent KCL recording reconstruction | Finite shaft effects, acquisition/SNR/detection, electrochemical delivery, independent whole-pipeline solver validation, converged evoked thresholds or biological selectivity |
| Legacy cortical stimulation | Uniform-current immersed sheets in full-space, simplified synthetic arbors, lumped linear interface/compliance | Limited analytical/gauge/charge/convergence tests; explicit assumptions in guide | Equipotential contact behavior, human-cell mechanisms, new interface verification |
| Cortical recording/slab | Stochastic synthetic events and shaped distance-weighted waveform templates | An illustrative recording exercise; no biophysical source calculation | Membrane propagation, physical volume-conduction delay, true detected events, measured SNR |
| Peripheral `/sim` and nerve hero | Arbitrary-unit spatial proxy and decorative fibers/particles | Geometry/interaction illustration | Physical peripheral-nerve recruitment, µV recording, conduction or implant performance |

The `1/(4πσr)` full-space and `1/(2πσr)` insulating-plane kernels describe different conductors. Their factor-of-two difference is not itself a bug. Comparing them as if the difference came solely from finite electrode size would be a confounded experiment. Sources: `src/lib/cortex/volume-conductor.js:1–48`; `interface-field.js:9–18,167`; `workbench/cortex-finite-contact-field/docs/PHYSICAL_MODEL.md:133–143`.

## Findings ranked by their importance to scientific claims

### A. The rendered finite shank currently does not exist in the electrical domain

**Measured/code-backed fact.** `src/lib/cortex/interface-field.js:15–18,195` explicitly substitutes an infinite insulating plane for the finite shaft. The entire electrical basis is generated from its eight contact panels (`127–173`); shaft width, thickness, taper and length do not enter the solve. `supportsPoint` accepts only tissue with `y >= 10 µm` (`203–205`). The displayed 90 × 20 × 1,800 µm shaft and 300 µm pointed tip are geometry for the scene, not electrical boundaries.

**Consequence.** The experiment cannot answer how taper, shaft thickness, backside placement, a wrapping contact, or a neuron near the tip changes stimulation or recording. It cannot place cells on all sides of a penetrating electrode. Making the shaft narrower while retaining contacts would change its appearance but leave its field unchanged. This is a deliberate, documented approximation rather than a hidden coding error, but it is the main blocker to a claim of implant-geometry simulation.

**Why this matters scientifically.** Buccino et al. 2019 directly modeled probe presence and found that probe effects depend on shape and neuron/probe alignment; an infinite plane is not universally interchangeable with a finite probe [R1].

**Acceptance for the next conductor.** A watertight finite shaft surface with explicitly tagged conducting patches and insulating side/back/tip surfaces; a finite or rigorously controlled distant return; cells on both sides; source/sink flux balance; mesh/domain refinement; direct reciprocity; comparisons against an independently assembled solver. Keep the present plane model as a benchmark and approximation option, not as the only physical interpretation.

### B. The saved evoked example exposes a large gap between ideal signals and physically acquired recordings

**Measured fact from the existing saved archive, not a new simulation.** Decoding `public/models/cortex/interface/evoked.bin.gz` gives the following absolute peaks. The neural column is the total membrane-source potential; it includes stimulus-induced membrane currents and is not an isolated extracellular spike amplitude.

| Contact | Membrane-source peak (µV) | Direct applied peak (mV) |
|---|---:|---:|
| 1 | 0.5074 | 31.213 |
| 2 | 0.1087 | 41.524 |
| 3 | 1.4657 | 62.452 |
| 4 | 11.0725 | 122.335 |
| 5, stimulating | 44.0981 | 5,034.407 |
| 6 | 3.6014 | 122.213 |
| 7 | 3.7269 | 62.450 |
| 8 | 2.2867 | 41.529 |

The commanded 40 µA × 200 µs phase carries **8 nC**. On contact 5's 12 × 12 µm geometric area, that is **5.56 mC/cm² per phase on average**. This calculation is not a material charge-injection limit or a safety verdict. The ideal sharp-edge local current density is not bounded by this area average, and the model has no interface polarization or compliance.

**Code evidence.** `interface-experiment.js:93–100` computes instantaneous resistive terminal artifact; `135–138` projects membrane currents separately. No electrode/electronics model is between those clean arrays and presentation. `interface-field.js:197` expressly omits interface impedance, capacitance, noise and amplification.

**Consequence.** A clean separated trace does not show that an instrument can recover neural activity during stimulation. Real clipping or recovery can destroy information before any digital artifact subtraction. As one relevant scale example, the actual Neuropixels 2.0 paper reports a 12.5 mV peak-to-peak input range and a 30 kHz, 14-bit acquisition system [R2]. We have not chosen that hardware for this test shank, so those specifications are a comparator, not the model's assumed amplifier. The current example's terminal excursion makes a delivery/acquisition model essential before drawing engineering conclusions.

**Next acceptance.** Export commanded and delivered currents, metal/tissue potentials and polarization separately. Add a documented reference, amplifier range, filter, saturation/recovery model, ADC and deterministic noise sources. Feed the detector the acquired mixed signal, retaining ideal separated signals only as ground truth/debug output. Reproduce zero-input/noise, clipping, recovery, reference and charge tests. Characterize actual materials rather than treating charge balance as proof of feasible delivery.

### C. Numerical field verification currently misses the quantities that directly drive the neuron

**Code-backed fact.** New-interface refinement checks compare potential samples and terminal transfer voltage (`scripts/interface-field-validation.mjs`). The active solver is forced by *differences* between extracellular potentials, multiplied by axial conductance (`src/lib/cortex/active-cable.js:121–128`). The disk evidence deliberately verifies potential only, and marks E-field/recording unsupported (`finite-contact.js:51–57`).

**Consequence.** A small relative error in absolute potential can coexist with a large relative error in a small potential difference after common-mode cancellation. The current 1.878% sampled potential change does not bound activating drive, threshold, initiation site, or far-field differential recording. The excellent algebraic current/weak-potential residuals are consistency checks, not independent physical accuracy estimates. The new joint panel matrix is explicitly symmetrized (`interface-field.js:156–166`), so matrix reciprocity is an important construction property, not by itself independent evidence of correct fields.

**Next acceptance.** At the actual compartment geometry compare: absolute potential with declared gauge; every edge's `ΔVe`; the assembled axial forcing vector; field gradients away from singular edges; and reciprocal recording coefficients integrated over each source compartment. Use absolute and norm-based tolerances where differences approach zero. Test common-mode invariance and response under a uniform field. Add off-quadrature surface-potential/normal-flux checks and independent FEM comparisons of all eight unit-current bases, including floating inactive contacts. Proposed engineering gates should be fixed before running; e.g. 1% potential/terminal, 2% forcing-vector/lead-field norms and stable response classification are starting targets, not established universal accuracy guarantees.

### D. Recording geometry is still mixed with source approximation, reference and missing noise

**Code-backed fact.** The new lab samples lead fields once at each compartment center and projects a point transmembrane source (`interface-experiment.js:111,135–138`). Its fixed maximum compartment length is 40 µm (`24–27`). The original lab offers point or straight line sources, but its line integral uses `startUm`/`endUm` rather than all vertices of a curved compartment (`volume-conductor.js:66–78`). Both need explicit approximation/error tests near an electrode. The new lab's return/reference is infinity, and its signals are absolute ideal contact potentials rather than an acquisition channel with finite reference impedance.

**Consequence.** A larger contact can spatially average a source differently, but this alone does not establish detectability or an optimal area. Smaller electrodes can increase spatial selectivity while changing impedance, thermal noise, amplifier loading and robustness to placement. Lempka et al. explicitly coupled source models with measured impedance/noise when studying size optimization [R3]; later recordings work also treats the real part of frequency-dependent impedance, not only the magnitude at 1 kHz [R4].

**Next acceptance.** Add compartment line/polyline integration of the reciprocal lead field, checking refinement against center sources at representative distances and bends. Introduce explicit reference choices and measure differential-transfer error. Record isolated per-cell contributions alongside their sum to separate spatial averaging from interference. Compare matched geometries with the same source currents before introducing stochastic background. Evaluate SNR and detection only after the acquisition layer exists.

### E. Output sampling is a replay choice, not a recording bandwidth model

`interface-experiment.js:24–27,88–90,161` fixes 0.005 ms integration and 0.1 ms output: a 200 kHz solver with 10 kHz saved signals and no anti-alias stage. Internal somatic event detection precedes that decimation, which is good for ground-truth event timing. It does not preserve an arbitrary extracellular band above 5 kHz or define a physical ADC. The 0.01 mV replay encoding is disclosed in `docs/cortex/INTERFACE_LABORATORY.md:24` and does not affect the separately retained event/recording calculations; it should remain an explicitly visual representation.

**Next acceptance.** Give Vm visualization, source-state recording, analog filtering and ADC sampling independent clocks/contracts. Save extracellular channels at the chosen acquisition rate following an explicit anti-alias filter; do not attempt to reconstruct lost bandwidth afterward from the 10 kHz cache. Test alias rejection using known tones and pulse waveforms. Keep raw ground-truth events independent of the noisy observed signal.

### F. The new evoked result demonstrates an exact numerical response, not converged selectivity

The 12-cell saved run has two complete soma events in specimen 601927090, with the other eleven solved cells producing none (`docs/cortex/INTERFACE_LABORATORY.md:19–22`). This is a valuable working example. It was selected after bounded searches; it is not an independently predeclared or held-out selectivity experiment. No new-interface neural mesh/timestep or independent NEURON comparison is yet reported (`interface-experiment.js:178`). The underlying finite-disk study found a 21–22% coarse/intermediate local-onset shift and mesh-sensitive recruitment, despite near-roundoff browser/native agreement (`docs/cortex/FINITE_RIGOR.md:13–23`). That precedent should keep threshold claims conservative.

The new detector's overshoot and repolarization requirements are better than a lone upward crossing (`interface-experiment.js:153–168`). They still do not prove a contiguous initiation-to-soma propagation path or classify whether an event was advanced, suppressed or independently induced during the combined background-drive protocol.

**Next acceptance.** Independently reproduce the exact new evoked waveform and transmembrane currents in NEURON. Use a fixed physical morphology/placement across 40/20/10 µm and half dt. Retain onset/loss brackets, waveform error, timing, and classification changes. Use paired no-stimulation controls for every combined experiment. Add morphology-connected initiation/arrival traces for propagation, and use held-out placements/cells/pulses to test whether a claimed selective design generalizes.

### G. Mixed-size contacts are not yet a controlled electrode-design experiment

`interface-field.js:21,33–36` varies contact size and physical position together. `interface-experiment.js:55–56` changes cell x/depth and moves each entire morphology to a plane clearance based on its own extrema. Consequently, comparing pad 1 with pad 3 or comparing cell 1 with cell 8 changes more than exposed area. The current test shank is a convenient hypothetical layout, not the result of optimizing all catalog implants.

**Next acceptance.** Add paired geometry experiments that change one factor while holding neuron, orientation, gap to membrane, reference and delivered waveform fixed. Define the objective before optimizing: energy, minimum off-target recruitment, usable recorded units, recovered spikes during stimulation, mechanical footprint or robustness. Report a Pareto frontier with uncertainty rather than one universal “ideal electrode.” Preserve both geometric exposed area and electrochemically effective area as distinct quantities.

### H. Concrete legacy defects should be fixed before reusing their behavior

The complete code-backed audit is [legacy field audit](legacy-fields.md). Highest-priority findings are:

1. **Source/noise RNG confound.** `public/scripts/cortex-v2/engine.js:69,126,147–154,208–219` shares a random stream. Changing one recording contact to two changed source event counts from 101 to 95 in a bounded identical-seed, noise-zero run. Electrode count must not alter the neuronal source realization. Separate RNG streams or freeze source events.
2. **Peripheral pseudo-recordings.** `src/pages/sim.astro:833–856` inserts recording “spikes” for every contact every render frame during the stimulus sine phase, independent of axon count, current or recruitment. They share the ordinary event display (`688–699`). Type them as stimulus indicators; zero amplitude/zero neurons must not create neural events; wall-clock frame rate must not control physical event counts.
3. **Invalid legacy recruitment.** `src/lib/stimulation/membrane.js:72–79` flags extreme voltage above 200 mV but throws only above 3,000 mV; `experiment.js:87–93` still includes crossing cells in headline recruitment. Exclude invalid-domain cases from valid-response numerators and give unknown/invalid a separate denominator.
4. **Nonreciprocal legacy mutual transfer.** Different source-size regularization cores in `src/lib/stimulation/field.js:35–56,65–67` produced 0.51% mutual-impedance asymmetry in one nonoverlapping mixed-size diagnostic. Converge the intended double integral rather than merely hiding asymmetry.
5. **Artificial volume-conduction delay.** `public/scripts/cortex-v2/engine.js:183–201` delays a template according to neuron–electrode distance. Do not import that delay into a quasi-static physical recording model. Neural propagation delay must arise in the source dynamics.

Useful concepts worth preserving from legacy implementations include explicit source/return presets, sensitivity controls, charge integration and a compliance display. In particular `src/lib/stimulation/field.js:79–104` already has a linear parallel RC interface and global current scaling for compliance. It is not a ready-made validated upgrade: its parameters are explicitly illustrative (`config.js:3–8`), its conductor is a different uniform-current/full-space problem, and its shared scaling is a simplified stimulator policy. Reuse its interaction ideas and tests, not its parameter values or validation badge.

## Proposed scientific development sequence

These are proposed work packages and acceptance criteria, not completed capabilities.

### 1. Establish one experiment/evidence contract and remove direct confounds

Create a common result schema with declared geometry version, conductor/return/reference, cell/source hashes, units, time semantics, waveform delivery, solver settings, valid/excluded/failed states and exact evidence matches. Separate ideal source events, soma classifications, extracellular detections and sorted units. Keep synthetic and biophysical engines available with explicit scope; avoid presenting a synthetic renderer as an alternate view of the same numerical experiment.

Acceptance: identical neural realizations under recording-only changes; zero-input controls; invalid states never counted as confirmed responses; all exports carry their model/scope; old saved results cannot retain “verified” labels after relevant source/configuration changes. Dependencies: none beyond current code. This is the fastest improvement in scientific integrity.

### 2. Make the existing plane interface an independently checked benchmark

Independently assemble an FEM problem with the exact eight rectangles, uniform homogeneous half-space approximation, identical current patterns, and floating inactive contacts. Converge mesh/domain, compare all unit bases, terminal matrix, source-centered and field-gradient quantities, and actual neuron-edge forcing. Add matched native neuronal checks for the saved ongoing and evoked examples. This isolates implementation errors before changing physical assumptions.

Acceptance: documented preregistered tolerances; retained failures; no fitted gauge offset used to conceal absolute-potential error; boundary-current and off-quadrature residual checks; full neuronal classification comparison at the tested resolutions. Dependencies: common schema plus reproducible meshes and independent solver environment.

### 3. Build the true finite insulating shank

Use a canonical geometry definition to generate both rendering and solver surfaces, with tagged contact, insulation, return and tissue boundaries. First solve the ideal conductor problem on a homogeneous tissue domain, with constant metal potential per contact and prescribed *integrated* currents. An independent finite-element implementation is the most direct reference; retain BEM as an alternative where piecewise homogeneous materials make it efficient. Matrix/basis caching can preserve browser performance without weakening offline physics.

Do not prescribe uniform current density when the intended model is an equipotential metal contact. For finite local source/return configurations enforce current balance over the whole boundary. A remote return is a separate, explicit physical approximation. Increase outer domain until recorded observables, not only a linear solver residual, stabilize.

Acceptance: cells on front, back and near tip; complete capsule-to-solid collision tests; current conservation; reciprocal transfer; positive dissipated power; refinement and independent comparison; sphere/disk/plane limiting cases; a controlled finite-body-versus-plane “shadow” experiment. Dependencies: geometry tags, reference solver and explicit return design.

### 4. Add measured electrode interfaces and delivery electronics

Start with a measured linear impedance model for each material/geometry/electrolyte condition. A parallel RC/CPE model may be a useful identifiable baseline; choose its form from data and frequency range. EIS near equilibrium is not by itself evidence for large stimulation excursions. Verify with held-out current-pulse voltage transients, including both phases and interpulse recovery [R5, R6].

At finite interface impedance, the metal is equipotential but the tissue-side surface need not be. A distributed boundary admittance, `j = Y_surface(ω) (V_metal − φ_tissue)`, permits current redistribution over the surface. A lumped interface added after an ideal equipotential field is an explicit approximation, not the complete electrode model. Progress to nonlinear polarization or charge-transfer kinetics only when measurements show the linear model fails.

Acceptance: measured impedance magnitude/phase and transient fits with uncertainty; controlled sign/energy/charge tests; commanded versus delivered current; compliance clipping and recovery; repeat-pulse behavior; material-specific validity ranges. Display calculated dose without attaching a generic safety label. Dependencies: physical contact geometry, material data and stimulator policy.

### 5. Implement the recording instrument and blind detection

The signal chain should be: membrane sources → reciprocal tissue/contact potentials → electrode/interface and finite amplifier loading → reference/differential input → analog filters/gain → clipping/recovery → ADC → digital processing → detection/sorting. Preserve ideal neural/applied components for evaluation, but do not let the detector read them separately. Include thermal noise using the real impedance over bandwidth, amplifier noise, and a separately seeded biological background [R3, R4].

Evaluate detector/sorter performance against the known model events with spike matching tolerance, precision, recall, timing error, false positives during artifacts and missed early evoked events. SpikeInterface supplies an established ground-truth evaluation framework [R7]. Acquisition and artifact-recovery studies show why preventing saturation and measuring recovery matter before subtraction algorithms [R8, R9].

Acceptance: known analog/ADC test signals, noise PSD and integrated variance, reference behavior, deterministic independent RNGs, explicit anti-alias response, saturation recovery, no invented spikes with zero neural sources, and performance on held-out geometries. Dependencies: interface/material model and stable raw source signals. Only after this stage can geometry be ranked by detectable information rather than ideal signal amplitude.

### 6. Add realistic uncertainty, then optimize

Use ensembles of conductivity, cell placement/orientation, missing axonal geometry, interface impedance, insertion displacement and motion. Introduce tissue heterogeneity/anisotropy with measured ranges and tensor checks, rather than treating a visual six-layer cortex as six validated electrical media. Consider encapsulation and peri-electrode changes as distinct material/geometry hypotheses. Do not add network/ephaptic feedback until a small direct model shows whether it affects the intended observables enough to justify its cost.

Acceptance: separate numerical error from parameter/model uncertainty; report stable rankings and failure regions; preserve measured versus assumed source labels; evaluate design choices on held-out cells/placements. Sensitivity study first, complexity second. Dependencies: previous stages and explicit optimization objectives.

## High-value experiments that can make this platform distinctive

1. **Probe shadow experiment:** identical neuron currents, no probe versus infinite plane versus finite shank; sweep angle and front/back/tip position. Reveal where the convenient approximation fails and quantify an error map instead of calling one model universally superior.
2. **The same contact in the same place:** swap circle/square/rectangle/ring at fixed area and fixed geometry center, then repeat at fixed perimeter and fixed material impedance. This separates spatial averaging, field concentration and electrochemical area.
3. **One source, many acquisition chains:** replay the identical membrane-source history through different reference/electronics/noise settings. A perfect controlled test of recording design that does not change the neurons when contacts change.
4. **Evoked truth versus observed spikes:** display ground truth, raw mixed recording, ADC output and detected raster side by side. Vary blanking/recovery and ask which early evoked events survive. Score the detector instead of decorating a known-event raster with an amplitude threshold.
5. **Reciprocity round trip:** stimulate each terminal with a virtual unit current, then reverse source/measurement roles using selected neural sources. Make field/recording consistency an executable benchmark across geometry revisions.
6. **Return-electrode tournament:** same delivered cathodic charge and target neuron, with remote, bipolar, tripolar and surround returns. Track target/off-target waveforms, terminal voltage, power and recording recovery together.
7. **Manufacturing-robust designs:** perturb contact exposure, alignment and shaft position within documented tolerances. Rank robustness, not just the best ideal placement. Connect device catalog dimensions to provenance/uncertainty rather than silently treating drawings as exact CAD.
8. **Blind benchmark challenge:** freeze several geometries/cells/pulses as held-out tests; evaluate future solver/optimization changes without selecting the best successful case after looking at results.

## Verified primary-source references and how they apply

These sources support proposed methods or motivate checks; none validates this implementation. The audit did not adopt a universal tissue constant, material charge-injection limit or amplifier specification.

- **[R1] Buccino et al., 2019, “How does the presence of neural probes affect extracellular potentials?”** DOI 10.1088/1741-2552/ab03a1. https://pubmed.ncbi.nlm.nih.gov/30703758/ . Original modeling study explicitly represents probe geometry and examines alignment/orientation effects. Supports the finite-shank versus plane comparison.
- **[R2] Steinmetz et al., 2021, “Neuropixels 2.0: A miniaturized high-density probe for stable, long-term brain recordings.”** DOI 10.1126/science.abf4588. https://pmc.ncbi.nlm.nih.gov/articles/PMC8244810/ . Original device paper specifies acquisition range, bandwidth, sampling, ADC and noise. Supports an example instrument model and distinguishes geometric inspiration from actual device equivalence.
- **[R3] Lempka et al., “Optimization of microelectrode design for cortical recording based on thermal noise considerations.”** https://pubmed.ncbi.nlm.nih.gov/17947023/ . Original coupled source/electrode/noise study; geometry optimization depends on measured impedance and SNR, not signal amplitude alone.
- **[R4] Lempka et al., “Theoretical analysis of intracortical microelectrode recordings.”** https://pmc.ncbi.nlm.nih.gov/articles/PMC3196618/ . Original modeling study with electrode and noise contributions; real frequency-dependent impedance is relevant to thermal-noise calculations.
- **[R5] “Experimental and theoretical characterization of the voltage distribution generated by deep brain stimulation.”** https://pubmed.ncbi.nlm.nih.gov/19118551/ . Original saline/nonhuman-primate voltage measurements and matching volume-conductor models identify interface voltage drop, capacitive waveform changes and tissue structure as material factors.
- **[R6] “Using Chronopotentiometry to Better Characterize the Charge Injection Mechanisms of Platinum Electrodes Used in Bionic Devices.”** https://pmc.ncbi.nlm.nih.gov/articles/PMC6508053/ . Original controlled-current electrochemical measurements; supports pulse-transient characterization rather than inferring stimulation behavior only from impedance magnitude.
- **[R7] Buccino et al., 2020, “SpikeInterface, a unified framework for spike sorting.”** https://elifesciences.org/articles/61834 . Original software/methods paper describes ground-truth benchmarking and precision/recall/accuracy metrics.
- **[R8] “Artifact-free recordings in human bidirectional brain-computer interfaces.”** https://pubmed.ncbi.nlm.nih.gov/30444217/ . Original system modification and human recording study using blanking/filtering; a concrete acquisition-recovery example rather than proof that ideal subtraction is sufficient.
- **[R9] “ERAASR: An algorithm for removing electrical stimulation artifacts from multielectrode array recordings.”** https://pmc.ncbi.nlm.nih.gov/articles/PMC5833982/ . Original algorithm/recording study; its additive-artifact approach depends on information not being lost through saturation.
- **[R10] Kent and Grill, 2014, “Analysis of deep brain stimulation electrode characteristics for neural recording.”** DOI 10.1088/1741-2560/11/4/046010. https://pmc.ncbi.nlm.nih.gov/articles/PMC4108584/ . Original FEM–NEURON recording study uses reciprocal unit-current fields with other contacts open and explores geometry/spatial averaging. Supports the architecture, not parameter transfer from DBS to this microshank.
- **[R11] Viswam et al., “Optimal Electrode Size for Multi-Scale Extracellular-Potential Recording From Neuronal Assemblies.”** https://pubmed.ncbi.nlm.nih.gov/31105515/ . Original study explicitly combines spatial averaging, impedance loading, thermal/background noise and source position in evaluating electrode size.
- **[R12] “Impedance scaling for gold and platinum microelectrodes.”** https://pubmed.ncbi.nlm.nih.gov/34433150/ . Original measurements show that simple area scaling need not transfer across material/size regimes. Supports keeping material- and geometry-specific impedance data instead of treating one scalar capacitance density as universal.

## Open questions to resolve before making stronger claims

- Does the new evoked example retain its soma classification, waveform and initiation path on refined neural meshes and matched NEURON dynamics? Not established in this audit.
- How different are lead fields and extracellular drive around the actual finite tip/backside? No solver result exists yet for that geometry.
- Can a chosen fabricated material and driver deliver the illustrated 8 nC phase with the needed terminal voltage and recovery? No material/device data have been assigned.
- Which of the twelve cells remain detectable after a reference, noise, filters and saturation? The present raster is ground truth, not a measured answer.
- How much of a contact comparison comes from area versus position, reference, material and source geometry? Current mixed-size placement does not isolate those variables.
- Are catalog exposed areas, traces, insulation boundaries, routing and material stacks known well enough for simulation? Some adapters explicitly retain unknown exposure dimensions; visual availability is not electrical-model readiness (`src/lib/cortex/implants.js:10,15–22,45–52`).

The platform can become a strong scientific design environment by making these questions executable and answerable. Its most valuable advance would be a traceable, falsifiable chain of calculations and measurements, not a larger collection of plausible-looking simulations.
