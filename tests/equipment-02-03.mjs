import test from 'node:test';import assert from 'node:assert/strict';import {verify,expose,EXAMPLE} from '../public/equipment/02-03/solver.mjs';
for(const row of verify())test('MLA 150: '+row.test,()=>assert.ok(row.pass,JSON.stringify(row)));
test('MLA150 provenance and input immutability',()=>{const j=structuredClone(EXAMPLE),before=JSON.stringify(j),r=expose(j);assert.equal(JSON.stringify(j),before);assert.equal(r.sampleId,j.sampleId);assert.equal(r.revision,j.parentRevision+1);assert.equal(r.grid.dose.length,r.grid.nx*r.grid.ny);assert.equal(r.fields.length,2);assert.equal(r.job.shapes[0].id,'trace-01')});

import {readFileSync} from 'node:fs';
import {makeModel} from '../public/equipment/02-03/model-source.mjs';
test('MLA150 glTF reproducibility and nominal cabinet extents',()=>{
 const model=makeModel(),asset=JSON.parse(readFileSync(new URL('../public/equipment/02-03/mla150.gltf',import.meta.url)));
 assert.deepEqual(model,asset);
 const names=new Set(model.nodes.map(n=>n.name));assert.equal(names.size,model.nodes.length);
 for(const n of ['loading_window','stage','vacuum_chuck','coupon','write_head','operator_panel','emission_led','electronics_workstation','external_chiller'])assert.ok(names.has(n),n);
 const h=model.nodes.find(n=>n.name==='housing'),panels=h.children.map(i=>model.nodes[i]);
 const bounds=[0,1,2].map(i=>[Math.min(...panels.map(n=>n.translation[i]-n.scale[i]/2)),Math.max(...panels.map(n=>n.translation[i]+n.scale[i]/2))]);
 assert.ok(Math.abs(bounds[0][1]-bounds[0][0]-1.3)<1e-9);
 assert.ok(Math.abs(bounds[2][1]-bounds[2][0]-1.3)<.001);
 assert.ok(Math.abs(bounds[1][1]-1.95)<1e-9);
 assert.equal(Buffer.from(model.buffers[0].uri.split(',')[1],'base64').length,model.buffers[0].byteLength);
});
