import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {fixture,initial,dispatch,fit,inspect,validate} from '../public/equipment/03-04/solver.mjs';
const p=new URL('../public/equipment/03-04/',import.meta.url),url=n=>new URL(n,p),json=n=>JSON.parse(readFileSync(url(n),'utf8')),rows=[];
function check(id,expected,actual,unit='',tol=0){
 const pass=typeof expected==='number'&&typeof actual==='number'?Math.abs(expected-actual)<=tol:expected===actual;
 rows.push({id,expected,actual,unit,tol:typeof expected==='number'?tol:'Exact',pass});
 assert.ok(pass,id);
}
const step=(s,a,v)=>{const q=dispatch(s,a,v);assert.ok(q.ok,q.message);return q.state;};
test('independent diameter/offset cases for the passive seat',()=>{
 check('Centered Ø100 witness radial margin',27,fit(100).radialClearanceMm,'mm',1e-10);
 check('Centered Ø150 witness margin at exact boundary',2,fit(150).radialClearanceMm,'mm',1e-10);
 assert.ok(fit(150).fits);
 check('Centered Ø150.02 witness','Reject',fit(150.02).fits?'Fit':'Reject');
 assert.ok(fit(120,15).fits);assert.equal(fit(120,15.001).fits,false);assert.deepEqual(fit(120,-15).radialClearanceMm,2);
 assert.throws(()=>fit(100,36));
});
test('center and edge reproduce ordered source map values',()=>{
 const r=inspect();
 check('Center lower layer A',40,r.selected.stack[0].thicknessNm,'nm',0);
 check('Center upper layer B',20,r.selected.stack[1].thicknessNm,'nm',0);
 check('Center total thickness',60,r.selected.totalNm,'nm',0);
 assert.deepEqual(r.selected.stack.map(q=>[q.cumulativeBaseNm,q.cumulativeTopNm]),[[0,40],[40,60]]);
 const e=inspect(fixture,0,4);
 check('Opposite corner total',66,e.selected.totalNm,'nm',0);
 assert.deepEqual(e.selected.stack.map(q=>q.layerId),['witness-A','witness-B']);
 check('Both input maps unchanged','Exact arrays',JSON.stringify(e.layers)===JSON.stringify(fixture.layers)?'Exact arrays':'Altered');
});
test('layer order is retained, not sorted by label or thickness',()=>{
 const reverse={...fixture,layers:fixture.layers.slice().reverse()};
 assert.deepEqual(inspect(reverse).selected.stack.map(q=>[q.layerId,q.cumulativeBaseNm,q.cumulativeTopNm]),[['witness-B',0,20],['witness-A',20,60]]);
});
test('dry handling follows state and rejects placement with invalid clearance',()=>{
 let s=initial();
 assert.equal(dispatch(s,'place').ok,false);assert.equal(dispatch(s,'tray').ok,false);assert.equal(dispatch(s,'inspect').ok,false);
 s=step(step(s,'cover'),'tray');assert.equal(dispatch(s,'cover').ok,false);
 s=step(s,'geometry',{diameterMm:150.02});assert.equal(dispatch(s,'place').ok,false);
 s=step(step(s,'geometry',{diameterMm:150}),'place');
 assert.equal(dispatch(s,'geometry',{diameterMm:100}).ok,false);
 s=step(s,'inspect');
 assert.equal(s.result.fit.diameterMm,150);assert.equal(step(s,'place').result,null);
});
test('validate axis, grid, sample and numeric integrity; deterministic export',()=>{
 assert.deepEqual(json('example-witness.json'),fixture);
 assert.deepEqual(json('example-inspection.json'),inspect());
 assert.throws(()=>validate({...fixture,xMm:[-15,-15]}));assert.throws(()=>validate({...fixture,diameterMm:45}));
 assert.throws(()=>inspect(fixture,0,5));assert.throws(()=>validate({...fixture,layers:[fixture.layers[0],fixture.layers[0]]}));
 const s=step(initial(),'import',{...fixture,sampleId:'alternate-inert',revision:4});
 assert.equal(s.sample.revision,4);assert.equal(s.placed,false);
 assert.equal(inspect(s.sample).sourceRevision,4);
});
test('loadable GLB shows metric sandbox and isolated stable node bindings',async()=>{
 const m=json('interaction.json'),b=readFileSync(url('discovery635.glb')),stat=json('asset-metrics.json');
 const scene=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene,seen=new Map();
 scene.traverse(o=>seen.set(o.name,(seen.get(o.name)??0)+1));
 for(const n of [m.frame.placementAnchor,...Object.values(m.parts),...m.ports,...m.actions.map(a=>a.node)])assert.equal(seen.get(n),1,n);
 const g=n=>scene.getObjectByName(n),w=n=>g(n).getWorldPosition(new T.Vector3());
 assert.deepEqual(w(m.frame.placementAnchor).toArray(),[0,0,0]);
 assert.equal([...seen.keys()].filter(k=>/^document_target_[1-4]$/.test(k)).length,4);
 const v=g(m.parts.seat).geometry.attributes.position;
 let mi=Infinity;for(let i=0;i<v.count;i++)mi=Math.min(mi,Math.hypot(v.getX(i)+.486,v.getZ(i)-.355));
 check('Virtual seat inner diameter',154,mi*2000,'mm',.005);
 const disc=g(m.parts.disc),bb=new T.Box3().setFromObject(disc).getSize(new T.Vector3());
 check('Inert GLB example disc diameter',100,bb.x*1000,'mm',.01);assert.ok(Math.abs(bb.z-.1)<1e-5);
 assert.deepEqual(new T.Box3().setFromObject(scene).getSize(new T.Vector3()).toArray().map(v=>Math.round(v*1000)),stat.envelopeMm);
 const before=w(m.parts.disc);g(m.parts.tray).position.z+=m.motion.slideZ;const after=w(m.parts.disc);
 check('Inert tray with witness moves as one',155,(after.z-before.z)*1000,'mm',.0001);
 assert.ok(stat.bytes===b.length&&stat.bytes<2e6&&stat.triangles<5e4&&stat.primitives<=40);
});
test('published evidence is reproducible',()=>{
 const scope='Analytic passive fit, read-only grid data preservation, and measured bounds of the original GLB only. No evidence of the real chamber moving, transfer compatibility, deposition, experimental maps or headset operation.';
 if(process.env.BTS_UPDATE_03_04==='1')writeFileSync(url('verification.json'),JSON.stringify({scope,rows},null,2)+'\n');
 else assert.deepEqual(json('verification.json'),{scope,rows});
});
