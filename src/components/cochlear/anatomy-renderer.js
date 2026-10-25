/**
 * One anatomical scene graph for WebGL and a CPU Canvas2D projection.
 * The software backend shades the same indexed mesh triangles and uses the
 * same perspective camera and triangle raycaster. It is not a substitute
 * line drawing or a second anatomical model.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const PALETTE = [[-80, [71, 98, 121]], [-60, [112, 148, 162]], [-25, [209, 184, 119]], [30, [189, 81, 63]]];
const linear = x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;
const SRGB_TABLE = Uint8Array.from({ length: 4097 }, (_, index) => {
  const x = index / 4096; return Math.round(255 * (x <= .0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - .055));
});
const srgb = x => SRGB_TABLE[clamp(Math.round(x * 4096), 0, 4096)];

function color(value = '#859f9f') {
  if (Array.isArray(value) || ArrayBuffer.isView(value)) {
    const scale = Math.max(...value) > 1 ? 255 : 1;
    return new THREE.Color().setRGB(value[0] / scale, value[1] / scale, value[2] / scale, THREE.SRGBColorSpace);
  }
  return new THREE.Color(value);
}

function membraneColor(value, target, offset = 0) {
  let i = 0;
  while (i < PALETTE.length - 2 && value > PALETTE[i + 1][0]) i++;
  const [a, b] = [PALETTE[i], PALETTE[i + 1]];
  const t = clamp((value - a[0]) / (b[0] - a[0]), 0, 1);
  for (let c = 0; c < 3; c++) target[offset + c] = linear((a[1][c] + t * (b[1][c] - a[1][c])) / 255);
}

/** Nearest recorded frame; no generated spikes or animated cell activity. */
export function sampledMembraneValue(fiber, compartmentIndex, timeMs) {
  const r = fiber?.response;
  if (!r?.replayTimesMs?.length || !r?.replayMv?.length || !Number.isInteger(compartmentIndex) || compartmentIndex < 0 || compartmentIndex >= r.compartmentCount) return -65;
  const times = r.replayTimesMs;
  let lo = 0, hi = times.length - 1;
  while (lo + 1 < hi) { const mid = (lo + hi) >> 1; if (times[mid] < timeMs) lo = mid; else hi = mid; }
  const frame = Math.abs(times[hi] - timeMs) < Math.abs(times[lo] - timeMs) ? hi : lo;
  const value = r.replayMv[frame * r.compartmentCount + compartmentIndex];
  return Number.isFinite(value) ? value : -65;
}

/** Parallel-transport rings retain a real tube surface around curved fibers. */
export function tessellateAnatomyPath(path) {
  const points = path.points;
  if (!points || points.length < 2) return null;
  const sides = clamp(Math.round(path.radialSegments ?? 7), 4, 24);
  const count = points.length, positions = [], indices = [], mapping = [];
  let previousNormal = null;
  const p = new THREE.Vector3(), tangent = new THREE.Vector3(), normal = new THREE.Vector3(), binormal = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(count - 1, i + 1)];
    p.fromArray(points[i]); tangent.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (tangent.lengthSq() < 1e-20) tangent.set(0, 1, 0); else tangent.normalize();
    if (previousNormal) {
      normal.copy(previousNormal).addScaledVector(tangent, -previousNormal.dot(tangent));
      if (normal.lengthSq() < 1e-12) previousNormal = null;
    }
    if (!previousNormal) {
      normal.copy(Math.abs(tangent.y) < .8 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0));
      normal.addScaledVector(tangent, -normal.dot(tangent));
    }
    normal.normalize(); binormal.crossVectors(tangent, normal).normalize(); previousNormal = normal.clone();
    const radiusSource = path.radii ?? path.radius ?? .025;
    const radius = Array.isArray(radiusSource) || ArrayBuffer.isView(radiusSource) ? radiusSource[i] : radiusSource;
    if (!(radius > 0) || !Number.isFinite(radius)) throw new RangeError(`Invalid radius in anatomical path ${path.id ?? ''}.`);
    for (let j = 0; j < sides; j++) {
      const a = 2 * Math.PI * j / sides, c = radius * Math.cos(a), s = radius * Math.sin(a);
      positions.push(p.x + normal.x * c + binormal.x * s, p.y + normal.y * c + binormal.y * s, p.z + normal.z * c + binormal.z * s);
      mapping.push(path.compartmentIndices?.[i] ?? path.compartmentIndex ?? -1);
      if (i < count - 1) {
        const k = i * sides + j, next = i * sides + (j + 1) % sides;
        indices.push(k, next, k + sides, next, next + sides, k + sides);
      }
    }
  }
  if (path.capped !== false) {
    const first = positions.length / 3; positions.push(...points[0]); mapping.push(path.compartmentIndices?.[0] ?? path.compartmentIndex ?? -1);
    const last = positions.length / 3; positions.push(...points[count - 1]); mapping.push(path.compartmentIndices?.[count - 1] ?? path.compartmentIndex ?? -1);
    for (let j = 0; j < sides; j++) {
      indices.push(first, (j + 1) % sides, j);
      indices.push(last, (count - 1) * sides + j, (count - 1) * sides + (j + 1) % sides);
    }
  }
  return { ...path, positions: new Float32Array(positions), indices: new Uint32Array(indices), compartmentIndices: new Int16Array(mapping) };
}

function markerDescriptor(marker) {
  const radius = marker.radius ?? .04;
  if (!(radius > 0)) throw new RangeError('Anatomical marker radius must be positive.');
  const sphere = new THREE.SphereGeometry(radius, marker.widthSegments ?? 12, marker.heightSegments ?? 8);
  const scale = marker.scale ?? [1, 1, 1]; sphere.scale(...scale); sphere.translate(...marker.position);
  const result = { ...marker, positions: Float32Array.from(sphere.attributes.position.array), indices: Uint32Array.from(sphere.index.array), normals: Float32Array.from(sphere.attributes.normal.array) };
  sphere.dispose(); return result;
}

