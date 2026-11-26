import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,initial,SINK,cablePoints} from '../public/equipment/16-13/solver.mjs';
import {jsonSource,importSettings,acquire} from '../public/equipment/09-04/solver.mjs';
import {build} from '../public/equipment/16-13/mesh-writer.mjs';
import {assets,anchors} from '../public/equipment/16-13/geometry-source.mjs';
test('BNC link and pulse retain the receiving channel and hand off to the scope',()=>{
 const state=act(act(initial(),'mate'),'pulse'),w=state.waveform;assert.equal(w.channels[0].id,SINK);assert.equal(w.channels[0].samples.filter(x=>x===1.25).length,10);assert.equal(w.dtS,.0001);
 const src=jsonSource(w),r=acquire(importSettings(src),src);assert.equal(r.contactId,SINK);assert.equal(r.measurements.clipCount,0);assert.equal(r.inputKind,'simulated');
});
test('SMA→BNC and unmated results have no route; geometry warning is separate',()=>{const x=act(act(initial(),'plug','SMA'),'mate');assert.equal(x.connection,null);assert.match(x.error,/No adapter/);
 const valid=act(act(initial(),'set',{radiusMm:12}),'mate');assert.equal(valid.connection.bend.warning,true);const o=act(act(valid,'unmate'),'pulse');assert.equal(o.waveform,null);assert.match(o.error,/Mate/);
 assert.ok(Math.abs(cablePoints(30,false).at(-1)[2]-cablePoints(30,true).at(-1)[2]-.018)<1e-12);
});
test('meter-scale asset is reproducible with named plug and port',()=>{const b=build(assets,anchors),raw=readFileSync(new URL('../public/equipment/16-13/connector-bench.glb',import.meta.url));assert.ok(raw.equals(Buffer.from(b.raw)));assert.equal(raw.readUInt32LE(0),0x46546c67);assert.equal(raw.readUInt32LE(8),raw.length);
 assert.equal(b.metrics.unit,'m');assert.ok(raw.length<500000);const j=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12)));assert.equal(j.nodes.find(x=>x.name==='receive_plug_bnc').extras.action,'toggle');assert.equal(j.nodes.find(x=>x.name==='sink_bnc').extras.portId,SINK);
});
