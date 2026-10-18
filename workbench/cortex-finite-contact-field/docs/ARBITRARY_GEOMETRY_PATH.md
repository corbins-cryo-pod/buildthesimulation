# Extending to arbitrary contacts and insulating shanks

The delivered numerical solver implements an **axisymmetric disk benchmark**. Axisymmetry cannot represent an arbitrary shank, an off-axis return, or an array of separated contacts. The analytical reference cannot do that either. This document describes a concrete continuation of the numerical approach; an arbitrary-geometry solver is not claimed as completed or validated.

## Practical continuation: three-dimensional FEM

Use Gmsh for conforming tetrahedral geometry/mesh generation and an open-source FEM implementation such as FEniCSx/DOLFINx with PETSc for the volume-conductor solve. These are prospective dependencies, not requirements of the delivered browser sampler or disk generator. The existing small NumPy/SciPy implementation is practical for an independently inspectable benchmark, and its variational formulation carries directly into 3D.

Represent the tissue as the volume outside the **actual** insulating shank and metal surfaces. Tag each exposed conducting surface, all insulating surfaces, tissue material regions, and the return configuration. Shared edges and contact/shank junctions must be conforming mesh entities. Contact face, sidewall exposure, corner radius, shank thickness, and source-return placement are physical inputs; they cannot be replaced by a contact center alone.

For homogeneous isotropic tissue the PDE remains `div(sigma*grad(phi)) = 0`. Anisotropic positive-definite conductivity tensors and piecewise homogeneous tissues are possible extensions of FEM, but each adds assumptions and validation obligations. A homogeneous Laplace BEM is also credible, especially for open domains and surface-only meshes; it requires consistent treatment of all conductor and insulation surfaces and careful singular quadrature. Neither proposed extension is validated by passing this disk benchmark alone.

## Equipotential contacts with prescribed integral currents

For each perfectly conducting exposed contact `Gamma_k`, introduce one unknown metal potential `Vk` and impose

```text
phi|Gamma_k = Vk,
-integral_Gamma_k J dot n dS = Ik.
```

Here `n` is tissue's outward normal and positive `Ik` injects into tissue. These conditions impose an equipotential surface and an integral current, allowing the local current distribution to emerge. Do not replace them with `J dot n = constant` on each face.

One implementation identifies all tissue boundary degrees of freedom on a contact with a single contact degree of freedom. The assembled equation for that shared degree of freedom is then its total prescribed current, after accounting for the weak-form sign. A Lagrange-multiplier or mixed formulation is another option. Demonstrate equivalence on the disk before using complex contacts. Mesh quality, face tags, and boundary normals must be checked because a sign or tag error can produce plausible-looking but incorrect fields.

## Inactive contacts are part of the geometry

Choose and record exactly one physical inactive-contact model:

- **Floating exposed perfect conductor:** the surface remains equipotential with unknown `Vk`, and its integrated current is zero. It can redistribute current locally and perturb the field even though its net current is zero.
- **Insulated/occluded surface:** pointwise zero normal current. It is not an exposed floating conductor.
- **Grounded or connected contact:** its potential or external circuit relation is prescribed. It can carry nonzero current, which must be included in current balance.

These models are different. Setting “inactive current = 0” on an exposed conductor does not mean pointwise insulating flux. Applying a unit-current basis must preserve every other contact and its specified inactive condition.

## Balanced bases and common return

For `M` explicit contacts in a closed insulating tissue domain, there must be zero total contact current:

```text
sum_k Ik = 0.
```

For example, with contact `M` as an explicit return, basis `b` has `I_b = +1 A`, `I_M = -1 A`, and every other floating contact has zero net current. There are at most `M-1` independent balanced current patterns. Fix the voltage gauge, for example by fixing the return conductor's potential or imposing a volume-mean potential constraint. Fixing a return potential establishes a gauge when its current is determined by balance; do not overconstrain all currents and arbitrary independent absolute potentials.

