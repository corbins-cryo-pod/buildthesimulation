import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
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
  vertices+=mesh.positions.length/3;triangles+=mesh.indices.length/3;
}
assert.equal(scaffold.meshes.length,41);assert.equal(vertices,36159);assert.equal(triangles,76856);
const model=createAtlasModel();assert.equal(model.cells.length,306);assert.equal(model.routes.length,78);
const evidence=JSON.parse(readFileSync(base+'provenance.json'));
assert.equal(evidence.version,4);assert.ok(evidence.references.length>=19);assert.match(evidence.scope,/not a full biological cell census/);
if(process.argv.includes('--build')){
  const route='dist/simulations/finger-pathway-atlas/';
  const parent=readFileSync(route+'index.html','utf8'),viewer=readFileSync(route+'viewer/index.html','utf8');
  assert.match(parent,/Anatomical edition · V4/);assert.match(parent,/306 individually identified cells/);
  assert.ok(existsSync(route+'v3-viewer/index.html'),'Original viewer archive missing');
  assert.match(viewer,/ANATOMICAL EDITION IV/);assert.match(viewer,/Inspect ending/);assert.doesNotMatch(viewer,/anatomy\.json\.gz\.part|v3\/engine\.js/);
  const resources=[...viewer.matchAll(/(?:src|href)="(\/_astro\/[^"?#]+)"/g)].map(m=>m[1]);
  assert.ok(resources.some(s=>s.endsWith('.js')),'V4 module absent');assert.ok(resources.some(s=>s.endsWith('.css')),'Viewer styling absent');
  for(const resource of resources)assert.ok(existsSync('dist'+resource),`Missing bundled resource ${resource}`);
  const js=resources.filter(r=>r.endsWith('.js')).map(r=>readFileSync('dist'+r)).reduce((n,b)=>n+gzipSync(b).length,0);
  assert.match(readFileSync(route+'references/index.html','utf8'),/These plates are not V4 screenshots/);
  console.log(`Published shell verified; direct JS entries ${Math.round(js/1024)} KiB gzip (shared imports additional).`);
}
console.log(`V4 verified: ${model.cells.length} cells, ${model.routes.length} complete modeled routes, ${scaffold.meshes.length} source surfaces, ${vertices} vertices, ${triangles} scaffold triangles, ${Math.round(packed.length/1024)} KiB anatomy. WebGL/browser interaction not tested by this command.`);
