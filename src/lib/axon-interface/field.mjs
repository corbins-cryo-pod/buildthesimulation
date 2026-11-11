/**
 * Conforming P1 tetrahedral, four-region cylindrical volume conductor.
 * Coordinates: um. Sigma: S/m. Loads: uA. Potentials returned as mV.
 * The raw FEM stiffness is assembled with um coordinates, giving sigma*um;
 * a 1 uA RHS consequently gives volts, and sampled results are multiplied 1000.
 * No fitted confinement multiplier, no homogeneous Green function substituted
 * for the layered solve, and no voltage clipping.
 */
export const FIELD_VERSION = 'axon-interface-field/0.1.0';
export const FIELD_LIMITS = Object.freeze({ maxNodes: 50000, maxTetrahedra: 280000, maxIterations: 16000, relativeTolerance: 2e-12 });
export const FIELD_DEFAULTS = Object.freeze({
  fascicleRadiusUm: 250, perineuriumThicknessUm: 15, epineuriumRadiusUm: 400,
  outerRadiusUm: 1200, halfLengthUm: 8000,
  sigmaEndoTransverse: 0.083, sigmaEndoLongitudinal: 0.571,
  sigmaPerineurium: 1 / 1149, sigmaEpineurium: 0.083, sigmaSurrounding: 0.3,
  angularSegments: 32, radialRefinement: 1, axialRefinement: 1,
  electrodeRadiusUm: 75
});
export const FIELD_PARAMETERS = Object.freeze(Object.entries(FIELD_DEFAULTS).map(([key, value]) => ({
  key, default: value,
  units: key.startsWith('sigma') ? 'S/m' : key.endsWith('Um') ? 'um' : '1',
  evidence: 'estimated',
  provenance: key.startsWith('sigma')
    ? 'Exploratory effective ohmic choice informed by Pelot et al., 2019/2020 (PMC7309635); preparation-, frequency- and temperature-dependent literature values are not a fitted human nerve model.'
    : 'Explicit simulator geometry/resolution choice, not measured organoid anatomy.',
  reference: key.startsWith('sigma') ? 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7309635/' : null
})));

function fail(message) { throw new Error(`Field calculation error: ${message}`); }
function finitePositive(x, label) { if (!Number.isFinite(x) || x <= 0) fail(`${label} must be finite and positive`); }
function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function norm(a) { return Math.sqrt(dot(a, a)); }
function uniqueSorted(a) { return [...new Set(a.map(x => Math.round(x * 1e9) / 1e9))].sort((x, y) => x - y); }
function linspace(a, b, n) { return Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n); }
function subdivide(points, n) { return points.flatMap((x, i) => i ? linspace(points[i - 1], x, n).slice(1) : [x]); }
function conductivity(s, region) {
  if (region === 0) return [s.sigmaEndoTransverse, s.sigmaEndoTransverse, s.sigmaEndoLongitudinal];
  const v = [0, s.sigmaPerineurium, s.sigmaEpineurium, s.sigmaSurrounding][region]; return [v, v, v];
}

export function normalizeFieldSettings(input = {}) {
  const known = new Set([...Object.keys(FIELD_DEFAULTS), 'axialCoordinatesUm']);
  for (const key of Object.keys(input)) if (!known.has(key)) fail(`unsupported setting ${key}`);
  const s = { ...FIELD_DEFAULTS, ...input };
  for (const [k, v] of Object.entries(s)) if (k !== 'axialCoordinatesUm') finitePositive(v, k);
  for (const k of ['angularSegments', 'radialRefinement', 'axialRefinement']) if (!Number.isInteger(s[k])) fail(`${k} must be an integer`);
  if (s.angularSegments < 8 || s.angularSegments > 64) fail('angularSegments must be 8–64');
  if (s.radialRefinement > 4 || s.axialRefinement > 4) fail('refinement exceeds declared maximum 4');
  if (!(s.fascicleRadiusUm + s.perineuriumThicknessUm < s.epineuriumRadiusUm && s.epineuriumRadiusUm < s.outerRadiusUm)) fail('cylindrical regions overlap or have zero thickness');
  if (s.axialCoordinatesUm) {
    if (!Array.isArray(s.axialCoordinatesUm) || s.axialCoordinatesUm.length < 3 || s.axialCoordinatesUm.some(x => !Number.isFinite(x))) fail('axialCoordinatesUm must contain at least three finite values');
    for (let i = 1; i < s.axialCoordinatesUm.length; i++) if (s.axialCoordinatesUm[i] <= s.axialCoordinatesUm[i - 1]) fail('axial coordinates must be strictly ordered');
    if (s.axialCoordinatesUm[0] !== -s.halfLengthUm || s.axialCoordinatesUm.at(-1) !== s.halfLengthUm) fail('axial coordinates must include both domain ends');
    s.axialCoordinatesUm = Object.freeze([...s.axialCoordinatesUm]);
  }
  return Object.freeze(s);
}

