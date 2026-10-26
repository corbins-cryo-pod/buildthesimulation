# Reduced PRIMA photovoltaic physics

## Purpose and model boundary

This calculation studies how patterned optical drive, photovoltaic circuits,
electrode charging, a shared return, and extracellular conduction interact.
It is a **reduced research model**, not a manufacturer's calibrated PRIMA
model. It does not calculate a patient percept, membrane voltage, spikes,
temperature, laser exposure compliance, or electrochemical safety. The
separate ProViSim calculation is not driven by this solver's field output.

Published PRIMA architecture motivates the circuit topology: two series
photodiodes per pixel, active electrodes, a connected return mesh, shunt
discharge, and capacitive electrode interfaces [1–4]. The mathematical
surface basis and the lumped return-interface approximation below are choices
of this implementation, not an assertion that the manufacturer uses them.

Model identifier: `prima-reduced-halfspace-circuit-1.0.0`.

## Reconstructed geometry

The human device is reported as approximately 2 × 2 mm, 30 µm thick, with
378 nominally 100 µm hexagonal pixels [1]. An exact manufacturing mask was
not obtained. The software constructs a centered hexagonal lattice with
100 µm nearest-neighbor spacing, then selects 189 inversion pairs inside
the 2 mm footprint. A rounded ordering key makes the clipping deterministic
across numerical runtimes. All 378 cells remain complete.

The resulting reconstruction contains 1,205 distinct hexagon-edge segments.
Its outer clipping, peripheral margin, equivalent circular active electrodes,
and unresolved photodiode layout must not be interpreted as manufacturing CAD.
The nominal thickness is used in the scene; the electrical domain is a
half-space and does not solve through a 30 µm silicon substrate.

The area of a hexagonal cell with across-flats width `p` is

```text
Acell = sqrt(3) p² / 2
Aactive = pi ractive²
Areturn,total = unique mesh length × assumed return width
Aphoto,one diode = (Acell - Aactive - Areturn,total/N) / 2
```

The return area counts shared edges once. Junction overlaps, insulation gaps,
metal interconnect shading, and photodiode fabrication dead area are omitted.
Both series photodiodes receive the same mean pixel illumination. Unequal
illumination of the two junctions is not resolved.

## Optical input

The input `illumination[i]` is a number between zero and one. Within each
global optical pulse, it multiplies the specified irradiance at the implant
plane. This is continuous **irradiance encoding** of gray levels; it is not a
reconstruction of commercial pixelwise DMD pulse-width modulation. Binary
patterns correspond directly to on/off illumination in this representation.

For one photosensitive junction,

```text
Iphoto,i = responsivity × Hpeak × illumination[i] × Aphoto,one diode
```

When `Hpeak` is in mW/mm² and area is in µm², multiplication by `1e-9`
converts their product to watts. Responsivity is in A/W and gives amperes.
The two series junctions add voltage capability; their photocurrents are not
added. Wavelength is the published 880 nm carrier, while a user-selected
responsivity represents conversion efficiency at that wavelength.

Illumination is prescribed independently of the electrical circuit: optical
transmission, reflections, scattering, diffraction, and eye tracking are not
calculated. The reported power over reconstructed cells differs from the
separate optical-image calculation over the whole 4 mm² square footprint.

## Conductive half-space and regularized source basis

The tissue occupies `z >= 0` and has uniform isotropic conductivity `sigma`.
Potential tends to zero at infinity. In the tissue,

```text
div(sigma grad(phi)) = 0
E = -grad(phi)
J = sigma E
```

At the surface, each normalized source basis has the Poisson flux profile

```text
b_a(r) = a / [2 pi (r² + a²)^(3/2)]
integral over the plane of b_a dA = 1
```

For current `I` in this basis, the exact half-space potential is

```text
phi(r,z) = I / [2 pi sigma sqrt(r² + (z+a)²)]
```

The positive length `a` is a numerical source width, not an electrode depth or
tissue gap. This profile has noncompact tails. It approximates a finite
electrode injecting through an otherwise insulating plane, but does not impose
strict zero current outside a bounded metal surface. It therefore does not
reproduce exact contact-edge singularities or finite-chip boundary conditions.

