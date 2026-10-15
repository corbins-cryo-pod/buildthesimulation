import * as THREE from 'three';

/**
 * Registered, deterministic cellular detail for the v4 atlas.
 *
 * All inputs and returned paths use millimetres in the anatomical coordinate
 * system. Mesh vertices are kept local to their soma or terminal so submicron
 * surfaces do not lose precision when the anatomical z coordinate is ~1600 mm.
 * These are class-informed synthetic surfaces, not EM segmentations, measured
 * synapse maps, or electrophysiology-ready membrane meshes.
 */
export const MORPHOLOGY_EVIDENCE = Object.freeze({
  basis: 'Reference-informed synthetic morphology; not an EM segmentation',
  dimensions: 'Local dimensions and placement are explicit model priors, not measurements from resized comparison plates.',
  meissner: 'Handler et al. 2023, PMC10773061: longitudinal, flattened terminal profiles, side protrusions and interdigitating support processes; cross-species structural analogue.',
  pacinian: 'Handler et al. 2023, PMC10773061: central ending with protrusions; interleaved inner support processes and closed outer lamellae.',
  drg: 'Human ganglion comparison plates 21–23: pseudounipolar soma, continuous stem, conformal satellite support; no dendrites or DRG synapse.',
  nmj: 'Jones et al. 2017, PMC5723673: varied, compact human endplates with separated receptor islands; not a copied mouse pretzel.',
  proprioception: 'PMC4811329: sheep extraocular spindle and tendon-organ analogues; neither a human finger reconstruction nor a human size calibration.',
  central: 'Multipolar spinal, cuneate and VPL class priors; simplified cortical pyramidal trees. Nissl profiles do not establish complete dendritic topology.',
});

const TAU = Math.PI * 2;
const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const mul = (a, k) => a.map(v => v * k);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const length = a => Math.hypot(...a);
const norm = a => length(a) > 1e-15 ? mul(a, 1 / length(a)) : [0, 0, 1];
const lerp = (a, b, t) => add(mul(a, 1 - t), mul(b, t));
const dist = (a, b) => length(sub(a, b));

function hashString(value) {
  let h = 2166136261;
  for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function frame(direction) {
  const w = norm(direction);
  const u = norm(cross(Math.abs(w[2]) > .85 ? [0, 1, 0] : [0, 0, 1], w));
  return { u, v: norm(cross(w, u)), w };
}

const identityFrame = { u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] };
const inFrame = (p, f) => add(add(mul(f.u, p[0]), mul(f.v, p[1])), mul(f.w, p[2]));

function terminalFrame(cell) {
  const t = cell.terminal;
  let bestDistance = Infinity;
  let direction = [0, 0, 1];
  for (const b of cell.branches || []) {
    if (b.points?.length < 2) continue;
    for (const [i, j] of [[0, 1], [b.points.length - 1, b.points.length - 2]]) {
      const d = dist(t, b.points[i]);
      if (d < bestDistance) {
        bestDistance = d;
        direction = sub(b.points[i], b.points[j]);
      }
    }
  }
  return frame(direction);
}

