import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Vector3} from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const d=new URL('../public/equipment/08-05/',import.meta.url),read=x=>readFileSync(new URL(x,d)),f=read('fl300.glb'),m=JSON.parse(read('interaction.json'));
const {scene}=await new GLTFLoader().parseAsync(f.buffer.slice(f.byteOffset,f.byteOffset+f.length),'');scene.updateMatrixWorld(true);
function n(k){const a=[];scene.traverse(o=>{if(o.name===k)a.push(o);});assert.equal(a.length,1,k);return a[0];}
const box=new Box3().setFromObject(n('main_cell'),true),enclosureM=box.getSize(new Vector3()).toArray(),witness=new Box3().setFromObject(n('sample_witness'),true).getSize(new Vector3()).toArray(),a=[];
scene.traverse(o=>{if(o.isMesh)a.push(o.geometry)});
const e={bytes:f.length,triangles:a.reduce((s,g)=>s+(g.index?.count??g.attributes.position.count)/3,0),primitives:a.length,modeledEnclosureM:enclosureM,witnessM:witness,status:'Cabinet dimensions are photo-informed estimates. Witness dimensions are implementation design, not specification.'};
test('metric source envelope, synthetic die size, and draw budget',()=>{
 for(const [i,x] of [.96,1.71,.828].entries())assert.ok(Math.abs(enclosureM[i]-x)<.035,JSON.stringify(e));
 assert.ok(Math.abs(witness[0]-.004)<1e-8&&Math.abs(witness[2]-.004)<1e-8);
 assert.ok(e.bytes<2e6&&e.triangles<50000&&e.primitives<=40,JSON.stringify(e));
});
test('stable scene axes move in metres and the guard swings outward',()=>{
 const moving=n(m.parts.receiver),axis=n(m.parts.receiverAxis),b=axis.getWorldPosition(new Vector3());
 moving.position.x+=5e-6;moving.position.y-=2e-6;
 const cover=n(m.parts.guard),handle=n('guard_handle'),c=handle.getWorldPosition(new Vector3());cover.rotation.y=m.motion.guardOpenDeg*Math.PI/180;scene.updateMatrixWorld(true);
 const p=axis.getWorldPosition(new Vector3());assert.ok(Math.abs(p.x-b.x-5e-6)<1e-9&&Math.abs(p.y-b.y+2e-6)<1e-9);
 assert.ok(handle.getWorldPosition(new Vector3()).z-c.z>.50);
 m.actions.forEach(x=>n(x.node));m.ports.forEach(x=>assert.ok(n(x).getWorldPosition(new Vector3()).z<-.38));n(m.frame.placementAnchor);
});
if(process.env.REFRESH_0805==='1')writeFileSync(new URL('asset-metrics.json',d),JSON.stringify(e,null,2)+'\n');
