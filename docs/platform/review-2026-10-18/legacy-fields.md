> Supporting audit for the [platform review](../REVIEW_2026-10-18.md). Inspected implementation: `4a15be0ca29bef6c1c6a963cb311b52ba8f34ba8`. Audit work crossed midnight UTC; the review is dated October 18 in America/New_York. Proposed work is not a shipped capability.

# Read-only scientific audit: legacy field, stimulation and recording simulations

Audit date: 2026-10-19 UTC. Repository: `/workspace/scratch/c4f147c01b63/buildthesimulation`. No source edits or broad tests/sweeps. Inspected the active routes, implementation, model guides and existing tests. Ran only two small deterministic diagnostic calculations, reported below. This document does not assess the new `src/lib/cortex` interface simulation.

## Active implementations and defensible scope

| Route/component | Active implementation | Presently defensible interpretation |
|---|---|---|
| `/simulations/cortex-slab/` | `src/pages/simulations/cortex-slab/index.astro:178` loads `public/scripts/cortex-v2/main.js`, using `engine.js` and `scene.js` | Synthetic stochastic event generator and distance-weighted recording illustration. It is **not** a membrane, extracellular-source, or neural-detection model. |
| `/simulations/cortical-stimulation/` | `src/components/CorticalStimulationLab.jsx`, `src/lib/stimulation/{field,membrane,anatomy,experiment}.js` | Mechanistic reduced cable model with prescribed uniform finite surface-current sources in a homogeneous full-space conductor; synthetic arbors and assumed channel distribution. It is **not** the modern equipotential finite-disk model or a human-cell reproduction. |
| `/sim` (linked by `/simulations/nerve-cross-section/`) | Inline implementation in `src/pages/sim.astro:233–1318` | Geometry/placement illustration using exponential arbitrary-unit “fields” and thresholded visual points. No modeled peripheral axonal membrane, action-potential propagation, or physical recording voltage. |
| Decorative nerve hero | `src/components/NerveHero.astro`; used conditionally by `src/layouts/Layout.astro:62` | Illustration: random cylindrical fibers and animated glowing particles. No scientific output to interpret. |

The similarly named `public/scripts/cortex-slab.js`, `src/scripts/cortex-slab.ts`, and `src/scripts/cortex-slab.mjs` are **not** the implementation loaded by the present cortex-slab page. Do not base current claims on those old files.

## Ranked concrete issues

### 1. High: electrode count changes the underlying neural source events in the recording comparison

**Evidence:** `public/scripts/cortex-v2/engine.js:69` creates one RNG. The same stream drives membrane-event surrogates at lines 126, 147–154 and per-sample, per-electrode noise at lines 208–219. Even `noiseUv: 0` still consumes `rand()` at line 218. Presets reset to the same seed but use one versus four electrodes (`main.js:377–381`).

**Bounded reproduction:** Two engines with identical seed 1337, 100 neurons, bounds `[-100,-100,0]` to `[100,100,300]`, 8 kHz, noise 0, stepped fifty times by 4 ms. One engine had one contact; the other had two. Populations were identical, but source event counts were **101 versus 95** and source event identities/times diverged after the first step. This confounds comparing recording geometry: adding a passive contact changes the source population's activity.

**Acceptance criterion:** Separate anatomy, neural-event and per-contact noise streams, or generate a fixed source-event realization independently of the recording configuration. Identical source-event times/identities must be retained across contact position/count changes and noise changes, for the same neural parameters/seed. Existing trace UI and synthetic scope may be retained.

### 2. High for interpretation: peripheral “recording” stimulation marks are injected directly, independently of neural recruitment

**Evidence:** `src/pages/sim.astro:833–856` thresholds the proxy field to turn visual axon points on, then calls `pushRecEvent(..., 1.0)` on **every contact on every render frame** during nonzero sine phase. It does so irrespective of axon count, current amplitude, threshold crossings, and distance. `pushRecEvent` only checks whether recording is enabled (`634–646`). These events are rendered through the same vertical “spikes” loop as spontaneous neural-like events (`688–699`). The rendering loop calls this on wall-clock `requestAnimationFrame` (`1298–1307`).

