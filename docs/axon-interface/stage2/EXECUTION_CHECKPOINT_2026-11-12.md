# Stage 2 execution checkpoint — 12 November 2026

Stage 2 remains **unqualified and unmerged**. The runtime at `62f80fdef34bcb8642121ef3bebbbeff239c8af4` is version `axon-modalities-coupled-0.4.3`. The published magnetic path still uses radial-4/axial-4; the nested mesh is an unpublished experiment, not a replacement already shipped to users.

The execution environment became unavailable while the next mesh study was running. GitHub remains accessible. This document preserves the observed results and recovery steps; it does not replace raw study outputs. The companion [execution-interruption-2026-11-12.json](./execution-interruption-2026-11-12.json) explicitly separates freshly retrieved remote evidence from observations made before the interruption.

## Verified persistent state

- Branch: `feature/axon-resolution-stage2`; [draft PR #391](https://github.com/corbins-cryo-pod/buildthesimulation/pull/391).
- Runtime commit: `62f80fdef34bcb8642121ef3bebbbeff239c8af4`.
- [Deployed 0.4.3 preview](https://f1036f7c.buildthesimulation.pages.dev/simulations/biohybrid-axon-interface/stage2/).
- All seven check runs for that commit succeeded, including Cloudflare. The [Verify site job](https://github.com/corbins-cryo-pod/buildthesimulation/actions/runs/43251114957/job/131296841652) reports 1,058 passes, two skips and zero failures in its main test step, plus one passing required browser test. These are software checks, not magnetic mesh qualification.
- Stage 1 was merged as `1d366b895372439c131b16604b558edad0112e8e`. Preserve it and newer main changes. Stage 3 PR #390 remains separate and unqualified.

## Findings before execution became unavailable

| Study | Observed result | Consequence |
|---|---|---|
| Conservative radial 4→5 at axial 4 | Per-cell relative L2: 0.1576%, 3.7157%, **6.7270%**, **6.1171%** | Fails the fixed 5% criterion despite converged algebra |
| Nested mesh contracts | Seven checks pass; contact area unchanged; exactly one conducting tetrahedron per contact facet; affine sampling error 1.14e-13 mV | Geometry implementation check only |
| Nested planar 1 / axial 1 independent field | Residual 4.87e-11; potential L2 2.90e-11; load L2 6.81e-13 | Independent algebra passes for this fixture |
| Nested axial 1→2 at planar 1 | Per-cell relative L2: 0.4055%, 2.5159%, 1.1695%, **5.7252%** | Candidate still fails |
| Nested planar 1→2 at axial 1 | Fine mesh built; final result unavailable | No conclusion |
| Conservative field-3 independent reference | Corrected original-equation residual 2.81e-14 | Replaces the failed algorithm attempt only, not field convergence |
| Current full magnetic protocol | Canceled after the radial failure; exit 130 | No completed 0.4.3 magnetic protocol result |
| Current spectral protocol | 34 checks pass across two, three and four families | Retain actual source hashes and reports |
| Hosted 0.4.3 two-family spectral run | 82.9532 s; discrete matrices and settings match Node; maximum voltage difference 2.82e-11 mV | Exports are not bitwise identical; magnetic browser verification remains pending |

The earlier independent CG attempt failed its original-equation residual at 1.7357e-9. Keep that failure and its source. The corrected reference uses independent coordinate-column factorization and long-double residual correction. It does not use a JavaScript stiffness matrix or fit signal amplitude or timing.

## Recover before modifying

Original checkout: `/workspace/scratch/9c5c18551577/buildthesimulation`.

Inspect the working tree before any reset, clean or new checkout. The nested generator, generated module, run/check scripts, mesh-contract checks and independent wrapper were not yet confirmed in Git. Recover these exact files when possible, together with the predeclared plan and raw reports listed in the JSON checkpoint.

The last study session was `31514`, with log `/tmp/nested-induction-study.log`. It was running the cases `[1,1]`, `[1,2]`, `[2,1]` sequentially. The first two solves completed; the third had built 1,657,037 unknowns and 9,606,912 tetrahedra. Do not infer that it finished successfully.

Preserve these available-before-interruption files if the environment returns:

- `/tmp/nested-assembly-1-1.v8`, `/tmp/nested-assembly-1-2.v8`, and any completed `/tmp/nested-assembly-2-1.v8`.
- `/tmp/axon-nested-production-fixture.json` and `/tmp/axon-nested-production-provenance.json`; these refer to planar 1 / axial 1, not a future finer production mesh.
- `/workspace/shared/axon-stage2-spectral-043.json`, `/workspace/shared/axon-stage2-spectral-043.jpg`, and `/tmp/spectral-043-browser-comparison.json`.
- Current independent-field-3, spectral-protocol, nested-field and retained-failure reports and their logs.

If those files cannot be recovered, reconstruct the implementation from the pinned sources and re-run. This narrative is not enough to reconstruct raw arrays, exact source files, or valid source manifests. Do not create synthetic passing reports from it.

## Nested-mesh design under study

The unpublished generator checks the immutable Stage 1 field source SHA-256, then produces a separate Stage 2 module. Each parent cross-section triangle becomes four children with shared edge midpoints. Children inherit material classification. New vertices track their two parents, and warped physical coordinates are averaged recursively. Contact and interface ring subdivisions track the same edges; aperture sampling uses the actual aperture-triangle vertices. The physical polygonal boundary, original stiffness, conservative source and strict solver criteria remain explicit.

The observed generated module SHA-256 was `5a2335ed6118421bbbaf928fa0ef79a82cd5e10a135304430ea5228e66c85f5e`. It must be verified against recovered bytes before reuse. Stage 1 itself remains unchanged at SHA-256 `dd60139ae3bff6673e3b1bb7d0361694d41715f53de70207c9fa069c2cc34653`.

## Remaining release work

1. Retrieve the unfinished planar-refinement result. Retain both observed mesh failures and the interrupted full protocol without reclassifying them.
2. Predeclare and test the next candidate. A possible continuation is planar 1 / axial 2, separately compared to planar 1 / axial 3 and planar 2 / axial 2. This is a proposal, not an executed or qualified choice. The latter reference exceeds current browser admission and would need a documented offline-only resource allowance; numerical tolerances and browser limits must remain fixed.
3. Select a mesh only after all four cells pass both refinement directions. Generate that exact production fixture and repeat independent physical-geometry assembly. A passing reference for planar 1 / axial 1 cannot qualify another mesh.
4. Integrate the accepted field factory into magnetic excitation and reciprocal recording. Update settings, exports, work admission and current source manifests together.
5. Repeat the required magnetic path, coupling, policy, positive native/time/spatial and full-cohort studies on the chosen production method. The deliberate 100-million-A stress fixture remains unphysical and outside the 0–100 A interface.
6. Run current hosted magnetic verification and compare its complete export. Recover and record the existing spectral browser evidence; rerun any checks invalidated by changes.
7. Regenerate the authoritative aggregate with pinned reproduction, update methods and retained failures, complete current CI, then publish and verify the deployed release. Never change `completeStage2` to true merely because CI passes.

The per-cell induction transfer limit remains 5%. Production true residual remains 1e-10, recurrence target 2e-12 and maximum 16,000 iterations. Independent residual, potential and load limits remain 1e-9, 1e-6 and 1e-8 respectively. Native membrane, timing, no-drive and cable-spatial criteria remain unchanged. Run large reference jobs serially within the available memory.

All numerical verification concerns the declared equations. It does not establish human physiology, original-host recovery after complete resection, or device feasibility.
