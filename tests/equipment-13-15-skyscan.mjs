import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {select,validate,act,initial} from '../public/equipment/13-15/solver.mjs';
const u=n=>new URL('../public/equipment/13-15/'+n,import.meta.url),j=n=>JSON.parse(readFileSync(u(n),'utf8')),f=validate(j('phantom.json')),rows=[];
const exact=(id,expected,actual,unit='',tolerance=0)=>{
 const pass=typeof expected==='number'?Math.abs(expected-actual)<=tolerance:expected===actual;
 rows.push({id,expected,actual,unit,tolerance,pass});assert.ok(pass,id);
};
test('expected center plane distance from independent 5-12-13 geometry',()=>{
 const q=select(f,8);
 assert.deepEqual(q.beads.map(t=>t.centroidIndex),[[11,18,8],[35,28,8]]);
 exact('Midplane Z',1.6,q.zMm,'mm',1e-6);
 exact('Midplane centers distance',2.6,q.distanceMm,'mm',1e-6);
 exact('Midplane A extent under discrete symmetric label',69,q.beads[0].voxelsInPlane,'voxels');
 assert.equal(q.sliceId,'CT-TOY-Z08');
});
test('missing slice, empty slice and invalid state are distinct',()=>{
 const m=select(f,6),o=select(f,0);
 exact('Known missing plane','missing',m.coverage);exact('Missing plane distance',null,m.distanceMm);
 assert.equal(m.sliceId,null);
 exact('Blank end plane','stored',o.coverage);exact('Blank end plane distance',null,o.distanceMm);
 assert.equal(o.sliceId,'CT-TOY-Z00');
 const s=initial();assert.equal(act(f,s,'select',-1).state,s);assert.equal(act(f,s,'next').state.index,9);assert.equal(act(f,{index:16},'next').state.index,0);
 assert.throws(()=>validate({...f.metadata,slices:[...f.metadata.slices.slice(1),f.metadata.slices[1]]}),/duplicate/);
});
test('metric cabinet GLB and independent exhibit action',async()=>{
 const b=readFileSync(u('skyscan1272.glb')),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),m=j('interaction.json'),s=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;
 const ps=g.meshes.flatMap(x=>x.primitives),stats={bytes:b.length,nodes:g.nodes.length,primitives:ps.length,triangles:ps.reduce((a,x)=>a+g.accessors[x.indices].count/3,0)};
 if(process.env.BTS_UPDATE_13_15==='1')writeFileSync(u('asset-metrics.json'),JSON.stringify(stats,null,2)+'\n');else assert.deepEqual(j('asset-metrics.json'),stats);
 assert.ok(stats.bytes<2e6&&stats.primitives<=40&&stats.triangles<5e4);
 function get(n){const a=[];s.traverse(o=>{if(o.name===n)a.push(o);});assert.equal(a.length,1,n);return a[0];}
 for(const n of [m.frame.placementAnchor,...Object.values(m.parts),...m.actions.map(a=>a.node)])get(n);
 assert.deepEqual(get(m.frame.placementAnchor).getWorldPosition(new Vector3()).toArray(),[0,0,0]);assert.deepEqual(m.ports,[]);
 assert.deepEqual(m.actions.map(x=>[x.action,x.mode]),[['next','read-only']]);
 const cab=new Box3().setFromObject(get(m.parts.cabinet)),app=new Box3().setFromObject(get(m.parts.exhibit)),[w,h,d]=cab.getSize(new Vector3()).toArray().map(x=>1000*x);
 assert.ok(cab.min.x>app.max.x&&Math.abs(cab.min.y)<.000001);
 exact('Bruker standard exterior width',1160,w,'mm',.1);
 exact('Bruker standard exterior height',330,h,'mm',.1);
 exact('Bruker standard exterior depth',520,d,'mm',.1);
});
test('saved export and independent machine-readable results',()=>{
 assert.deepEqual(j('example-ruler.json'),select(f,8));
 const results={scope:'Read-only inert labeled planes and nominal metric enclosure. Not acquisition, reconstruction, resolution testing, calibration or headset proof.',rows};
 if(process.env.BTS_UPDATE_13_15==='1')writeFileSync(u('verification.json'),JSON.stringify(results,null,2)+'\n');else assert.deepEqual(j('verification.json'),results);
});
