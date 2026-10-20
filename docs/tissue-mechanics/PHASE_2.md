# Tissue mechanics Phase 2

Both existing laboratory routes are preserved. Select Phase 2 or the unchanged
Release 01 elastic constitutive engine. The public methods and validation routes
are the authoritative descriptions of equations, sources, boundaries and limits.

## Implemented

- Three isochoric equilibrium energies: one-term Ogden, neo-Hookean and Mooney–Rivlin.
- Mixed structured macrocell P0 pressure, statically condensed, with shear-scale
  local volume-fluctuation stabilization; full-tetra volume comparator.
- Objective multiplicative finite-Maxwell history with two branches, logarithmic
  return mapping and immutable trial state. Only converged global increments commit.
- Physical-time relaxation, traction-controlled creep, force-free recovery, cyclic
  loading, accepted-state replay, audit exports, cancellation and 25-second browser
  budget. Time histories start from a fresh, relaxed sample, not an old static solve.
- Eight published regional/cycle viscoelastic fits (Budday 2017 Tables 4 and 6),
  source-reported poor-fit warnings, explicit sensitivity rather than invented CIs.
- Twelve independently fitted static material presets against pinned CANN/Budday
  average curves. Held-out points and loading-mode holdouts; no donor-validation claim.
- Existing H01 source-coordinate anatomy and guarded surface importer preserved.

## Reproduction

```
node --test tests/tissue-mechanics.mjs tests/tissue-phase2.mjs
node scripts/tissue-phase2/validate.mjs --full
python scripts/tissue-phase2/reference.py
python scripts/tissue-phase2/calibrate.py
python scripts/tissue-phase2/gates.py
TISSUE_REQUIRE_BROWSER=1 node --test tests/tissue-mechanics-browser.mjs
npm run build
```

Reference requirements: Python, numpy, scipy, jax with x64. The dedicated workflow
pins the experimental workbook blob and checks all 408 coordinates/stresses against
its extracted sheet. The reference uses separately assembled Python/JAX energies
and SciPy Newton/ODE integration; it does **not** claim a mature commercial-FEM
comparison. Saved reports include exact software versions and actual failures.

## Verification scope

49 local numerical/geometry tests passed after integration. Four independent
nonlinear compression checks cover mixed/full-volume neo-Hookean and Mooney–Rivlin.
Displacement-relative L2 and force-relative error gates are 1e-4. Ogden stresses
have independent NumPy energy-gradient tests. Finite Maxwell history is compared
with continuous DOP853 integration: recorded maximum stress errors 2.11%, 1.08%,
0.55% at 0.5, 0.25, 0.125 s. This material-point test is not a global FE error bound.

A 2% compression sweep of 4/8-cell meshes and nu=0.45/0.49/0.499 exposes locking.
At nu=0.499, coarse/fine mixed force differs by about 3.2% relative to the fine
result; the full-tetra comparator differs about 80.3% using the same denominator
(or 44.5% relative to its coarse result). Neither establishes all-mode mesh convergence.
The structured macrocell method has no claim of general inf-sup stability.

Local Node timing for four 10-second physical-time protocols at n=4, dt<=2 s was
approximately 6.0–12.4 seconds. At dt<=0.5 s, measured relaxation and cyclic runs
were 11.4 and 19.0 seconds. These exclude browser/network/anatomy loading. Tighter
near-incompressibility and refined meshes exceed the interactive budget; the
browser must report incomplete time, not fabricate completion or hide lower fidelity.

## Scientific boundaries

Published averaged ex-vivo fits are not patient-specific and some fit tensile
behavior poorly (including negative R2). Confidence intervals are not available
from the distributed averages; sensitivity multipliers are not confidence bands.
The selected nonrelaxing bulk modulus is a numerical/material assumption. White
matter fits are isotropic. Static-curve calibration cannot infer viscosities.

No pia, puncture/fracture, frictional sliding, flexible electrode mechanics,
poroelastic fluid, cell-specific material, dense segmented membranes or injury
prediction is implied. H01 geometry remains passively embedded in a homogenized
material. Time is physical but quasistatic; inertia is not modeled.

## Audit files

CI uploads artifacts/tissue-phase2: source hashes, raw extracted workbook values,
JS reference cases, independent-reference.json, calibration.json, verification.json,
acceptance-gates.json, and browser screenshots. A skipped local browser test is not
a pass; dedicated CI sets TISSUE_REQUIRE_BROWSER=1 to prohibit skipping.
