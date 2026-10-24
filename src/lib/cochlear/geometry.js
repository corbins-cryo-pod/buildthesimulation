export const REFERENCE_LENGTH_MM = 35;
export function greenwoodHz(placeMm, lengthMm = REFERENCE_LENGTH_MM) {
  if (!(lengthMm > 0) || !Number.isFinite(placeMm)) throw new Error('Invalid cochlear reference coordinate.');
  return 165.4 * (10 ** (2.1 * (1 - placeMm / lengthMm)) - .88);
}
export function greenwoodPositionMm(hz, lengthMm = REFERENCE_LENGTH_MM) {
  if (!(hz > 0) || !(lengthMm > 0)) throw new Error('Invalid reference frequency.');
  return lengthMm * (1 - Math.log10(hz / 165.4 + .88) / 2.1);
}
export function frequencyMismatchSemitones(placeHz, assignedHz) { return 12 * Math.log2(placeHz / assignedHz); }
export function seededRandom(seed = 42) {
  let state = Number(seed) >>> 0;
  return () => { state |= 0; state = state + 0x6D2B79F5 | 0; let t = Math.imul(state ^ state >>> 15, 1 | state); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function createGeometry(settings) {
  const n = settings.channelCount, basal = settings.apicalDepthMm - settings.arraySpanMm;
  const contacts = Array.from({ length: n }, (_, index) => {
    const x = basal + settings.arraySpanMm * index / Math.max(1, n - 1);
    return { index, label: `E${String(index + 1).padStart(2, '0')}`, positionMm: [x, 0, settings.radialDistanceMm], radiusMm: settings.contactRadiusMm, normal: [0, 0, 1], placeHz: greenwoodHz(x), active: settings.activeMask?.[index] !== false };
  });
  const random = seededRandom(settings.seed);
  const fibers = Array.from({ length: settings.fiberCount }, (_, index) => {
    const placeMm = 2 + 31 * index / Math.max(1, settings.fiberCount - 1), inRegion = Math.abs(placeMm - settings.lossCentreMm) <= settings.lossWidthMm / 2;
    const removed = random() < (inRegion ? settings.neuralLoss : 0);
    return { index, label: `ANF ${String(index + 1).padStart(2, '0')}`, placeMm, placeHz: greenwoodHz(placeMm), alive: !removed };
  });
  return { coordinateSystem: 'unrolled-mm', referenceLengthMm: REFERENCE_LENGTH_MM, contacts, fibers, returnPositionMm: [17.5, -20, 20], basalMm: basal, apicalMm: settings.apicalDepthMm, spanMm: settings.arraySpanMm };
}
// The display coil is sampled at uniform arc length. It is a schematic mapping
// only: the field and cable solvers always use the unrolled coordinates above.
const coil = (() => {
  const points = []; let length = 0;
  for (let i = 0; i <= 1200; i++) {
    const u = i / 1200, angle = .45 + u * 5 * Math.PI, radius = 4.6 - 3.95 * u;
    const point = [radius * Math.cos(angle), radius * Math.sin(angle), u * 2.4];
    if (i) length += Math.hypot(...point.map((x, k) => x - points[i - 1].point[k]));
    points.push({ point, length });
  }
  return { points, length };
})();
export function coiledPoint(placeMm, nerveDistanceMm = 0, separationMm = 0) {
  const target = Math.max(0, Math.min(1, placeMm / REFERENCE_LENGTH_MM)) * coil.length;
  let lo = 0, hi = coil.points.length - 1;
  while (lo + 1 < hi) { const mid = (lo + hi) >> 1; if (coil.points[mid].length < target) lo = mid; else hi = mid; }
  const a = coil.points[lo], b = coil.points[hi], u = (target - a.length) / Math.max(1e-12, b.length - a.length);
  const p = a.point.map((x, i) => x + u * (b.point[i] - x));
  const inward = Math.max(0, Math.min(1, nerveDistanceMm / 12));
  return [p[0] * (1 - .8 * inward), p[1] * (1 - .8 * inward), p[2] + 3 * inward + separationMm];
}
