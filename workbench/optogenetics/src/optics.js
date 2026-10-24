/**
 * Scalar local light exposure in mW/mm². Uniform field, or a fixed finite fiber
 * using a seeded, precomputed Monte Carlo solution of radiative transport.
 * No distance-only or painted cone approximation is used for neuron exposure.
 */
import { FIBER_KERNEL } from "./fiber-kernel.js";

 const OPTICAL_MODEL = Object.freeze({
  id: FIBER_KERNEL.id,
  wavelengthNm: 470,
  fiberDiameterUm: 100,
  numericalAperture: 0.22,
  refractiveIndex: FIBER_KERNEL.n,
  absorptionMmInv: FIBER_KERNEL.muAMmInv,
  scatteringMmInv: FIBER_KERNEL.muSMmInv,
  anisotropy: FIBER_KERNEL.g,
  photons: FIBER_KERNEL.photons,
  voxelSizeUm: FIBER_KERNEL.drMm * 1000,
  domain: Object.freeze({ radialMaxUm: FIBER_KERNEL.nr * FIBER_KERNEL.drMm * 1000,
    axialMinUm: FIBER_KERNEL.zMinMm * 1000,
    axialMaxUm: (FIBER_KERNEL.zMinMm + FIBER_KERNEL.nz * FIBER_KERNEL.dzMm) * 1000 }),
  assumption: 'Homogeneous infinite gray matter; embedded fiber source; no surface, vessel, sheath, heat or implant obstruction.',
});

function vector3(value, label) {
  if (!value || value.length !== 3 || !Array.from(value).every(Number.isFinite))
    throw new Error(`${label} must have three finite coordinates in µm.`);
  return Array.from(value);
}

 function sourceGeometry(config = {}) {
  const kind = config.kind ?? 'uniform';
  if (kind !== 'uniform' && kind !== 'fiber') throw new Error('Unknown optical source.');
  if (config.wavelengthNm !== undefined && config.wavelengthNm !== 470)
    throw new Error('Only the 470 nm source preset is implemented.');
  if (config.diameterUm !== undefined && config.diameterUm !== 100)
    throw new Error('The transport kernel supports a 100 µm diameter fiber only.');
  if (config.na !== undefined && config.na !== 0.22)
    throw new Error('The transport kernel supports numerical aperture 0.22 only.');
  const positionUm = vector3(config.positionUm ?? [-150, 0, 0], 'Source position');
  const targetUm = vector3(config.targetUm ?? [0, 0, 0], 'Source target');
  const delta = targetUm.map((x, i) => x - positionUm[i]), length = Math.hypot(...delta);
  if (kind === 'fiber' && length < 1e-6) throw new Error('Fiber source and target must be distinct.');
  const direction = length > 0 ? delta.map(x => x / length) : [1, 0, 0];
  return { kind, positionUm, targetUm, direction, diameterUm: 100, na: 0.22,
    wavelengthNm: 470, refractiveIndex: FIBER_KERNEL.n };
}

/** The field is azimuthally averaged; rotation about the fiber axis has no effect. */
 function opticalCoordinates(pointUm, config) {
  const p = vector3(pointUm, 'Sample point'), source = sourceGeometry(config);
  const delta = p.map((x, i) => (x - source.positionUm[i]) / 1000);
  const axialMm = delta.reduce((s, x, i) => s + x * source.direction[i], 0);
  const radialMm = Math.hypot(...delta.map((x, i) => x - axialMm * source.direction[i]));
  const insideKernel = radialMm < FIBER_KERNEL.nr * FIBER_KERNEL.drMm
    && axialMm >= FIBER_KERNEL.zMinMm
    && axialMm < FIBER_KERNEL.zMinMm + FIBER_KERNEL.nz * FIBER_KERNEL.dzMm;
  return { axialMm, radialMm, insideKernel };
}

/** Bilinear interpolation of cylindrical voxel-center fluence tallies.
 * The first radial voxel is held to r=0; edge half voxels hold their closest
 * center. Beyond the recorded kernel, the returned value is explicitly zero.
 */
 function unitPowerFiberFluence(radialMm, axialMm) {
  if (!Number.isFinite(radialMm + axialMm) || radialMm < 0) throw new Error('Invalid optical coordinate.');
  const k = FIBER_KERNEL;
  if (radialMm >= k.nr * k.drMm || axialMm < k.zMinMm || axialMm >= k.zMinMm + k.nz * k.dzMm) return 0;
  const x = Math.max(0, Math.min(k.nr - 1, radialMm / k.drMm - 0.5));
  const y = Math.max(0, Math.min(k.nz - 1, (axialMm - k.zMinMm) / k.dzMm - 0.5));
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j;
  const i1 = Math.min(k.nr - 1, i + 1), j1 = Math.min(k.nz - 1, j + 1);
  const f = k.unitPowerFluence;
  return (1 - v) * ((1 - u) * f[j * k.nr + i] + u * f[j * k.nr + i1])
    + v * ((1 - u) * f[j1 * k.nr + i] + u * f[j1 * k.nr + i1]);
}

 function lightAt(pointUm, config = {}) {
  if ((config.kind ?? 'uniform') === 'uniform') {
    if (config.wavelengthNm !== undefined && config.wavelengthNm !== 470)
      throw new Error('Only 470 nm illumination is implemented.');
    const exposure = config.irradianceMwMm2 ?? 1;
    if (!Number.isFinite(exposure) || exposure < 0) throw new Error('Uniform exposure must be nonnegative and finite.');
    return exposure;
  }
  const powerMw = config.powerMw ?? 0.05;
  if (!Number.isFinite(powerMw) || powerMw < 0) throw new Error('Fiber power must be nonnegative and finite.');
  const { radialMm, axialMm } = opticalCoordinates(pointUm, config);
  return powerMw * unitPowerFiberFluence(radialMm, axialMm);
}








export { OPTICAL_MODEL, sourceGeometry, opticalCoordinates, unitPowerFiberFluence, lightAt };
