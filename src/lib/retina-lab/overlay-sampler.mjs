import { localPoint } from "./coordinates.mjs";

// Both backends consume the same signed samples and color-scale normalization.
export function overlaySampler(config, result, kind, frameIndex) {
  if (kind === "field") {
    const field =
      result.electrical?.field ?? result.photovoltaic?.physics.field;
    if (!field) return () => 0;
    let peak = 1e-10;
    for (const v of field.potentialMv) peak = Math.max(peak, Math.abs(v));
    return (xUm, yUm) => {
      const p = result.photovoltaic
        ? localPoint({ xUm, yUm }, config.placement)
        : { xUm, yUm };
      const u = (p.xUm - field.xUm[0]) / (field.xUm.at(-1) - field.xUm[0]);
      const v = (p.yUm - field.yUm[0]) / (field.yUm.at(-1) - field.yUm[0]);
      if (u < 0 || u > 1 || v < 0 || v > 1) return 0;
      return (
        field.potentialMv[
          Math.round(v * (field.height - 1)) * field.width +
            Math.round(u * (field.width - 1))
        ] / peak
      );
    };
  }
  const frame =
    result.neural.frames[
      Math.min(frameIndex ?? 0, result.neural.frames.length - 1)
    ];
  switch (kind) {
    case "light":
      return (_x, _y, i) => result.drive.incidentLight[i] / 4;
    case "damage":
      return (_x, _y, i) => 1 - result.neural.cells[i].survival.photoreceptor;
    case "heat":
      return () => (result.thermal?.peakDeltaK ?? 0) / 0.5;
    case "voltage":
      return (_x, _y, i) => (frame.voltageMv[i] + 70) / 35;
    case "synapses":
      return (_x, _y, i) => frame.bipolar[i];
    case "spikes":
      return (_x, _y, i) => frame.activity[i] / 2;
    default:
      return () => 0;
  }
}
