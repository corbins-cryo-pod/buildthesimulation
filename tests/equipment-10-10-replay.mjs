import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createStation,replay,fixture,csv,targets} from '../public/equipment/10-10/replay.mjs';
const get=n=>fs.readFileSync(new URL('../public/equipment/10-10/'+n,import.meta.url));
test('case with omitted block preserves order, holes, voltages and marker counter',()=>{
 const s=createStation(),a=s.hit('Aux_1_rim').result;
 assert.deepEqual(a.channelIds,['A','B']);assert.deepEqual(a.receivedBlocks,['blk-2','blk-0','blk-3']);
 assert.deepEqual(a.samples.filter(x=>x.valuesMv===null).map(x=>x.counter),[1004,1005,1006,1007]);
 assert.deepEqual(a.samples[10].valuesMv,[10,110]);assert.equal(a.markers[0].timeS,.01);assert.equal(a.markers[0].counter,1010);
 s.hit('Synthetic_demo_tag');const b=s.hit('Aux_1_rim').result;assert.equal(b.gapSampleCount,0);assert.deepEqual(b.markers,a.markers);
 assert.equal(b.analysisRevision,2);assert.match(csv(a),/1004,0.004,,,1,\n/);assert.match(csv(a),/1010,0.01,10,110,0,edge-01/);
});
test('marker can survive a gap while duplicate and off-grid imports are rejected',()=>{
 const f=fixture();f.events[0].counter=1005;
 const a=replay(f);assert.ok(a.markers[0].inGap);assert.equal(a.markers[0].timeS,.005);
 const s=createStation();s.dispatch('load',f);f.blocks[0].startCounter=1009;
 assert.deepEqual(s.dispatch('run').result.markers,a.markers);assert.match(s.dispatch('load',f).error,/misaligned/);
 f.blocks[0].startCounter='1008';assert.throws(()=>replay(f),/misaligned/);
 f.blocks[0].startCounter=1008;f.blocks.push({...f.blocks[0],id:'new'});assert.throws(()=>replay(f),/duplicate/);
});
test('case footprint and semantic pick targets match metric GLB',()=>{
 const b=get('open-ephys-gen3-display.glb'),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12))),v=JSON.parse(get('vr-station.json'));
 assert.equal(b.length,v.bytes);assert.deepEqual(g.extras.caseEnvelopeMm,[165.0531,28.52,163.8552]);
 for(const h of v.hitTargets){assert.ok(g.nodes.some(n=>n.name===h.node));assert.equal(targets[h.node],h.action);}
 assert.ok(JSON.parse(get('verification.json')).checks.every(c=>c.pass));
});