function elementGeometry(points, ids) {
  const p0 = points[ids[0]], p1 = points[ids[1]], p2 = points[ids[2]], p3 = points[ids[3]];
  const a = p1.map((v, i) => v - p0[i]), b = p2.map((v, i) => v - p0[i]), c = p3.map((v, i) => v - p0[i]);
  const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const bc = cross(b, c), ca = cross(c, a), ab = cross(a, b);
  const determinant = a[0] * bc[0] + a[1] * bc[1] + a[2] * bc[2];
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) fail('degenerate tetrahedron');
  const g1 = bc.map(v => v / determinant), g2 = ca.map(v => v / determinant), g3 = ab.map(v => v / determinant);
  const g0 = g1.map((v, i) => -v - g2[i] - g3[i]);
  return { volume: Math.abs(determinant) / 6, gradients: [g0, g1, g2, g3] };
}

export function createFieldModel(input = {}) {
  const settings = normalizeFieldSettings(input), s = settings;
  const periEdge = s.fascicleRadiusUm + s.perineuriumThicknessUm;
  const baseRadii = [0, ...linspace(0, s.fascicleRadiusUm, 10).slice(1), s.fascicleRadiusUm + s.perineuriumThicknessUm / 2, periEdge, ...linspace(periEdge, s.epineuriumRadiusUm, 3).slice(1), s.epineuriumRadiusUm + (s.outerRadiusUm - s.epineuriumRadiusUm) / 8, (s.epineuriumRadiusUm + s.outerRadiusUm) / 2, s.outerRadiusUm];
  const radial = subdivide(baseRadii, s.radialRefinement), N = s.angularSegments;
  const h = s.halfLengthUm;
  const positiveZ = uniqueSorted([0, 25, 50, 100, 200, 350, 500, 550, 575, 600, 625, 650, 700, 1000, 1700, 2800, 4500, 6500, h].filter(z => z <= h));
  const axial = s.axialCoordinatesUm || subdivide([...positiveZ.slice(1).reverse().map(v => -v), ...positiveZ], s.axialRefinement);
  const crossPoints = [[0, 0]], crossMeta = [{ ring: 0, theta: 0 }];
  for (let r = 1; r < radial.length; r++) for (let t = 0; t < N; t++) {
    const angle = 2 * Math.PI * t / N; crossPoints.push([radial[r] * Math.cos(angle), radial[r] * Math.sin(angle)]); crossMeta.push({ ring: r, theta: t });
  }
  const crossCount = crossPoints.length;
  const index = (r, t) => r === 0 ? 0 : 1 + (r - 1) * N + ((t + N) % N);
  const triangles = [];
  function regionForBand(r) {
    const mid = (radial[r - 1] + radial[r]) / 2;
    return mid < s.fascicleRadiusUm ? 0 : mid < s.fascicleRadiusUm + s.perineuriumThicknessUm ? 1 : mid < s.epineuriumRadiusUm ? 2 : 3;
  }
  for (let r = 1; r < radial.length; r++) for (let t = 0; t < N; t++) {
    const reg = regionForBand(r);
    if (r === 1) triangles.push({ nodes: [0, index(r, t), index(r, t + 1)], region: reg, ring: r, theta: t });
    else {
      triangles.push({ nodes: [index(r - 1, t), index(r, t), index(r, t + 1)], region: reg, ring: r, theta: t });
      triangles.push({ nodes: [index(r - 1, t), index(r, t + 1), index(r - 1, t + 1)], region: reg, ring: r, theta: t });
    }
  }
  const nodeCount = crossCount * axial.length, tetraCount = triangles.length * (axial.length - 1) * 3;
  if (nodeCount > FIELD_LIMITS.maxNodes || tetraCount > FIELD_LIMITS.maxTetrahedra) fail(`declared field work budget exceeded (${nodeCount} nodes, ${tetraCount} tetrahedra); reduce settings explicitly`);
  const points = [], boundary = [], nodeVolumes = new Float64Array(nodeCount);
  for (let z = 0; z < axial.length; z++) for (let i = 0; i < crossCount; i++) {
    points.push([...crossPoints[i], axial[z]]);
    boundary.push(z === 0 || z === axial.length - 1 || crossMeta[i].ring === radial.length - 1);
  }
  const tetrahedra = [], regions = [];
  const rowMaps = Array.from({ length: nodeCount }, () => new Map());
  for (let z = 0; z < axial.length - 1; z++) for (const tri of triangles) {
    const [a, b, c] = [...tri.nodes].sort((x, y) => x - y).map(i => i + z * crossCount);
    const A = a + crossCount, B = b + crossCount, C = c + crossCount;
    for (const ids of [[a, b, c, A], [b, c, A, B], [c, A, B, C]]) {
      const { volume, gradients } = elementGeometry(points, ids), sigma = conductivity(s, tri.region);
      tetrahedra.push(ids); regions.push(tri.region);
      for (let i = 0; i < 4; i++) {
        nodeVolumes[ids[i]] += volume / 4;
        for (let j = 0; j < 4; j++) {
          const v = volume * gradients[i].reduce((sum, g, axis) => sum + g * sigma[axis] * gradients[j][axis], 0);
          rowMaps[ids[i]].set(ids[j], (rowMaps[ids[i]].get(ids[j]) || 0) + v);
        }
      }
    }
  }
  // Preserve the uneliminated symmetric stiffness for explicit flux diagnostics.
  const rowPtr = new Int32Array(nodeCount + 1), col = [], values = [], diag = new Float64Array(nodeCount);
  for (let i = 0; i < nodeCount; i++) {
    rowPtr[i] = col.length;
    for (const [j, value] of [...rowMaps[i]].sort((a, b) => a[0] - b[0])) {
      col.push(j); values.push(value); if (i === j) diag[i] = value;
    }
  }
  rowPtr[nodeCount] = col.length;
  // A small cross-section lookup makes point location independent of total z count.
  const triangleBounds = triangles.map(tri => {
    const p = tri.nodes.map(i => crossPoints[i]);
    return [Math.min(...p.map(v => v[0])), Math.max(...p.map(v => v[0])), Math.min(...p.map(v => v[1])), Math.max(...p.map(v => v[1]))];
  });
  return { version: FIELD_VERSION, settings, points, boundary, nodeVolumes, tetrahedra, regions,
    radial, axial, crossPoints, crossCount, triangles, triangleBounds,
    rowPtr, col: Int32Array.from(col), values: Float64Array.from(values), diag,
    diagnostics: { nodes: nodeCount, tetrahedra: tetraCount, perineuriumElementsRadially: 2 * s.radialRefinement,
      regionTetrahedra: [0, 1, 2, 3].map(r => regions.filter(v => v === r).length),
      discretization: 'conforming P1 tetrahedral finite elements',
      outerBoundary: 'zero Dirichlet on cylindrical outer surface and both ends',
      electrodeModel: 'finite Gaussian volumetric current source, 5-point Gauss-Hermite tensor quadrature truncated at three sigma; identical matched sink',
      electrodeResolutionWarning: 'Finite source support and P1 interpolation do not resolve a metal interface, an insulating well, or an aperture. Microscale selectivity is mesh-dependent; field refinement is required.' } };
}

