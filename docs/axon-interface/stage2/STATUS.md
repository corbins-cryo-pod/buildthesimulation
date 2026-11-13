# Stage 2 — coupled modalities and selectivity

Numerical Stage 2 is qualified at runtime axon-modalities-coupled-0.4.4. The authoritative aggregate is [validation.json](./validation.json); every required study is complete, source-current and sealed by report-file hashes. Production publication is verified separately after merging PR #391.

## Implemented behavior

The laboratory at /simulations/biohybrid-axon-interface/stage2/ runs complete electrode, magnetic, optical and spectral experiments on matched bipolar-cell cohorts. Every declared cell, isolated channel, amplitude and required intervention is retained. Named causal audits, voltage replay, reciprocal recordings, comparison and full JSON/CSV exports remain available. Original H identities and engineered E identities stay separate; complete resection leaves original-host continuity and addressability at zero.

## Required numerical evidence

| Study | Checks | Result |
|---|---:|---|
| coupling | 19 | Passed |
| surface | 9 | Passed |
| spatial | 11 | Passed |
| recording-field | 4 | Passed |
| induction | 16 | Passed |
| magnetic-path | 8 | Passed |
| magnetic-coupling | 12 | Passed |
| magnetic-policy | 7 | Passed |
| magnetic-propagation | 15 | Passed |
| nested-mesh | 7 | Passed |
| nested-default | 12 | Passed |
| nested-original | 12 | Passed |
| nested-recovery-independent | 4 | Passed |
| nested-original-independent | 4 | Passed |
| protocol | 37 | Passed |
| spectral-component | 51 | Passed |
| spectral-coupling | 52 | Passed |
| spectral-spatial | 40 | Passed |
| spectral-protocol | 34 | Passed |
| spectral-crosstalk | 8 | Passed |

The independent component reference additionally passes 65 required checks. Its three unresolved rare-event diagnostics remain explicitly unresolved. Historical failures remain in retained-failures.json and the 12 November checkpoint; replacement studies do not relabel rejected methods.

## Field qualification

The magnetic production field uses the fixed radial-2 parent, planar subdivision 1 and axial factor 2. Separate planar-2 and axial-3 references pass every per-cell 5% comparison for both seed 2048 and seed 4079. Both candidates pass independent NumPy/SciPy reconstruction from physical points, tetrahedra, tensors and the closed winding. No production matrix or source vector is used as the reference assembly. Production true residual remains 1e-10, recurrence target 2e-12 and iteration cap 16,000. Independent residual, potential L2, load L2 and absolute-potential limits remain 1e-9, 1e-6, 1e-8 and 0.001 uV/(A/s).

The polygonal well boundary retains 12 angular sectors plus contact-edge angles. Refinement verifies this declared polygonal model, not exact-circle geometry or arbitrary new parameter choices. Offline reference resource admission differs from the unchanged browser budget; equations and tolerances do not.

## Browser and software evidence

Hosted spectral and magnetic workers completed their full fixtures. Settings, matrices and nonnumeric fields match Node. Maximum observed voltage differences are 2.818e-11 mV for spectral and 4.679714038502425e-8 mV for magnetic; numeric exports are not bitwise identical. Budget rejection and cancellation preserve the completed export. WebGL was unavailable, so the same-coordinate 2D fallback was tested.

The current software checkpoint reports 1064 repository test passes, 2 skips, zero failures, one separately required browser test and 67 focused contract/component passes. The complete site and published evidence/worker checks pass. Source, test counts, log hashes and runner links are recorded in software-checkpoint.json.

## Interpretation and reproduction

The 0–100 A magnetic sweep remains nonfiring in this weak axial-coil geometry. The positive stress fixture at 100 million A is deliberately unphysical and outside the supported interface; it verifies native, time-step and spatial implementation without supplying a feasibility or operating-threshold claim. Magnetic pickup and total recording are withheld when the lead loop is unspecified. Spectral overlap, exposure-dependent classification and sensitivity to expression, kinetics and action-normalization remain visible.

Use Node 24.22.1 and Python 3.12.14 with scripts/axon-interface/stage2/requirements.txt. Run MRG_PYTHON=/absolute/path/to/venv/bin/python node scripts/axon-interface/stage2/reproduce.mjs. Large field studies run serially per machine. The original-cohort and completion workflows retain their source-verified reports and physical-fixture artifacts. The completion runner resumes the interrupted checks, not an invented successful local run. The --collect option explicitly aggregates separately executed evidence.

Publication is withdrawn when a required source, raw linked report or sealed report file changes. Numerical verification establishes the stated equations, not measured engineered-ganglion physiology, biological integration, survival, safety, manufacturing or clinical recovery. Stage 3 PR #390 remains a separate unqualified draft.
