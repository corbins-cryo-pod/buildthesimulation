import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Mesh,MeshBasicMaterial,BoxGeometry,Raycaster,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {dispatch,initial} from '../public/equipment/09-07/solver.mjs';
const dir=new URL('../public/equipment/09-07/',import.meta.url);
const file=readFileSync(new URL('e4980a.glb',dir)), b=JSON.parse(readFileSync(new URL('interaction.json',dir)));
const {scene}=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');
scene.updateMatrixWorld(true);
function node(n){const all=[];scene.traverse(o=>{if(o.name===n)all.push(o);});assert.equal(all.length,1,n);return all[0];}
const body=new Box3().setFromObject(node(b.frame.enclosureNode),true),envelope=body.getSize(new Vector3()).toArray();
const g=[];scene.traverse(o=>{if(o.isMesh)g.push(o.geometry)});
const metrics={glbBytes:file.length,triangles:g.reduce((n,x)=>n+(x.index?.count??x.attributes.position.count)/3,0),meshPrimitives:g.length,enclosureMeters:envelope,benchContactY:body.min.y};
test('documented enclosure, true bench origin and installed fixture',()=>{
 envelope.forEach((a,i)=>assert.ok(Math.abs(a-b.frame.enclosureXYZ[i])<b.frame.modelToleranceM,`axis ${i} ${a}`));
 assert.ok(Math.abs(metrics.benchContactY)<.0002);
 assert.deepEqual(node(b.frame.placementAnchor).getWorldPosition(new Vector3()).toArray(),[0,0,0]);
 const jaw=node('fixture_jaw'),chip=node('chip_dut'),shim=node('chip_short');
 assert.ok(jaw.getWorldPosition(new Vector3()).x<chip.getWorldPosition(new Vector3()).x);
 assert.ok(chip.getWorldPosition(new Vector3()).distanceTo(shim.getWorldPosition(new Vector3()))<1e-8);
 assert.ok(chip.getWorldPosition(new Vector3()).z>body.max.z);
});
test('six spacer ray targets distinct and 4TP ports documented',()=>{
 const ray=new Raycaster(),f=new Vector3(0,0,1);
 const h=b.controls.map(e=>{const m=new Mesh(new BoxGeometry(...e.targetSizeM),new MeshBasicMaterial());m.position.copy(node(e.node).getWorldPosition(new Vector3()));m.updateMatrixWorld(true);return m});
 h.forEach(m=>{ray.set(m.position.clone().addScaledVector(f,.25),f.clone().negate());assert.equal(ray.intersectObjects(h)[0]?.object,m);});
 b.ports.forEach(p=>{assert.ok(Math.abs(Math.hypot(...p.normal)-1)<1e-12);assert.ok(node(p.node).getWorldPosition(new Vector3()).z*p.normal[2]>0);});
});
test('spatial control actions match normal solver and invalid correction',()=>{
 let s=initial();
 const tr=b.controls.find(o=>o.id==='trigger'), mount=b.controls.find(o=>o.id==='mount');
 const saved=dispatch(s,tr.action);
 assert.deepEqual(saved,dispatch(s,'record-standard'));
 s=dispatch(saved.state,mount.action).state;
 assert.equal(s.standard,'short');
 s=dispatch(s,tr.action).state;s=dispatch(s,mount.action).state;
 assert.equal(s.standard,'dut');
 assert.deepEqual(dispatch(s,tr.action).result,dispatch(s,'measure').result);
 const invalid=dispatch(dispatch(dispatch(initial(),'mount','dut').state,'toggle-correction').state,tr.action);
 assert.equal(invalid.code,'calibration-required');
});
test('static mobile GLB budget targets',()=>{
 assert.ok(metrics.glbBytes<2_000_000,JSON.stringify(metrics));assert.ok(metrics.triangles<50_000,JSON.stringify(metrics));assert.ok(metrics.meshPrimitives<=40,JSON.stringify(metrics));
});
if(process.env.REFRESH_0907==='1')writeFileSync(new URL('asset-metrics.json',dir),JSON.stringify({warning:'Static GLB geometry, not headset performance.',...metrics},null,2)+'\n');
