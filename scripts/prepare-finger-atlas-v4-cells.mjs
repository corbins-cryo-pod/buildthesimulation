/**
 * Preserve V3 cellular geometry for the single-coordinate-space V4 atlas.
 * Run: node scripts/prepare-finger-atlas-v4-cells.mjs
 *
 * This runs the ORIGINAL imported mesher. It records exact existing sweeps,
 * removes excluded context objects, and translates meshes to local origins.
 * No soma, dendrite, branch, or receptor membrane is regenerated differently.
 * V3 sectional context is deliberately omitted; original receptor support
 * inspection windows are closed without reducing their shell complexity.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputDir = path.join(root, 'public/assets/finger-pathway-atlas/v3');
const outputDir = path.join(root, 'public/assets/finger-pathway-atlas/v4/cells');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceFiles = ['engine.js', 'membrane.js', 'specimens.js', 'anatomy.json.gz.part-1.bin', 'anatomy.json.gz.part-2.bin'];
const sourceHashes = Object.fromEntries(sourceFiles.map(file => [file, sha256(fs.readFileSync(path.join(inputDir, file)))]));
const packed = Buffer.concat([1, 2].map(i => fs.readFileSync(path.join(inputDir, `anatomy.json.gz.part-${i}.bin`))));
const data = JSON.parse(gunzipSync(packed));
const context = vm.createContext({ window: {}, console, atob, btoa, TextDecoder, TextEncoder, URL, Blob, ArrayBuffer, Uint8Array, Float32Array, Uint32Array, performance });
for (const file of ['engine.js', 'membrane.js']) vm.runInContext(fs.readFileSync(path.join(inputDir, file), 'utf8'), context, { filename: file });
const { Membrane } = context.window.ATLAS_GEOMETRY;
const originalSweep = Membrane.prototype.sweep;
const originalAppend = Membrane.prototype.append;
const originalGeometry = Membrane.prototype.geometry;
const geometryCapture = new WeakMap();
Membrane.prototype.sweep = function (input, radii, ...args) {
  const before = this.p.length / 3;
  const result = originalSweep.call(this, input, radii, ...args);
  if (input.length > 1) {
    const points = input.map(p => p.isVector3 ? p.toArray() : Array.from(p));
    (this.__paths ||= []).push({ points, radii: points.map((_, i) => typeof radii === 'number' ? radii : radii[i]), vertexStart: before, vertexEnd: this.p.length / 3 });
  }
  return result;
};
Membrane.prototype.append = function (geometry, ...args) {
  const vertexStart = this.p.length / 3, indexStart = this.f.length;
  const result = originalAppend.call(this, geometry, ...args);
  (this.__appends ||= []).push({ vertexStart, vertexEnd: this.p.length / 3, indexStart, indexEnd: this.f.length });
  return result;
};
Membrane.prototype.geometry = function () {
  const result = originalGeometry.call(this);
  geometryCapture.set(result, { paths: this.__paths || [], appends: this.__appends || [] });
  return result;
};
// Metadata-only instrumentation. No RNG calls, coordinates, or meshing inputs change.
const source = fs.readFileSync(path.join(inputDir, 'specimens.js'), 'utf8');
const hook = 'mesh.userData.axonOrigin=axonOrigin;return mesh;';
assert.equal(source.split(hook).length, 2, 'Organic-cell metadata hook must match exactly once');
const instrumented = source.replace(hook, 'mesh.userData.axonOrigin=axonOrigin;mesh.userData.preservedSourceAnchor=p.slice();mesh.userData.preservedSomaRadius=rad;mesh.userData.preservedSeed=seed;mesh.userData.preservedProjected=projected;return mesh;');
vm.runInContext(instrumented, context, { filename: 'specimens.js (metadata-only capture)' });
const maker = context.window.ATLAS_GENERATORS.factories(data), model = maker.cohort(30);
fs.mkdirSync(outputDir, { recursive: true });
// Payloads are losslessly compressed once. Older builds wrote a duplicate raw
// JSON fallback; remove only those generated template files, never the manifest.
for (const file of fs.readdirSync(outputDir)) {
  if (/^(drg|spinal|medulla|thalamus|cortex|terminal)-[^/]+\.json$/.test(file)) fs.unlinkSync(path.join(outputDir, file));
}
const entries = [], assets = new Map();
const subtract = (p, origin) => p.map((v, i) => v - origin[i]);
const typedBytes = array => Buffer.from(array.buffer, array.byteOffset, array.byteLength);
const encode = array => typedBytes(array).toString('base64');

// Anatomical placement targets refer to an end organ, not to its long inlet
// segment. These landmarks are in the ORIGINAL V3 specimen micrometres. They
// affect manifest registration only; compressed source geometry stays intact.
const terminalOrganCenters = {
  'terminal:meissner': { point: [-335, 230, 0], basis: 'Original Meissner lamellar-cluster center in endings().' },
  'terminal:merkel': { point: [-67, 289.5011865405289, -4.497218491121506], basis: 'Centroid of the original nine Merkel contact endpoints, using the original basal surface and seeded lateral positions.' },
  'terminal:pacinian': { point: [318, -50, 5], basis: 'Original pcen shared by all 25 Pacinian lamellae.' },
  'terminal:free': { point: [87.80942215921698, 233.02782966287106, 95.99515502889834], basis: 'Bounds center of the original free-ending arbor centerlines, excluding the long inlet curve.' },
  'terminal:nmj': { point: [0, 20, 0], basis: 'Original central sarcolemmal surface under the motor-endplate cluster.' },
  'terminal:spindle': { point: [-330, 0, 0], basis: 'Original spindle capsule and equatorial sensory-region center.' },
  'terminal:golgi': { point: [285, 0, 0], basis: 'Original tendon-organ local collagen/terminal inspection territory center.' },
};

function capture(mesh) { return geometryCapture.get(mesh.geometry) || { paths: [], appends: [] }; }
function geometryArrays(mesh, vertexPredicate = null, vertexRange = null) {
  const geometry = mesh.geometry, sourcePositions = geometry.attributes.position.array;
  const sourceNormals = geometry.attributes.normal.array;
  const sourceIndices = geometry.index.array;
  const selected = [], indices = [], indexMap = new Map();
  for (let i = 0; i < sourcePositions.length / 3; i++) {
    const p = Array.from(sourcePositions.subarray(i * 3, i * 3 + 3));
    if ((vertexRange && (i < vertexRange[0] || i >= vertexRange[1])) || (vertexPredicate && !vertexPredicate(p))) continue;
    indexMap.set(i, selected.length); selected.push(i);
  }
  for (let i = 0; i < sourceIndices.length; i += 3) {
    const a = indexMap.get(sourceIndices[i]), b = indexMap.get(sourceIndices[i + 1]), c = indexMap.get(sourceIndices[i + 2]);
    if (a !== undefined && b !== undefined && c !== undefined) indices.push(a, b, c);
  }
  const positions = new Float32Array(selected.length * 3), normals = new Float32Array(selected.length * 3);
  selected.forEach((index, j) => {
    positions.set(sourcePositions.subarray(index * 3, index * 3 + 3), j * 3);
    normals.set(sourceNormals.subarray(index * 3, index * 3 + 3), j * 3);
  });
  return { positions, normals, indices: new Uint32Array(indices), sourcePositions, sourceNormals, sourceIndices, selected };
}
function saveTemplate({ key, region, sourceCellId, anchor, meshes, ports = {}, metadata = {}, pathsOverride = null }) {
  const bounds = [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]], paths = [];
  const serialized = meshes.map(def => {
    const { mesh, optional = false, vertexPredicate = null, vertexRange = null, role = 'neurite', amended = false } = def;
    const arrays = geometryArrays(mesh, vertexPredicate, vertexRange);
    // Translation is the only geometry edit. The source arrays are never mutated.
    const local = Float32Array.from(arrays.positions, (v, i) => v - anchor[i % 3]);
    local.forEach((v, i) => { assert(Number.isFinite(v)); bounds[0][i % 3] = Math.min(bounds[0][i % 3], v); bounds[1][i % 3] = Math.max(bounds[1][i % 3], v); });
    arrays.indices.forEach(i => assert(i < local.length / 3, `Bad index ${key}`));
    const captured = capture(mesh).paths.filter(p => (!vertexRange || (p.vertexStart >= vertexRange[0] && p.vertexEnd <= vertexRange[1])) && (!vertexPredicate || p.points.every(vertexPredicate)));
    if (!optional) captured.forEach((p, index) => paths.push({ points: p.points.map(point => subtract(point, anchor)), radii: Array.from(p.radii), role: typeof role === 'function' ? role(index) : role }));
    const userData = mesh.userData;
    return { name: amended ? mesh.name.replace(' · cutaway', ' · complete lamellae') : mesh.name, layer: userData.layer || 'neural', color: userData.baseColor ?? mesh.material.color.getHex(), opacity: userData.baseOpacity ?? mesh.material.opacity, optional, amended,
      positions: encode(local), normals: encode(arrays.normals), indices: encode(arrays.indices),
      vertices: local.length / 3, triangles: arrays.indices.length / 3,
      sourceGeometry: { positionSha256: sha256(typedBytes(arrays.positions)), normalSha256: sha256(typedBytes(arrays.normals)), indexSha256: sha256(typedBytes(arrays.indices)), originalVertexCount: arrays.sourcePositions.length / 3, originalTriangleCount: arrays.sourceIndices.length / 3, selection: amended ? 'original support shell with angular inspection window closed; original shell count, radii and tessellation retained' : vertexRange ? 'original appended soma only' : vertexPredicate ? 'original connected components only' : 'complete original mesh' },
      metadata: { ...userData } };
  });
  const finalPaths = pathsOverride || paths;
  finalPaths.forEach(p => { assert(p.points.length === p.radii.length, key); p.points.flat().forEach(v => assert(Number.isFinite(v))); p.radii.forEach(v => assert(Number.isFinite(v) && v > 0)); });
  const payload = { key, version: '4.1-preserved-v3', units: 'micrometers', sourceCellId, sourceRegion: region, sourceAnchorUm: anchor, boundsUm: bounds, ports: Object.fromEntries(Object.entries(ports).map(([name, point]) => [name, subtract(point, anchor)])), meshes: serialized, paths: finalPaths,
    metadata: { sourceVersion: 'Finger Pathway Atlas v3', preservation: 'Original V3 neural surface vertices, normals and triangle connectivity retained; local-origin translation only. Marked support-shell inspection openings are closed at their original complexity. Synthetic source morphology remains synthetic.', ...metadata }, provenance: { sourceFiles: sourceHashes, anatomyPayloadSha256: sha256(packed) } };
  const filename = key.replaceAll(':', '-'), json = Buffer.from(JSON.stringify(payload)), zipped = gzipSync(json, { level: 9 });
  fs.writeFileSync(path.join(outputDir, `${filename}.json.gz`), zipped);
  const counts = { vertices: serialized.reduce((n, m) => n + m.vertices, 0), triangles: serialized.reduce((n, m) => n + m.triangles, 0), meshes: serialized.length, paths: finalPaths.length };
  const entry = { key, sourceCellId, sourceRegion: region, sourceAnchorUm: anchor, boundsUm: bounds, ports: payload.ports, counts,
    url: `/assets/finger-pathway-atlas/v4/cells/${filename}.json.gz`, sha256: sha256(zipped), jsonSha256: sha256(json), bytes: zipped.length, jsonBytes: json.length, metadata: payload.metadata };
  if (terminalOrganCenters[key]) {
    entry.organCenterUm = subtract(terminalOrganCenters[key].point, anchor);
    entry.organCenterBasis = terminalOrganCenters[key].basis;
  }
  entries.push(entry); assets.set(key, payload);
}

// Exact DRG implicit soma, including its original fused proximal root; omit
// the specimen's long T-branches so new continuous atlas routes attach here.
const drg = maker.build('drg', model);
for (const mesh of drg.entries.filter(mesh => mesh.userData.somaPosition)) {
  const id = mesh.userData.id, appended = capture(mesh).appends[0], stem = capture(mesh).paths[0].points[0];
  assert(appended && appended.vertexStart === 0);
  const satellites = drg.entries.filter(other => other.userData.id === id && other.userData.layer === 'support');
  saveTemplate({ key: `drg:${id}`, region: 'drg', sourceCellId: id, anchor: Array.from(mesh.userData.somaPosition),
    meshes: [{ mesh, vertexRange: [appended.vertexStart, appended.vertexEnd] }, ...satellites.map(mesh => ({ mesh, role: 'support' }))], ports: { axonOut: stem, inlet: stem },
    metadata: { somaAxesUm: Array.from(mesh.userData.somaAxes), subtype: mesh.userData.subtype, sourceCellName: mesh.userData.name, sourceEvidence: mesh.userData.evidence, removedContext: 'Original long specimen T-branches are replaced by continuous atlas routes; the original soma and fused stem are unchanged.' } });
}

// Original organicCell outputs. Their five dendritic trees are preserved in
// full. Spinal interneurons also retain the original local axonal arbor.
for (const region of ['spinal', 'medulla', 'thalamus']) {
  const scene = maker.build(region, model);
  for (const mesh of scene.entries.filter(mesh => mesh.userData.preservedSourceAnchor)) {
    const meta = mesh.userData, anchor = Array.from(meta.preservedSourceAnchor);
    saveTemplate({ key: `${region}:${meta.id}`, region, sourceCellId: meta.id, anchor,
      meshes: [{ mesh, role: index => !meta.preservedProjected && index >= 75 ? 'axon' : 'dendrite' }], ports: { axonOut: Array.from(meta.axonOrigin), inlet: anchor },
      metadata: { somaRadiusUm: meta.preservedSomaRadius, sourceCellName: meta.name, sourceEvidence: meta.evidence, hasOriginalLocalAxon: !meta.preservedProjected } });
  }
}

// Original Allen membranes and optional, separately labelled modeled detail.
// sourceGeometry contains only the source soma and all measured trace branches.
for (let index = 0; index < data.morphologies.length; index++) {
  const rec = data.morphologies[index], scene = maker.build('cell', model, 'high', index);
  const core = scene.entries.find(mesh => !mesh.userData.modeledFineDetail);
  assert.equal(core.geometry, maker.sourceGeometry(index));
  const axons = rec.branches.filter(branch => branch.type === 2);
  const starts = new Set(axons.map(branch => JSON.stringify(branch.points[0].slice(0, 3))));
  const leaves = axons.map(branch => branch.points.at(-1).slice(0, 3)).filter(p => !starts.has(JSON.stringify(p)));
  // A routing attachment at an existing distal axon endpoint. Selection is a
  // modeling choice; all measured axonal branches remain intact regardless.
  const axonOut = leaves.reduce((best, point) => point.reduce((s, v) => s + v * v, 0) > best.reduce((s, v) => s + v * v, 0) ? point : best, [0, 0, 0]);
  saveTemplate({ key: `cortex:${rec.id}`, region: 'cortex', sourceCellId: rec.id, anchor: [0, 0, 0],
    meshes: scene.entries.map(mesh => ({ mesh, optional: !!mesh.userData.modeledFineDetail })), ports: { axonOut, inlet: [0, 0, 0] },
    pathsOverride: rec.branches.map(branch => ({ points: branch.points.map(p => p.slice(0, 3)), radii: branch.points.map(p => Math.max(.07, p[3])), role: branch.type === 2 ? 'axon' : branch.type === 4 ? 'apical-dendrite' : 'dendrite', sourceType: branch.type })),
    metadata: { source: rec.source, originalSwcSha256: rec.sha256, specimen: rec.metadata, sourceProvenance: rec.provenance, sourceEvidence: 'Measured human bright-field tracing topology/radii, with original V3 generated surface. Not EM segmentation or measured S1/M1 tissue.', axonAttachment: 'Farthest retained distal axon leaf; modeled extension begins here without deleting any source branch.', optionalFineDetail: 'Original V3 modeled spines/boutons retained separately, not measured in the SWC.' } });
}

// Close only the two original receptor-support inspection windows. The original
// 25 Pacinian lamellae and spindle capsule retain their radii, vertex counts,
// triangle indices and meshing parameters. Their source neural meshes are taken
// from the untouched maker above, never from this amended generator.
const pacinianHook = 'pl.shell(pcen,[a,108+j*4.1,a*.70],31+j,38,60,.57);';
const spindleHook = 'cap.shell([-330,0,0],[67,530,47],261,50,52,.76);';
assert.equal(source.split(pacinianHook).length, 2);
assert.equal(source.split(spindleHook).length, 2);
const closedSource = instrumented.replace(pacinianHook, pacinianHook.replace(',.57)', ',1)')).replace(spindleHook, spindleHook.replace(',.76)', ',1)'));
vm.runInContext(closedSource, context, { filename: 'specimens.js (two support inspection openings closed)' });
const closedMaker = context.window.ATLAS_GENERATORS.factories(data);
const closedTip = closedMaker.build('tip', model), closedProprio = closedMaker.build('proprio', model);
const tip = maker.build('tip', model);
const terminals = [
  { key: 'meissner', anchor: [-556, -490, 35], select: mesh => /^Meissner/.test(mesh.name) },
  { key: 'merkel', anchor: [-553, -491, 38], select: mesh => /^Merkel/.test(mesh.name) },
  { key: 'pacinian', anchor: [-550, -492, 41], select: mesh => /^Pacinian-like central/.test(mesh.name) },
  { key: 'free', anchor: [-548, -493, 44], select: mesh => /^Free-ending sensory/.test(mesh.name) },
];
for (const def of terminals) {
  const meshes = tip.entries.filter(def.select);
  if (def.key === 'pacinian') meshes.push(closedTip.entries.find(mesh => /^Pacinian concentric/.test(mesh.name)));
  assert(meshes.length, def.key);
  saveTemplate({ key: `terminal:${def.key}`, region: 'tip', sourceCellId: meshes[0].userData.id, anchor: def.anchor,
    meshes: meshes.map(mesh => ({ mesh, role: mesh.userData.layer === 'neural' ? 'terminal' : 'support', amended: def.key === 'pacinian' && mesh.userData.layer === 'support' })), ports: { inlet: def.anchor, axonOut: def.anchor },
    metadata: { subtype: def.key, sourceCellName: meshes[0].name, sourceEvidence: 'Original V3 synthetic sensory ending, with all original neural terminal geometry retained.', ...(def.key === 'pacinian' ? { amendedGroups: ['Pacinian 25-lamella support: inspection opening closed; shell count/radii/resolution retained.'] } : {}), removedContext: 'Original open skin comparison surfaces excluded.' } });
}
const nmj = maker.build('nmj', model), nmjAnchor = [-62, 67, -62];
saveTemplate({ key: 'terminal:nmj', region: 'nmj', sourceCellId: 201, anchor: nmjAnchor,
  meshes: nmj.entries.filter(mesh => !['sarcolemma', 'striations'].includes(mesh.userData.id)).map(mesh => ({ mesh, role: mesh.userData.layer === 'neural' ? 'terminal' : 'support' })), ports: { inlet: nmjAnchor, axonOut: nmjAnchor },
  metadata: { subtype: 'nmj', sourceEvidence: 'Original V3 human-inspired NMJ terminal tree, irregular endings, receptor patches, junctional-fold crests and Schwann support retained. Not a reconstructed human NMJ.', removedContext: 'Original open sarcolemma comparison patch and striation guides excluded.' } });

const proprio = maker.build('proprio', model);
for (const [type, sign, anchor, supportId] of [['spindle', -1, [-540, -630, 0], 'intrafusal-context'], ['golgi', 1, [548, -620, 0], 'collagen-context']]) {
  const neural = proprio.entries.find(mesh => mesh.userData.id === 1301), support = proprio.entries.find(mesh => mesh.userData.id === supportId);
  const meshes = [{ mesh: neural, vertexPredicate: p => p[0] * sign > 0, role: 'terminal' }, { mesh: support, role: 'support' }];
  if (type === 'spindle') meshes.push({ mesh: closedProprio.entries.find(mesh => mesh.userData.id === 'spindle-envelope'), role: 'support', amended: true });
  saveTemplate({ key: `terminal:${type}`, region: 'proprio', sourceCellId: 1301, anchor, meshes, ports: { inlet: anchor, axonOut: anchor },
    metadata: { subtype: type, sourceEvidence: 'Original V3 qualitative proprioceptor specimen geometry. Connected components are separated by their original spatial domain; no neural triangle is cut or retessellated.', ...(type === 'spindle' ? { amendedGroups: ['Spindle capsule: inspection opening closed; shell count/radii/resolution retained.'] } : {}) } });
}

assert.equal(entries.length, 159, 'Expected 60 DRG + 82 circuit + 10 cortical + 7 terminal templates');
assert.equal(new Set(entries.map(entry => entry.key)).size, entries.length);
const manifest = { version: '4.1-preserved-v3', units: 'micrometers', templates: entries, sourceFiles: sourceHashes, anatomyPayloadSha256: sha256(packed),
  totals: { templates: entries.length, bytes: entries.reduce((n, e) => n + e.bytes, 0), jsonBytes: entries.reduce((n, e) => n + e.jsonBytes, 0), vertices: entries.reduce((n, e) => n + e.counts.vertices, 0), triangles: entries.reduce((n, e) => n + e.counts.triangles, 0) },
  preservation: 'Original V3 neural morphology preserved without simplification. Local-origin translation and exclusion of whole context meshes/connected components occur. Pacinian and spindle support inspection openings are closed at their original shell count, radii and resolution. Source branches are retained as exact centerlines for low-detail rendering.',
  limitations: ['This is a representative modeled pathway, not a measured end-to-end human connectome.', 'Noncortical cellular membranes and terminal structures remain the original synthetic V3 models.', 'Cortical sources are temporal/frontal human bright-field tracings, not measured finger S1/M1 neurons.', 'The inherited V3 generated membranes are visualization meshes, not validated watertight biophysical surfaces.'] };
fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest.totals));
