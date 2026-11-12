# Four-region finite-element field

The field module solves a finite, grounded, four-region cylinder with conforming
linear tetrahedral finite elements. It represents a single straight synthetic
fascicle, a thin perineurial volume, epineurium and surrounding conductive
material. The longitudinal coordinate is `z`; all coordinates are in micrometres.
The endoneurium has a diagonal anisotropic conductivity tensor. Perineurium is
an explicitly meshed resistive shell, with two radial element bands at default
resolution. There is no scalar confinement or attenuation multiplier.

This is an electrical benchmark. It does not model an insulating well wall,
aperture shielding, a metal-electrolyte interface, an organoid, a synapse or a
ganglion replacement. The displayed well geometry is not a boundary condition
in this field problem. Its geometric pitch cannot establish electrical
isolation or individual-cell addressability.

## Equations and units

For an imposed current density, the steady volume-conductor problem is

\[
-\nabla\cdot(\boldsymbol\sigma\nabla\phi)=q.
\]

The potential is continuous at material interfaces. The weak formulation gives
continuity of normal current in the finite-element sense. For tetrahedron
`e`, constant tensor `sigma_e` and affine shape functions `N_i`, assembly uses

\[
K_{ij}^{(e)}=V_e\,\nabla N_i^T\boldsymbol\sigma_e\nabla N_j.
\]

The implementation computes gradients directly from tetrahedral edge vectors.
It assembles a symmetric sparse matrix in compressed-row form. Triangle prisms
are split consistently into three tetrahedra. Material boundaries follow mesh
faces; no tetrahedron is assigned a mixture of adjacent tissue conductivities.
The circular boundaries are polygonal at the declared angular resolution.

Conductivity is in S/m. With coordinates in micrometres, a numerical stiffness
entry represents `1e-6 S`. A right-hand side expressed in microamperes therefore
produces volts. The public solution multiplies by 1000 to return mV. A channel
solve uses a normalized `+1 uA` source and `-1 uA` return, so sampled channel
coefficients have units **mV/uA**. They multiply the instantaneous stimulus in
microamperes to produce extracellular potential in millivolts. No fitted gain,
offset, baseline subtraction or voltage clipping is applied to this solve.

## Declared geometry and material choices

| Parameter | Default | Meaning |
|---|---:|---|
| Fascicle radius | 250 um | Endoneurial cylinder |
| Perineurial thickness | 15 um | Explicit shell from radius 250 to 265 um |
| Epineurial outer radius | 400 um | Surrounding nerve tissue boundary |
| Field outer radius | 1200 um | Grounded cylindrical surface |
| Field half length | 8000 um | Grounded ends at z = -8000 and +8000 um |
| Endoneurial transverse conductivity | 0.083 S/m | x and y tensor components |
| Endoneurial longitudinal conductivity | 0.571 S/m | z tensor component |
| Perineurial conductivity | 1/1149 S/m | Purely ohmic, isotropic effective shell |
| Epineurial conductivity | 0.083 S/m | Isotropic effective value |
| Surrounding conductivity | 0.3 S/m | Isotropic effective value |
| Angular segments | 32 | Polygonal cross-section resolution |
| Radial and axial refinement | 1 | Explicit baseline mesh factors |
| Gaussian source support radius | 75 um | Three standard deviations |

