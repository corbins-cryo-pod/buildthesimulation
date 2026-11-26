import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initial,act,defaults,fit} from '../public/equipment/03-05/solver.mjs';
import {assets,anchors} from '../public/equipment/03-05/geometry-source.mjs';
import {build} from '../public/equipment/03-05/mesh-writer.mjs';
test('3/4 and 6/8 triangle-driven radial containment plus tangency',()=>{const r=act(initial(),'example');assert.equal(r.result.marginMm,1);assert.equal(act(act(r,'offset'),'check').result.marginMm,-4);assert.equal(fit({...defaults(),diameterMm:112,offsetXmm:0,offsetZmm:0}).marginMm,0);assert.equal(act(initial(),'check').result,null);});
test('Metric GLB and dry-only actions',()=>{const m=build(assets,anchors),x=readFileSync(new URL('../public/equipment/03-05/savannah-s100.glb',import.meta.url));assert.ok(x.equals(Buffer.from(m.raw)));assert.ok(x.length<350000);assert.equal(m.metrics.unit,'m');const j=JSON.parse(x.subarray(20,20+x.readUInt32LE(12)));assert.equal(j.nodes.find(x=>x.name==='dry_gauge').extras.action,'place');assert.equal(j.nodes.find(x=>x.name==='fixed_handle').extras.action,undefined);});
