# Active human-cell numerical reliability — 2026-10-16

This milestone audits extracellular activation boundaries and extends independent
NEURON comparisons. It retains the published SWC, fitted channel distributions,
synthetic axon, timestep convention, point-source conductor and legacy internal
crossing detector. No physical parameter or acceptance gate is changed to hide
a failure. The human cell remains the only interactive laboratory model.

## What a response establishes

`responseAnalysis` is additive result/export metadata. It separates:

| Observation | Meaning and limit |
| --- | --- |
| Membrane polarization | Saved-frame change in transmembrane voltage from each compartment's conditioned baseline; zero-area junctions excluded. |
| Local crossing | First upward −25 mV crossing of each physical membrane, detected at internal steps; not a somatic action potential. |
| Soma threshold event | Legacy `spikes` entry with the unchanged 2 ms counting interval; a crossing alone is not proof of a regenerative AP. |
| AP-like waveform evidence | A saved positive-voltage peak followed by return below the threshold within the event window; descriptive, sampling-dependent evidence. Absence does not disprove an AP. |
| Propagation | Not established by this diagnostic. Earliest-crossing-to-soma delay describes order, not a causal path or initiation site. Distributed field forcing can polarize multiple compartments. |

`electricalQuantities` in result bundles also distinguishes membrane voltage,
applied extracellular scalar potential, electric field, neural recording,
applied-source artifact and their algebraic sum. The artifact is the ideal
source potential at the sensing site, not an electrode-interface/amplifier model.

## Validation results

The original 141-run study was rerun against the current code. Its numerical
comparison arrays reproduce the historical results exactly: **all six
extracellular spatial-threshold comparisons still fail the 2% conservative
envelope gate; 14 of 26 waveform comparisons still fail**. The largest selected
probe errors are 2.401 mV RMS and 32.20 mV maximum, against unchanged 1/5 mV
limits. Physical geometry/channel invariants and current accounting pass.
See [the original protocol](REFINEMENT.md) and
[rerun data](benchmarks/refinement-latest.json).

**Eleven fresh independent NEURON cases pass their unchanged agreement gates.**
The native implementation reconstructs the same SWC morphology and original
NMODL mechanisms, with matched initialization/conditioning, temperature,
waveform, point-source forcing, timestep and mesh. Cases cover both historical
threshold endpoints and fixed 19 µA at 40/20/10 µm, plus the moved 40 µA,
1000 µs-phase candidate and 1.2 nA intracellular step at 10 µm / 0.00125 ms.

| Native comparison metric | Worst measured error |
| --- | ---: |
| Full physical-compartment voltage, RMS / maximum | 2.90×10⁻⁷ / 5.43×10⁻⁷ mV |
| Membrane-current RMS | 2.89×10⁻⁸ nA |
| First membrane-crossing time | 6.61×10⁻¹¹ ms |
| Neural / applied recording RMS | 8.05×10⁻¹¹ / 8.62×10⁻¹³ µV |

Voltage agreement is approximately the stored-reference quantization limit,
not a biological accuracy estimate. All local/soma classifications agree;
global classification is identical at 15 and 20 ms. At 19 µA, both solvers give
**no / local crossing / no** at 40/20/10 µm, with no soma event. The moved and
intracellular fine cases each have one soma event with sampled overshoot and
return. This independently confirms mesh-dependent behavior, not convergence.
See [reference methods](RELIABILITY_REFERENCES.md) and
[complete comparison metrics](benchmarks/reliability-native-comparison.json).

Sustained +0.3 nA steps remain verified against their separate native references:
**9 soma events** for the 200 ms step; **18 total events** for the 500 ms step
(17 during input and one just after offset). Maximum voltage error is below
3.1×10⁻⁵ mV; event-time error is below 2.3×10⁻⁸ ms. All nine human-cell examples
were rerun. See [CURRENT_STEPS.md](CURRENT_STEPS.md).

The complete targeted study contains 15 fixed cases and 91 threshold trials.
Each bracket below bounds **any physical membrane upward crossing of −25 mV by
15 ms**, not somatic firing. All fixed 19 µA cases have **zero soma events**.

| Maximum compartment length · µm | Timestep · ms | No-crossing / crossing bracket · µA | Local crossing at 19 µA |
| ---: | ---: | ---: | :---: |
| 40 | 0.00125 | 19.4921875–19.51171875 | No |
| 20 | 0.00125 | 18.65234375–18.671875 | Yes |
| 10 | 0.00125 | 19.16015625–19.1796875 | No |
| 5 | 0.00125 | 18.9453125–18.96484375 | Yes |
| 10 | 0.000625 | 19.12109375–19.140625 | No |
| 5 | 0.000625 | 18.90625–18.92578125 | Yes |
| 2.5 | 0.000625 | 18.9453125–18.96484375 | Yes |

The 40→20 and 20→10 µm threshold envelopes at 0.00125 ms still fail (4.60% and
2.75%). The other five tested threshold comparisons pass, including 5→2.5 µm
at 0.000625 ms (0.309%) and timestep halving at 10/5 µm (0.306%/0.310%). These
pairwise passes do not erase the supported coarser-mesh failures.

