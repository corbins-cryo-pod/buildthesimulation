/** Prescribed uniform-current source disks in an infinite isotropic conductor.
 * Input lengths: µm; currents: µA; conductivity: S/m. Outputs: mV, V/m, A/m².
 * This is a full-space source sheet, not an equipotential/insulating-backed disk.
 */
export const FIELD_MODEL_ID = 'uniform-current-disk-full-space-v1';
const FOUR_PI = 4 * Math.PI, TRANSFER_LIMIT = 128 * 1024 * 1024;
const rules = new Map(), tables = new Map(), pointSets = [], transfers = new Map();
let nextPointId = 1, transferBytes = 0;
let stats = { radialHits: 0, radialMisses: 0, transferHits: 0, transferMisses: 0 };
const finite = x => typeof x === 'number' && Number.isFinite(x);
function checkFinite(value, label) { if (!finite(value)) throw new Error(`${label} must be finite.`); }

function gaussLegendre(n) {
  if (rules.has(n)) return rules.get(n);
  const u = new Float64Array(n), weight = new Float64Array(n);
  for (let i = 0; i < Math.ceil(n / 2); i++) {
    let z = Math.cos(Math.PI * (i + .75) / (n + .5)), derivative = 0;
    for (let iteration = 0; iteration < 50; iteration++) {
      let p0 = 1, p1 = z;
      for (let j = 2; j <= n; j++) { const p = ((2 * j - 1) * z * p1 - (j - 1) * p0) / j; p0 = p1; p1 = p; }
      derivative = n * (z * p1 - p0) / (z * z - 1);
      const next = z - p1 / derivative;
      if (Math.abs(next - z) < 2e-15) { z = next; break; } z = next;
    }
    // Recompute the derivative at the accepted root before making weights.
    let p0 = 1, p1 = z;
    for (let j = 2; j <= n; j++) { const p = ((2 * j - 1) * z * p1 - (j - 1) * p0) / j; p0 = p1; p1 = p; }
    derivative = n * (z * p1 - p0) / (z * z - 1);
    const w = 1 / ((1 - z * z) * derivative * derivative);
    u[i] = (1 - z) / 2; u[n - i - 1] = (1 + z) / 2;
    weight[i] = w; weight[n - i - 1] = w;
  }
  const angular = 4 * n, cosine = Float64Array.from({ length: angular }, (_, i) => Math.cos(2 * Math.PI * i / angular));
  const rule = { u, weight, cosine, angular }; rules.set(n, rule); return rule;
}

/** Dimensionless disk averages [phi, radial E, positive-height E, dEz/dr]. */
function diskKernel(rho, h, n) {
  if (rho === 0) {
    const s = Math.hypot(1, h);
    return [2 / (s + h), 0, 2 / (s * (s + h)), 0];
  }
  const rule = gaussLegendre(n);
  let potential = 0, radial = 0, axial = 0, axialSlope = 0;
  for (let i = 0; i < n; i++) {
    const u = rule.u[i], w = 2 * u * rule.weight[i] / rule.angular;
    const base = rho * rho + u * u + h * h, twice = 2 * rho * u;
    for (let j = 0; j < rule.angular; j++) {
      const d = rho - u * rule.cosine[j], inverse = 1 / Math.sqrt(base - twice * rule.cosine[j]);
      const inv3 = inverse * inverse * inverse;
      potential += w * inverse; radial += w * d * inv3;
      axial += w * h * inv3; axialSlope -= w * 3 * h * d * inv3 * inverse * inverse;
    }
  }
  return [potential, radial, axial, axialSlope];
}

function numericalOrder(gapOverRadius, requested) {
  if (gapOverRadius < .025 - 1e-12) throw new Error('Finite-disk observations require gap/radius ≥ 0.025; source-plane values are not defined by this solver.');
  return gapOverRadius < .1 ? Math.max(requested, Math.ceil(3.2 / gapOverRadius)) : requested;
}

