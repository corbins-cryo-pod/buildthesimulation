// A single voltage map is shared by the 3D surface, the 2D view and the legend.
// Values are mV across the membrane, never extracellular microvolts.
export const VOLTAGE_STOPS = Object.freeze([
  [-90, '#415567'], [-70, '#4f858d'], [-50, '#91b4a8'],
  [-20, '#dacc91'], [0, '#d99555'], [40, '#ad493f'],
]);
const COLOR_STOPS = VOLTAGE_STOPS.map(([value, hex]) => [value,
  [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)]);

/** Normalized sRGB (not linear-light) components, for matching 2D/CSS output. */
export function voltageRgb(value) {
  const v = Number.isFinite(value) ? value : -65;
  if (v <= COLOR_STOPS[0][0]) return [...COLOR_STOPS[0][1]];
  for (let i = 1; i < COLOR_STOPS.length; i++) {
    if (v <= COLOR_STOPS[i][0]) {
      const [lo, a] = COLOR_STOPS[i - 1], [hi, b] = COLOR_STOPS[i];
      const t = (v - lo) / (hi - lo);
      return a.map((x, k) => x + (b[k] - x) * t);
    }
  }
  return [...COLOR_STOPS.at(-1)[1]];
}
export function voltageColor(value) {
  return `#${voltageRgb(value).map(c => Math.round(255 * c).toString(16).padStart(2, '0')).join('')}`;
}
