import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {initial,replay,gf,createStation,csv,pose,targets,template} from '../public/equipment/08-06/pull.mjs';
const load=n=>fs.readFileSync(new URL('../public/equipment/08-06/'+n,import.meta.url));
test('known 0.32 N peak and explicit wire-break annotation',()=>{
 const r=replay(initial(),'B1').event;assert.equal(r.peak.forceN,.32);assert.equal(r.peak.forceMilliN,320);assert.equal(r.peak.displacementUm,140);assert.equal(r.classification,'wire-break');assert.ok(Math.abs(gf(.32)-32.6309188)<.0001);
});
test('destructive event retains complete immutable before revision and invalidates only target',()=>{
 const baseline=initial(),t=replay(baseline,'B2').event;
 assert.deepEqual(t.preTest,baseline);assert.notEqual(t.preTest,baseline);assert.equal(t.postTest.revision,1);
 assert.deepEqual(t.postTest.bonds.map(x=>x.state),['connected','invalidated','connected']);
 assert.equal(replay(t.postTest,'B2').code,'already-tested');assert.equal(replay(t.postTest,'B3').event.preTest.revision,1);
});
test('trace rejects over-range data, invalid chronology or unknown label',()=>{
 const x=template.map(row=>[...row]);x[2][2]=1;
 assert.equal(replay(initial(),'B1',x).code,'trace');assert.equal(replay(initial(),'B1',template,'inferred').code,'annotation');
 assert.match(csv(replay(initial(),'B1').event),/time_s,vertical_displacement_um,pull_force_N/);
});
test('same station actions drive model and test, with metric envelope and named hit nodes',()=>{
 const s=createStation();assert.equal(s.dispatch('run').error.code,'hook');s.hit('Bond_B3');assert.equal(pose(s.read()).stageOffsetM,-.015);
 s.hit('Hook_shaft');assert.equal(pose(s.read()).hookDropM,-.024);s.hit('Joystick_run');assert.deepEqual(pose(s.read()).invalidated,['B3']);
 const b=load('dage-4000.glb'),g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));assert.deepEqual(g.nodes.find(q=>q.name==='Base_425w_730d').scale,[.425,.012,.73]);
 for(const n of Object.keys(targets))assert.ok(g.nodes.some(x=>x.name===n));
 assert.ok(JSON.parse(load('verification.json')).cases.every(x=>x.pass));
});
