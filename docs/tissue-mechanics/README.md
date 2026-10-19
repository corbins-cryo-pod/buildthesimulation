# Tissue Mechanics Laboratories — release 01

Routes: `/simulations/tissue-mechanics/`, `/simulations/cellular-mechanics/`,
`/simulations/tissue-mechanics/methods/`.

## Implemented

A shared finite-strain compressible neo-Hookean tetrahedral FEM engine, deterministic
load continuation, L-BFGS quasistatic equilibrium, inversion rejection, explicit
nonconvergence status and a 25-second worker wall-clock budget. Three.js renders the
same nodal field; no shape is animated independently of the mechanics. Native Astro
component, existing Three.js dependency, isolated CSS, two terminated workers,
resource disposal and route-swap cleanup. No new npm dependency or application framework.

The macroscopic lab provides a stress-free block/cap, surface grabbing, compression,
tension, shear, a spherical indenter with area-weighted nodal penalty contact, and
bonded displacement of a rigid generic cuboid in a pre-existing tract. There is no
puncture, cutting or pia model. Tract depth changes reference geometry, not insertion.

The cellular lab clips the existing attributed H01 proofread skeleton subset at native
coordinates into an 80 µm cube. Tube vertices interpolate measured skeleton radii and
are embedded barycentrically into the same FEM field. No generated population,
segmented soma claim, measured cellular material claim or dense-neuropil claim.
The source panel preserves source IDs, native center, archive/source SHA-256 records,
license and attribution. A guarded local triangle-surface JSON importer supports
future genuine membrane crops; importer-supplied provenance is not verified.

## Numerical meaning

`W = μ/2 (tr(FᵀF) − 3) − μ log J + λ/2 (log J)²`,
`λ = 2μν/(1−2ν)`, `P = μF + (λ log J−μ)F⁻ᵀ`.

Internal units: mm, kPa, mN and microjoule. Free-force residual is
`||g_free||₂/(μ L²)`. Standard target is 1e-5; refinement button targets 2e-6.
J <= 0.08 is rejected for numerical stability, not interpreted as biological failure.
Green-strain norm and von Mises stress are not injury predictors. Quasistatic optimizer
iterations are not physical time, viscoelastic relaxation or material damping.

The illustrative 0.8 kPa modulus lies in the 0.4–1.4 kPa range reported in Budday et al.,
Acta Biomaterialia 2017, PubMed 27989920. Their fitted modified Ogden
law is NOT implemented here. Poisson ratio 0.45 is a numerical regularization choice.
Linear displacement tetrahedra can lock at high bulk/shear ratios. No micro-scale
mechanical calibration is implied by the macro-scale modulus range.

## Verification

Run `node --test tests/tissue-mechanics.mjs` for deterministic mechanics/geometry tests.
Run `node scripts/benchmark-tissue-mechanics.mjs --json` for continuation-based mesh sweeps.
The saved `benchmark-node22.json` contains actual Linux-container Node 22 timings and
nonconvergence classifications, not browser performance promises. Rendering, data fetch,
anatomy embedding and worker scheduling are outside that benchmark.

`tests/tissue-mechanics-browser.mjs` starts Astro and headless Chrome when both are
installed. It checks both routes, worker equilibrium, a nonempty actual H01 crop,
load controls, screenshot capture, narrow viewport width, exceptions and cleanup.
It explicitly skips when Chrome or installed Astro are unavailable; a skip is NOT a pass.
The repository's existing CI installs dependencies and runs `tests/*.mjs`.

Local numerical/geometry tests: 24 passed. Local browser test skipped because this
workspace has no installed Astro/npm dependency tree. CI/browser results must be
reported separately rather than inferred from source review.

## Accuracy gates, not completion claims

- Indentation force and bonded-implant reactions still change appreciably between
  8- and 12-cell meshes. Neither is certified mesh-converged. Sharp-corner peaks
  are particularly unsuitable for quantitative injury or design claims.
- No independent mature FEM implementation has been matched yet.
- No specimen-specific, combined-loading, viscoelastic or failure law is calibrated.
- No dense segmented EM membranes, independent cell mechanics or extracellular fluid.

## Next work

1. Reproduce a matched independent FEM benchmark; add locking-resistant mixed elements,
   mesh/contact-penalty sweeps and explicit force/field error acceptance gates.
2. Calibrate a study-specific hyperelastic and viscoelastic constitutive law across
   compression, tension and shear, including timestep and relaxation verification.
3. Add pia mechanics and validated contact, then a separately verified puncture law.
4. Import a dense EM surface crop with object IDs, segmentation version and transform;
   test heterogeneous mechanics only with separately sourced material assumptions.

See the public methods route for source links, boundary conditions and import schema.
Existing simulations and their numerical engines are intentionally unchanged.
