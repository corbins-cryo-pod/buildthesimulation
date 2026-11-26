import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Vector3,Mesh,BoxGeometry,MeshBasicMaterial,Raycaster} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {initial,dispatch} from '../public/equipment/09-06/solver.mjs';
const dir=new URL('../public/equipment/09-06/',import.meta.url);
const raw=readFileSync(new URL('33622a.glb',dir)),b=JSON.parse(readFileSync(new URL('interaction.json',dir)));
const {scene}=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
scene.updateMatrixWorld(true);
const box=new Box3().setFromObject(scene,true),size=box.getSize(new Vector3()).toArray();
const find=name=>{const matches=[];scene.traverse(o=>{if(o.name===name)matches.push(o);});assert.equal(matches.length,1,name);return matches[0];};
const perNode=Object.fromEntries(b.controls.map(x=>[x.id,find(x.node)]));
const proxies=b.controls.map(x=>{const mesh=new Mesh(new BoxGeometry(...x.targetSizeM),new MeshBasicMaterial());mesh.position.copy(perNode[x.id].getWorldPosition(new Vector3()));mesh.updateMatrixWorld(true);return mesh;});
const g=[];
scene.traverse(o=>{if(o.isMesh)g.push(o.geometry)});
const noTextures=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12))).images?.length??0;
const metrics={glbBytes:raw.length,triangles:g.reduce((n,geom)=>n+(geom.index?.count??geom.attributes.position.count)/3,0),meshPrimitives:g.length,texturesInGlb:noTextures,meters:size,minimumVerticalM:box.min.y};
test('manufacturer bumper envelope in meters and bench placement',()=>{
 size.forEach((x,i)=>assert.ok(Math.abs(x-b.frame.enclosureXYZ[i])<=b.frame.modelToleranceM,`axis ${i} actual ${x}`));
 assert.ok(Math.abs(box.min.y)<.0003);
 assert.deepEqual(find(b.frame.placementAnchor).getWorldPosition(new Vector3()).toArray(),[0,0,0]);
});
test('control ray for each target wins uniquely; port orientation declared',()=>{
 const ray=new Raycaster();const view=new Vector3(0,0,1);
 proxies.forEach(p=>{ray.set(p.position.clone().addScaledVector(view,.25),view.clone().negate());assert.equal(ray.intersectObjects(proxies)[0].object,p);});
 b.ports.forEach(p=>{assert.ok(Math.abs(Math.hypot(...p.normal)-1)<1e-8);assert.ok(find(p.node).position.z*p.normal[2]>0);});
});
test('control IDs dispatch deterministic reducer results without DOM',()=>{
 const s=dispatch(initial(),'load-example').state;
 for(const x of b.controls) assert.equal(dispatch(s,x.action,x.value).ok,true,x.id);
 const cap=b.controls.find(x=>x.id==='capture');
 assert.equal(dispatch(initial(),cap.action,cap.value).code,'output-off');
 assert.deepEqual(dispatch(s,cap.action,cap.value).result,dispatch(s,'capture').result);
});
test('mobile asset budgets as static proxy only',()=>{
 assert.ok(metrics.glbBytes<2_000_000,JSON.stringify(metrics));assert.ok(metrics.triangles<50_000,JSON.stringify(metrics));assert.ok(metrics.meshPrimitives<40,JSON.stringify(metrics));
});
if(process.env.REFRESH_0906==='1')writeFileSync(new URL('asset-metrics.json',dir),JSON.stringify({warning:'Static GLB count; not live draw calls or headset FPS.',...metrics},null,2)+'\n');