The circular active contact uses `a = ractive/pi`. Its self Galerkin resistance
then matches the spreading resistance `1/(4 sigma ractive)` of an
equipotential circular disk. Matching this one resistance does not establish
equivalence of the complete spatial field.

Each hexagonal return perimeter uses composite midpoint quadrature with
**16 sites per side**. A return site has source width equal to half the assumed
return width. Adjacent cells share edge locations. Overlapping basis
contributions are added, so a physical shared edge can collect current from
both neighboring return coefficients. Refinement to 32 sites per side is
reported in the numerical reference.

### Reciprocal resistance matrix

Testing the potential of source basis `a_j` against basis `a_i` gives

```text
Rij = 1 / [2 pi sigma sqrt(|ri-rj|² + (ai+aj)²)]
```

This result follows from convolution of the Poisson surface kernels. In
spatial-frequency coordinates their factors are `exp(-a |k|)`, so source and
test widths add. The resulting Galerkin matrix is symmetric. Its energy is
nonnegative because its spectral quadratic form is proportional to the
integral of the squared combined source amplitude with a positive kernel.
The implemented return-ring bases are weighted sums of these elementary
bases and retain that reciprocity/passivity structure.

The matrix partitions into active and return blocks:

```text
[phiA] = [RAA RAR] [iA]
[phiR]   [RRA RRR] [iR]
```

The shared return imposes the same **basis-averaged electrolyte potential**
at all return ports, together with `sum(iA) + sum(iR) = 0`. The reference
implementation directly solves

```text
[ RRR  -1 ] [iR] = [-RRA iA]
[ 1^T   0 ] [uR]   [-sum(iA)]
```

The browser uses an equivalent Schur reduction. This produces a return map
`iR = W iA` and a reciprocal effective port impedance

```text
phiA - uR 1 = Z iA
```

Each column of `W` sums to -1. Return current is distributed through the
connected mesh; it is not required to cancel its immediately adjacent active
electrode. Dark active electrodes may also carry current through their shunts.
The implementation checks positive definiteness of `Z` before integration.

## Electrode interfaces and photovoltaic circuit

Each active electrode has one constant capacitance `Ca`. The entire connected
return mesh has **one lumped capacitance `Cr`**. This is a substantial reduction:
spatially varying return-interface polarization and local electrochemistry
are not represented. Both capacitances are calculated from their estimated
area and the same assumed capacitance density.

Let `q_i` be active interfacial charge, positive when the active electrode has
injected positive current into the tissue. The return charge is
`qR = -sum(q_i)`, preserving total interface charge for an initially discharged
array. The differential voltage across the two series diodes is

```text
v_i = (Z i)_i + q_i/Ca + sum(q)/Cr
```

The sign of the return term follows from subtracting the negatively charged
return interface. The current law is

```text
i_i = Iphoto,i - Is [exp(v_i / (2 n VT)) - 1] - v_i/Rsh
dq_i/dt = i_i
VT = kB T / e
```

`n` is the assumed diode ideality and `T=310 K`. Reverse breakdown, series
diode resistance, voltage-dependent capacitance, and Faradaic reaction
currents are omitted. The diode and shunt currents are internal branches;
only `i_i` is delivered to the tissue. A fixed ideal current pulse is never
substituted for this nonlinear solution.

## Time integration and field snapshots

Backward Euler solves the new charge and current simultaneously:

```text
qnew = qold + h inew
vnew = (Z + h S) inew + S qold
S = identity/Ca + ones/Cr
```

The browser applies nonlinear Gauss-Seidel with a bracketed scalar Newton
solve for each monotone diode equation. Every accepted network solution must
have maximum Kirchhoff-current-law residual no larger than **0.2 pA**. Failure
to converge raises an error instead of returning a partially converged image.
The independent Python reference uses global Newton steps with Cholesky solves.

Optical on and off segments are integrated separately. Each segment is divided
into equal steps no longer than the requested time step. The on segment has
an even number of steps so its midpoint is evaluated exactly. Pulse boundaries
include both the preceding and following current values at the same time;
charge stays continuous while current may jump. The default maximum step is
**0.05 ms**. The reported actual on/off steps can be slightly smaller.

The field map is an instantaneous snapshot at the **midpoint of the final
optical pulse**. Signed potentials and field derivatives are evaluated from
the solved active and return currents. Differentiating the same potential
basis gives all field components; independent finite-difference and
Hankel-transform checks test signs and units.

