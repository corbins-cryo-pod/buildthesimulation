# Verification and validation matrix

**Numerical verification is not experimental validation.** No dataset is calibrated
or held out for empirical validation here. The active reference was fitted to
human recordings by its original authors; this port has no held-out biological
validation. There are no clinical, human recruitment, device-performance or
tissue-safety claims.

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
| Full declared passive arbor | NEURON 9.0.1 sections/pas/IClamp/extracellular; four cases | <1e−8 mV / <1e−10 nA at 14 sampled frames per case | Verified; achieved <9e−12 mV / <4e−13 nA |
| Independent recording pipeline | LFPykit 0.6.2 point/line matrices applied to NEURON currents; eight cases | coefficients <1e−10 µV/nA; signals <1e−8 µV | Verified; achieved <4e−15 µV/nA / <3e−13 µV |
| Default full experiment refinement | Half dt, then half segment length | peak voltage and neural A changes <1% | Verified; not a universal bound |
| Export and reproducibility | Exact current arrays, CSV numbers and JSON round trip | exact equality | Verified |
| Scene geometry | Three world transforms versus numerical contacts and soma dimensions | <1e−9 µm coordinates | Verified at object level; browser rendering pending |
| Worker protocol | Same module through Node worker bridge | identical typed outputs, monotonic progress, invalid-input errors | Verified; browser lifecycle QA pending |
| Placement sensitivity | Same synaptic currents, changed lead field | currents identical; recordings differ | Verified |
| Invalid/singular cases | Explicit contract/domain rules | rejected rather than clamped | Verified |
| Tissue boundaries / meshes | No finite-element model yet | mesh and boundary sensitivity | Not yet modeled |
| Biological recording amplitude | Independent experimental recording | dataset and metric not selected | Not experimentally validated |
| Active single-cell response | Native original NMODL, SWC and independent recordings | See active matrix below | Numerically verified in fixed cases |
| Biological stimulation / recruitment | Independent active-cell experiment | dataset and metric not selected | Not experimentally validated; no population |
| Mechanics | Defined stress/relaxation and implant-contact experiment | dataset and metric not selected | Not yet modeled |

Example achieved default residuals are around 1e−13 nA. This only establishes
algebraic balance, not a biological error bar. Avoid dividing by near-zero total
currents without an explicit normalization floor; current tests use absolute nA.

## Test interpretation

The line quadrature, finite-difference field and analytic cable tests provide
different calculations from the implementation under test. End-to-end tests alone
would not be independent oracles. Source-area averaging, tissue/implant boundaries,
and acquisition are not verified because they are not implemented. The active
channel extension has its own original-mechanism references below.

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

That original fixture verifies a uniform-cable numerical case only. The follow-up
`cortex-neuron-arbor.json` fixture covers the complete declared 48-compartment
radial-soma circuit, all three protocols, and a rotated/nonaligned-pulse case.
`cortex-lfpykit-forward.json` adds independent point/line transfer coefficients,
recordings from NEURON currents, applied-source artifacts and bipolar readout.
See [REFERENCE_COMPARISONS](REFERENCE_COMPARISONS.md) for the circuit adapter,
finite-field-clamp checks, provenance, exact scope and achieved errors.

External solver agreement is still not experimental validation. These fixtures
are fixed test cases, not a sweep of the entire allowed parameter space. Node CI
runs the comparisons without downloading Python packages or executing a reference solver.

### Remaining

1. Extend independent reference coverage across parameters, pulse timings and
   discretizations before claiming broader numerical accuracy.
2. Identify the selected human model's original fitting sweeps, import appropriate
   observations and separate fitted from held-out comparisons explicitly.
3. Define metrics before fitting: voltage RMSE, extracellular amplitude/waveform
   error and geometry sensitivity, including measurement uncertainty.
4. Expand active threshold convergence and add finite-contact tests in defined
   regimes before quantitative recruitment or device-specific claims.

## Active model verification

The selected human temporal cell's predeclared gates are in ACTIVE_MODEL.md.
`tests/cortex-active-reference.mjs` compares original native NEURON 9.0.1 and
actual LFPykit 0.6.2 against the browser kernel. Eight cases cover no-drive,
subthreshold/suprathreshold intracellular input, subthreshold/local-crossing
extracellular input, changed implant rotation/translation, halved timestep and
refined morphology. Every physical compartment is checked at all 801 exported
samples per case; detection/conservation use internal timesteps.

