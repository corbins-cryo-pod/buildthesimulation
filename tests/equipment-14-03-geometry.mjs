import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Vector3} from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const dir=new URL('../public/equipment/14-03/',import.meta.url),get=x=>readFileSync(new URL(x,dir)),f=get('dhr2.glb'),m=JSON.parse(get('interaction.json'));
const {scene}=await new GLTFLoader().parseAsync(f.buffer.slice(f.byteOffset,f.byteOffset+f.length),'');scene.updateMatrixWorld(true);
const n=x=>{const z=[];scene.traverse(o=>{if(o.name===x)z.push(o)});assert.equal(z.length,1,x);return z[0];};
const box=x=>new Box3().setFromObject(n(x),true);
const dims=box('main_body').getSize(new Vector3()).toArray(),plates=box('upper_40mm').getSize(new Vector3()).toArray(),msh=[];
scene.traverse(o=>{if(o.isMesh)msh.push(o.geometry)});
const e={bytes:f.length,enclosureM:dims,upperPlateDiameterMm:plates[0]*1000,triangles:msh.reduce((a,g)=>a+(g.index?.count??g.attributes.position.count)/3,0),primitives:msh.length};
test('metric DHR-2 cabinet and exact 40 mm plate',()=>{
 for(const [i,x] of [.32,.76,.42].entries())assert.ok(Math.abs(dims[i]-x)<.009,JSON.stringify(dims));
 assert.ok(Math.abs(plates[0]-.04)<1e-7&&Math.abs(plates[2]-.04)<1e-7);assert.ok(Math.abs(box('main_body').min.y)<1e-6);
 const p=n('plate_station_anchor').getWorldPosition(new Vector3());
 assert.ok(Math.abs(box('upper_40mm').min.y-p.y-.001)<1e-7);
});
test('named head lift, rear anchors, spinner and portable budget',()=>{
 const head=n(m.fixture.head);head.position.y+=m.fixture.raisedLiftM;scene.updateMatrixWorld(true);
 assert.ok(Math.abs(box('upper_40mm').min.y-n(m.fixture.lowerContact).getWorldPosition(new Vector3()).y-.026)<1e-6);
 m.actions.forEach(x=>n(x.node));m.ports.forEach(x=>assert.ok(n(x).getWorldPosition(new Vector3()).z<0));
 assert.ok(e.bytes<2e6&&e.triangles<50000&&e.primitives<=40,JSON.stringify(e));
});
if(process.env.REFRESH_1403==='1')writeFileSync(new URL('asset-metrics.json',dir),JSON.stringify(e,null,2)+'\n');
