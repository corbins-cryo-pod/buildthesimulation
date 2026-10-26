import assert from 'node:assert/strict';
import { readFileSync,existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { recordingDatasets } from '../src/data/recordings.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const library=read('dist/recordings/index.html');
assert.ok(library.includes('Recording Library'));
for(const entry of recordingDatasets){
  assert.ok(library.includes(entry.id),`Missing registry entry ${entry.id}`);
  assert.ok(existsSync(new URL('dist'+entry.dataUrl,root)),`Missing payload ${entry.id}`);
  for(const d of entry.devices){const page=read(`dist/devices/${d.slug}/index.html`);assert.ok(page.includes('id="measured-recordings"'));assert.ok(page.includes(entry.id));assert.ok(page.includes(d.relationship==='related'?'Related research':'Recorded interface'));}
}
for(const [name,info] of Object.entries(JSON.parse(read('docs/recordings/ASSET_MANIFEST.json')))){
  const source=readFileSync(new URL(`public/data/recordings/${name}`,root)),built=readFileSync(new URL(`dist/data/recordings/${name}`,root));
  assert.equal(createHash('sha256').update(source).digest('hex'),info.sha256,`Source manifest mismatch: ${name}`);
  assert.ok(source.equals(built),`Build changed data: ${name}`);
}
for(const page of ['dist/devices/index.html','dist/simulations/index.html','dist/index.html'])assert.ok(read(page).includes('/recordings/'),`Missing library discovery link in ${page}`);
assert.ok(read('dist/devices/01-utah-microelectrode-array/index.html').includes('id="real-recordings"'));
assert.ok(read('dist/devices/01-utah-microelectrode-array/index.html').includes('id="handwriting-decoder"'));
assert.ok(read('dist/devices/04-neuropixels-probe/index.html').includes('id="neuropixels-recordings"'));
console.log(`Recording Library: ${recordingDatasets.length} datasets, ${new Set(recordingDatasets.flatMap(e=>e.devices.map(d=>d.id))).size} device pages, unchanged data hashes and preserved existing viewers verified.`);