The bipolar-cell driving surrogate is

```text
Delta phiBC(x,y) = phi(x,y,gap) - phi(x,y,gap + bipolarLength)
```

Both depths are user-selected observation locations in the same homogeneous
medium. This is an extracellular potential difference, not membrane voltage,
an activation probability, a ganglion-cell response, or an acuity prediction.
The sign convention is explicitly the lower plane minus the upper plane.

The map uses 31, 61, or 81 points per side. Its displayed peaks are sampled
peaks, not continuous extrema. Pixel-center observations are evaluated at the
actual reconstructed centers rather than at the nearest image-grid point.

## Charge, current, and power metrics

- `snapshotCurrentUa`: signed active current at the named field time.
- `returnCurrentUa`: signed coefficient of that cell's return-perimeter basis.
- `peakCurrentUa`: maximum absolute active current over the calculated train.
- `phaseChargeNc`: signed active charge change over the final optical-on phase.
- `residualChargeNc`: active charge remaining at the end of the complete train.
- `polarizationMv`: active interfacial charge divided by active capacitance.
- `voltageV`: voltage across the series photodiodes relative to the return metal.
- `currentBalanceUa`: sum of active and return currents at the snapshot.
- `averageIncidentPowerMw`: illumination-weighted incident power over the
  reconstructed cells, multiplied by optical duty cycle.

Finite-window residual charge is retained. A zero net array current does not
mean every electrode is discharged. Active and return interface charges sum
to zero while individually remaining nonzero. No estimated safety threshold
is applied to these quantities. Incident optical power is not converted into
temperature or absorbed heat.

## Parameter provenance and exploration bounds

| Parameter | Default | Interpretation |
|---|---:|---|
| Pixel count / nominal width / footprint | 378 / 100 µm / 2 mm | Published human-device dimensions [1] |
| Series photodiodes | 2 | Published architecture [1–3] |
| Carrier wavelength | 880 nm | Published optical carrier [1] |
| Irradiance / pulse duration / frame rate | 3.5 mW/mm² / 5.6 ms / 30 Hz | Illustrative schedule within the kinds of schedules described clinically [5] |
| Active equivalent radius | 15 µm | Exploratory equivalent contact, not verified manufacturing CAD |
| Return width | 4 µm | Exploratory geometry assumption |
| Conductivity | 0.2 S/m | Homogeneous tissue assumption |
| Interface capacitance density | 20 F/m² | Constant-capacitance approximation; not a measured commercial specification |
| Shunt resistance | 1 MΩ | Exploratory circuit assumption |
| Responsivity | 0.5 A/W | Exploratory junction responsivity |
| Diode ideality / saturation current | 1.5 / 0.001 nA | Assumed two-diode model parameters |
| Temperature | 310 K | Fixed circuit temperature; no thermal simulation |
| Lower observation depth / cell extent | 35 µm / 50 µm | Exploratory anatomical observation dimensions |
| Train length / requested step | 3 periods / 0.05 ms | Numerical experiment settings |

Parameter controls are bounded to keep numerical experiments interpretable and
finite, not to define manufacturer-approved operating conditions. A run cannot
exceed 12,000 integration steps. Changing the uncertain parameters can change
predictions substantially even when numerical residuals are small.

## Independent reference and convergence

`scripts/prima-reference/physics_reference.py` uses pinned NumPy 1.26.4 and
SciPy 1.13.1. It constructs geometry and transfer matrices independently,
solves the augmented shared-return system directly, and uses global Newton
instead of the browser's coordinate updates. Its adaptive DOP853 solution
provides an independent temporal reference for four seven-pixel networks.
A separate complete 378-pixel experiment checks the full implementation.

The fixture also includes six Hankel-integral Green-function checks, current
redistribution, port passivity, charge recovery, derivatives, and separate
time-step and return-basis refinement. The retained output is rounded to ten
significant digits. Reference source, pinned dependencies, fixture provenance,
and the numerical report are retained. Adaptive solutions can still differ in
their final digits across NumPy CPU instruction paths; the narrow verification
allowances below handle that variation without replacing the retained evidence.

