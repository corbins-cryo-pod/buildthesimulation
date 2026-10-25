/** Peripheral Nerve Laboratory 1.0.0.
 * Geometry: mm, currents: µA, extracellular/membrane voltages: mV, time: ms.
 * Homogeneous anisotropic regularized Green function + prescribed finite sources.
 * Passive, sealed-end, node-only cable. No threshold or active channel model.
 * See /simulations/peripheral-nerve/methods/ for assumptions and derivation.
 */
export const VERSION = '1.0.0';
export const DEFAULTS = Object.freeze({
  layout: 'directional', diameter: 2, angle: 35, clearance: .15, spacing: 2,
  intraX: .10, intraY: .05, amplitude: 40, width: .20, gap: .05,
  sigmaT: .2, sigmaL: .6, seed: 1871, dt: .002,
});
export const PRESETS = [
  { id: 'directional', name: 'Directional cuff', note: 'Two opposing 60° contacts at the same longitudinal position.', values: { layout: 'directional', amplitude: 40, angle: 35 } },
  { id: 'bipolar', name: 'Bipolar rings', note: 'A cathodic ring and an equal return, separated along the nerve.', values: { layout: 'bipolar', amplitude: 40, angle: 0 } },
  { id: 'tripolar', name: 'Tripolar rings', note: 'One central cathode with half-current returns on either side.', values: { layout: 'tripolar', amplitude: 40, angle: 0 } },
  { id: 'intra', name: 'Intrafascicular', note: 'A small disk source inside a fascicle with a remote return.', values: { layout: 'intra', amplitude: 2, intraX: .10, intraY: .05 } },
];
export const MODEL = Object.freeze({ coreMm: .025, nodeLengthUm: 1, gRatio: .6,
  spacingPerDiameter: 100, capacitanceDensity: 2, leakDensity: 1,
  rhoAxial: .7, halfLengthMm: 12, sourceWidthMm: .5, sourceRadiusMm: .04,
  startMs: .1, endMs: 1.2, representativeFibers: 168,
});
const bounds = {
  diameter: [1, 4], angle: [0, 360], clearance: [.05, .6], spacing: [.5, 4],
  intraX: [-1.8, 1.8], intraY: [-1.8, 1.8], amplitude: [0, 100], width: [.05, .4],
  gap: [0, .2], sigmaT: [.05, 1], sigmaL: [.05, 2], seed: [0, 4294967295], dt: [.0005, .002],
};
export function validateParameters(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Experiment parameters must be an object.');
  if (Object.keys(input).some(k => !(k in DEFAULTS))) throw new Error('Unknown experiment parameter.');
  const p = { ...DEFAULTS, ...input };
  if (!PRESETS.some(v => v.id === p.layout)) throw new Error('Unknown contact layout.');
  for (const [k, [lo, hi]] of Object.entries(bounds)) {
    if (typeof p[k] !== 'number' || !Number.isFinite(p[k]) || p[k] < lo || p[k] > hi) throw new Error(`${k} must be between ${lo} and ${hi}.`);
  }
  if (!Number.isInteger(p.seed)) throw new Error('Seed must be an integer.');
  if (![.002, .001, .0005].includes(p.dt)) throw new Error('Choose a supported time step.');
  if (p.layout === 'intra' && Math.hypot(p.intraX, p.intraY) + MODEL.sourceRadiusMm > p.diameter / 2) throw new Error('The intrafascicular disk must fit within the nerve outline.');
  if (p.layout === 'intra' && !fascicleGeometry(p.diameter / 2).some(f => Math.hypot(p.intraX - f.x, p.intraY - f.y) + MODEL.sourceRadiusMm <= f.r - .006)) throw new Error('Place the whole disk within one fascicle. Try X = 0 and Y = 0 for the central fascicle.');
  return p;
}
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function fascicleGeometry(radius) {
  return Array.from({ length: 7 }, (_, i) => {
    const angle = (i - 1) * Math.PI / 3 + .2;
    return { id: i, x: i ? .57 * radius * Math.cos(angle) : 0,
      y: i ? .57 * radius * Math.sin(angle) : 0, r: (i ? .225 : .25) * radius };
  });
}
export function makeAnatomy(params = DEFAULTS) {
  const p = validateParameters(params), random = seededRandom(p.seed), radius = p.diameter / 2;
  const fascicles = fascicleGeometry(radius);
  const fibers = [];
  for (const f of fascicles) {
    const placed = [];
    for (let j = 0; j < 24; j++) {
      const diameterUm = 4 + 12 * random();
      let point;
      for (let attempt = 0; attempt < 3000; attempt++) {
        const r = (f.r - .018) * Math.sqrt(random()), a = 2 * Math.PI * random();
        const x = f.x + r * Math.cos(a), y = f.y + r * Math.sin(a);
        if (placed.every(q => Math.hypot(x - q.x, y - q.y) > (diameterUm + q.diameterUm) / 2000 + .004)) { point = { x, y }; break; }
      }
      if (!point) throw new Error('Could not pack representative fibers.');
      const fiber = { id: fibers.length, fascicle: f.id, ...point, diameterUm, nodeOffset: random() - .5 };
      fibers.push(fiber); placed.push(fiber);
    }
  }
  return { radius, fascicles, fibers };
}
/** Uniform prescribed current over cylindrical source patches; no equipotential solve. */
export function makeContacts(p, order = 32) {
  if (!Number.isInteger(order) || order < 8 || order > 256) throw new Error('Source quadrature order must be 8–256.');
  const r = p.diameter / 2 + p.clearance, angle = p.angle * Math.PI / 180;
  const patch = (id, weight, centerZ, a, arc) => {
    const samples = [], axialN = Math.max(4, Math.round(order / 4));
    for (let i = 0; i < order; i++) for (let j = 0; j < axialN; j++) {
      const theta = a + ((i + .5) / order - .5) * arc;
      samples.push({ x: r * Math.cos(theta), y: r * Math.sin(theta), z: centerZ + ((j + .5) / axialN - .5) * MODEL.sourceWidthMm, fraction: 1 / (order * axialN) });
    }
    return { id, weight, z: centerZ, r, angle: a, arc, width: MODEL.sourceWidthMm, kind: 'cuff', samples };
  };
  if (p.layout === 'bipolar') return [patch('C−', -1, -p.spacing / 2, angle, 2 * Math.PI), patch('R+', 1, p.spacing / 2, angle, 2 * Math.PI)];
  if (p.layout === 'tripolar') return [patch('C−', -1, 0, angle, 2 * Math.PI), patch('R1+', .5, -p.spacing, angle, 2 * Math.PI), patch('R2+', .5, p.spacing, angle, 2 * Math.PI)];
  if (p.layout === 'directional') return [patch('C−', -1, 0, angle, Math.PI / 3), patch('R+', 1, 0, angle + Math.PI, Math.PI / 3)];
  const samples = [];
  for (let i = 0; i < order; i++) for (let j = 0; j < 4; j++) {
    const theta = (i + .5) / order * 2 * Math.PI, rr = MODEL.sourceRadiusMm * Math.sqrt((j + .5) / 4);
    samples.push({ x: p.intraX + rr * Math.cos(theta), y: p.intraY + rr * Math.sin(theta), z: 0, fraction: 1 / (order * 4) });
  }
  return [{ id: 'C−', weight: -1, x: p.intraX, y: p.intraY, z: 0, r: MODEL.sourceRadiusMm, kind: 'intra', samples }];
}
/** mV per µA; regularization is a stated model core, NOT convergence refinement. */
export function greenMvPerUa(point, source, sigmaT, sigmaL, core = MODEL.coreMm) {
  const dx = point.x - source.x, dy = point.y - source.y, dz = point.z - source.z;
  return 1 / (4 * Math.PI * sigmaT * Math.sqrt(sigmaL) * Math.sqrt((dx * dx + dy * dy + core * core) / sigmaT + dz * dz / sigmaL));
}
export function fieldAt(point, contacts, p) {
  let v = 0;
  for (const c of contacts) for (const q of c.samples) v += c.weight * q.fraction * greenMvPerUa(point, q, p.sigmaT, p.sigmaL);
  return v * p.amplitude;
}
export function makeCable(fiber, halfLength = MODEL.halfLengthMm) {
  const spacingMm = fiber.diameterUm * MODEL.spacingPerDiameter / 1000;
  const half = Math.ceil(halfLength / spacingMm), count = 2 * half + 1;
  const z = Array.from({ length: count }, (_, i) => (i - half + fiber.nodeOffset) * spacingMm);
  const axonUm = fiber.diameterUm * MODEL.gRatio;
  const areaUm2 = Math.PI * axonUm * MODEL.nodeLengthUm;
  const capacitanceNf = MODEL.capacitanceDensity * areaUm2 * 1e-5;
  const leakUs = MODEL.leakDensity * areaUm2 * 1e-5;
  const axialUs = Math.PI * (axonUm * 1e-6) ** 2 / (4 * MODEL.rhoAxial * spacingMm * 1e-3) * 1e6;
  return { z, spacingMm, capacitanceNf, leakUs, axialUs };
}
export function laplacian(v) {
  return Float64Array.from(v, (x, i) => (i ? v[i - 1] - x : 0) + (i + 1 < v.length ? v[i + 1] - x : 0));
}
export function pulseAt(t, p) {
  const t0 = MODEL.startMs, t1 = t0 + p.width, t2 = t1 + p.gap;
  return t >= t0 && t < t1 ? 1 : t >= t2 && t < t2 + p.width ? -1 : 0;
}
/** Exact average of a piecewise-constant pulse over a step; integrates edges exactly. */
export function pulseAverage(a, b, p) {
  const overlap = (lo, hi) => Math.max(0, Math.min(b, hi) - Math.max(a, lo));
  const t = MODEL.startMs;
  return (overlap(t, t + p.width) - overlap(t + p.width + p.gap, t + 2 * p.width + p.gap)) / (b - a);
}
/** Backward Euler on a passive cable, tridiagonal solve, sealed intracellular ends.
 * C dU/dt = -gL U + ga L(U + Ve), where U = Vm - Vrest.
 */
