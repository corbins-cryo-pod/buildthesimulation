import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateManifest} from '../scripts/unpack-phase4-static.mjs';
const root=new URL('../',import.meta.url);
const read=(path)=>readFileSync(new URL(path,root),'utf8');
const json=(path)=>JSON.parse(read(path));
test('published update index has existing stable IDs, distinct fidelity and matching entry assets',()=>{
  const catalogue=json('src/data/equipment-revisions.generated.json');
  const data=json('src/data/crystal-update.json');
  const payload=json('payloads/phase4-static/manifest.json');
  validateManifest(payload);
  const paths=new Set(payload.files.map(row=>row.path));
  const known=new Set(catalogue.records.map(row=>row.id));
  assert.equal(known.size,199);
  assert.equal(data.devices.length,50);
  assert.equal(new Set(data.devices.map(row=>row.id)).size,data.devices.length);
  const counts={bounded_simulation:0,replay_or_mechanical:0,documentary_plus_companion:0};
  for(const row of data.devices){
    assert(known.has(row.id));
    assert.equal(row.href,'/equipment-phase4/'+row.id+'/');
    assert(paths.has(row.href.slice(1)+'index.html'));
    assert(Object.hasOwn(counts,row.fidelity));
    assert(row.scope.trim().length>20);
    counts[row.fidelity]++;
  }
  assert.deepEqual(counts,{bounded_simulation:6,replay_or_mechanical:24,documentary_plus_companion:20});
  assert.equal(data.workflow.href,'/simulations/verified-workflows/');
  for(const lane of ['','optical-stylus/','replay-stylus/','reticle-raster/','signed-volume/','authored-timing/']){
    assert(paths.has(data.workflow.href.slice(1)+lane+'index.html'));
  }
  assert(data.room);
  assert(['/crystal-palace-downloads/'].every(p=>data.room.href.startsWith(p)&&data.room.image.startsWith(p)));
  assert(paths.has(data.room.href.slice(1))&&paths.has(data.room.image.slice(1)));
  for(const p of ['src/pages/simulations/index.astro','src/pages/simulations/equipment/index.astro','src/pages/simulations/equipment/revised/index.astro']){
    assert(read(p).includes('/simulations/equipment/updates/'));
  }
});
