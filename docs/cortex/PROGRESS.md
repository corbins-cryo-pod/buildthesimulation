# Development handoff

## 2026-10-11/12 — Shared passive foundation

Initial audit base: `6104dd0`. Continued against updated main `26387b9`
(manufacturer/FDA device-sheet changes); these unrelated changes were preserved.
Branch: `feature/cortex-laboratory-foundation`. No production merge or deploy.

Review: [draft PR #243](https://github.com/corbins-cryo-pod/buildthesimulation/pull/243).
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
