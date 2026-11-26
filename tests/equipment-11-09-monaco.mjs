import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {initial,act,validate,info} from '../public/equipment/11-09/solver.mjs';
const u=n=>new URL('../public/equipment/11-09/'+n,import.meta.url),j=n=>JSON.parse(readFileSync(u(n),'utf8')),f=validate(j('rectangles.json')),rows=[];
const at=(id,expected,actual,unit='',tolerance=0)=>{
 const pass=typeof expected==='number'?Math.abs(expected-actual)<=tolerance:expected===actual;
 rows.push({id,expected,actual,unit,tolerance,pass});assert.ok(pass,id+' actual='+actual);
};
test('two independent 24×16 rectangles, 16×10 intersection and inclusion–exclusion',()=>{
 const q=info(f,initial());
 for(const r of q.rectangles)at(r.id+' source area',384,r.areaMm2,'mm²');
 at('Abstract intersection area',160,q.overlap.areaMm2,'mm²');
 at('Union area',608,q.unionAreaMm2,'mm²');
 at('Intersection fraction of union',5/19,q.overlapFractionOfUnion,'dimensionless',1e-15);
 assert.deepEqual(q.overlap.boundsMm,[12,10,28,20]);assert.equal(q.overlap.classification,'area overlap');
});
test('edge contact is zero-area, not disjoint',()=>{
 const s=initial(),n=act(f,s,'next');assert.ok(n.ok);const q=info(f,n.state);
 at('Known touching classification','boundary contact only',q.overlap.classification);
 at('Contact area',0,q.overlap.areaMm2,'mm²');
 at('Contact union',768,q.unionAreaMm2,'mm²');assert.equal(q.overlap.boundsMm,null);
 assert.deepEqual(act(f,n.state,'reset').state,s);
 const k=structuredClone(f);k.cases[0].rectangles[0].boundsMm[2]=4;assert.throws(()=>validate(k),/degenerate/);
 assert.throws(()=>info(f,{view:2}),/Unknown stored/);
});
test('actual OEM metric case and only a detached named selection target',async()=>{
 const b=readFileSync(u('monaco-1035.glb')),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),m=j('interaction.json'),s=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;
 const ps=g.meshes.flatMap(x=>x.primitives),stats={bytes:b.length,nodes:g.nodes.length,primitives:ps.length,triangles:ps.reduce((a,x)=>a+g.accessors[x.indices].count/3,0)};
 if(process.env.BTS_UPDATE_11_09==='1')writeFileSync(u('asset-metrics.json'),JSON.stringify(stats,null,2)+'\n');else assert.deepEqual(j('asset-metrics.json'),stats);
 assert.ok(stats.bytes<2e6&&stats.primitives<=40&&stats.triangles<5e4);
 function get(n){const a=[];s.traverse(o=>{if(o.name===n)a.push(o);});assert.equal(a.length,1,n);return a[0];}
 for(const n of [m.frame.placementAnchor,...Object.values(m.parts),...m.actions.map(a=>a.node)])get(n);
 assert.deepEqual(get(m.frame.placementAnchor).getWorldPosition(new Vector3()).toArray(),[0,0,0]);assert.deepEqual(m.ports,[]);
 assert.deepEqual(m.actions.map(x=>[x.action,x.mode]),[['next','read-only']]);
 const box=k=>new Box3().setFromObject(get(m.parts[k])),[w,h,d]=box('housing').getSize(new Vector3()).toArray().map(x=>1e3*x);
 assert.ok(box('exhibit').max.x<box('housing').min.x&&Math.abs(box('housing').min.y)<1e-6);
 at('OEM housing width',360.3,w,'mm',.2);at('OEM housing height',180.5,h,'mm',.2);at('OEM housing length',668.7,d,'mm',.2);
});
test('export examples carry bounds, IDs, geometry and provenance',()=>{
 assert.deepEqual(j('example-reviews.json'),f.cases.map((_,view)=>info(f,{view})));
 const results={scope:'Nominal closed Coherent 1035 head envelope and independent inert planar cards. Not optics, operation, sample processing, calibration or headset evidence.',rows};
 if(process.env.BTS_UPDATE_11_09==='1')writeFileSync(u('verification.json'),JSON.stringify(results,null,2)+'\n');else assert.deepEqual(j('verification.json'),results);
});
