# Explicit well and aperture volume conductor

The Stage 1 field solver is a conforming, first-order tetrahedral finite-element
implementation of a passive, anisotropic volume conductor. Every represented
engineered neuron has a physical insulating well. Current enters and leaves
through finite surface contacts; its escape through the open annular apertures
is a result of the solved geometry and conductivities.

The frozen implementation is `explicit-well-fem/1.0.0`, in
[`field-stage1.mjs`](../../src/lib/axon-interface/field-stage1.mjs), SHA-256
`dd60139ae3bff6673e3b1bb7d0361694d41715f53de70207c9fa069c2cc34653`.
Its final field studies use the five-band bipolar morphology, SHA-256
`d47f6717b3faa87ae775c67e1fee4ce0f222e5e954cdba6c765d3d7dffb22098`.
The parameter register exported as `FIELD_STAGE1_PARAMETERS` contains all 55
fixed defaults, quadrature choices, iterative-solve settings, resource limits
and geometry construction choices, each with units, one evidence class and
provenance. Well and neuronal dimensions belong to the separate exposed Stage 1
geometry register. Neither register represents measured engineered tissue.

## Equation and material regions

In the conducting domain, the potential satisfies the weak quasistatic equation

\[
\int_\Omega \nabla v^T\boldsymbol\sigma\nabla\phi\,dV
=\int_{\Gamma_\mathrm{contacts}}v j_\mathrm{in}\,dS.
\]

The outer cylindrical surface and both axial end planes are grounded. Excluded
well walls, endcaps and local neuronal interiors have natural zero-normal-current
boundaries. Element assembly uses
\(K_{ij}=V_e\nabla N_i^T\boldsymbol\sigma_e\nabla N_j\), with constant
affine gradients in each tetrahedron. Material boundaries coincide with mesh
interfaces; the thin perineurium is explicitly present in the matrix.

| Region | Default geometry | Conductivity, S/m |
|---|---|---|
| Endoneurium | Fascicle radius 250 µm; the full 256-cell fixture uses 350 µm | Transverse 0.083; longitudinal 0.571 |
| Perineurium | Explicit 15 µm shell, two radial element bands before refinement | Isotropic 1/1149 |
| Epineurium | Extends to radius 400 µm | Isotropic 0.083 |
| Surrounding medium | Extends to radius 1200 µm | Isotropic 0.3 |
| Well and aperture fluid | Explicit connected cavity and annular bores | Isotropic 0.3 |

The default axial boundary is at ±8000 µm. Conductivities are exploratory
effective ohmic choices informed by the preparation-dependent values discussed
by [Pelot et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC7309635/).
The perineurial resistivity is not a universal human material constant: measured
and estimated values depend on preparation, temperature and frequency. The
model contains no capacitive perineurium, frequency-dependent dispersion,
subject-specific anatomical fit or electrode interface impedance.

## Explicit well, aperture and contact geometry

Each well has inner radius 13 µm, wall thickness 2.5 µm and half-length 70 µm.
The endcap occupies axial distances 67.5–70 µm from its center. The nominal
center spacing is 35 µm; actual seeded positions and collisions are checked
before a mesh is allocated. Each endcap has a circular aperture of radius
3.5 µm. The nearby myelinated cable has outer radius 2.85 µm, leaving a nominal
0.65 µm radial fluid gap in the bore. These are explicitly hypothetical design
parameters.

The source and return are rectangular patches on the same positive-x inner
wall, centered at z = −15 and +15 µm. Each has nominal width and height 6 µm.
The contact area is calculated from its actual triangular surface facets:
about 35.9202 µm² at the default angular mesh. The solver assigns uniform
current density over that measured area and integrates each triangular nodal
load exactly as area/3. Every source load sums to +1 µA and every return to
−1 µA, within floating-point roundoff. Charge-density displays must use the
calculated area, not the nominal rectangular product.

This boundary condition describes ideal prescribed current-density patches.
It does not describe an equipotential metal pad, capacitive electrode
polarization or a charge-injection safety limit. The contact-pair voltage is
the source-weighted potential minus the return-weighted potential from this
boundary-value problem.

The near-well neuronal interior follows the spherical soma surface, distinct
peripheral and central stems, and nearby cable diameters. The default soma is
20 µm in diameter; peripheral and central stems are 30 and 50 µm long with
diameters 1.5 and 2.5 µm. The external spherical surface is partitioned into
electrical bands without changing its physical exclusion geometry. An abrupt
cable diameter change uses an inscribed transition over
0.1 µm/axialRefinement, recorded in the numerical parameter register, so a valid
membrane sampling point is not placed inside an oversized numerical hole.

Local neuronal interiors remain explicitly excluded through 20 µm beyond each
well end. Outside that region the outer cable is represented in the effective
anisotropic endoneurial medium. Distal nodes are therefore not individually
meshed as three-dimensional holes. The 20→40 µm extension study below tests
this scale separation for its declared fixtures.

## Mesh, linear solve and budgets

