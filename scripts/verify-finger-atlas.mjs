// Geometry and deployment-artifact checks; this does not exercise WebGL.
import assert from 'node:assert/strict';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import vm from 'node:vm';

const base = 'public/assets/finger-pathway-atlas/v3/';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const integrity = JSON.parse(readFileSync(base + 'asset-integrity.json','utf8'));
for (const [file, expected] of Object.entries(integrity.files)) {
  assert.equal(hash(readFileSync(base + file)), expected, `Changed imported asset: ${file}`);
  assert.ok(statSync(base + file).size < 25 * 1024 * 1024, `Oversized static file: ${file}`);
}
const original = Buffer.concat(integrity.offline_parts.map(file=>readFileSync(base+file)));
assert.equal(hash(original), integrity.original_html_sha256);
const packed = original.toString().match(/<script id="packed"[^>]*>(.*?)<\/script>/s)?.[1];
assert.ok(packed, 'Original anatomy payload missing');
const payload = Buffer.concat(integrity.anatomy_parts.map(file=>readFileSync(base+file)));
assert.equal(hash(Buffer.from(packed.trim(),'base64')), hash(payload), 'Geometry payload changed during import');
const data = JSON.parse(gunzipSync(payload));
assert.equal(data.meshes.length,86);
assert.equal(data.morphologies.length,10);
const context = vm.createContext({window:{},console,atob,btoa,TextDecoder,TextEncoder,URL,Blob,ArrayBuffer,Uint8Array,Float32Array,Uint32Array,performance});
for(const file of ['engine.js','membrane.js','specimens.js']) vm.runInContext(readFileSync(base+file,'utf8'),context,{filename:file});
const maker = context.window.ATLAS_GENERATORS.factories(data);
assert.equal(maker.REGIONS.length,15);
for(const [denominator, count] of [[20,78],[30,52],[40,39]]) assert.equal(maker.cohort(denominator).n,count);
const scenes = ['overview','tip','nerve','drg','spinal','medulla','thalamus','cortex','cell','nmj','proprio'];
const geometries = new Set();
let objects = 0, vertices = 0;
function checkScene(scene) {
  assert.ok(scene.entries.length > 0, `Empty scene: ${scene.id}`);
  for(const mesh of scene.entries) {
    objects++;
    const geometry = mesh.geometry;
    if(geometries.has(geometry))continue;
    geometries.add(geometry);
    const positions = geometry.attributes.position.array;
    assert.equal(positions.length % 3, 0);
    for(const position of positions) assert.ok(Number.isFinite(position),`Nonfinite coordinate: ${mesh.name}`);
    for(const index of geometry.index?.array ?? []) assert.ok(index>=0&&index<positions.length/3,`Invalid mesh index: ${mesh.name}`);
    vertices += positions.length / 3;
  }
}
for(const id of scenes) checkScene(maker.build(id,maker.cohort(30),'low'));
// Detailed and dense cortex must also generate finite, in-range geometry.
for(const quality of ['high','ultra'])checkScene(maker.build('cortex',maker.cohort(30),quality));
for(let index=1;index<10;index++)checkScene(maker.build('cell',maker.cohort(30),'high',index));
const manifest = JSON.parse(readFileSync('src/data/finger-atlas-comparisons.json','utf8'));
assert.equal(manifest.comparisons.length,50);
assert.equal(new Set(manifest.comparisons.map(c=>c.full_figure_file)).size,42);
const originalManifest = JSON.parse(readFileSync(base+'comparison_manifest.json','utf8'));
const sourceIds = new Set(manifest.sources.map(s=>s.id));
for(const c of manifest.comparisons) {
  assert.ok(sourceIds.has(c.reference_source));
  assert.ok(maker.REGIONS.some(r=>r.id===c.region));
  for(const key of ['plate_file','full_figure_file','thumbnail_file'])assert.ok(existsSync(base+c[key]),`Missing ${key}`);
  assert.equal(hash(readFileSync(base+c.full_figure_file)),c.reference_sha256,'Original scientific figure changed');
  const {thumbnail_file,region,...imported} = c;
  assert.deepEqual(imported,originalManifest.comparisons.find(p=>p.number===c.number),'Comparison provenance changed');
}
const viewer = readFileSync('public/simulations/finger-pathway-atlas/v3-viewer/index.html','utf8');
assert.ok(viewer.length<100000,'Viewer shell still embeds the large payload');
for(const [,file] of viewer.matchAll(/<script src="\/assets\/finger-pathway-atlas\/v3\/([^\"]+)"/g))assert.ok(existsSync(base+file));
assert.match(readFileSync(base+'viewer.js','utf8'),/response\.ok/);
assert.match(readFileSync(base+'viewer.js','utf8'),/No electrophysiology or biomechanics/);
if(process.argv.includes('--build')) {
  const route = 'dist/simulations/finger-pathway-atlas/';
  const page = readFileSync(route+'index.html','utf8');
  assert.match(page,/iframe[^>]+title="Finger Pathway Atlas/);
  assert.match(page,/references\//);
  const references = readFileSync(route+'references/index.html','utf8');
  assert.equal([...references.matchAll(/id="plate-\d+"/g)].length,50);
  assert.match(references,/independent magnifications/);
  assert.match(references,/data-full=/);
  assert.ok(existsSync(route+'viewer/index.html'));
  for(const [file,expected]of Object.entries(integrity.files))assert.equal(hash(readFileSync('dist/assets/finger-pathway-atlas/v3/'+file)),expected,`Built asset mismatch: ${file}`);
  const launcher = readFileSync('dist/simulations/index.html','utf8');
  for (const version of [3,4]) {
    const href = `/simulations/finger-pathway-atlas/v${version}/`;
    assert.ok(launcher.includes(`href="${href}"`), `Missing V${version} simulation listing`);
    const versionPage = readFileSync(route+`v${version}/index.html`,'utf8');
    const viewerPath = version === 3 ? 'v3-viewer' : 'viewer';
    assert.ok(versionPage.includes(`src="/simulations/finger-pathway-atlas/${viewerPath}/"`), `Wrong V${version} viewer`);
    assert.match(versionPage,/aria-current="page"/);
    assert.ok(versionPage.includes('/finger-pathway-atlas/v3/') && versionPage.includes('/finger-pathway-atlas/v4/'));
  }
  assert.equal(hash(readFileSync(route+'v3-viewer/index.html')), hash(Buffer.from(viewer)), 'Original V3 viewer changed in build');
  const index = JSON.parse(readFileSync('dist/search-index.json','utf8'));
  for(const href of ['/simulations/finger-pathway-atlas/','/simulations/finger-pathway-atlas/v3/','/simulations/finger-pathway-atlas/v4/','/simulations/finger-pathway-atlas/references/'])assert.ok(index.some(entry=>entry.href===href));
}
console.log(`Finger atlas verified: 15 view definitions, ${scenes.length} scenes, all 10 source cells, three cortex detail levels, ${objects} objects, ${vertices.toLocaleString()} vertices, 50 plates and 42 original figures. Browser/WebGL verification remains pending.`);
