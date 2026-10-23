/**
 * RPNI design laboratory: an explicitly exploratory equivalent-source model.
 *
 * Coordinates are mm; biological time is days; electrical time is ms; source
 * current is microampere (µA); conductivity is S/m; potentials are microvolt
 * (µV). x follows muscle fibers, y separates grafts, z is graft thickness.
 *
 * A graft bounds source placement, not the conducting domain. The electrical
 * domain is an infinite, homogeneous, diagonal-anisotropic conductor. It has
 * no graft/host boundary, insulating package, electrode impedance, membrane
 * excitability, stimulation recruitment, fatigue, or force model.
 *
 * Each equivalent motor unit comprises three weighted representative fibers.
 * Two prescribed, oppositely traveling (+1,-2,+1) source tripoles per fiber
 * remain net-zero-current at every time, including their onset/end tapers.
 * These are prescribed sources, not a membrane action-potential solution.
 *
 * Numerical verification of this implementation is not RPNI validation.
 */
export const MODEL_VERSION = '1.0.0';

const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const finite = (x, fallback) => typeof x === 'number' && Number.isFinite(x) ? x : fallback;
const mean = xs => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
const sum = xs => xs.reduce((s, x) => s + x, 0);
const smooth = x => { const u = clamp(x); return u * u * (3 - 2 * u); };
const norm = a => Math.hypot(...a);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const rms = a => Math.sqrt(mean(a.map(x => x * x)));
const quantile = (values, p) => {
  if (!values.length) return null;
  const a = [...values].sort((x, y) => x - y), q = clamp(p) * (a.length - 1), i = Math.floor(q);
  return a[i] + (a[Math.min(i + 1, a.length - 1)] - a[i]) * (q - i);
};
const band = a => ({ low: quantile(a, .1), median: quantile(a, .5), high: quantile(a, .9) });

export const DEFAULT_CONFIG = Object.freeze({
  moduleCount: 2, graftLengthMm: 30, graftWidthMm: 15, graftThicknessMm: 5,
  moduleGapMm: 10, nerveDiameterMm: 2, insertionDepthMm: 5,
  motorUnitsPerModule: 24, routingFidelity: 1, territoryRadiusMm: 1.2,
  electrodeSpacingMm: 8, electrodeOffsetMm: 2, electrodeLateralMm: 0,
  electrodeDepthMm: 1, contactRadiusMm: .4, contactOrder: 3,
  sigmaLongitudinalSm: .5, sigmaTransverseSm: .1,
  sourceAmplitudeUa: 1, sourceRadiusMm: .15, poleSpacingMm: 1,
  conductionVelocityMps: 3, regenerationLagDays: 7, axonSpeedMmDay: 1,
  nmjMaturationDays: 21, sourceAvailability: 1,
  durationDays: 180, observationDay: 120, targetModule: 0,
  targetDrive: .7, otherDrive: .7, minFiringHz: 8, maxFiringHz: 24,
  noiseRmsUv: 5, sampleRateHz: 8000, kernelOversampling: 4, traceDurationMs: 400,
  oxygenDiffusivityMm2S: .002, oxygenConsumptionPerS: .01, seed: 2048,
});

