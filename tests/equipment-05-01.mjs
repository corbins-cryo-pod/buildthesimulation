import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {initial,standard,contact,scan,step,sample,csv} from '../public/equipment/05-01/solver.mjs';
import {exampleSample,defaults,runMill} from '../src/lib/equipment/04-04/solver.mjs';
const dir=new URL('../public/equipment/05-01/',import.meta.url),read=(n)=>readFileSync(new URL(n,dir)),write=(n,v)=>writeFileSync(new URL(n,dir),JSON.stringify(v)+'\n'),base=initial(),fixture=JSON.parse(read('acceptance.json'));
const run=s=>{const r=scan(s);assert.equal(r.ok,true,r.message);return r.result;};
const def=run(base),small=standard(.2), mill=runMill({...exampleSample(),widthMm:1.4,heightMm:1.4,nx:32,ny:16,sampleId:'AU-STEP-TRANSFER',thicknessNm:Array(512).fill(200)},defaults),mapped=sample(mill), hand=run({...base,sample:mapped.value,range:6.5});
const actual=[def.meanStepUm,Math.abs(def.runs[0].stepUm-def.runs[1].stepUm),contact(-.3,small.segments,1),contact(-.6,small.segments,1),contact(-.3,small.segments,12.5),run({...base,tilt:2}).meanStepUm,scan({...base,range:6.5}).code,scan({...base,length:100}).code,def.sampleSdUm,hand.runs[0].signedStepUm];
const rows=fixture.cases.map(([name,expect,tol,unit],i)=>({name,expect,tol,unit,actual:actual[i],pass:typeof expect==='number'?Math.abs(expect-actual[i])<=tol:expect===actual[i]}));
for(const x of rows)test(x.name,()=>assert.ok(x.pass,JSON.stringify(x)));
test('forward, reverse, trace duration and uncertainty',()=>{
 for(const r of def.runs)assert.ok(Math.abs(r.stepUm-9.993)<=.029);
 assert.equal(def.runs[0].trace[0].x,-550);assert.equal(def.runs[1].trace[0].x,550);assert.equal(def.runs[1].trace.at(-1).time,4.4);
 assert.ok(Math.abs(def.modeledExpandedUm-.00081649658)<1e-10);
});
test('fixed tilt makes uncorrected result larger; leveled result recovers the reference',()=>assert.ok(run({...base,tilt:2,level:false}).meanStepUm>11));
test('safety interlocks and corrupt input',()=>{
 const hood=step(base,'hood').state;assert.equal(step(base,'load').code,'hood');assert.equal(scan(hood).code,'interlock');assert.equal(step(hood,'tower').code,'interlock');assert.equal(scan(step(base,'power').state).code,'standby');assert.equal(sample(mill,-2).code,'row');assert.equal(scan({...base,length:1800}).code,'settings');
});
test('handoff, identity, firmware distinction, typed outputs',()=>{
 assert.equal(hand.sampleId,mill.sample.sampleId);assert.equal(hand.sampleRevision,mill.sample.revision);
 assert.equal(hand.sourceProfile.map.row,8);assert.equal(def.classification,'simulated');assert.equal(def.referenceExpandedUm,.029);assert.equal(def.calibrationId,'VIRTUAL-LVDT-LINEAR-1');assert.ok(csv(def).startsWith('sampleId,sampleRevision,scanRevision,calibrationId'));
});
const glb=read('dektakxt.glb'),js=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString()),m=JSON.parse(read('interaction.json'));
const n=id=>{const o=js.nodes.filter(x=>x.name===id);assert.equal(o.length,1,id);return o[0];};
const accessor=o=>js.accessors[js.meshes[o.mesh].primitives[0].attributes.POSITION];
const baseBox=accessor(n('base')),hood=accessor(n('hood_shell'));
const vertices=(o)=>{
 const a=accessor(o),v=js.bufferViews[a.bufferView],off=28+glb.readUInt32LE(12)+v.byteOffset+(a.byteOffset??0);
 return Array.from({length:a.count},(_,i)=>Array.from({length:3},(_,j)=>glb.readFloatLE(off+i*(v.byteStride??12)+4*j)));
};
const shell=n('hood_shell'),hinge=n('hood_hinge'),a=m.angleDeg*Math.PI/180,vt=vertices(shell).map(v=>v.map((k,i)=>k+(shell.translation?.[i]??0)));
const maxY=Math.max(...vt.map(v=>v[1]))+hinge.translation[1];
const openY=Math.max(...vt.map(v=>v[1]*Math.cos(a)-v[2]*Math.sin(a)))+hinge.translation[1];
const primitives=js.meshes.flatMap(x=>x.primitives),tris=primitives.reduce((s,p)=>s+js.accessors[p.indices].count/3,0);
const geom={bytes:glb.length,triangles:tris,primitives:primitives.length,enclosureM:[baseBox.max[0]-baseBox.min[0],maxY,baseBox.max[2]-baseBox.min[2]],openedHeightM:openY};
test('metric closed enclosure and raised hood fit terminal geometry',()=>{
 for(const [i,e] of [.594,.445,.546].entries())assert.ok(Math.abs(geom.enclosureM[i]-e)<.004,JSON.stringify(geom));
 assert.ok(Math.abs(geom.openedHeightM-.727)<.025,JSON.stringify(geom));
});
test('stable anchor graph and VR static budget',()=>{
 for(const q of m.controls)n(q.node);
 for(const p of m.ports)assert.ok(n(p).translation[2]<0);
 const contains=(p,c)=>n(p).children.some(i=>js.nodes[i].name===c);
 assert.ok(contains('hood_hinge','hood_handle'));assert.ok(contains('scan_stage','coupon_anchor'));assert.ok(contains('stylus_tower','stylus_tip'));
 assert.ok(geom.bytes<2e6&&geom.triangles<50000&&geom.primitives<=40,JSON.stringify(geom));
});
if(process.env.REFRESH_0501==='1'){
 write('asset-metrics.json',geom);write('verification.json',{evidence:fixture.evidence,rows});write('reference-coupon.json',standard());write('example-trace.json',def);
 write('ionmill-input-example.json',mill);write('handoff-verification.json',{source:'Actual 04-04 solver output',sampleId:hand.sampleId,sampleRevision:hand.sampleRevision,row:hand.sourceProfile.map.row,expectedUm:-.06,actualUm:hand.runs[0].signedStepUm,toleranceUm:1e-10});
}