function matvec(model, x, out, includeBoundary = false) {
  const { rowPtr, col, values, boundary } = model;
  for (let i = 0; i < x.length; i++) {
    if (!includeBoundary && boundary[i]) { out[i] = x[i]; continue; }
    let sum = 0; for (let p = rowPtr[i]; p < rowPtr[i + 1]; p++) if (includeBoundary || !boundary[col[p]]) sum += values[p] * x[col[p]];
    out[i] = sum;
  }
}

/** Solve an explicitly supplied uA load and optional mV Dirichlet boundary. */
export function solveFieldLoad(model, inputLoad, options = {}) {
  const n = model.points.length;
  if (!inputLoad || inputLoad.length !== n || [...inputLoad].some(v => !Number.isFinite(v))) fail('load must contain one finite value per mesh node');
  const load = Float64Array.from(inputLoad), rhs = Float64Array.from(load), x = new Float64Array(n);
  const boundaryVolts = new Float64Array(n);
  if (options.boundaryMv) for (let i = 0; i < n; i++) if (model.boundary[i]) {
    const v = typeof options.boundaryMv === 'function' ? options.boundaryMv(model.points[i]) : options.boundaryMv[i];
    if (!Number.isFinite(v)) fail('nonfinite imposed boundary potential'); boundaryVolts[i] = v / 1000;
  }
  for (let i = 0; i < n; i++) {
    if (model.boundary[i]) { rhs[i] = boundaryVolts[i]; x[i] = boundaryVolts[i]; }
    else for (let p = model.rowPtr[i]; p < model.rowPtr[i + 1]; p++) if (model.boundary[model.col[p]]) rhs[i] -= model.values[p] * boundaryVolts[model.col[p]];
  }
  const r = new Float64Array(n), z = new Float64Array(n), p = new Float64Array(n), Ap = new Float64Array(n);
  matvec(model, x, Ap);
  for (let i = 0; i < n; i++) { r[i] = rhs[i] - Ap[i]; z[i] = r[i] / (model.boundary[i] ? 1 : model.diag[i]); p[i] = z[i]; }
  const rhsNorm = norm(rhs), tolerance = options.relativeTolerance ?? FIELD_LIMITS.relativeTolerance;
  if (!Number.isFinite(tolerance) || tolerance <= 0 || tolerance > FIELD_LIMITS.relativeTolerance) fail('solver tolerance may not be relaxed');
  let rz = dot(r, z), relativeResidual = rhsNorm ? norm(r) / rhsNorm : 0, iterations = 0;
  while (relativeResidual > tolerance && iterations < FIELD_LIMITS.maxIterations) {
    if (options.isCancelled?.()) fail('cancelled');
    matvec(model, p, Ap); const pAp = dot(p, Ap);
    if (!(pAp > 0) || !Number.isFinite(pAp)) fail('non-positive or nonfinite PCG curvature');
    const alpha = rz / pAp;
    for (let i = 0; i < n; i++) { x[i] += alpha * p[i]; r[i] -= alpha * Ap[i]; }
    iterations++;
    // Recompute a true residual periodically; residual recurrences can understate it.
    if (iterations % 100 === 0) { matvec(model, x, Ap); for (let i = 0; i < n; i++) r[i] = rhs[i] - Ap[i]; }
    relativeResidual = rhsNorm ? norm(r) / rhsNorm : norm(r);
    for (let i = 0; i < n; i++) z[i] = r[i] / (model.boundary[i] ? 1 : model.diag[i]);
    const nextRz = dot(r, z), beta = rz ? nextRz / rz : 0;
    for (let i = 0; i < n; i++) p[i] = z[i] + beta * p[i];
    rz = nextRz;
  }
  matvec(model, x, Ap);
  let residual2 = 0; for (let i = 0; i < n; i++) residual2 += (Ap[i] - rhs[i]) ** 2;
  const trueRelativeResidual = rhsNorm ? Math.sqrt(residual2) / rhsNorm : Math.sqrt(residual2);
  if (trueRelativeResidual > 1e-10 || [...x].some(v => !Number.isFinite(v))) fail(`PCG failed fixed residual gate: ${trueRelativeResidual} after ${iterations} iterations`);
  const fullAx = new Float64Array(n); matvec(model, x, fullAx, true);
  let boundaryFluxUa = 0, interiorResidualUa = 0, loadSumUa = 0;
  for (let i = 0; i < n; i++) { loadSumUa += load[i]; if (model.boundary[i]) boundaryFluxUa += fullAx[i] - load[i]; else interiorResidualUa += fullAx[i] - load[i]; }
  const mv = Float64Array.from(x, v => v * 1000);
  const result = { model, potentialMvPerUa: mv, loadUa: load,
    diagnostics: { ...model.diagnostics, iterations, relativeResidual: trueRelativeResidual,
      sourceReturnImbalanceUa: loadSumUa,
      boundaryReactionUa: boundaryFluxUa,
      globalCurrentClosureUa: boundaryFluxUa + loadSumUa,
      summedInteriorResidualUa: interiorResidualUa,
      units: { coordinates: 'um', potential: 'mV/uA', current: 'uA', conductivity: 'S/m' } } };
  result.sample = points => sampleTransfer(result, points);
  return result;
}