**Consequences:** Stimulus markers can appear with zero axons or zero amplitude, and their number depends on monitor/frame rate. They are neither calculated recording artifacts nor evoked neural signals. Meanwhile the guide promises only a proxy model (`nerve-cross-section/guide.astro:17–22`), so the model is not globally fraudulent; the specific shared-event presentation is the problem.

**Acceptance criterion:** Give command markers a separate typed event/track; zero amplitude produces no artifact; never label markers as detected/evoked spikes. If a physical artifact model is absent, explicitly call it a stimulus indicator. Keep this engine segregated from the new cortical interface's physical recording pipeline.

### 3. High: legacy cortical-stimulation headline recruitment includes physiologically unsupported voltages and only checks upward crossings

**Evidence:** `src/lib/stimulation/membrane.js:72–79` throws only for nonfinite or absolute voltages above **3000 mV**; sets `extreme` above **200 mV**; classifies first soma/AIS/axon upward 0 mV crossing as `firstSpike` without peak, repolarization, refractory interval, or propagation criteria. `experiment.js:87–93` includes every `firstSpike >= 0` in recruitment bins, activated counts, somatic counts, and distance extents, including `extreme` cells. The UI headline says “Sampled neurons spiking,” the legend says “Spiked,” and the raster says “First-spike timing” (`CorticalStimulationLab.jsx:189,196,216`); a separate alert is displayed for extreme voltages (`206`).

The methods do explicitly define the first crossing (`cortical-stimulation/guide.astro:78`) and disclaim calibration. Nevertheless invalid responses remain pooled into the headline and recruitment statistics. The existing test titled “axon-first response propagates to soma” (`tests/cortical-stimulation.mjs:90–95`) establishes only axonal crossing before somatic crossing and peak limits for a single stimulus, not propagation along an ordered path or general threshold convergence.

**Acceptance criterion:** Separate crossing, complete somatic event, and propagation classifications. Exclude invalid numerical/voltage-domain cases from valid-response counts and report their denominator separately. Preserve raw crossings for diagnosis. Rename the propagation test unless it tests sequential activity along the connected initiation-to-soma path. Do not transfer this older event classifier into the new laboratory.

### 4. Medium: legacy field access matrix is not reciprocal for different contact sizes

**Evidence:** `src/lib/stimulation/field.js:35–37` selects a source-specific regularization core from source area/panel count; `46–56` adds its square to every pairwise Green-function distance. `65–67` averages that regularized source field across receiving contacts. Swapping source and receiver changes the core, so the mutual entries differ despite the reciprocal homogeneous conductor.

**Bounded reproduction:** Two nonoverlapping coplanar disks, diameters 10 and 200 µm, centers separated by 115 µm, 64 nodes each, sigma 0.276 S/m: `Z12=2807.3693408 Ω`, `Z21=2821.7558840 Ω`, mutual asymmetry **0.5098437%**. This is a numerical approximation issue, not evidence of a gross unit error. The material/compliance calculation uses this access matrix; mixed-size cases are not covered by the current reciprocity tests (none found).

**Acceptance criterion:** Integrate the same reciprocal source/receiver kernel consistently (e.g., symmetric pair regularization or finite panel double integrals, with a defined convergence target). Check `Zij≈Zji`, positive dissipated power, and refinement of terminal voltages for mixed sizes/shapes and nearby contacts. Avoid merely symmetrizing without demonstrating convergence to the intended sheet-source model.

### 5. Medium: legacy cable geometry samples field at segment ends while assigning full-segment membrane elements

**Evidence:** `src/lib/stimulation/anatomy.js:68–74` builds each neurite node at `j/segments`, the end of the preceding segment, with area/length of that whole segment. `experiment.js:56` samples extracellular potential at that point. `membrane.js:40–45` uses half-parent plus half-child resistances as a center-based axial discretization. At branch points the parent endpoint is also used as the new branch start. Thus the model has no explicit consistent compartment-center/physical-endpoint representation, especially at soma and unequal-length/diameter junctions.

**Impact:** The effective electrical geometry and sampled field location can move with mesh refinement; a benign single-cell peak/crossing comparison is insufficient to establish spatial threshold convergence. This is a code-backed discretization concern, not a measured threshold error in this audit.