A constrained planar triangulation preserves all tissue, well, aperture and
cell boundary loops. It is extruded through the critical axial planes, with
each prism split consistently into three tetrahedra. Wall, cap and neuronal
interior elements are removed. Coarser axial spacing away from the well region
reduces cost without dropping cells or wells. The mesh contains the finite
source/return patches themselves; an unresolved source is rejected.

The bundled triangulator is [cdt2d 1.0.0](https://github.com/mikolalysenko/cdt2d)
under the MIT license. Its bundled ESM SHA-256 is
`645d096429082510865735501c2fcfd9d3b6e7211e8c631f855b811f83dad185`.
The [dependency pins](../../src/lib/axon-interface/vendor/cdt2d-source-pins.json),
[exact package lock](../../src/lib/axon-interface/vendor/cdt2d-package-lock.json)
and [licenses](../../src/lib/axon-interface/vendor/THIRD_PARTY_LICENSES.md) are
committed. Runtime meshing does not download external code.

The sparse symmetric matrix uses typed-array CSR storage. The solve uses
incomplete-Cholesky IC(0) preconditioned conjugate gradients. A fixed sequence
of diagonal shifts may stabilize the preconditioner; the physical stiffness
matrix is never shifted. The chosen shift and rejected pivots are recorded.
The recurrence target is 2×10⁻¹²; the final explicitly recomputed relative
residual must meet 10⁻¹⁰. The true residual is recomputed every 100 iterations.

| Hard implementation limit | Value |
|---|---:|
| Represented physical cells/wells | 256 |
| Vertices | 1,800,000 |
| Tetrahedra | 11,000,000 |
| CSR nonzero slots | 60,000,000 |
| Estimated working bytes | 2,100,000,000 |
| PCG iterations | 16,000 |

These are allocation and work limits, not biological capacity or a guarantee
of available browser memory. A conservative preflight runs before constrained
triangulation. Exceeding a budget, overlapping wells, mismatched cell/well
identities, invalid conductivities, unsupported settings, nonfinite values,
degenerate elements or out-of-domain samples produces an error. The solver
does not silently reduce the cohort, enlarge contacts or change material
parameters.

## Membrane sampling and reciprocal recording

Coordinates are in µm, conductivity in S/m and source currents in µA. The
stiffness assembled with these coordinates has numerical units corresponding
to 10⁻⁶ S. Its raw solution for a µA load is therefore volts; public sampled
values are multiplied by 1000 and returned as mV/µA.

Every compartment supplies an explicit `samplingSurface`. A cylinder uses its
own z interval and radius. A soma band uses the sphere's common center/radius
and that compartment's individual z limits. The default surface average uses
12 uniform angular samples and five Gauss–Legendre samples in z. Uniform z
measure is proportional to surface area both for a cylinder and a spherical
band. Each projected source is normalized in the same P1 basis used to sample
potential; no different recording kernel is substituted.

For compartment outer membrane currents in nA and transfer coefficients in
mV/µA, the reciprocal signal is

\[
V_\mathrm{recording}[\mathrm{µV}]
=\sum_k T_k[\mathrm{mV/µA}]\,I_{\mathrm{outer},k}[\mathrm{nA}].
\]

Prepared sampling weights may be reused only with their original field model,
morphology and cell identity. This prevents a cache from applying weights to a
different mesh or geometry.

This coupling uses surface averages for an axial cable model. It does not
resolve circumferential nonlinear membrane polarization. The stimulus field
drives the cable, and its membrane currents are summed through the reciprocal
field for recording. Those currents are not fed back to the neurons as a
self-consistent ephaptic field. The axial soma refinement study is a separate
membrane gate: agreement with a native solver alone does not validate a
one-compartment soma in a spatially varying well field.

## Aperture diagnostics and their interpretation

`solution.diagnostics.apertures` contains a row for every peripheral and central
bore. Each row records its conducting area, length, signed outward current per
unit drive, current through individual mesh cuts, cut-current spread,
area-averaged potential drop, and the measured ΔV/I across the bore. Resistance
is null if the bore current is too small for a meaningful ratio.

In the seeded four-well fixture, the driven well has approximately
+0.101664 µA/µA at its peripheral aperture and −0.101664 µA/µA at its central
aperture. Each default polygonal conducting annulus has area 12.4543 µm² and
length 2.5 µm. The associated signed drops are approximately ±68.0249 mV/µA,
giving a bore resistance of 669.114 kΩ. At 0.1 µA drive this corresponds to
about 10.17 nA and 6.80 mV across a bore in this fixture. These are electrical
model outputs, not operating recommendations.

The reported bore resistance excludes the surrounding access region. The
solved contact-pair voltage includes the cavity, bores, tissue and access field.
Adding a separate analytic access resistor to that solved field would count
the access contribution twice. Likewise, summing absolute currents from both
apertures counts the out-and-back path twice; signed currents and current
closure should be inspected directly.

The isolated analytic access benchmark uses the one-sided disk result
\(R=1/(4\sigma a)\) from
[Hall (1975), *Access resistance of a small circular pore*](https://pmc.ncbi.nlm.nih.gov/articles/PMC2226214/).
That benchmark verifies an ideal half-space problem, not the complete two-pad
well resistance.

## Executed numerical evidence

Acceptance was written before the relevant studies. The
[main field report](field-stage1-validation.json),
[dense adjacent-well report](field-stage1-dense-validation.json) and
[grounded-domain report](field-stage1-domain-validation.json) all passed against
the frozen source hashes above, with no sources changed during the runs.
The compact reports retain exact values and thresholds; the rounded table
below is explanatory.

| Study | Observed result | Predeclared gate |
|---|---:|---:|
| Main field checks | 21/21 passing | Every required check |
| Independent SciPy maximum nodal discrepancy | 5.40×10⁻⁸ µV | 0.001 µV |
| Final true linear residual | 1.97×10⁻¹² | 10⁻¹⁰ |
| Matched source/return imbalance | 1.94×10⁻¹⁶ µA | 10⁻¹² µA |
| Global current closure | 2.69×10⁻¹² µA | 10⁻⁹ µA |
| Seeded four-cell radial/angular/axial transfer refinement | 1.687% / 2.598% / 4.484% | 10% each |
| Explicit-region extension 20→40 µm | 0.2073% | 10% |
| Angular surface quadrature 12→24 | 0.0524% | 1% |
| Axial surface quadrature 5→7 | 0.5320% | 1% |
| Isolated circular annular bore resistance | 4.720% error | 5% |
| Isolated disk access resistance | 5.814% error | 10% |

The independent Python reference reconstructs affine shape gradients by its
own matrix inversion, assembles its own sparse stiffness, independently
integrates the triangle-contact loads and uses a SciPy direct sparse solve.
It does not consume a JavaScript stiffness matrix. The same-mesh discrepancy
checks implementation; the analytic and refinement studies address separate
continuous-discretization questions.

The dense fixture places four neighboring wells on a 35 µm hexagonal spacing.
Every cell's transfer error is gated separately, so small neighboring fields
cannot be hidden by pooling them with the driven cell. All 11 dense checks
pass. The largest per-cell radial, angular and axial changes are 5.360%,
2.479% and 4.795%; the local-region extension changes at most 0.4944%.
Individual aperture-current changes also remain below 10%. Electrical soma
subdivision leaves the physical mesh exactly unchanged; wall/cell interior
samples are rejected and aperture-fluid samples accepted.

The production zero-Dirichlet domain was expanded from radius 1200 to 1800 µm
and half-length 8000 to 12000 µm with the dense local geometry unchanged. The
largest per-cell membrane-transfer change is 0.07931%, and the largest
differential-contact coupling change is 0.003622%. Both meet the unchanged 10%
gate. This bounds finite-domain sensitivity for that fixture; it is not a proof
of an infinite-domain solution or an accuracy guarantee for every user setting.

## Population and resource evidence

The retained [128-well resource measurement](field-stage1-resources-128.json)
is a development measurement on an earlier field revision and one-band soma,
not certification of the final five-band source. It assembled all 128 wells:
713,845 vertices, 3,440,640 tetrahedra and 14,291,693 CSR slots. Assembly,
one-channel solve and all 40,832 membrane transfers took approximately 146.95 s
in total, with measured peak RSS 792,723,456 bytes. No well or cell was dropped.
Its source hash and configuration remain attached to that historical report.

The final full-cohort resource and protocol evidence belongs to
[`stage1-protocol-validation.json`](stage1-protocol-validation.json): 256
physical cells/wells, one isolated channel, the 350 µm fascicle, five soma bands
and all four matched interventions. That executed report passes all 28 checks,
including the small and full cohorts, with no source changes. The full fixture
contains 256 cell/channel pairs and all 1024 intervention solves. Its mesh has
1,409,165 vertices, 6,778,368 tetrahedra and 28,211,861 CSR slots. The solved
true relative residual is 1.9981×10⁻¹² and global current closure is
−5.8212×10⁻¹³ µA. The full protocol, including sampling, membrane interventions
and complete-result export, took 663.709 s and reached peak resident memory
1,861,058,560 bytes (about 1.73 GiB). These are measured Node-process resources;
the field allocation estimate of 955,026,068 bytes does not include the full
protocol's peak usage and is not a browser-memory guarantee. The four-cell
convergence studies and this full-cohort execution establish different parts
of the numerical evidence.

True no-device field construction removes the cells, walls and contacts and
rejects implant drive. Its zero implant-current field is exactly zero. The
identity/population assumptions and any separately labeled viable-stump
diagnostic are owned by the Stage 1 protocol; a vanished contact is never
silently retained as a stimulation fixture.

## Reproduction

Use the [Stage 1 reproduction entry point](STAGE1_REPRODUCTION.md). It rebuilds
the pinned native mechanism, regenerates independent references, executes
all field/membrane/refinement/protocol studies and both integration suites.
The explicit existing-evidence mode performs source and gate verification
without claiming to rerun the measurements. The two large field reference
intermediates are regenerated by the main field validator and are not fixed
repository inputs.