const meta = (label, unit, min, max, step, group, sourceClass, note) => ({ label, unit, min, max, step, group, sourceClass, note });
export const PARAMETER_META = Object.freeze({
  moduleCount: meta('Separate muscle grafts', '', 1, 4, 1, 'geometry', 'design', 'Each rectangular graft receives one terminal nerve and one differential recording channel.'),
  graftLengthMm: meta('Graft length', 'mm', 8, 80, 1, 'geometry', 'evidence-context', '30 × 15 × 5 mm is a harvested human graft example in Vu et al. 2020. Dimensions here are editable and are not an optimized implant prescription.'),
  graftWidthMm: meta('Graft width', 'mm', 3, 40, .5, 'geometry', 'evidence-context', 'A rectangular placement envelope, with x-aligned representative muscle fibers. Real implanted graft geometry is not reconstructed.'),
  graftThicknessMm: meta('Graft thickness', 'mm', .5, 15, .25, 'geometry', 'evidence-context', 'Controls geometry and the separate steady slab transport diagnostic. Does not automatically determine survival.'),
  moduleGapMm: meta('Gap between graft edges', 'mm', 0, 50, 1, 'geometry', 'design', 'Actual edge-to-edge spacing in y. The same coordinates drive the electrical calculation and anatomy view.'),
  nerveDiameterMm: meta('Nerve diameter', 'mm', .2, 6, .1, 'geometry', 'design', 'An illustrative terminal nerve envelope. Diameter does not set an anatomical motor-axon count or source amplitude.'),
  insertionDepthMm: meta('Nerve insertion depth', 'mm', 0, 30, .5, 'geometry', 'design', 'The terminal nerve tip is the origin of the assumed intragraft regrowth path; there is no distal nerve stump.'),
  motorUnitsPerModule: meta('Equivalent units per graft', 'units', 1, 64, 1, 'sources', 'numerical', 'A representative equivalent-source cohort, not measured motor-unit number. Changing it changes total source power.'),
  routingFidelity: meta('Same-pool allocation', 'fraction', 0, 1, .05, 'sources', 'assumption', 'Probability that a physical graft source retains its correspondingly labeled command pool. Off-label allocations are synthetic; no fascicle identification or surgical efficacy is predicted.'),
  territoryRadiusMm: meta('Equivalent territory radius', 'mm', 0, 8, .1, 'sources', 'assumption', 'Three weighted representative fibers span each territory. This is a reduced spatial quadrature, not a histologic fiber census.'),
  electrodeSpacingMm: meta('Bipolar center spacing', 'mm', 0, 60, .25, 'electrodes', 'design', 'Positive and negative contacts differ along x; zero spacing is the exact common-mode cancellation control.'),
  electrodeOffsetMm: meta('Pair midpoint along fibers', 'mm', -35, 35, .25, 'electrodes', 'design', 'Midpoint x relative to each graft center. Geometry normalization keeps contact disks within the rectangular planform.'),
  electrodeLateralMm: meta('Pair lateral offset', 'mm', -18, 18, .25, 'electrodes', 'design', 'Midpoint y relative to each graft center; both contacts lie in the x-y plane.'),
  electrodeDepthMm: meta('Contact depth below top', 'mm', 0, 15, .1, 'electrodes', 'design', '0 is the top graft face. This controls physical position; it does not specify an insertion procedure.'),
  contactRadiusMm: meta('Contact disk radius', 'mm', 0, 3, .05, 'electrodes', 'design', 'Area-averaged extracellular potential over a disk. Electrode-tissue impedance and contact polarization are not modeled.'),
  contactOrder: meta('Contact quadrature order', '', 1, 6, 1, 'numerics', 'numerical', 'Gauss integration in squared radius with 4 × order angular samples; refine to assess spatial averaging error.'),
  sigmaLongitudinalSm: meta('Longitudinal conductivity', 'S/m', .02, 2, .01, 'electrical', 'assumption', 'Constant conductivity along x throughout the infinite domain. An exploratory value, not a measured graft property.'),
  sigmaTransverseSm: meta('Transverse conductivity', 'S/m', .02, 2, .01, 'electrical', 'assumption', 'Constant conductivity along y and z throughout the domain. No muscle-host discontinuity is resolved.'),
  sourceAmplitudeUa: meta('Equivalent tripole current', 'µA', 0, 20, .1, 'electrical', 'assumption', 'Nominal current scale of one unit; each traveling tripole receives half this scale, distributed across three weighted fibers. Absolute amplitudes require calibration.'),
  sourceRadiusMm: meta('Source regularization radius', 'mm', .02, 2, .01, 'electrical', 'assumption', 'Smooth ellipsoidal source core in conductivity-transformed coordinates. Explicitly limits point-source singularities; not an anatomical fiber radius.'),
  poleSpacingMm: meta('Tripole pole spacing', 'mm', .1, 4, .1, 'electrical', 'assumption', 'Prescribed +1, −2, +1 source separation. Current balance holds through onset and endpoint tapers.'),
  conductionVelocityMps: meta('Prescribed muscle wave speed', 'm/s', .5, 8, .1, 'electrical', 'assumption', 'Speed of the equivalent traveling muscle source; distinct from axonal regrowth in mm/day. No membrane dynamics are solved.'),
  regenerationLagDays: meta('Regrowth onset lag', 'days', 0, 90, 1, 'remodeling', 'assumption', 'An assumed postconstruction delay before growth from the terminal nerve tip.'),
  axonSpeedMmDay: meta('Assumed intragraft regrowth', 'mm/day', 0, 5, .1, 'remodeling', 'assumption', 'Arrival is lag + straight branch length / speed. No mechanistic axon guidance or biological calibration is implied.'),
  nmjMaturationDays: meta('Source maturation constant', 'days', .5, 180, 1, 'remodeling', 'assumption', 'After assumed arrival, equivalent source amplitude rises exponentially. This is not a validated NMJ formation or force-recovery law.'),
  sourceAvailability: meta('Available source-amplitude fraction', 'fraction', 0, 1, .05, 'remodeling', 'assumption', 'An independently imposed amplitude multiplier. It is not an oxygen-derived viability, surviving-cell fraction, or clinical success probability.'),
  durationDays: meta('Biological observation horizon', 'days', 1, 730, 1, 'remodeling', 'scenario', 'Time since construction; independent of the millisecond recording window.'),
  observationDay: meta('Recording day', 'days', 0, 730, 1, 'recording', 'scenario', 'Source maturation is evaluated on this day for the finite stochastic recording.'),
  targetModule: meta('Target command pool', '', 0, 3, 1, 'recording', 'scenario', 'Zero-based source-pool label used for target versus other decomposition, not an anatomical motor-function identity.'),
  targetDrive: meta('Target pool drive', 'fraction', 0, 1, .05, 'recording', 'assumption', 'Drives synthetic threshold recruitment and independent Poisson event trains; no descending neural control model is included.'),
  otherDrive: meta('Other pools drive', 'fraction', 0, 1, .05, 'recording', 'assumption', 'The same drive is applied to every non-target labeled source pool. Zero provides a target-only experiment.'),
  minFiringHz: meta('Rate at recruitment', 'Hz', 1, 40, 1, 'recording', 'assumption', 'Poisson event-rate assumption, not a measurement of reinnervated motor neurons. No refractory period, fatigue or synchronization is modeled.'),
  maxFiringHz: meta('Rate at full drive', 'Hz', 1, 60, 1, 'recording', 'assumption', 'Synthetic recruitment thresholds range from 0 to 0.8, with linear rate increase above threshold.'),
  noiseRmsUv: meta('Independent channel noise RMS', 'µV', 0, 100, .5, 'recording', 'assumption', 'User-imposed white Gaussian noise, independent between channels. Not an empirical implant noise floor or impedance prediction.'),
  sampleRateHz: meta('Recording sample rate', 'Hz', 1000, 12000, 1000, 'numerics', 'numerical', 'Finite trace sampling rate. Source kernels are independently oversampled and interpolated at fractional event times; no antialias filter is imposed.'),
  kernelOversampling: meta('Source waveform oversampling', 'factor', 1, 8, 1, 'numerics', 'numerical', 'Source kernels use this many steps per recording sample. Expected variance integrates the piecewise-linear kernel exactly; refine independently to assess waveform error.'),
  traceDurationMs: meta('Recording window', 'ms', 50, 2000, 50, 'recording', 'scenario', 'A finite realization of prescribed equivalent sources; mean is removed separately from each command-pool trace.'),
  oxygenDiffusivityMm2S: meta('Slab diffusivity', 'mm²/s', .0001, .02, .0001, 'transport', 'assumption', 'Exploratory transport coefficient in D c″ − k c = 0; fixed bath concentrations on the two thickness faces.'),
  oxygenConsumptionPerS: meta('First-order consumption', 's⁻¹', 0, .2, .001, 'transport', 'assumption', 'Consumption is k × concentration. This exact steady 1D diagnostic omits capillaries, convection, zero-order metabolism and survival thresholds.'),
  seed: meta('Random seed', '', 0, 4294967295, 1, 'numerics', 'numerical', 'Reproducible territories, routing, source strengths, Poisson events and channel noise. Seeds index synthetic realizations, not patients.'),
});

const preset = (id, label, description, changes) => ({ id, label, description, config: { ...DEFAULT_CONFIG, ...changes } });
export const PRESETS = Object.freeze([
  preset('paired-reference', 'Paired graft reference', 'Two separately labeled grafts with finite bipolar contacts; all nongeometric values are exploratory.', {}),
  preset('separated', 'Wider graft spacing', 'Increase separation while preserving the source realization and recording assumptions.', { moduleGapMm: 25 }),
  preset('compact', 'Compact two-graft layout', 'Place graft faces close together to inspect geometry-dependent mixing.', { moduleGapMm: 1 }),
  preset('thin-graft', 'Thin transport comparison', 'Reduce thickness and inspect both placement effects and the independent exact slab concentration ratio.', { graftThicknessMm: 2, territoryRadiusMm: .45, electrodeDepthMm: .35 }),
  preset('routing-mixed', 'Mixed command allocation', 'Assign some physical-graft sources to other labeled command pools; a synthetic routing stress test.', { routingFidelity: .65 }),
]);

