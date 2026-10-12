# Verification and validation matrix

**Numerical verification is not experimental validation.** No dataset is calibrated
or held out for empirical validation in this first release. There are no clinical,
human recruitment, device-performance or tissue-safety claims.

`node --test tests/cortex-laboratory.mjs` runs the tests below. The benchmark's
achieved values and tested configurations are in `benchmarks/latest.json`.

| Subsystem / test | Independent mathematical reference | Metric / gate | Status |
| --- | --- | --- | --- |
| Point source | SI 1 nA at 100 µm, σ=.3 | 2.6525823849 µV, abs error <1e−10 µV | Verified |
| Point scaling / reciprocity | 1/r, 1/σ, source-observer exchange | abs error <1e−10 | Verified |
| Electric field | Centered finite-difference −∇φ | <1e−6 V/m component error | Verified |
| Line source | 10,000-point independent midpoint quadrature | <1e−8 µV/nA | Verified |
| Far field | Balanced dipole ∝1/r²; far-line limit | ratio error <1e−5 | Verified |
| Coordinate adapter | Three Euler rotation and fixed catalog pitch | 100 sites, 400 µm pitch, transform <1e−10 µm | Verified |
| One-compartment RC | Exact exponential | temporal error ratio ≈2; fine error <.02 mV | Verified |
| Two compartments | Exact antisymmetric eigenmode | <.0003 mV | Verified |
| Extracellular gauge | Spatially uniform Ve cancels | <1e−9 mV; added common offset <1e−10 mV | Verified |
| Uniform electric field | Sealed finite passive cable analytical solution | refinement ratio >3.5; fine <.0002 mV | Verified |
| Pulse integration | Exact rectangular overlap, including zero-gap phases crossing a timestep | net/phase error <1e−12 nC at 1 µA | Verified |
| Local KCL / total conservation | Sum of axial currents and source balance | each <1e−10 nA | Verified in all three protocols |
| Independent passive-cable solver | NEURON 9.0.1, pas/IClamp, 41 segments | <1e−8 mV and <1e−10 nA at 10 sampled frames | Verified; achieved 7.96e−13 mV / 1.35e−15 nA |
| Default full experiment refinement | Half dt, then half segment length | peak voltage and neural A changes <1% | Verified; not a universal bound |
| Export and reproducibility | Exact current arrays, CSV numbers and JSON round trip | exact equality | Verified |
| Scene geometry | Three world transforms versus numerical contacts and soma dimensions | <1e−9 µm coordinates | Verified at object level; browser rendering pending |
| Worker protocol | Same module through Node worker bridge | identical typed outputs, monotonic progress, invalid-input errors | Verified; browser lifecycle QA pending |
| Placement sensitivity | Same synaptic currents, changed lead field | currents identical; recordings differ | Verified |
| Invalid/singular cases | Explicit contract/domain rules | rejected rather than clamped | Verified |
| Tissue boundaries / meshes | No finite-element model yet | mesh and boundary sensitivity | Not yet modeled |
| Biological recording amplitude | Independent experimental recording | dataset and metric not selected | Not experimentally validated |
| Stimulation spikes / recruitment | Independent active-cell experiment | dataset and metric not selected | Not yet modeled |
| Mechanics | Defined stress/relaxation and implant-contact experiment | dataset and metric not selected | Not yet modeled |

Example achieved default residuals are around 1e−13 nA. This only establishes
algebraic balance, not a biological error bar. Avoid dividing by near-zero total
currents without an explicit normalization floor; current tests use absolute nA.

## Test interpretation

The line quadrature, finite-difference field and analytic cable tests provide
different calculations from the implementation under test. End-to-end tests alone
would not be independent oracles. Source-area averaging, tissue/implant boundaries,
active channels and acquisition are not verified because they are not implemented.

Default refinement fixes the synaptic input in a physical distal 100 µm region.
An initial terminal-compartment-only input moved on refinement and failed the
target; it was replaced rather than loosening the accuracy criterion.

The default recording benchmark meets <1% changes, but imported/user-adjusted
parameters can require finer discretization. Short pulses receive a warning
if there are fewer than four timesteps per phase. This heuristic is not a proof
of adequate resolution; inspect refinement for the actual experiment.

## Required next gates

### Completed independent solver check

`scripts/cortex-neuron-reference.py` was run using pinned NEURON 9.0.1 in an
isolated environment. A sealed 1000 µm × 2 µm cylinder, 41 segments, dt=.025 ms,
passive channels and a first-segment 5 pA clamp is simulated for 40 ms. NEURON's
`use_fast_imem(1)` supplies total outward currents independently of our readout.
The fixture retains ten frames, exact parameters, package/build versions and a
SHA-256 of the generator; Node CI reproduces the same experiment in our kernel.
No NEURON binary or external model data are bundled with the website.

This verifies a uniform-cable numerical case only. It does not verify the complete
branched soma/arbor convention, extracellular stimulation, LFPy transfer matrices,
or biological predictions. External solver agreement is still not experimental
validation. Run `node --test tests/cortex-neuron-reference.mjs` to reproduce the comparison.

### Remaining

1. Extend the reference to the same passive tree and interventions in pinned NEURON, and recording
   coefficients in LFPy; compare voltages, currents, sign conventions and timing.
2. Acquire a licensed morphology/electrophysiology pair. Separate fitted from
   held-out observations and document temperature/preparation/species.
3. Define metrics before fitting: voltage RMSE, extracellular amplitude/waveform
   error and geometry sensitivity, including measurement uncertainty.
4. Add active/channel and finite-contact tests only with defined regimes. Test
   dt/dx and boundary sensitivity separately before any recruitment visualization.

## UI/build verification

The static Astro build, post-build artifact checks and Node tests are run locally;
the Verify site CI workflow also runs the Cortex artifact checks after its build.
Browser behavior, responsive
layout appearance, WebGL/software rendering, keyboard operation, worker cancellation
and download interactions still require interactive browser QA. This environment
has no supported control-browser skill; no preview browser was installed or improvised.
Keep the PR draft until this gap is reviewed. A successful build alone is not a
browser or scientific-validation pass.