export function anatomicalMesh(descriptor) {
  const values = Array.isArray(descriptor.positions?.[0]) ? descriptor.positions.flat() : descriptor.positions;
  if (!values?.length || values.length % 3 !== 0 || Array.from(values).some(x => !Number.isFinite(x))) throw new RangeError(`Invalid anatomical mesh ${descriptor.id ?? ''}.`);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(values), 3));
  if (descriptor.indices) {
    const indices = Array.from(descriptor.indices), count = values.length / 3;
    if (indices.length % 3 || indices.some(x => !Number.isInteger(x) || x < 0 || x >= count)) throw new RangeError(`Invalid triangle index in ${descriptor.id ?? 'anatomical mesh'}.`);
    geometry.setIndex(indices);
  } else if (values.length % 9) throw new RangeError(`Nonindexed anatomical mesh ${descriptor.id ?? ''} must contain complete triangles.`);
  if (descriptor.normals?.length === values.length) geometry.setAttribute('normal', new THREE.BufferAttribute(Float32Array.from(descriptor.normals), 3));
  else geometry.computeVertexNormals();
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  const properties = descriptor.material ?? {}, baseColor = color(properties.color ?? descriptor.color);
  const baseOpacity = clamp(properties.opacity ?? descriptor.opacity ?? 1, 0, 1);
  const compartmentIndices = descriptor.compartmentIndices ? Int16Array.from(descriptor.compartmentIndices) : (Number.isInteger(descriptor.compartmentIndex) ? new Int16Array(values.length / 3).fill(descriptor.compartmentIndex) : null);
  if (compartmentIndices && compartmentIndices.length !== values.length / 3) throw new RangeError(`Compartment mapping does not match vertices in ${descriptor.id ?? 'anatomical mesh'}.`);
  const dynamic = Number.isInteger(descriptor.fiberIndex) && compartmentIndices?.some(x => x >= 0);
  if (dynamic) {
    const colors = new Float32Array(values.length);
    for (let i = 0; i < colors.length; i += 3) membraneColor(-65, colors, i);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }
  const material = new THREE.MeshStandardMaterial({
    color: dynamic ? '#ffffff' : baseColor, opacity: baseOpacity,
    transparent: baseOpacity < .999, depthWrite: baseOpacity > .9,
    side: THREE.DoubleSide, roughness: properties.roughness ?? descriptor.roughness ?? .58,
    metalness: properties.metalness ?? descriptor.metalness ?? (descriptor.role === 'contact' ? .55 : 0),
    vertexColors: !!dynamic, flatShading: !!(properties.flatShading ?? descriptor.flatShading),
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = descriptor.id ?? descriptor.label ?? 'Anatomical structure';
  mesh.userData = { ...descriptor, compartmentIndices, dynamic: !!dynamic, baseColor, baseOpacity };
  return mesh;
}

export function buildAnatomyGroup(data) {
  const group = new THREE.Group();
  try {
    for (const descriptor of data.meshes ?? []) group.add(anatomicalMesh(descriptor));
    for (const path of data.paths ?? []) { const descriptor = tessellateAnatomyPath(path); if (descriptor) group.add(anatomicalMesh(descriptor)); }
    for (const marker of data.markers ?? []) group.add(anatomicalMesh(markerDescriptor(marker)));
    group.updateMatrixWorld(true); return group;
  } catch (error) { disposeAnatomyGroup(group); throw error; }
}

export function disposeAnatomyGroup(group) {
  group?.traverse(object => { object.geometry?.dispose(); if (Array.isArray(object.material)) object.material.forEach(m => m.dispose()); else object.material?.dispose(); });
}

/** Preserve the requested viewing direction and fit every bounding-box corner. */
export function fitAnatomyCamera(bounds, preferred, aspect = 1, pointCloud = null) {
  const target = new THREE.Vector3().fromArray(preferred.target);
  const direction = new THREE.Vector3().fromArray(preferred.position).sub(target);
  const originalDistance = direction.length(); direction.normalize();
  const up = new THREE.Vector3().fromArray(preferred.up ?? [0, 1, 0]);
  const right = new THREE.Vector3().crossVectors(up, direction).normalize();
  const vertical = new THREE.Vector3().crossVectors(direction, right).normalize();
  const tangent = Math.tan((preferred.fov ?? 35) * Math.PI / 360), delta = new THREE.Vector3();
  let distance = pointCloud?.length ? 0 : originalDistance;
  const include = (x, y, z) => {
    delta.set(x, y, z).sub(target);
    const depth = delta.dot(direction);
    distance = Math.max(distance, depth + Math.abs(delta.dot(right)) / (tangent * Math.max(.1, aspect) * .86), depth + Math.abs(delta.dot(vertical)) / (tangent * .76));
  };
  if (pointCloud?.length) for (let i = 0; i < pointCloud.length; i += 3) include(pointCloud[i], pointCloud[i + 1], pointCloud[i + 2]);
  else if (!bounds.isEmpty()) for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) include(x, y, z);
  return target.addScaledVector(direction, distance).toArray();
}

function cameraFitPoints(group) {
  const count = group.children.reduce((sum, mesh) => sum + mesh.geometry.attributes.position.count, 0), result = new Float32Array(count * 3), p = new THREE.Vector3();
  let offset = 0;
  for (const mesh of group.children) {
    const position = mesh.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) { p.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).toArray(result, offset); offset += 3; }
  }
  return result;
}

