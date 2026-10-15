import * as THREE from 'three';
import manifest from '../../../public/assets/finger-pathway-atlas/v4/cells/manifest.json' with { type: 'json' };
import { getPreservedCellRegistration, transformPreservedPoint } from './preserved-registration.mjs';

/**
 * Original V3 cellular meshes, registered into the continuous V4 model.
 * No membrane or arbor is regenerated here. Source vertex/index/normal arrays
 * are copied verbatim; only their documented rigid placement and the exact
 * 0.001 mm/µm unit conversion are applied by THREE.Group transforms.
 */
export const PRESERVED_CELL_MANIFEST = manifest;
const records = new Map((manifest.templates || []).map(record => [record.key, record]));
const decoded = new Map();
const pending = new Map();
const registrationCache = new WeakMap();
const anchorInfoCache = new WeakMap();
const MAX_DECODED_BYTES = 64 * 1024 * 1024;
const MAX_DECODED_TEMPLATES = 48;

function registrations(cell, anchors) {
  const wanted = new Set(anchors || ['soma', 'terminal']);
  // Atlas model cells are immutable; source mapping and rigid transforms do
  // not depend on a camera frame or on whether a source chunk has loaded.
  if (!registrationCache.has(cell)) registrationCache.set(cell, getPreservedCellRegistration(cell, manifest));
  return registrationCache.get(cell).filter(registration => wanted.has(registration.anchor) && records.has(registration.templateKey));
}

function sourceBounds(record) {
  const bounds = record.boundsUm || record.bounds;
  if (Array.isArray(bounds) && bounds.length === 2) return bounds;
  if (bounds?.min && bounds?.max) return [bounds.min, bounds.max];
  return [[0, 0, 0], [0, 0, 0]];
}

function worldBounds(record, registration) {
  const [min, max] = sourceBounds(record);
  const result = [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]];
  for (let corner = 0; corner < 8; corner++) {
    const p = transformPreservedPoint([corner & 1 ? max[0] : min[0], corner & 2 ? max[1] : min[1], corner & 4 ? max[2] : min[2]], registration);
    for (let k = 0; k < 3; k++) { result[0][k] = Math.min(result[0][k], p[k]); result[1][k] = Math.max(result[1][k], p[k]); }
  }
  return result;
}

/** Cheap synchronous source bounds and cost, available before any mesh fetch. */
export function preservedAnchorInfo(cell, anchor) {
  if (!anchorInfoCache.has(cell)) anchorInfoCache.set(cell, new Map());
  const cached = anchorInfoCache.get(cell);
  if (cached.has(anchor)) {
    const info = cached.get(anchor);
    return info ? { ...info, loaded: decoded.has(info.key) } : null;
  }
  const registration = registrations(cell, [anchor])[0];
  if (!registration) { cached.set(anchor, null); return null; }
  const record = records.get(registration.templateKey);
  const info = {
    key: record.key,
    templateKey: record.key,
    anchor,
    boundsLocalMm: sourceBounds(record).map(p => p.map(value => value * .001)),
    boundsWorldMm: worldBounds(record, registration),
    triangles: record.counts?.triangles || record.triangles || 0,
    vertices: record.counts?.vertices || record.vertices || 0,
    sourceCellId: record.sourceCellId,
    sourceRegion: record.sourceRegion,
    metadata: record.metadata || {},
    ports: registration.ports,
    registration,
  };
  cached.set(anchor, info);
  return { ...info, loaded: decoded.has(record.key) };
}

export const restoredAnchor = (cell, anchor) => !!preservedAnchorInfo(cell, anchor);

export function preservedCellMetadata(cell) {
  return ['soma', 'terminal'].map(anchor => preservedAnchorInfo(cell, anchor)).filter(Boolean);
}

function decodeBase64(value, Type) {
  if (ArrayBuffer.isView(value)) return new Type(value);
  if (Array.isArray(value)) return new Type(value);
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  if (bytes.byteLength % Type.BYTES_PER_ELEMENT) throw new Error('Invalid preserved-cell typed-array length.');
  return new Type(bytes.buffer);
}