The material values are estimated effective choices for an exploratory model,
informed by the literature collected in [SCIENCE.md](SCIENCE.md). They are not
measurements of the represented synthetic geometry and are not calibrated to a
particular human nerve. Perineurial resistivity is strongly dependent on the
preparation and measurement conditions; the default is an estimate, not a
universal experimental constant. Relevant primary literature is available in
[Pelot et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC7309635/) and the later
[perineurial resistivity study](https://pmc.ncbi.nlm.nih.gov/articles/PMC10426281/).

The default mesh has **21,349 vertices and 120,960 tetrahedra**. It uses
nonuniform axial spacing concentrated near the source and return positions.
The baseline validation places the source at `[355, 0, 0]` um and the return at
`[355, 0, 600]` um. Their physical quadrature supports lie outside the sheath.
The production geometry determines channel coordinates explicitly and passes
them to the same solver. The field is recomputed when its declared geometry or
material parameters change.

The grounded outer boundary and grounded ends are part of the production
problem. A balanced source-return pair has zero net injected current, but local
current can enter and leave the grounded boundary. Near-zero **net** boundary
current does not prove that the boundary has no effect on the field. The
included analytic-boundary benchmark does not establish convergence of this
production zero-potential boundary to an infinite domain.

## Finite source and return

Each electrode is a Gaussian volumetric current distribution with standard
deviation `radius/3`, truncated at a sphere of the declared radius. Five-point
Gauss-Hermite quadrature in each direction is restricted to that sphere. Each
retained physical quadrature point is located in a tetrahedron and projected
onto its four P1 shape functions. The source and return are independently
normalized to exactly matched nominal currents before forming their signed
load vector. The default source retains 33 quadrature points.

This source is a numerical volume source, not a resolved metal contact. The
reported contact area used for charge-density arithmetic is a separate
user-supplied parameter; it does not convert the Gaussian source into a metal
electrode boundary condition. No interface impedance, polarization,
electrochemical dynamics or safety threshold follows from this field solve.

The quadrature occupies a finite physical sphere, but its projected P1 load
touches the vertices of intersected elements. At default resolution each
electrode loads 46 vertices; their bounding span is approximately
`235 x 288.93 x 200 um`. That basis-function footprint is larger than the
150-um physical support diameter. Source radius must therefore not be
interpreted as an achieved spatial resolution or confinement distance.

The implementation rejects sources whose intersected quadrature elements have
a maximum edge longer than the source diameter. The default maximum edge is
135.32 um. This is a necessary resolution check for this declared benchmark,
not sufficient proof of microscale selectivity. The radius is never silently
increased to make an input acceptable. Overlapping source and return supports,
supports touching the ground boundary, nonfinite input, invalid region order,
out-of-domain samples and unresolved sources cause explicit errors.

## Linear solution, budget and diagnostics

After eliminating prescribed Dirichlet values, the solver uses diagonally
preconditioned conjugate gradients. Its nominal relative residual target is
`2e-12`; every 100 iterations it recomputes the true residual. A final true
relative residual above `1e-10`, nonfinite potential, nonpositive curvature or
failure to converge is rejected. The caller cannot relax the solver tolerance.
There is no implicit fallback field.

The public field budget is 50,000 vertices, 280,000 tetrahedra and 16,000 PCG
iterations. Geometry is checked against the declared budget before large
assembly. Refinement choices and unsupported settings are validated explicitly;
the solver does not reduce the requested resolution automatically.

The uneliminated stiffness matrix is retained for current accounting. Reported
diagnostics include the source-return load sum, summed interior residual,
grounded-boundary reaction, their global closure, PCG true residual, mesh size,
material element counts and source resolution. These are algebraic checks on
the discrete equations. They do not by themselves measure continuous-field
error or anatomical accuracy.

## Independent reference and fixed acceptance

[field-acceptance.json](field-acceptance.json) contains thresholds declared
before the numerical studies. The Python implementation independently computes
affine bases by matrix inversion, tetrahedral volumes, local conductance
matrices, sparse assembly, Hermite quadrature and point interpolation. It solves
the free-node system with SciPy's sparse direct solver. It imports geometry,
material tensors and electrode parameters, not the JavaScript matrix or its
factorization. The JavaScript solution is used only for the final comparison.
There is no fitted scaling, coordinate adjustment or offset.

The fresh recovery run in [field-validation.json](field-validation.json) passed
all 12 declared checks. The source hashes and actual runtime are in that
machine-readable report. Representative results are:

| Check | Measured value | Fixed limit |
|---|---:|---:|
| Default true PCG relative residual | 1.797e-12 | 1e-10 |
| Matched source-return current imbalance | 3.437e-16 uA | 1e-12 uA |
| Global current closure | 8.395e-13 uA | 1e-9 uA |
| Zero-current maximum potential | Exactly 0 | Exactly 0 |
| Discrete superposition relative error | 2.237e-13 | 1e-9 |
| Discrete reciprocity relative error | 2.914e-13 | 1e-9 |
| Independent Python maximum nodal error | 4.567e-9 uV | 0.001 uV |
| Homogeneous analytic relative RMS error | 4.740% | 12% |
| Layered radial analytic relative RMS error | 2.412% | 3% |
| Radial refinement relative RMS change | 2.448% | 10% |
| Angular refinement relative RMS change | 1.132% | 10% |
| Axial refinement relative RMS change | 2.003% | 10% |

The homogeneous benchmark compares with the exact infinite homogeneous
point-source Green function outside the finite sources. It imposes that exact
analytic potential on the finite-domain boundary and excludes samples inside
the source supports. It tests finite-element discretization with specified
analytic boundary data, not equivalence of the production grounded boundary
to infinity. The finite source and point-source reference are distinct source
models, so the benchmark includes that approximation outside the source.

The layered radial benchmark imposes exact inner, outer and axial-end
potentials for radial conduction in concentric layers. Its radial resistance
is the sum of `log(r_outer/r_inner)/sigma_r` over traversed layers. It checks the
explicit thin shell and conductivity interfaces independently of the electrode
case. It does not validate a microscopic well aperture.

Refinement doubles each resolution direction separately, keeps the physical
source distribution fixed and compares 32 declared interior samples. It is a
starting field-discretization gate. Passing it does not establish a 10% bound
for every point, stimulus threshold, cable response or alternative geometry.
The membrane solver and coupled field-to-membrane comparisons have their own
declared studies and acceptance criteria.

### Retained failure and correction

The initial radial-refinement comparison failed: **19.5835%** exceeded the
unchanged 10% gate. Lumped nodal-volume integration biased the Gaussian source
toward coarse surrounding cells. The correction integrated the physical source
at fixed Gauss-Hermite points and projected it with P1 basis functions; the
declared surrounding mesh gained a radial boundary at 500 um. The corrected
radial change is 2.4476%. The threshold was not relaxed.

The original failure is preserved in [field-history.jsonl](field-history.jsonl).
After the execution environment reset, its original file bytes were lost; the
recovered record is explicitly marked as transcribed from retained conversation
output with an unknown original timestamp. The current field report was
generated by a new execution of the recovered, hash-identical field source.
Historical measurements are not substituted for current verification.

## Perineurium sensitivity

For the fixed benchmark channel, changing only perineurial conductivity by
factors of 0.1, 1 and 10 gives the following transfer values:

| Conductivity multiplier | At `[0,0,0]`, mV/uA | At `[220,0,0]`, mV/uA |
|---|---:|---:|
| 0.1 | 0.00680382 | 0.03225565 |
| 1 | 0.04658768 | 0.27227804 |
| 10 | 0.14098193 | 1.26171951 |

This verifies that the explicit shell parameter affects the computed field. It
is a sensitivity study, not a measured biological dose-response relationship
or a calibration of an implant. The report retains all four sampled
source-side and return-side values.

## Sampling and reciprocal recording

P1 interpolation is used for stimulation samples and recording weights. The
same channel field is sampled at every membrane compartment location. With
transfer coefficient `T_i` in mV/uA and current `I_i` in nA, the channel voltage
is `sum(T_i * I_i) / 1000` in mV, equivalently `sum(T_i * I_i)` in uV. These
weights represent a source-minus-return differential recording with the same
finite current distributions used for stimulation.

The cable interface supplies currents entering the outer volume conductor;
that is distinct from simply summing every internal membrane branch current.
The MRG methods and native coupled reference document that interface.
Contributions from separate compartments and classes add at each time sample.
Peak-to-peak amplitudes of different source classes generally do not add,
because extrema can occur at different times.

## Reproduction

The combined entry point in [REPRODUCTION.md](REPRODUCTION.md) is recommended.
To reproduce only the field studies in a pinned environment:

```bash
python3 -m venv .venv-axon-field
.venv-axon-field/bin/python -m pip install -r scripts/axon-interface/field-requirements.txt
AXON_REFERENCE_PYTHON=.venv-axon-field/bin/python node scripts/axon-interface/field-validate.mjs
```

The recovered field run used Node 24.22.1, Python 3.12.14, NumPy 2.3.5 and
SciPy 1.17.0. The report records its actual runtime and hashes of the solver,
independent reference, validation script and acceptance file. New failing
measurements are appended to the failure history. Exact reproduction of a
particular report requires its recorded source revision and declared inputs.

## Scope that remains unverified

This field model has one straight synthetic fascicle, constant conductivity in
each region, a resistive perineurium and ideal volumetric electrodes. It omits
capacitive dispersion, measured subject anatomy, conductivity uncertainty
distributions, inhomogeneous connective tissue, insulating wells and aperture
geometry, electrode impedance and electrochemical behavior. The finite-domain
boundary has not been demonstrated to approximate infinity for all production
configurations. Numerical agreement does not establish neural selectivity,
host identity preservation, ganglion replacement, reinnervation, device safety
or clinical performance.
