# PRIMA percept approximation

## Model boundary

This module ports the numerical percept approximation in **ProViSim v2.0.0**,
archived at [DOI 10.5281/zenodo.19212252](https://doi.org/10.5281/zenodo.19212252),
and described in Kochnev Goldstein, Park, Zhuo, Jensen and Palanker,
[Journal of NeuroEngineering and Rehabilitation 23:195 (2026)](https://doi.org/10.1186/s12984-026-01958-z).

It implements spatial filtering and alternative contrast transformations. It does
not calculate membrane voltage, synaptic activity, spikes, perceived brightness
in photometric units, recognition accuracy, or an individual patient's vision.
Its input is an optical grayscale image. The device-physics calculation and this
percept approximation share an input image; electrical field values are **not**
silently converted into percept brightness.

The paper motivates a smooth-image approximation using clinical observations.
Its face-enhancement experiment involved 16 sighted participants looking at
simulated vision, not a clinical efficacy test of enhanced face recognition in
PRIMA recipients. Gamma and sigmoid curves remain alternative assumptions about
contrast loss. Hardware stimulation levels must not be interpreted as a measured
number of distinguishable patient gray levels.

## Pinned implementation

- Release: `v2.0.0`, March 25, 2026.
- Commit: `efbf7a97f42a5f1ba72b901977dc39d98d0834c2`.
- License: MIT, preserved with the unmodified numerical source.
- Core reference versions: NumPy 1.26.4, SciPy 1.13.1, scikit-image 0.25.0.
- Published `image_processing.py` SHA-256:
  `00318dde83a2ae1e1f386de32393398c53a1287cea7920998970e840b2ea60d0`.

The full source archive was checked against the Zenodo MD5 and additionally
SHA-256 hashed. The complete archive, photographs, facial-landmarking models and
fonts are not included. Only the original numerical files, pipeline file,
requirements and MIT license are retained under
`scripts/prima-reference/vendor/provisim/`.

## Exact spatial calculation

For a square image `g` in the range [0,1], the published pipeline computes the
shifted two-dimensional FFT, multiplies by a padded radial Tukey mask, takes the
real part of the inverse FFT, and clips to [0,1]. It does not use the complex
magnitude and it does not min–max normalize the output.

The nominal cutoff in cycles per implant-width image is:

\[
f_c = \frac{W_{\mathrm{implant}}}{2p}.
\]

For the 2000 μm / 100 μm reference device this is 10 cycles per image. This is a
nominal sampling parameter; it is distinct from the complete mask's support.

The source constructs a one-dimensional symmetric Tukey window of length
`round(2 * cutoff * (1 + radius_expansion)) + 1`, then maps it radially using
`skimage.filters.window`. Both alpha and radius expansion default to 0.3.
The browser port matches Python ties-to-even rounding, scikit-image's float32
radial coordinates, linear interpolation, and zero-filled support.

### Published centering artifact

The source pads the mask with `floor((imageSize-windowSize)/2)` samples before
it and the remainder afterward. For a 256² image and cutoff 10, the window has
27 samples per side, with 114 leading samples. Its center is index 127, while
the shifted FFT DC index is 128. The same one-bin offset occurs at 128².

This produces a frequency mask that is not Hermitian about the actual DC bin.
The reference discards the inverse transform's imaginary component. The browser
port preserves that behavior to reproduce the published release, and exposes
the discarded imaginary peak as a numerical diagnostic. It does not silently
recenter the filter or claim the offset is a biological property.

`filter.cutoffCyclesPerImage` reports the nominal cutoff.
`filter.maximumSupportRadiusCycles` reports the largest distance from the actual
DC bin with a positive mask value. For the default 256² mask these are 10 and
approximately 14.213 cycles, respectively. `frequencyResponse` reports the
horizontal real-reconstruction gain obtained by averaging the positive and
negative frequency bins. It is not a patient contrast-sensitivity function.

FFT filtering assumes a periodically repeated input image and can introduce
ringing near sharp features and image boundaries. Clipping can change the image
mean and further alter the waveform. These are numerical properties, not
predicted perceptual halos.

## Exact contrast transformations

The gamma transform is centered on gray and preserves both endpoints:

\[
G(x;\gamma)=\frac{\operatorname{sgn}(2x-1)|2x-1|^{\gamma}+1}{2}.
\]

This differs from the ordinary display transform `x**gamma`. For gamma greater
than one, values move toward 0.5 while exact black and white remain unchanged.

The sigmoid alternative is:

\[
S(x;k,s)=\frac{1}{1+\exp[-k(x-s)]}.
\]

At the default gain 20 and offset 0.2, a zero input maps to approximately
0.01798621. That black level is deliberately retained. A completely dark optical
input is exactly zero in the gamma/identity modes; the sigmoid appearance is
not zero because of its stated transform. None of these dimensionless grayscale
values represent luminance, firing rate, or a probability of seeing.

## Input geometry and preprocessing

`renderInput(config, size)` returns `{width, height, values, metadata, metrics}`.
The image has a physical square width of 2000 μm by default. Positive x points
right, positive y points superior, and row zero represents the superior edge.
Raster sample positions are pixel centers.

Synthetic inputs include Landolt C, a 5×7 letter stencil, sinusoidal gratings,
checkerboards, a spot, a schematic face and exact dark input. Landolt C uses the
standard geometric proportions: outer diameter five times the requested gap,
inner diameter three times the gap, and a straight opening one gap wide.
This is an input pattern, not an automated acuity test. The face is an analytical
illustration, not a photograph or a clinical recognition stimulus.

Zoom and translations are applied before optical sampling. Zoom scales the
source feature on the implant and therefore trades scene coverage for detail;
it does not change physical pixel spacing or the published percept cutoff.
Contrast, brightness and optional Gaussian blur are explicit input processing
choices rather than additional ProViSim mechanisms. Dark input stays exactly
dark regardless of those image-processing controls.

Local image input requires finite grayscale values in [0,1] and an exact
width×height value count. Rectangular images are centered and cropped to square,
then sampled with bilinear interpolation and black outside their extent.
Two-by-two subpixel sampling anti-aliases synthetic edges. Source-image and
processing assumptions are recorded with exported experiments.

## Numerical validation

`percept_reference.py` first verifies the vendored source hashes. It then
compiles and executes the unmodified AST bodies of the published numerical
functions, avoiding unrelated MediaPipe/OpenCV/plotting imports. The JavaScript
FFT is implemented separately and does not call the Python reference.

Eighteen full-image cases cover black, white, intermediate gray, gradients,
Landolt C, an impulse, low/transition/high spatial frequencies, a diagonal
grating, checkerboards, fractional cutoff, and other valid Tukey parameters.
Two cases use the interface's default 256 × 256 resolution: the default Landolt C
with signed gamma, and an asymmetric shifted edge with sigmoid. The default
Landolt input is independently rasterized in Python with the same physical
dimensions and four-sample antialiasing; it is also checked against the browser
stimulus generator.
For each case, the full window, spatial image, and final percept are compared.
Fixtures contain losslessly compressed little-endian float64 arrays. The
absolute acceptance tolerance is 5×10⁻¹² on the [0,1] scale.

The exact reference JSON is stored in `tests/fixtures/prima-percept/` as
40 ASCII chunks of at most 64 KiB. Its manifest records chunk order, byte
counts, per-chunk SHA-256 checksums, and the reconstructed JSON checksum.
The loader checks all bytes before parsing; this packaging does not change
any image samples, source metadata, or numerical tolerances. The Python
`--check` command independently reproduces every chunk and the manifest.

Additional tests check the documented padding offset, frequency attenuation,
signed gamma, sigmoid black level, image coordinates, optical translation,
zoom versus physical resolution, input validation, and local-image orientation.

Reproduce in an isolated Python environment:

```sh
python -m pip install -r scripts/prima-reference/requirements.txt
python scripts/prima-reference/percept_reference.py --check
node tests/prima-percept.test.mjs
node scripts/prima-reference/verify_percept.mjs
```

The detailed numerical report is `docs/prima/PERCEPT_VALIDATION.json`.
Numerical agreement verifies this implementation of the published approximation.
It does not establish patient-specific perceptual accuracy.