function decodeTemplate(payload, record) {
  if (payload.key !== record.key || !Array.isArray(payload.meshes) || !payload.meshes.length) throw new Error(`Invalid preserved-cell template: ${record.key}`);
  let byteLength = 0;
  let triangles = 0;
  let vertices = 0;
  const meshes = payload.meshes.map(mesh => {
    const positions = decodeBase64(mesh.positions, Float32Array);
    const normals = mesh.normals ? decodeBase64(mesh.normals, Float32Array) : null;
    const indices = decodeBase64(mesh.indices, Uint32Array);
    if (positions.length % 3 || indices.length % 3 || (normals && normals.length !== positions.length)) throw new Error(`Malformed preserved mesh: ${record.key}/${mesh.name}`);
    if (!positions.every(Number.isFinite) || (normals && !normals.every(Number.isFinite))) throw new Error(`Non-finite preserved mesh: ${record.key}/${mesh.name}`);
    let maxIndex = 0;
    for (const index of indices) maxIndex = Math.max(maxIndex, index);
    if (maxIndex >= positions.length / 3) throw new Error(`Invalid preserved mesh indices: ${record.key}/${mesh.name}`);
    byteLength += positions.byteLength + indices.byteLength + (normals?.byteLength || 0);
    triangles += indices.length / 3;
    vertices += positions.length / 3;
    return { ...mesh, positions, normals, indices };
  });
  if (record.counts?.triangles && triangles !== record.counts.triangles) throw new Error(`Preserved triangle count mismatch: ${record.key}`);
  const result = { ...payload, meshes, byteLength, triangles, vertices, lastUsed: performance.now() };
  // Paths are plain double-precision source coordinates, not new arbors.
  for (const path of result.paths || []) {
    if (!Array.isArray(path.points) || !path.points.every(p => p.length === 3 && p.every(Number.isFinite))) throw new Error(`Invalid preserved centerline: ${record.key}`);
  }
  return result;
}

async function timedRequest(url, fetcher, decode, timeoutMs) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Original V3 cell request timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      (async () => {
        const response = await fetcher(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return decode(response);
      })(),
      timeout,
    ]);
  } finally { clearTimeout(timer); }
}

async function fetchPayload(record, fetcher, timeoutMs) {
  if (!record.url) throw new Error(`Original V3 cell ${record.key} has no asset URL.`);
  return timedRequest(record.url, fetcher, async response => {
    const buffer = await response.arrayBuffer();
    const head = new Uint8Array(buffer, 0, Math.min(2, buffer.byteLength));
    // A host may send Content-Encoding:gzip and have fetch decompress first.
    if (head[0] !== 0x1f || head[1] !== 0x8b) return JSON.parse(new TextDecoder().decode(buffer));
    if (typeof DecompressionStream !== 'undefined') {
      try { return await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).json(); }
      catch { /* A legacy or incomplete native implementation uses the same bytes below. */ }
    }
    // The small fallback decoder loads only when needed. There is no second
    // 148 MB uncompressed asset library or duplicate network transfer.
    const { gunzipSync } = await import('three/addons/libs/fflate.module.js');
    return JSON.parse(new TextDecoder().decode(gunzipSync(new Uint8Array(buffer))));
  }, timeoutMs);
}

function evictDecoded(protectedKeys = new Set()) {
  let bytes = [...decoded.values()].reduce((sum, value) => sum + value.byteLength, 0);
  if (decoded.size <= MAX_DECODED_TEMPLATES && bytes <= MAX_DECODED_BYTES) return;
  const oldest = [...decoded.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed);
  for (const [key, value] of oldest) {
    if (protectedKeys.has(key) || pending.has(key)) continue;
    decoded.delete(key);
    bytes -= value.byteLength;
    if (decoded.size <= MAX_DECODED_TEMPLATES && bytes <= MAX_DECODED_BYTES) break;
  }
}

/** Fetch only the requested anatomical anchors, coalescing shared templates. */
export async function loadPreservedCell(cell, options = {}) {
  const selected = registrations(cell, options.anchors);
  const fetcher = options.fetcher || globalThis.fetch;
  const timeoutMs = Math.max(1, Math.min(30000, Number(options.timeoutMs) || 30000));
  if (typeof fetcher !== 'function') throw new Error('A fetch implementation is required to load preserved cells.');
  await Promise.all(selected.map(async registration => {
    const key = registration.templateKey;
    if (decoded.has(key)) { decoded.get(key).lastUsed = performance.now(); return; }
    if (!pending.has(key)) {
      const record = records.get(key);
      const task = fetchPayload(record, fetcher, timeoutMs).then(payload => {
        const template = decodeTemplate(payload, record);
        decoded.set(key, template);
        return template;
      }).finally(() => pending.delete(key));
      pending.set(key, task);
    }
    await pending.get(key);
  }));
  evictDecoded(new Set(selected.map(registration => registration.templateKey)));
  return selected.map(registration => preservedAnchorInfo(cell, registration.anchor));
}

