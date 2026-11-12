# Stage 2: coupled modalities checkpoint

This extends the verified conditional Stage 1 branch without replacing its membrane or field implementation. The Stage 2 page is `/simulations/biohybrid-axon-interface/stage2/`. Its methods, questions and machine-readable report are adjacent routes.

## Implemented

- Actual finite-shell photon transport drives one voltage-dependent four-state H134R mechanism per soma band in the double-cable equations. The inward photocurrent enters the axolemma balance only.
- Complete finite magnetic winding and return path lie inside the explicit insulating sidewall. Primary induction plus conservative anisotropic tissue redistribution supply a chain quasipotential. The Stage 2 solver retains the physical matrix, ordering and fixed tolerances, with symmetric equilibration and a corrected PCG residual/restart policy. Stage 1 source remains unchanged.
- Full declared cohorts and isolated channels are resolved across a finite amplitude grid. Regional, whole-cell, soma-only and applicable opsin-block interventions retain the same initial state, morphology, field and parameters.
- Exclusive/shared counts, exact real rank and isolated-input information remain distinct. Mechanism-dependent exclusivity is checked against the complete assigned row, including every off-target.
- Source-separated reciprocal recording, field confinement, drive energy, voltage replay, comparison, settings import and complete JSON/matrix/event/yield/time-series exports are integrated.
- Independent NEURON current-clamp references, time halving, actual nonuniform optical coupling, spatial and optical shell/domain studies, 37 protocol checks, 12 conditional magnetic membrane checks and 52 software contracts are available with retained failures.

## Observed fixture

The four-cell/four-channel optical run uses seed 4079, 128,000 photons per channel, 0/0.001/0.002 mW emitted, 5 mS/cm² hypothetical H134R expression and a 2 ms pulse. Both nonzero samples produced a diagonal assigned matrix and four conditional exclusive engineered outputs. Required removal controls abolish recruitment. The three optical exposure probes agree in this fixture; this is **not** a rigorous enclosure of all nonlinear firing outcomes or a biological channel yield.

A separate 8,000-photon fixture changes classification under an exposure probe and correctly withholds the headline. Original-host continuity and addressability remain zero under complete resection in every case. Magnetic sweeps produced no qualifying output over the sampled current range. Headlines, threshold brackets and operating points are now explicitly withheld because the field mesh is unqualified. Nominal matrices and traces remain available as diagnostics.

## Open release gates

1. The finer induction algebra now passes the unchanged 10⁻¹⁰ true-residual gate. Symmetric equilibration and residual observation without breaking the PCG recurrence resolve the old failure. The accepted fine result exposes mesh-transfer relative L2 differences of 14.0%, 39.7%, 38.2% and 32.8%, all above the unchanged 5% gate. Four-point source quadrature reduces those to 0.6%, 4.5%, 10.6% and 6.0%, still failing in two cells; it remains a supplemental diagnostic. An eleven-point, degree-four source rule gives 0.55%, 5.28%, 10.10% and 6.12%; three cells fail. Increased quadrature alone is insufficient. Original PCG, RCM and direct-solve failures are retained.
2. Twelve magnetic native-reference and time-halving checks pass for zero input, 10 A, 100 A and a 100 A whole-cell block. No fixture fires. Worst native voltage RMS is 1.72 × 10⁻¹⁰ mV and worst time-halving RMS is 3.39 × 10⁻⁵ mV. These conditional checks use an unqualified field and do not qualify propagation delay, spatial recording convergence or a stimulation threshold.
3. The chunked independent fine assembly with symmetric minimum-degree direct factorization again terminated with exit code 137 before producing a reference. The coarse independent solve is available; fine independent agreement remains unresolved.
4. Spectral overlap is available in the component assay; calibrated wavelength-dependent multi-opsin cohort coupling is not implemented. No spectral multiplier is counted.

Hosted verification passed at commit `0d4238b`: the four-cell, one-channel optical worker completed in 61.9 s. Every exported field and numeric array matches the previous local run exactly, apart from elapsed time. The conservative exposure ratio and retained warnings were checked visibly; screenshots and the detailed browser report are included. WebGL failed in the managed browser, so this verification exercises the same-data 2D fallback. Narrow layouts and Safari remain untested.

A separate unqualified Stage 3 development draft already exists in PR #390 on `feature/axon-resolution-stage3-growth`. It is preserved. This checkpoint does not certify that draft or integrate its identity manifest into the electrical geometry. The original prompt requires verified stages in order; do not claim a sequential Stage 3 release or all six stages complete while Stage 2 gates remain open.

## Current continuation

This milestone separates the corrected algebra, failed field discretization and conditional nonfiring membrane checks. Supplemental source-integration diagnostics and their original source hashes are retained. Passing software checks are not a Stage 2 scientific release.

## Reproduce

Use Node 24.22.1 and Python 3.12.14. Install `scripts/axon-interface/stage2/requirements.txt` into a virtual environment, then run:

```bash
MRG_PYTHON=/absolute/path/to/venv/bin/python node scripts/axon-interface/stage2/reproduce.mjs
npm run build
```

The reproduction entry compiles pinned native mechanisms, executes studies, records logs and returns a failing release status while required gates are missing or failing. `--collect` only aggregates existing study outputs and states that mode explicitly. It does not claim a fresh combined rerun. Large raw arrays and platform-specific native binaries are regenerated, not committed.

The workflow named **Axon Stage 2 software checkpoint** verifies software and build integrity. Its success is deliberately separate from scientific release qualification.
