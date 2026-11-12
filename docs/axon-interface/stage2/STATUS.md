# Stage 2: coupled modalities checkpoint

This extends the verified conditional Stage 1 branch without replacing its membrane or field implementation. The Stage 2 page is `/simulations/biohybrid-axon-interface/stage2/`. Its methods, questions and machine-readable report are adjacent routes.

## Implemented

- Actual finite-shell photon transport drives one voltage-dependent four-state H134R mechanism per soma band in the double-cable equations. The inward photocurrent enters the axolemma balance only.
- Complete finite magnetic winding and return path lie inside the explicit insulating sidewall. Primary induction plus conservative anisotropic tissue redistribution supply a chain quasipotential. The production solver retains the Stage 1 ordering and fixed tolerance.
- Full declared cohorts and isolated channels are resolved across a finite amplitude grid. Regional, whole-cell, soma-only and applicable opsin-block interventions retain the same initial state, morphology, field and parameters.
- Exclusive/shared counts, exact real rank and isolated-input information remain distinct. Mechanism-dependent exclusivity is checked against the complete assigned row, including every off-target.
- Source-separated reciprocal recording, field confinement, drive energy, voltage replay, comparison, settings import and complete JSON/matrix/event/yield/time-series exports are integrated.
- Independent NEURON current-clamp references, time halving, actual nonuniform optical coupling, spatial and optical shell/domain studies, 36 protocol checks and 47 software contracts are available with retained failures.

## Observed fixture

The four-cell/four-channel optical run uses seed 4079, 128,000 photons per channel, 0/0.001/0.002 mW emitted, 5 mS/cm² hypothetical H134R expression and a 2 ms pulse. Both nonzero samples produced a diagonal assigned matrix and four conditional exclusive engineered outputs. Required removal controls abolish recruitment. The three optical exposure probes agree in this fixture; this is **not** a rigorous enclosure of all nonlinear firing outcomes or a biological channel yield.

A separate 8,000-photon fixture changes classification under an exposure probe and correctly withholds the headline. Original-host continuity and addressability remain zero under complete resection in every case. Magnetic sweeps produced no qualifying output over the sampled current range, but their mesh qualification is still blocked, so they do not establish a validated magnetic selectivity conclusion.

## Open release gates

1. The finer induction mesh failed the unchanged 10⁻¹⁰ true-residual gate. Reverse Cuthill–McKee ordering also failed and is retained as a rejected correction. The independent direct solver agreed on the coarse default-seed field, but its 212,077-node finer solve terminated with exit code 137 before producing evidence. The supplemental diagnostic is retained separately and does not convert the failed gate into a pass.
2. Magnetic membrane time/spatial and independent-native convergence fixtures remain unqualified.
3. Spectral overlap is available in the component assay; calibrated wavelength-dependent multi-opsin cohort coupling is not implemented. No spectral multiplier is counted.
Hosted verification passed at commit `0d4238b`: the four-cell, one-channel optical worker completed in 61.9 s. Every exported field and numeric array matches the previous local run exactly, apart from elapsed time. The conservative exposure ratio and retained warnings were checked visibly; screenshots and the detailed browser report are included. WebGL failed in the managed browser, so this verification exercises the same-data 2D fallback. Narrow layouts and Safari remain untested.

A separate unqualified Stage 3 development draft already exists in PR #390 on `feature/axon-resolution-stage3-growth`. It is preserved. This checkpoint does not certify that draft or integrate its identity manifest into the electrical geometry. The original prompt requires verified stages in order; do not claim a sequential Stage 3 release or all six stages complete while Stage 2 gates remain open.

## Reproduce

Use Node 24.22.1 and Python 3.12.14. Install `scripts/axon-interface/stage2/requirements.txt` into a virtual environment, then run:

```bash
MRG_PYTHON=/absolute/path/to/venv/bin/python node scripts/axon-interface/stage2/reproduce.mjs
npm run build
```

The reproduction entry compiles pinned native mechanisms, executes studies, records logs and returns a failing release status while required gates are missing or failing. `--collect` only aggregates existing study outputs and states that mode explicitly. It does not claim a fresh combined rerun. Large raw arrays and platform-specific native binaries are regenerated, not committed.

The workflow named **Axon Stage 2 software checkpoint** verifies software and build integrity. Its success is deliberately separate from scientific release qualification.
