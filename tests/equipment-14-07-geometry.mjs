import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Vector3} from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const dir=new URL('../public/equipment/14-07/',import.meta.url),read=n=>readFileSync(new URL(n,dir)),f=read('q50.glb'),m=JSON.parse(read('interaction.json'));
const {scene}=await new GLTFLoader().parseAsync(f.buffer.slice(f.byteOffset,f.byteOffset+f.length),'');scene.updateMatrixWorld(true);
const n=name=>{const a=[];scene.traverse(x=>{if(x.name===name)a.push(x)});assert.equal(a.length,1,name);return a[0];};
const box=new Box3().setFromObject(scene,true),dims=box.getSize(new Vector3()).toArray(),mesh=[];scene.traverse(x=>{if(x.isMesh)mesh.push(x.geometry);});
const e={bytes:f.length,enclosureM:dims,triangles:mesh.reduce((a,g)=>a+(g.index?.count??g.attributes.position.count)/3,0),primitives:mesh.length,source:'TA Instruments TN051 dimensional envelope; pan and stroke photo-informed estimates.'};
test('closed metric cabinet and stable pan / furnace',()=>{
 for(const [i,x] of [.470,.521,.559].entries())assert.ok(Math.abs(dims[i]-x)<.009,JSON.stringify(dims));
 assert.ok(Math.abs(box.min.y)<1e-6);
 const pan=n(m.anchors.pan),a=pan.getWorldPosition(new Vector3()),fu=n(m.anchors.furnace);const y=fu.getWorldPosition(new Vector3()).y;
 fu.position.y-=m.visualLoweringM;scene.updateMatrixWorld(true);
 assert.ok(Math.abs(fu.getWorldPosition(new Vector3()).y-y+.091)<1e-8);assert.ok(pan.getWorldPosition(new Vector3()).distanceTo(a)<1e-9);
 assert.equal(n(m.anchors.specimen).parent,pan);
});
test('portable model actions and static geometry budget',()=>{
 n(m.frame.placementAnchor);m.actions.forEach(x=>n(x.node));m.ports.forEach(x=>assert.ok(n(x).getWorldPosition(new Vector3()).z<-.27));
 assert.ok(e.bytes<2e6&&e.triangles<50000&&e.primitives<=40,JSON.stringify(e));
});
if(process.env.REFRESH_1407==='1')writeFileSync(new URL('asset-metrics.json',dir),JSON.stringify(e,null,2)+'\n');
