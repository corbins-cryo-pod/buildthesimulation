import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initial,act,replay,csv} from '../public/equipment/10-09/solver.mjs';
import {jsonSource,importSettings,acquire} from '../public/equipment/09-04/solver.mjs';
import {assets,anchors} from '../public/equipment/10-09/geometry-source.mjs';
import {build} from '../public/equipment/10-09/mesh-writer.mjs';
test('Native marker indices, alignment, blocked missing channels and read-only waveform handoff',()=>{const q=replay('B-01');assert.equal(q.playback.markerIndex,46);assert.equal(q.playback.relativeToAms,3);assert.equal(replay('C-01').playback.relativeToAms,-1);
 assert.throws(()=>replay('D-01'),/empty/);assert.throws(()=>replay('A-32'),/No synthetic trace/);assert.match(csv(q),/B-01,M4016-B,0.023,0.016/);
 const state=act(initial(),'select','B-01');assert.equal(act(state,'align').result,state.result);const src=jsonSource(q),scope=acquire(importSettings(src),src);assert.equal(scope.contactId,'B-01');assert.equal(scope.measurements.clipCount,0);});
test('Meter GLB and passive target list',()=>{const m=build(assets,anchors),x=readFileSync(new URL('../public/equipment/10-09/intan-rhs-m4200.glb',import.meta.url));assert.ok(x.equals(Buffer.from(m.raw)));assert.ok(x.length<325000);assert.equal(m.metrics.unit,'m');const j=JSON.parse(x.subarray(20,20+x.readUInt32LE(12)));for(const k of 'ABCD')assert.equal(j.nodes.find(x=>x.name==='port_'+k).extras.action,'select:'+k+'-01');});
