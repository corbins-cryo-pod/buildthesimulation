import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initial,act} from '../public/equipment/16-10/solver.mjs';
import {assets,anchors} from '../public/equipment/16-10/geometry-source.mjs';
import {build} from '../public/equipment/16-10/mesh-writer.mjs';
test('Dry clearance, quarter turn and oversized failure',()=>{const r=act(initial(),'example');assert.deepEqual(r.result.clearance,{widthPerSideMm:14,depthPerSideMm:21,headroomMm:49,fit:true});assert.equal(act(act(r,'rotate'),'fit').result.clearance.depthPerSideMm,6);
 const x=act(act(r,'oversize'),'fit');assert.equal(x.result.clearance.widthPerSideMm,-2);assert.equal(x.result.clearance.fit,false);});
test('Physical scene guard and administrative acceptance',()=>{assert.equal(act(initial(),'basket').raised,false);const r=act(initial(),'example');assert.match(act(r,'lid').error,/Lower/);const a=act(r,'audit').audit;assert.equal(a.status,'interrupted');assert.equal(a.elapsedVirtualS,20);assert.equal(a.physicalCycleRan,false);assert.equal(a.completedCycleEntries.length,0);});
test('Asset reproducibility, meter frame and stable targets',()=>{const m=build(assets,anchors),b=readFileSync(new URL('../public/equipment/16-10/bransonic-1800.glb',import.meta.url));assert.ok(b.equals(Buffer.from(m.raw)));assert.equal(b.readUInt32LE(0),0x46546c67);assert.ok(b.length<150000);
 const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.equal(m.metrics.unit,'m');for(const k of ['lid','basket','coupon'])assert.equal(j.nodes.find(x=>x.name===k).extras.action,anchors[k].action);});