// Each local object is anchored at the actual registered soma or terminal.
function buildPlan(cell) {
  if (!cell || !Array.isArray(cell.soma) || cell.soma.length !== 3 || !cell.soma.every(Number.isFinite)) {
    throw new TypeError('A cell needs a finite three-coordinate soma in millimetres.');
  }
  const rng = seeded(hashString(cell.id));
  const paths = [];
  const shapes = [];
  const radius = cell.somaRadiusMm || .018;
  const somaAxes = [radius * (.94 + rng() * .12), radius * (.88 + rng() * .18), radius * (.93 + rng() * .13)];
  const somaPhase = rng() * TAU;
  const color = cell.kind === 'motor' || cell.type === 'm1' ? 0xf2a36f : cell.kind === 'sensory' ? 0x67d8d1 : cell.kind === 'interneuron' ? 0xc4a0e7 : 0x98c2f2;
  const plan = { cell, paths, shapes, somaAxes, somaPhase, color };

  function path(points, r0, r1, role = 'dendrite', anchor = 'soma', f = identityFrame) {
    const radii = Array.isArray(r0) ? r0 : points.map((_, i) => r0 + (r1 - r0) * i / Math.max(1, points.length - 1));
    const origin = anchor === 'terminal' ? cell.terminal : cell.soma;
    const local = points.map(p => inFrame(p, f));
    const record = { points: local.map(p => add(origin, p)), radii, role, anchor, localPoints: local };
    paths.push(record);
    return record;
  }
  function ellipsoid(anchor, center, axes, material, options = {}) {
    shapes.push({ kind: 'ellipsoid', anchor, center, axes, material, ...options });
  }

  ellipsoid('soma', [0, 0, 0], somaAxes, 'membrane', { phase: somaPhase, wobble: cell.kind === 'sensory' ? .025 : .055, name: 'Cell membrane' });
  ellipsoid('soma', [radius * .11, -radius * .09, radius * .03], [radius * .37, radius * .34, radius * .35], 'nucleus', { phase: somaPhase, wobble: .018, name: 'Modeled nucleus' });
  ellipsoid('soma', [radius * .2, -radius * .1, radius * .03], [radius * .072, radius * .068, radius * .075], 'nucleolus', { name: 'Modeled nucleolus' });

  if (cell.kind === 'sensory') {
    // Pseudounipolar cells have a soma stem from the registry, not dendrites.
    // The support layer conforms to this same smooth soma surface. Each cell
    // patch is a spherical Voronoi domain, not a necklace of detached spheres.
    const count = 10 + Math.floor(rng() * 5);
    const directions = Array.from({ length: count }, (_, i) => {
      const z = 1 - 2 * (i + .5) / count;
      const a = i * 2.3999632297 + somaPhase;
      return [Math.sqrt(1 - z * z) * Math.cos(a), Math.sqrt(1 - z * z) * Math.sin(a), z];
    });
    shapes.push({ kind: 'satellites', anchor: 'soma', axes: somaAxes, phase: somaPhase, directions, material: 'satellite' });
    directions.forEach((d, i) => {
      if (i % 2) return;
      const center = d.map((n, k) => n * (somaAxes[k] + .00115));
      ellipsoid('soma', center, [.0025, .0013, .0021], 'supportNucleus', { f: frame(d), name: 'Satellite-cell nucleus', phase: somaPhase + i, wobble: .05 });
    });
  } else {
    const pyramidal = cell.type === 's1' || cell.type === 'm1';
    const motor = cell.type === 'lower-motor';
    const vpl = cell.type === 'vpl';
    const rootCount = pyramidal ? 4 : motor ? 8 : vpl ? 7 : 6;
    const basalScale = motor ? .085 : vpl ? .058 : cell.type === 'cuneate' ? .072 : .049;
    // The integrated atlas rotates source coordinates so +Y is superior.
    const spreadFrame = frame(cell.apicalDirection || [0, 1, 0]);
    const azimuth = rng() * TAU;

    function grow(origin, direction, extent, rad, depth, anisotropy = [1, 1, 1]) {
      const localFrame = frame(direction);
      const end = add(origin, mul(direction, extent));
      const bendU = (rng() - .5) * extent * .38;
      const bendV = (rng() - .5) * extent * .32;
      const pts = Array.from({ length: 7 }, (_, i) => {
        const t = i / 6;
        return add(lerp(origin, end, t), add(mul(localFrame.u, Math.sin(t * Math.PI) * bendU), mul(localFrame.v, Math.sin(t * Math.PI) * bendV)));
      });
      path(pts, rad, rad * .57);
      if (!depth) return;
      const divergence = .42 + rng() * .36;
      const fork = norm(add(mul(localFrame.u, rng() - .5), mul(localFrame.v, rng() - .5)));
      for (const sign of [-1, 1]) {
        const raw = norm(add(mul(direction, .82), mul(fork, sign * divergence)));
        const next = norm(raw.map((v, k) => v * anisotropy[k]));
        grow(end, next, extent * (.55 + rng() * .17), rad * .57, depth - 1, anisotropy);
      }
    }

    for (let i = 0; i < rootCount; i++) {
      const theta = azimuth + i * TAU / rootCount + (rng() - .5) * .36;
      const z = pyramidal ? -.22 - rng() * .24 : -.65 + 1.3 * rng();
      const radial = Math.sqrt(1 - z * z);
      const d = inFrame([Math.cos(theta) * radial, Math.sin(theta) * radial, z], spreadFrame);
      const origin = mul(d, radius * .75);
      const extent = basalScale * (.68 + rng() * .62);
      // Unequal VPL extents preserve anisotropy; the branches are not a star
      // copied from the symmetric teaching specimen in v3.
      grow(origin, d, extent * (vpl && i % 3 === 0 ? 1.45 : 1), radius * .14, pyramidal ? 1 : 2, vpl ? [1.18, .82, 1.04] : [1, 1, 1]);
    }
    if (pyramidal) {
      const d = spreadFrame.w;
      const lengthApical = cell.type === 'm1' ? .24 : .17;
      const points = Array.from({ length: 13 }, (_, i) => add(mul(d, radius * .68 + lengthApical * i / 12), mul(spreadFrame.u, Math.sin(i / 12 * 3.2) * .011)));
      path(points, radius * .19, .0011);
      for (let i = 0; i < 3; i++) {
        const origin = points[4 + i * 2];
        const theta = azimuth + i * 2.1;
        const side = inFrame([Math.cos(theta), Math.sin(theta), .32], spreadFrame);
        grow(origin, norm(side), .052 + rng() * .025, .0011, 0);
      }
      for (let i = 0; i < 4; i++) {
        const theta = azimuth + i * TAU / 4;
        grow(points.at(-1), norm(inFrame([Math.cos(theta), Math.sin(theta), .5], spreadFrame)), .055 + rng() * .03, .001, 0);
      }
    }
  }

  if (!Array.isArray(cell.terminal)) return plan;
  const f = terminalFrame(cell);
  const terminalType = cell.receptorType || cell.type;
  const tp = (points, r0, r1, role = 'terminal') => path(points, r0, r1, role, 'terminal', f);
  const te = (center, axes, material, options = {}) => ellipsoid('terminal', inFrame(center, f), axes, material, { f, ...options });
  const supportPath = (points, radii, material = 'support') => shapes.push({ kind: 'tube', anchor: 'terminal', points: points.map(p => inFrame(p, f)), radii, material });

  if (terminalType === 'meissner') {
    const count = 11 + Math.floor(rng() * 4);
    const height = .08 + rng() * .04;
    const trunk = Array.from({ length: count + 1 }, (_, i) => [Math.sin(i * .57 + somaPhase) * .002, Math.sin(i * .41) * .0015, height * i / count]);
    trunk[0] = [0, 0, 0];
    tp(trunk, .0018, .00095);
    // Longitudinal branches with flattened side profiles replace the regular
    // helical axon loops in v3. These belong to one registered afferent; a
    // second afferent is never invented inside a one-cell detail object.
    for (let i = 2; i < count; i++) {
      const sign = i % 2 ? 1 : -1;
      const stem = trunk[i];
      const reach = .006 + rng() * .007;
      const tip = add(stem, [sign * reach, (rng() - .5) * .008, .004 + rng() * .009]);
      tp([stem, add(stem, [sign * reach * .55, (tip[1] - stem[1]) * .7, .002]), tip], .00095, .00045);
      te(tip, [.0025, .00065, .004 + rng() * .002], 'terminal', { phase: i + somaPhase, wobble: .1 });
    }
    for (let i = 0; i < count - 1; i++) {
      const t = (i + .5) / count;
      const width = .005 + Math.sin(t * Math.PI) * .010;
      te([(rng() - .5) * .003, (rng() - .5) * .003, height * t], [width, .008 + rng() * .004, .001 + rng() * .0007], 'lamella', { phase: somaPhase + i * .8, wobble: .13 });
    }
    te([0, 0, height * .5], [.018, .014, height * .56], 'capsule', { phase: somaPhase, wobble: .035 });
  } else if (terminalType === 'merkel') {
    const nodes = [[0, 0, 0]];
    const count = 6 + Math.floor(rng() * 5);
    for (let i = 0; i < count; i++) {
      const angle = i * 2.39996323 + somaPhase;
      const rho = Math.sqrt((i + .6) / count);
      const tip = [Math.cos(angle) * rho * .036, Math.sin(angle) * rho * .025, .018 + rng() * .009];
      const parent = nodes.reduce((best, p) => dist(p, tip) < dist(best, tip) ? p : best, nodes[0]);
      tp([parent, add(lerp(parent, tip, .55), [0, 0, -.005]), tip], .00095, .00055);
      nodes.push(tip);
      te(tip, [.003, .0034, .0013], 'terminal', { phase: i, wobble: .12 });
      te(add(tip, [0, 0, .004]), [.0053 + rng() * .0018, .005 + rng() * .001, .0038], 'receptor', { phase: somaPhase + i, wobble: .06 });
      te(add(tip, [0, 0, .0044]), [.0018, .0018, .0014], 'supportNucleus');
    }
  } else if (terminalType === 'pacinian') {
    const height = .78 + rng() * .30;
    const center = height * .48;
    const points = Array.from({ length: 23 }, (_, i) => [Math.sin(i * .4) * .0024, Math.sin(i * .31) * .0018, height * i / 22]);
    points[0] = [0, 0, 0];
    tp(points, .0027, .0015);
    for (let i = 3; i < 21; i += 2) {
      const angle = somaPhase + i * 1.71;
      const p = points[i];
      const end = add(p, [Math.cos(angle) * (.006 + rng() * .006), Math.sin(angle) * .006, (rng() - .5) * .008]);
      tp([p, lerp(p, end, .5), end], .001, .00045);
      te(end, [.0011, .0012, .0022], 'terminal', { phase: i, wobble: .08 });
    }
    const outer = .15 + rng() * .065;
    for (let i = 0; i < 12; i++) {
      const t = (i + 1) / 12;
      te([.0015 * Math.sin(i), .002 * Math.cos(i * .7), center], [.014 + outer * t, .011 + outer * t * .72, height * (.36 + .2 * t)], 'pacinianLamella', { phase: somaPhase + i * .15, wobble: .018, name: 'Closed Pacinian lamella' });
    }
    // Inner support processes are individual overlapping oblate surfaces, not
    // claims that each concentric outer shell represents one Schwann cell.
    for (let i = 0; i < 7; i++) {
      const sign = i % 2 ? 1 : -1;
      te([sign * .005, 0, height * (.14 + i * .11)], [.005, .013, .05 + rng() * .018], 'lamella', { phase: i, wobble: .08 });
    }
  } else if (terminalType === 'free' || terminalType === 'sa2') {
    const roots = [[0, 0, 0]];
    const extent = terminalType === 'free' ? .055 : .11;
    function grow(parent, direction, reach, depth) {
      const end = add(parent, mul(direction, reach));
      const middle = add(lerp(parent, end, .48), [(rng() - .5) * reach * .23, (rng() - .5) * reach * .23, 0]);
      tp([parent, lerp(parent, middle, .5), middle, lerp(middle, end, .5), end], .00048 + depth * .00011, .0003 + depth * .00008);
      if (terminalType === 'free') {
        const p = lerp(middle, end, .55);
        te(p, [.0008, .0007, .0012], 'terminal', { phase: somaPhase + reach, wobble: .08 });
      }
      if (!depth) return;
      for (const s of [-1, 1]) grow(end, norm([direction[0] + s * (.4 + rng() * .6), direction[1] + (rng() - .5) * .9, .5 + rng() * .6]), reach * (.53 + rng() * .15), depth - 1);
    }
    grow(roots[0], [0, 0, 1], extent, 3);
    // SA-II physiological identity does not imply a proven fingertip Ruffini
    // organ. Deliberately show a diffuse ending without a named capsule.
  } else if (terminalType === 'spindle') {
    const fiberCount = 4;
    const halfLength = .54 + rng() * .10;
    const secondary = /^II\b/.test(cell.sensoryClass || '');
    for (let i = 0; i < fiberCount; i++) {
      const a = somaPhase + i * TAU / fiberCount;
      const cx = Math.cos(a) * .019;
      const cy = Math.sin(a) * .016;
      const fiber = Array.from({ length: 25 }, (_, k) => [cx + Math.sin(k * .17 + i) * .0015, cy + Math.sin(k * .21 + i) * .001, k / 24 * halfLength * 2]);
      const fiberRadii = fiber.map((_, k) => .0048 + (i < 2 ? .003 : .0013) * Math.exp(-(((k - 12) / 5) ** 2)));
      supportPath(fiber, fiberRadii, 'muscle');
      const turns = secondary ? .55 + rng() * .4 : 4.7 + rng() * 2.8;
      const samples = secondary ? 24 : 74;
      const coil = Array.from({ length: samples }, (_, j) => {
        const t = j / (samples - 1);
        const theta = a + t * turns * TAU + .18 * Math.sin(t * 11 + i);
        const r = .008 + .0015 * Math.sin(t * 5 + i);
        return [cx + Math.cos(theta) * r, cy + Math.sin(theta) * r, halfLength * (secondary ? 1.2 + .45 * t : .55 + .88 * t) + .006 * Math.sin(t * 9 + i)];
      });
      const root = [0, 0, 0];
      tp([root, [cx * .6, cy * .6, coil[0][2] * .65], coil[0]], .0014, .00095);
      tp(coil, .00095, .00065);
      const sideRoot = coil[secondary ? 7 + i : 28 + i];
      tp([sideRoot, add(sideRoot, [.004, -.003, .008]), add(sideRoot, [.006, -.002, .025])], .00065, .00035);
      if (secondary) for (let j = 0; j < 4; j++) {
        // Group-II examples use a sparse juxtaequatorial flower-spray pattern
        // rather than repeating the primary annulospiral ending.
        const p = coil[4 + j * 4];
        const angle = a + j * 1.1;
        const tip = add(p, [Math.cos(angle) * .005, Math.sin(angle) * .005, .014 + rng() * .015]);
        tp([p, lerp(p, tip, .55), tip], .00065, .00035);
      }
    }
    te([0, 0, halfLength], [.048, .044, halfLength * 1.04], 'capsule', { wobble: .025, phase: somaPhase, name: 'Intact spindle analogue capsule' });
  } else if (terminalType === 'golgi') {
    const organLength = .62 + rng() * .16;
    for (let i = 0; i < 20; i++) {
      const a = i * 2.39996323;
      const rho = Math.sqrt((i + .5) / 20) * .035;
      const points = Array.from({ length: 30 }, (_, j) => {
        const t = j / 29;
        const envelope = .4 + .6 * Math.sin(t * Math.PI);
        return [(Math.cos(a) * rho + .003 * Math.sin(t * 16 + i)) * envelope, (Math.sin(a) * rho + .002 * Math.sin(t * 13 + i)) * envelope, organLength * t];
      });
      supportPath(points, points.map(() => .0012 + (i % 3) * .00025), 'collagen');
    }
    const stem = [[0, 0, 0], [.001, 0, organLength * .18], [0, .001, organLength * .34]];
    tp(stem, .002, .0012);
    for (let i = 0; i < 6; i++) {
      const angle = i * 2.39996323 + somaPhase;
      const p = stem.at(-1);
      const tip = [Math.cos(angle) * .021, Math.sin(angle) * .021, organLength * (.67 + rng() * .22)];
      const mid = [Math.cos(angle) * .014, Math.sin(angle) * .014, organLength * .51];
      tp([p, lerp(p, mid, .5), mid, lerp(mid, tip, .5), tip], .0011, .00042);
      const branch = add(mid, [Math.cos(angle + .8) * .01, Math.sin(angle + .8) * .01, organLength * .18]);
      tp([mid, lerp(mid, branch, .5), branch], .00065, .0003);
    }
    te([0, 0, organLength * .5], [.047, .044, organLength * .53], 'capsule', { phase: somaPhase, wobble: .035, name: 'Intact tendon-organ analogue capsule' });
  } else if (terminalType === 'lower-motor' || (cell.kind === 'motor' && terminalType !== 'm1')) {
    const nodes = [[0, 0, 0]];
    const targets = [];
    const count = 11 + Math.floor(rng() * 6);
    for (let attempt = 0; attempt < 500 && targets.length < count; attempt++) {
      const x = (rng() - .5) * .038;
      const y = (rng() - .5) * .057;
      const rad = .0017 + rng() * .0011;
      if ((x / .02) ** 2 + (y / .03) ** 2 > 1) continue;
      if (targets.some(p => Math.hypot(p.x - x, p.y - y) < (rad + p.rad) * 1.35)) continue;
      targets.push({ x, y, rad });
    }
    const height = x => -.025 + Math.sqrt(Math.max(0, .025 ** 2 - x ** 2));
    const remaining = targets.map(t => ({ ...t }));
    while (remaining.length) {
      let best = { d: Infinity, index: 0, parent: nodes[0] };
      remaining.forEach((t, index) => nodes.forEach(parent => {
        const tip = [t.x, t.y, height(t.x) + .0015];
        const d = dist(parent, tip);
        if (d < best.d) best = { d, index, parent };
      }));
      const target = remaining.splice(best.index, 1)[0];
      const tip = [target.x, target.y, height(target.x) + .0015];
      const midpoint = add(lerp(best.parent, tip, .55), [0, 0, .0012]);
      tp([best.parent, midpoint, tip], .00085, .00055);
      nodes.push(tip);
      te(tip, [target.rad, target.rad * (.75 + rng() * .4), .0007], 'terminal', { phase: targets.length + remaining.length, wobble: .16 });
      te([target.x, target.y, height(target.x) + .0003], [target.rad * 1.16, target.rad * 1.08, .00022], 'receptor', { phase: remaining.length + somaPhase, wobble: .18, name: 'Separated postsynaptic receptor island' });
      if (remaining.length % 4 === 0) te(add(tip, [0, 0, .0009]), [target.rad * 1.2, target.rad * 1.25, .00024], 'lamella', { phase: somaPhase, wobble: .1 });
    }
    // A closed, tapered local muscle-fiber envelope avoids an exposed section
    // face. This is a support analogue at the actual forearm muscle endpoint.
    te([0, 0, -.025], [.025, .14, .025], 'muscleEnvelope', { phase: somaPhase, wobble: .008, name: 'Intact local muscle-fiber support envelope' });
  }
  return plan;
}