export function solvePassive(cable, field, p) {
  const n = cable.z.length, steps = Math.ceil(MODEL.endMs / p.dt), h = MODEL.endMs / steps;
  const k = cable.axialUs, ch = cable.capacitanceNf / h, drive = laplacian(field);
  const denom = new Float64Array(n), upper = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const diagonal = ch + cable.leakUs + k * ((i > 0 ? 1 : 0) + (i + 1 < n ? 1 : 0));
    denom[i] = diagonal + (i ? k * upper[i - 1] : 0);
    upper[i] = i + 1 < n ? -k / denom[i] : 0;
  }
  const voltages = new Float32Array((steps + 1) * n), times = Float64Array.from({ length: steps + 1 }, (_, i) => i * h);
  const rhs = new Float64Array(n), u = new Float64Array(n);
  let peak = 0, peakIndex = 0, peakFrame = 0;
  for (let s = 1; s <= steps; s++) {
    const pulse = pulseAverage(times[s - 1], times[s], p);
    for (let i = 0; i < n; i++) rhs[i] = (ch * u[i] + k * drive[i] * pulse + (i ? k * rhs[i - 1] : 0)) / denom[i];
    for (let i = n - 1; i >= 0; i--) {
      u[i] = rhs[i] - upper[i] * (i + 1 < n ? u[i + 1] : 0);
      if (!Number.isFinite(u[i])) throw new Error('Cable solution is not finite.');
      voltages[s * n + i] = u[i];
      if (Math.abs(u[i]) > peak) { peak = Math.abs(u[i]); peakIndex = i; peakFrame = s; }
    }
  }
  return { times, voltages, count: n, peak, peakIndex, peakFrame };
}
export function calculateExperiment(input, fiberId = 0, options = {}) {
  const p = validateParameters(input), anatomy = makeAnatomy(p);
  if (!Number.isInteger(fiberId) || fiberId < 0 || fiberId >= anatomy.fibers.length) throw new Error('Invalid selected fiber.');
  const contacts = makeContacts(p, options.order || 32);
  const fiber = anatomy.fibers[fiberId], cable = makeCable(fiber);
  const field = Float64Array.from(cable.z, z => fieldAt({ x: fiber.x, y: fiber.y, z }, contacts, p));
  const drive = laplacian(field);
  // Compare all fibers with the SAME continuum derivative spacing, not diameter-dependent spacing.
  const h = .05, map = anatomy.fibers.map(f => {
    const value = z => fieldAt({ x: f.x, y: f.y, z }, contacts, p);
    return { potential: value(0), curvature: (value(h) - 2 * value(0) + value(-h)) / h ** 2 };
  });
  const response = solvePassive(cable, field, p);
  return { version: VERSION, p, fiberId, anatomy, contacts, cable, field, drive, map, response };
}
export function experimentDocument(result) {
  return { schema: 'bts-peripheral-nerve', version: VERSION, parameters: result.p, selectedFiber: result.fiberId };
}
export function parseExperiment(text) {
  if (typeof text !== 'string' || text.length > 16384) throw new Error('Choose an experiment JSON under 16 KB.');
  let doc; try { doc = JSON.parse(text); } catch { throw new Error('Invalid JSON.'); }
  if (!doc || doc.schema !== 'bts-peripheral-nerve' || doc.version !== VERSION || Object.keys(doc).some(k => !['schema', 'version', 'parameters', 'selectedFiber'].includes(k))) throw new Error('This file is not a Peripheral Nerve Laboratory 1.0.0 experiment. Original sandbox files have a different model and cannot be imported here.');
  const parameters = validateParameters(doc.parameters);
  if (Object.keys(doc.parameters).length !== Object.keys(DEFAULTS).length) throw new Error('The saved experiment must contain every model parameter.');
  if (!Number.isInteger(doc.selectedFiber) || doc.selectedFiber < 0 || doc.selectedFiber >= MODEL.representativeFibers) throw new Error('Invalid selected fiber.');
  return { parameters, selectedFiber: doc.selectedFiber };
}
