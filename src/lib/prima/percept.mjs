/**
 * ProViSim v2.0.0 numerical port, DOI:10.5281/zenodo.19212252 (MIT).
 * See scripts/prima-reference/vendor/provisim/LICENSE and docs/prima/PERCEPT.md.
 * This is a percept approximation, not a neural response or clinical predictor.
 * Deliberately preserves the published mask padding, float32 radial coordinates,
 * clipped real inverse FFT, and signed gamma transform.
 */

export const PERCEPT_PROVENANCE = Object.freeze({
  model: 'ProViSim', version: '2.0.0', implementation: 'bts-prima-percept-1.0.0',
  doi: '10.5281/zenodo.19212252',
  paperDoi: '10.1186/s12984-026-01958-z',
  commit: 'efbf7a97f42a5f1ba72b901977dc39d98d0834c2',
  sourceSha256: '00318dde83a2ae1e1f386de32393398c53a1287cea7920998970e840b2ea60d0',
  boundary: 'periodic FFT; published asymmetric padding; clipped real reconstruction',
  meaning: 'Spatial and contrast appearance approximation; no patient-specific calibration.'
});

const clamp01 = (value) => Math.min(1, Math.max(0, value));

function bounded(value, fallback, lo, hi, name) {
  const v = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(v) || v < lo || v > hi) throw new RangeError(`${name} must be in [${lo}, ${hi}].`);
  return v;
}

export function validateImage(image, { square = false, maxSize = 1024 } = {}) {
  if (!image || !Number.isInteger(image.width) || !Number.isInteger(image.height)
      || image.width < 1 || image.height < 1 || image.width > maxSize || image.height > maxSize
      || (square && image.width !== image.height)
      || !image.values || image.values.length !== image.width * image.height) {
    throw new TypeError(`Image requires integer dimensions ≤${maxSize} and exactly width×height grayscale values${square ? ' in a square' : ''}.`);
  }
  for (const value of image.values) {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError('Image grayscale values must be finite and in [0, 1].');
  }
  return image;
}

// Python round uses ties-to-even, unlike Math.round.
export function roundTiesToEven(value) {
  const lo = Math.floor(value);
  const frac = value - lo;
  return frac < 0.5 ? lo : frac > 0.5 ? lo + 1 : lo % 2 === 0 ? lo : lo + 1;
}

function tukey1d(size, alpha) {
  const values = new Float64Array(size);
  const edge = alpha * (size - 1) / 2;
  for (let i = 0; i < size; i++) {
    if (alpha <= 0 || size === 1) values[i] = 1;
    else if (i <= edge) values[i] = 0.5 * (1 + Math.cos(Math.PI * (-1 + i / edge)));
    else if (i >= size - 1 - edge) values[i] = 0.5 * (1 + Math.cos(Math.PI * (-2 / alpha + 1 + i / edge)));
    else values[i] = 1;
  }
  return values;
}

/** Equivalent to the published create_tukey_window + skimage.filters.window. */
export function createTukeyWindow(cutoffCyclesPerImage, imageSize, { alpha = 0.3, radiusExpansion = 0.3 } = {}) {
  const cutoff = bounded(cutoffCyclesPerImage, 10, 0.01, 512, 'Cutoff');
  alpha = bounded(alpha, 0.3, 0, 1, 'Tukey alpha');
  radiusExpansion = bounded(radiusExpansion, 0.3, 0, 1, 'Radius expansion');
  if (!Number.isInteger(imageSize) || imageSize < 2 || imageSize > 1024) throw new RangeError('Image size must be an integer from 2 to 1024.');
  const windowSize = roundTiesToEven(2 * cutoff * (1 + radiusExpansion)) + 1;
  if (windowSize > imageSize) throw new RangeError(`Published window (${windowSize}) exceeds image size (${imageSize}); increase image resolution.`);
  const padBefore = Math.floor((imageSize - windowSize) / 2);
  const center = (windowSize - 1) / 2;
  const maskCenter = padBefore + center;
  const oneD = tukey1d(windowSize, alpha);
  const values = new Float64Array(imageSize * imageSize);
  let maximumSupportRadiusCycles = 0;
  const dcIndex = Math.floor(imageSize / 2);
  for (let y = 0; y < windowSize; y++) {
    for (let x = 0; x < windowSize; x++) {
      // skimage 0.25.0 samples its 1D window using float32 radial coordinates.
      const dx = Math.fround(x - center), dy = Math.fround(y - center);
      const dist = Math.fround(Math.sqrt(Math.fround(Math.fround(dx * dx) + Math.fround(dy * dy))));
      const coordinate = Math.fround(dist + center);
      const left = Math.floor(coordinate), fraction = coordinate - left;
      const a = oneD[left] ?? 0, b = oneD[left + 1] ?? 0;
      const value = clamp01(a + (b - a) * fraction);
      const xx = x + padBefore, yy = y + padBefore;
      values[yy * imageSize + xx] = value;
      if (value > 0) maximumSupportRadiusCycles = Math.max(maximumSupportRadiusCycles, Math.hypot(xx - dcIndex, yy - dcIndex));
    }
  }
  return {
    values, cutoffCyclesPerImage: cutoff, windowSize, padBefore, maskCenter,
    dcIndex, maximumSupportRadiusCycles, alpha, radiusExpansion,
    dcGain: values[dcIndex * imageSize + dcIndex],
  };
}

