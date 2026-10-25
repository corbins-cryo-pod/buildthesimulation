/**
 * Millimetre geometry for implant inspection, with no electrical-solver coupling.
 *
 * createImplantGeometry(profileOrId, options) returns renderer-neutral triangle
 * meshes (flat plain arrays), paths, markers, labels, bounds, per-pad metadata,
 * and placement diagnostics. Named-device pads use implantContactIndex ONLY.
 * They never carry the experiment's contactIndex or a voltage/current value.
 *
 * Inserted geometry follows the supplied measured ST centreline by physical arc
 * length. A conservative radius check may shorten the requested insertion; the
 * remaining true-length carrier extends outside the entry. This is a geometric
 * reconstruction, not a simulation of insertion mechanics or a surgical fit.
 */
import { getImplantProfile, getImplantContactMap } from './implants.js';

const TAU = 2 * Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const mul = (v, s) => v.map((x) => x * s);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v) => Math.hypot(...v);
const unit = (v, fallback = [1, 0, 0]) => norm(v) > 1e-10 ? mul(v, 1 / norm(v)) : [...fallback];
const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const validPoint = (p) => p?.length === 3 && p.every(Number.isFinite);

const carrierMaterial = { color: '#a2becd', opacity: 0.66, roughness: 0.3, metalness: 0.02 };
const platinumMaterial = { color: '#d5d9df', opacity: 1, roughness: 0.25, metalness: 0.84 };

function frame(position, tangent, preferredNormal) {
  const t = unit(tangent);
  let n = sub(preferredNormal, mul(t, dot(t, preferredNormal)));
  if (norm(n) < 1e-7) n = sub([0, 1, 0], mul(t, t[1]));
  if (norm(n) < 1e-7) n = sub([0, 0, 1], mul(t, t[2]));
  n = unit(n, [0, 0, 1]);
  return { position, tangent: t, normal: n, binormal: unit(cross(t, n), [0, 1, 0]) };
}

function lowerInterval(arc, value) {
  let lo = 0, hi = arc.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (arc[mid] <= value) lo = mid; else hi = mid;
  }
  return Math.min(lo, arc.length - 2);
}

function polylineTable(points) {
  const arcMm = [0];
  for (let i = 1; i < points.length; i++) arcMm.push(arcMm[i - 1] + norm(sub(points[i], points[i - 1])));
  return { points, arcMm, lengthMm: arcMm.at(-1) };
}

function samplePolyline(table, distance) {
  const { points, arcMm } = table;
  const d = clamp(distance, 0, arcMm.at(-1));
  const i = lowerInterval(arcMm, d);
  const t = (d - arcMm[i]) / Math.max(1e-10, arcMm[i + 1] - arcMm[i]);
  let position = mix(points[i], points[i + 1], t);
  const tangent = unit(sub(points[i + 1], points[i]));
  if (distance < 0) position = add(points[0], mul(unit(sub(points[1], points[0])), distance));
  if (distance > arcMm.at(-1)) position = add(points.at(-1), mul(unit(sub(points.at(-1), points.at(-2))), distance - arcMm.at(-1)));
  return { position, tangent, i, t };
}

function benchSampler(profile) {
  const g = profile.geometry;
  const length = profile.bodyLengthMm;
  if (g.restShape === 'straight') {
    return (s) => frame([s - length / 2, 0, 0], [1, 0, 0], [0, 0, 1]);
  }
  if (g.restShape === 'gentle-curve') {
    const bend = g.restBendRadians;
    const radius = length / bend;
    return (s) => {
      const a = (s / length - 0.5) * bend;
      return frame([radius * Math.sin(a), 0, radius * (1 - Math.cos(a))], [Math.cos(a), 0, Math.sin(a)], [-Math.sin(a), 0, Math.cos(a)]);
    };
  }
  // Exact rest curvature is unpublished. This reconstruction is rescaled to the
  // physical curved-carrier arc length, not to an arbitrary screen bounding box.
  const raw = [];
  for (let i = 0; i <= 600; i++) {
    const t = i / 600;
    const angle = t * g.restTurns * TAU;
    const radius = lerp(g.restTipRadiusMm, g.restBaseRadiusMm, t);
    raw.push([radius * Math.cos(angle), 0, radius * Math.sin(angle)]);
  }
  const scale = g.curvedLengthMm / polylineTable(raw).lengthMm;
  const table = polylineTable(raw.map((p) => mul(p, scale)));
  return (s) => {
    const p = samplePolyline(table, s);
    return frame(p.position, p.tangent, [-p.position[0], 0, -p.position[2]]);
  };
}

