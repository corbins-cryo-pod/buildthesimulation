# Retinal model reference and reproduction

The browser percept engine reproduces the spatial epiretinal model families in
**pulse2percept 0.11.0**. Independent native Python calculations generate the
anatomy and committed golden outputs. The browser never imports the Python
package, and the reference generator never imports the JavaScript implementation.

## Reproduce

Use Python 3.12 from the repository root:

```sh
python3 -m venv /tmp/retinal-reference-venv
/tmp/retinal-reference-venv/bin/python -m pip install -r scripts/retinal-reference/requirements.txt
retinal_output=$(mktemp -d)
/tmp/retinal-reference-venv/bin/python scripts/retinal-reference/generate.py --repo "$retinal_output"
/tmp/retinal-reference-venv/bin/python -W error scripts/retinal-reference/field_reference.py --output "$retinal_output/tests/fixtures/retinal-field/independent-reference.json"
/tmp/retinal-reference-venv/bin/python scripts/retinal-reference/verify_reproduction.py --generated "$retinal_output"
/tmp/retinal-reference-venv/bin/python scripts/retinal-reference/test_reproduction.py
node tests/retinal-percept.mjs
node scripts/retinal-reference/validate_percept.mjs
```

`generate.py --repo /tmp/independent-output` writes a separate copy for a
reproduction comparison. `verify_reproduction.py` checks this copy without
overwriting committed references. The older
`node scripts/retinal-reference/validate_percept.mjs --compare-reproduction /tmp/independent-output`
remains an optional strict byte comparison for matching native math libraries
and CPU dispatch. During recovery all 52 generated assets/fixtures reproduced
byte-for-byte in a separate output directory. The source archive was downloaded from the official
PyPI release and checked against its published SHA-256:

`8a9ba4997212ca1b9e386814808c4aadf2a6ba5427664f3961911ab461104b34`

Pinned dependencies, source checksum, geometry checksum and generator checksum
are recorded in `tests/fixtures/retinal-percept/provenance.json`. The complete
upstream BSD-3-Clause license is distributed with the assets. Different native
math-library/compiler platforms can differ in floating-point results; numerical
reproduction and reference-asset integrity therefore have separate checks.

### Portable native reproduction

Both committed and regenerated chunk checksums, byte counts, reconstructed
geometry checksums, and percept-array checksums must match their own manifests
exactly. Source/generator/dependency provenance, licenses, model settings,
input configurations, coordinate samples, array shapes/dtypes/layouts, padding,
and integer bundle/segment assignments must agree exactly across reproductions.
The original generator files and committed numerical bytes remain unchanged.

The native comparison permits only these floating-point differences:

| Quantity | Native-versus-native acceptance bound |
| --- | --- |
| Geometry coordinates, arc lengths, distances, and display paths | Absolute 0.004 μm; zero relative tolerance |
| Nonzero percept output | Maximum error / stored peak ≤2×10⁻⁶; RMS error / stored peak ≤1×10⁻⁷ |
| Zero percept controls | Exact bytes |
| Electrical potential and field-vector components | Exact values |
| Current density, calculated from the field-vector norm | Relative 1×10⁻¹⁵; zero remains exact |

All numerical arrays must have the declared length and finite values. These
native percept bounds are stricter than the unchanged JavaScript comparison
limits of 5×10⁻⁶ maximum and 5×10⁻⁷ RMS relative to the reference peak.

The bounds follow reproduced CPU-dispatch differences with the pinned packages.
Disabling NumPy 2.5.4 dispatch features `X86_V4,AVX512_ICL,AVX512_SPR` reproduces
the failing CI geometry checksum
`4d70194b9dc6ee14584693ea47b0c4c037898baa936209d31b2d9ebd2d1b499e`
and the complete native percept manifest exactly. Geometry differences are at
most 0.002960 μm; additionally disabling `X86_V3` gives a maximum of 0.002967 μm.
Across these modes the largest peak-normalized percept difference is
1.259948×10⁻⁶ maximum and 8.509695×10⁻⁸ RMS. Integer assignments, dimensions,
coordinate samples, and zero controls do not change.

Separately, `OPENBLAS_CORETYPE=Haswell` reproduces the same three current-density
differences seen in CI, with maximum relative error 2.112×10⁻¹⁶. All potential
and field-vector values stay exact. This is a vector-norm rounding difference;
the elliptic-integral calculations are still compared exactly. The 16 verifier
regression tests exercise these separate acceptance rules and reject corrupted
storage, provenance changes, topology/input changes, nonfinite values, and
errors beyond each bound. `convergence.py` remains a separate discretization
study, described below.

