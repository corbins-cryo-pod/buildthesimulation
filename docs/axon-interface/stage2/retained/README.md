# Retained induction attempts

- `induction-before-equilibration.json`: required study before the Stage 2 algebra correction. The finer PCG solve failed.
- `induction-equilibrated-mesh-failure.json`: the first accepted algebraic result exposed four failed transfer-refinement checks.
- `quadrature-4/`: source snapshots matching the original four-point diagnostic hashes. Copy them to their original source paths in an isolated checkout to reproduce that exact diagnostic. The solver snapshot also matches the eleven-point diagnostic.

The final solver adds early cancellation, strict zero-boundary validation and a final recurrence-target assertion after those diagnostic runs. These guards do not change the accepted iteration sequence. The required induction study was rerun with those guards. No shift is applied to the physical matrix and no tolerance was relaxed. The higher-order source rules remain diagnostics, not the production field.

All quadrature coordinates are barycentric and weights are normalized to unit tetrahedron volume. Analytic simplex moments verify every polynomial through each rule's claimed degree. An exact finite-segment perpendicular-bisector integral independently checks the field sampler. Polynomial exactness does not establish convergence for the near-winding field.