If the outer boundary is instead an explicit grounded computational return, its outward flux balances the sum of all imposed contact currents. That is a different return configuration and must be labeled as such. A Neumann zero-flux outer boundary together with nonzero net source current has no steady-state solution; a solver must reject it rather than hide the incompatibility.

All basis fields in a superposition must share the same geometry, conductivity, contact surface definitions, inactive-contact model, return, gauge, and finite-domain treatment. Use a common operator/mesh and a common provenance identifier. Do not combine independently generated isolated-contact fields as though they represented a solved array: their neighboring conductors and boundary conditions are absent. A rotated/translated single-disk field is valid only for a corresponding rotated/translated copy of the entire single-disk half-space problem, not as a shortcut for contacts in one shared insulating shank.

For compatible bases in a fixed linear volume conductor,

```text
Ve(x,t) = sum_b I_b(t) * phi_b(x).
```

The browser samples each basis once for stationary compartment coordinates and reuses the resulting matrix throughout the waveform. Geometry motion, changed tissue conductivity, different return wiring, or a changed inactive-contact model invalidates that cached matrix.

## Verification required before exporting new geometries

1. Reproduce the disk with the 3D solver and compare against the independent analytical solution and this axisymmetric numerical solution. Rotate/translate that geometry to test coordinate transforms.
2. Use at least three local mesh levels, maintain physical evaluation points, resolve edge curvature, and report current conservation, reaction versus raw flux, and algebraic residuals. Explicitly distinguish ideal sharp-edge convergence from finite-radius manufactured edges.
3. Increase the outer domain independently of local resolution, or independently verify an open-boundary/BEM treatment. Include the actual finite return whenever one is used.
4. Verify every basis's total current and inactive-contact constraints. Solve at least one combined current pattern independently and compare with the sum of basis fields. Check signs, polarity reversal, and absolute/near-zero errors.
5. Validate the export representation at held-out points, including near-contact and near-shank points. Report interpolation error separately from PDE solution error and test solid/out-of-domain rejection.
6. Test point, segment, and finite-radius compartment/implant collision handling in the integrating simulator. A field interpolator's tissue classification alone cannot perform those checks.
7. Reassess potential-difference error along branching compartment fixtures. Establish accuracy bands for the intended electrode comparison before interpreting neural effects. Validate membrane/timestep convergence and stimulation thresholds separately.

## Future artifact implications

A general 3D export needs explicit conductor/insulator geometry and a robust tissue locator. Options include a tetrahedral mesh with per-vertex potential plus a spatial acceleration structure, or a certified tissue-only adaptive interpolation grid that refuses cells crossing solids. A full rectangular trilinear grid that spans thin shanks without material-aware lookup can interpolate through solids and is unsuitable by itself.

Record original mesh and solver provenance, all contact identifiers, each complete balanced current vector, boundary tags, conductivity, transform, unit conventions, validity mask, geometric tolerance, and checksums. Report compression/download size, load memory, interpolation accuracy, and batch throughput for the new representation. Schema-version changes must be explicit; a browser loader should reject unsupported representations rather than infer them.

Any electrode interface impedance/capacitance extension changes the relation between metal voltage, tissue-side voltage, and current. It may require frequency-domain complex bases or a stateful interface circuit and cannot be obtained by relabeling the present purely resistive basis.

## Open-source numerical references

- Gmsh: C. Geuzaine and J.-F. Remacle (2009), “Gmsh: A 3-D finite element mesh generator with built-in pre- and post-processing facilities,” *International Journal for Numerical Methods in Engineering* 79(11), 1309–1331. DOI: [10.1002/nme.2579](https://doi.org/10.1002/nme.2579); project: <https://gmsh.info/>.
- FEniCSx/DOLFINx project and documentation: <https://fenicsproject.org/> and <https://docs.fenicsproject.org/dolfinx/>. Any adopted implementation must pin an actual release and its mesh/linear algebra dependencies in the later package.
- Bempp open-source boundary element implementation: <https://bempp.com/>. It is a candidate for an independent homogeneous-domain solver; this delivery does not include a Bempp solve.

These tools identify an achievable implementation route. Their existence does not count as a completed arbitrary-geometry result.