function checkedPoint(point, model, label) {
  if (!Array.isArray(point) || point.length !== 3 || point.some(v => !Number.isFinite(v))) fail(`${label} must be three finite um coordinates`);
  if (Math.hypot(point[0], point[1]) >= model.settings.outerRadiusUm || Math.abs(point[2]) >= model.settings.halfLengthUm) fail(`${label} is on or beyond the field boundary`);
}

export function electrodeLoad(model, center, electrodeRadiusUm) {
  checkedPoint(center, model, 'electrode center'); finitePositive(electrodeRadiusUm, 'electrodeRadiusUm');
  // Radius denotes 3 standard deviations. Integrate the source in physical
  // coordinates, independently of mesh nodal volumes. Lumped vertex quadrature
  // is deliberately not used: it biased the source toward coarse bath cells
  // and failed the first radial refinement test (retained in the history).
  const sigma = electrodeRadiusUm / 3, cutoff2 = electrodeRadiusUm ** 2;
  if (Math.hypot(center[0], center[1]) + electrodeRadiusUm >= model.settings.outerRadiusUm || Math.abs(center[2]) + electrodeRadiusUm >= model.settings.halfLengthUm) fail('electrode support touches the grounded field boundary');
  const load = new Float64Array(model.points.length); let sum = 0, supportNodes = 0, minDistance = Infinity, maxQuadratureCellEdgeUm = 0, quadraturePoints = 0;
  const supportMin = [Infinity, Infinity, Infinity], supportMax = [-Infinity, -Infinity, -Infinity];
  const qx = [-2.8569700138728056, -1.355626179974266, 0, 1.355626179974266, 2.8569700138728056];
  const qw = [0.01125741132772069, 0.22207592200561264, 0.5333333333333333, 0.22207592200561264, 0.01125741132772069];
  for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) for (let c = 0; c < 5; c++) {
    const d = [qx[a] * sigma, qx[b] * sigma, qx[c] * sigma];
    if (d.reduce((v, x) => v + x * x, 0) >= cutoff2) continue;
    const point = center.map((v, i) => v + d[i]), location = locatePoint(model, point), weight = qw[a] * qw[b] * qw[c];
    for (let i = 0; i < 4; i++) load[location.ids[i]] += weight * location.weights[i];
    sum += weight; quadraturePoints++;
    for (let i = 0; i < 4; i++) for (let j = 0; j < i; j++) {
      const p = model.points[location.ids[i]], q = model.points[location.ids[j]];
      maxQuadratureCellEdgeUm = Math.max(maxQuadratureCellEdgeUm, Math.sqrt(p.reduce((v, x, axis) => v + (x - q[axis]) ** 2, 0)));
    }
  }
  for (let i = 0; i < load.length; i++) if (load[i] > 1e-14) {
    const d2 = model.points[i].reduce((a, v, axis) => a + (v - center[axis]) ** 2, 0);
    minDistance = Math.min(minDistance, Math.sqrt(d2)); supportNodes++;
    for (let a = 0; a < 3; a++) { supportMin[a] = Math.min(supportMin[a], model.points[i][a]); supportMax[a] = Math.max(supportMax[a], model.points[i][a]); }
  }
  if (!(sum > 0)) fail(`electrode has no resolved source support (nearest mesh node ${minDistance.toFixed(3)} um); refine mesh or enlarge the declared radius`);
  if (supportNodes < 4) fail(`electrode has only ${supportNodes} support nodes; at least four required; refine mesh explicitly`);
  const span = supportMax.map((v, i) => v - supportMin[i]);
  if (span.some(v => v < 1e-6)) fail('volumetric electrode source support is planar or linear; refine mesh explicitly');
  if (maxQuadratureCellEdgeUm > 2 * electrodeRadiusUm) fail(`electrode source mesh is unresolved: largest intersecting element edge ${maxQuadratureCellEdgeUm.toFixed(3)} um exceeds the source diameter ${2 * electrodeRadiusUm} um; refine mesh explicitly`);
  for (let i = 0; i < load.length; i++) load[i] /= sum;
  let normalizedSum = 0, largest = 0; for (let i = 0; i < load.length; i++) { normalizedSum += load[i]; if (load[i] > load[largest]) largest = i; }
  load[largest] += 1 - normalizedSum;
  return { load, supportNodes, minDistanceUm: minDistance, supportSpanUm: span, maxQuadratureCellEdgeUm, quadraturePoints };
}

