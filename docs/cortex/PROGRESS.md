# Development handoff

## 2026-10-11/12 — Shared passive foundation

Initial audit base: `6104dd0`. Continued against updated main `26387b9`
(manufacturer/FDA device-sheet changes); these unrelated changes were preserved.
Branch: `feature/cortex-laboratory-foundation`. No production merge or deploy.

Review: [draft PR #243](https://github.com/corbins-cryo-pod/buildthesimulation/pull/243).
Implementation commit: `3f0e25e6cd3cd985c4b3ff31503b14273f34a7da`.
The PR carries the latest CI status and outstanding browser-review checklist.

Implemented the `/cortex/` workspace and `/cortex/methods/`, one shared world,
catalog Utah placement, synthetic lamination/passive arbor, three protocols,
point/line-source recording, bipolar field section, trace/compartment inspection,
versioned config/results, local exports, comparison and worker lifecycle.

Added isolated numerical/scene tests, independent NEURON fixture and a reproducible
benchmark. New numerical/scene suite: 27 tests plus one NEURON fixture test
and two worker-protocol tests;
baseline repository suite: 71 passing tests. Full run: **101/101 tests passed**;
Astro built **436 pages** with no warnings on a fresh-cache build. Post-build
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

### Limits / known risks

- No independent experimental data. NEURON 9.0.1 uniform passive cable agrees to
  7.96e−13 mV and 1.35e−15 nA; full-arbor/extracellular and LFPy checks remain open.
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
4. Extend the pinned NEURON reference to the full tree and extracellular drive,
   and add LFPy comparison before active migration. Use PHYSICS.md for exact
   current/sign/time/source conventions.

Do not infer unfinished features from the mission brief. The README and current
source describe implemented behavior; ROADMAP describes future work.