function radialTable(h, n, maximum) {
  const key = `${h}:${n}`; let table = tables.get(key);
  if (!table) {
    const a = diskKernel(0, h, n);
    table = { r: [0], p: [a[0]], er: [a[1]], ez: [a[2]], dz: [a[3]] };
    tables.set(key, table); stats.radialMisses++;
    // Geometry exploration cannot grow the radial cache without a bound.
    if (tables.size > 32) tables.delete(tables.keys().next().value);
  } else { stats.radialHits++; tables.delete(key); tables.set(key, table); }
  while (table.r.at(-1) <= maximum) {
    const previous = table.r.at(-1);
    const step = .015 * Math.min(1, h / .1) * Math.max(1, previous - .75);
    const r = previous + step, a = diskKernel(r, h, n);
    table.r.push(r); table.p.push(a[0]); table.er.push(a[1]); table.ez.push(a[2]); table.dz.push(a[3]);
  }
  return table;
}

function hermite(y0, y1, d0, d1, t, step) {
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * step * d0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * step * d1;
}
function interpolatedKernel(table, rho) {
  let lo = 0, hi = table.r.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (table.r[m] <= rho) lo = m; else hi = m; }
  const step = table.r[hi] - table.r[lo], t = (rho - table.r[lo]) / step, t2 = t * t;
  const p = hermite(table.p[lo], table.p[hi], -table.er[lo], -table.er[hi], t, step);
  // Derivative of exactly the same potential interpolant.
  const er = -((6 * t2 - 6 * t) * table.p[lo] / step - (3 * t2 - 4 * t + 1) * table.er[lo] + (-6 * t2 + 6 * t) * table.p[hi] / step - (3 * t2 - 2 * t) * table.er[hi]);
  const ez = hermite(table.ez[lo], table.ez[hi], table.dz[lo], table.dz[hi], t, step);
  return [p, er, ez];
}

export function sourceCurrentSummary(sources) {
  let netCurrentUa = 0, absoluteCurrentUa = 0;
  for (const source of sources) { checkFinite(source.currentUa, 'Source current'); netCurrentUa += source.currentUa; absoluteCurrentUa += Math.abs(source.currentUa); }
  const toleranceUa = Math.max(1e-9, absoluteCurrentUa * 1e-11);
  return { netCurrentUa, absoluteCurrentUa, balanceToleranceUa: toleranceUa, currentBalanced: Math.abs(netCurrentUa) <= toleranceUa };
}

export function axisDiskField({ currentUa, radiusUm, axialOffsetUm, conductivitySm = .2 }) {
  for (const [key, value] of Object.entries({ currentUa, radiusUm, axialOffsetUm, conductivitySm })) checkFinite(value, key);
  if (radiusUm <= 0 || conductivitySm <= 0 || axialOffsetUm === 0) throw new Error('Axis solution requires positive radius and conductivity and nonzero separation.');
  const a = radiusUm * 1e-6, z = axialOffsetUm * 1e-6, h = Math.abs(z), s = Math.hypot(a, h), i = currentUa * 1e-6;
  const potentialMv = 1000 * i / (2 * Math.PI * conductivitySm * (s + h));
  const ezVm = Math.sign(z) * i / (2 * Math.PI * conductivitySm * s * (s + h));
  return { potentialMv, exVm: 0, eyVm: 0, ezVm, fieldVm: Math.abs(ezVm), currentDensityAm2: conductivitySm * Math.abs(ezVm) };
}

