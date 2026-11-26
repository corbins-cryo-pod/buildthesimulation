import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';
import {defaults,initial,act,solve,csv} from '../public/equipment/05-09/solver.mjs';
import {anchors,assets} from '../public/equipment/05-09/geometry-source.mjs';
import {build} from '../public/equipment/05-09/mesh-writer.mjs';
const d=new URL('../public/equipment/05-09/',import.meta.url),read=p=>fs.readFileSync(new URL(p,d)),f=JSON.parse(read('reference-plan.json')),rows=JSON.parse(read('verification.json')),c=defaults();
const pair=(r,k)=>Object.fromEntries(r.windows.map(w=>[w.element,w[k]])),corr=solve(c),values={
 'register-equal-areas':pair(corr,'relativePercent'),
 'relative-sensitivity':pair(solve({...c,rsfAu:2}),'relativePercent'),
 'raw-shift':pair(solve({...c,axis:'raw'}),'centerEv'),
 'gold-copper-scale-ag-check':{...pair(corr,'centerEv'),recoveredOffsetEv:corr.calibration.fittedOffsetEv,recoveredGain:corr.calibration.fittedGain},
 'broader-pass':{newFwhmEv:solve({...c,passEv:46.95}).windows[0].fwhmEv,oldFwhmEv:corr.windows[0].fwhmEv},
 'no-transfer':act(act(initial(),'transfer'),'run').error,
 'empty-components':solve({...c,auArea:0,agArea:0}).windows.every(w=>w.relativePercent===null)?'No identified components; percent withheld for both.':'bad'
};
for(const item of f.cases)test(item.id,()=>{const v=values[item.id],r=rows.find(x=>x.id===item.id);assert.ok(r.pass);if(typeof v==='string'){assert.equal(v,item.expected);assert.equal(v,r.actual);}else for(const [k,value] of Object.entries(item.expected)){assert.ok(Math.abs(v[k]-value)<=item.absTolerance,k);assert.ok(Math.abs(v[k]-r.actual[k])<=item.absTolerance);}});
test('Sequence guards, background, revisions and downloadable solver agreement',()=>{
 let s=initial();assert.match(act(s,'door').error,/Retract/);s=act(act(s,'transfer'),'door');assert.match(act(s,'transfer').error,/Close/);
 s=act(act(act(s,'load'),'door'),'transfer');assert.match(act(s,'run').error,/No coupon/);
 let r=act(initial(),'run');r=act(r,'set',{baseline:24});assert.equal(r.result,null);r=act(r,'run');assert.equal(r.result.inputRevision,1);assert.equal(r.result.revision,2);assert.equal(csv(r.result).split('\n').length,484);
 assert.ok(Math.abs(r.result.windows[0].areaCounts-1000)<1e-5);
 assert.equal(read('solver.mjs').toString(),fs.readFileSync(new URL('../src/lib/equipment/05-09/solver.mjs',import.meta.url),'utf8'));
});
test('Metric GLB, stable targets and 25 mm carrier actual vertices',()=>{
 const b=read('versaprobe-ii.glb');assert.equal(b.readUInt32LE(0),0x46546c67);const len=b.readUInt32LE(12),g=JSON.parse(b.toString('utf8',20,20+len)),off=28+len;
 const mt=JSON.parse(read('interactions.json'));assert.equal(mt.bytes,b.length);assert.ok(mt.triangles<15000&&mt.draws<=60&&b.length<750000);assert.deepEqual(build(assets,anchors).metrics,mt);
 for(const [id,a] of Object.entries(anchors)){const n=g.nodes.find(n=>n.name===id);assert.equal(n.extras.action,a.action);assert.ok(n.extras.boundsM.every(x=>x>0));assert.doesNotThrow(()=>act(initial(),a.action));}
 const p=g.nodes.find(n=>n.name==='sample_puck'),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const part of g.meshes[p.mesh].primitives){const c=g.accessors[part.attributes.POSITION],v=g.bufferViews[c.bufferView];assert.equal(c.componentType,5126);for(let i=0;i<c.count;i++)for(let k=0;k<3;k++){const x=b.readFloatLE(off+v.byteOffset+12*i+4*k);lo[k]=Math.min(lo[k],x);hi[k]=Math.max(hi[k],x);}}
 for(const [j,k] of [0,2].entries()){const row=JSON.parse(read('geometry-check.json'))[j],actual=(hi[k]-lo[k])*1000;assert.ok(Math.abs(actual-25)<.2);assert.ok(Math.abs(row.digitalMm-actual)<.001);}
});