function sectionSize(profile, s) {
  const g = profile.geometry;
  const t = clamp((s - g.firstSiteFromTipMm) / Math.max(0.001, g.carrierBaseAtMm - g.firstSiteFromTipMm), 0, 1);
  let size = mix(profile.tipSizeMm, profile.baseSizeMm, t);
  if (g.entrySizeMm && s > g.carrierBaseAtMm) {
    size = mix(profile.baseSizeMm, g.entrySizeMm, clamp((s - g.carrierBaseAtMm) / (g.entryAtMm - g.carrierBaseAtMm), 0, 1));
  }
  if (s < g.noseLengthMm) {
    const u = clamp(s / g.noseLengthMm, 0, 1);
    // A rounded leading nose is schematic. Published distal dimensions apply at
    // the distal carrier/contact region, not at a mathematically sharp endpoint.
    size = mul(size, Math.max(0.025, Math.sqrt(Math.max(0, 1 - (1 - u) ** 2))));
  }
  return size;
}

function crossSection(profile, s, phi) {
  const [width, height] = sectionSize(profile, s);
  const a = width / 2, b = height / 2;
  const exponent = profile.geometry.section === 'rounded-square' ? 0.5 : 1;
  const c = Math.cos(phi), q = Math.sin(phi);
  const x = a * Math.sign(c) * Math.abs(c) ** exponent;
  const y = b * Math.sign(q) * Math.abs(q) ** exponent;
  // Ellipse and n=4 superellipse implicit-surface normals.
  const power = exponent === 1 ? 1 : 3;
  const nx = Math.sign(x) * (Math.abs(x) / a) ** power / a;
  const ny = Math.sign(y) * (Math.abs(y) / b) ** power / b;
  const nn = Math.hypot(nx, ny) || 1;
  return { x, y, nx: nx / nn, ny: ny / nn };
}

function surfacePoint(profile, sampler, s, phi, offsetMm = 0) {
  const f = sampler(s), p = crossSection(profile, s, phi);
  const normal = unit(add(mul(f.normal, p.nx), mul(f.binormal, p.ny)));
  return {
    position: add(add(f.position, add(mul(f.normal, p.x), mul(f.binormal, p.y))), mul(normal, offsetMm)),
    normal,
  };
}

function envelopeRadius(profile, s) {
  let result = 0;
  for (let j = 0; j < 32; j++) {
    const p = crossSection(profile, s, j * TAU / 32);
    result = Math.max(result, Math.hypot(p.x, p.y));
  }
  return result + 0.012; // includes visual pad/marker surface offset
}

function prepareCenterline(centerline) {
  const points = centerline?.displayPoints ?? centerline?.points;
  if (!Array.isArray(points) || points.length < 2 || !points.every(validPoint)) {
    throw new TypeError('Inserted inspection requires a measured centerline with finite displayPoints in millimetres.');
  }
  const arcMm = centerline.arcMm ? Array.from(centerline.arcMm) : polylineTable(points).arcMm;
  if (arcMm.length !== points.length || arcMm.some((d, i) => !Number.isFinite(d) || (i && d <= arcMm[i - 1]))) {
    throw new TypeError('Centerline arcMm must be finite and strictly increasing, with one entry per point.');
  }
  if (Math.abs(arcMm[0]) > 1e-6) throw new RangeError('Centerline arcMm must start at zero.');
  const normals = centerline.inwardNormals;
  const hasNormals = normals?.length === points.length && normals.every(validPoint);
  const clearanceSource = centerline.conservativeClearanceMm ? 'conservativeClearanceMm' : 'clearanceMm';
  const clearance = centerline[clearanceSource];
  // A conservative lower bound may be zero or negative: that means there is
  // insufficient certified radial room at that sample, not missing data.
  const hasClearance = clearance?.length === points.length && Array.from(clearance).every(Number.isFinite);
  if (clearance !== undefined && !hasClearance) throw new TypeError('Centerline clearance samples must be finite and match the physical path.');
  const centre = points.reduce((acc, p) => add(acc, mul(p, 1 / points.length)), [0, 0, 0]);
  const table = { points, arcMm, lengthMm: arcMm.at(-1) };
  return {
    table,
    hasClearance, clearanceSource: hasClearance ? clearanceSource : null,
    sample(arc) {
      const p = samplePolyline(table, arc);
      const preferred = hasNormals ? mix(normals[p.i], normals[p.i + 1], p.t) : [centre[0] - p.position[0], 0, centre[2] - p.position[2]];
      return {
        ...frame(p.position, p.tangent, preferred),
        clearanceMm: hasClearance ? lerp(clearance[p.i], clearance[p.i + 1], p.t) : null,
      };
    },
  };
}

