import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {CORTEX_PROFILES} from '../src/lib/finger-atlas-v4/cortical-model.mjs';
import {createAtlasModel} from '../src/lib/finger-atlas-v4/model.mjs';

const root=process.argv.includes('--build')?'dist':'public';
const base=`${root}/assets/finger-pathway-atlas/v4/`;
const raw=readFileSync(base+'scaffold.json'),packed=readFileSync(base+'scaffold.json.gz');
assert.deepEqual(gunzipSync(packed),raw,'Compressed scaffold differs from its fallback');
const scaffold=JSON.parse(raw),provenance=JSON.parse(readFileSync(base+'scaffold-provenance.json'));
assert.equal(createHash('sha256').update(raw).digest('hex'),provenance.output.sha256);
assert.ok(packed.length<1024*1024,'Initial anatomy exceeds 1 MiB compressed');
let vertices=0,triangles=0;
for(const mesh of scaffold.meshes){
  assert.equal(mesh.positions.length%3,0);assert.equal(mesh.indices.length%3,0);
  for(const x of mesh.positions)assert.ok(Number.isFinite(x));
  for(const i of mesh.indices)assert.ok(Number.isInteger(i)&&i>=0&&i<mesh.positions.length/3);
  assert.ok(mesh.detail,'Original V3 detail descriptor missing');
  assert.equal(mesh.detail.encoding,'base64-float32-uint32-le');
  assert.ok(existsSync(root+mesh.detail.url),`Original V3 detail absent: ${mesh.id}`);
  assert.ok(existsSync(root+mesh.detail.gzipUrl),`Compressed original V3 detail absent: ${mesh.id}`);
  vertices+=mesh.positions.length/3;triangles+=mesh.indices.length/3;
}
assert.equal(scaffold.meshes.length,provenance.output.meshes);
assert.equal(vertices,provenance.output.vertices);assert.equal(triangles,provenance.output.triangles);
assert.deepEqual(scaffold.meshes.map(m=>m.id).sort(),provenance.sourceMeshes.map(m=>m.id).sort());
assert.equal(scaffold.sourceStats.meshes,scaffold.meshes.length);
const model=createAtlasModel();assert.equal(model.cells.length,306);assert.equal(model.routes.length,78);
const evidence=JSON.parse(readFileSync(base+'provenance.json'));
assert.equal(evidence.version,4);assert.ok(evidence.references.length>=19);assert.match(evidence.scope,/not a full biological cell census/);

const cortexSources=JSON.parse(readFileSync(base+'cortex-sources.json'));
assert.equal(cortexSources.schemaVersion,'finger-atlas-v4-cortex-sources/1');
assert.equal(cortexSources.implementation.m1.layerFractions.length,6);
assert.equal(cortexSources.implementation.s1.layerFractions.length,6);
for(const area of ['m1','s1'])assert.ok(Math.abs(cortexSources.implementation[area].layerFractions.reduce((a,b)=>a+b,0)-1)<1e-9,`${area.toUpperCase()} layer fractions must sum to one`);
assert.ok(cortexSources.references.some(reference=>reference.id==='h01-science-2024'));
assert.ok(cortexSources.references.some(reference=>reference.id==='bigbrain-layers-2020'));
assert.ok(cortexSources.references.filter(reference=>reference.modality?.toLowerCase().includes('diffusion')||reference.id.startsWith('dki')).length>=4);
assert.match(cortexSources.scope.microstructure,/H01 source/);
for(const [area,p] of Object.entries(CORTEX_PROFILES)){assert.equal(cortexSources.implementation[area].corticalThicknessPriorMm,p.thickness);p.boundaries.slice(1).forEach((b,i)=>assert.ok(Math.abs((b-p.boundaries[i])-cortexSources.implementation[area].layerFractions[i])<1e-9));}
const cortexModule='src/lib/finger-atlas-v4/cortical-sections.mjs';
assert.ok(existsSync(cortexModule),'Paired M1/S1 cortex module missing');
const cortexCode=readFileSync(cortexModule,'utf8');
assert.match(cortexCode,/createCorticalSections/);assert.match(cortexCode,/attachH01References/);
assert.ok(existsSync(root+cortexSources.implementation.h01Pack),'H01 source pack missing');
assert.match(cortexSources.scope.tracts,/No DKI acquisition has been fitted/);

if(process.argv.includes('--build')){
  const route='dist/simulations/finger-pathway-atlas/';
  const parent=readFileSync(route+'index.html','utf8'),viewer=readFileSync(route+'viewer/index.html','utf8');
  assert.match(parent,/Anatomical edition · V4/);assert.match(parent,/306 individually identified cells/);
  assert.ok(existsSync(route+'v3-viewer/index.html'),'Original viewer archive missing');
  assert.match(viewer,/ANATOMICAL EDITION IV/);assert.match(viewer,/Inspect ending/);assert.match(viewer,/M1 \+ S1 coronal cortex/);assert.match(viewer,/cortex-sources\.json/);
  assert.doesNotMatch(viewer,/anatomy\.json\.gz\.part|v3\/engine\.js/);
  const resources=[...viewer.matchAll(/(?:src|href)="(\/_astro\/[^"?#]+)"/g)].map(m=>m[1]);
  assert.ok(resources.some(s=>s.endsWith('.js')),'V4 module absent');assert.ok(resources.some(s=>s.endsWith('.css')),'Viewer styling absent');
  for(const resource of resources)assert.ok(existsSync('dist'+resource),`Missing bundled resource ${resource}`);
  const js=resources.filter(r=>r.endsWith('.js')).map(r=>readFileSync('dist'+r)).reduce((n,b)=>n+gzipSync(b).length,0);
  assert.match(readFileSync(route+'references/index.html','utf8'),/These plates are not V4 screenshots/);
  console.log(`Published shell verified; direct JS entries ${Math.round(js/1024)} KiB gzip (shared imports additional).`);
}
console.log(`V4 verified: ${model.cells.length} cells, ${model.routes.length} complete modeled routes, paired M1/S1 cortex with ${cortexSources.references.length} references, ${scaffold.meshes.length} source surfaces, ${vertices} vertices, ${triangles} scaffold triangles, ${Math.round(packed.length/1024)} KiB anatomy. WebGL/browser interaction not tested by this command.`);