All 15 paired fixed-probe waveform comparisons pass: worst RMS **0.723 mV**,
maximum **3.585 mV**, against the unchanged 1/5 mV limits; neural/artifact gates
also pass. Four comparisons fail overall solely because the local-crossing
classification changes at 19 µA. Probe waveforms do not establish convergence
at every compartment. Geometry, current accounting and the compact-harness
comparison with production pass; maximum current residual is below 8.4×10⁻¹² nA.

These tighter brackets use the unchanged browser kernel. The native comparisons
check the wider historical 40/20/10 µm brackets, not every new endpoint. Native
geometry generation for 5/2.5 µm is verified; their dynamics are not independently
NEURON-compared. See [the frozen protocol](TARGETED_REFINEMENT.md),
[full results](benchmarks/targeted-refinement-latest.json) and
[provenance capture scope](TARGETED_REFINEMENT_PROVENANCE.md).

The earlier electrode-position pair was also rechecked at 10 µm / 0.00125 ms:
with the same 40 µA, 200 µs phases and fixed remote return, a source 42 µm from
the soma center gives one soma event; 43 µm gives none. Native and browser soma
waveforms agree (maximum error 1.34×10⁻⁷ mV). This is a research-only source
override outside catalog-contact controls, with soma-only waveform comparison.
It does not establish 1 µm neuron selectivity. Exact coordinates and traces are
in the [position audit](benchmarks/position-check-latest.json).

## Scope and dependable interpretations

| Prediction | Current support |
| --- | --- |
| Applied potential, electric field and source artifact | Verified calculations for the stated homogeneous, unbounded point-source conductor; no electrode-interface or amplifier prediction. |
| Voltage, current and ideal neural recording at a matched tested discretization | Independent native-solver comparisons support implementation agreement for those exact configurations. They do not certify other placements or numerical resolutions. |
| Repeated somatic responses to the tested sustained current steps | Full native-reference waveforms and event times support the model's repeated response; biological generalization is separate. |
| Absolute extracellular recruitment boundary or minimum spatial separation | Unresolved mesh sensitivity and near-boundary classification changes prevent a reliable spatial-resolution claim. |
| Initiation site and propagation to the soma | Not established by crossing order, waveform overshoot or a soma event. |

Same-discretization independent agreement checks the implementation of the
declared equations. Mesh/timestep convergence checks sensitivity to numerical
resolution. Neither establishes biological accuracy. A stable event count does
not establish waveform convergence, and a narrow bisection bracket does not
establish a physically accurate recruitment threshold.

Two nearby electrode positions with opposite classifications bracket one cell's
activation boundary. In a deterministic threshold model, a finer positional
search can make that bracket very small without demonstrating that two nearby
neurons can be selectively recruited. Spatial selectivity additionally requires
multiple cells and robustness to placement, current, morphology and biological
variability; none is supplied by a single-cell on/off pair.

The audit found no substantiated error in the backward-Euler tree solve,
extracellular edge forcing, original channel/calcium update ordering or
solve-consistent membrane-current accounting. Solver equations and fitted
parameters therefore remain unchanged. The implemented corrections address
response interpretation, displayed example labels, export definitions, fresh
reference coverage and stale/incomplete-study detection.

Threshold sensitivity has several coupled numerical candidates: odd-numbered
section segmentation places membrane centers at different physical locations;
the applied point-source field is sampled at those centers; axial discretization
also changes. Competing early crossings can occur in different parts of the same
apical section and different pulse phases. These observations do not isolate one
cause. Recording-source chords can change neural recordings but cannot drive the
activation threshold because the forward recording calculation has no feedback
into the membrane solve.

The human middle temporal layer-2 specimen is not an M1 or S1 validation model.
Its published processor substitutes two 30 µm × 1 µm active axon sections for
the reconstructed axon; full axonal recruitment, distant passing fibers and
population selectivity are therefore unresolved. Channel kinetics include
nonhuman sources, temperature is fixed at 34 °C, tissue is homogeneous and
unbounded, contacts are ideal points, and selected sources/sensors must remain
at least 25 µm from modeled membrane. The exclusion prevents unsupported
near-source calculations; it does not certify accuracy beyond 25 µm.

The original model repository and paper are retained in the evidence registry:
https://github.com/AllenInstitute/Human_all_active_models_EAP and
https://pubmed.ncbi.nlm.nih.gov/32160555/ . The laboratory has no held-out
experimental validation of spatial selectivity.

## Remaining work

Retain failed convergence gates as unresolved. Follow competing local event
locations and phases, test finer/nested discretizations, and independently
verify any alternative field sampling before changing the shipped forcing.
For propagation, add causal pathway/intervention experiments rather than
inferring direction from a single first-crossing map. For spatial selectivity,
use appropriate full axons and cell populations, finite contact geometry and
measured or bounded tissue/interface properties.


## Delivery checks

All **253 tests** pass across nonoverlapping regression, new native-reference and
targeted-report groups. The 460-page site build and Cortex/Finger Atlas static
artifact checks pass. All nine curated examples reproduce their expected events.
The usual complete regression/build command remains `npm run build`; native
fixture regeneration requires the pinned environment described in
[RELIABILITY_REFERENCES.md](RELIABILITY_REFERENCES.md). Reports fingerprint the
tested source files; `sourceCommit` records the checkout base. Interactive
browser/WebGL/cancellation/download QA remains unverified.
