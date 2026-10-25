## Scientific scope

This laboratory connects editable electrode geometry and an exact pulse schedule
to **two distinct calculations**: a finite-contact electrical field and a published
phenomenological percept model. Position and delivered current are shared inputs.
An electric-field magnitude is not converted into a phosphene through an invented
activation threshold.

The implementation supports a pinned Argus-II reference geometry, custom regular
and hexagonal arrays, both eyes, position, rotation, contact spacing and diameter,
retinal gap, finite returns, disabled contacts, scene encoding, current budgets,
and simultaneous or interleaved delivery. Seven examples isolate different
assumptions. Pin one experiment before changing a parameter for a controlled
comparison.

The percept model represents human epiretinal stimulation phenomenologically.
The electrical model is an infinite homogeneous isotropic conductor. Retinal
layers, anisotropy, implant insulation, electrode polarization, membrane voltage,
spikes, synaptic processing, degeneration and learning are not solved. Outputs
are not patient-specific predictions, visual acuity, recognition scores or
electrochemical safety determinations. Subretinal photovoltaic and suprachoroidal
devices require different models.

The 3D retina supplies anatomical context. Its curvature is a display assumption;
electrical calculations use the explicitly labeled tangent plane. The fibers
are population-average reference trajectories, not a measured individual retina.

## Published percept models

The browser reproduces **pulse2percept 0.11.0**, including the circular spatial
model, the Beyeler axon map, and the Granley–Beyeler representative biphasic model.
The latter has a matched pulse-scaled circular comparison. Unmodified Python
reference code generates the anatomy and independent golden outputs. The
browser uses JavaScript and static local assets, with no remote scientific service.

For a candidate soma `s`, its soma-to-disc path `A(s)`, electrode position `e`,
and along-path distance `dA(s,p)`, the spatial response is:

```text
P(s) = max over p in A(s) of
       sum over electrodes e [ a_e × exp(−|p−e|²/(2ρ²) − dA(s,p)²/(2λ²)) ]
```