// Independent radix-2 Cooley–Tukey FFT. No browser, canvas, or external package.
function fft1d(real, imag, inverse = false) {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (inverse ? 2 : -2) * Math.PI / len;
    const wr = Math.cos(angle), wi = Math.sin(angle);
    for (let start = 0; start < n; start += len) {
      let ur = 1, ui = 0;
      for (let j = 0; j < len / 2; j++) {
        const a = start + j, b = a + len / 2;
        const vr = real[b] * ur - imag[b] * ui;
        const vi = real[b] * ui + imag[b] * ur;
        real[b] = real[a] - vr; imag[b] = imag[a] - vi;
        real[a] += vr; imag[a] += vi;
        const next = ur * wr - ui * wi;
        ui = ur * wi + ui * wr; ur = next;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { real[i] /= n; imag[i] /= n; }
}

function fft2d(real, imag, size, inverse = false) {
  for (let y = 0; y < size; y++) fft1d(real.subarray(y * size, (y + 1) * size), imag.subarray(y * size, (y + 1) * size), inverse);
  const rr = new Float64Array(size), ii = new Float64Array(size);
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) { rr[y] = real[y * size + x]; ii[y] = imag[y * size + x]; }
    fft1d(rr, ii, inverse);
    for (let y = 0; y < size; y++) { real[y * size + x] = rr[y]; imag[y * size + x] = ii[y]; }
  }
}

export function gammaTransform(value, gamma) {
  const shifted = 2 * value - 1;
  return (Math.sign(shifted) * Math.abs(shifted) ** gamma + 1) / 2;
}

export function sigmoidTransform(value, gain, offset) {
  return 1 / (1 + Math.exp(-gain * (value - offset)));
}

export function imageMetrics(values) {
  let minimum = Infinity, maximum = -Infinity, sum = 0;
  for (const value of values) { minimum = Math.min(minimum, value); maximum = Math.max(maximum, value); sum += value; }
  const mean = sum / values.length;
  let variance = 0;
  for (const value of values) variance += (value - mean) ** 2;
  return {
    minimum, maximum, mean,
    standardDeviation: Math.sqrt(variance / values.length),
    rmsContrast: mean > 1e-15 ? Math.sqrt(variance / values.length) / mean : 0,
    michelsonContrast: maximum + minimum > 1e-15 ? (maximum - minimum) / (maximum + minimum) : null,
  };
}

export function predictPercept(image, options = {}) {
  validateImage(image, { square: true });
  const size = image.width;
  if (size < 16 || (size & (size - 1)) !== 0) throw new RangeError('Percept calculation requires a power-of-two square image from 16 to 1024 pixels.');
  const pixelWidthUm = bounded(options.pixelWidthUm, 100, 10, 500, 'Pixel width');
  const implantWidthUm = bounded(options.implantWidthUm, 2000, 100, 10000, 'Implant width');
  const cutoff = options.cutoffCyclesPerImage ?? implantWidthUm / (2 * pixelWidthUm);
  const filter = createTukeyWindow(cutoff, size, { alpha: options.taper ?? 0.3, radiusExpansion: options.radiusExpansion ?? 0.3 });
  const contrastModel = options.contrastModel ?? 'gamma';
  if (!['none', 'gamma', 'sigmoid'].includes(contrastModel)) throw new RangeError('Unknown contrast model.');
  const gamma = bounded(options.gamma, 2.6, 0.1, 10, 'Gamma');
  const gain = bounded(options.sigmoidGain, 20, 0.1, 100, 'Sigmoid gain');
  const offset = bounded(options.sigmoidOffset, 0.2, 0, 1, 'Sigmoid offset');
  const real = Float64Array.from(image.values), imag = new Float64Array(size * size);
  fft2d(real, imag, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x;
    const multiplier = filter.values[((y + size / 2) % size) * size + (x + size / 2) % size];
    real[i] *= multiplier; imag[i] *= multiplier;
  }
  fft2d(real, imag, size, true);
  const spatialValues = Float64Array.from(real, clamp01);
  const values = Float64Array.from(spatialValues, value => contrastModel === 'gamma' ? gammaTransform(value, gamma)
    : contrastModel === 'sigmoid' ? sigmoidTransform(value, gain, offset) : value);
  let discardedImaginaryPeak = 0, clippedPixelCount = 0;
  for (let i = 0; i < real.length; i++) {
    discardedImaginaryPeak = Math.max(discardedImaginaryPeak, Math.abs(imag[i]));
    if (real[i] < -1e-12 || real[i] > 1 + 1e-12) clippedPixelCount++;
  }
  const { values: mask, ...filterMetadata } = filter;
  const frequencyResponse = [];
  const dc = size / 2;
  for (let frequency = 0; frequency <= Math.min(size / 2 - 1, Math.ceil(filter.maximumSupportRadiusCycles) + 2); frequency++) {
    // Real reconstruction averages positive and negative horizontal frequency bins.
    const gainAtFrequency = (mask[dc * size + dc + frequency] + mask[dc * size + dc - frequency]) / 2;
    frequencyResponse.push({ cyclesPerImage: frequency, gain: gainAtFrequency });
  }
  return {
    width: size, height: size, values, spatialValues,
    metrics: { ...imageMetrics(values), discardedImaginaryPeak, clippedPixelCount,
      outputBlackLevel: contrastModel === 'sigmoid' ? sigmoidTransform(0, gain, offset) : 0 },
    filter: filterMetadata, frequencyResponse,
    contrast: { model: contrastModel, gamma, sigmoidGain: gain, sigmoidOffset: offset },
    provenance: PERCEPT_PROVENANCE,
  };
}
