# Stage 2 — coupled modalities and selectivity

The laboratory is `/simulations/biohybrid-axon-interface/stage2/`, with adjacent methods, scientific questions and machine-readable validation routes. `validation.json` is the authoritative release aggregate. Qualification is still pending the final magnetic field refinement and current hosted verification; a successful calculation alone does not complete a release.

## Implemented behavior

- Every declared cell and isolated channel is resolved at every sampled amplitude. No population is screened, omitted or silently downsampled. Matched dark, regional, whole-cell and soma-only controls share the same native initial state; optical experiments also remove the opsin current while retaining light and native conductances.
- Electrode drive uses finite source/return contacts and the inherited anisotropic conductor. Magnetic drive uses the complete closed winding, conservative interface-flux assembly and an actual radial-4/axial-4 production mesh. Its required refinement compares against radial-5/axial-4 under the unchanged 5% transfer criterion.
- H134R illumination uses finite-shell photon transport and voltage-dependent four-state kinetics inside the cable solver. Spectral experiments use separate ChR2, Chrimson and vf-Chrimson parameter sets; the fourth green construct is explicitly hypothetical. Each source is tested at each supported wavelength, with real spectral overlap and no assumed channel multiplier.
- Whole-cell spectral conductance is distributed by soma area. Every spectral pair includes photon-exposure, expression, kinetic-rate and action-normalization sensitivity probes. Room-temperature rates, engineered expression and optical coefficients remain conditional assumptions at a 37 °C cable temperature.
- Exclusive outputs, shared-only outputs, exact real matrix rank and isolated-input information remain separate. Duplicate exclusive rows count the same output once. Full matrices, causal traces, source-separated reciprocal recording, confinement, drive energy, replay, comparison and JSON/CSV exports remain available.
- Original host H identities and introduced E identities remain separate. The complete-resection B3 assumption makes original-host continuity and addressability zero even when an E cell fires.

## Measured evidence

| Study | Passing checks | Meaning |
|---|---:|---|
| Spectral independent SciPy matrix exponential | 51 | Occupancies, photon conversion and currents |
| Spectral native NEURON and time halving | 52 | Same physical stimulus, no amplitude/time fitting |
| Spectral nonuniform illumination and cable refinement | 40 | Both-arm propagation delay and reciprocal recording |
| Two-to-four-family cohort protocol | 34 | Full matrices, controls, identity, export and exact same-runtime replay |
| Nonlinear two-source spectral crosstalk | 8 | Blue activation of a red-sensitive target; no output-count multiplier |
| Positive magnetic stress fixture | 15 | Native/time/spatial implementation checks, separate from field qualification |
| Focused software contracts | 60 | Geometry, units, matching, malformed inputs, budgets and exports |

The H134R native/time regression also passes all 19 checks. The complete repository suite at the spectral milestone passed 1,055 tests, with three skips and no failures. The current site build and inherited Stage 1 emitted-artifact verifier pass. Exact commands, source hashes and runtime evidence are retained in the reports.

The two-source spectral fixture has three nonzero source–wavelength rows but only two distinct exclusive engineered outputs and rank two. The first supplemental assertion wrongly called one output shared-only; its failure and the unchanged-run reanalysis are retained. The scientific implementation and acceptance limits did not change.

The four-cell magnetic production sweep at seed 4079 completes the 0/10/100 A grid with no qualifying propagation. A separate predeclared stress grid reaches a positive response only at 100 million A in this weak axial-coil geometry. That deliberately unphysical drive is excluded from the 0–100 A interface and supplies no feasibility or operating-threshold claim.

## Numerical integrity

The original vertex-load mesh, four-point and eleven-point volume-only attempts remain rejected. Conservative flux assembly cancels internal equal-conductivity faces before quadrature and retains only the longitudinal anisotropic volume term. The production solver preserves the original stiffness and load, uses diagonal equilibration, uses exact axial-column block preconditioning and observes the original physical residual with two-component state and error-free products, and restarts refinement from the original equation. Its true-residual limit remains 1e-10, recurrence target 2e-12 and iteration cap 16,000.

The independent NumPy/SciPy program rebuilds stiffness, source integrals and interface cancellation from physical geometry. It does not solve a JavaScript-generated matrix. A unit-norm algebraic RHS avoids BiCGSTAB's absolute breakdown threshold; physical magnitude is restored before comparison. Earlier singular, breakdown, memory-limit and finest-mesh residual failures remain visible. Passing replacement studies qualify the replacement algorithm and mesh, never the rejected ones.

## Browser evidence

The deployed 0.3.0 spectral worker completed the two-family fixture in 80.5 seconds. Its full export exactly matches the local browser except runtime. All discrete matrices and nonnumeric fields match Node; the maximum observed voltage difference is 2.82e-11 mV. Exposure-dependent classification correctly withholds the selectivity headline. The named pair audit and complete export were tested. WebGL was unavailable, so the same-coordinate 2D fallback was verified. Current 0.4.1 hosted verification remains a release gate.

## Reproduction

Use Node 24.22.1 and Python 3.12.14. Install `scripts/axon-interface/stage2/requirements.txt` into a virtual environment, then run:

```bash
MRG_PYTHON=/absolute/path/to/venv/bin/python node scripts/axon-interface/stage2/reproduce.mjs
```

The entry compiles the pinned native mechanisms, runs component, field, independent-reference, native/time/spatial and full-cohort studies, then repository tests and the site build. The field studies generate the physical fixtures consumed by the propagation studies; a fresh checkout does not require old `/tmp` files. Large raw arrays and platform-specific binaries are regenerated rather than committed. Long field solves have explicit iteration and process limits.

`--collect` aggregates existing study outputs and labels that mode. Required field aggregation verifies study source hashes. A failed new command cannot be replaced by an older passing report. Source changes, stale browser evidence, missing studies or failed gates prevent completion.

Numerical verification establishes the declared equations, not measured engineered-ganglion physiology, biological integration, survival, safety, manufacturing or clinical recovery. PR #390 remains a separate unqualified Stage 3 draft; it is not automatically advanced by this work.