/** Original captured source centerlines, registered without regenerated trees. */
export function preservedCellPaths(cell, options = {}) {
  const result = [];
  for (const registration of registrations(cell, options.anchors)) {
    const template = decoded.get(registration.templateKey);
    if (!template) continue;
    template.lastUsed = performance.now();
    for (const path of template.paths || []) {
      if (path.optional && !options.includeModeledFineDetail) continue;
      const radii = Array.isArray(path.radii) ? path.radii.map(r => r * .001) : path.points.map(() => (path.radii || .5) * .001);
      result.push({
        points: path.points.map(p => transformPreservedPoint(p, registration)),
        radii,
        role: path.role || (registration.anchor === 'terminal' ? 'terminal' : 'dendrite'),
        anchor: registration.anchor,
        sourceTemplate: registration.templateKey,
        originalV3: true,
      });
    }
  }
  return result;
}

/**
 * Synchronous after loadPreservedCell. Each returned mesh owns independent
 * typed arrays and materials; ordinary geometry/material.dispose is safe.
 */
export function createPreservedCellDetail(cell, options = {}) {
  const group = new THREE.Group();
  group.name = `preserved-cell-detail:${cell.id}`;
  group.userData = { cellId: cell.id, originalV3: true, worldUnit: 'mm', detail: true, triangleCount: 0, pathCount: 0, sourceTemplates: [] };
  for (const registration of registrations(cell, options.anchors)) {
    const record = records.get(registration.templateKey);
    const template = decoded.get(registration.templateKey);
    if (!template) throw new Error(`Original V3 cell template ${registration.templateKey} must be loaded before creating its detail.`);
    template.lastUsed = performance.now();
    const anchor = new THREE.Group();
    anchor.name = `${cell.id}:${registration.anchor}:original-v3`;
    anchor.position.fromArray(registration.worldAnchorMm || (registration.anchor === 'terminal' ? cell.terminal : cell.soma));
    if (registration.rotation) anchor.quaternion.fromArray(registration.rotation);
    anchor.scale.setScalar(.001);
    anchor.userData = {
      cellId: cell.id,
      anchor: registration.anchor,
      originalV3: true,
      sourceTemplate: record.key,
      sourceCellId: record.sourceCellId,
      sourceRegion: record.sourceRegion,
      sourceAnchorUm: record.sourceAnchorUm,
      sourceMetadata: record.metadata,
      sourceBoundsUm: sourceBounds(record),
      registrationNote: 'Original V3 local geometry; rigid world registration and connectivity are modeled. One micrometre equals 0.001 millimetres.',
    };
    for (const source of template.meshes) {
      if (source.optional && !options.includeModeledFineDetail) continue;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(source.positions.slice(), 3));
      if (source.normals) geometry.setAttribute('normal', new THREE.BufferAttribute(source.normals.slice(), 3));
      geometry.setIndex(new THREE.BufferAttribute(source.indices.slice(), 1));
      if (!source.normals) geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      const color = source.color ?? 0x7bced5;
      const opacity = source.opacity ?? 1;
      const material = new THREE.MeshStandardMaterial({ color, roughness: .49, metalness: .08, emissive: color, emissiveIntensity: .08, transparent: opacity < 1, opacity, depthWrite: opacity >= .98, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `${cell.id}:${source.name}`;
      mesh.userData = {
        ...(source.metadata || {}), cellId: cell.id, anchor: registration.anchor,
        originalV3: true, sourceTemplate: record.key, sourceCellId: record.sourceCellId,
        sourceRegion: record.sourceRegion, layer: source.layer || 'neural',
        structure: source.name, sourceMetadata: record.metadata, optionalModeledDetail: !!source.optional,
        baseColor: color, baseOpacity: opacity,
      };
      mesh.renderOrder = opacity < .5 ? 2 : 1;
      anchor.add(mesh);
      group.userData.triangleCount += source.indices.length / 3;
    }
    group.userData.pathCount += (template.paths || []).filter(path => !path.optional || options.includeModeledFineDetail).length;
    group.userData.sourceTemplates.push(record.key);
    group.add(anchor);
  }
  return group;
}

export function preservedAssetCacheStats() {
  return { templates: decoded.size, pending: pending.size, decodedBytes: [...decoded.values()].reduce((sum, value) => sum + value.byteLength, 0), maxDecodedBytes: MAX_DECODED_BYTES, maxTemplates: MAX_DECODED_TEMPLATES };
}