export function solveChannel(model, channel, options = {}) {
  if (!channel || !channel.source || !channel.return) fail('channel needs explicit source and matched return');
  checkedPoint(channel.source, model, 'source'); checkedPoint(channel.return, model, 'return');
  const radius = channel.electrodeRadiusUm ?? model.settings.electrodeRadiusUm;
  if (channel.source.every((v, i) => v === channel.return[i])) fail('source and return coincide');
  const sep = Math.sqrt(channel.source.reduce((a, v, i) => a + (v - channel.return[i]) ** 2, 0));
  if (sep < 2 * radius) fail('finite source and return supports overlap');
  const source = electrodeLoad(model, channel.source, radius), sink = electrodeLoad(model, channel.return, radius);
  const load = Float64Array.from(source.load, (v, i) => v - sink.load[i]);
  const solution = solveFieldLoad(model, load, options);
  solution.channel = { source: [...channel.source], return: [...channel.return], electrodeRadiusUm: radius };
  Object.assign(solution.diagnostics, { sourceSupportNodes: source.supportNodes, returnSupportNodes: sink.supportNodes,
    sourceSupportSpanUm: source.supportSpanUm, returnSupportSpanUm: sink.supportSpanUm,
    sourceMaxElementEdgeUm: source.maxQuadratureCellEdgeUm, returnMaxElementEdgeUm: sink.maxQuadratureCellEdgeUm, sourceQuadraturePoints: source.quadraturePoints,
    sourceReturnSeparationUm: sep, electrodeRadiusUm: radius,
    electrodeModel: 'Gaussian volumetric source/sink, sigma=radius/3, 5-point Gauss-Hermite tensor quadrature truncated to sphere, normalized ±1 uA' });
  return solution;
}

