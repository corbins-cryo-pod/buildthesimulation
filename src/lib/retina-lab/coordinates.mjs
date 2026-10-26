import { retinalToVisual } from "../retinal-implant/percept.mjs";

export { retinalToVisual };
// Invert A6 numerically so the new shared chart has one exact map in both
// directions. The retained legacy engines still use their published A5/A6 fits.
export function visualToRetinal(xDeg, yDeg) {
  if (!Number.isFinite(xDeg) || !Number.isFinite(yDeg))
    throw Error("Visual coordinates must be finite.");
  const deg = Math.hypot(xDeg, yDeg);
  if (!deg) return { xUm: 0, yUm: 0 };
  let mm = deg / 3.556;
  for (let k = 0; k < 8; k++)
    mm -=
      (3.556 * mm +
        0.05993 * mm ** 2 -
        0.007358 * mm ** 3 +
        0.0003027 * mm ** 4 -
        deg) /
      (3.556 + 0.11986 * mm - 0.022074 * mm ** 2 + 0.0012108 * mm ** 3);
  return { xUm: (xDeg * mm * 1000) / deg, yUm: (-yDeg * mm * 1000) / deg };
}
export const COORDINATES =
  "Right-eye retinal chart in µm: fovea (0,0), x nasal/right, y superior; depth positive toward RPE. Watson2014 visual y is inverted. Curved display registered to the same chart; conductive domains use local planar approximations.";
export const EYE_RADIUS_UM = 12000;
export function retinalSurface(x, y) {
  const r2 = x * x + y * y;
  return (
    EYE_RADIUS_UM -
    Math.sqrt(Math.max(1, EYE_RADIUS_UM ** 2 - r2)) -
    110 * Math.exp(-r2 / (2 * 230 ** 2))
  );
}
export function worldPoint(xUm, yUm, depthUm = 0) {
  return { xUm, yUm, zUm: retinalSurface(xUm, yUm) - depthUm };
}
export function placePoint(point, placement) {
  const t = (placement.rotationDeg * Math.PI) / 180,
    c = Math.cos(t),
    s = Math.sin(t);
  return {
    xUm: placement.xUm + c * point.xUm - s * point.yUm,
    yUm: placement.yUm + s * point.xUm + c * point.yUm,
  };
}
export function localPoint(point, placement) {
  const t = (placement.rotationDeg * Math.PI) / 180,
    c = Math.cos(t),
    s = Math.sin(t),
    x = point.xUm - placement.xUm,
    y = point.yUm - placement.yUm;
  return { xUm: c * x + s * y, yUm: -s * x + c * y };
}
export function sampleRaster(image, xDeg, yDeg, fieldDeg) {
  const x = (xDeg / fieldDeg + 0.5) * image.width - 0.5,
    y = (0.5 - yDeg / fieldDeg) * image.height - 0.5;
  const i = Math.floor(x),
    j = Math.floor(y),
    fx = x - i,
    fy = y - j,
    a = image.values ?? image.brightness;
  const at = (c, r) =>
    c < 0 || r < 0 || c >= image.width || r >= image.height
      ? 0
      : a[r * image.width + c];
  return (
    (at(i, j) * (1 - fx) + at(i + 1, j) * fx) * (1 - fy) +
    (at(i, j + 1) * (1 - fx) + at(i + 1, j + 1) * fx) * fy
  );
}
export function sampleRetinal(image, xUm, yUm, fieldDeg) {
  const v = retinalToVisual(xUm, yUm);
  return sampleRaster(image, v.xDeg, v.yDeg, fieldDeg);
}