The electrode contributions must be **summed at each path point before the
maximum is selected**. Adding individually calculated single-electrode percepts
would produce a different model. The circular model uses Gaussian spatial spread
without the axonal path-distance term. [Beyeler et al., 2019](https://doi.org/10.1038/s41598-019-45416-4).

The effective spatial spread `ρ` and axonal spread `λ` are in micrometers. They
are adjustable percept parameters, which require percept measurements for
patient-specific fitting. Electrode height, diameter and conductivity do not
appear in these equations. Those physical inputs therefore change the electrical
solution without silently changing fitted percept parameters.

### Pulse-dependent representative image

For amplitude `a` in multiples of the supplied detection threshold, phase
duration `t` in milliseconds and frequency `f` in hertz, the pinned package uses:

```text
a_corrected = a × (0.054326 + 2.095t)
brightness factor = 0.1492147 × a_corrected + 0.0163851f
size factor       = max(1.0812 × a_corrected − 0.35338, 10²/ρ²)
streak factor     = max(1.56 − 0.54 × t^0.21, 10²/λ²)
```

The amplitude drive becomes the brightness factor, and the spatial and axonal
variances become `ρ² × size factor` and `λ² × streak factor`. These coefficients
reproduce the package's documented **Argus-II phase-duration threshold refit**;
they are not presented as the unchanged coefficients from the original paper.
[Granley & Beyeler, 2021](https://doi.org/10.1109/EMBC46164.2021.9629663).

The threshold anchor is the **50%-detection current at 0.45 ms phase duration and
the selected train frequency**. This interface supplies an assumed common
threshold. Changing frequency does not create a new measured calibration. The
brightness expression is not a detection probability, and no hard threshold gate
has been added.

This is a representative pulse-train image, not a time-resolved movie. There is
no modeled adaptation, interphase-gap effect or pulse-by-pulse dynamics. The
pulse-dependent model requires simultaneous zero-delay trains and rejects
interleaved delivery. A spatial model may compare interleaved electrode
amplitudes only under an explicitly timing-independent assumption.

### Anatomy, coordinates and geometry

The reference generates 1,000 Jansonius trajectories with 500 radial samples
each. After unused paths are removed, 638 bundles and 123,122 path segments per
eye remain. Both eyes retain their actual native coordinates and closest-path
assignments. Display paths are thinned separately and are never solver input.
The model uses minimum axonal sensitivity `1e-3`, minimum current spread `1e-8`,
zero percept threshold and explicit `meridian_blend=0`.
[Jansonius et al., 2009](https://doi.org/10.1016/j.visres.2009.04.029).

Watson's fitted coordinate transforms preserve x sign and invert y sign in the
pinned package's retinal basis. The physical plan has x increasing rightward
and y upward; percept image row zero is the superior visual field at +15°.
The separately fitted forward and reverse polynomials are **not exact inverses**.
Both 0.5° and 0.25° visual grids span ±15°.
[Watson, 2014](https://doi.org/10.1167/14.7.15).

The editable Argus-II reference starts at 6 × 10 contacts, 575 µm pitch and
225 µm diameter, following pulse2percept 0.11.0. Published descriptions can use
different dimensions. This label identifies a software reference geometry,
not verification of a particular implanted device.

## Electrical field

Each circular contact is a prescribed, uniformly injecting current sheet in an
infinite conductor with conductivity `σ`. With signed current `I_i`, contact area
`A_i`, and all lengths converted to meters:

```text
φ(r) = sum_i [ I_i/(4πσA_i) × integral over disk_i (1/|r−r'|) dA' ]
E(r) = −gradient φ(r)
J(r) = σ E(r)
```

Positive current injects into the conductor. A cathodic stimulating contact has
negative current; finite return disks have positive current. All source and return
contributions are included, even outside the plotted region. Potential is relative
to infinity. Outputs are extracellular potential in mV, electric field in V/m,
and bulk current density in A/m².

For a single disk of radius `a`, axial separation `h > 0` and current `I`, the
exact full-space potential provides an independent closed-form check:

```text
φ(h) = I / [2πσ × (sqrt(a²+h²) + h)]
```

A +80 µA source with 100 µm radius, 100 µm separation and 0.2 S/m conductivity
gives +263.69654 mV and −1864.61614 V/m axial field below the disk. A finite
return changes the total; these values are the isolated-source contribution.

The source sheet has conductor on both sides. It is not an equipotential metal
contact or an electrode on an insulating half-space boundary. Those boundary
conditions produce different solutions. The default 0.2 S/m conductivity is an
editable demonstration assumption. A layered anisotropic retina and an electrode
interface need separate parameters and verification.
[Esler et al., 2018](https://doi.org/10.1371/journal.pone.0193598);
[Chen et al., 2020](https://doi.org/10.1103/PhysRevApplied.13.014004).

### Numerical method

The default disk integration uses 32 Gauss–Legendre radial nodes and 128 periodic
angular nodes. Small separation/radius ratios automatically raise the order.
Source-plane observations and ratios below 0.025 are rejected. Cubic Hermite
interpolation preserves the relationship between radial field and potential
derivative. Geometry-dependent transfer coefficients use a bounded 128 MiB cache;
large requests recompute evicted coefficients without coarsening the grid.

Independent Python references integrate azimuth analytically with complete elliptic
integrals, then adaptively integrate radius. This differs from the JavaScript
quadrature. Closed-sphere current-flux, gradient, polarity, conductivity-scaling
and finite-return tests supplement pointwise comparisons.

## Delivery

The scheduler stores exact piecewise-constant cathodic and anodic intervals,
including the interphase gap. It delivers only complete biphasic pulse pairs
inside the selected train window. Charge is not estimated by rounding edges to
time bins.

```text
Phase charge [nC] = |current| [µA] × phase duration [ms]
Geometric phase density [µC/cm²] = 100000 × phase charge [nC] / (πa² [µm²])
```

For example, 100 µA for 0.2 ms delivers 20 nC per phase. A 100 µm-radius contact
has geometric phase density 63.66198 µC/cm². The ideal symmetric waveform has
zero net charge, within floating-point arithmetic. Total absolute charge counts
both phases of delivered **stimulating-contact** pulses, excluding return charge.
Arithmetic charge balance alone does not establish electrochemical safety.

Interleaved contacts use equally spaced slots at the selected per-contact
repetition frequency. The scheduler rejects pulses that cannot fit. The electrical
map is a named cathodic snapshot: all simultaneous contacts, or one interleaved
contact. Contact-site probes use the same snapshot.

### Encoding and current budgets

Synthetic letter, Landolt C, bar and checkerboard inputs are defined in visual
degrees. Intensity encoding averages a 3 × 3 aperture; edge encoding uses a
clipped Sobel response. The aperture half-step is `max(0.15°, pitch/280/4)`.
The 280 µm/degree factor is an explicit encoder convention, not the Watson
coordinate transform. Single- and two-contact probes bypass the scene encoder.

Unavailable contacts are zeroed before current-budget scaling. Scene weights
multiply a per-contact peak-current limit. The optional summed-current budget
scales all amplitudes down together when their sum exceeds the cap. It does not
increase weak channels to force expenditure of the cap. Summed channel current
differs from instantaneous current in an interleaved slot.

## Measurements

| Output | Definition |
| --- | --- |
| Percept brightness | Raw model units, without independent normalization of comparison images. Different model families are not automatically luminance-calibrated. |
| Half-peak support area | Pixel count at ≥50% of image peak times sample area, in deg²; not an exact contour integral. |
| Support centroid and elongation | Unweighted support geometry; moment-axis widths are four times square roots of covariance eigenvalues. |
| Integrated brightness | Sum of image samples times visual sample area; depends on grid and field of view. |
| Components | Four-connected support-pixel regions, not a count of separately perceived phosphenes. |
| Electrical extrema | Sampled grid maxima, not certified continuous-space maxima. |
| Contact probes | Field and potential evaluated at the actual contact-center coordinates on the retinal plane, separately from raster sampling. |
| Zero-drive results | Exact zero images and fields, with undefined centroids and elongations represented as unavailable. |

Electrical maps offer 61, 121 or 241 samples per side over the array or a local
contact-centered region. A wide grid can miss a narrow peak between samples.
Boundary-tail flags and sampling warnings expose some limitations; absence of a
warning is not a convergence certificate.

Changing an input clears stale computed results. A pinned trial retains its
settings and numerical output. Versioned JSON stores settings, full samples,
waveforms, contact probes, model identity and reference checksum. Restoration
validates the definition and recomputes rather than trusting imported results.
CSV headers carry coordinates and units; initial `#` lines contain provenance.

## Verification

Fresh recovered-build checks include **16 independent native percept cases**,
**69 independent field fixtures**, **29 percept tests**, **9 JavaScript field
tests**, **15 complete-experiment/client tests**, and **9 Python field tests**.
The 62 targeted scientific tests are distinct from the repository build and
browser checks. All 52 generated percept assets and fixtures reproduced
byte-for-byte in a separate output directory.

| Numerical check | Observed recovered-build result |
| --- | --- |
| Percept implementation maximum error / reference peak | 2.242 × 10⁻⁷ |
| Percept implementation RMS error / reference peak | 2.743 × 10⁻⁸ |
| Direct field relative potential error | 4.631 × 10⁻⁸ |
| Direct field relative vector-E error | 5.414 × 10⁻⁶ |
| Cached field relative potential error | 4.472 × 10⁻⁸ |
| Cached field relative vector-E error | 9.650 × 10⁻⁶ |
| Visual-grid refinement integral change, three cases | 0.0285–0.6406% |
| Doubled trajectory resolution, peak-normalized RMS change | 0.5578–0.9648% |
| Doubled trajectory resolution, largest local change / peak | 18.09–26.84% |

These are measured errors on specified cases, not universal bounds. The native
trajectory study still shows substantial local differences near nearest-bundle
transitions. **Uniform pointwise convergence and patient validation have not been
established.** Close implementation agreement does not remove uncertainty in the
underlying model or its fit to an individual.

The largest electrical stress case retains all 58,081 points on a 241² grid and
stays within the cache limit. When the transfer set exceeds the cache, repeat runs
can remain slower than smaller arrays. Execution times are host-dependent; the
worker remains cancellable.

### Reproduce

```sh
npm ci
node --test tests/retinal-field.mjs tests/retinal-percept.mjs tests/retinal-experiment.mjs
npm run build --ignore-scripts
node scripts/verify-retinal-build.mjs
python3 -m venv /tmp/retinal-reference
/tmp/retinal-reference/bin/pip install -r scripts/retinal-reference/requirements.txt
/tmp/retinal-reference/bin/python scripts/retinal-reference/generate.py
/tmp/retinal-reference/bin/python -W error scripts/retinal-reference/field_reference.py
/tmp/retinal-reference/bin/python -m unittest discover -s scripts/retinal-reference -p 'test_field_reference.py'
/tmp/retinal-reference/bin/python scripts/retinal-reference/convergence.py
```

The anatomy is stored as 31 small compressed chunks. Lossless corresponding-eye
XOR, byte-plane rearrangement and gzip reduce transfer size; the loader checks
every chunk, reverses the transforms and verifies the complete native-data
SHA-256. No scientific coordinates or arc distances are rounded by compression.
The full upstream BSD-3-Clause license is included.

## Sources and next scientific steps

The primary papers linked above specify the model families and their context.
The [pinned pulse2percept release](https://pypi.org/project/pulse2percept/0.11.0/)
and committed generators define the numerical reference. Official
[model](https://pulse2percept.readthedocs.io/en/stable/concepts/models.html) and
[coordinate](https://pulse2percept.readthedocs.io/en/stable/concepts/coordinates.html)
documentation provide additional background, but live documentation may change.

A physical extension should specify tissue layers, tensor conductivity, implant
boundaries and interface dynamics before adding neural activation. A neural
extension requires a separately verified membrane model and consistent
extracellular coupling. Patient-specific evaluation needs measured anatomy,
electrode position, thresholds and percepts, with parameter fitting separated
from held-out evaluation. See
[Kish, Yuan & Weiland, 2023](https://doi.org/10.1038/s41598-023-49580-6) for the
additional anatomy and neural modeling involved in that goal.