function barycentric2(point, a, b, c) {
  const det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  const u = ((b[1] - c[1]) * (point[0] - c[0]) + (c[0] - b[0]) * (point[1] - c[1])) / det;
  const v = ((c[1] - a[1]) * (point[0] - c[0]) + (a[0] - c[0]) * (point[1] - c[1])) / det;
  return [u, v, 1 - u - v];
}

export function locatePoint(model, point) {
  checkedPoint(point, model, 'sample point');
  let zl = 0, zh = model.axial.length - 1;
  while (zh - zl > 1) { const mid = (zl + zh) >> 1; if (point[2] < model.axial[mid]) zh = mid; else zl = mid; }
  for (let ti = 0; ti < model.triangles.length; ti++) {
    const bounds = model.triangleBounds[ti];
    if (point[0] < bounds[0] - 1e-7 || point[0] > bounds[1] + 1e-7 || point[1] < bounds[2] - 1e-7 || point[1] > bounds[3] + 1e-7) continue;
    const tri = model.triangles[ti];
    const b2 = barycentric2(point, ...tri.nodes.map(i => model.crossPoints[i]));
    if (Math.min(...b2) < -1e-8) continue;
    const [a, b, c] = [...tri.nodes].sort((x, y) => x - y).map(i => i + zl * model.crossCount), A = a + model.crossCount, B = b + model.crossCount, C = c + model.crossCount;
    for (const ids of [[a, b, c, A], [b, c, A, B], [c, A, B, C]]) {
      const { gradients } = elementGeometry(model.points, ids), p0 = model.points[ids[0]], delta = point.map((v, i) => v - p0[i]);
      const weights = gradients.map((g, i) => (i === 0 ? 1 : 0) + g.reduce((sum, v, j) => sum + v * delta[j], 0));
      if (Math.min(...weights) >= -1e-7) return { ids, weights };
    }
  }
  fail('sample lies outside the polygonal cylindrical mesh; move inside the actual mesh boundary');
}