function insertionSampler(profile, centerline, insertionDepthMm) {
  const reference = prepareCenterline(centerline);
  const requested = insertionDepthMm ?? profile.nominalInsertionMm;
  if (!Number.isFinite(requested) || requested <= 0) throw new RangeError('insertionDepthMm must be finite and positive.');
  const maximum = Math.min(requested, reference.table.lengthMm);
  const clearanceMarginMm = 0.01;
  const assess = (depth) => {
    let minimumMargin = Infinity;
    const visibleLength = Math.min(depth, profile.bodyLengthMm);
    const count = Math.max(2, Math.ceil(visibleLength / 0.08));
    for (let i = 0; i <= count; i++) {
      const s = visibleLength * i / count;
      const c = reference.sample(depth - s).clearanceMm;
      if (c === null) continue;
      minimumMargin = Math.min(minimumMargin, c - envelopeRadius(profile, s));
    }
    return minimumMargin;
  };
  let achieved = maximum;
  let minimumMargin = assess(achieved);
  if (reference.hasClearance) {
    // Never shrink the carrier. Back off the tip along the physical arc if the
    // conservative radial envelope exceeds this reference's estimated lumen.
    while (minimumMargin < clearanceMarginMm && achieved > 0.1) {
      achieved = Math.max(0.1, achieved - 0.05);
      minimumMargin = assess(achieved);
    }
  }
  const geometricClearancePassed = reference.hasClearance ? minimumMargin >= clearanceMarginMm : null;
  const placement = {
    pose: 'inserted', units: 'mm',
    requestedInsertionMm: requested, achievedInsertionMm: achieved,
    referencePathLengthMm: reference.table.lengthMm,
    partialInsertion: achieved < requested - 0.025,
    outsideCarrierLengthMm: Math.max(0, profile.bodyLengthMm - achieved),
    clearanceBackoffMm: maximum - achieved,
    pathLengthLimited: requested > reference.table.lengthMm,
    approximateGeometricClearancePassed: geometricClearancePassed,
    minimumEstimatedRadialMarginMm: Number.isFinite(minimumMargin) ? minimumMargin : null,
    clearanceMarginMm,
    clearanceSource: reference.clearanceSource,
    description: 'Reconstructed centreline placement; physical dimensions are retained. Residual length extends outside the entry.',
    limitation: 'Sampled geometric clearance, including a conservative surface-distance bound when supplied, is not a clinical safety margin. It does not establish atraumatic insertion, mechanics, tissue deformation, or a clinical fit.',
  };
  return {
    placement,
    sample(s) {
      const p = reference.sample(achieved - s);
      return frame(p.position, mul(p.tangent, -1), p.normal);
    },
  };
}

function makeMesh(id, role, material, metadata = {}) {
  return {
    id, layer: 'implant', role, positions: [], indices: [], normals: [],
    color: material.color, opacity: material.opacity ?? 1,
    material: { ...material }, ...metadata,
  };
}

function pushVertex(mesh, p) {
  mesh.positions.push(...p.position);
  mesh.normals.push(...p.normal);
}

function quad(mesh, a, b, c, d) {
  // Adjacent circumferential points a,b; next axial row c,d.
  mesh.indices.push(a, b, c, b, d, c);
}

