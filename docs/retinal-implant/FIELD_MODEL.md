# Retinal Implant Laboratory — finite-contact electrical model

## Scope

`src/lib/retinal-implant/field.mjs` computes extracellular potential, electric
field and bulk current density from finite, parallel, circular source and return
contacts. Each disk is a sheet with **prescribed uniform current density** in an
infinite, homogeneous, isotropic conductor. The numerical implementation is
verified against a separately implemented reference. Those checks establish
agreement with this mathematical model, not a particular retina or implant.

The electrical field is not converted into membrane voltage, spikes, visual
acuity, a phosphene or a safety score. The published percept model is a separate
calculation with its own fitted parameters. Retinal layers, nerve-fiber
anisotropy, the insulating implant substrate, electrode polarization and
time-dependent interface current distributions are outside the electrical model.

## Units, reference and signs

Inputs use micrometers, microamps and S/m; the engine converts to SI internally.
Potential is relative to infinity and is returned in mV. Electric field is in
V/m; bulk current density is in A/m². Positive source current injects into the
conductor. The laboratory’s cathodic snapshot therefore uses negative stimulating
currents and positive return currents.

The retinal observation plane is `z = 0`. Contacts lie parallel to it at the
selected positive gap. A positive source above this plane has negative axial E
directly below it. Reversing current reverses potential and every E component.
For prescribed currents, doubling conductivity halves potential and E while
leaving J unchanged. The initial 0.2 S/m conductivity is an adjustable
demonstration assumption, not a patient-specific measurement or fit.

The reported bulk current density at a point, `J = sigma E`, is distinct from
the source-sheet injection density `I / contact area`. Extracellular potential
is also distinct from a transmembrane potential or electrode polarization.

## Governing calculation

For disk `i`, area `A_i = pi a_i²`, signed total current `I_i`, and observation
point `r`, the full-space current-source Green function gives

\[
\phi(\mathbf r)=\sum_i \frac{I_i}{4\pi\sigma A_i}
\int_{D_i}\frac{dA'}{|\mathbf r-\mathbf r'|}.
\]

Differentiating its kernel analytically gives

\[
\mathbf E(\mathbf r)=\sum_i \frac{I_i}{4\pi\sigma A_i}
\int_{D_i}\frac{\mathbf r-\mathbf r'}{|\mathbf r-\mathbf r'|^3}\,dA',
\qquad \mathbf J=\sigma\mathbf E.
\]

The conductor extends on both sides of each source sheet. This is not an
equipotential metal disk. It is also not a disk mounted on an insulating planar
boundary: the uniform-source half-space expression has twice the full-space
potential. Changing that factor alone would not supply retinal layers or the
complete implant boundary conditions.

### Exact on-axis solution

For one disk of radius `a`, current `I` and unsigned axial separation `h > 0`,

\[
\phi(h)=\frac{I}{2\pi\sigma a^2}\left(\sqrt{a^2+h^2}-h\right)
=\frac{I}{2\pi\sigma\left(\sqrt{a^2+h^2}+h\right)}.
\]

The latter form avoids far-field subtractive cancellation. For signed axial
offset `z` from the source plane,

\[
E_z=\frac{\operatorname{sgn}(z)I}
{2\pi\sigma\sqrt{a^2+z^2}\left(\sqrt{a^2+z^2}+|z|\right)}.
\]

For an isolated +80 µA source with radius 100 µm, gap 100 µm and conductivity
0.2 S/m, these expressions give **+263.6965437895 mV** and
**−1864.6161428903 V/m** below the disk. A finite return changes the total, so
these isolated-source values must not be labeled the complete array response.

At large distance, a single disk approaches `I / (4 pi sigma distance)`.
A balanced finite source/return pair has a leading dipole far field. Tests check
both limiting scalings.

## Returns and time interpretation

Every explicit return is evaluated with the same finite-disk kernel and the
opposite signed current. `requireBalanced: true` rejects an unbalanced source
set. The arithmetic tolerance is `max(1e-9 µA, 1e-11 × sum(abs(currents)))`.
If balance is not required, the API explicitly describes residual return as
being at infinity. The laboratory requests balance and includes its finite
return even when it lies outside the displayed field of view.

Instantaneous current balance and time-integrated charge balance are different
checks. The pulse scheduler determines which complete cathodic-first biphasic
pairs fit the finite train. The electrical map is one stated cathodic snapshot,
not an average and not a simultaneous combination of all interleaved channels.

For a phase lasting `t` milliseconds at `I` microamps, `|I|t` is charge in nC.
Geometric charge density is charge divided by disk area. An ideal symmetric
biphasic pulse has zero net charge; this arithmetic property does not establish
electrode-interface reversibility or safe operation.

## Numerical implementation

The source integral uses Gauss–Legendre radial quadrature and periodic azimuthal
quadrature. The normalized radial source weights are `2 u w / N_theta`; they
sum to one. The default is 32 radial nodes and 128 angular nodes. For
gap/radius below 0.1, radial order increases to at least
`ceil(3.2 / (gap/radius))`, with four times as many angular nodes. Ratios below
0.025 and active source-plane observations are rejected. The UI stimulating
range of radius 50–250 µm and gap 25–1000 µm stays at or above ratio 0.1.

Circular symmetry supports a reusable radial table for each normalized height
and quadrature order. Potential uses cubic Hermite interpolation whose nodal
slopes are the negative radial field. The radial E is then the negative
derivative of **that same potential interpolant**. Axial E uses Hermite
interpolation with an independently differentiated radial slope. The normalized
base knot interval is 0.015 radius, reduced at small gaps and increased in the
far field. Reference checks separately assess this interpolated path.

