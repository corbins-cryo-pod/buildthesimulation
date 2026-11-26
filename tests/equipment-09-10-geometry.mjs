import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Mesh,MeshBasicMaterial,BoxGeometry,Raycaster,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {dispatch,initial} from '../public/equipment/09-10/solver.mjs';
const dir=new URL('../public/equipment/09-10/',import.meta.url),file=readFileSync(new URL('sr560.glb',dir)),b=JSON.parse(readFileSync(new URL('interaction.json',dir)));
const {scene}=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');scene.updateMatrixWorld(true);
function node(n){const a=[];scene.traverse(o=>{if(o.name===n)a.push(o)});assert.equal(a.length,1,n);return a[0];}
const body=new Box3().setFromObject(scene,true),envelope=body.getSize(new Vector3()).toArray();
const geom=[];scene.traverse(o=>{if(o.isMesh)geom.push(o.geometry);});
const metrics={glbBytes:file.length,triangles:geom.reduce((n,g)=>n+(g.index?.count??g.attributes.position.count)/3,0),meshPrimitives:geom.length,enclosureMeters:envelope,benchContactY:body.min.y};
test('documented envelope and ground anchor',()=>{
 envelope.forEach((s,i)=>assert.ok(Math.abs(s-b.frame.enclosureXYZ[i])<b.frame.modelToleranceM,`${i}: ${s}`));
 assert.ok(Math.abs(body.min.y)<.0002);assert.deepEqual(node(b.frame.placementAnchor).getWorldPosition(new Vector3()).toArray(),[0,0,0]);
});
test('unique spatial hit and port normals',()=>{
 const targets=b.controls.map(x=>{const m=new Mesh(new BoxGeometry(...x.targetSizeM),new MeshBasicMaterial());m.userData.id=x.id;m.position.copy(node(x.node).getWorldPosition(new Vector3()));m.updateMatrixWorld(true);return m});
 const ray=new Raycaster(),front=new Vector3(0,0,1);
 for(const m of targets){ray.set(m.position.clone().addScaledVector(front,.22),front.clone().negate());assert.equal(ray.intersectObjects(targets)[0]?.object,m,m.userData.id);const o=node(b.controls.find(x=>x.id===m.userData.id).node);assert.equal(ray.intersectObjects(scene.children,true)[0]?.object?.name,o.name,'Front control geometry must be visible: '+o.name);}
 for(const p of b.ports){assert.ok(Math.abs(Math.hypot(...p.normal)-1)<1e-12);assert.ok(node(p.node).getWorldPosition(new Vector3()).z*p.normal[2]>0);}
});
test('control action parity and rejected use when in standby',()=>{
 const s=initial();
 for(const x of b.controls){assert.equal(dispatch(s,x.action,x.value).ok,true,x.id);}
 const g=b.controls.find(x=>x.id==='gain-plus');
 assert.deepEqual(dispatch(s,g.action,g.value).state,dispatch(s,'set',{gain:200}).state);
 assert.equal(dispatch(dispatch(s,'power').state,g.action,g.value).code,'standby');
});
test('static mobile geometry budget',()=>{
 assert.ok(file.length<2e6,JSON.stringify(metrics));assert.ok(metrics.triangles<50000,JSON.stringify(metrics));assert.ok(metrics.meshPrimitives<=40,JSON.stringify(metrics));
});
if(process.env.REFRESH_0910==='1')writeFileSync(new URL('asset-metrics.json',dir),JSON.stringify({warning:'Static GLB counts, not measured headset frame timing.',...metrics},null,2)+'\n');
