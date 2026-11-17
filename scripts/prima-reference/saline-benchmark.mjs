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
const result = solvePhysics(config, new Float64Array(geometry.count).fill(1));
const currents = Float64Array.from(result.pixelMetrics, pixel => pixel.snapshotCurrentUa * 1e-6);
const [probe] = evaluateFields(model, geometry, currents, [{ ...center, zUm: 17 }]);
console.log(JSON.stringify({ centerPixel: center.id, pulseTimeMs: config.pulseDurationMs / 2,
  potentialMv: probe.potentialMv, reference: "Huang et al. 2022, figure 3C, full field" }));
