import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createStation,measure,toCSV,ports,interaction,projectPose} from '../public/equipment/09-12/station.mjs';
import {toGamryEisConfig} from '../public/equipment/09-12/gamry-adapter.mjs';
const file=n=>fs.readFileSync(new URL('../public/equipment/09-12/'+n,import.meta.url)),json=n=>JSON.parse(file(n));
const near=(x,y,t)=>assert.ok(Math.abs(x-y)<=t,`${x} differs from ${y} (> ${t})`);
test('Ohm law, exact conductivity and area scaling, declared temperature is metadata',()=>{
 const z=measure().result;
 near(z.cellCircuit.solutionOhm,100,1e-9);near(z.samples[0][7],1e-4,1e-12);
 near(measure({sigmaSm:2}).result.cellCircuit.solutionOhm,50,1e-9);
 near(measure({areaMm2:400}).result.cellCircuit.solutionOhm,25,1e-9);
 near(measure({gapMm:20,temperatureC:45}).result.cellCircuit.solutionOhm,200,1e-9);
});
test('finite-frequency passive RC matches independently known corner, phasor sign and drive',()=>{
 const f=1/(2*Math.PI*500*10e-6),r=measure({model:'parallel-rc',startHz:f,stopHz:1e5}).result;
 near(r.samples[0][1],350,1e-7);near(r.samples[0][2],-250,1e-7);near(r.samples.at(-1)[1],100,1e-3);
 for(const q of r.samples){assert.ok(q[2]<0&&q[6]>0);near(q[3]*q[7],.01,1e-12);}
});
test('disconnected, wrong map and lifted fixture reject all measurement output',()=>{
 for(const [wire,expected] of [[{WE:'WE',RE:'open',CE:'CE'},'missing-reference'],[{WE:'WE',RE:'RE',CE:'open'},'open-current-path'],[{WE:'RE',RE:'WE',CE:'CE'},'incorrect-assignment']]){
  const r=measure({},wire);assert.equal(r.code,expected);assert.equal(r.result,undefined);
 }
 assert.equal(measure({},undefined,true).code,'open-fixture');
});
test('bounded passive input, identity and sweep validators',()=>{
 assert.equal(measure({sigmaSm:Infinity}).code,'setting');assert.equal(measure({areaMm2:0}).code,'setting');
 assert.equal(measure({ampMv:100,model:'capacitor-only'}).code,'model');assert.equal(measure({count:2.5}).code,'sweep');
 assert.equal(measure({startHz:100,stopHz:10}).code,'sweep');assert.equal(measure({cellId:'invalid html <tag>'}).code,'identity');
});
test('terminal identity, revision, spectrum, and schema persist',()=>{
 const p=measure({cellId:'TEST-EIS',contactId:'WE-7',parentRevision:3}).result;
 assert.equal(p.terminals.reference.id,ports.RE);assert.equal(p.revision,4);assert.equal(p.provenance.origin,'simulated');
 assert.equal(p.samples[0][0],1);assert.equal(p.samples.at(-1)[0],10000);assert.ok(p.samples.every((r,i,x)=>!i||r[0]>x[i-1][0]));
 assert.match(toCSV(p),/# sampleId=TEST-EIS\n# contactId=WE-7\n# parentRevision=3\n# revision=4/);
 const ex=json('example-boundary.json');assert.deepEqual(ex,measure().result);assert.ok(json('output-schema.json').required.every(k=>Object.hasOwn(ex,k)));
});
test('VR state and projected geometry match the solver actions and limit switches',()=>{
 const a=createStation(),s=projectPose(a.read());near(s.workingX,-.003,1e-10);near(s.side,.01,1e-10);near(s.conductiveCenterX,.002,1e-10);
 a.dispatch('configure',{gapMm:30,areaMm2:400});const max=projectPose(a.read());near(max.workingX,-.023,1e-10);near(max.side,.02,1e-10);
 assert.ok(a.dispatch('acquire').result);const t=a.hit('Clip_RE');assert.equal(t.result,null);assert.equal(a.dispatch('acquire').error.code,'missing-reference');
 assert.ok(projectPose(t).clips.RE.translation[1]>s.clips.RE.translation[1]);assert.equal(a.hit('Socket_RE').wiring.RE,'RE');
 const l=projectPose(a.hit('Handle_lift'));assert.equal(l.liftY,.038);assert.equal(l.conductiveVisible,false);assert.equal(a.dispatch('acquire').error.code,'open-fixture');
});
test('glTF physical scale, stable named ray targets and tolerances',()=>{
 const b=file('cell-fixture.glb');assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.length,b.readUInt32LE(8));
 const j=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))),m=json('vr-station.json');
 const shell=j.nodes.find(n=>n.name==='Glass_vessel_shell');assert.equal(shell.scale[0],.072);assert.equal(shell.scale[1],.056);
 assert.equal(j.nodes.length,m.nodes);assert.equal(b.length,m.bytes);
 for(const [n,key] of Object.entries(interaction)){assert.ok(j.nodes.some(v=>v.name===n));const t=m.hitTargets.find(v=>v.node===n);assert.equal(t.action,key);assert.ok(t.boundsM.min.every((a,i)=>a<t.boundsM.max[i]));}
});
test('all published analytical, dimensional and interlock checks pass',()=>{
 const result=json('verification.json').cases;assert.equal(result.length,json('verification-plan.json').cases.length);assert.ok(result.every(r=>r.pass));
});
test('09-01 translation and the pinned solver comparisons retain traceability and limits',()=>{
 assert.deepEqual(toGamryEisConfig(measure().result),json('example-gamry-input.json'));
 assert.throws(()=>toGamryEisConfig(measure({count:4}).result),/at least 5/);
 assert.throws(()=>toGamryEisConfig(measure({model:'parallel-rc',gapMm:30,areaMm2:4,sigmaSm:.05}).result),/not representable/i);
 assert.ok(json('gamry-compatibility.json').cases.every(r=>r.pass&&r.actualMaxAbsComplexDifferenceOhm<=r.toleranceOhm));
});
