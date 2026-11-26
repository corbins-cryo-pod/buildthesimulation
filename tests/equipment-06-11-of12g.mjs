import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {initial,act,validate,info} from '../public/equipment/06-11/solver.mjs';
const u=n=>new URL('../public/equipment/06-11/'+n,import.meta.url),j=n=>JSON.parse(readFileSync(u(n),'utf8')),f=validate(j('exhibit.json')),rows=[];
const at=(id,expected,actual,unit='',tolerance=0)=>{
 const pass=typeof expected==='number'?Math.abs(expected-actual)<=tolerance:expected===actual;
 rows.push({id,expected,actual,unit,tolerance,pass});assert.ok(pass,id+' actual='+actual);
};
test('parallel and similar triangle perspective checks',()=>{
 const s=initial(),orth=info(f,s);
 for(const a of orth.cards){
  at(a.id+' parallel width',40,a.displaySizeMm[0],'mm');
  at(a.id+' parallel height',30,a.displaySizeMm[1],'mm');
 }
 at('Parallel near/far ratio',1,orth.nearToFarWidthRatio);
 const p=act(f,s,'next');assert.ok(p.ok);const a=info(f,p.state);
 for(const [i,[w,h]] of [[16,12],[8,6]].entries()){
  at(a.cards[i].id+' projected width',w,a.cards[i].displaySizeMm[0],'mm',1e-12);
  at(a.cards[i].id+' projected height',h,a.cards[i].displaySizeMm[1],'mm',1e-12);
  assert.deepEqual(a.cards[i].sourceSizeMm,[40,30]);
 }
 at('Perspective near/far ratio',2,a.nearToFarWidthRatio);
 assert.deepEqual(act(f,p.state,'reset').state,s);
});
test('bad view, invalid depth and unsupported computation retain safe state',()=>{
 assert.throws(()=>info(f,{view:2}),/out of range/);
 const b=structuredClone(f);b.cards[0].zMm=0;assert.throws(()=>validate(b),/invalid depth/);
 const s=initial(),q=act(f,s,'bad');at('Invalid state retained','Rejected',q.ok?'Accepted':'Rejected');assert.equal(q.state,s);
});
test('actual metric GLB and exactly one detached named target',async()=>{
 const b=readFileSync(u('of-12g.glb')),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),m=j('interaction.json'),s=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;
 const ps=g.meshes.flatMap(x=>x.primitives),stats={bytes:b.length,nodes:g.nodes.length,primitives:ps.length,triangles:ps.reduce((a,x)=>a+g.accessors[x.indices].count/3,0)};
 if(process.env.BTS_UPDATE_06_11==='1')writeFileSync(u('asset-metrics.json'),JSON.stringify(stats,null,2)+'\n');else assert.deepEqual(j('asset-metrics.json'),stats);
 assert.ok(stats.bytes<2e6&&stats.primitives<=40&&stats.triangles<5e4);
 function get(n){const a=[];s.traverse(o=>{if(o.name===n)a.push(o);});assert.equal(a.length,1,n);return a[0];}
 for(const n of [m.frame.placementAnchor,...Object.values(m.parts),...m.actions.map(a=>a.node)])get(n);
 assert.deepEqual(get(m.frame.placementAnchor).getWorldPosition(new Vector3()).toArray(),[0,0,0]);assert.deepEqual(m.ports,[]);
 assert.deepEqual(m.actions.map(x=>[x.action,x.mode]),[['next','read-only']]);
 const cab=new Box3().setFromObject(get(m.parts.cabinet)),app=new Box3().setFromObject(get(m.parts.exhibit)),[w,h,d]=cab.getSize(new Vector3()).toArray().map(x=>1e3*x);
 assert.ok(app.max.x<cab.min.x&&Math.abs(cab.min.y)<.000001);
 at('OEM external width',657,w,'mm',.1);at('OEM external height',870,h,'mm',.1);at('OEM external depth',692,d,'mm',.1);
});
test('example preserves source identity and exact evidence payload',()=>{
 assert.deepEqual(j('example-projection.json'),info(f,{view:1}));
 const results={scope:'Vendor solid-door external dimensions and ideal synthetic projection of fixed read-only cards. No equipment function, material workflow, heating/cure or immersive evidence.',rows};
 if(process.env.BTS_UPDATE_06_11==='1')writeFileSync(u('verification.json'),JSON.stringify(results,null,2)+'\n');else assert.deepEqual(j('verification.json'),results);
});
