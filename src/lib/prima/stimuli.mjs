/** Deterministic, locally generated optical test images; no external images or fonts. */
import { validateImage, imageMetrics } from './percept.mjs';

export const STIMULUS_IDS = Object.freeze(['landolt', 'letter', 'grating', 'checkerboard', 'face', 'spot', 'blank', 'image']);
const clamp01 = value => Math.max(0, Math.min(1, value));
const LETTERS = {
  A: ['01110','10001','10001','11111','10001','10001','10001'],
  B: ['11110','10001','10001','11110','10001','10001','11110'],
  C: ['01111','10000','10000','10000','10000','10000','01111'],
  D: ['11110','10001','10001','10001','10001','10001','11110'],
  E: ['11111','10000','10000','11110','10000','10000','11111'],
  F: ['11111','10000','10000','11110','10000','10000','10000'],
  G: ['01111','10000','10000','10111','10001','10001','01110'],
  H: ['10001','10001','10001','11111','10001','10001','10001'],
  I: ['11111','00100','00100','00100','00100','00100','11111'],
  J: ['00111','00010','00010','00010','10010','10010','01100'],
  K: ['10001','10010','10100','11000','10100','10010','10001'],
  L: ['10000','10000','10000','10000','10000','10000','11111'],
  M: ['10001','11011','10101','10101','10001','10001','10001'],
  N: ['10001','11001','11001','10101','10011','10011','10001'],
  O: ['01110','10001','10001','10001','10001','10001','01110'],
  P: ['11110','10001','10001','11110','10000','10000','10000'],
  Q: ['01110','10001','10001','10001','10101','10010','01101'],
  R: ['11110','10001','10001','11110','10100','10010','10001'],
  S: ['01111','10000','10000','01110','00001','00001','11110'],
  T: ['11111','00100','00100','00100','00100','00100','00100'],
  U: ['10001','10001','10001','10001','10001','10001','01110'],
  V: ['10001','10001','10001','10001','10001','01010','00100'],
  W: ['10001','10001','10001','10101','10101','10101','01010'],
  X: ['10001','10001','01010','00100','01010','10001','10001'],
  Y: ['10001','10001','01010','00100','00100','00100','00100'],
  Z: ['11111','00001','00010','00100','01000','10000','11111'],
};

function number(value, fallback, min, max, label) {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw new RangeError(`${label} must be in [${min}, ${max}].`);
  return parsed;
}

/** Bilinear center-of-pixel sampling, with black outside the supplied image. */
export function sampleImage(image, x, y) {
  const left = Math.floor(x), top = Math.floor(y), fx = x - left, fy = y - top;
  const at = (xx, yy) => xx < 0 || yy < 0 || xx >= image.width || yy >= image.height ? 0 : image.values[yy * image.width + xx];
  return (at(left, top) * (1 - fx) + at(left + 1, top) * fx) * (1 - fy)
    + (at(left, top + 1) * (1 - fx) + at(left + 1, top + 1) * fx) * fy;
}

/** x right, y superior; image row zero is the superior edge. */
export function sampleImageAt(image, xUm, yUm, implantWidthUm = 2000) {
  return sampleImage(image, (xUm / implantWidthUm + 0.5) * image.width - 0.5,
    (0.5 - yUm / implantWidthUm) * image.height - 0.5);
}

function blur(values, size, sigma) {
  if (sigma === 0) return values;
  const radius = Math.ceil(3 * sigma), kernel = new Float64Array(radius * 2 + 1);
  let sum = 0;
  for (let i = -radius; i <= radius; i++) { const v = Math.exp(-0.5 * (i / sigma) ** 2); kernel[i + radius] = v; sum += v; }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;
  const temporary = new Float64Array(values.length), result = new Float64Array(values.length);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let horizontal = 0;
    for (let k = -radius; k <= radius; k++) if (x + k >= 0 && x + k < size) horizontal += values[y * size + x + k] * kernel[k + radius];
    temporary[y * size + x] = horizontal;
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let vertical = 0;
    for (let k = -radius; k <= radius; k++) if (y + k >= 0 && y + k < size) vertical += temporary[(y + k) * size + x] * kernel[k + radius];
    result[y * size + x] = vertical;
  }
  return result;
}

function face(x, y, width) {
  // Schematic head: analytical ellipses and shading, not a patient/photo stimulus.
  const u = x / width * 2, v = y / width * 2;
  let value = 0.12;
  if ((u / 0.78) ** 2 + ((v + 0.9) / 0.58) ** 2 < 1) value = 0.3;
  if ((u / 0.49) ** 2 + ((v - 0.12) / 0.7) ** 2 < 1) value = 0.08;
  if ((u / 0.43) ** 2 + ((v - 0.03) / 0.62) ** 2 < 1) value = clamp01(0.72 + 0.12 * u - 0.1 * (v - 0.12) ** 2);
  if ((u / 0.47) ** 2 + ((v - 0.46) / 0.25) ** 2 < 1) value = 0.06;
  for (const eye of [-0.18, 0.18]) {
    if (((u - eye) / 0.12) ** 2 + ((v - 0.12) / 0.055) ** 2 < 1) value = 0.32;
    if (((u - eye) / 0.035) ** 2 + ((v - 0.12) / 0.04) ** 2 < 1) value = 0.08;
    if (Math.abs(u - eye) < 0.12 && Math.abs(v - 0.24 - 0.07 * (u - eye)) < 0.018) value = 0.12;
  }
  if (Math.abs(u) < 0.07 && v < 0.08 && v > -0.19) value -= 0.17 * (1 - Math.abs(u) / 0.07);
  if ((u / 0.15) ** 2 + ((v + 0.31) / 0.035) ** 2 < 1) value = 0.22;
  return clamp01(value);
}