## Implemented models

| Browser key | Native reference | Meaning |
| --- | --- | --- |
| `scoreboard` | `ScoreboardModel` | Circular Gaussian spatial comparison |
| `axon` | `AxonMapModel` | Spatial percept shaped by retinal nerve-fiber pathways |
| `biphasic` | `BiphasicAxonMapModel` | Representative image for a cathodic-first pulse train |
| `biphasic-scoreboard` | `BiphasicScoreboardModel` | Matched circular comparison with pulse-dependent brightness and size |

The axon-map response at candidate soma `s` is

\[
P(s)=\max_{p\in A_s}\sum_e a_e\exp\left[-\frac{\|p-e\|^2}{2\rho^2}-\frac{d_A(s,p)^2}{2\lambda^2}\right].
\]

Electrode contributions are summed **at each path point before** the maximum
along the soma-to-disc path is selected. Adding independently maximized
single-electrode percepts is not equivalent. A committed multi-contact test
detects that shortcut. For the shared phase duration used by this API, the
axonal decay factor is common to all contacts, so its factorization after
segmentwise spatial summation preserves this mathematical rule.

### Native geometry and transport

The generated reference begins with 1,000 Jansonius trajectories, each with
500 radial samples. Each visual sample is assigned to the native nearest bundle
and its closest segment. Unused bundles and portions beyond the furthest assigned
soma are removed without changing the paths used by either supported grid.
There are 638 retained bundles and 123,122 retained segments per eye. Both eyes'
native float32 coordinates are stored separately, including small differences
beyond an ideal mirror. Arc length and soma-to-nearest-segment distance retain
float64 precision.

The explicit settings are `min_ax_sensitivity=1e-3`,
`min_current_spread=1e-8`, `thresh_percept=0` and `meridian_blend=0`. This final
setting disables the package's newer meridian blend and preserves the chosen
original treatment. Reference outputs use the same settings.

The native binary is 4,647,808 bytes. Lossless XOR of corresponding eye blocks,
byte-plane rearrangement and gzip reduce it to 2,017,055 bytes. Thirty-one
independent files of at most 65,536 bytes carry the compressed stream. The
browser verifies each chunk, decompresses, reverses the two lossless transforms,
then verifies the complete reconstructed SHA-256 before parsing. No coordinate
rounding or lossy geometric compression is applied to the solver data. The
separate `axon-display.json` is thinned solely for anatomical display.

Use `loadPerceptReference(baseUrl, fetchFn)` in the browser. Node utilities can
concatenate the listed compressed chunks and call
`await decodePerceptReference(manifest, compressedBytes)`. The synchronous
`parsePerceptReference(manifest, rawBytes)` accepts an already reconstructed
buffer with the recorded byte layout. It validates structure and size; exact
digest verification is performed by the asynchronous decoder/loader.

### Pulse-dependent representative percept

For amplitude `a` in multiples of supplied detection threshold, phase duration
`t` in milliseconds and frequency `f` in hertz, the pinned implementation uses
the documented Argus-II phase-duration threshold refit:

\[
\tilde a=a(0.054326+2.095t),\qquad
F_b=0.1492147\tilde a+0.0163851f,
\]
\[
F_s=\max(1.0812\tilde a-0.35338,100/\rho^2),\qquad
F_l=\max(1.56-0.54t^{0.21},100/\lambda^2).
\]

These factors substitute brightness drive `Fb`, spatial variance `rho² Fs`, and
axonal variance `lambda² Fl`. These are the package's refitted coefficients;
they are not presented as unchanged coefficients from the original paper.
The threshold anchor is a **50%-detection current at 0.45 ms phase duration
and the selected train frequency**. The program does not estimate thresholds
from electrode gap, and an assumed common threshold does not become a measured
patient calibration when frequency changes. The model is not a probability of
detection and has no added hard threshold gate.

The pulse-dependent output is one representative train response. It does not
predict within-train dynamics, adaptation, spikes, interphase-gap effects or
onset delays. Its zero-delay simultaneous-train assumption must be enforced by
the caller. Zero current or zero pulse frequency produces no pulse-model drive.
Static spatial models do not predict temporal effects.

### Coordinate contract