/** Local cellular arbors, expressed in the same world coordinates as axons. */
export function morphologyPaths(cell) {
  return buildPlan(cell).paths.map(({ points, radii, role, anchor }) => ({ points, radii, role, anchor }));
}

class SurfaceBuilder {
  constructor() { this.positions = []; this.indices = []; }
  vertex(p) { this.positions.push(...p); return this.positions.length / 3 - 1; }
  tri(a, b, c) { this.indices.push(a, b, c); }
  ellipsoid(shape, segments = 16, rings = 10) {
    const base = this.positions.length / 3;
    const f = shape.f || identityFrame;
    const phase = shape.phase || 0;
    const wobble = shape.wobble || 0;
    for (let j = 0; j <= rings; j++) {
      const theta = Math.PI * j / rings;
      for (let i = 0; i <= segments; i++) {
        const phi = TAU * i / segments;
        const unit = [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];
        const wave = 1 + wobble * Math.sin(unit[0] * 3 + phase) * Math.cos(unit[1] * 2.8 + phase * .7) * Math.sin(unit[2] * 3.4 + .8);
        this.vertex(add(shape.center, inFrame(unit.map((v, k) => v * shape.axes[k] * wave), f)));
      }
    }
    for (let j = 0; j < rings; j++) for (let i = 0; i < segments; i++) {
      const a = base + j * (segments + 1) + i;
      const b = a + segments + 1;
      if (j > 0) this.tri(a, b, a + 1);
      if (j < rings - 1) this.tri(a + 1, b, b + 1);
    }
  }
  tube(points, radii, sides = 7) {
    if (points.length < 2) return;
    const base = this.positions.length / 3;
    let u = null;
    for (let j = 0; j < points.length; j++) {
      const tangent = norm(sub(points[Math.min(j + 1, points.length - 1)], points[Math.max(j - 1, 0)]));
      u = u ? norm(sub(u, mul(tangent, dot(u, tangent)))) : frame(tangent).u;
      if (Math.abs(dot(u, tangent)) > .98) u = frame(tangent).u;
      const v = norm(cross(tangent, u));
      const radius = Array.isArray(radii) ? radii[j] : radii;
      for (let k = 0; k < sides; k++) {
        const a = TAU * k / sides;
        this.vertex(add(points[j], add(mul(u, Math.cos(a) * radius), mul(v, Math.sin(a) * radius))));
      }
    }
    for (let j = 0; j < points.length - 1; j++) for (let k = 0; k < sides; k++) {
      const a = base + j * sides + k;
      const b = base + j * sides + (k + 1) % sides;
      this.tri(a, b, a + sides);
      this.tri(b, b + sides, a + sides);
    }
    // Rounded terminal membranes are attached to true endpoints, never to
    // arbitrary peripheral shaft positions as if they were CNS boutons.
    this.ellipsoid({ center: points.at(-1), axes: Array(3).fill(Array.isArray(radii) ? radii.at(-1) : radii) }, sides, 4);
  }
  satellites(shape, segments = 28, rings = 18) {
    const phases = shape.directions.map((_, i) => i % 2 ? .98 : 1.02);
    const at = (theta, phi) => {
      const unit = [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];
      let owner = 0;
      shape.directions.forEach((d, i) => { if (dot(unit, d) > dot(unit, shape.directions[owner])) owner = i; });
      const wave = 1 + .025 * Math.sin(unit[0] * 3 + shape.phase) * Math.cos(unit[1] * 2.8 + shape.phase * .7) * Math.sin(unit[2] * 3.4 + .8);
      const position = unit.map((v, k) => v * (shape.axes[k] * wave + .00065 * phases[owner]));
      return { position, owner };
    };
    for (let j = 0; j < rings; j++) for (let i = 0; i < segments; i++) {
      const theta = (j + .5) * Math.PI / rings;
      const phi = (i + .5) * TAU / segments;
      const center = at(theta, phi);
      const corners = [at(j * Math.PI / rings, i * TAU / segments), at((j + 1) * Math.PI / rings, i * TAU / segments), at((j + 1) * Math.PI / rings, (i + 1) * TAU / segments), at(j * Math.PI / rings, (i + 1) * TAU / segments)];
      // Slight retraction makes individual support-cell boundaries visible.
      const ids = corners.map(p => this.vertex(lerp(center.position, p.position, p.owner === center.owner ? .985 : .88)));
      this.tri(ids[0], ids[1], ids[3]);
      this.tri(ids[3], ids[1], ids[2]);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setIndex(this.indices);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}

/**
 * At most a few meshes per material and anatomical anchor. Caller owns disposal.
 * Quality changes radial tessellation only; cell identity and arbor topology
 * are identical at every detail level.
 */
export function createCellDetail(cell, options = {}) {
  const plan = buildPlan(cell);
  const high = options.quality !== 'low';
  const group = new THREE.Group();
  group.name = `cell-detail:${cell.id}`;
  group.userData = { cellId: cell.id, modelBasis: MORPHOLOGY_EVIDENCE.basis, worldUnit: 'mm', detail: true };
  const anchors = new Map();
  const builders = new Map();
  const colors = {
    membrane: [plan.color, .83], neurite: [plan.color, 1], terminal: [plan.color, 1],
    nucleus: [0x7880b7, .78], nucleolus: [0xd3c3ed, .9],
    satellite: [0xbad7d9, .25], supportNucleus: [0x7395b0, .74],
    lamella: [0xa6ced4, .22], capsule: [0x91b7c5, .065],
    pacinianLamella: [0xd4c6a1, .052], receptor: [0xd6c69a, .82],
    muscle: [0xb48283, .6], muscleEnvelope: [0xad7c7d, .22],
    collagen: [0xc3bda0, .38], support: [0xa7bdc2, .35],
  };
  function getBuilder(anchor, material) {
    const key = `${anchor}:${material}`;
    if (!builders.has(key)) builders.set(key, { anchor, material, builder: new SurfaceBuilder() });
    return builders.get(key).builder;
  }
  for (const p of plan.paths) getBuilder(p.anchor, 'neurite').tube(p.localPoints, p.radii, high ? 8 : 5);
  for (const s of plan.shapes) {
    const b = getBuilder(s.anchor, s.material);
    if (s.kind === 'ellipsoid') b.ellipsoid(s, high ? 18 : 12, high ? 11 : 7);
    else if (s.kind === 'tube') b.tube(s.points, s.radii, high ? 7 : 5);
    else if (s.kind === 'satellites') b.satellites(s, high ? 28 : 20, high ? 18 : 12);
  }
  for (const { anchor, material, builder } of builders.values()) {
    if (!builder.positions.length) continue;
    if (!anchors.has(anchor)) {
      const child = new THREE.Group();
      child.name = `${cell.id}:${anchor}`;
      child.position.fromArray(anchor === 'terminal' ? cell.terminal : cell.soma);
      child.userData = { cellId: cell.id, anchor };
      anchors.set(anchor, child);
      group.add(child);
    }
    const [color, opacity] = colors[material] || colors.support;
    const mat = new THREE.MeshStandardMaterial({ color, roughness: .68, metalness: 0, transparent: opacity < 1, opacity, side: THREE.DoubleSide, depthWrite: opacity >= .8 });
    const mesh = new THREE.Mesh(builder.geometry(), mat);
    mesh.name = `${cell.id}:${anchor}:${material}`;
    mesh.userData = { cellId: cell.id, anchor, structure: material, layer: ['membrane', 'neurite', 'terminal', 'nucleus', 'nucleolus'].includes(material) ? 'neural' : 'support', sourceNote: MORPHOLOGY_EVIDENCE.basis };
    mesh.renderOrder = opacity < .5 ? 2 : 1;
    anchors.get(anchor).add(mesh);
  }
  group.userData.pathCount = plan.paths.length;
  group.userData.triangleCount = [...builders.values()].reduce((sum, { builder }) => sum + builder.indices.length / 3, 0);
  return group;
}

export function morphologyStats(cell) {
  const plan = buildPlan(cell);
  return {
    paths: plan.paths.length,
    dendrites: plan.paths.filter(p => p.role === 'dendrite').length,
    terminalBranches: plan.paths.filter(p => p.role === 'terminal').length,
    points: plan.paths.reduce((n, p) => n + p.points.length, 0),
    hasSoma: true,
    hasTerminal: plan.paths.some(p => p.anchor === 'terminal'),
    basis: MORPHOLOGY_EVIDENCE.basis,
  };
}