function carrierMesh(profile, sampler, segments) {
  // bodyLengthMm can end at a marker landmark, rather than at a silicone end.
  // Continue just far enough to support the reconstructed marker width.
  const totalLength = Math.max(profile.bodyLengthMm + (profile.geometry.wing?.lengthMm ?? 0),
    ...(profile.geometry.markers ?? []).map((m) => m.atMm + m.widthMm / 2));
  const count = Math.max(24, Math.ceil(totalLength / 0.14));
  const mesh = makeMesh(`${profile.id}-carrier`, 'carrier', carrierMaterial, {
    label: `${profile.name} carrier · physical millimetres; reconstructed intermediate taper`,
  });
  for (let i = 0; i <= count; i++) {
    const s = totalLength * i / count;
    for (let j = 0; j < segments; j++) pushVertex(mesh, surfacePoint(profile, sampler, s, j * TAU / segments));
    if (i > 0) for (let j = 0; j < segments; j++) {
      const k = (j + 1) % segments;
      quad(mesh, (i - 1) * segments + j, (i - 1) * segments + k, i * segments + j, i * segments + k);
    }
  }
  // End caps with separate vertices/normals, so the cylindrical shading is not
  // contaminated by flat cap normals.
  for (const end of [0, 1]) {
    const s = end ? totalLength : 0;
    const f = sampler(s);
    const normal = mul(f.tangent, end ? 1 : -1);
    const center = mesh.positions.length / 3;
    pushVertex(mesh, { position: f.position, normal });
    for (let j = 0; j < segments; j++) pushVertex(mesh, { position: surfacePoint(profile, sampler, s, j * TAU / segments).position, normal });
    for (let j = 0; j < segments; j++) {
      const a = center + 1 + j, b = center + 1 + (j + 1) % segments;
      if (end) mesh.indices.push(center, a, b); else mesh.indices.push(center, b, a);
    }
  }
  return mesh;
}

function surfaceWidth(profile, s, azimuth, halfAngle) {
  let width = 0, last = null;
  for (let j = 0; j <= 48; j++) {
    const p = crossSection(profile, s, azimuth - halfAngle + 2 * halfAngle * j / 48);
    const point = [p.x, p.y, 0];
    if (last) width += norm(sub(point, last));
    last = point;
  }
  return width;
}

function contactMesh(profile, sampler, contact) {
  const g = profile.geometry;
  const t = contact.siteIndex / Math.max(1, profile.channelCount - 1);
  const area = g.approximatePadAreaMm2 ?? lerp(g.areaAtTipMm2, g.areaAtBaseMm2, t);
  const shape = g.contactShape;
  const shapeFactor = shape === 'oval-pad' ? Math.PI / 4 : shape === 'rounded-pad' ? 0.89 : 1;
  const width = surfaceWidth(profile, contact.distanceFromTipMm, contact.azimuthRadians, g.contactArcHalfRadians);
  const length = area / (width * shapeFactor);
  const mesh = makeMesh(`${profile.id}-pad-${contact.implantContactIndex}`, 'contact', platinumMaterial, {
    implantContactIndex: contact.implantContactIndex,
    label: contact.label,
    channelIndex: contact.channelIndex,
    siteIndex: contact.siteIndex,
    padInSite: contact.padInSite,
    contactShape: shape,
    geometryStatus: g.contactAreaStatus,
  });
  const axialSteps = shape === 'half-band' || shape === 'rectangular-pad' ? 4 : 12;
  const angularSteps = shape === 'half-band' ? 16 : 12;
  for (let i = 0; i <= axialSteps; i++) {
    const u = 2 * i / axialSteps - 1;
    let factor = 1;
    if (shape === 'oval-pad') factor = Math.sqrt(Math.max(0.0001, 1 - u * u));
    if (shape === 'rounded-pad') factor = (Math.max(0.0001, 1 - u ** 4)) ** 0.25;
    const s = contact.distanceFromTipMm + u * length / 2;
    for (let j = 0; j <= angularSteps; j++) {
      const v = 2 * j / angularSteps - 1;
      const phi = contact.azimuthRadians + v * g.contactArcHalfRadians * factor;
      pushVertex(mesh, surfacePoint(profile, sampler, s, phi, 0.008));
      if (i > 0 && j > 0) {
        const n = angularSteps + 1;
        // Grid increases axial coordinate first, hence use circumferential-first winding.
        quad(mesh, (i - 1) * n + j - 1, (i - 1) * n + j, i * n + j - 1, i * n + j);
      }
    }
  }
  const position = surfacePoint(profile, sampler, contact.distanceFromTipMm, contact.azimuthRadians, 0.008).position;
  return {
    mesh,
    contact: {
      ...contact, position, axialFootprintLengthMm: length,
      reconstructedFootprintAreaMm2: area, footprintStatus: g.contactAreaStatus,
      sizeAtSiteMm: sectionSize(profile, contact.distanceFromTipMm),
      geometryStatus: g.sitePlacementStatus,
    },
  };
}

