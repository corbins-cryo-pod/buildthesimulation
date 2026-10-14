# Development handoff

## 2026-10-14 — Sustained patch-clamp-style current steps

Branched from verified main `503c78c` into `feature/cortex-long-current-steps` in
an isolated worktree. Extended active rectangular input windows to 1000 ms and
recordings to 1200 ms; output intervals up to 0.5 ms permit explicit memory
tradeoffs under the unchanged 64 MiB cap. Passive limits and all physical solver
mechanisms/defaults remain unchanged. New +0.3 nA, 200/500 ms examples calculate
9/18 soma events with model-specific adaptation. Both are independently checked
against the original native NEURON/LFPykit kernel, full physical-membrane traces,
source/input hashes and separate fixtures; all unchanged agreement gates pass.

Recording duration is next to input duration; UI explains ideal current clamp,
recovery time, coarse output and memory limits. Replay gains faster speeds,
step onset/end and previous/next spike navigation. The spike table and derived
latency/count-rate/interval summary distinguish during-step from recovery events.
Exact events/configurations remain exported through the existing bundle contract.
Tests cover saved-sampling independence, budgets, configuration import, event
window/navigation semantics and actual-worker cancellation during long integration.
The prior refinement study is rerun without changing its criteria. Scientific
waveform/spatial-threshold failures remain documented; this update does not fix them.
Supported browser interaction QA remains unavailable. See CURRENT_STEPS.md for
reproduction commands, measured agreement and scientific/verification scope.


## 2026-10-14 — Electrical workbench milestone