| Check | Achieved result | Interpretation |
| --- | --- | --- |
| Nine source channel state trajectories | NaV <2e−14; scalar gates <7e−16 absolute error | Original held-voltage mechanisms, not generic HH |
| Full physical-compartment voltage | RMS <2.9e−7 mV; maximum <5.05e−7 mV across eight cases | At the fixture's 1e−6 mV encoding quantum |
| Total outward membrane current | RMS <2.9e−8 nA | At the fixture's 1e−7 nA encoding quantum |
| Neural/applied/total recording | Maximum channel RMS <2e−11 µV | Native membrane currents through independent LFPykit |
| Soma events and first local crossings | Same classifications; timing differences <0.1 ms gate | Intracellular case has one soma event; extracellular cases have local events without soma spikes |
| Intracellular threshold bracket | 0.928125 nA no soma crossing / 0.9375 nA crossing | Both boundaries agree with native solver; 5 ms input, −25 mV criterion by 15 ms |
| Extracellular threshold bracket | 19.6875 µA no local crossing / 20 µA crossing | Both boundaries agree; any membrane, specified bipolar pair/pulse/pose |
| Worker/channel transfer | Node bridge verifies nested typed outputs, spike event, progress and byte accounting | Browser cancellation/transfer behavior still pending |

Native field coupling uses a stated high-conductance extracellular boundary;
agreement establishes the tested cable/field implementation, not realistic tissue
boundaries. Zero-area endpoints are excluded from membrane-voltage comparisons,
event detection and forward sources. Full geometry, exact configs, generator and
original-asset hashes plus compressed-trace hashes are retained in fixtures.
Normal CI executes no Python simulator and downloads no model.

The calcium-ordering comparison initially revealed a source-coupling mismatch:
CaDynamics must use pre-solve voltage and SK must read updated calcium. That was
corrected without changing acceptance gates, and full-cell errors fell to the
fixture quantization floor. Timestep/spatial changes and computational cost are
reported in PERFORMANCE.md and the checked-in active benchmark; convergence of
extracellular threshold is not assumed from solver agreement at each resolution.

## UI/build verification

The static Astro build, post-build artifact checks and Node tests are run locally;
the Verify site CI workflow also runs the Cortex artifact checks after its build.
Browser behavior, responsive
layout appearance, WebGL/software rendering, keyboard operation, worker cancellation
and download interactions still require interactive browser QA. This environment
has no supported control-browser skill; no preview browser was installed or improvised.
The 2026-10-14 publication request explicitly permits release with this gap disclosed.
A successful build alone is not a browser or scientific-validation pass.

## Electrical workbench verification (2026-10-14)

`tests/cortex-electrical-overlay.mjs` and `tests/cortex-workbench.mjs` check
transformed contacts, independent source-field arithmetic, agreement of slice
values with ideal recording artifact at the same position, both phases and rest,
separate fixed/automatic scales, whole-cell source exclusion, configurable plane
geometry, replacement disposal, independent visibility and stale-result clearing.
The whole-cell exclusion test specifically places a singularity between valid
vertices: checking vertices alone is insufficient to prevent a triangle from
bridging the unsupported region.

Placement reports and solver rejection call the same tapered-polyline membrane
distance function. Tests check finite diagnostics, overlap rejection and mean
apex depth under a rotated implant, retaining X/Y coordinates. Numerical
settings, source equations and engine revisions are unchanged.

Eight complete examples were executed and their actual outcomes retained with
source/configuration hashes. Regression tests rerun the new shifted-array,
unshifted-array and reversed-polarity cases. This verifies reproduction, not
independent biological truth. New 1000 µs cases have no new native dynamics
fixtures; see EXAMPLES.md. The bounded 3×3 refinement matrix and predeclared
acceptance results are in REFINEMENT.md, including failed convergence gates.

Static artifact checks traverse the current hydrated entry’s reachable chunks
before verifying its exact worker path; old build assets cannot satisfy them.
Completed-result electrical panels were also server-rendered with Preact. These
are component/static checks, not pointer, keyboard, WebGL or browser lifecycle QA.

### Computational audit summary

| Area | Audit finding / preserved contract |
| --- | --- |
| Timestep integration | Backward-Euler tree solve retained; 0.005/0.0025/0.00125 ms study measures unresolved sharp-spike waveform error instead of assuming event stability is enough. |
| Morphology/channel distribution | Native taper, arc area, attachment topology, section-specific densities and synthetic 60 µm axon retained; 40/20/10 µm totals invariant to roundoff. |
| Channel-state ordering | Original scalar/Markov updates and calcium/SK sequencing unchanged; existing native held-voltage and full-cell reference tests remain gates. |
| Current accounting | Capacitive, ionic/leak and synaptic currents use solve-consistent states; conservation/local KCL checked on every internal step. |
| Forward model | One-way point-soma / line-chord neural recording; changing chords can alter recordings but cannot cause stimulation threshold changes. |
| Pulse/output sampling | Exact phase overlap/charge retained; saved drive/artifact reflects preceding internal interval, not an output-bin average. Passive shortened final interval is now described correctly in the viewer. Missing saved phases/gaps are explicit. |
| Export contracts | Both experiment schemas, exact CSV A/B/A−B and current arrays, result provenance and worker buffer transfers retained. UI adds separate visualization metadata to result downloads. |
| Lifecycle/performance | Bounded buffers/conditioning cache and worker cancellation retained; slice replacements dispose resources, replay caches geometry coefficients/scales/paths and skips repeated unchanged color updates. |

No new empirical validation, channel refitting, population model, finite-contact
regularization or electrode acquisition model is inferred from these checks.
