import {
  spectralWeight,
  createOpsin,
  advanceOpsin,
  opening,
  OPSINS,
} from "../../../workbench/optogenetics/src/advanced/opsins.js";
export { spectralWeight, createOpsin, advanceOpsin, opening, OPSINS };
export function opticalTransmission(depthUm, optical) {
  const muS =
    optical.scatteringMmInv *
    (optical.wavelengthNm / 590) ** -optical.reducedScatteringPower;
  return Math.exp(
    (-(optical.absorptionMmInv + muS) * Math.max(0, depthUm)) / 1000,
  );
}
export function pulseAt(t, width, frequency, delay = 0) {
  return t >= delay && (t - delay) % (1000 / frequency) < width ? 1 : 0;
}
/** Lumped absorbed-energy balance per unit illuminated area. Scattering is not heat. */
export function thermalTrace(
  {
    irradianceMwMm2,
    absorptionMmInv,
    tissueThicknessUm,
    thermalCapacityJMm3K,
    coolingMs,
    pulseMs,
    frequencyHz,
    delayMs = 0,
  },
  durationMs,
  dt = 0.1,
) {
  const thickness = tissueThicknessUm / 1000,
    absorbedFraction = -Math.expm1(-absorptionMmInv * thickness),
    capacity = thermalCapacityJMm3K * thickness;
  const timeMs = [],
    deltaK = [];
  let value = 0,
    energyJMm2 = 0;
  for (let t = 0; t < durationMs - 1e-10; ) {
    const h = Math.min(dt, durationMs - t),
      power =
        irradianceMwMm2 *
        1e-3 *
        absorbedFraction *
        pulseAt(t + h / 2, pulseMs, frequencyHz, delayMs);
    const steady = (power * (coolingMs / 1000)) / capacity;
    value = steady + (value - steady) * Math.exp(-h / coolingMs);
    energyJMm2 += (power * h) / 1000;
    t += h;
    timeMs.push(t);
    deltaK.push(value);
  }
  return {
    timeMs,
    deltaK,
    peakDeltaK: Math.max(0, ...deltaK),
    absorbedEnergyJMm2: energyJMm2,
    absorbedFraction,
    model:
      "Lumped Beer–Lambert absorption + assumed cooling time; no spatial heat transport, perfusion, ocular exposure limit or safety determination.",
  };
}