export function normalizeConfig(input = {}) {
  const supplied = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const c = { ...DEFAULT_CONFIG };
  for (const [key, p] of Object.entries(PARAMETER_META)) c[key] = clamp(finite(supplied[key], c[key]), p.min, p.max);
  for (const k of ['moduleCount', 'motorUnitsPerModule', 'contactOrder', 'kernelOversampling', 'targetModule', 'seed', 'sampleRateHz']) c[k] = Math.round(c[k]);
  c.contactRadiusMm = Math.min(c.contactRadiusMm, c.graftWidthMm / 4, c.graftLengthMm / 8);
  c.electrodeSpacingMm = Math.min(c.electrodeSpacingMm, Math.max(0, c.graftLengthMm - 2 * c.contactRadiusMm));
  const xRoom = Math.max(0, c.graftLengthMm / 2 - c.electrodeSpacingMm / 2 - c.contactRadiusMm);
  c.electrodeOffsetMm = clamp(c.electrodeOffsetMm, -xRoom, xRoom);
  c.electrodeLateralMm = clamp(c.electrodeLateralMm, -c.graftWidthMm / 2 + c.contactRadiusMm, c.graftWidthMm / 2 - c.contactRadiusMm);
  c.electrodeDepthMm = Math.min(c.electrodeDepthMm, c.graftThicknessMm);
  c.nerveDiameterMm = Math.min(c.nerveDiameterMm, c.graftWidthMm, c.graftThicknessMm);
  c.insertionDepthMm = Math.min(c.insertionDepthMm, .45 * c.graftLengthMm);
  c.territoryRadiusMm = Math.min(c.territoryRadiusMm, .25 * c.graftWidthMm, .25 * c.graftThicknessMm);
  c.poleSpacingMm = Math.min(c.poleSpacingMm, .1 * c.graftLengthMm);
  c.observationDay = Math.min(c.observationDay, c.durationDays);
  c.targetModule = Math.min(c.targetModule, c.moduleCount - 1);
  c.maxFiringHz = Math.max(c.maxFiringHz, c.minFiringHz);
  return c;
}

/** Read-only validation. Strict mode rejects unknown/missing keys and clamping. */
export function validateConfig(input, { strict = false } = {}) {
  const errors = [], warnings = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { valid: false, errors: ['Configuration must be an object.'], warnings, config: normalizeConfig() };
  const c = normalizeConfig(input);
  for (const key of Object.keys(input)) {
    if (!(key in DEFAULT_CONFIG)) { if (strict) errors.push(`Unknown configuration key: ${key}.`); else warnings.push(`Ignored unknown configuration key: ${key}.`); }
    else if (typeof input[key] !== 'number' || !Number.isFinite(input[key])) errors.push(`${key} must be a finite number.`);
    else if (input[key] !== c[key]) (strict ? errors : warnings).push(`${key} adjusted from ${input[key]} to ${c[key]} to satisfy geometry or numeric bounds.`);
  }
  if (strict) for (const key of Object.keys(DEFAULT_CONFIG)) if (!(key in input)) errors.push(`Missing configuration key: ${key}.`);
  return { valid: errors.length === 0, errors, warnings, config: c };
}

/** Mulberry32; event/source/noise streams are intentionally separated. */
export function createRng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const normal = rng => Math.sqrt(-2 * Math.log(Math.max(1e-15, rng()))) * Math.cos(2 * Math.PI * rng());

export function buildGeometry(input = {}) {
  const c = normalizeConfig(input), modules = [], contacts = [], channels = [];
  for (let m = 0; m < c.moduleCount; m++) {
    const y = (m - (c.moduleCount - 1) / 2) * (c.graftWidthMm + c.moduleGapMm);
    modules.push({ id: m, label: `Graft ${m + 1}`, shape: 'rectangular-graft', centerMm: [0, y, 0], dimensionsMm: [c.graftLengthMm, c.graftWidthMm, c.graftThicknessMm], nerveEntryMm: [-c.graftLengthMm / 2, y, 0], nerveTipMm: [-c.graftLengthMm / 2 + c.insertionDepthMm, y, 0], nerveDiameterMm: c.nerveDiameterMm });
    for (const [polarity, sign] of [['positive', 1], ['negative', -1]]) contacts.push({ id: `g${m}-${polarity}`, moduleId: m, polarity, positionMm: [c.electrodeOffsetMm + sign * c.electrodeSpacingMm / 2, y + c.electrodeLateralMm, c.graftThicknessMm / 2 - c.electrodeDepthMm], normal: [0, 0, 1], radiusMm: c.contactRadiusMm });
    channels.push({ id: `ch${m}`, moduleId: m, label: `Graft ${m + 1} bipolar`, positiveContactId: `g${m}-positive`, negativeContactId: `g${m}-negative` });
  }
  const yExtent = (c.moduleCount * c.graftWidthMm + (c.moduleCount - 1) * c.moduleGapMm) / 2;
  return { axes: { x: 'muscle-fiber direction', y: 'inter-graft direction', z: 'graft thickness' }, unit: 'mm', modules, contacts, channels, boundsMm: { min: [-c.graftLengthMm / 2 - 8, -yExtent, -c.graftThicknessMm / 2], max: [c.graftLengthMm / 2, yExtent, c.graftThicknessMm / 2] }, conductor: 'infinite-homogeneous-anisotropic', boundariesAffectElectricalField: false };
}

