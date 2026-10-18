# Numerical method and mesh

`fem.py` solves the axisymmetric reduction of the three-dimensional, isotropic
conduction problem. The exposed contact is a zero-thickness disk at z = 0,
r ≤ a. Tissue occupies z > 0. The finite computational cylinder has radius and
height R a. Its lateral wall and top are grounded; the bottom outside the disk
is insulating. The r = 0 axis carries the natural regularity condition.

The mesh uses dimensionless coordinates r/a and z/a. Every rectangular cell
is split along its SW–NE diagonal. With continuous linear trial and test
functions, the physical stiffness is

    K_ij = 2 pi sigma a sum_T integral_T r grad(N_i).grad(N_j) dr dz.

The integrand is linear in r because each P1 gradient is constant. Evaluating
r at each triangle's centroid integrates it exactly. This is a Galerkin FEM,
not a finite-difference approximation or an analytical field tabulation.
`make_axes` is the complete, deterministic mesh generator. Near-contact and
near-rim knots are explicit in source; outer knots increase by a factor of
1.22. Refinement divides every interval by 1, 2, or 4, including the tail.
Changing R appends intervals beyond the fixed local r,z ≤ 10 region; it does
not redistribute local nodes. The last interval is truncated at the domain
boundary, so the last outer interval changes when R changes.

The initial solve sets the entire disk to one common volt and the outer
boundary to zero. The disk's weak boundary reaction is its integrated outward
conormal derivative, equivalently the total current entering tissue. Dividing
the numerical voltage field by this positive current gives the prescribed
+1 A basis. An ideal equipotential disk does not have spatially uniform current
density. The P1 approximation resolves the potential while approximating the
rim's singular flux.

`current_control.py` separately tests this normalization. All disk degrees of
freedom are merged into one unknown contact voltage, and the corresponding
load is the prescribed total current. Current-controlled solutions are
compared with the voltage-controlled, normalized basis for positive, negative,
and zero currents. Both formulations share the FEM spatial operator, so this
is a boundary-condition/scaling check, not a second independent spatial solver.

Sparse LU uses SciPy SuperLU. Matrix action and boundary reactions use pairwise
voltage differences, algebraically equivalent to K times the nodal voltage
because element stiffness rows sum to zero. This avoids cancellation of large
constant-potential terms. Two correction solves with the same LU factors reduce
roundoff without changing the PDE, mesh, or acceptance tolerances.

Two flux estimates are retained. Weak boundary reactions give the integrated
FEM conormal flux and test discrete conservation. Raw adjacent-element gradients
are integrated exactly along the bottom, top, and side boundary edges with the
axisymmetric measure. Raw gradients are not equilibrated fluxes and converge
more slowly, especially near the mixed-boundary rim. Their leakage and imbalance
must not be silently replaced by the conservative weak result. Neither method
provides evidence that the ideal rim's current density is bounded.

The exported potential is the numerical P1 solution cast to float32; axes stay
float64 SI meters. The sampler uses the same triangles. Its held-out comparison
against the float64 source solution measures export/roundoff and interpolation
implementation error separately from the FEM discretization error relative to
the independent analytical disk benchmark. As both represent the same P1
finite-element function, there is no additional approximation from a secondary
regular interpolation grid.
