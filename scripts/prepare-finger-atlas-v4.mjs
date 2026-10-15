/**
 * Integrate every supplied V3 anatomical mesh into V4 at two display levels.
 * Run: node scripts/prepare-finger-atlas-v4.mjs
 *
 * The overview scaffold is spatially vertex-clustered, with original
 * triangle connectivity remapped to cluster centroids. This is not random face
 * sampling, a section, or a new clipping operation. The imported skin already
 * has V3's upper-body crop; its complete supplied surface is retained here.
 * Every full-detail surface preserves the exact supplied V3 positions and
 * original triangle topology in a separately loadable asset. No bone, muscle,
 * skin, or CNS surface from the supplied atlas is discarded.
 * Native BodyParts3D coordinates have ALREADY been transformed in these inputs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputDir = path.join(root, 'public/assets/finger-pathway-atlas/v3');
const outputDir = path.join(root, 'public/assets/finger-pathway-atlas/v4');
const parts = [1, 2].map(i => fs.readFileSync(path.join(inputDir, `anatomy.json.gz.part-${i}.bin`)));
const input = Buffer.concat(parts);
const data = JSON.parse(gunzipSync(input));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const round = value => Math.round(value * 100) / 100;

function floats(encoded) {
  const bytes = Buffer.from(encoded, 'base64');
  const result = new Float32Array(bytes.length / 4);
  for (let i = 0; i < result.length; i++) result[i] = bytes.readFloatLE(i * 4);
  return result;
}
function integers(encoded) {
  const bytes = Buffer.from(encoded, 'base64');
  const result = new Uint32Array(bytes.length / 4);
  for (let i = 0; i < result.length; i++) result[i] = bytes.readUInt32LE(i * 4);
  return result;
}
function bounds(positions) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i++) {
    const axis = i % 3;
    min[axis] = Math.min(min[axis], positions[i]);
    max[axis] = Math.max(max[axis], positions[i]);
  }
  return [min, max];
}
function clusterSize(mesh, x, y) {
  // Preserve the selected index-finger envelope particularly closely.
  if (mesh.category === 'skin') {
    if (x < -280 && y < -515) return 1.3;
    if (y < -440) return 3;
    if (y < -160) return 5;
    return 10;
  }
  if (mesh.name === 'cerebellum') return 3.5;
  if (mesh.category === 'cns') return 2;
  if (mesh.category === 'bone') {
    if (y < -440) return 1.4;
    if (mesh.name.includes('scapula')) return 4.5;
    return 3;
  }
  if (mesh.category === 'muscle') return 3.5;
  return 4.5;
}
function simplify(mesh) {
  const p = floats(mesh.restP || mesh.p), triangles = integers(mesh.i);
  if (p.length !== mesh.nv * 3 || triangles.length !== mesh.nf * 3) throw Error(`Bad source arrays: ${mesh.id}`);
  const clusters = new Map(), groups = [], remap = new Uint32Array(p.length / 3);
  let maxClusterMm = 0;
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i], y = p[i + 1], z = p[i + 2], step = clusterSize(mesh, x, y);
    if (![x, y, z].every(Number.isFinite)) throw Error(`Nonfinite source vertex: ${mesh.id}`);
    maxClusterMm = Math.max(maxClusterMm, step);
    // Include step in key so adjacent resolution regions cannot alias.
    const key = `${step}:${Math.floor(x / step)},${Math.floor(y / step)},${Math.floor(z / step)}`;
    let id = clusters.get(key);
    if (id === undefined) {
      id = groups.length;
      clusters.set(key, id);
      groups.push([0, 0, 0, 0]);
    }
    const g = groups[id];
    g[0] += x; g[1] += y; g[2] += z; g[3]++;
    remap[i / 3] = id;
  }
  const centroids = groups.map(g => [round(g[0] / g[3]), round(g[1] / g[3]), round(g[2] / g[3])]);
  const faces = [], seen = new Set(), used = new Set();
  for (let i = 0; i < triangles.length; i += 3) {
    const a = remap[triangles[i]], b = remap[triangles[i + 1]], c = remap[triangles[i + 2]];
    if (a === b || a === c || b === c) continue;
    const key = [a, b, c].sort((u, v) => u - v).join(',');
    if (seen.has(key)) continue;
    const A = centroids[a], B = centroids[b], C = centroids[c];
    const u = B.map((v, k) => v - A[k]), v = C.map((n, k) => n - A[k]);
    const area2 = Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]);
    if (area2 < 1e-8) continue;
    seen.add(key); faces.push(a, b, c); used.add(a); used.add(b); used.add(c);
  }
  const compact = new Map(), positions = [];
  for (const id of used) { compact.set(id, compact.size); positions.push(...centroids[id]); }
  const indices = faces.map(id => compact.get(id));
  if (!positions.length || !indices.length || indices.some(i => i >= positions.length / 3)) throw Error(`Empty/invalid simplified mesh: ${mesh.id}`);
  return {
    id: mesh.id, name: mesh.name, category: mesh.category,
    source: mesh.source, license: mesh.license,
    positions, indices, bounds: bounds(positions),
    sourceVertices: p.length / 3, vertices: positions.length / 3, triangles: indices.length / 3,
    maxClusterMm,
  };
}

function sourceDetail(mesh) {
  const p = mesh.restP || mesh.p;
  const positions = floats(p), indices = integers(mesh.i);
  if (positions.length !== mesh.nv * 3 || indices.length !== mesh.nf * 3) throw Error(`Bad full-detail source arrays: ${mesh.id}`);
  if (positions.some(v => !Number.isFinite(v)) || indices.some(v => v >= mesh.nv)) throw Error(`Invalid full-detail source geometry: ${mesh.id}`);
  const payload = {
    version: '4.1.0', id: mesh.id, name: mesh.name, category: mesh.category,
    units: 'mm', encoding: 'base64-float32-uint32-le',
    p, i: mesh.i, nv: mesh.nv, nf: mesh.nf,
    bounds: bounds(positions),
    source: mesh.source, sourceSha256: mesh.sha256, sourceCommit: mesh.sourceCommit,
    license: mesh.license,
    derivation: 'Exact supplied V3 rest-pose position bytes and triangle indices; no further decimation, rounding, clipping, or topology changes.',
    originalDerivation: mesh.derived,
  };
  const json = Buffer.from(JSON.stringify(payload)), gz = gzipSync(json, { level: 9, mtime: 0 });
  fs.writeFileSync(path.join(outputDir, 'source-meshes', `${mesh.id}.json`), json);
  fs.writeFileSync(path.join(outputDir, 'source-meshes', `${mesh.id}.json.gz`), gz);
  const url = `/assets/finger-pathway-atlas/v4/source-meshes/${mesh.id}.json`;
  return {
    url, gzipUrl: `${url}.gz`, encoding: payload.encoding,
    vertices: mesh.nv, triangles: mesh.nf,
    bytes: json.length, gzipBytes: gz.length, sha256: sha256(json),
    positionSha256: sha256(Buffer.from(p, 'base64')),
    indexSha256: sha256(Buffer.from(mesh.i, 'base64')),
  };
}

fs.mkdirSync(path.join(outputDir, 'source-meshes'), { recursive: true });
const selected = data.meshes;
const meshes = selected.map(simplify);
for (let i = 0; i < meshes.length; i++) meshes[i].detail = sourceDetail(selected[i]);
const vertexCount = meshes.reduce((sum, m) => sum + m.vertices, 0);
const triangleCount = meshes.reduce((sum, m) => sum + m.triangles, 0);
if (vertexCount > 80000) throw Error(`Scaffold exceeds 80,000-vertex startup budget: ${vertexCount}`);
const categories = {};
for (const mesh of meshes) categories[mesh.category] = (categories[mesh.category] || 0) + 1;
const sourceStats = {
  meshes: selected.length,
  vertices: selected.reduce((sum, m) => sum + m.nv, 0),
  triangles: selected.reduce((sum, m) => sum + m.nf, 0),
  bytes: meshes.reduce((sum, m) => sum + m.detail.bytes, 0),
  gzipBytes: meshes.reduce((sum, m) => sum + m.detail.gzipBytes, 0),
};
const scaffold = {
  version: '4.1.0', units: 'mm',
  coordinateConvention: {
    axes: 'x left, y superior, z anterior; right side has negative x',
    sourceTransform: '(native x, native z - 1250, -native y - 95)',
    notice: 'Positions already use display coordinates. Do not transform them again.',
  },
  bounds: bounds(meshes.flatMap(m => m.positions)),
  source: 'BodyParts3D 3.0 via the supplied V3 atlas and Kevin-Mattheus-Moerman STL conversion',
  license: 'BodyParts3D CC BY-SA 2.1 Japan, preserved from the supplied v3 mirror',
  approximation: 'Overview surfaces use spatial clustering; every supplied V3 surface is also retained at its exact original supplied resolution as a locally loadable detail asset. These are source-derived atlas surfaces, not patient-specific, histology-registered, or watertight simulation geometry. The imported skin retains the earlier upper-body crop. No new cross sections or clipping windows are introduced.',
  meshes,
  stats: { meshes: meshes.length, vertices: vertexCount, triangles: triangleCount, categories },
  sourceStats,
};
const json = Buffer.from(JSON.stringify(scaffold));
const gz = gzipSync(json, { level: 9, mtime: 0 });
const provenance = {
  version: scaffold.version,
  input: { files: ['anatomy.json.gz.part-1.bin', 'anatomy.json.gz.part-2.bin'], concatenatedSha256: sha256(input) },
  output: { file: 'scaffold.json', sha256: sha256(json), bytes: json.length, gzipBytes: gz.length, ...scaffold.stats },
  sourceDetail: {
    directory: 'source-meshes', encoding: 'base64-float32-uint32-le',
    fidelity: 'Every p and i base64 value equals its supplied V3 source field byte for byte; restP takes precedence if supplied.',
    lazyLoading: 'Fetch the detail descriptor for a nearby mesh. Decode p as little-endian Float32 triples and i as little-endian Uint32 triangle indices. Positions already use the same display millimetre frame as the overview. Replace the matching id geometry, keeping its material/visibility state.',
    ...sourceStats,
  },
  authorship: 'BodyParts3D, © The Database Center for Life Science; source-derived display simplification for BuildTheSimulation.',
  sources: [
    { name: 'BodyParts3D license', url: 'https://lifesciencedb.jp/bp3d/info_en/license/index.html', terms: scaffold.license },
    { name: 'STL conversion source', url: 'https://github.com/Kevin-Mattheus-Moerman/BodyParts3D', commit: selected[0].sourceCommit },
  ],
  method: {
    name: 'Overview spatial vertex clustering plus exact V3 surface detail',
    retained: 'All 86 provided source surfaces: skin, cortical gyri, thalami, pons, medulla, cerebellum, 41 skeletal meshes, and four forearm muscle meshes',
    excluded: 'None of the supplied anatomical source meshes',
    cortexClusterMm: 4.5,
    cnsClusterMm: 2,
    cerebellumClusterMm: 3.5,
    skinClustersMm: { selectedIndexFinger: 1.3, hand: 3, arm: 5, otherUpperBody: 10 },
    boneClustersMm: { hand: 1.4, scapula: 4.5, other: 3 },
    muscleClusterMm: 3.5,
    roundedCoordinatePrecisionMm: 0.01,
    limitations: scaffold.approximation,
  },
  sourceMeshes: selected.map((m, i) => ({
    id: m.id, name: m.name, category: m.category, source: m.source,
    sourceSha256: m.sha256, sourceCommit: m.sourceCommit, license: m.license,
    originalDerivation: m.derived, inputVertices: m.nv,
    outputVertices: meshes[i].vertices, outputTriangles: meshes[i].triangles,
    bounds: meshes[i].bounds,
    detail: meshes[i].detail,
  })),
  missingSourceGeometry: ['Blood vessels', 'Peripheral nerves', 'Dorsal root ganglia', 'Cervical spinal cord', 'Brainstem nuclei', 'Thalamic VPL subnucleus'],
  neuralModelNotice: 'The accompanying neural routes and cellular arrangements are procedural educational approximations in the shared frame; the anatomical source is not a measured end-to-end connectome.',
};
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'scaffold.json'), json);
fs.writeFileSync(path.join(outputDir, 'scaffold.json.gz'), gz);
fs.writeFileSync(path.join(outputDir, 'scaffold-provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
console.log(JSON.stringify(provenance.output, null, 2));
