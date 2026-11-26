import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {initial,act,validate,info} from '../public/equipment/11-01/solver.mjs';
const u=n=>new URL('../public/equipment/11-01/'+n,import.meta.url),j=n=>JSON.parse(readFileSync(u(n),'utf8')),f=validate(j('count-cards.json')),rows=[];
const at=(id,expected,actual,unit='',tolerance=0)=>{
 const pass=typeof expected==='number'?Math.abs(expected-actual)<=tolerance:expected===actual;
 rows.push({id,expected,actual,unit,tolerance,pass});assert.ok(pass,id+' actual='+actual);
};
test('independent count normalization and doubling invariance',()=>{
 const a=info(f,initial()),b=info(f,act(f,initial(),'next').state);
 assert.deepEqual(a.marks.map(q=>q.count),[1,3,4]);assert.deepEqual(b.marks.map(q=>q.count),[2,6,8]);
 at('Reference number of marks',8,a.total,'marks');at('Double number of marks',16,b.total,'marks');
 for(const [i,v] of [.125,.375,.5].entries()){
  at('Reference share '+a.marks[i].symbol,v,a.marks[i].share);
  at('Same doubled share '+b.marks[i].symbol,v,b.marks[i].share);
 }
 at('Defined displayed shares sum',1,a.marks.reduce((x,y)=>x+y.share,0));
});
test('empty denominator explicitly stays undefined and invalid input rejects',()=>{
 const e=info(f,{index:2});at('Empty card total',0,e.total,'marks');
 for(const m of e.marks)at(m.symbol+' empty share',null,m.share);
 const s=initial();assert.equal(act(f,s,'select',3).state,s);assert.deepEqual(act(f,{index:2},'next').state,s);
 const wrong=structuredClone(f);wrong.cards[0].counts[0]=-1;assert.throws(()=>validate(wrong),/Invalid static/);
});
test('actual metric GLB and separate named passive selection target',async()=>{
 const b=readFileSync(u('doric-ledd1.glb')),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),m=j('interaction.json'),s=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;
 const ps=g.meshes.flatMap(x=>x.primitives),stats={bytes:b.length,nodes:g.nodes.length,primitives:ps.length,triangles:ps.reduce((a,x)=>a+g.accessors[x.indices].count/3,0)};
 if(process.env.BTS_UPDATE_11_01==='1')writeFileSync(u('asset-metrics.json'),JSON.stringify(stats,null,2)+'\n');else assert.deepEqual(j('asset-metrics.json'),stats);
 assert.ok(stats.bytes<2e6&&stats.primitives<=40&&stats.triangles<5e4);
 function get(n){const a=[];s.traverse(o=>{if(o.name===n)a.push(o);});assert.equal(a.length,1,n);return a[0];}
 for(const n of [m.frame.placementAnchor,...Object.values(m.parts),...m.actions.map(a=>a.node)])get(n);
 assert.deepEqual(get(m.frame.placementAnchor).getWorldPosition(new Vector3()).toArray(),[0,0,0]);
 assert.deepEqual(m.actions.map(x=>[x.action,x.mode]),[['next','read-only']]);assert.deepEqual(m.ports,[]);
 const box=k=>new Box3().setFromObject(get(m.parts[k])),[w,h,d]=box('housing').getSize(new Vector3()).toArray().map(x=>1e3*x);
 assert.ok(box('exhibit').max.x<box('housing').min.x&&Math.abs(box('housing').min.y)<1e-6);
 at('OEM LEDD_1 width',175,w,'mm',.1);at('OEM LEDD_1 height',50,h,'mm',.1);at('OEM LEDD_1 depth',105,d,'mm',.1);
});
test('example exports preserve evidence, cards and source mark counts',()=>{
 assert.deepEqual(j('example-reviews.json'),f.cards.map((_,index)=>info(f,{index})));
 const results={scope:'Documentary nominal enclosure and detached abstract counts; no drive, exposure, signal measurements, calibration or headset evidence.',rows};
 if(process.env.BTS_UPDATE_11_01==='1')writeFileSync(u('verification.json'),JSON.stringify(results,null,2)+'\n');else assert.deepEqual(j('verification.json'),results);
});