export function prepareSampling(model, points) { return points.map(point => locatePoint(model, point)); }
export function samplePrepared(solution, locations) { return Float64Array.from(locations, ({ ids, weights }) => ids.reduce((sum, id, i) => sum + weights[i] * solution.potentialMvPerUa[id], 0)); }
export function sampleTransfer(solution, points) { return samplePrepared(solution, prepareSampling(solution.model, points)); }

/** Reciprocity: voltage at channel source-minus-return caused by point current. */
export function reciprocalRecordingMv(solution, points, membraneCurrentsNa) {
  if (points.length !== membraneCurrentsNa.length) fail('recording source count mismatch');
  const transfer = sampleTransfer(solution, points); let mv = 0;
  for (let i = 0; i < transfer.length; i++) { if (!Number.isFinite(membraneCurrentsNa[i])) fail('nonfinite membrane source'); mv += transfer[i] * membraneCurrentsNa[i] / 1000; }
  return mv;
}

/** Exact infinite homogeneous anisotropic point-current benchmark, mV/uA. */
export function analyticHomogeneousTransfer(point, source, sigmaDiagonal) {
  if (sigmaDiagonal.length !== 3 || sigmaDiagonal.some(v => !Number.isFinite(v) || v <= 0)) fail('invalid analytic conductivity');
  const scaledDistance = Math.sqrt(point.reduce((sum, x, i) => sum + ((x - source[i]) * 1e-6) ** 2 / sigmaDiagonal[i], 0));
  if (scaledDistance === 0) fail('singular analytic point source');
  return 1e-3 / (4 * Math.PI * Math.sqrt(sigmaDiagonal[0] * sigmaDiagonal[1] * sigmaDiagonal[2]) * scaledDistance);
}

/** Serialize geometry, never cached solver state, for independent assembly. */
export function exportFieldFixture(model, solution, samples = []) {
  return { modelVersion: FIELD_VERSION, settings: model.settings, units: { coordinates: 'um', currents: 'uA', potentials: 'mV/uA', conductivity: 'S/m' },
    points: model.points, tetrahedra: model.tetrahedra, regions: model.regions, boundary: model.boundary, channel: solution.channel ?? null,
    conductivityByRegion: [0, 1, 2, 3].map(r => conductivity(model.settings, r)),
    loadUa: Array.from(solution.loadUa), potentialMvPerUa: Array.from(solution.potentialMvPerUa),
    samples: samples.map(point => ({ point, valueMvPerUa: sampleTransfer(solution, [point])[0] })),
    diagnostics: solution.diagnostics };
}
