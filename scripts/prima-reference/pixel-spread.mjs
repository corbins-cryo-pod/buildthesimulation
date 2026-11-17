// Horizontal profile of the modeled bipolar extracellular driving difference.
// Run with an optional manufactured-layout surrogate ID, e.g. P180 or P001.
import { createPrimaGeometry } from "../../src/lib/prima/geometry.mjs";
import { PHYSICS_DEFAULTS, makeCircuitModel, evaluateFields, solvePhysics } from "../../src/lib/prima/physics.mjs";

const geometry = createPrimaGeometry();
const model = makeCircuitModel(PHYSICS_DEFAULTS, geometry);
const selectedId = process.argv[2] ?? geometry.defaultSelectedPixelId;
const origin = geometry.pixels.find(pixel => pixel.id === selectedId);
if (!origin) throw Error("Choose a pixel ID from P001 to P378.");

const coordinates = Array.from({ length: 501 }, (_, i) => i - 200);
const centerIndex = coordinates.indexOf(0);

function halfMaximumWidth(profile) {
  const half = profile[centerIndex] / 2;
  let left = centerIndex, right = centerIndex;
  while (left > 0 && profile[left] >= half) left--;
  while (right < profile.length - 1 && profile[right] >= half) right++;
  if (profile[left] >= half || profile[right] >= half) return null;
  const crossing = i => coordinates[i] + (half - profile[i]) / (profile[i + 1] - profile[i]);
  return crossing(right - 1) - crossing(left);
}

for (const separationUm of [0, 100, 200]) {
  const second = geometry.pixels.find(pixel =>
    Math.abs(pixel.yUm - origin.yUm) < 0.01 &&
    Math.abs(pixel.xUm - origin.xUm - separationUm) < 0.01);
  if (!second) continue; // The right-hand partner can lie outside the array.
  const illumination = Float64Array.from(geometry.pixels, pixel =>
    Number(pixel.id === selectedId || pixel.id === second.id));
  const result = solvePhysics({ ...PHYSICS_DEFAULTS, fieldGridSize: 31 }, illumination);
  const currents = Float64Array.from(result.pixelMetrics, pixel => pixel.snapshotCurrentUa * 1e-6);
  for (const gapUm of [20, 35, 60]) {
    const fieldAt = zUm => evaluateFields(model, geometry, currents, coordinates.map(x => ({
      xUm: origin.xUm + x, yUm: origin.yUm, zUm,
    })));
    const low = fieldAt(gapUm);
    const high = fieldAt(gapUm + PHYSICS_DEFAULTS.bipolarLengthUm);
    const profile = low.map((sample, i) => Math.abs(sample.potentialMv - high[i].potentialMv));
    const center = profile[centerIndex];
    const meanAtContacts = (center + profile[centerIndex + separationUm]) / 2;
    console.log(JSON.stringify({
      selectedId, secondId: second.id, separationUm, gapUm, centerDriveMv: center,
      centralLobeWidthUm: separationUm === 0 ? halfMaximumWidth(profile) : null,
      driveAt100UmFraction: profile[centerIndex + 100] / center,
      midpointFraction: separationUm ? profile[centerIndex + separationUm / 2] / meanAtContacts : null,
    }));
  }
}
