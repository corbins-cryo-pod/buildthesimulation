import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {initial,act,parse,info} from '../public/equipment/15-11/solver.mjs';
const u=n=>new URL('../public/equipment/15-11/'+n,import.meta.url),j=n=>JSON.parse(readFileSync(u(n),'utf8')),raw=j('saved-patterns.json'),f=parse(raw),rows=[],update=process.env.BTS_UPDATE_15_11==='1';
const at=(id,expected,actual,unit='',tolerance=0)=>{
 const pass=typeof expected==='number'?typeof actual==='number'&&Math.abs(expected-actual)<=tolerance:expected===actual;
 rows.push({id,expected,actual,unit,tolerance,pass});assert.ok(pass,id+' actual='+actual);
};
test('independent translated and reflected six-tile L drawings',()=>{
 const q=info(f,initial());
 assert.equal(q.cardId,'CARD-B');assert.equal(q.referenceId,'CARD-A');assert.equal(q.revision,1);
 at('Area of four vertical plus two horizontal cells',24,q.card.areaMm2,'mm²');
 at('Translated arrangement aligned intersection',6,q.comparison.intersectionCells,'tiles');
 at('Translated arrangement Jaccard',1,q.comparison.iou,'dimensionless');
 const x=act(f,initial(),'next');assert.ok(x.ok);const r=info(f,x.state);
 assert.equal(r.cardId,'CARD-C');
 at('Reflected arrangement: three shared base-row tiles',3,r.comparison.intersectionCells,'tiles');
 at('Reflected arrangement: three shared and three unique per L',9,r.comparison.unionCells,'tiles');
 at('Reflected arrangement Jaccard',1/3,r.comparison.iou,'dimensionless',1e-12);
});
test('stored blank, malformed cards and invalid selection are distinct',()=>{
 const s=initial(),b=act(f,s,'select',3),r=info(f,b.state);
 at('Stored blank coverage','stored-blank',r.coverage);at('Stored blank area',0,r.card.areaMm2,'mm²');
 at('Empty alignment undefined',null,r.comparison);
 const x=act(f,s,'select',4);assert.ok(!x.ok);assert.equal(x.state,s);
 const bad=structuredClone(raw);bad.cards[1].cells.push([4,2]);assert.throws(()=>parse(bad),/Duplicate/);
 bad.cards[1].cells[0]=[9,0];assert.throws(()=>parse(bad),/outside/);
 assert.ok(Object.isFrozen(f.cards[1].cells));assert.equal(act(f,b.state,'next').state.index,0);
 assert.deepEqual(act(f,b.state,'reset').state,initial());
});
test('published instrument nominal scale and detached GLB action names',async()=>{
 const b=readFileSync(u('e3-colordome.glb')),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),m=j('interaction.json');
 const s=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;
 const ps=g.meshes.flatMap(x=>x.primitives),stats={bytes:b.length,nodes:g.nodes.length,primitives:ps.length,triangles:ps.reduce((a,x)=>a+g.accessors[x.indices].count/3,0)};
 if(update)writeFileSync(u('asset-metrics.json'),JSON.stringify(stats,null,2)+'\n');else assert.deepEqual(j('asset-metrics.json'),stats);
 assert.ok(stats.bytes<2e6&&stats.primitives<=40&&stats.triangles<5e4);
 function get(n){const a=[];s.traverse(o=>{if(o.name===n)a.push(o);});assert.equal(a.length,1,n);return a[0];}
 for(const n of [m.frame.placementAnchor,...Object.values(m.parts),...m.actions.map(a=>a.node)])get(n);
 assert.deepEqual(get(m.frame.placementAnchor).getWorldPosition(new Vector3()).toArray(),[0,0,0]);assert.deepEqual(m.ports,[]);
 assert.deepEqual(m.actions.map(x=>[x.action,x.mode]),[['next','read-only']]);
 const box=k=>new Box3().setFromObject(get(m.parts[k]));
 assert.ok(box('exhibit').max.x<box('console').min.x&&Math.abs(box('console').min.y)<1e-6);
 for(const [key,wn,hn,dn,tol] of [['console',432,86,330,1],['dome',360,260,310,3]]){
  const [w,h,d]=box(key).getSize(new Vector3()).toArray().map(x=>1e3*x);
  at(key+' OEM nominal width',wn,w,'mm',tol);at(key+' OEM nominal height',hn,h,'mm',tol);at(key+' OEM nominal depth',dn,d,'mm',tol);
 }
});
test('download examples preserve provenance, grid, revision and null policy',()=>{
 const examples=[1,2,3].map(index=>info(f,{index}));
 if(update)writeFileSync(u('example-comparisons.json'),JSON.stringify(examples,null,2)+'\n');else assert.deepEqual(j('example-comparisons.json'),examples);
 const q={scope:'Original sealed documentary exteriors with separate immutable geometry cards; no hardware, stimulation, clinical, biological or headset validation.',rows};
 if(update)writeFileSync(u('verification.json'),JSON.stringify(q,null,2)+'\n');else assert.deepEqual(j('verification.json'),q);
});
