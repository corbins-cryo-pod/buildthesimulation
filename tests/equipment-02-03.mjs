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

test('MLA150 published solver is identical to bundled solver',()=>assert.equal(readFileSync(new URL('../public/equipment/02-03/solver.mjs',import.meta.url),'utf8'),readFileSync(new URL('../src/lib/equipment/02-03/solver.mjs',import.meta.url),'utf8')));
test('MLA150 pixel-average integral equals independent analytic overlap area at multiple pitches',()=>{
 const shapes=[{id:'a',x:2.25,y:3.25,w:15.5,h:11.75,level:127},{id:'b',x:12.25,y:8.5,w:17.5,h:8.5,level:64}];
 const energy=80*(15.5*11.75+(17.5*8.5-5.5*6.5)*64/127)*1e-8;
 for(const pitch_um of [.5,1,2,5]){const r=expose({...EXAMPLE,field_um:20,height_um:20,pitch_um,shapes});const sum=r.grid.dose.reduce((a,b)=>a+b,0)*pitch_um**2*1e-8;assert.ok(Math.abs(sum-energy)<1e-12);assert.ok(Math.abs(sum-r.metrics.integratedEnergy_mJ)<1e-12);assert.ok(r.grid.dose.every(v=>v>=0&&v<=80+1e-9));}
});
test('MLA150 signed subpixel offsets and translated crop agree with analytic geometry',()=>{const shapes=[{id:'a',x:5,y:6.25,w:30,h:5,level:127}];for(const offset_um of [-.4,0,.4,3]){const r=expose({...EXAMPLE,field_um:20,height_um:20,pitch_um:.5,offset_um,shapes});assert.ok(Math.abs(r.metrics.seamResidual_um-offset_um)<.05);assert.ok(Math.abs(r.metrics.clippedEnergy_mJ)<1e-12)}});
test('MLA150 malformed input fails without producing a revision',()=>{for(const patch of [{shapes:[null]},{shapes:[{id:'bad',x:0,y:0,w:1,h:1,level:128}]},{pitch_um:3},{offset_um:Infinity}])assert.throws(()=>expose({...EXAMPLE,...patch}));assert.throws(()=>expose(null));});
