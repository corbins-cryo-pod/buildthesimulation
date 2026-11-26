import assert from 'node:assert/strict';import {test} from 'node:test';import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Mesh,MeshBasicMaterial,BoxGeometry,Raycaster,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const dir=new URL('../public/equipment/09-02/',import.meta.url);
const f=readFileSync(new URL('b1500a.glb',dir)),m=JSON.parse(readFileSync(new URL('interaction.json',dir)));
const {scene}=await new GLTFLoader().parseAsync(f.buffer.slice(f.byteOffset,f.byteOffset+f.byteLength),'');scene.updateMatrixWorld(true);
function node(n){const a=[];scene.traverse(o=>{if(o.name===n)a.push(o)});assert.equal(a.length,1,n);return a[0];}
const hull=new Box3(),screen=new Box3().setFromObject(node('display_panel'),true).getSize(new Vector3()).toArray();
const bins=[];scene.traverse(o=>{
 if(o.isMesh){
  bins.push(o.geometry);
  // Scan outward-facing body vertices in the central region, excluding fixture and CV/IV cables.
  if(o.parent.name==='wiring_IV'||o.parent.name==='wiring_CV'||o.parent.name==='probe_travel')return;
  for(let i=0;i<o.geometry.attributes.position.count;i++){
   const p=new Vector3().fromBufferAttribute(o.geometry.attributes.position,i).applyMatrix4(o.matrixWorld);
   if(Math.abs(p.x)>.212||Math.abs(p.z)>.289) continue;
   hull.expandByPoint(p);
  }
 }
});
const dims=hull.getSize(new Vector3()).toArray();
const stats={glbBytes:f.length,meshPrimitives:bins.length,triangles:bins.reduce((x,g)=>x+(g.index?.count??g.attributes.position.count)/3,0),chassisMeters:dims,screenMeters:screen,nominalNativeScreenInches:15,probeTravelMeters:m.fixture.motion.maxM,benchContactY:hull.min.y};
test('meter-scale mainframe envelope and inferred 4:3 active screen',()=>{
 for(const [i,v] of [.42,.33,.575].entries())assert.ok(Math.abs(dims[i]-v)<.005,JSON.stringify(dims));
 assert.ok(Math.abs(hull.min.y)<.0002);
 assert.deepEqual(node(m.frame.placementAnchor).getWorldPosition(new Vector3()).toArray(),[0,0,0]);
 assert.ok(Math.abs(Math.hypot(screen[0],screen[1])-.381)<2e-6,JSON.stringify(screen));
});
test('probe ties to named HI and LO contacts and raises on a 14 mm vertical stroke',()=>{
 const head=node(m.fixture.motion.node);
 for(const [i,p] of Object.values(m.fixture.contacts).entries()){
  const anchor=node(p).getWorldPosition(new Vector3()),tip=new Box3().setFromObject(node('probe_tip_'+i),true);
  assert.ok(Math.abs(tip.min.y-anchor.y)<.0002);
  assert.ok(Math.abs(tip.getCenter(new Vector3()).x-anchor.x)<.0002);
 }
 const tip=node('probe_tip_0'),seated=new Box3().setFromObject(tip,true).min.y;head.position.y+=m.fixture.motion.maxM;scene.updateMatrixWorld(true);
 assert.ok(Math.abs(new Box3().setFromObject(tip,true).min.y-seated-.014)<1e-6);
 head.position.y-=m.fixture.motion.maxM;scene.updateMatrixWorld(true);
});
test('visible display overlay and distinct front/back control rays',()=>{
 const targets=m.controls.map(x=>{const p=new Mesh(new BoxGeometry(...x.targetSizeM),new MeshBasicMaterial());p.userData.row=x;p.position.copy(node(x.node).getWorldPosition(new Vector3()));if(x.id==='seat')p.position.y-=.02;p.updateMatrixWorld(true);return p});
 const ray=new Raycaster();
 for(const p of targets){
  const face=p.userData.row.id.startsWith('wire-')?-1:1;
  ray.set(p.position.clone().add(new Vector3(0,0,face*.14)),new Vector3(0,0,-face));
  assert.equal(ray.intersectObjects(targets)[0]?.object,p,p.userData.row.id);
 }
 const s=node('display_anchor').getWorldPosition(new Vector3());
 ray.set(s.clone().add(new Vector3(0,0,.12)),new Vector3(0,0,-1));assert.equal(ray.intersectObjects(scene.children,true)[0]?.object.name,'display_panel');
 for(const p of m.ports)assert.ok(node(p.node).getWorldPosition(new Vector3()).z<-.28,p.id);
});
test('portable GLB static budgets; no measured headset claim',()=>{
 assert.ok(stats.glbBytes<=2e6,JSON.stringify(stats));assert.ok(stats.triangles<=50000,JSON.stringify(stats));assert.ok(stats.meshPrimitives<=40,JSON.stringify(stats));
});
if(process.env.REFRESH_0902==='1')writeFileSync(new URL('asset-metrics.json',dir),JSON.stringify({warning:'Geometric checks only. Probe travel and detail placement inferred; headset not tested.',...stats},null,2)+'\n');
