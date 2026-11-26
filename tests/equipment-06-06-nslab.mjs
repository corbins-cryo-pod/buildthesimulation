import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {initial,act,validate,info} from '../public/equipment/06-06/solver.mjs';
const u=n=>new URL('../public/equipment/06-06/'+n,import.meta.url),j=n=>JSON.parse(readFileSync(u(n),'utf8')),f=validate(j('drawing.json')),rows=[];
const at=(id,expected,actual,unit='',tolerance=0)=>{
 const pass=typeof expected==='number'?Math.abs(expected-actual)<=tolerance:expected===actual;
 rows.push({id,expected,actual,unit,tolerance,pass});assert.ok(pass,id+' actual='+actual);
};
test('independent 6–8–10 geometry and rotation',()=>{
 const a=info(f,initial());assert.deepEqual(a.deltaPx,[32,24]);at('AB nominal geometry',10,a.distanceMm,'mm');
 const n=act(f,initial(),'next');assert.ok(n.ok);
 const b=info(f,n.state);assert.equal(b.viewId,'R90');assert.deepEqual(b.pointsPx,{A:[60,16],B:[36,48],C:[60,48]});assert.deepEqual(b.deltaPx,[-24,32]);
 at('AB after quarter-turn',10,b.distanceMm,'mm');
 for(const [pair,expected] of [['AC',8],['BC',6]])for(const view of [0,1])at(pair+' distance, view '+view,expected,info(f,{pair,view}).distanceMm,'mm');
});
test('invalid pair, invalid fixture points and successful view reset',()=>{
 const s=initial();const n=act(f,s,'pair','AD');assert.ok(!n.ok);assert.equal(n.state,s);
 at('Unknown pair rejection','Rejected',n.ok?'Accepted':'Rejected');
 const k=structuredClone(f);k.points.C=k.points.A;assert.throws(()=>validate(k),/distinct/);
 assert.throws(()=>validate({...f,frame:{...f.frame,pixelSizeMm:.1}}),/scale/);
 assert.deepEqual(act(f,{view:1,pair:'BC'},'reset').state,s);
});
test('metric cabinet dimensions and separate semantic inspection target',async()=>{
 const b=readFileSync(u('ns-lab.glb')),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),m=j('interaction.json'),s=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;
 const ps=g.meshes.flatMap(x=>x.primitives),stats={bytes:b.length,nodes:g.nodes.length,primitives:ps.length,triangles:ps.reduce((a,x)=>a+g.accessors[x.indices].count/3,0)};
 if(process.env.BTS_UPDATE_06_06==='1')writeFileSync(u('asset-metrics.json'),JSON.stringify(stats,null,2)+'\n');else assert.deepEqual(j('asset-metrics.json'),stats);
 assert.ok(stats.bytes<2e6&&stats.primitives<=40&&stats.triangles<5e4);
 function get(n){const a=[];s.traverse(o=>{if(o.name===n)a.push(o);});assert.equal(a.length,1,n);return a[0];}
 for(const n of [m.frame.placementAnchor,...Object.values(m.parts),...m.actions.map(a=>a.node)])get(n);
 assert.deepEqual(get(m.frame.placementAnchor).getWorldPosition(new Vector3()).toArray(),[0,0,0]);assert.deepEqual(m.ports,[]);
 assert.deepEqual(m.actions.map(x=>[x.action,x.mode]),[['next','read-only']]);
 const cab=new Box3().setFromObject(get(m.parts.cabinet)),app=new Box3().setFromObject(get(m.parts.review)),[w,h,d]=cab.getSize(new Vector3()).toArray().map(x=>1e3*x);
 assert.ok(app.max.x<cab.min.x&&Math.abs(cab.min.y)<.000001);
 at('Nominal width',1295,w,'mm',.1);at('Nominal height',2053,h,'mm',.1);at('Nominal depth',1045,d,'mm',.1);
});
test('archive, example output and evidence preserve IDs and units',()=>{
 assert.deepEqual(j('example-ruler.json'),info(f,initial()));
 const results={scope:'Vendor nominal closed exterior and geometry of an independent immutable abstract drawing. Not hardware, operation, materials or headset evidence.',rows};
 if(process.env.BTS_UPDATE_06_06==='1')writeFileSync(u('verification.json'),JSON.stringify(results,null,2)+'\n');else assert.deepEqual(j('verification.json'),results);
});