function createMotorUnits(c, geometry) {
  const units = [];
  for (const module of geometry.modules) for (let j = 0; j < c.motorUnitsPerModule; j++) {
    const id = `mu${module.id}-${j}`, index = module.id * c.motorUnitsPerModule + j;
    const rng = createRng((c.seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0);
    const x = (rng() - .5) * .30 * c.graftLengthMm;
    const radius = Math.sqrt(rng()), theta = 2 * Math.PI * rng(), r = c.territoryRadiusMm;
    const y = module.centerMm[1] + radius * Math.cos(theta) * Math.max(0, c.graftWidthMm / 2 - r - .1);
    const z = radius * Math.sin(theta) * Math.max(0, c.graftThicknessMm / 2 - r - .1);
    const territoryCenterMm = [x, y, z], phase = 2 * Math.PI * rng();
    const sourceScale = Math.exp(.24 * normal(rng) - .5 * .24 ** 2);
    const routeDraw = rng(), otherDraw = rng();
    let sourcePoolId = module.id;
    if (c.moduleCount > 1 && routeDraw >= c.routingFidelity) {
      const others = geometry.modules.filter(m => m.id !== module.id);
      sourcePoolId = others[Math.min(others.length - 1, Math.floor(otherDraw * others.length))].id;
    }
    const pathLengthMm = distance(module.nerveTipMm, territoryCenterMm);
    const arrivalDay = c.axonSpeedMmDay > 0 ? c.regenerationLagDays + pathLengthMm / c.axonSpeedMmDay : null;
    const members = [-1, 0, 1].map((offset, k) => {
      const yy = y + offset * r * Math.cos(phase), zz = z + offset * r * Math.sin(phase);
      return { id: `${id}-f${k}`, weight: 1 / 3, endplateMm: [x, yy, zz], fiberStartMm: [-.47 * c.graftLengthMm, yy, zz], fiberEndMm: [.47 * c.graftLengthMm, yy, zz] };
    });
    const recruitmentThreshold = .8 * (j + .5) / c.motorUnitsPerModule;
    const drive = sourcePoolId === c.targetModule ? c.targetDrive : c.otherDrive;
    const rateHz = drive > recruitmentThreshold ? c.minFiringHz + (c.maxFiringHz - c.minFiringHz) * (drive - recruitmentThreshold) / (1 - recruitmentThreshold) : 0;
    const eventRng = createRng((c.seed ^ Math.imul(index + 1, 0x85ebca6b) ^ 0xb5297a4d) >>> 0), spikeTimesMs = [];
    if (rateHz > 0) {
      let t = -1000;
      while (t < c.traceDurationMs) {
        t += -1000 * Math.log(Math.max(1e-15, 1 - eventRng())) / rateHz;
        if (t >= -200 && t <= c.traceDurationMs) spikeTimesMs.push(t);
      }
    }
    units.push({ id, index, moduleId: module.id, sourcePoolId, territoryCenterMm, territoryRadiusMm: r, fiberStartMm: members[1].fiberStartMm, fiberEndMm: members[1].fiberEndMm, members, pathLengthMm, arrivalDay, sourceScale, routeDraw, recruitmentThreshold, drive, rateHz, spikeTimesMs });
  }
  return units;
}

function conductivityParts(conductivity) {
  const longitudinalSm = conductivity?.longitudinalSm ?? conductivity?.sigmaLongitudinalSm;
  const transverseSm = conductivity?.transverseSm ?? conductivity?.sigmaTransverseSm;
  if (!(longitudinalSm > 0) || !(transverseSm > 0) || !Number.isFinite(longitudinalSm + transverseSm)) throw new RangeError('Conductivities must be finite and positive in S/m.');
  return { longitudinalSm, transverseSm, rootDet: Math.sqrt(longitudinalSm * transverseSm ** 2), geometricMean: Math.cbrt(longitudinalSm * transverseSm ** 2) };
}

/**
 * Infinite-conductor Green function, returned in µV.
 * G = 1 / [4π sqrt(det Σ) sqrt(rᵀΣ⁻¹r + a²/σ_g)].
 * a=0 is the exact point-source solution; a>0 is an explicit smooth source
 * regularization in conductivity-transformed coordinates (not a tissue layer).
 * The factor 1000 accounts for µA, mm and µV together.
 */
export function pointPotentialUv(sourcePositionMm, observationPositionMm, currentUa, conductivity, sourceRadiusMm = 0) {
  const s = conductivityParts(conductivity);
  if (!Array.isArray(sourcePositionMm) || !Array.isArray(observationPositionMm) || sourcePositionMm.length !== 3 || observationPositionMm.length !== 3 || ![...sourcePositionMm, ...observationPositionMm, currentUa, sourceRadiusMm].every(Number.isFinite) || sourceRadiusMm < 0) throw new TypeError('Potential inputs require finite 3D coordinates, current and nonnegative radius.');
  if (currentUa === 0) return 0;
  const dx = observationPositionMm[0] - sourcePositionMm[0], dy = observationPositionMm[1] - sourcePositionMm[1], dz = observationPositionMm[2] - sourcePositionMm[2];
  const q = dx * dx / s.longitudinalSm + (dy * dy + dz * dz) / s.transverseSm + sourceRadiusMm * sourceRadiusMm / s.geometricMean;
  if (q === 0) throw new RangeError('An unregularized point source is singular at its own position.');
  return 1000 * currentUa / (4 * Math.PI * s.rootDet * Math.sqrt(q));
}

function gaussLegendreUnit(n) {
  const nodes = [];
  for (let i = 0; i < n; i++) {
    let z = Math.cos(Math.PI * (i + .75) / (n + .5)), derivative = 0;
    for (let k = 0; k < 30; k++) {
      let p0 = 1, p1 = z;
      for (let j = 2; j <= n; j++) { const p2 = ((2 * j - 1) * z * p1 - (j - 1) * p0) / j; p0 = p1; p1 = p2; }
      if (n === 1) { p0 = 1; p1 = z; }
      derivative = n * (z * p1 - p0) / (z * z - 1);
      const next = z - p1 / derivative;
      if (Math.abs(next - z) < 1e-15) { z = next; break; }
      z = next;
    }
    nodes.push({ u: (1 + z) / 2, weight: 1 / ((1 - z * z) * derivative * derivative) });
  }
  return nodes;
}

/** Area-normalized disk quadrature; the returned weights sum to one. */
export function diskQuadrature(contact, order = 3) {
  if (!contact || !Array.isArray(contact.positionMm) || contact.positionMm.length !== 3 || !contact.positionMm.every(Number.isFinite) || !(contact.radiusMm >= 0) || !Number.isFinite(contact.radiusMm)) throw new TypeError('A disk contact needs finite positionMm and nonnegative radiusMm.');
  const n = Math.round(order);
  if (n < 1 || n > 16) throw new RangeError('Disk quadrature order must be 1–16.');
  if (contact.radiusMm === 0) return [{ positionMm: [...contact.positionMm], weight: 1 }];
  const rawNormal = contact.normal || [0, 0, 1], length = norm(rawNormal);
  if (!(length > 0) || !Number.isFinite(length)) throw new TypeError('Contact normal must be a finite, nonzero vector.');
  const normalVector = rawNormal.map(x => x / length), helper = Math.abs(normalVector[2]) < .9 ? [0, 0, 1] : [0, 1, 0];
  const a0 = cross(normalVector, helper), a = a0.map(x => x / norm(a0)), b = cross(normalVector, a), angular = 4 * n;
  const points = [];
  for (const radial of gaussLegendreUnit(n)) for (let j = 0; j < angular; j++) {
    const theta = 2 * Math.PI * j / angular, radius = contact.radiusMm * Math.sqrt(radial.u);
    points.push({ positionMm: contact.positionMm.map((v, k) => v + radius * (Math.cos(theta) * a[k] + Math.sin(theta) * b[k])), weight: radial.weight / angular });
  }
  return points;
}

/** Sum physical source currents, then area-average extracellular potential. */
export function contactPotentialUv(contact, sources, conductivity, { order = 3, sourceRadiusMm = 0 } = {}) {
  const points = diskQuadrature(contact, order);
  return sum(points.map(p => p.weight * sum(sources.map(s => pointPotentialUv(s.positionMm, p.positionMm, s.currentUa, conductivity, s.radiusMm ?? sourceRadiusMm)))));
}

/** The actual current-balanced prescribed sources used in both traces and view. */
export function sourceTripolesAt(unit, ageMs, input = DEFAULT_CONFIG) {
  const c = input, sources = [];
  if (!(ageMs >= 0) || !Number.isFinite(ageMs)) return sources;
  const a = c.poleSpacingMm, travel = c.conductionVelocityMps * ageMs;
  const birth = smooth(travel / a);
  if (birth === 0) return sources;
  for (const member of unit.members) for (const direction of [-1, 1]) {
    const x = member.endplateMm[0] + direction * travel;
    const remaining = direction < 0 ? x - member.fiberStartMm[0] : member.fiberEndMm[0] - x;
    const envelope = birth * smooth((remaining - a) / a);
    if (envelope <= 0) continue;
    const amplitude = .5 * c.sourceAmplitudeUa * unit.sourceScale * member.weight * envelope;
    for (const [offset, factor] of [[-1, 1], [0, -2], [1, 1]]) sources.push({ positionMm: [x + direction * offset * a, member.endplateMm[1], member.endplateMm[2]], currentUa: factor * amplitude, radiusMm: c.sourceRadiusMm, direction });
  }
  return sources;
}

/** Exact ∫a(t)b(t)dt of aligned piecewise-linear samples; dt supplied in ms. */
export function linearKernelInnerProduct(a, b, dtMs) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !(dtMs > 0) || !Number.isFinite(dtMs)) throw new TypeError('Kernel products require equal-length arrays and a finite positive step in ms.');
  let integral = 0;
  for (let j = 0; j < a.length - 1; j++) integral += 2 * a[j] * b[j] + a[j] * b[j + 1] + a[j + 1] * b[j] + 2 * a[j + 1] * b[j + 1];
  return integral * dtMs / 6000;
}

