import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {initial,act,validate,info} from '../public/equipment/07-09/solver.mjs';
const u=n=>new URL('../public/equipment/07-09/'+n,import.meta.url),j=n=>JSON.parse(readFileSync(u(n),'utf8')),f=validate(j('drawing-archive.json')),rows=[];
const at=(id,expected,actual,unit='',tolerance=0)=>{
 const pass=typeof expected==='number'?Math.abs(expected-actual)<=tolerance:expected===actual;
 rows.push({id,expected,actual,unit,tolerance,pass});assert.ok(pass,id+' actual='+actual);
};
test('independent ruler check on a complete stacked outline',()=>{
 const q=info(f,initial());
 at('Complete width from 140 fixed pixels',70,q.results.widthMm,'mm');
 at('Complete height from 80 fixed pixels',40,q.results.totalHeightMm,'mm');
 at('Upper segment',25,q.results.upperHeightMm,'mm');
 at('Lower segment',15,q.results.lowerHeightMm,'mm');
 assert.equal(q.viewId,'STACK-FULL');
});
test('cropped base remains unknown and malformed data fail closed',()=>{
 const s=initial(),n=act(f,s,'next');assert.ok(n.ok);const q=info(f,n.state);
 at('Cropped width remains measured',70,q.results.widthMm,'mm');
 at('Cropped total height',null,q.results.totalHeightMm);at('Cropped lower segment',null,q.results.lowerHeightMm);
 assert.equal(q.observedEdgesPx.base,null);assert.equal(q.viewId,'STACK-CROPPED');
 const bad=structuredClone(f);bad.views[1].edgePx.base=80;
 assert.throws(()=>validate(bad),/must not supply/);assert.throws(()=>info(f,{view:9}),/Unknown/);
 const wrong=act(f,s,'unknown');assert.equal(wrong.state,s);at('Invalid action rejected','Rejected',wrong.ok?'Accepted':'Rejected');
 assert.deepEqual(act(f,n.state,'reset').state,s);
});
test('read exact GLB, both module envelopes and clear detached target',async()=>{
 const b=readFileSync(u('lonza-core-x.glb')),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),m=j('interaction.json'),s=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;
 const ps=g.meshes.flatMap(x=>x.primitives),stats={bytes:b.length,nodes:g.nodes.length,primitives:ps.length,triangles:ps.reduce((a,x)=>a+g.accessors[x.indices].count/3,0)};
 if(process.env.BTS_UPDATE_07_09==='1')writeFileSync(u('asset-metrics.json'),JSON.stringify(stats,null,2)+'\n');else assert.deepEqual(j('asset-metrics.json'),stats);
 assert.ok(stats.bytes<2e6&&stats.primitives<=40&&stats.triangles<5e4);
 function get(n){const a=[];s.traverse(o=>{if(o.name===n)a.push(o);});assert.equal(a.length,1,n);return a[0];}
 for(const n of [m.frame.placementAnchor,...Object.values(m.parts),...m.actions.map(a=>a.node)])get(n);
 assert.deepEqual(get(m.frame.placementAnchor).getWorldPosition(new Vector3()).toArray(),[0,0,0]);assert.deepEqual(m.ports,[]);
 assert.deepEqual(m.actions.map(x=>[x.action,x.mode]),[['next','read-only']]);
 const box=k=>new Box3().setFromObject(get(m.parts[k]));
 for(const [k,H] of [['core',147],['xUnit',105]]){
  const [w,h,d]=box(k).getSize(new Vector3()).toArray().map(x=>1e3*x);
  at(k+' OEM width',245,w,'mm',.6);at(k+' OEM height',H,h,'mm',.6);at(k+' OEM depth',280,d,'mm',.6);
 }
 assert.ok(box('exhibit').max.x<box('xUnit').min.x);
 at('Nominal geometry stack height',252,1e3*box('core').max.y,'mm',.6);
 at('X lowest point bench plane',0,box('xUnit').min.y,'m',1e-6);
});
test('complete and cropped exports preserve IDs, scale and missingness',()=>{
 assert.deepEqual(j('example-review.json'),[info(f,initial()),info(f,{view:1})]);
 const results={scope:'Lonza second-generation Core/X dormant metric exterior and separate synthetic drawing. No operation, device signal, biological work, calibration or headset evidence.',rows};
 if(process.env.BTS_UPDATE_07_09==='1')writeFileSync(u('verification.json'),JSON.stringify(results,null,2)+'\n');else assert.deepEqual(j('verification.json'),results);
});
