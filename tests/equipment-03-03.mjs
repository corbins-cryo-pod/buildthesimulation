import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verification,calculate,defaultRecipe,exampleCalibration} from '../src/lib/equipment/03-03/solver.mjs';
for(const r of verification())test('PVD75 '+r.test,()=>assert.ok(r.pass,JSON.stringify(r)));
test('PVD75 model nominal envelope and named pivots',()=>{const m=JSON.parse(readFileSync(new URL('../public/equipment/03-03/model-source.json',import.meta.url)));const g=JSON.parse(readFileSync(new URL('../public/equipment/03-03/pvd75.gltf',import.meta.url)));assert.deepEqual(m.nodes.find(x=>x.name==='base_plinth').scale,[1.194,.1,.889]);assert.equal(m.nodes.find(x=>x.name==='top_header').position[1]+.05,1.905);assert.equal(g.nodes.length,m.nodes.length);for(const name of ['door_pivot','stage_pivot','shutter_pivot','sample_wafer'])assert.ok(g.nodes.some(x=>x.name===name));assert.equal(Buffer.from(g.buffers[0].uri.split(',')[1],'base64').length,g.buffers[0].byteLength);});
test('PVD75 output provenance and sample contract',()=>{const p=defaultRecipe(),c=exampleCalibration(),r=calculate(c,p);assert.equal(r.sampleId,p.sampleId);assert.equal(r.calibration.id,c.id);assert.equal(r.stress,null);assert.equal(r.units.thickness,'nm');assert.equal(r.points.length,1257);});