function makeKernels(c, geometry, units) {
  const parts = conductivityParts(c), inverseLong = 1 / parts.longitudinalSm, inverseTransverse = 1 / parts.transverseSm;
  const factor = 1000 / (4 * Math.PI * parts.rootDet), regularization = c.sourceRadiusMm ** 2 / parts.geometricMean;
  const contacts = geometry.contacts.map(contact => diskQuadrature(contact, c.contactOrder));
  const contactIndices = new Map(geometry.contacts.map((contact, i) => [contact.id, i]));
  const channelIndices = geometry.channels.map(channel => [contactIndices.get(channel.positiveContactId), contactIndices.get(channel.negativeContactId)]);
  const dtMs = 1000 / (c.sampleRateHz * c.kernelOversampling);
  return units.map(unit => {
    const farthest = Math.max(...unit.members.flatMap(f => [f.endplateMm[0] - f.fiberStartMm[0], f.fiberEndMm[0] - f.endplateMm[0]]));
    const durationMs = farthest / c.conductionVelocityMps, n = Math.ceil(durationMs / dtMs) + 1;
    const channels = geometry.channels.map(() => Array(n).fill(0));
    for (let t = 1; t < n; t++) {
      const sources = sourceTripolesAt(unit, t * dtMs, c);
      if (!sources.length) continue;
      const contactValues = contacts.map(points => {
        let value = 0;
        for (const point of points) {
          let potential = 0;
          for (const source of sources) {
            const dx = point.positionMm[0] - source.positionMm[0], dy = point.positionMm[1] - source.positionMm[1], dz = point.positionMm[2] - source.positionMm[2];
            potential += source.currentUa / Math.sqrt(dx * dx * inverseLong + (dy * dy + dz * dz) * inverseTransverse + regularization);
          }
          value += point.weight * potential;
        }
        return factor * value;
      });
      channelIndices.forEach(([positive, negative], channel) => { channels[channel][t] = contactValues[positive] - contactValues[negative]; });
    }
    // The convolution uses piecewise-linear interpolation, so integrate that
    // interpolant analytically rather than using a rectangular sample sum.
    // ∫linear(a)·linear(b)dt = Δt(2a0b0+a0b1+a1b0+2a1b1)/6.
    const crossEnergyUv2S = channels.map(a => channels.map(b => linearKernelInnerProduct(a, b, dtMs)));
    const energyUv2S = crossEnergyUv2S.map((row, i) => row[i]);
    return { unitId: unit.id, dtMs, durationMs, channels, energyUv2S, crossEnergyUv2S };
  });
}

export function sourceMaturityAt(unit, day, input = DEFAULT_CONFIG) {
  if (unit.arrivalDay === null || day <= unit.arrivalDay) return 0;
  return input.sourceAvailability * -Math.expm1(-(day - unit.arrivalDay) / input.nmjMaturationDays);
}