Electrode coordinates use the pinned package's retinal x/y basis. Watson Eq. A5
maps visual degrees to retinal micrometers and Eq. A6 is a separately fitted
reverse map. Visual x sign is preserved; visual y sign is reversed. They are
not exact algebraic inverses: a forward/reverse round trip can differ by about
0.1° in this field. Right-eye optic-disc x is positive and left-eye x negative.

Images span -15° to +15° on each axis. A 0.5° interval gives 61×61 samples;
0.25° gives 121×121. Rows are stored from **+15° superior visual field at row
zero** down to -15°. Columns run from -15° to +15°. The finer/coarser grids
share sample positions exactly. Do not introduce an additional image flip.

## Scientific verification

Sixteen independent native golden cases cover all four model families, both
eyes, both output resolutions, asymmetric multi-contact inputs, a 60-contact
letter-like pattern, a peripheral streak, phase-duration and frequency changes,
zero drive and clipping. `docs/retinal-implant/PERCEPT_VALIDATION.json` records
the freshly measured discrepancy for every case. The largest observed
peak-normalized error after recovery is approximately **2.24×10⁻⁷**. Test limits
are 5×10⁻⁶ for maximum and 5×10⁻⁷ for RMS, normalized to each reference peak.
Zero-output cases must match exactly.

The 29-test percept suite also checks coordinate signs, separate inverse fits,
both-eye behavior, maximum-after-sum aggregation, shared grid locations, chunk
integrity, full reconstructed checksum, malformed reference rejection, browser
loading, the pure JavaScript SHA-256 fallback, supported inputs and sampling
warnings. Physical gap/diameter/conductivity deliberately do not alter the
published percept equations.

`convergence.py` performs a separate study entirely in the native package,
comparing visual sampling at 0.5°/0.25° and trajectory generation at
1,000 bundles/500 points versus 2,000/1,000 for three examples. Read the actual
`tests/fixtures/retinal-percept/convergence.json` and summary ranges before quoting
its values. Aggregate integrals may be stable while individual samples change
substantially near changes in nearest-bundle assignment. Accurate reproduction
of a chosen discretization does not establish uniform pointwise convergence.

Metrics describe the calculated raster, not acuity or recognition. A half-peak
support at the field boundary and a tail at least 1% of peak there are distinct
clipping flags. A sampling warning appears when the narrowest effective Gaussian
spread is less than one central grid interval. Its absence is not an accuracy
certificate. No patient, physiological, clinical or safety validation is claimed.

## Separate electrical reference

The finite-disk physical solver has its own independent elliptic-integral
reference and tests. With the same pinned environment:

```sh
/tmp/retinal-reference-venv/bin/python -W error scripts/retinal-reference/field_reference.py
/tmp/retinal-reference-venv/bin/python -m unittest discover -s scripts/retinal-reference -p 'test_field_reference.py' -v
node tests/retinal-field.mjs
```

See `docs/retinal-implant/FIELD_MODEL.md` for the physical assumptions and
electrical numerical report. A volume-conductor field is not a neural-activation
or percept calculation.

## Primary and official sources

1. Beyeler et al. (2019), *A model of ganglion axon pathways accounts for percepts
   elicited by retinal implants*. [doi:10.1038/s41598-019-45416-4](https://doi.org/10.1038/s41598-019-45416-4).
2. Granley & Beyeler (2021), *A Computational Model of Phosphene Appearance for
   Epiretinal Prostheses*. [doi:10.1109/EMBC46164.2021.9629663](https://doi.org/10.1109/EMBC46164.2021.9629663).
3. Jansonius et al. (2009), *A mathematical description of nerve fiber bundle
   trajectories and their variability in the human retina*.
   [doi:10.1016/j.visres.2009.04.029](https://doi.org/10.1016/j.visres.2009.04.029).
4. Watson (2014), *A formula for human retinal ganglion cell receptive field
   density as a function of visual field location*.
   [doi:10.1167/14.7.15](https://doi.org/10.1167/14.7.15).
5. [pulse2percept 0.11.0](https://pypi.org/project/pulse2percept/0.11.0/),
   [official model documentation](https://pulse2percept.readthedocs.io/en/stable/concepts/models.html)
   and [official coordinates](https://pulse2percept.readthedocs.io/en/stable/concepts/coordinates.html).

The package's editable Argus-II geometry uses 6×10 contacts at 575 µm pitch and
225 µm diameter. Literature versions can state different dimensions; label the
software reference version rather than implying manufacturer verification of a
particular device. Photovoltaic subretinal or suprachoroidal devices require
different models from these epiretinal percept equations.
