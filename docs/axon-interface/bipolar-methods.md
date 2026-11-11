# Explicit bipolar projecting-neuron hypothesis

## Implemented topology and evidence scope

`bipolar.mjs` constructs an exposed soma, a distinct peripheral unmyelinated stem, a distinct central unmyelinated stem, two heminodes, and two myelinated MRG arms. The introduced neuron owns both projecting processes. This B3 topology requires no organoid–host relay junction. The original straight motor-fiber constructor remains available: its membrane, outer-current, event and prepared-state outputs are bit-for-bit identical to the separately retained, freshly verified motor implementation in the executed regression fixture.

Version `bipolar-projecting-neuron-1.1.0-axial-soma-hypothesis` uses **five axial soma bands**, 323 membrane compartments and 23 active sites. The five-band component study passes 66 required checks. The actual-well soma study supports five bands using two consecutive passing refinements, and the actual-well/native study passes 12 independent native cases and 16 temporal comparisons. These are numerical findings for declared fixtures. They do not establish measured human spiral-ganglion physiology, engineered-cell survival, reinnervation, or a clinical operating current. The full cohort/protocol release has its own report and is not inferred from a one-cell reference comparison. [Component evidence](bipolar-numerical-report.json), [soma refinement](bipolar-soma-spatial-report.json), [actual-well native and temporal evidence](bipolar-coupled-report.json).

## Fixed nominal hypothesis

| Parameter | Nominal value | Classification and rationale |
| --- | ---: | --- |
| Soma diameter | 20 µm | Hypothetical; midpoint of the requested 15–25 µm range |
| Peripheral stem | 30 µm long, 1.5 µm diameter | Hypothetical process geometry |
| Central stem | 50 µm long, 2.5 µm diameter | Hypothetical process geometry |
| Myelinated arms | 5.7 µm outer-fiber diameter, six true nodes per arm | Published MRG table entry assigned as a conditional electrical model, not a measured SG axon diameter |
| Soma and stem active-density scales | 0.1 of nodal fast Na, persistent Na and slow K | Distributed-membrane hypothesis declared before trials; no fit to a desired waveform |
| Soma/stem leak and reversals | Unchanged MRG nodal values | Explicit transferred hypothesis; no balancing current or leak-reversal adjustment |
| Temperature | 37 °C | Published MRG reference temperature |
| Passive and stem subdivisions | Three per anatomical section | Numerical choice checked against five and seven |
| Soma subdivisions | Five axial spherical bands | Numerical resolution selected after retaining failed one- and three-band comparisons |
| Preparation | 50 ms | Declared equilibration with remaining drift measured |
| Supported integration step | 0.625 µs | Refined after a retained 1.25 µs failure; checked against 0.3125 and 0.15625 µs |