/** Exact steady first-order slab solution; this does not predict survival. */
export function oxygenSlab({ thicknessMm = DEFAULT_CONFIG.graftThicknessMm, diffusivityMm2S = DEFAULT_CONFIG.oxygenDiffusivityMm2S, consumptionPerS = DEFAULT_CONFIG.oxygenConsumptionPerS, points = 41 } = {}) {
  if (![thicknessMm, diffusivityMm2S, consumptionPerS].every(Number.isFinite) || thicknessMm < 0 || diffusivityMm2S <= 0 || consumptionPerS < 0) throw new RangeError('Slab thickness and consumption must be nonnegative and diffusivity positive.');
  const n = Math.max(3, Math.min(501, Math.round(points))), lambdaMm = consumptionPerS === 0 ? null : Math.sqrt(diffusivityMm2S / consumptionPerS);
  const halfThickness = thicknessMm / 2, a = lambdaMm === null ? 0 : halfThickness / lambdaMm;
  // cosh(b)/cosh(a) written using only nonpositive exponentials, stable for a≫1.
  const ratio = zMm => {
    if (a === 0) return 1;
    const b = Math.min(a, Math.abs(zMm) / lambdaMm);
    return (Math.exp(b - a) + Math.exp(-b - a)) / (1 + Math.exp(-2 * a));
  };
  return { thicknessMm, diffusivityMm2S, consumptionPerS, lambdaMm, thieleModulus: a, centerRatio: ratio(0), meanRatio: a === 0 ? 1 : Math.tanh(a) / a, profile: Array.from({ length: n }, (_, i) => { const zMm = -halfThickness + thicknessMm * i / (n - 1); return { zMm, ratio: ratio(zMm) }; }), boundaryCondition: 'c(-h/2) = c(+h/2) = c_b', equation: 'D c″ − k c = 0', interpretation: 'Relative concentration under fixed-bath, steady, one-dimensional first-order consumption assumptions; independent of the source-remodeling model and not a survival probability.' };
}

function signalMetrics(targetPower, otherPower, noisePower) {
  const cleanPower = Math.max(0, targetPower + otherPower), targetFraction = cleanPower > 0 ? clamp(targetPower / cleanPower) : null;
  return { rmsUv: Math.sqrt(cleanPower + noisePower), cleanRmsUv: Math.sqrt(cleanPower), targetRmsUv: Math.sqrt(Math.max(0, targetPower)), otherRmsUv: Math.sqrt(Math.max(0, otherPower)), noiseRmsUv: Math.sqrt(noisePower), snrDb: cleanPower > 0 && noisePower > 0 ? 10 * Math.log10(cleanPower / noisePower) : null, snrState: cleanPower === 0 ? 'no-signal' : noisePower === 0 ? 'no-noise' : 'finite', targetFraction, crosstalkFraction: targetFraction === null ? null : 1 - targetFraction, targetOtherDb: targetPower > 0 && otherPower > 0 ? 10 * Math.log10(targetPower / otherPower) : null };
}

/** Expected centered Poisson-source variance, not a finite-window measurement. */
export function sampleAt(result, requestedDay) {
  const c = result.config, day = clamp(finite(requestedDay, c.observationDay), 0, c.durationDays), power = result.geometry.channels.map(() => [0, 0]);
  let arrivedUnits = 0, maturity = 0;
  result.motorUnits.forEach((unit, i) => {
    if (unit.arrivalDay !== null && day >= unit.arrivalDay) arrivedUnits++;
    const amplitude = sourceMaturityAt(unit, day, c);
    maturity += amplitude;
    const side = unit.sourcePoolId === c.targetModule ? 0 : 1;
    power.forEach((row, ch) => { row[side] += unit.rateHz * amplitude ** 2 * result.sourceKernels[i].energyUv2S[ch]; });
  });
  const channels = result.geometry.channels.map((channel, ch) => ({ id: channel.id, moduleId: channel.moduleId, ...signalMetrics(power[ch][0], power[ch][1], c.noiseRmsUv ** 2) }));
  return { day, arrivedUnits, totalUnits: result.motorUnits.length, matureSourceFraction: maturity / result.motorUnits.length, routingFraction: mean(result.motorUnits.map(u => +(u.sourcePoolId === u.moduleId))), oxygenCenterRatio: result.oxygen.centerRatio, oxygenMeanRatio: result.oxygen.meanRatio, channels, metricBasis: 'Expected centered variance of independent Poisson equivalent-source events; not measured RMS from the finite recording.' };
}

function sampleKernel(kernel, channel, ageMs) {
  const values = kernel.channels[channel], index = ageMs / kernel.dtMs, lo = Math.floor(index);
  if (lo < 0 || lo >= values.length - 1) return 0;
  return values[lo] + (values[lo + 1] - values[lo]) * (index - lo);
}

function matricesAt(result, day) {
  const c = result.config, n = result.geometry.channels.length, power = Array.from({ length: n }, () => Array(c.moduleCount).fill(0)), covariance = Array.from({ length: n }, () => Array(n).fill(0));
  result.motorUnits.forEach((u, i) => {
    const weight = u.rateHz * sourceMaturityAt(u, day, c) ** 2, kernel = result.sourceKernels[i];
    for (let ch = 0; ch < n; ch++) {
      power[ch][u.sourcePoolId] += weight * kernel.energyUv2S[ch];
      for (let other = 0; other < n; other++) covariance[ch][other] += weight * kernel.crossEnergyUv2S[ch][other];
    }
  });
  return { transferMatrix: power.map(row => row.map(Math.sqrt)), covarianceUv2: covariance, channelSimilarity: covariance.map((row, i) => row.map((value, j) => covariance[i][i] > 0 && covariance[j][j] > 0 ? clamp(value / Math.sqrt(covariance[i][i] * covariance[j][j]), -1, 1) : null)) };
}