export function renderInput(config = {}, size = config.imageSize ?? 256) {
  if (!Number.isInteger(size) || size < 16 || size > 1024 || (size & (size - 1))) throw new RangeError('Raster size must be a power of two from 16 to 1024.');
  const stimulus = config.stimulus ?? 'landolt';
  if (!STIMULUS_IDS.includes(stimulus)) throw new RangeError(`Unsupported stimulus: ${stimulus}.`);
  const widthUm = number(config.implantWidthUm, 2000, 100, 10000, 'Implant width');
  const zoom = number(config.zoom, 1, 0.25, 12, 'Zoom');
  const offsetXUm = number(config.offsetXUm, 0, -10000, 10000, 'Horizontal offset');
  const offsetYUm = number(config.offsetYUm, 0, -10000, 10000, 'Vertical offset');
  const gapUm = number(config.landoltGapUm, 120, 5, 1000, 'Landolt gap');
  const spotRadiusUm = number(config.spotRadiusUm, 75, 5, 2000, 'Spot radius');
  const gratingCycles = number(config.gratingCycles, 8, 0.1, 100, 'Grating cycles');
  const contrast = number(config.contrast, 1, 0, 2, 'Contrast');
  const brightness = number(config.brightness, 1, 0, 2, 'Brightness');
  const blurSigmaPx = number(config.blurSigmaPx, 0, 0, 16, 'Blur sigma');
  const orientation = config.orientation ?? 'right';
  if (!['right', 'left', 'up', 'down'].includes(orientation)) throw new RangeError('Orientation must be right, left, up, or down.');
  const letter = String(config.letter ?? 'E').toUpperCase();
  if (stimulus === 'letter' && !LETTERS[letter]) throw new RangeError('Letter must be one uppercase Latin character A–Z.');
  const custom = stimulus === 'image' ? validateImage(config.customImage) : null;
  const source = (x, y) => {
    if (stimulus === 'blank') return 0;
    if (stimulus === 'spot') return Math.hypot(x, y) <= spotRadiusUm ? 1 : 0;
    if (stimulus === 'grating') return 0.5 + 0.5 * Math.cos(2 * Math.PI * gratingCycles * (['up','down'].includes(orientation) ? y : x) / widthUm);
    if (stimulus === 'checkerboard') {
      const cell = widthUm / (2 * gratingCycles);
      return ((Math.floor((x + widthUm / 2) / cell) + Math.floor((y + widthUm / 2) / cell)) % 2 + 2) % 2;
    }
    if (stimulus === 'face') return face(x, y, widthUm);
    if (stimulus === 'image') {
      const crop = Math.min(custom.width, custom.height);
      return sampleImage(custom, custom.width / 2 + x / widthUm * crop - 0.5,
        custom.height / 2 - y / widthUm * crop - 0.5);
    }
    if (stimulus === 'letter') {
      const xx = Math.floor(x / gapUm + 2.5), yy = Math.floor(3.5 - y / gapUm);
      return xx >= 0 && xx < 5 && yy >= 0 && yy < 7 && LETTERS[letter][yy][xx] === '1' ? 1 : 0;
    }
    const radius = Math.hypot(x, y);
    if (radius < 1.5 * gapUm || radius > 2.5 * gapUm) return 0;
    const along = orientation === 'right' ? x : orientation === 'left' ? -x : orientation === 'up' ? y : -y;
    const across = ['right', 'left'].includes(orientation) ? y : x;
    return along >= 0 && Math.abs(across) < gapUm / 2 ? 0 : 1;
  };
  let values = new Float64Array(size * size);
  const antialias = 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let total = 0;
    for (let sy = 0; sy < antialias; sy++) for (let sx = 0; sx < antialias; sx++) {
      const xx = (((x + (sx + 0.5) / antialias) / size - 0.5) * widthUm - offsetXUm) / zoom;
      const yy = ((0.5 - (y + (sy + 0.5) / antialias) / size) * widthUm - offsetYUm) / zoom;
      total += source(xx, yy);
    }
    const raw = total / (antialias * antialias);
    values[y * size + x] = stimulus === 'blank' ? 0 : clamp01(((raw - 0.5) * contrast + 0.5) * brightness);
  }
  values = blur(values, size, blurSigmaPx);
  return {
    width: size, height: size, values,
    metadata: {
      stimulus, implantWidthUm: widthUm, zoom, offsetXUm, offsetYUm, contrast, brightness, blurSigmaPx,
      coordinates: 'x right; y superior; row 0 superior; centered pixel sampling',
      source: stimulus === 'face' ? 'Analytical schematic face; not a photograph or clinical task.' : stimulus === 'image' ? 'Local user image; centered square crop, bilinear resampling.' : 'Synthetic optical test pattern; not an acuity measurement.',
      effectiveLandoltGapUm: stimulus === 'landolt' ? gapUm * zoom : null,
      effectiveGratingCycles: stimulus === 'grating' ? gratingCycles / zoom : null,
    },
    metrics: imageMetrics(values),
  };
}