const LAYER_CONTROLS = { scala: 'scalae', membrane: 'membranes', nerve: 'neurons', myelin: 'neurons', 'hair-cell': 'hairCells', support: 'hairCells', organ: 'hairCells' };
export function anatomyLayerVisible(layer, layers = {}) {
  layers ??= {};
  if (!layer) return true;
  if (own(layers, layer) && layers[layer] === false) return false;
  return layers[LAYER_CONTROLS[layer] ?? layer] !== false;
}
function selected(mesh, state) {
  const d = mesh.userData;
  return (Number.isInteger(d.contactIndex) && d.contactIndex === state.selectedContact) ||
    (Number.isInteger(d.implantContactIndex) && d.implantContactIndex === state.selectedImplantContact) ||
    (Number.isInteger(d.fiberIndex) && d.fiberIndex === state.selectedFiber);
}

/** Styling and replay mapping never rescale physical contact geometry. */
export function applyAnatomyState(group, current) {
  if (!group) return;
  const cachedColors = new Map();
  for (const mesh of group.children) {
    const d = mesh.userData, material = mesh.material, selectedNow = selected(mesh, current);
    mesh.visible = anatomyLayerVisible(d.layer, current.layers) && d.baseOpacity > 0;
    const fiber = Number.isInteger(d.fiberIndex) ? current.fibers?.[d.fiberIndex] : null;
    const dead = d.alive === false || fiber?.alive === false;
    material.opacity = d.baseOpacity * (dead && d.baseOpacity > .25 ? .22 : 1); material.transparent = material.opacity < .999; material.depthWrite = material.opacity > .9;
    material.emissive.set(selectedNow ? (Number.isInteger(d.fiberIndex) ? '#15282d' : '#58380d') : '#000000');
    if (!d.dynamic) { material.color.copy(d.baseColor); continue; }
    const count = mesh.geometry.attributes.position.count, output = mesh.geometry.attributes.color.array;
    let palette = cachedColors.get(d.fiberIndex);
    if (!palette) {
      let compartmentCount = Math.max(65, fiber?.response?.compartmentCount ?? 0);
      for (const index of d.compartmentIndices) compartmentCount = Math.max(compartmentCount, index + 1);
      palette = new Float32Array(compartmentCount * 3);
      for (let i = 0; i < compartmentCount; i++) membraneColor(sampledMembraneValue(fiber, i, current.timeMs), palette, i * 3);
      cachedColors.set(d.fiberIndex, palette);
    }
    for (let i = 0; i < count; i++) {
      const compartment = d.compartmentIndices[i], start = i * 3;
      if (compartment < 0) { output[start] = d.baseColor.r; output[start + 1] = d.baseColor.g; output[start + 2] = d.baseColor.b; }
      else { output[start] = palette[compartment * 3]; output[start + 1] = palette[compartment * 3 + 1]; output[start + 2] = palette[compartment * 3 + 2]; }
    }
    mesh.geometry.attributes.color.needsUpdate = true;
  }
}