**Acceptance criterion:** Define physical endpoints, membrane centers, junction topology and path lengths explicitly; compare passive cable behavior and extracellular forcing with an independent matched discretization on straight, tapered and branching cases; then refine firing boundaries. Preserve the distinction from the separately developed human-cell solver.

### 6. Medium: the synthetic cortical recorder adds a distance-dependent waveform delay with no physical field justification

**Evidence:** `public/scripts/cortex-v2/engine.js:183–201` applies `gain = baseUv * scale / (r + r0Um)`, an extra nonlinear close-source negative-trough gain, and delay `floor((r/600)*(sampleRateHz/1000))`. This is equivalent to 600 µm/ms from point neuron to electrode, applied to a pre-shaped waveform, not propagation along an axon. The raster aligns to this delayed synthetic trough (`186–190`). It must not be interpreted as volume-conduction transit time or neuronal conduction velocity.

**Acceptance criterion:** Document/remove the artificial electrode-distance delay before sharing a waveform pipeline with the physical laboratory. Any biological propagation latency should arise from source dynamics/morphology; an optional display delay must not enter exported physical event timing.

## Integrity strengths and current evidence limits

- **Recording lab is honestly described as illustrative.** `cortex-slab/index.astro:175` and `guide.astro:4` explicitly state synthetic µV, lack of calibration, no membrane biophysics/impedance/layered conductivity/reference electrode, and that the raster selects known source events using expected isolated peak rather than noisy-trace detection. Keep these qualifications attached to exports (current CSV at `main.js:384–391` has only `time_s,E*_uV`, no model/seed/geometry/synthetic status).
- **Peripheral sandbox openly uses arbitrary units and proxy thresholds.** `sim.astro:35,56–59,86–89` and its guide say the axons are visual sampling points. Its exponential spatial kernel (`599–611`) and piecewise-linear pickup (`614–618`) are reasonable teaching rules, not conductivity/axon biophysics. Neither the visual “firing” nor recordings are evidence of evoked neural response.
- **Legacy stimulation has substantive numerical structure.** SI-aware full-space anisotropic Green function (`field.js:40–56`), charge-conserving fractional-pulse integration (`experiment.js:6–12`), explicit linear interface/compliance (`field.js:79–104`), gauge-invariant axial forcing (`membrane.js:40–45`), and Hines solution (`68–71`). Existing tests cover limited analytic field cases, common-mode invariance, quiet equilibrium, pulse charge, and one active-cell refinement case (`tests/cortical-stimulation.mjs:11–114`). I inspected those tests but did not rerun the suite in this read-only audit.
- **Uniform-current finite sheets are intentional and documented.** `cortical-stimulation/guide.astro:40–45` explicitly says uniform current rather than equipotential metal, both faces exposed, no edge crowding/shank/substrate. Full-space `4π` versus new half-space `2π` is a difference in boundary model, not itself a bug. The `finite-contact` marketing wording is liable to confuse models unless this distinction is prominent in the platform navigation/exports.
- **No absolute biological prediction is presently defensible for these legacy engines.** The stimulation guide explicitly disclaims calibrated absolute neuron counts/thresholds and lists idealized arbors, sealed ends, assumed channel placement, no synapses/myelin/encapsulation, and linear electrochemistry (`106–117`). The sampling intervals are correctly labeled as sampling-only and not model uncertainty (`CorticalStimulationLab.jsx:40`).

## Recommended order for a platform-wide integration

1. Keep the synthetic/peripheral engines available as explicitly illustrative legacy simulations; reuse their layout/interaction concepts rather than their source-event, delay, threshold or pickup rules.
2. Fix source/noise RNG separation and stimulus-marker typing: small changes eliminate direct experimental confounds.
3. Standardize experiment result provenance (model family, synthetic/physical units, return geometry, source-event versus detected-event semantics, invalid/excluded denominator, seed and geometry).
4. Use one validated classification schema across active membrane engines, with invalid-domain exclusion, explicit local crossing, complete soma event, and separately evidenced propagation.
5. Before promoting the older finite sheet model for new electrode comparisons, resolve reciprocal access integration and compartment-coordinate consistency; independently benchmark specific thresholds rather than relying on the one benign legacy refinement test.

No specialist model change or external numerical constant was adopted, so this read-only code audit did not require additional web references. Numerical outputs above are bounded diagnostics of current implementation, not biological validation.