function buildRecording(result, includeTrace = true) {
  const c = result.config, day = c.observationDay, dtMs = 1000 / c.sampleRateHz, count = Math.floor(c.traceDurationMs / dtMs) + 1;
  const matrices = matricesAt(result, day), definition = {
    transferMatrix: 'Expected RMS µV by recording channel (row) and labeled command pool (column), at the chosen drive and day; sqrt of summed independent-event variance, not a dimensionless efficacy score.',
    channelSimilarity: 'Signed expected clean-source correlation from the Gram matrix of weighted unit waveforms; null when either channel has no clean source variance.',
    trace: 'Finite seeded Poisson-source realization, each pool mean removed over this window; independent unfiltered white Gaussian channel noise added. No electrode impedance, recording filters, correlated interference or quantization is modeled.',
    rms: 'Finite demeaned-window RMS. It can differ from the independent-source expectation because the realization is short and stochastic.',
    snrDb: '20 log10(clean RMS / imposed-noise RMS); not RMS(active)/RMS(rest) from a clinical recording. Null when the ratio is zero or unbounded; snrState explains the case.',
  };
  if (!includeTrace) return { day, dtMs, timesMs: [], channels: [], metrics: [], ...matrices, metricDefinitions: definition };
  const timesMs = Array.from({ length: count }, (_, i) => i * dtMs);
  const pools = result.geometry.channels.map(() => Array.from({ length: c.moduleCount }, () => Array(count).fill(0)));
  result.motorUnits.forEach((unit, i) => {
    const amplitude = sourceMaturityAt(unit, day, c), kernel = result.sourceKernels[i];
    if (amplitude === 0 || unit.rateHz === 0 || c.sourceAmplitudeUa === 0) return;
    for (const spike of unit.spikeTimesMs) {
      const start = Math.max(0, Math.ceil(spike / dtMs)), end = Math.min(count - 1, Math.floor((spike + kernel.durationMs) / dtMs));
      for (let k = start; k <= end; k++) for (let ch = 0; ch < pools.length; ch++) pools[ch][unit.sourcePoolId][k] += amplitude * sampleKernel(kernel, ch, timesMs[k] - spike);
    }
  });
  for (const channel of pools) for (const pool of channel) { const offset = mean(pool); for (let i = 0; i < pool.length; i++) pool[i] -= offset; }
  const channels = result.geometry.channels.map((channel, ch) => {
    const rng = createRng((c.seed ^ Math.imul(ch + 1, 0xc2b2ae35) ^ 0x68e31da4) >>> 0);
    const targetUv = [...pools[ch][c.targetModule]], otherUv = timesMs.map((_, i) => sum(pools[ch].filter((_, pool) => pool !== c.targetModule).map(pool => pool[i])));
    const cleanUv = targetUv.map((v, i) => v + otherUv[i]), noiseUv = timesMs.map(() => c.noiseRmsUv * normal(rng));
    const noiseMean = mean(noiseUv); for (let i = 0; i < count; i++) noiseUv[i] -= noiseMean;
    const signalUv = cleanUv.map((v, i) => v + noiseUv[i]);
    return { id: channel.id, moduleId: channel.moduleId, signalUv, cleanUv, targetUv, otherUv, noiseUv, poolUv: pools[ch] };
  });
  const metrics = channels.map(channel => {
    const targetPower = rms(channel.targetUv) ** 2, otherPower = rms(channel.otherUv) ** 2, noisePower = rms(channel.noiseUv) ** 2, cleanPower = rms(channel.cleanUv) ** 2;
    const combined = signalMetrics(targetPower, otherPower, noisePower);
    // Finite realizations have cross terms: actual clean and total RMS must not
    // be replaced with quadrature sums of component RMS.
    return { id: channel.id, moduleId: channel.moduleId, ...combined, rmsUv: rms(channel.signalUv), cleanRmsUv: Math.sqrt(cleanPower), snrDb: cleanPower > 0 && noisePower > 0 ? 10 * Math.log10(cleanPower / noisePower) : null, snrState: cleanPower === 0 ? 'no-signal' : noisePower === 0 ? 'no-noise' : 'finite', targetOtherCovarianceUv2: mean(channel.targetUv.map((v, i) => v * channel.otherUv[i])), metricBasis: 'Finite-window component RMS; targetFraction uses targetPower/(targetPower+otherPower), which excludes finite-window cross terms.' };
  });
  return { day, dtMs, timesMs, channels, metrics, ...matrices, metricDefinitions: definition };
}

export function simulate(input = {}, { includeRecording = true } = {}) {
  const validation = validateConfig(input), config = validation.config, geometry = buildGeometry(config), motorUnits = createMotorUnits(config, geometry);
  const oxygen = oxygenSlab({ thicknessMm: config.graftThicknessMm, diffusivityMm2S: config.oxygenDiffusivityMm2S, consumptionPerS: config.oxygenConsumptionPerS });
  const sourceKernels = makeKernels(config, geometry, motorUnits);
  const warnings = [
    'Exploratory uncalibrated equivalent-source model. Numerical verification is not biological, clinical, or implant-design validation.',
    'All grafts share an infinite homogeneous anisotropic conductor; graft-host interfaces, tissue layers, package insulation and electrode impedance are omitted.',
    'Absolute voltage depends on assumed equivalent current, representative unit count, source core and imposed noise. No universal RPNI amplitude or signal-quality threshold is supplied.',
    'The independent slab diagnostic does not determine source survival or regenerative success; no oxygen threshold is mapped to viability.',
    ...validation.errors, ...validation.warnings,
  ];
  if (config.moduleCount === 1 && config.routingFidelity !== 1) warnings.push('With one graft there is only one source-pool label; same-pool allocation is necessarily 1.');
  if (config.electrodeSpacingMm < 2 * config.contactRadiusMm) warnings.push('Contact disks overlap in the placement envelope. The ideal potential-average calculation still applies, but overlapping physical contacts are not a realizable separate-electrode layout.');
  if (config.poleSpacingMm / config.conductionVelocityMps * config.sampleRateHz / 1000 < 1) warnings.push('Fewer than one sample spans a tripole pole-transit time; refine sample rate or broaden/slower the prescribed source before interpreting waveform detail.');
  const sourceCoreAlongXMm = config.sourceRadiusMm * Math.sqrt(config.sigmaLongitudinalSm / Math.cbrt(config.sigmaLongitudinalSm * config.sigmaTransverseSm ** 2));
  if (Math.min(config.poleSpacingMm, sourceCoreAlongXMm) / config.conductionVelocityMps * config.sampleRateHz * config.kernelOversampling / 1000 < 2) warnings.push('Fewer than two kernel steps span the smaller source-core or pole-transit scale. Near-contact fields may be temporally underresolved; refine waveform oversampling and compare before interpreting the result.');
  if (config.contactRadiusMm / config.contactOrder > config.sourceRadiusMm) warnings.push('The contact radius per quadrature order exceeds the source core scale. Near-contact averaging may require higher contact order; compare refinements rather than assuming global accuracy.');
  const result = { modelVersion: MODEL_VERSION, config, geometry, motorUnits, sourceKernels, samples: [], summary: null, recording: null, oxygen, warnings, assumptions: [
    'Rectangular free-muscle placement envelopes with one terminal nerve each; no nerve bridge and no distal reconnection.',
    'Three weighted representative fibers per equivalent motor unit, fixed straight x-oriented fibers and seeded territory locations.',
    'Two smoothly tapered, bidirectionally traveling current-balanced tripoles per representative fiber. Net instantaneous impressed source current is zero.',
    'The source regularizer is a smooth ellipsoidal core in conductivity-transformed coordinates, not a resolved fiber membrane or measured graft radius.',
    'Straight tip-to-territory regrowth at a selected constant speed after a selected lag; exponential source-amplitude maturation after assumed arrival.',
    'Independent Poisson source events and user-defined recruitment/rate assumptions; no refractory period, adaptation, synchronous drive or force.',
    'Area-averaged ideal disk contacts in an infinite conductor; positive-minus-negative bipolar measurement.',
    'The slab calculation solves steady D c″ − k c = 0 with equal fixed concentrations at the two thickness faces, ignoring vascular supply and lateral transport.',
  ], diagnostics: { calibrated: false, biologicalValidation: false, numericalMethod: 'Analytical anisotropic Green function + disk quadrature + sampled source waveform convolution', representativeFibersPerUnit: 3, totalEquivalentUnits: motorUnits.length, channels: geometry.channels.length, dtMs: 1000 / config.sampleRateHz, kernelDtMs: 1000 / (config.sampleRateHz * config.kernelOversampling), contactSamples: 4 * config.contactOrder ** 2, sourceCurrentBalance: 'Each traveling tripole sums +I − 2I + I = 0 exactly before floating-point summation.', tissueBoundaryConditionsResolved: false, oxygenCoupledToMaturation: false, seedInterpretation: 'Synthetic structural/event/noise realization, not a patient or a clinical confidence interval.' } };
  const step = Math.max(1, Math.ceil(config.durationDays / 365));
  for (let day = 0; day < config.durationDays; day += step) result.samples.push(sampleAt(result, day));
  result.samples.push(sampleAt(result, config.durationDays));
  result.summary = sampleAt(result, config.observationDay);
  result.recording = buildRecording(result, includeRecording);
  return result;
}