function bandMesh(profile, sampler, marker, index, inactive = false) {
  const material = { color: marker.color, opacity: inactive ? 0.95 : 0.88, roughness: inactive ? 0.3 : 0.75, metalness: inactive ? 0.65 : 0 };
  const mesh = makeMesh(`${profile.id}-${inactive ? 'inactive' : 'depth'}-marker-${index}`, inactive ? 'inactive-marker' : 'marker', material, {
    label: marker.label, stimulating: false,
  });
  const segments = 32;
  const offset = inactive ? 0.004 : 0.012;
  for (let i = 0; i <= 2; i++) {
    const s = marker.atMm + (i / 2 - 0.5) * marker.widthMm;
    for (let j = 0; j < segments; j++) pushVertex(mesh, surfacePoint(profile, sampler, s, j * TAU / segments, offset));
    if (i > 0) for (let j = 0; j < segments; j++) {
      const next = (j + 1) % segments;
      quad(mesh, (i - 1) * segments + j, (i - 1) * segments + next, i * segments + j, i * segments + next);
    }
  }
  return mesh;
}

function wingMesh(profile, sampler) {
  const g = profile.geometry.wing;
  if (!g) return null;
  const mesh = makeMesh(`${profile.id}-wing`, 'carrier', { ...carrierMaterial, opacity: 0.77 }, { label: `Proximal wing · ${g.lengthMm} mm length; reconstructed cross-section` });
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps, s = g.startMm + u * g.lengthMm, f = sampler(s);
    const r = sectionSize(profile, s)[0] / 2;
    const extent = 0.06 + g.heightMm * Math.sin(Math.PI * u) ** 0.65;
    const halfThickness = g.widthMm * 0.18;
    const corners = [[-r, -halfThickness], [-r - extent, -halfThickness], [-r - extent, halfThickness], [-r, halfThickness]];
    for (const [n, b] of corners) {
      const position = add(f.position, add(mul(f.normal, n), mul(f.binormal, b)));
      pushVertex(mesh, { position, normal: unit(add(mul(f.normal, n + r), mul(f.binormal, b))) });
    }
    if (i > 0) for (let j = 0; j < 4; j++) quad(mesh, (i - 1) * 4 + j, (i - 1) * 4 + (j + 1) % 4, i * 4 + j, i * 4 + (j + 1) % 4);
  }
  return mesh;
}

function getBounds(meshes) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of meshes) for (let i = 0; i < mesh.positions.length; i += 3) {
    for (let j = 0; j < 3; j++) {
      min[j] = Math.min(min[j], mesh.positions[i + j]);
      max[j] = Math.max(max[j], mesh.positions[i + j]);
    }
  }
  const center = mix(min, max, 0.5), size = sub(max, min);
  return { min, max, center, size, radius: norm(size) / 2 };
}

/**
 * @param {string|object} profileOrId A profile ID or immutable profile object.
 * @param {object} options
 * @param {'bench'|'inserted'} [options.pose='bench']
 * @param {object} [options.centerline] {displayPoints,arcMm,inwardNormals?,clearanceMm?,conservativeClearanceMm?}
 * @param {number} [options.insertionDepthMm] Physical distance of tip along path.
 * @param {number} [options.radialSegments=16] Carrier mesh detail; 8..48.
 * @returns {{meshes:Array,paths:Array,tubes:Array,markers:Array,labels:Array,bounds:object,contacts:Array,profile:object,placement:object,notes:Array}}
 */