function matchingPointSet(points) {
  for (let k = pointSets.length - 1; k >= 0; k--) {
    const set = pointSets[k]; if (set.xyz.length !== 3 * points.length) continue;
    let same = true;
    for (let j = 0; j < points.length; j++) if (set.xyz[3 * j] !== points[j].xUm || set.xyz[3 * j + 1] !== points[j].yUm || set.xyz[3 * j + 2] !== points[j].zUm) { same = false; break; }
    if (same) { pointSets.splice(k, 1); pointSets.push(set); return set.id; }
  }
  const set = { id: nextPointId++, xyz: Float64Array.from(points.flatMap(p => [p.xUm, p.yUm, p.zUm])) }; pointSets.push(set);
  if (pointSets.length > 4) {
    const removed = pointSets.shift();
    for (const [key, item] of transfers) if (item.pointId === removed.id) { transferBytes -= item.bytes; transfers.delete(key); }
  }
  return set.id;
}

function sourceTransfer(source, points, pointId, requested, interpolation) {
  const key = `${pointId}:${source.xUm}:${source.yUm}:${source.zUm}:${source.radiusUm}:${requested}:${interpolation}`;
  if (transfers.has(key)) { const cached = transfers.get(key); transfers.delete(key); transfers.set(key, cached); stats.transferHits++; return { ...cached, reused: true }; }
  stats.transferMisses++;
  const length = points.length, coefficient = new Float64Array(4 * length), a = source.radiusUm * 1e-6;
  const groups = new Map(); let maximumOrder = requested, minimumRatio = Infinity;
  for (let i = 0; i < length; i++) {
    const point = points[i], h = Math.abs(point.zUm - source.zUm) / source.radiusUm;
    if (h === 0) throw new Error('Observation in an active source plane is unsupported.');
    const order = numericalOrder(h, requested), rho = Math.hypot(point.xUm - source.xUm, point.yUm - source.yUm) / source.radiusUm;
    if (!finite(h) || !finite(rho) || !finite(h * h + rho * rho)) throw new Error('The relative source/observation geometry exceeds floating-point range.');
    maximumOrder = Math.max(maximumOrder, order); minimumRatio = Math.min(minimumRatio, h);
    const groupKey = `${h}:${order}`;
    const group = groups.get(groupKey) ?? { h, order, maximum: 0, points: [] };
    group.maximum = Math.max(group.maximum, rho); group.points.push([i, rho]); groups.set(groupKey, group);
  }
  for (const group of groups.values()) {
    const table = interpolation ? radialTable(group.h, group.order, group.maximum) : null;
    for (const [i, rho] of group.points) {
      const point = points[i], values = table ? interpolatedKernel(table, rho) : diskKernel(rho, group.h, group.order);
      coefficient[4 * i] = values[0] / a * 1000;
      const radialFactor = rho > 0 ? values[1] / (a * a * rho * source.radiusUm) : 0;
      coefficient[4 * i + 1] = radialFactor * (point.xUm - source.xUm);
      coefficient[4 * i + 2] = radialFactor * (point.yUm - source.yUm);
      coefficient[4 * i + 3] = values[2] / (a * a) * Math.sign(point.zUm - source.zUm);
    }
  }
  const item = { pointId, coefficient, bytes: coefficient.byteLength, maximumOrder, minimumRatio, reused: false };
  if (item.bytes <= TRANSFER_LIMIT) {
    while (transferBytes + item.bytes > TRANSFER_LIMIT && transfers.size) { const oldest = transfers.keys().next().value; transferBytes -= transfers.get(oldest).bytes; transfers.delete(oldest); }
    transfers.set(key, item); transferBytes += item.bytes;
  }
  return item;
}

