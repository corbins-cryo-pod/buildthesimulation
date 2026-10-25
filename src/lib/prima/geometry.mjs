/**
 * Nominal PRIMA geometry reconstructed from published counts and dimensions.
 * This is not the manufacturer's photolithography mask. The outer lattice is
 * clipped symmetrically to 378 complete cells within a 2 mm square footprint.
 */
export const PRIMA_GEOMETRY_VERSION = 'prima-reconstructed-378-v1';
export const PIXEL_WIDTH_UM = 100;
export const HEX_RADIUS_UM = PIXEL_WIDTH_UM / Math.sqrt(3);

let cached;
export function createPrimaGeometry({ activeRadiusUm = 15, returnWidthUm = 4 } = {}) {
  if (!Number.isFinite(activeRadiusUm) || activeRadiusUm <= 0 || activeRadiusUm >= 40) throw new Error('Active radius must lie between 0 and 40 µm.');
  if (!Number.isFinite(returnWidthUm) || returnWidthUm <= 0 || returnWidthUm >= 20) throw new Error('Return width must lie between 0 and 20 µm.');
  if (!cached) {
    const half = [];
    for (let r = 0; r < 20; r++) {
      for (let q = -20; q <= 20; q++) {
        const xUm = PIXEL_WIDTH_UM * (q + (r + 0.5) / 2);
        const yUm = PIXEL_WIDTH_UM * Math.sqrt(3) / 2 * (r + 0.5);
        if (Math.abs(xUm) > 950 || yUm > 1000 - HEX_RADIUS_UM) continue;
        const score = Math.max(Math.abs(xUm), yUm, (Math.abs(xUm) + yUm) / Math.sqrt(2));
        half.push({ xUm, yUm, score });
      }
    }
    // Quantized ordering removes platform-dependent tie breaks at ~1e-13 µm.
    half.sort((a, b) => Math.round(a.score * 1e6) - Math.round(b.score * 1e6) || a.yUm - b.yUm || a.xUm - b.xUm);
    const chosen = half.slice(0, 189);
    const centers = chosen.flatMap(p => [{ xUm: p.xUm, yUm: p.yUm }, { xUm: -p.xUm, yUm: -p.yUm }]);
    centers.sort((a, b) => b.yUm - a.yUm || a.xUm - b.xUm);
    const pixels = centers.map((center, index) => ({
      ...center, id: `P${String(index + 1).padStart(3, '0')}`, index,
      vertices: Array.from({ length: 6 }, (_, k) => ({
        xUm: center.xUm + HEX_RADIUS_UM * Math.cos(Math.PI / 6 + k * Math.PI / 3),
        yUm: center.yUm + HEX_RADIUS_UM * Math.sin(Math.PI / 6 + k * Math.PI / 3),
      })),
    }));
    const edges = new Map();
    const pointKey = p => `${Math.round(p.xUm * 1e5)},${Math.round(p.yUm * 1e5)}`;
    for (const pixel of pixels) {
      for (let k = 0; k < 6; k++) {
        const a = pixel.vertices[k], b = pixel.vertices[(k + 1) % 6];
        const key = [pointKey(a), pointKey(b)].sort().join('|');
        if (!edges.has(key)) edges.set(key, { x1Um: a.xUm, y1Um: a.yUm, x2Um: b.xUm, y2Um: b.yUm, pixelIds: [] });
        edges.get(key).pixelIds.push(pixel.id);
      }
    }
    const meshEdges = [...edges.values()].map((edge, index) => ({ id: `R${String(index + 1).padStart(4, '0')}`, ...edge }));
    const closest = pixels.reduce((best, p) => Math.hypot(p.xUm, p.yUm) < Math.hypot(best.xUm, best.yUm) ? p : best, pixels[0]);
    cached = { pixels, meshEdges, defaultSelectedPixelId: closest.id };
  }
  const pixelAreaUm2 = Math.sqrt(3) / 2 * PIXEL_WIDTH_UM ** 2;
  const meshLengthUm = cached.meshEdges.length * HEX_RADIUS_UM;
  const returnAreaUm2 = meshLengthUm * returnWidthUm;
  const activeAreaUm2 = Math.PI * activeRadiusUm ** 2;
  // Shared edges are counted once; junction overlap and fabrication dead area
  // are not resolved. This is an optical/capacitive area approximation.
  const photosensitiveAreaPerDiodeUm2 = Math.max(0, (pixelAreaUm2 - activeAreaUm2 - returnAreaUm2 / 378) / 2);
  return {
    version: PRIMA_GEOMETRY_VERSION, count: 378, pitchUm: 100, extentUm: 2000,
    thicknessUm: 30, hexRadiusUm: HEX_RADIUS_UM, pixelAreaUm2, activeAreaUm2,
    returnWidthUm, activeRadiusUm, returnAreaUm2, meshLengthUm,
    photosensitiveAreaPerDiodeUm2, defaultSelectedPixelId: cached.defaultSelectedPixelId,
    geometryStatus: 'Idealized reconstruction; manufacturer mask unavailable',
    pixels: cached.pixels.map(p => ({ ...p, activeRadiusUm })),
    meshEdges: cached.meshEdges,
  };
}

/** Composite midpoint surface-flux quadrature on each cell's return perimeter. */
export function returnBasisSites(pixel, subdivisions = 16) {
  if (![1, 2, 3, 4, 8, 16, 32].includes(subdivisions)) throw new Error('Return subdivisions must be 1, 2, 3, 4, 8, 16 or 32.');
  const sites = [];
  for (let k = 0; k < 6; k++) {
    const a = pixel.vertices[k], b = pixel.vertices[(k + 1) % 6];
    for (let j = 0; j < subdivisions; j++) {
      const t = (j + 0.5) / subdivisions;
      sites.push({ xUm: a.xUm + t * (b.xUm - a.xUm), yUm: a.yUm + t * (b.yUm - a.yUm), weight: 1 / (6 * subdivisions) });
    }
  }
  return sites;
}