export function createImplantGeometry(profileOrId = 'cochlear-ci622', options = {}) {
  const profile = typeof profileOrId === 'string' ? getImplantProfile(profileOrId) : profileOrId;
  if (!profile?.geometry || !Number.isFinite(profile.bodyLengthMm)) throw new TypeError('A valid implant reference profile is required.');
  const pose = options.pose ?? 'bench';
  if (pose !== 'bench' && pose !== 'inserted') throw new RangeError('Implant pose must be bench or inserted.');
  const segments = clamp(Math.round(options.radialSegments ?? 16), 8, 48);
  if (!Number.isFinite(segments)) throw new TypeError('radialSegments must be finite.');
  const inserted = pose === 'inserted' ? insertionSampler(profile, options.centerline, options.insertionDepthMm) : null;
  const sampler = inserted?.sample ?? benchSampler(profile);
  const placement = inserted?.placement ?? {
    pose: 'bench', units: 'mm', description: 'Manufacturer dimensions with reconstructed taper and free-rest shape.',
    requestedInsertionMm: null, achievedInsertionMm: null, partialInsertion: false,
    approximateGeometricClearancePassed: null,
  };
  const meshes = [carrierMesh(profile, sampler, segments)];
  const wing = wingMesh(profile, sampler);
  if (wing) meshes.push(wing);
  const contacts = [];
  for (const contact of getImplantContactMap(profile)) {
    const generated = contactMesh(profile, sampler, contact);
    meshes.push(generated.mesh);
    contacts.push({
      ...generated.contact,
      withinReferencePath: pose === 'inserted' ? contact.distanceFromTipMm <= placement.achievedInsertionMm : null,
    });
  }
  const inactive = profile.geometry.inactiveMarkers ?? [];
  inactive.forEach((marker, i) => meshes.push(bandMesh(profile, sampler, marker, i, true)));
  (profile.geometry.markers ?? []).forEach((marker, i) => {
    const mesh = bandMesh(profile, sampler, marker, i);
    if (inactive.some((item) => Math.abs(item.atMm - marker.atMm) < 0.1)) {
      // A translucent blue cover reveals the separate inactive metal marker.
      mesh.opacity = 0.48; mesh.material.opacity = 0.48;
    }
    meshes.push(mesh);
  });
  const tip = sampler(0).position;
  const base = sampler(profile.bodyLengthMm).position;
  const labels = [
    { id: `${profile.id}-tip-label`, position: add(tip, [0, 0.55, 0]), text: 'Apical tip', layer: 'implant', priority: 2 },
    { id: `${profile.id}-base-label`, position: add(base, [0, 0.7, 0]), text: `${profile.bodyLengthMm} mm · ${profile.bodyLengthLabel}`, layer: 'implant', priority: 1 },
  ];
  const bounds = getBounds(meshes);
  const notes = [...profile.notes];
  if (pose === 'inserted') {
    placement.insidePhysicalPadCount = contacts.filter((c) => c.withinReferencePath).length;
    placement.outsidePhysicalPadCount = contacts.length - placement.insidePhysicalPadCount;
    notes.push(placement.limitation);
    if (placement.partialInsertion) {
      notes.push(`This reconstruction places the tip ${placement.achievedInsertionMm.toFixed(2)} mm along the measured path, versus ${placement.requestedInsertionMm.toFixed(2)} mm requested. Dimensions were not scaled to force full insertion.`);
    }
    if (placement.approximateGeometricClearancePassed === false) notes.push('The conservative radius check still reports possible geometric overlap; this reference does not establish a contained fit.');
    if (placement.approximateGeometricClearancePassed === null) notes.push('The supplied reference has no valid clearance samples; containment has not been checked.');
  }
  return {
    schema: 'cochlear-implant-geometry/v1', units: 'mm', mode: 'implant-inspection',
    profile, meshes, paths: [], tubes: [], markers: [], labels, bounds,
    contacts, placement, notes,
    physicalScale: { unit: 'mm', referenceLengthMm: 1, artificialMagnification: false },
    electricalOverlay: false,
  };
}