export function evaluateField(sources, points, { conductivitySm = .2, quadratureOrder = 32, interpolation = true, requireBalanced = false } = {}) {
  if (!Array.isArray(sources) || !Array.isArray(points)) throw new Error('Sources and observation points must be arrays.');
  if (!finite(conductivitySm) || conductivitySm <= 0) throw new Error('Conductivity must be finite and positive.');
  if (!Number.isInteger(quadratureOrder) || quadratureOrder < 8 || quadratureOrder > 128) throw new Error('Quadrature order must be an integer from 8 to 128.');
  for (const s of sources) { for (const key of ['xUm', 'yUm', 'zUm', 'radiusUm', 'currentUa']) checkFinite(s[key], `Source ${key}`); if (s.radiusUm <= 0) throw new Error('Source radius must be positive.'); }
  for (const p of points) for (const key of ['xUm', 'yUm', 'zUm']) checkFinite(p[key], `Observation ${key}`);
  const summary = sourceCurrentSummary(sources);
  if (requireBalanced && !summary.currentBalanced) throw new Error('Finite source and return currents must sum to zero.');
  const length = points.length, potentialMv = new Float64Array(length), exVm = new Float64Array(length), eyVm = new Float64Array(length), ezVm = new Float64Array(length);
  const currentDensityAm2 = new Float64Array(length), jxAm2 = new Float64Array(length), jyAm2 = new Float64Array(length), jzAm2 = new Float64Array(length);
  const pointId = matchingPointSet(points); let maximumOrder = quadratureOrder, minimumRatio = Infinity, reused = 0, calculated = 0;
  const active = sources.filter(source => source.currentUa !== 0);
  for (const source of active) {
    const transfer = sourceTransfer(source, points, pointId, quadratureOrder, !!interpolation);
    maximumOrder = Math.max(maximumOrder, transfer.maximumOrder); minimumRatio = Math.min(minimumRatio, transfer.minimumRatio);
    if (transfer.reused) reused++; else calculated++;
    const scale = source.currentUa * 1e-6 / (FOUR_PI * conductivitySm), c = transfer.coefficient;
    for (let i = 0; i < length; i++) { potentialMv[i] += scale * c[4 * i]; exVm[i] += scale * c[4 * i + 1]; eyVm[i] += scale * c[4 * i + 2]; ezVm[i] += scale * c[4 * i + 3]; }
  }
  for (let i = 0; i < length; i++) { jxAm2[i] = conductivitySm * exVm[i]; jyAm2[i] = conductivitySm * eyVm[i]; jzAm2[i] = conductivitySm * ezVm[i]; currentDensityAm2[i] = Math.hypot(jxAm2[i], jyAm2[i], jzAm2[i]); }
  return { potentialMv, exVm, eyVm, ezVm, currentDensityAm2, jxAm2, jyAm2, jzAm2, metadata: {
    model: FIELD_MODEL_ID, ...summary, returnInterpretation: summary.currentBalanced ? 'Explicit balanced finite sources and returns.' : 'Residual return implicitly at infinity.',
    conductivitySm, radialOrderRequested: quadratureOrder, maximumRadialOrderUsed: maximumOrder, maximumAngularOrderUsed: 4 * maximumOrder,
    minimumGapOverRadius: finite(minimumRatio) ? minimumRatio : null,
    interpolation: interpolation ? 'Radial cubic Hermite; Er is the negative derivative of the potential interpolant.' : 'Direct finite-disk quadrature.',
    radialInterpolationBaseStep: interpolation ? .015 : null,
    sourceTransfersReused: reused, sourceTransfersCalculated: calculated, sourceCount: active.length, observationCount: length,
    geometry: 'Uniform current-source sheets in homogeneous isotropic full space; no insulating backing.',
    accuracyStatus: 'See independent fixture tests; numerical agreement is not physiological validation.',
  } };
}

export function clearFieldCache() { rules.clear(); tables.clear(); pointSets.splice(0); transfers.clear(); transferBytes = 0; nextPointId = 1; stats = { radialHits: 0, radialMisses: 0, transferHits: 0, transferMisses: 0 }; }
export function fieldCacheStats() { return { ...stats, radialTables: tables.size, quadratureRules: rules.size, observationSets: pointSets.length, sourceTransfers: transfers.size, transferCacheBytes: transferBytes, transferCacheMiB: transferBytes / 1024 ** 2, transferLimitMiB: 128 }; }
