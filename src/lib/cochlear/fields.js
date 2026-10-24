/** Uniform-source circular contacts in an unbounded isotropic conductor.
 * Positions/radii: mm. Potential gain: mV / microampere. This is a full-space
 * Green-function model; there are no cochlear bony/scala boundary conditions.
 * Disk sources have prescribed uniform density, not equipotential metal surfaces.
 */
const quadratureCache = new Map();
function quadrature(radialOrder, angularOrder) {
  const key = `${radialOrder}:${angularOrder}`;
  if (quadratureCache.has(key)) return quadratureCache.get(key);
  const points = [];
  for (let i = 0; i < radialOrder; i++) {
    let z = Math.cos(Math.PI * (i + .75) / (radialOrder + .5)), derivative = 0;
    for (let iteration = 0; iteration < 20; iteration++) {
      let p0 = 1, p1 = z;
      for (let k = 2; k <= radialOrder; k++) { const p = ((2 * k - 1) * z * p1 - (k - 1) * p0) / k; p0 = p1; p1 = p; }
      const pn = radialOrder === 1 ? z : p1, pnm1 = radialOrder === 1 ? 1 : p0;
      derivative = radialOrder * (z * pn - pnm1) / (z * z - 1);
      const delta = pn / derivative; z -= delta;
      if (Math.abs(delta) < 1e-14) break;
    }
    const weight = 1 / ((1 - z * z) * derivative * derivative), radius = Math.sqrt((z + 1) / 2);
    for (let j = 0; j < angularOrder; j++) { const angle = 2 * Math.PI * (j + .5) / angularOrder; points.push([radius * Math.cos(angle), radius * Math.sin(angle), weight / angularOrder]); }
  }
  quadratureCache.set(key, points); return points;
}
function vectorBasis(normal) {
  const norm = Math.hypot(...normal);
  if (!(norm > 0)) throw new Error('Contact normal must be nonzero.');
  const n = normal.map(v => v / norm), seed = Math.abs(n[2]) < .9 ? [0, 0, 1] : [1, 0, 0];
  let u = [n[1] * seed[2] - n[2] * seed[1], n[2] * seed[0] - n[0] * seed[2], n[0] * seed[1] - n[1] * seed[0]];
  const d = Math.hypot(...u); u = u.map(v => v / d);
  const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
  return { n, u, v };
}
export function diskPotentialMvPerUa(pointMm, contact, conductivitySPerM = 1 / 3, options = {}) {
  if (!(conductivitySPerM > 0) || !(contact.radiusMm > 0)) throw new Error('Conductivity and contact radius must be positive.');
  const { n, u, v } = vectorBasis(contact.normal ?? [0, 0, 1]);
  const q = pointMm.map((x, i) => x - contact.positionMm[i]);
  const axial = q.reduce((sum, x, i) => sum + x * n[i], 0), du = q.reduce((sum, x, i) => sum + x * u[i], 0), dv = q.reduce((sum, x, i) => sum + x * v[i], 0);
  const radius = contact.radiusMm;
  if (Math.hypot(du, dv) < 1e-10) return 1 / (2 * Math.PI * conductivitySPerM * (Math.hypot(axial, radius) + Math.abs(axial)));
  if (Math.abs(axial) < 1e-7 && Math.hypot(du, dv) <= radius) throw new Error('Off-axis points on the contact surface are outside this field sampler.');
  let potential = 0;
  for (const [x, y, weight] of quadrature(options.radialOrder ?? 8, options.angularOrder ?? 24)) potential += weight / Math.hypot(du - radius * x, dv - radius * y, axial);
  return potential / (4 * Math.PI * conductivitySPerM);
}
export function returnWeights(contactIndex, contactCount, mode = 'monopolar', focusFraction = .75) {
  if (!Number.isInteger(contactIndex) || contactIndex < 0 || contactIndex >= contactCount) throw new Error('Invalid stimulating contact.');
  const contacts = new Float64Array(contactCount); contacts[contactIndex] = 1; let remote = -1;
  if (mode === 'bipolar') {
    if (contactCount < 2) throw new Error('Bipolar stimulation requires at least two contacts.');
    contacts[contactIndex === contactCount - 1 ? contactIndex - 1 : contactIndex + 1] = -1; remote = 0;
  } else if (mode === 'partial-tripolar') {
    if (!(focusFraction >= 0 && focusFraction <= 1)) throw new Error('Focus fraction must be between zero and one.');
    remote = -(1 - focusFraction);
    for (const i of [contactIndex - 1, contactIndex + 1]) { if (i >= 0 && i < contactCount) contacts[i] -= focusFraction / 2; else remote -= focusFraction / 2; }
  } else if (mode !== 'monopolar') throw new Error('Unknown return configuration.');
  return { contacts, remote };
}
export function potentialBasisAtPoint(pointMm, geometry, settings) {
  const sigma = settings.conductivitySPerM, source = geometry.contacts.map(c => diskPotentialMvPerUa(pointMm, c, sigma));
  const distance = Math.hypot(...pointMm.map((x, i) => x - geometry.returnPositionMm[i]));
  if (distance < 1e-6) throw new Error('The remote reference cannot be sampled at its source.');
  const remote = 1 / (4 * Math.PI * sigma * distance);
  return Float64Array.from(geometry.contacts, (_, index) => { const weights = returnWeights(index, source.length, settings.returnMode, settings.focusFraction); return source.reduce((v, x, i) => v + x * weights.contacts[i], remote * weights.remote); });
}
export function buildLeadFields(geometry, positionsMm, settings) {
  const positions = Array.from(positionsMm);
  return geometry.fibers.map(fiber => {
    const fields = geometry.contacts.map(() => new Float64Array(positions.length));
    positions.forEach((y, compartment) => { potentialBasisAtPoint([fiber.placeMm, y, 0], geometry, settings).forEach((value, contact) => { fields[contact][compartment] = value; }); });
    return fields;
  });
}
export function fieldSlice(geometry, settings, contactIndex, width = 110, height = 44) {
  const values = new Float32Array(width * height), xRange = [0, 35], yRange = [-2, 4];
  const weights = returnWeights(contactIndex, geometry.contacts.length, settings.returnMode, settings.focusFraction);
  const sources = geometry.contacts.map((contact, i) => ({ contact, weight: weights.contacts[i] })).filter(x => x.weight !== 0); let maxAbs = 0;
  for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
    const x = xRange[0] + col / (width - 1) * (xRange[1] - xRange[0]), y = yRange[0] + row / (height - 1) * (yRange[1] - yRange[0]), point = [x, y, 0];
    const distance = Math.hypot(...point.map((v, i) => v - geometry.returnPositionMm[i]));
    let value = weights.remote / (4 * Math.PI * settings.conductivitySPerM * distance);
    for (const { contact, weight } of sources) value += weight * diskPotentialMvPerUa(point, contact, settings.conductivitySPerM);
    values[row * width + col] = value; maxAbs = Math.max(maxAbs, Math.abs(value));
  }
  return { values, width, height, xRange, yRange, maxAbs, unit: 'mV/µA', contactIndex };
}