The [original MRG source](https://github.com/ModelDBRepository/3810/tree/b15daeda6ea368df0198d257f339cf5e840cf31c) is pinned at commit `b15daeda6ea368df0198d257f339cf5e840cf31c`. Its `AXNODE.mod` is compiled unchanged in the native reference. Published-model constants define the transferred mathematical model; a source-code citation does not make those values measurements of engineered tissue. The underlying double-cable equations, units and motor-fiber species discrepancy are documented in [MRG methods](mrg-methods.md). The nominal biological hypothesis and limits were [declared before the first bipolar trial](bipolar-acceptance.json).

Native numerical agreement does not remove the motor benchmark's physiological discrepancy. In the current long-cable, finest-grid diagnostic, 10 and 16 µm motor fibers conduct at 47.9964 and 80.2987 m/s, versus 56.6 and 90.56 m/s on the cited cat diameter relation: 15.20% and 11.33% lower. Those measurements concern the transferred motor benchmark, not calibrated human SG arms. The published relation is not claimed validated, and no conductance was retuned to match it. [Motor diagnostic](mrg-numerical-report.json).

There are 12 true nodes, six stem segments, five soma segments and 300 passive myelinated segments. Soma indices are 159–163, with central band 161. The initiation region contains all five soma bands, both stems and one proximal heminode on each arm: 13 compartments, indices 155–167. The choice of a central-band trace in the interface is not a whole-soma voltage average.

## Soma geometry and extracellular coupling

For a spherical soma of radius R, each cylindrical stem joins where its radius equals the sphere's cross-sectional radius:

```
z_left  = −sqrt(R² − (d_peripheral/2)²)
z_right = +sqrt(R² − (d_central/2)²)
```

The nominal junctions are −9.97183534 and +9.92156742 µm relative to the soma center. The exposed membrane is the spherical band between those openings. A segment with limits a and b has exact spherical-band area `2πR(b−a)`. The electrical representation uses a cylinder of diameter 2R, divided into the declared axial segments; each segment has the same membrane area as its corresponding spherical band. Axial resistance follows that equivalent-cylinder geometry. This is an explicit one-dimensional electrical approximation, not a full intracellular spherical-volume solution.

The peripheral stem extends from −39.97183534 to −9.97183534 µm; the central stem extends from +9.92156742 to +59.92156742 µm. The two axonal arms continue outward in opposite z directions. Every compartment exposes a `samplingSurface` describing its cylindrical or spherical band. The actual field coupling averages extracellular potential over that surface. It does not sample the excluded soma interior. Circumferential quadrature averages the field; it does **not** create independently nonlinear membrane patches around the circumference.

Coupling is one way for stimulation: the solved electrode field drives each cable. Computed membrane currents are then projected through the reciprocal transfer for known-source recording. Membrane-current feedback into the stimulating extracellular solution, intercellular ephaptic coupling, and active loading of the well field are not solved. Reciprocal recording does not by itself supply that missing feedback.

The soma and stems have no axial periaxonal fluid layer. Their periaxonal axial conductance is zero, with direct exposure of the membrane to the imposed extracellular potential. Both myelinated arms retain the original axoplasmic, periaxonal and myelin bookkeeping. Native NEURON independently constructs the corresponding sections and uses the large extracellular axial-resistance limit for these unmyelinated surfaces. Its independently constructed compartment positions differ from JavaScript by at most 9.1×10⁻¹³ µm in the component fixtures. [Geometry and native checks](bipolar-numerical-report.json).

## Solver, observation and intervention API

`createBipolarMorphology(settings)` exposes `nodeIndices` containing only true myelinated nodes. `activeSiteIndices` and the alias `activeSites` contain soma bands, stem segments and nodes. `eventSiteCount` counts all of them. `somaIndices` contains the entire soma; `somaIndex` is the central band. Event records include role and compartment index; nonnodal sites have a null node ordinal. `nodeEventTimes` remains a true-node array, while `activeSiteEventTimes` exposes all monitored active locations.

Central-arm distal monitors have true-node ordinals 8, 9 and 10; peripheral monitors have ordinals 3, 2 and 1, ordered away from the soma. These three consecutive true nodes lie outside the initiation region. `armMonitors` supplies both ordinals and compartment indices. The production criterion requires same-ordinal upward crossings with positive outward delays, segment velocities of 1–200 m/s, and no more than a twofold velocity mismatch. These are temporal consistency requirements; they do not prove that three crossings belong to one unique traveling event.

`simulateCable` caps upward events at every active site, including soma/stems, and rejects a cap violation rather than truncating events. Morphology defaults are 0.625 µs integration and 50 ms preparation. The motor benchmark retains its own defaults. Observation stride controls storage, not integration. No voltage clipping, timestamp alignment, amplitude adjustment or baseline correction is used to obtain agreement.

Every matched active-removal intervention starts from the unmodified prepared state for the same dt. Soma-only removal zeros active conductances in all five soma bands. Local removal includes soma, stems and heminodes. Whole-cell removal covers every active site. Leak, capacitance, geometry, field and observation window are unchanged. A separately equilibrated passive-soma hypothesis is a distinct sensitivity case and is not substituted for a matched soma-only intervention.

## Native stump utility and the no-device state

`createNativeStumpMorphologies(bipolar)` returns separate sealed peripheral and central stump morphologies, each with 156 compartments and six nodes. The soma and stems are removed, there is no axial connection across the gap, and arm coordinates are preserved. This utility provides an independently checked native-stump electrical fixture and supports explicitly named alternative remnant hypotheses. Its component-test labels do not determine the production no-device anatomy.

The final production protocol states the same absent-original-remnant assumption for B3 and its matched no-device condition within the modeled domain. B3 adds the hypothetical E cells and their own two processes; the matched no-device state contains no implanted cell, wall or electrode and no original source in that domain. Optional viable disconnected-stump challenges must be labeled separately and cannot silently replace this comparator. The absent-remnant state is a fixed imposed anatomy, not a simulated history of degeneration, growth or survival. Original H continuity remains zero after complete resection; E outputs never inherit H identity. The authoritative anatomy and identity ledger are defined by the current production protocol and its full-cohort report.

## Component verification and retained coarse-step failure

The first bipolar study passed 47 required checks and failed one: maximum per-site RMS for 1.25→0.625 µs was **1.11504240 mV**, above the unchanged 1 mV limit. The endpoint remained included. The exact report, acceptance and source snapshots are retained in [attempt 001](bipolar-attempts/001/bipolar-numerical-report.json). The resolution correction selected 0.625 µs and added a 0.15625 µs comparison, without changing anatomy, channel density or acceptance. The subsequent one-band, 48-pass fixture is preserved with its exact sources in [attempt 002](bipolar-attempts/002/bipolar-numerical-report.json).

The current five-band component suite passes **66 required checks, zero required failures**, with all recorded sources unchanged during execution:

| Check | Current five-band result | Limit |
| --- | ---: | ---: |
| Zero-drive drift after 50 ms preparation | 0.00513396 mV; zero crossings | ≤0.1 mV; zero crossings |
| 0.625→0.3125 µs maximum active-site RMS | 0.55671465 mV | ≤1 mV |
| 0.3125→0.15625 µs maximum active-site RMS | 0.28280126 mV | ≤1 mV |
| 3→5 passive/stem subdivisions, peripheral / central conduction delay | 2.36628% / 2.37052% | ≤5% |
| 3→5 passive/stem subdivisions, reciprocal peak-to-peak | 0.35149% | ≤10% |
| 5→7 passive/stem subdivisions, peripheral / central conduction delay | 0.80292% / 0.80479% | ≤5% |
| 5→7 passive/stem subdivisions, reciprocal peak-to-peak | 0.46150% | ≤10% |
| Seven native fixtures, worst active-site RMS | 1.591×10⁻⁸ mV | ≤1 mV |
| Native reciprocal-recording discrepancy | 6.064×10⁻⁹ µV | ≤0.001 µV |

The seven native cases cover somatic intracellular injection, analytic extracellular drive, matched soma-only removal, local-region removal, whole-cell removal, a separately prepared passive-soma hypothesis, and a driven native central stump. Native geometry, active-site correspondence, waveform, counts, times and recording are checked independently. All stored observation times match exactly. [Current component report](bipolar-numerical-report.json).

## Actual-well soma refinement

The one-band soma can hide axial polarization because opposite well contacts produce extracellular potentials of opposite signs across the body. A dedicated [predeclared study](bipolar-soma-spatial-acceptance.json) compares 1, 3, 5, 9 and 13 bands at 0, 0.01, 0.03, 0.1, 0.3 and 1 µA, for assigned drive and all three active-removal interventions. The same physical field mesh and solved field are reused at every soma resolution. Each band receives its own spherical-surface mean. The field owner independently verifies that changing soma subdivision leaves the excluded geometry and field mesh unchanged.

| Soma refinement | Worst common-node RMS | Largest matched crossing-time difference | Largest reciprocal peak-to-peak change | Declared pair result |
| --- | ---: | ---: | ---: | --- |
| 1→3 | 25.4400 mV | 0.026590 ms among matched counts | 18.6927% | Fail; count differences also retained |
| 3→5 | 1.32793 mV | 0.006501 ms | 3.62198% | Fail; first-crossing role changes also retained |
| 5→9 | 0.462081 mV | 0.003145 ms | 0.797798% | Pass, all 24 cases |
| 9→13 | 0.103945 mV | 0.000700 ms | 0.192195% | Pass, all 24 cases |

Five is the first subdivision with two consecutive passing refinement pairs. The production version was incremented explicitly; the earlier coarse failures remain in both the final comparison and resolution history. An unmatched crossing has a missing timing comparison and an explicit count failure, not an artificial enormous time value. This convergence study concerns axial segmentation within the declared equivalent-cylinder soma, not unresolved circumferential membrane dynamics. [Authoritative soma report](bipolar-soma-spatial-report.json).

## Actual-well native and time comparison

The final coupled fixture uses the actual production geometry and waveform, seeded cell E0001 and channel C1 in a four-cell fascicle, finite source/return contacts, and the 323-compartment five-band morphology. Surface transfer coefficients are in mV/µA. A current in µA produces the imposed extracellular mV. For reciprocal recording, a computed outer membrane current in nA multiplied by that transfer coefficient is numerically in µV. Each solver supplies its own membrane currents; the identical finite-contact artifact is kept separate.

The test uses 50 ms preparation, a 4 ms observation window, 0.1 ms biphasic phases separated by 0.025 ms, and exact interval-averaged drive. Native cases cover 0, 0.3 and 1 µA for assigned, soma-only, local-region and whole-cell removal. Every case uses the unmodified initial equilibrium. The reference builds its own NEURON sections from physical parameters; it does not import JavaScript geometry matrices or voltage solutions.

All **12 native cases pass**. Worst recorded-site RMS is **2.27252×10⁻⁸ mV**; maximum reciprocal-recording difference is **3.10524×10⁻⁶ µV**, below the predeclared 0.001 µV limit. Active-site counts and observation timestamps match exactly. The same actual field is checked at 0.625, 0.3125 and 0.15625 µs for both nonzero amplitudes and all four interventions. All **16 temporal comparisons pass**: maximum per-site RMS is 0.854937 mV for the first halving and 0.425470 mV for the second; largest crossing-time errors are 0.002857 and 0.001411 ms. Field standard, dense-neighbor and boundary reports must pass with exactly current field, morphology and meshing-vendor hashes before this report can be authoritative. [Coupled evidence and fixed gates](bipolar-coupled-report.json).

A driver variable-name error occurred before the first native case. Its failed execution report and script are retained under `bipolar-coupled-attempts/001/` and in the coupled history. The row-name correction did not change equations, parameters, or acceptance limits.

## Responses and causal limits

The 10 nA, 0.1 ms intracellular soma fixture produces one upward crossing at each of the 23 active sites and ordered propagation in both arms. Matched soma-only, local and whole-cell removal each produce zero crossings for that particular input. The current grid 0.5, 1, 2, 5, 10 and 20 nA has no propagation at its first four values and propagation at 10 and 20 nA. This brackets an intracellular fixture, not a well-electrode threshold. At 10 nA the first crossing is a proximal peripheral node despite the known somatic current source; at 20 nA it is the soma. [Component responses](bipolar-numerical-report.json).

The actual well gives different necessity results:

| Applied amplitude | Assigned arm criterion | Soma-only active removal | Local-region removal | Whole-cell active removal |
| --- | --- | --- | --- | --- |
| 0 µA | Neither arm | Neither arm | Neither arm | Neither arm |
| 0.3 µA | Both arms | Both arms still recruit | Neither arm | Neither arm |
| 1 µA | Both arms | Both arms still recruit | Peripheral remains; central is lost | Neither arm |

Thus active soma conductance is not necessary for the tested well-driven recruitment. At 1 µA, peripheral recruitment also survives removal of the entire modeled initiation region. A body band can cross 0 mV passively even under whole-cell active removal. These outcomes are retained rather than forced into an assumed soma-addressing success. Regional necessity, whole-cell active dependence, first-crossing location and exclusive channel output are separate quantities. [Matched actual-well outcomes](bipolar-coupled-report.json).

The component sensitivity register retains all 14 nonnominal variants: soma diameters 15 and 25 µm; soma and stem active scales 0, 0.03, 0.3 and 1; stem lengths at 0.5× and 2×; and stem diameters at 0.75× and 1.25×. All were quiescent in the tested zero-input window; driven nonrecruitment is preserved. These finite one-at-a-time studies do not constitute joint uncertainty coverage or a biological confidence interval. Production amplitude and geometry studies have their own complete outcome arrays; failed trials must not be dropped from those arrays.

## Reproduction and stored evidence

The repository's Stage 1 `reproduce-stage1.py` entry point rebuilds the unchanged mechanism and executes numerical, native, protocol and integration gates on frozen source. Standalone component commands, after compiling `scripts/axon-interface/mrg-modeldb/` using the selected environment's `nrnivmodl` with `CC=gcc CXX=g++`, are:

```bash
MRG_PYTHON=path/to/venv/bin/python node scripts/axon-interface/bipolar-validate.mjs
STAGE1_FIELD_EXPLORATORY=false node scripts/axon-interface/bipolar-soma-spatial.mjs
MRG_PYTHON=path/to/venv/bin/python node scripts/axon-interface/bipolar-coupled-validate.mjs
```

The field standard, dense and domain reports must exist and match current sources before the last two commands can certify an authoritative result. Each report records all participating source hashes and whether a file changed during execution. Historical reports retain their own source identity; a fresh source does not inherit an earlier pass. Large raw inputs/native outputs/comparison arrays regenerate under `bipolar-reference-data/` and `bipolar-coupled-data/`. Small reports, acceptance files, history and failed-attempt snapshots are preserved with the repository.
