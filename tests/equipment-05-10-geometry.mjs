import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Vector3,Mesh,MeshBasicMaterial,BoxGeometry,Raycaster} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const dir=new URL('../public/equipment/05-10/',import.meta.url),read=n=>readFileSync(new URL(n,dir)),model=read('labram-hr-evolution.glb'),m=JSON.parse(read('interaction.json'));
const {scene}=await new GLTFLoader().parseAsync(model.buffer.slice(model.byteOffset,model.byteOffset+model.byteLength),'');scene.updateMatrixWorld(true);
const node=n=>{const a=[];scene.traverse(o=>{if(o.name===n)a.push(o)});assert.equal(a.length,1,n);return a[0];};
const nominal=new Box3().setFromObject(scene,true),dims=nominal.getSize(new Vector3()).toArray(), meshes=[];
scene.traverse(o=>{if(o.isMesh)meshes.push(o.geometry);});
const stats={bytes:model.length,enclosureM:dims,triangles:meshes.reduce((s,g)=>s+(g.index?.count??g.attributes.position.count)/3,0),primitives:meshes.length,reference:'HORIBA LabRAM HR Evolution 2013 manual page 37. Small details inferred.'};
test('1133 × 473 × 817 mm benchtop envelope and zero support plane',()=>{
 for(const [i,x] of [.1*11.33,.473,.817].entries())assert.ok(Math.abs(dims[i]-x)<.006,JSON.stringify(dims));
 assert.ok(Math.abs(nominal.min.y)<2e-4);
 assert.deepEqual(node(m.frame.placementAnchor).getWorldPosition(new Vector3()).toArray(),[0,0,0]);
});
test('true separate specimen, stage, objective and cover motion',()=>{
 const stage=node(m.anchors.stage),sample=node(m.anchors.sample),turret=node(m.anchors.turret),door=node(m.anchors.cover);
 const old=sample.getWorldPosition(new Vector3()),front=node('door_grip').getWorldPosition(new Vector3());
 stage.position.x-=24e-6;stage.position.z+=12e-6;turret.rotation.y=Math.PI*2/3;door.rotation.x=m.coverRotationDeg*Math.PI/180;scene.updateMatrixWorld(true);
 const nw=sample.getWorldPosition(new Vector3()),raised=node('door_grip').getWorldPosition(new Vector3());
 assert.ok(Math.abs(nw.x-old.x+24e-6)<1e-9);assert.ok(Math.abs(nw.z-old.z-12e-6)<1e-9);assert.ok(raised.y-front.y>.15);
 stage.position.x+=24e-6;stage.position.z-=12e-6;turret.rotation.y=door.rotation.x=0;scene.updateMatrixWorld(true);
});
test('front ray targets resolve without overlap and rear anchors face back',()=>{
 const hits=m.controls.map(x=>{const o=new Mesh(new BoxGeometry(...x.sizeM),new MeshBasicMaterial());o.userData=x;o.position.copy(node(x.node).getWorldPosition(new Vector3()));if(x.offsetM)o.position.add(new Vector3(...x.offsetM));o.updateMatrixWorld(true);return o;});
 const ray=new Raycaster();
 for(const x of hits){ray.set(x.position.clone().add(new Vector3(0,0,.13)),new Vector3(0,0,-1));assert.equal(ray.intersectObjects(hits)[0]?.object,x,x.userData.action);}
 m.ports.forEach(p=>assert.ok(node(p).getWorldPosition(new Vector3()).z<-.39,p));
});
test('mobile / headset-ready static budgets only',()=>assert.ok(stats.bytes<2e6&&stats.triangles<50000&&stats.primitives<=40,JSON.stringify(stats)));
if(process.env.REFRESH_0510==='1')writeFileSync(new URL('asset-metrics.json',dir),JSON.stringify(stats,null,2)+'\n');