For repeated observation geometry, the engine stores four transfer coefficients
per source/point and sums them using the current and conductivity. Exact
coordinates, source radius, source position and numerical settings are part of
cache identity. Point coordinates are compared, so mutating an existing array
cannot silently reuse stale coefficients. The transfer cache is bounded to
128 MiB and four observation sets; radial tables are separately limited to 32
geometries. An oversized transfer set recomputes evicted data without changing
resolution.

## Independent reference and fresh recovery results

`scripts/retinal-reference/field_reference.py` integrates the angular coordinate
analytically with complete elliptic integrals K and E, then uses adaptive radial
quadrature. It does not call the JavaScript source quadrature or interpolation.
For normalized radius `rho`, source radius coordinate `u`, and positive height
`h`, define `A = (rho+u)²+h²`, `D = (rho-u)²+h²`, and `m = 4 rho u / A`.
The angular potential kernel is `4 K(m) / sqrt(A)`; the angular axial field
kernel is `4 h E(m) / (D sqrt(A))`. SciPy uses parameter `m = k²`, not modulus
`k`. Radial integration is split at the closest source radius when useful; an
axis series avoids cancellation near `rho = 0`.

The regenerated fixture contains **69 cases** including low gaps, near-rim and
far-field locations, rotated physical coordinates, different radii and
conductivities, multiple stimulating contacts and finite return configurations.
The fresh recovered implementation produced these measured maximum errors:

| Evaluation | Relative potential error | Relative vector-field error |
| --- | ---: | ---: |
| Direct source quadrature | 4.6307 × 10⁻⁸ | 5.4136 × 10⁻⁶ |
| Cached Hermite path | 4.4721 × 10⁻⁸ | 9.6498 × 10⁻⁶ |

The vector measure is Euclidean field error divided by reference vector norm.
Tests include absolute tolerances near zeros. These are measured maxima over
the fixture, not mathematical error bounds for all possible inputs.

The additional **28-row** convergence sweep covers seven gap/radius ratios from
0.1 to 4, with 64 radial observation locations and two angular alignments per
row. Maximum errors over that sweep were:

| Radial × angular nodes | Potential | Vector field |
| --- | ---: | ---: |
| 16 × 64 | 5.2815 × 10⁻⁵ | 3.1234 × 10⁻³ |
| 24 × 96 | 1.4773 × 10⁻⁶ | 1.3005 × 10⁻⁴ |
| 32 × 128 | 4.6307 × 10⁻⁸ | 5.4136 × 10⁻⁶ |
| 48 × 192 | 5.3714 × 10⁻¹¹ | 9.3810 × 10⁻⁹ |

Nine JavaScript tests and nine Python tests pass after recovery under the pinned
Python 3.12.14 / NumPy 2.5.4 / SciPy 1.18.1 reference environment. Besides the
fixture comparisons, checks cover signs and units, conductivity scaling,
superposition, exact current balance, potential gradients, far-field decay,
cache invalidation, singular input rejection, and closed-sphere flux. The latter
recovers the specified source current and zero net flux for a balanced pair.

### Host performance

`FIELD_NUMERICAL_REPORT.json` contains exact observed values and the reproduction
script. On the recovery host, a 60-contact plus return, 61² grid took about
101 ms cold and 7.2 ms on repeat. Its 241² grid took 1.00 s cold and 35 ms on
repeat. A 256-stimulating-contact plus eight-return 241² stress case took
2.58 s cold and 2.40 s on repeat because the full transfer set exceeds the
128 MiB cache. All 58,081 grid points remained present and repeated outputs
were bit-for-bit identical. These are descriptive host measurements, not a
promise of real-time performance on another browser or device.

## Observation-grid sampling remains separate

Accurate evaluation at a sample point does not ensure that a coarse map captures
a narrow local maximum. For an isolated 50 µm-radius source at `(250,250,25) µm`,
the exact on-axis field magnitude is 14,076.59 V/m. A 61² grid over ±5000 µm
samples only 2,326.91 V/m, about **16.5%** of that value, because the contact
falls between grid points.

Consequently, grid extrema are labeled **sampled peaks**. Contact-site probes
are calculated at the actual contact centers, separately from the displayed
grid. A selected-contact region and 121/241 grids permit local inspection.
Refining a particular aligned grid does not establish convergence for all
possible contact positions. A field map is not a neural activation map.

## Reproduce

```sh
node tests/retinal-field.mjs
python -W error scripts/retinal-reference/field_reference.py
python -W error -m unittest discover -s scripts/retinal-reference -p 'test_field_reference.py' -v
python -W error scripts/retinal-reference/field_convergence.py
node scripts/retinal-reference/field_benchmark.mjs
```

Python needs NumPy and SciPy; the shared pinned requirements file supplies them.
The checked-in fixture records the Python major/minor series (`3.12`) and the
exact NumPy/SciPy versions. Python maintenance-release numbers are excluded from
that deterministic fixture metadata; the numerical values and comparison
tolerances are unchanged. Regenerate with the shared pinned requirements so the
recorded numerical-library versions match those actually used.
Reference data are independently regenerated rather than copied from the
implementation being tested. Execution times can vary while numerical fixture
values remain reproducible within the specified numerical environment.

## Primary-source context

[Esler et al. (2018), *Minimizing activation of overlying axons with epiretinal
stimulation: The role of fiber orientation and electrode configuration*,
doi:10.1371/journal.pone.0193598](https://doi.org/10.1371/journal.pone.0193598)
develops a four-layer anisotropic retinal volume-conductor and neural model.
It provides a concrete precedent for the additional tissue and neural physics
needed before making cell-activation claims. The present homogeneous field
calculation does not reproduce that layered model or inherit its biological
results. A future extension must specify and independently validate those
boundary conditions, conductivity tensors and neural coupling.
