// Huang et al., figure 3C. Compare extracellular potential above the center
// pixel during full-field illumination, using the paper's electrical settings.
import { createPrimaGeometry } from "../../src/lib/prima/geometry.mjs";
import { PHYSICS_DEFAULTS, makeCircuitModel, evaluateFields, solvePhysics } from "../../src/lib/prima/physics.mjs";

const config = {
  ...PHYSICS_DEFAULTS, conductivitySm: 0.152, irradianceMwMm2: 3,
  pulseDurationMs: 9.6, frequencyHz: 30, shuntMohm: 0.72,
  capacitanceDensityFm2: 60, fieldGridSize: 31,
};
const geometry = createPrimaGeometry(config);
const center = geometry.pixels.find(pixel => pixel.id === geometry.defaultSelectedPixelId);
const model = makeCircuitModel(config, geometry);
// The publication describes a centered spot covering approximately half of the pixels.
// The exact measured irradiance mask is unavailable. Use the nearest 189 pixel centers.
const byDistance = [...geometry.pixels].sort((a, b) =>
  Math.hypot(a.xUm, a.yUm) - Math.hypot(b.xUm, b.yUm));
const spot = new Set(byDistance.slice(0, geometry.count / 2).map(pixel => pixel.id));
for (const pattern of ["full field", "approximate half-array spot"]) {
  const light = Float64Array.from(geometry.pixels, pixel =>
    Number(pattern === "full field" || spot.has(pixel.id)));
  const result = solvePhysics(config, light);
  const currents = Float64Array.from(result.pixelMetrics, pixel => pixel.snapshotCurrentUa * 1e-6);
  const [probe] = evaluateFields(model, geometry, currents, [{ ...center, zUm: 17 }]);
  console.log(JSON.stringify({ pattern, centerPixel: center.id, pulseTimeMs: config.pulseDurationMs / 2,
    potentialMv: probe.potentialMv, reference: "Huang et al. 2022, figure 3C" }));
}
