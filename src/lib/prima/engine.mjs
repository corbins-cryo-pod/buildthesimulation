import { MODEL_VERSION, normalizeConfig, configurationId } from './model.mjs';
import { createPrimaGeometry } from './geometry.mjs';
import { solvePhysics } from './physics.mjs';
import { renderInput } from './stimuli.mjs';
import { predictPercept } from './percept.mjs';

function inPolygon(x, y, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[i], b = vertices[j];
    if ((a.yUm > y) !== (b.yUm > y) && x < (b.xUm - a.xUm) * (y - a.yUm) / (b.yUm - a.yUm) + a.xUm) inside = !inside;
  }
  return inside;
}

/** Pixel-area average of the projected raster. Both junctions share this irradiance assumption. */
export function samplePixelIllumination(image, geometry, implantWidthUm = 2000) {
  const stepX = implantWidthUm / image.width, stepY = implantWidthUm / image.height;
  const half = implantWidthUm / 2, values = image.values;
  return Float64Array.from(geometry.pixels, pixel => {
    const vertices = pixel.vertices;
    const xs = vertices.map(p => p.xUm), ys = vertices.map(p => p.yUm);
    const minCol = Math.max(0, Math.floor((Math.min(...xs) + half) / stepX));
    const maxCol = Math.min(image.width - 1, Math.ceil((Math.max(...xs) + half) / stepX));
    const minRow = Math.max(0, Math.floor((half - Math.max(...ys)) / stepY));
    const maxRow = Math.min(image.height - 1, Math.ceil((half - Math.min(...ys)) / stepY));
    let sum = 0, count = 0;
    for (let row = minRow; row <= maxRow; row++) for (let col = minCol; col <= maxCol; col++) {
      const x = -half + (col + 0.5) * stepX, y = half - (row + 0.5) * stepY;
      if (inPolygon(x, y, vertices)) { sum += values[row * image.width + col]; count++; }
    }
    if (count) return Math.max(0, Math.min(1, sum / count));
    const col = Math.max(0, Math.min(image.width - 1, Math.floor((pixel.xUm + half) / stepX)));
    const row = Math.max(0, Math.min(image.height - 1, Math.floor((half - pixel.yUm) / stepY)));
    return values[row * image.width + col];
  });
}

const maxAbs = values => { let value = 0; for (const n of values || []) value = Math.max(value, Math.abs(n)); return value; };
export async function simulateExperiment(input, { onProgress = () => {} } = {}) {
  const start = performance.now(), config = normalizeConfig(input);
  const report = (phase, progress, message) => onProgress({ phase, progress, message });
  report('projection', 0.02, 'Projecting the optical image onto the reconstructed array');
  const image = renderInput(config, config.imageSize), geometry = createPrimaGeometry(config);
  const illumination = samplePixelIllumination(image, geometry, config.implantWidthUm);
  geometry.pixels = geometry.pixels.map((pixel, index) => ({ ...pixel, illumination: illumination[index] }));
  report('percept', 0.09, 'Evaluating the pinned ProViSim image approximation');
  const percept = predictPercept(image, config);
  report('physics', 0.18, 'Solving the coupled photovoltaic circuits and shared return');
  const physics = await solvePhysics(config, illumination, (progress, message) => {
    if (typeof progress === 'object') report(progress.phase || 'physics', 0.18 + 0.77 * (progress.progress || 0), progress.message || 'Solving the photovoltaic model');
    else report('physics', 0.18 + 0.77 * (Number(progress) || 0), message || 'Solving the photovoltaic model');
  });
  let imageMean = 0;
  for (const value of image.values) imageMean += value;
  imageMean /= image.values.length;
  const dutyCycle = config.frequencyHz * config.pulseDurationMs / 1000;
  const metrics = {
    ...physics.metrics,
    pixelCount: geometry.pixels.length,
    illuminatedPixels: Array.from(illumination).filter(x => x > 1e-8 && config.irradianceMwMm2 > 0).length,
    nativePixelArcmin: config.pixelWidthUm / config.retinalScaleUmDeg * 60,
    nativeSnellenDenominator: 20 * config.pixelWidthUm / config.retinalScaleUmDeg * 60,
    implantFieldDeg: config.implantWidthUm / config.retinalScaleUmDeg,
    sceneFieldDeg: config.implantWidthUm / config.retinalScaleUmDeg / config.zoom,
    nominalNyquistCpd: config.retinalScaleUmDeg / (2 * config.pixelWidthUm),
    dutyCycle, projectedMean: imageMean,
    averageIncidentPowerMw: imageMean * config.implantWidthUm ** 2 / 1e6 * config.irradianceMwMm2 * dutyCycle,
    averageProjectionPowerMw: imageMean * config.implantWidthUm ** 2 / 1e6 * config.irradianceMwMm2 * dutyCycle,
    averageArrayIncidentPowerMw: physics.metrics.averageIncidentPowerMw,
    peakCurrentUa: maxAbs(physics.waveform?.currentUa),
    maxPotentialMv: maxAbs(physics.field?.potentialMv),
    maxBcDeltaMv: maxAbs(physics.field?.bcDeltaMv),
    elapsedMs: performance.now() - start,
  };
  const warnings = [...(physics.warnings || [])];
  if (config.contrastModel === 'sigmoid') warnings.push('The sigmoid contrast assumption has a nonzero black level; that display level is not spontaneous neural activation.');
  if (config.irradianceMwMm2 === 0) warnings.push('Optical stimulation is off. The percept panel remains a conditional image approximation and does not predict a visible percept without stimulation.');
  if (config.blurSigmaPx > 0) warnings.push('Projection blur is an illustrative image-space Gaussian, not a measured optical point-spread function.');
  const result = { config, geometry, input: image, percept, physics, metrics, warnings,
    experimentId: configurationId(config), modelVersion: MODEL_VERSION, elapsedMs: metrics.elapsedMs,
    provenance: { modelVersion: MODEL_VERSION, createdAt: new Date().toISOString(),
      percept: percept.provenance, physics: physics.provenance || physics.metadata,
      geometry: geometry.geometryStatus || 'Idealized 378-pixel reconstruction of the published device dimensions',
      opticalSampling: 'Area average over each idealized hexagonal pixel; both series junctions share the mean irradiance. Electrode shading and junction mismatch are not resolved.',
      coordinates: 'Retinal physical coordinates: x right, y superior, z into tissue from the implant. Image row 0 is superior.',
      interpretation: 'The ProViSim image approximation is independent of the circuit and field output. No patient-specific vision or safety prediction.',
      thermal: 'Incident optical power is calculated; tissue temperature and exposure compliance are not calculated.',
    },
  };
  report('complete', 1, 'Experiment complete');
  return result;
}