/** CPU surface projector. All caches refer to the actual Three mesh geometry. */
export class AnatomyCanvasRenderer {
  constructor(canvas) {
    this.domElement = canvas;
    this.context = canvas.getContext('2d', { alpha: false });
    if (!this.context) throw new Error('A canvas drawing context is unavailable.');
    this.meshes = []; this.triangles = []; this.projectedTriangles = 0;
    this.width = 1; this.height = 1; this.pixelRatio = 1;
  }
  setPixelRatio(value) { this.pixelRatio = value; }
  setSize(width, height) { this.width = width; this.height = height; this.domElement.width = Math.round(width * this.pixelRatio); this.domElement.height = Math.round(height * this.pixelRatio); }
  setGroup(group) {
    this.meshes = []; this.triangles = [];
    group?.updateMatrixWorld(true);
    group?.traverse(mesh => {
      if (!mesh.isMesh) return;
      const position = mesh.geometry.attributes.position, normal = mesh.geometry.attributes.normal;
      const world = new Float32Array(position.count * 3), normals = new Float32Array(position.count * 3);
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld), p = new THREE.Vector3(), n = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        p.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld); p.toArray(world, i * 3);
        n.fromBufferAttribute(normal, i).applyNormalMatrix(normalMatrix); n.toArray(normals, i * 3);
      }
      const cache = { mesh, world, normals, projected: new Float32Array(position.count * 4), frontColors: new Float32Array(position.count * 3), backColors: new Float32Array(position.count * 3) };
      this.meshes.push(cache);
      const indices = mesh.geometry.index?.array;
      const count = indices?.length ?? position.count;
      for (let i = 0; i < count; i += 3) {
        const a = indices?.[i] ?? i, b = indices?.[i + 1] ?? i + 1, c = indices?.[i + 2] ?? i + 2;
        const ia = a * 3, ib = b * 3, ic = c * 3;
        n.set(normals[ia] + normals[ib] + normals[ic], normals[ia + 1] + normals[ib + 1] + normals[ic + 1], normals[ia + 2] + normals[ib + 2] + normals[ic + 2]).normalize();
        this.triangles.push({ cache, a, b, c, depth: 0, area: 0, nx: n.x, ny: n.y, nz: n.z,
          cx: (world[ia] + world[ib] + world[ic]) / 3, cy: (world[ia + 1] + world[ib + 1] + world[ic + 1]) / 3, cz: (world[ia + 2] + world[ib + 2] + world[ic + 2]) / 3 });
      }
    });
  }
  render(scene, camera, theme = 'light') {
    const pixelWidth = this.domElement.width, pixelHeight = this.domElement.height, ratio = this.pixelRatio;
    const backgroundKey = `${pixelWidth}:${pixelHeight}:${theme}`;
    if (this.backgroundKey !== backgroundKey) {
      this.backgroundKey = backgroundKey;
      this.frame = this.context.createImageData(pixelWidth, pixelHeight);
      this.background = new Uint8ClampedArray(pixelWidth * pixelHeight * 4);
      this.depth = new Float32Array(pixelWidth * pixelHeight);
      const a = theme === 'dark' ? [39, 50, 55] : [241, 238, 229], b = theme === 'dark' ? [23, 34, 39] : [222, 221, 211];
      for (let y = 0; y < pixelHeight; y++) for (let x = 0; x < pixelWidth; x++) {
        const t = clamp((.35 * x / pixelWidth + y / pixelHeight) / 1.35, 0, 1), index = (y * pixelWidth + x) * 4;
        this.background[index] = a[0] + (b[0] - a[0]) * t; this.background[index + 1] = a[1] + (b[1] - a[1]) * t; this.background[index + 2] = a[2] + (b[2] - a[2]) * t; this.background[index + 3] = 255;
      }
    }
    const output = this.frame.data; output.set(this.background); this.depth.fill(0);
    camera.updateMatrixWorld();
    const view = camera.matrixWorldInverse.elements, projection = camera.projectionMatrix.elements;
    const light = new THREE.Vector3(-.45, .8, .65).normalize(), half = new THREE.Vector3(), normal = new THREE.Vector3(), eye = new THREE.Vector3();
    for (const cache of this.meshes) {
      if (!cache.mesh.visible || cache.mesh.material.opacity <= 0) continue;
      const world = cache.world, normals = cache.normals, projected = cache.projected, material = cache.mesh.material;
      const vertex = cache.mesh.geometry.attributes.color?.array, base = material.color, emitted = material.emissive;
      for (let i = 0, j = 0; i < world.length; i += 3, j += 4) {
        const x = world[i], y = world[i + 1], z = world[i + 2];
        const vx = view[0] * x + view[4] * y + view[8] * z + view[12];
        const vy = view[1] * x + view[5] * y + view[9] * z + view[13];
        const vz = view[2] * x + view[6] * y + view[10] * z + view[14], w = -vz;
        projected[j] = pixelWidth * .5 * (1 + (projection[0] * vx + projection[8] * vz) / w);
        projected[j + 1] = pixelHeight * .5 * (1 - (projection[5] * vy + projection[9] * vz) / w);
        projected[j + 2] = w; projected[j + 3] = (projection[10] * vz + projection[14]) / w;
        normal.set(normals[i], normals[i + 1], normals[i + 2]); eye.set(camera.position.x - x, camera.position.y - y, camera.position.z - z).normalize(); half.copy(light).add(eye).normalize();
        const nLight = normal.dot(light), nHalf = normal.dot(half), rim = .1 * (1 - Math.abs(normal.dot(eye))) ** 3;
        const power = 12 + 44 * (1 - material.roughness), specular = .04 + .22 * material.metalness;
        const front = .43 + .57 * Math.max(0, nLight) + rim, back = .43 + .57 * Math.max(0, -nLight) + rim;
        const specFront = specular * Math.max(0, nHalf) ** power, specBack = specular * Math.max(0, -nHalf) ** power;
        const r = (vertex ? vertex[i] : 1) * base.r, g = (vertex ? vertex[i + 1] : 1) * base.g, b = (vertex ? vertex[i + 2] : 1) * base.b;
        cache.frontColors[i] = r * front + specFront + emitted.r; cache.frontColors[i + 1] = g * front + specFront + emitted.g; cache.frontColors[i + 2] = b * front + specFront + emitted.b;
        cache.backColors[i] = r * back + specBack + emitted.r; cache.backColors[i + 1] = g * back + specBack + emitted.g; cache.backColors[i + 2] = b * back + specBack + emitted.b;
      }
    }
    const visible = [];
    for (const triangle of this.triangles) {
      const { cache, a, b, c } = triangle;
      if (!cache.mesh.visible || cache.mesh.material.opacity <= 0) continue;
      const p = cache.projected, ia = a * 4, ib = b * 4, ic = c * 4;
      if (p[ia + 2] <= camera.near || p[ib + 2] <= camera.near || p[ic + 2] <= camera.near) continue;
      if (Math.min(p[ia], p[ib], p[ic]) > pixelWidth || Math.max(p[ia], p[ib], p[ic]) < 0 || Math.min(p[ia + 1], p[ib + 1], p[ic + 1]) > pixelHeight || Math.max(p[ia + 1], p[ib + 1], p[ic + 1]) < 0) continue;
      if (Math.min(p[ia + 3], p[ib + 3], p[ic + 3]) > 1) continue;
      triangle.area = (p[ib] - p[ia]) * (p[ic + 1] - p[ia + 1]) - (p[ic] - p[ia]) * (p[ib + 1] - p[ia + 1]);
      if (Math.abs(triangle.area) < .002 * ratio) continue;
      triangle.depth = (p[ia + 2] + p[ib + 2] + p[ic + 2]) / 3; visible.push(triangle);
    }
    visible.sort((a, b) => b.depth - a.depth);
    // Opaque depth first, then far-to-near translucent surfaces. A shared-edge
    // top-left rule avoids the bright wire seams caused by individually
    // antialiased Canvas paths. Interpolated lighting preserves the source
    // positions while making a smooth anatomical surface legible.
    for (let transparentPass = 0; transparentPass < 2; transparentPass++) for (const triangle of visible) {
      const { cache } = triangle, opacity = cache.mesh.material.opacity;
      if ((opacity < .995) !== !!transparentPass) continue;
      const p = cache.projected; let a = triangle.a, b = triangle.b, c = triangle.c;
      if (triangle.area < 0) [b, c] = [c, b];
      const ax = p[a * 4], ay = p[a * 4 + 1], bx = p[b * 4], by = p[b * 4 + 1], cx = p[c * 4], cy = p[c * 4 + 1];
      const minX = Math.max(0, Math.ceil(Math.min(ax, bx, cx) - .5)), maxX = Math.min(pixelWidth - 1, Math.floor(Math.max(ax, bx, cx) - .5));
      const minY = Math.max(0, Math.ceil(Math.min(ay, by, cy) - .5)), maxY = Math.min(pixelHeight - 1, Math.floor(Math.max(ay, by, cy) - .5));
      if (minX > maxX || minY > maxY) continue;
      const inverseArea = 1 / Math.abs(triangle.area), sampleX = minX + .5, sampleY = minY + .5;
      const dx0 = by - cy, dx1 = cy - ay, dx2 = ay - by, dy0 = cx - bx, dy1 = ax - cx, dy2 = bx - ax;
      let rowW0 = (cx - bx) * (sampleY - by) - (cy - by) * (sampleX - bx);
      let rowW1 = (ax - cx) * (sampleY - cy) - (ay - cy) * (sampleX - cx);
      let rowW2 = (bx - ax) * (sampleY - ay) - (by - ay) * (sampleX - ax);
      const edge0 = by > cy || (by === cy && bx < cx), edge1 = cy > ay || (cy === ay && cx < ax), edge2 = ay > by || (ay === by && ax < bx);
      const qa = inverseArea / p[a * 4 + 2], qb = inverseArea / p[b * 4 + 2], qc = inverseArea / p[c * 4 + 2];
      const frontFacing = triangle.nx * (camera.position.x - triangle.cx) + triangle.ny * (camera.position.y - triangle.cy) + triangle.nz * (camera.position.z - triangle.cz) >= 0;
      const colors = frontFacing ? cache.frontColors : cache.backColors;
      const ar = colors[a * 3] * qa, ag = colors[a * 3 + 1] * qa, ab = colors[a * 3 + 2] * qa;
      const br = colors[b * 3] * qb, bg = colors[b * 3 + 1] * qb, bb = colors[b * 3 + 2] * qb;
      const cr = colors[c * 3] * qc, cg = colors[c * 3 + 1] * qc, cb = colors[c * 3 + 2] * qc;
      let rowZ = rowW0 * qa + rowW1 * qb + rowW2 * qc;
      let rowR = rowW0 * ar + rowW1 * br + rowW2 * cr, rowG = rowW0 * ag + rowW1 * bg + rowW2 * cg, rowB = rowW0 * ab + rowW1 * bb + rowW2 * cb;
      const dxZ = dx0 * qa + dx1 * qb + dx2 * qc, dyZ = dy0 * qa + dy1 * qb + dy2 * qc;
      const dxR = dx0 * ar + dx1 * br + dx2 * cr, dyR = dy0 * ar + dy1 * br + dy2 * cr;
      const dxG = dx0 * ag + dx1 * bg + dx2 * cg, dyG = dy0 * ag + dy1 * bg + dy2 * cg;
      const dxB = dx0 * ab + dx1 * bb + dx2 * cb, dyB = dy0 * ab + dy1 * bb + dy2 * cb;
      for (let y = minY; y <= maxY; y++) {
        let w0 = rowW0, w1 = rowW1, w2 = rowW2, z = rowZ, r = rowR, g = rowG, blue = rowB, pixel = y * pixelWidth + minX;
        for (let x = minX; x <= maxX; x++, pixel++) {
          if ((w0 > 0 || (w0 === 0 && edge0)) && (w1 > 0 || (w1 === 0 && edge1)) && (w2 > 0 || (w2 === 0 && edge2)) && z >= this.depth[pixel] - 1e-8) {
            const inverseZ = 1 / z, offset = pixel * 4;
            const rr = srgb(r * inverseZ), gg = srgb(g * inverseZ), bb = srgb(blue * inverseZ);
            if (!transparentPass) { output[offset] = rr; output[offset + 1] = gg; output[offset + 2] = bb; this.depth[pixel] = z; }
            else { output[offset] += opacity * (rr - output[offset]); output[offset + 1] += opacity * (gg - output[offset + 1]); output[offset + 2] += opacity * (bb - output[offset + 2]); }
          }
          w0 += dx0; w1 += dx1; w2 += dx2; z += dxZ; r += dxR; g += dxG; blue += dxB;
        }
        rowW0 += dy0; rowW1 += dy1; rowW2 += dy2; rowZ += dyZ; rowR += dyR; rowG += dyG; rowB += dyB;
      }
    }
    this.context.putImageData(this.frame, 0, 0); this.projectedTriangles = visible.length;
  }
  dispose() { this.meshes = []; this.triangles = []; this.frame = null; this.background = null; this.depth = null; }
}