Recovered `/workspace/scratch/917b341386bf/buildthesimulation` at clean local
checkpoint `1c8d104` on `feature/cortex-electrical-overlay`. A remote fetch and
branch query confirmed it was unpushed. Main remained `2a3c607` (PR #260), with
Cloudflare success for that preceding active-neuron deployment. Work continued
on `feature/cortex-scientific-workbench`, preserving the checkpoint and unrelated
site content. This request explicitly authorizes the completed milestone's
publication through GitHub and the existing Cloudflare workflow.

Implemented independent quantity legends and controls; labeled current/recording
guide markers; movable/oriented/extent/opacity-controlled applied slices; fixed
or run-wide automatic scales with saturation counts; neutral zero-drive slices;
conservative exclusion of entire source-intersecting cells; cached transfers and
replay paths; a phase-aware sample inspector; correct shortened passive final-step
labels; and small nonzero potential labels that do not round to false zero.

Placement controls now include all implant/cell rotation axes, numerical
translation/reset, mean apex depth relative to pia and actual tilted tip-depth
range. Shared conservative membrane-clearance diagnostics identify soma, axon,
selected and nearest compartments. Unsupported near-contact configurations block
Run and explain how to move them out of the excluded region. No drag-to-solver
coordinate mismatch or new collision/finite-contact physics is introduced.

The workflow is Choose → Inspect → Run → Replay → Compare/export, with a first-run
guide, explicit example reset disclosure, progress/cancel states, stale clearing,
separate membrane/input/recording plots, display-only A/B versus A−B selection,
slow replay and actual saved phase/gap jumps. Eight complete examples are freshly
reproduced; the requested shifted 40 µA / 1000 µs candidate has one soma event at
5.381823 ms. One pinned baseline survives example loading. Comparisons enumerate
changed fields, show event/voltage/neural/artifact metrics and overlay exact
shared-time-grid traces without time alignment or interpolation.

The bounded numerical research ran 141 experiments across a 3×3 timestep/mesh
matrix plus soma-threshold/candidate checks. Physical morphology and channel
amounts are invariant, conservation passes, and event counts/timing are stable.
**Fourteen waveform comparisons and six extracellular spatial-threshold
comparisons fail their unchanged predeclared gates.** The spatial threshold
sequence is nonmonotonic and switches early crossing location/pulse phase.
No solver mechanism, fitting parameter, physical model or resolution was changed
to conceal these findings. See REFINEMENT.md and its hashed report; this work is
published as qualified numerical research, not a convergence certification.

Supported control-browser tooling is unavailable. No preview server, unsupported
browser driver or claimed interactive QA was substituted. Regression/scene tests,
actual-worker Node bridge, Preact server rendering, build/artifact checks and
Cloudflare deployment status are distinct from browser QA. Final local checks passed: **152/152 regression tests**, all eight curated
examples, **454 built pages**, current-entry/worker/static artifact checks,
report/source-fingerprint checks and diff whitespace checks. The bounded study's
failed scientific acceptance gates remain explicitly reported above. Production
publication is authorized; the feature PR records CI and the exact Cloudflare
merge-commit deployment result.

Next bounded scientific work: independent NEURON/LFPykit dynamics at 10 µm /
0.00125 ms and candidate/threshold endpoints, followed by controlled local/finer
spatial refinement of competing apic[40] crossing regions. Retain current gates.
Browser keyboard/mobile/WebGL/cancellation/download review remains separately
outstanding. Both neuron models and original human model licensing are preserved.

## 2026-10-14 — Production publication approved

The user explicitly approved making the completed active development version
live. Publish the tested active milestone through the repository PR and successful
CI/Cloudflare deployment. The passive model remains available and the initial
selection. Interactive browser QA and independent biological validation remain
open; publication does not change the documented numerical or scientific scope.
After incorporating concurrent atlas changes through main `50774ce`, the full
suite passed 136/136 tests, Astro built 454 pages, and static Cortex asset checks
passed. Production publication status is recorded in the PR and deployment check.

## 2026-10-13 — Active human single-neuron review milestone

Branch: `feature/cortex-active-neuron`. The passive foundation PR #243 was
approved for publication and merged as
`f910af3b986d3629c02e8dff6a60a6287a55f251`; its Cloudflare deployment succeeded.
The active stage remains a review feature and must not be merged to production
without the user's approval. The default selection remains the passive model.

Selected and pinned Allen/Mosher–Wei human middle-temporal layer-2 spiny specimen
571654895, original SWC/fit/NMODL and Allen's noncommercial software license.
The matching human morphology and fitted distributions make it a stronger
reference than a generic HH substitution. Channel kinetics have mixed-species
origins; the published processor substitutes a synthetic 60 µm axon.
See ACTIVE_MODEL.md for precise conventions and biological limitations.

Implemented native tapered geometry with shared branch junctions, rigid placement,
nine active mechanisms, calcium dynamics, backward-Euler cable/Markov integration,
total outward membrane currents, true extracellular-potential cable forcing,
separate neural/applied/total recordings, internal-step crossing detection and
selected-compartment channel/current inspection. The interface adds a named model
selector, reference stimulation preset, compatible schema-2 configs/results and
provenance exports while retaining all passive regressions and other simulations.

Independent NEURON 9.0.1 with original NMODL and actual LFPykit 0.6.2 generated
eight complete exported voltage/current references: rest, below/above-threshold
intracellular and extracellular inputs, changed implant pose, half timestep and
refined morphology. Full-compartment voltage RMS is below 2.9e−7 mV and recording
RMS below 2e−11 µV; threshold-boundary classifications agree. A calcium/SK
ordering mismatch was corrected using native state-coupling evidence, without
loosening any gates. Website CI uses hashed fixtures without Python simulators.

The full repository run passed **136/136 tests**, including the actual worker
module through a Node bridge with nested active channel arrays. Astro built
**446 pages**; static route/search/current-worker/active-asset checks passed. These checks
do not establish browser interaction or GPU performance. Supported control-browser
tooling is unavailable; no unsupported browser automation was installed.

Unrelated concurrent device/atlas updates were incorporated through current main
`506c0c5f3cbb2ab125423cf3a398a12dbf67d453` before the final build. The active
feature does not change their content or existing peripheral simulations.

Performance, output storage and refinement are recorded in
`benchmarks/active-latest.json` and PERFORMANCE.md. Conditioning is computed by
the browser solver and may be reused in a bounded worker-local cache; no native
reference solution is imported as an initial state. Active runs require Workers.

### Review and next session

1. Inspect the feature PR and its hosting check/preview, current main and branch
   head. Preserve concurrent atlas/device changes; none belong to this milestone.
2. On `/cortex/`, select the human temporal cell and run default current injection;
   inspect soma/local crossings, selected channels and separated recording traces.
   Load the reference extracellular preset, then compare/export both runs.
3. Perform desktop/mobile, keyboard, WebGL/fallback, cancel/reset/stale-state,
   replay, contact/compartment selection and download QA. Keep the PR draft until
   this gap and the scientific scope are reviewed; await production approval.
4. Next bounded scientific work: identify original fitting sweeps, import a small
   source NWB set with explicit junction correction, reproduce somatic protocols
   without refitting, and extend spatial threshold convergence to 10 µm.
   No population, electronics, FEM or mechanics expansion is part of this stage.

## 2026-10-11/12 — Shared passive foundation

Initial audit base: `6104dd0`. Continued against updated main `26387b9`
(manufacturer/FDA device-sheet changes); these unrelated changes were preserved.
Branch: `feature/cortex-laboratory-foundation`. Initially held for review;
subsequently approved, merged and deployed as recorded above.

Review: [merged PR #243](https://github.com/corbins-cryo-pod/buildthesimulation/pull/243).
Initial implementation commit: `3f0e25e6cd3cd985c4b3ff31503b14273f34a7da`.
The continued independent-reference work is retained in the same feature branch/PR.
The PR carries the latest CI status and outstanding browser-review checklist.

Implemented the `/cortex/` workspace and `/cortex/methods/`, one shared world,
catalog Utah placement, synthetic lamination/passive arbor, three protocols,
point/line-source recording, bipolar field section, trace/compartment inspection,
versioned config/results, local exports, comparison and worker lifecycle.

Added isolated numerical/scene tests, independent reference fixtures and a
reproducible benchmark. New suites: 27 numerical/scene, one uniform NEURON,
five branched NEURON, nine LFPykit and two worker-protocol tests;
baseline repository suite: 71 passing tests. Full run: **115/115 tests passed**;
Astro built **436 pages** with no warnings. Post-build
route/search/worker asset assertions passed. The worker bridge produced identical
typed outputs and monotonic progress; browser cancellation/lifecycle remains to review.
Static checks follow the current HTML component and its linked worker, so stale
hashed assets from incremental builds cannot satisfy the wiring check.

Scientific correction during development: terminal-compartment synaptic placement
moved under refinement. Replaced by a fixed 100 µm physical input patch; kept
the planned <1% refinement criterion. Membrane sources include capacitance and
synaptic terms, and soma injections have an explicit bath return.

Final scientific review caught phase-charge undercounting when one timestep
spans opposite pulse phases. Phase overlaps are now integrated separately from
the net interval-average drive; zero-gap/nonaligned-onset and underresolved-pulse
regressions cover this case. Charge accuracy does not imply a resolved waveform.
Source dates and the catalog rotation-origin metadata were also corrected.

### Continued independent verification

Executed pinned NEURON 9.0.1 for the complete 48-compartment radial-soma circuit:
all three protocols plus rotated/nonaligned extracellular stimulation. Fourteen
saved frames per case agree within 9e−12 mV and 4e−13 nA. Five membrane-free
section adapters express the declared separate soma resistances; segmentation
and adapter-field perturbations check that they add no membrane response.
Actual versus prescribed extracellular voltage and unique-node current balance
are measured, not assumed exact.

Executed pinned LFPykit 0.6.2 with those independent NEURON currents. Eight
point/line cases compare coefficients and neural/applied/total/bipolar signals;
maximum sampled signal difference is below 3e−13 µV. Shared input carries only
geometry/parameters. Generator/input/fixture hashes detect stale references.
See REFERENCE_COMPARISONS.md for exact construction and scope. No website
runtime dependency or solver equation changed in this continuation.

### Limits / known risks

- No independent experimental data. The completed NEURON/LFPykit comparisons
  cover fixed numerical cases, not the entire allowed parameter space or biology.
- Representative slab/arbor, not reconstructed human M1; no active channels.
- Utah point-source/sensing approximation, unknown exposure/channel map, no
  implant collision, displacement, material-boundary or electronics model.
- Browser interaction/layout/GPU/CPU-fallback QA unavailable in this environment.
  Build and scene-object tests are not substitutes; keep PR draft for this review.
- Benchmark covers Node kernel and numeric array storage, not browser FPS or
  total memory. Fine-resolution exports and pinned runs can be much larger.

### Next session, start here

1. Check branch/PR/current main and preserve unrelated edits.
2. Run `npm test`, `npm run build`, `node scripts/benchmark-cortex.mjs`.
3. Perform pending browser QA, then make a review decision.
4. Expand independent parameter/resolution coverage and select a licensed
   morphology/electrophysiology pair before active migration. Use PHYSICS.md
   and REFERENCE_COMPARISONS.md for current/sign/time/source conventions.

Do not infer unfinished features from the mission brief. The README and current
source describe implemented behavior; ROADMAP describes future work.

## Replay electrical overlay

The 3D workspace now displays enlarged stimulating-tip markers colored by signed outward current (µA), recording-tip markers colored by the selected neural/applied/total ideal potential (µV), and three translucent 1.6 mm orthogonal sections through the soma showing the applied stimulation potential. All values follow the exported replay sample; drive is the solver's timestep-average current. Positive values are red and negative values blue. Tissue colors use a fixed ±2 mV scale, clipping beyond that range; recording colors use the component's peak absolute value across both contacts and the run. Numeric sample readouts accompany the view.

The tissue probes use the same transformed point-contact positions and homogeneous conductor transfer as the solver. Near-source triangles are excluded; no finite contact surface or electrode impedance is inferred. Tissue sections disappear at zero pulse current. Stale results hide the entire overlay. The checkbox disables it. The passive and active solvers and their exports are unchanged.

Verification: transformed-source formula and exclusion tests; replay polarity, component, zero-drive and stale/disabled visibility tests. Interactive browser QA remains pending because the supported browser runner is unavailable.


## 2026-10-14 — Human-only laboratory

Retired the selectable simplified passive arbor and its example. Human cell is the initial/reset model; all nine curated experiments use it. Added an active-only configuration-import boundary and a disclosed retired-URL redirect. Updated public methods, model labels and default parameter explanations to describe the actual active physiology. Original mathematical passive kernels/fixtures remain offline regression references. Active configurations and solver mechanisms are unchanged; the examples report is reproduced after registry cleanup. Browser interaction QA remains unavailable.

Verification: all 162 regression tests passed; all nine human examples reproduced; 454 pages built; static artifact checks confirm the selected human default and absence of the retired model controls. Publication uses the existing GitHub/Cloudflare workflow.