For late currents near zero, a relative error divided by that tiny value can
be misleading. The report therefore records absolute current error and both
the instantaneous-current and photocurrent denominators. Implementation
agreement is tested using a declared physical current scale and explicit KCL
residuals. It is not made to appear exact by changing the scientific model.

See `PHYSICS_VALIDATION.json` for the measured refinement results and fixture
checksum. These tests verify the stated equations and reconstruction. They do
not validate a commercial implant, retinal tissue parameters, cell activation,
or patient outcomes. In particular, increasing the return quadrature order
does not remove the regularized-source and lumped-interface model assumptions.

### Portable verification of the retained reference

The default NumPy execution path reproduces the retained fixture and report
byte-for-byte in the development environment. Disabling AVX2, FMA3 and AVX512F
in pinned NumPy 1.26.4 changes 40 numerical leaves, all in the low-capacitance
seven-pixel adaptive solution and its derived temporal-error summaries. The
largest observed current change is 4.2675 × 10⁻¹⁶ A, voltage change is
6.05 × 10⁻¹² V, and light-phase charge change is approximately 10⁻¹⁹ C.
The full-array circuit, fields, Green integrals, return matrices, spatial
refinement and other three small-network cases remain identical in that check.

`--check` therefore compares only the explicitly named adaptive quantities and
the derived `convergence.time` error fields with these **absolute** allowances;
the relative tolerance is zero:

| Quantity | Absolute allowance |
|---|---:|
| Adaptive current | 10⁻¹⁵ A (0.001 pA) |
| Adaptive voltage | 10⁻¹¹ V |
| Adaptive instantaneous, phase and final charge | 10⁻¹⁸ C |
| Temporal phase-charge error divided by reference peak charge | 10⁻¹¹ |
| Temporal absolute snapshot-current error and reference peak current | 10⁻⁹ µA |
| Temporal current error divided by peak photocurrent | 10⁻⁹ |
| Temporal current error divided by peak snapshot current | 10⁻⁶ |

The last ratio is especially sensitive when the reference late current is
near zero; its allowance applies to the reported ratio, not to a physical
current. These are portability allowances for independent reference
regeneration. They do not change the JavaScript solver's comparison gates or
its 0.2 pA Kirchhoff residual requirement.

Object keys, array dimensions, provenance, numerical settings and all
non-adaptive solver data remain exact. Nonfinite values are rejected. Each
report must exactly summarize its own fixture and its `fixtureSha256` must
match that fixture's actual bytes. The retained report continues to identify
the retained fixture; a regenerated digest may differ only after the named
numerical comparisons pass. `--check` never overwrites either retained file.
Focused positive and negative tests exercise the measured CPU variant,
out-of-bound drift, exact-field changes, malformed structures and corrupted
metadata or checksums.

### Reproduce

```bash
python -m pip install -r scripts/prima-reference/requirements.txt
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python scripts/prima-reference/physics_reference.py --check
python -m unittest discover -s scripts/prima-reference -p 'test_physics_reference.py' -v
node tests/prima-physics.test.mjs
```

## Primary sources

1. Palanker et al. (2022), *Simultaneous perception of prosthetic and natural
   vision in AMD patients*. [DOI 10.1038/s41467-022-28125-x](https://doi.org/10.1038/s41467-022-28125-x).
2. Boinagrov et al. (2016; online 2015), *Photovoltaic Pixels for Neural
   Stimulation: Circuit Models and Performance*.
   [DOI 10.1109/TBCAS.2014.2376528](https://doi.org/10.1109/TBCAS.2014.2376528).
3. Chen et al. (2022), *Photovoltaic implant simulator reveals resolution limits
   in subretinal prosthesis*. [DOI 10.1088/1741-2552/ac8ed8](https://doi.org/10.1088/1741-2552/ac8ed8).
4. Jensen et al. (2026), *Maximizing the fidelity of a photovoltaic subretinal
   prosthesis for human patients*. [DOI 10.1088/1741-2552/ae6d77](https://doi.org/10.1088/1741-2552/ae6d77).
5. Holz et al. (online 2025; print 2026), *Subretinal Photovoltaic Implant to
   Restore Vision in Geographic Atrophy Due to AMD*.
   [DOI 10.1056/NEJMoa2501396](https://doi.org/10.1056/NEJMoa2501396).