function overlaps(a, b) { return a.x < b.x + b.w + 5 && a.x + a.w + 5 > b.x && a.y < b.y + b.h + 5 && a.y + a.h + 5 > b.y; }
function roundedRect(ctx, x, y, width, height, radius = 4) {
  ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.lineTo(x + width - radius, y); ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius); ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height); ctx.quadraticCurveTo(x, y + height, x, y + height - radius); ctx.lineTo(x, y + radius); ctx.quadraticCurveTo(x, y, x + radius, y); ctx.closePath();
}

/** An interactive viewer with automatic context-loss fallback and disposal. */
export function createAnatomyViewer(host, callbacks = {}) {
  let disposed = false, pending = 0, group = null, data = null, width = 1, height = 1, backend = '', renderer = null;
  let current = { fibers: null, timeMs: 0, selectedContact: -1, selectedFiber: -1, selectedImplantContact: -1, theme: 'light', layers: {}, showLabels: true };
  let cameraHome = null;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, .0001, 1000);
  const canvas = document.createElement('canvas'), overlay = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline-offset:-3px;';
  canvas.tabIndex = 0; canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Interactive anatomical cochlea. Drag to orbit, scroll or pinch to zoom. Arrow keys rotate, plus and minus zoom, Home resets. Select an electrode or a modeled nerve by clicking its surface.');
  overlay.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;'; overlay.setAttribute('aria-hidden', 'true');
  const overlayContext = overlay.getContext('2d');
  function orbitControls() {
    const instance = new OrbitControls(camera, canvas);
    instance.enableDamping = false; instance.enablePan = true; instance.rotateSpeed = .7; instance.zoomSpeed = .85; instance.screenSpacePanning = true;
    return instance;
  }
  let controls = orbitControls();
  const ambient = new THREE.HemisphereLight('#ffffff', '#61615a', 2.1); scene.add(ambient);
  const key = new THREE.DirectionalLight('#fff4de', 3.2); key.position.set(-7, 11, 9); scene.add(key);
  const fill = new THREE.DirectionalLight('#b7dce8', 1.7); fill.position.set(8, 3, -6); scene.add(fill);
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const maxPixelRatio = () => Math.min(window.devicePixelRatio || 1, backend === 'canvas' ? 1.5 : 2);

  function installRenderer(forceCanvas = false) {
    if (!forceCanvas) {
      try {
        const context = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'low-power' });
        if (context) {
          renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, alpha: false, powerPreference: 'low-power' });
          renderer.setPixelRatio(maxPixelRatio()); renderer.outputColorSpace = THREE.SRGBColorSpace;
          renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; backend = 'webgl';
        }
      } catch { renderer = null; }
    }
    if (!renderer) {
      // A canvas cannot switch from an established WebGL context to 2D. The
      // replacement keeps controls and pointer handlers on the stable host.
      const softwareCanvas = document.createElement('canvas'); softwareCanvas.style.cssText = canvas.style.cssText;
      softwareCanvas.setAttribute('aria-hidden', 'true'); softwareCanvas.style.pointerEvents = 'none'; softwareCanvas.style.position = 'absolute'; softwareCanvas.style.inset = '0';
      canvas.style.opacity = '0'; canvas.style.position = 'absolute'; canvas.style.inset = '0'; canvas.style.zIndex = '1';
      host.insertBefore(softwareCanvas, overlay.parentNode === host ? overlay : null);
      renderer = new AnatomyCanvasRenderer(softwareCanvas); backend = 'canvas';
      renderer.setPixelRatio(maxPixelRatio()); renderer.setGroup(group);
    }
    host.dataset.renderer = backend; callbacks.onRendererChange?.(backend);
  }
  host.appendChild(canvas); host.appendChild(overlay);
  try { installRenderer(); }
  catch (error) { controls.dispose(); canvas.remove(); overlay.remove(); throw error; }

  function invalidate() { if (!disposed && !pending) pending = requestAnimationFrame(draw); }
  function project(point) {
    const v = new THREE.Vector3().fromArray(point).project(camera);
    return { x: (v.x + 1) * width / 2, y: (1 - v.y) * height / 2, visible: v.z >= -1 && v.z <= 1 && Math.abs(v.x) < 1.3 && Math.abs(v.y) < 1.3 };
  }
  function drawLabels() {
    if (!overlayContext || !data) return;
    const ctx = overlayContext, ratio = maxPixelRatio(), dark = current.theme === 'dark';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
    const ink = dark ? '#e6e6dc' : '#273b3d', paper = dark ? 'rgba(25,36,41,.90)' : 'rgba(248,247,239,.91)';
    const labels = current.showLabels ? [...(data.labels ?? [])] : [];
    if (current.showLabels && group) {
      const candidates = group.children.filter(mesh => mesh.visible && selected(mesh, current));
      const contact = candidates.find(mesh => Number.isInteger(mesh.userData.contactIndex) || Number.isInteger(mesh.userData.implantContactIndex));
      const fiber = candidates.find(mesh => Number.isInteger(mesh.userData.fiberIndex) && (mesh.userData.role?.endsWith('soma') || Number.isInteger(mesh.userData.compartmentIndex))) ?? candidates.find(mesh => Number.isInteger(mesh.userData.fiberIndex));
      for (const mesh of [contact, fiber].filter(Boolean)) {
        const d = mesh.userData, p = mesh.geometry.boundingSphere.center.clone().applyMatrix4(mesh.matrixWorld);
        const label = d.label ?? (Number.isInteger(d.contactIndex) ? `Source E${String(d.contactIndex + 1).padStart(2, '0')}` : Number.isInteger(d.implantContactIndex) ? `Physical contact ${d.implantContactIndex + 1}` : `Modeled ANF ${d.fiberIndex + 1}`);
        labels.unshift({ id: `selected-${mesh.name}`, text: label, position: p.toArray(), priority: 100, selected: true });
      }
    }
    const toolbarHeight = data.mode === 'array' && Number.isInteger(current.selectedImplantContact) ? 96 : 55;
    const occupied = [{ x: 0, y: 0, w: Math.min(width * .55, 285), h: 77 }, { x: width - 139, y: 0, w: 139, h: toolbarHeight }, { x: 0, y: height - 68, w: width, h: 68 }];
    ctx.font = '11px Arial, sans-serif'; ctx.textBaseline = 'middle';
    const used = new Set(); let shown = 0;
    for (const label of labels.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))) {
      if (shown >= (width < 460 ? 6 : 11) || !label.position || !anatomyLayerVisible(label.layer, current.layers) || used.has(label.text)) continue;
      const anchor = project(label.position); if (!anchor.visible) continue;
      const text = String(label.text), fullWidth = ctx.measureText(text).width;
      let lines = [text];
      if (fullWidth > 160) {
        const words = text.split(' '); let line = ''; lines = [];
        for (const word of words) { if (line && ctx.measureText(`${line} ${word}`).width > 160) { lines.push(line); line = word; } else line += `${line ? ' ' : ''}${word}`; }
        if (line) lines.push(line);
      }
      const boxWidth = Math.min(190, Math.max(...lines.map(line => ctx.measureText(line).width)) + 14), boxHeight = 10 + lines.length * 14;
      const preferRight = anchor.x > width / 2;
      const offsets = [[preferRight ? 22 : -boxWidth - 22, -boxHeight - 16], [preferRight ? 26 : -boxWidth - 26, 15], [preferRight ? -boxWidth - 22 : 22, -boxHeight - 18], [preferRight ? 42 : -boxWidth - 42, -boxHeight / 2], [-boxWidth / 2, -boxHeight - 48], [-boxWidth / 2, 42]];
      let rect = null;
      for (const offset of offsets) {
        const candidate = { x: clamp(anchor.x + offset[0], 10, Math.max(10, width - boxWidth - 10)), y: clamp(anchor.y + offset[1], 8, Math.max(8, height - boxHeight - 75)), w: boxWidth, h: boxHeight };
        if (!occupied.some(other => overlaps(candidate, other))) { rect = candidate; break; }
      }
      if (!rect) continue;
      occupied.push(rect); used.add(label.text); shown++;
      const endpointX = clamp(anchor.x, rect.x, rect.x + rect.w), endpointY = clamp(anchor.y, rect.y, rect.y + rect.h);
      ctx.strokeStyle = dark ? 'rgba(218,226,221,.58)' : 'rgba(43,65,66,.49)'; ctx.lineWidth = .8;
      ctx.beginPath(); ctx.moveTo(anchor.x, anchor.y); ctx.lineTo(endpointX, endpointY); ctx.stroke();
      ctx.fillStyle = paper; roundedRect(ctx, rect.x, rect.y, rect.w, rect.h); ctx.fill();
      if (label.selected) { ctx.strokeStyle = dark ? '#d3ae6b' : '#9a773e'; ctx.stroke(); }
      ctx.fillStyle = ink;
      lines.forEach((line, index) => ctx.fillText(line, rect.x + 7, rect.y + 12 + index * 14));
      ctx.beginPath(); ctx.arc(anchor.x, anchor.y, label.selected ? 3 : 2, 0, Math.PI * 2); ctx.fill();
    }
    const distance = camera.position.distanceTo(controls.target), worldPerPixel = 2 * Math.tan(camera.fov * Math.PI / 360) * distance / height;
    const desired = worldPerPixel * 75, power = 10 ** Math.floor(Math.log10(Math.max(1e-12, desired))), fraction = desired / power;
    const suggestedLength = data.scaleBarMm;
    const lengthMm = suggestedLength && suggestedLength / worldPerPixel > 20 && suggestedLength / worldPerPixel < width * .35 ? suggestedLength : (fraction >= 5 ? 5 : fraction >= 2 ? 2 : 1) * power;
    const lengthPx = lengthMm / worldPerPixel;
    if (Number.isFinite(lengthPx) && lengthPx > 4 && lengthPx < width * .45) {
      ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 1.5;
      const x = 20, y = height - 20;
      ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y); ctx.lineTo(x + lengthPx, y); ctx.lineTo(x + lengthPx, y - 4); ctx.stroke();
      const text = data.scaleBarLabel ?? (lengthMm < 1 ? `${Number((lengthMm * 1000).toPrecision(3))} µm` : `${Number(lengthMm.toPrecision(3))} mm`);
      ctx.font = '10px Arial, sans-serif'; ctx.fillText(text, x, y - 12);
    }
  }
  function draw() {
    pending = 0; if (disposed || !data) return;
    controls.update(); camera.updateMatrixWorld();
    if (backend === 'webgl') { scene.background = new THREE.Color(current.theme === 'dark' ? '#202e33' : '#e8e7dd'); renderer.render(scene, camera); }
    else renderer.render(scene, camera, current.theme);
    drawLabels();
  }
  function resize() {
    width = Math.max(1, host.clientWidth); height = Math.max(1, host.clientHeight);
    const ratio = maxPixelRatio(); renderer.setPixelRatio(ratio); renderer.setSize(width, height, false);
    overlay.width = Math.round(width * ratio); overlay.height = Math.round(height * ratio);
    camera.aspect = width / height; camera.updateProjectionMatrix();
    if (cameraHome) {
      const atHome = camera.position.distanceTo(new THREE.Vector3().fromArray(cameraHome.position)) < 1e-5 && controls.target.distanceTo(new THREE.Vector3().fromArray(cameraHome.target)) < 1e-5;
      cameraHome.position = fitAnatomyCamera(cameraHome.bounds, cameraHome.preferred, camera.aspect, cameraHome.pointCloud);
      if (atHome) reset();
    }
    invalidate();
  }
  function applyState() { applyAnatomyState(group, current); }
  function reset() {
    if (!cameraHome) return;
    camera.position.fromArray(cameraHome.position); controls.target.fromArray(cameraHome.target); camera.up.fromArray(cameraHome.up);
    camera.fov = cameraHome.fov; camera.updateProjectionMatrix(); controls.update(); invalidate();
  }
  function zoom(factor) {
    const offset = camera.position.clone().sub(controls.target), distance = clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(offset.normalize().multiplyScalar(distance)); controls.update(); invalidate();
  }
  function orbit(horizontal, vertical = 0) {
    const offset = camera.position.clone().sub(controls.target), right = new THREE.Vector3().crossVectors(offset, camera.up).normalize();
    offset.applyAxisAngle(camera.up, horizontal);
    if (vertical) { const rotated = offset.clone().applyAxisAngle(right, vertical); if (Math.abs(rotated.clone().normalize().dot(camera.up)) < .985) offset.copy(rotated); }
    camera.position.copy(controls.target).add(offset); controls.update(); invalidate();
  }
  function focusSelectedPad() {
    const pad = group?.children.find(mesh => mesh.visible && mesh.userData.implantContactIndex === current.selectedImplantContact && Number.isInteger(mesh.userData.implantContactIndex));
    if (!pad) return false;
    const bounds = new THREE.Box3().setFromObject(pad), center = bounds.getCenter(new THREE.Vector3());
    const extent = bounds.getSize(new THREE.Vector3()).length(), direction = camera.position.clone().sub(controls.target).normalize();
    controls.minDistance = Math.min(controls.minDistance, Math.max(.02, extent * .4));
    controls.target.copy(center); camera.position.copy(center).addScaledVector(direction, Math.max(.2, extent * 3.2));
    controls.update(); invalidate(); return true;
  }
  function pick(event) {
    if (!group) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(group.children.filter(mesh => mesh.visible && mesh.material.opacity > .05), false);
    for (const hit of hits) {
      const d = hit.object.userData;
      if (Number.isInteger(d.implantContactIndex)) { callbacks.onImplantContact?.(d.implantContactIndex); return; }
      if (Number.isInteger(d.contactIndex)) { callbacks.onContact?.(d.contactIndex); return; }
      if (Number.isInteger(d.fiberIndex)) { callbacks.onFiber?.(d.fiberIndex); return; }
      if (hit.object.material.opacity > .94) return;
    }
  }
  let pointerStart = null, multiTouch = false;
  const activePointers = new Set();
  const down = event => {
    // Keep keyboard orbit controls available without native focus scrolling
    // the large anatomical canvas into the centre of the document.
    if (event.isPrimary !== false) { event.preventDefault(); canvas.focus({ preventScroll: true }); }
    activePointers.add(event.pointerId); if (activePointers.size > 1) multiTouch = true; else { pointerStart = [event.clientX, event.clientY]; multiTouch = false; }
  };
  const up = event => { activePointers.delete(event.pointerId); if (!multiTouch && pointerStart && Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]) < 5) pick(event); if (!activePointers.size) pointerStart = null; };
  const pointerCancel = event => { activePointers.delete(event.pointerId); pointerStart = null; };
  const keydown = event => {
    if (event.key === 'Home' || event.key.toLowerCase() === 'r') reset();
    else if (event.key === '+' || event.key === '=') zoom(.85);
    else if (event.key === '-' || event.key === '_') zoom(1 / .85);
    else if (event.key === 'ArrowLeft') orbit(.12);
    else if (event.key === 'ArrowRight') orbit(-.12);
    else if (event.key === 'ArrowUp') orbit(0, -.12);
    else if (event.key === 'ArrowDown') orbit(0, .12);
    else return;
    event.preventDefault();
  };
  const contextLost = event => {
    event.preventDefault(); if (disposed || backend !== 'webgl') return;
    renderer.dispose(); renderer = null;
    try { installRenderer(true); resize(); invalidate(); }
    catch (error) { callbacks.onError?.(error); }
  };
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', pointerCancel); canvas.addEventListener('keydown', keydown); canvas.addEventListener('webglcontextlost', contextLost);
  controls.addEventListener('change', invalidate);
  const observer = new ResizeObserver(resize); observer.observe(host); resize();

  return {
    setScene(next, { resetCamera = false } = {}) {
      const nextGroup = buildAnatomyGroup(next), previous = group;
      if (previous) scene.remove(previous); group = nextGroup; data = next; scene.add(group); disposeAnatomyGroup(previous);
      if (backend === 'canvas') renderer.setGroup(group);
      const box = new THREE.Box3().setFromObject(group), center = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
      const radius = Math.max(.005, box.isEmpty() ? 1 : box.getSize(new THREE.Vector3()).length() / 2);
      const preferred = next.camera ?? {};
      const preferredHome = { position: preferred.position ?? center.clone().add(new THREE.Vector3(radius * 1.65, radius * 1.15, radius * 2.2)).toArray(), target: preferred.target ?? center.toArray(), up: next.up ?? preferred.up ?? [0, 1, 0], fov: preferred.fov ?? 35 };
      const pointCloud = cameraFitPoints(group);
      cameraHome = { ...preferredHome, position: fitAnatomyCamera(box, preferredHome, camera.aspect, pointCloud), preferred: preferredHome, bounds: box.clone(), pointCloud };
      const nextUp = new THREE.Vector3().fromArray(cameraHome.up).normalize();
      if (camera.up.distanceToSquared(nextUp) > 1e-12) {
        const target = controls.target.clone(); controls.dispose(); camera.up.copy(nextUp);
        controls = orbitControls(); controls.target.copy(target); controls.addEventListener('change', invalidate);
      }
      camera.near = Math.max(.00001, radius / 2000); camera.far = radius * 100;
      controls.minDistance = radius * .18; controls.maxDistance = radius * 16;
      if (resetCamera || camera.position.lengthSq() === 0) reset(); else { camera.updateProjectionMatrix(); controls.update(); }
      applyState(); invalidate();
      const triangleCount = group.children.reduce((count, mesh) => count + (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3, 0);
      host.dataset.triangles = String(triangleCount); callbacks.onSceneReady?.({ triangleCount, objectCount: group.children.length, backend });
    },
    setState(next) { current = { ...current, ...next }; applyState(); invalidate(); },
    reset, zoom, orbit, focusSelectedPad,
    getState() { return { backend, cameraPosition: camera.position.toArray(), cameraTarget: controls.target.toArray(), triangleCount: Number(host.dataset.triangles ?? 0) }; },
    dispose() {
      if (disposed) return; disposed = true; cancelAnimationFrame(pending); observer.disconnect(); controls.dispose();
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', pointerCancel); canvas.removeEventListener('keydown', keydown); canvas.removeEventListener('webglcontextlost', contextLost);
      disposeAnatomyGroup(group); renderer?.dispose();
      if (renderer?.domElement !== canvas) renderer?.domElement.remove(); canvas.remove(); overlay.remove();
    },
  };
}