/** Model-derived activity for rendering; no decorative random firing. */
export function activityAt(result, requestedDay, requestedTimeMs = 0) {
  const c = result.config, day = clamp(finite(requestedDay, c.observationDay), 0, c.durationDays), timeMs = clamp(finite(requestedTimeMs, 0), 0, c.traceDurationMs);
  const units = result.motorUnits.map((unit, i) => {
    const maturity = sourceMaturityAt(unit, day, c), growthFraction = c.axonSpeedMmDay === 0 ? 0 : unit.pathLengthMm === 0 ? +(day >= c.regenerationLagDays) : clamp(Math.max(0, day - c.regenerationLagDays) * c.axonSpeedMmDay / unit.pathLengthMm);
    const activeEvents = unit.spikeTimesMs.filter(t => t <= timeMs && timeMs - t <= result.sourceKernels[i].durationMs);
    const sourceEvents = activeEvents.map(t => ({ ageMs: timeMs - t, sources: sourceTripolesAt(unit, timeMs - t, c) })).filter(e => e.sources.length > 0);
    const last = sourceEvents.at(-1), traveled = last ? last.ageMs * c.conductionVelocityMps : 0;
    const wavefrontsMm = last ? [-1, 1].map(direction => clamp(unit.territoryCenterMm[0] + direction * traveled, unit.fiberStartMm[0], unit.fiberEndMm[0])) : [];
    const envelope = last ? Math.min(1, sum(last.sources.map(s => Math.abs(s.currentUa))) / Math.max(1e-30, 4 * c.sourceAmplitudeUa * unit.sourceScale)) : 0;
    return { id: unit.id, moduleId: unit.moduleId, sourcePoolId: unit.sourcePoolId, growthFraction, arrived: unit.arrivalDay !== null && day >= unit.arrivalDay, maturity, activation: maturity * envelope, wavefrontsMm, activeEventAgesMs: sourceEvents.map(e => e.ageMs) };
  });
  return { day, timeMs, units, recordingDay: result.recording.day, matchesRecordingDay: Math.abs(day - result.recording.day) < 1e-9 };
}

export function runSweep(input = {}, parameter, values) {
  if (!(parameter in PARAMETER_META) || ['seed', 'durationDays'].includes(parameter)) throw new RangeError('Choose a supported design/source parameter for the sweep.');
  if (!Array.isArray(values) || values.length < 2 || values.length > 12 || !values.every(Number.isFinite)) throw new RangeError('A sweep needs 2–12 finite parameter values.');
  const c = normalizeConfig(input);
  const points = values.map(value => {
    const r = simulate({ ...c, [parameter]: value }, { includeRecording: false });
    return { requestedValue: value, value: r.config[parameter], config: r.config, summary: r.summary, transferMatrix: r.recording.transferMatrix, channelSimilarity: r.recording.channelSimilarity };
  });
  return { modelVersion: MODEL_VERSION, parameter, unit: PARAMETER_META[parameter].unit, points, interpretation: 'One-at-a-time comparison with a common random seed. Source geometry and events remain paired where their defining parameters are unchanged. Geometry bounds may adjust dependent values, all retained in each point config. This is not an optimization or clinical performance ranking.' };
}

export function runEnsemble(input = {}, count = 8) {
  const c = normalizeConfig(input), n = clamp(Math.round(finite(count, 8)), 2, 32);
  const results = Array.from({ length: n }, (_, i) => simulate({ ...c, seed: (c.seed + Math.imul(i, 0x9e3779b9)) >>> 0 }, { includeRecording: false }));
  const channels = c.moduleCount;
  const endpoints = results.map(r => ({ seed: r.config.seed, summary: r.summary, transferMatrix: r.recording.transferMatrix }));
  return { modelVersion: MODEL_VERSION, count: n, n, seeds: results.map(r => r.config.seed), endpoints, rows: endpoints, summary: { matureSourceFraction: band(results.map(r => r.summary.matureSourceFraction)), routingFraction: band(results.map(r => r.summary.routingFraction)), channels: Array.from({ length: channels }, (_, ch) => ({ id: `ch${ch}`, cleanRmsUv: band(results.map(r => r.summary.channels[ch].cleanRmsUv)), targetRmsUv: band(results.map(r => r.summary.channels[ch].targetRmsUv)), otherRmsUv: band(results.map(r => r.summary.channels[ch].otherRmsUv)), targetFraction: band(results.map(r => r.summary.channels[ch].targetFraction).filter(Number.isFinite)) })) }, samples: results[0].samples.map((s, i) => ({ day: s.day, matureSourceFraction: band(results.map(r => r.samples[i].matureSourceFraction)), arrivedUnits: band(results.map(r => r.samples[i].arrivedUnits)) })), interpretation: '10th–90th percentiles across seeded synthetic territory/routing/source realizations under fixed input assumptions. These are not patient prediction, biological uncertainty, or clinical confidence intervals. Expected source variance is used; finite recordings are not generated for this comparison.' };
}
