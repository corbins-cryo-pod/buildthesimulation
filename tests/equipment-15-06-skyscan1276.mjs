import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {initial,act,validate,info} from '../public/equipment/15-06/solver.mjs';
const u=n=>new URL('../public/equipment/15-06/'+n,import.meta.url),j=n=>JSON.parse(readFileSync(u(n),'utf8')),f=validate(j('saved-phantom.json')),rows=[];
const at=(id,expected,actual,unit='',tolerance=0)=>{
 const pass=typeof expected==='number'?Math.abs(expected-actual)<=tolerance:expected===actual;
 rows.push({id,expected,actual,unit,tolerance,pass});assert.ok(pass,id+' actual='+actual);
};
test('independent ring area and independent annotation-cell intersection',()=>{
 const q=info(f,initial()),r=q.result,drawn=14*14-6*6;
 at('Ring cells from difference of rectangles',drawn,r.objectPixels,'cells');
 at('Ring area',8,r.objectAreaMm2,'mm²',1e-9);
 at('Ring occupied-column width',2.8,r.objectWidthMm,'mm',1e-9);
 at('Stored annotation length',28,r.annotationPixels,'cells');
 at('Annotation ring coincident columns',8,r.intersectionPixels,'cells');
 assert.notEqual(q.objectLayerId,q.annotationLayerId);assert.equal(q.coverage,'stored');
 const a=act(f,initial(),'overlay');assert.ok(a.ok&&!a.state.showAnnotation);
 assert.deepEqual(info(f,a.state).result,r);
});
test('empty retains coverage and annotation whereas missing supplies neither',()=>{
 const s=initial(),e=info(f,act(f,s,'next').state),m=info(f,{index:2,showAnnotation:true});
 at('Empty shape label count',0,e.result.objectPixels,'cells');
 at('Empty stored width',null,e.result.objectWidthMm);
 at('Empty frame still contains annotation',28,e.result.annotationPixels,'cells');
 at('Missing frame coverage','missing',m.coverage);at('Missing frame result',null,m.result);
 assert.equal(m.objectLayerId,null);assert.equal(m.annotationLayerId,null);
 const q=act(f,s,'select',7);assert.ok(!q.ok);assert.equal(q.state,s);
 const bad=structuredClone(f.metadata);bad.planes[0].annotation.runs[0][1]+=10000;assert.throws(()=>validate(bad),/Invalid binary runs/);
});
test('OEM closed cabinet true-scale geometry and independent selection target',async()=>{
 const b=readFileSync(u('skyscan1276.glb')),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),m=j('interaction.json'),s=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;
 const ps=g.meshes.flatMap(x=>x.primitives),stats={bytes:b.length,nodes:g.nodes.length,primitives:ps.length,triangles:ps.reduce((a,x)=>a+g.accessors[x.indices].count/3,0)};
 if(process.env.BTS_UPDATE_15_06==='1')writeFileSync(u('asset-metrics.json'),JSON.stringify(stats,null,2)+'\n');else assert.deepEqual(j('asset-metrics.json'),stats);
 assert.ok(stats.bytes<2e6&&stats.primitives<=40&&stats.triangles<5e4);
 function get(n){const a=[];s.traverse(o=>{if(o.name===n)a.push(o);});assert.equal(a.length,1,n);return a[0];}
 for(const n of [m.frame.placementAnchor,...Object.values(m.parts),...m.actions.map(a=>a.node)])get(n);
 assert.deepEqual(get(m.frame.placementAnchor).getWorldPosition(new Vector3()).toArray(),[0,0,0]);assert.deepEqual(m.ports,[]);
 assert.deepEqual(m.actions.map(x=>[x.action,x.mode]),[['next','read-only']]);
 const box=k=>new Box3().setFromObject(get(m.parts[k])),[w,h,d]=box('housing').getSize(new Vector3()).toArray().map(x=>1e3*x);
 assert.ok(box('exhibit').max.x<box('housing').min.x&&Math.abs(box('housing').min.y)<1e-6);
 at('OEM cabinet width',954,w,'mm',.6);at('OEM cabinet height',940,h,'mm',.6);at('OEM cabinet depth',1190,d,'mm',.6);
});
test('example reviews preserve stored IDs, units, coverage evidence',()=>{
 assert.deepEqual(j('example-reviews.json'),[0,1,2].map(index=>info(f,{index,showAnnotation:true})));
 const results={scope:'Documentary SkyScan 1276 CMOS case and safe detached two-layer synthetic fixture. No scanner use, acquisition, inference, anatomy, materials, radiation or headset evidence.',rows};
 if(process.env.BTS_UPDATE_15_06==='1')writeFileSync(u('verification.json'),JSON.stringify(results,null,2)+'\n');else assert.deepEqual(j('verification.json'),results);
});
