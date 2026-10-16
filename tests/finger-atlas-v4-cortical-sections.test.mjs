import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import * as T from 'three';
import { createAtlasModel } from '../src/lib/finger-atlas-v4/model.mjs';
import { CORTEX_PROFILES, createCorticalSample, sectionPoint, projectionPoint, placeCorticalRouteCells, layerAtDepth } from '../src/lib/finger-atlas-v4/cortical-model.mjs';
import { createCorticalScene, attachH01References } from '../src/lib/finger-atlas-v4/cortical-sections.mjs';
import { createTubeBatch } from '../src/lib/finger-atlas-v4/tubes.mjs';
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const raw=fs.readFileSync('public/assets/finger-pathway-atlas/v4/h01/reference-neurites.json');
const h01=JSON.parse(raw);

test('six layers have finite thickness, different M1/S1 profiles, and exact shared boundaries',()=>{
  for(const p of Object.values(CORTEX_PROFILES)){
    assert.equal(p.boundaries.length,7);assert.equal(p.boundaries[0],0);assert.equal(p.boundaries.at(-1),1);
    for(let i=1;i<7;i++){assert.ok(p.boundaries[i]>p.boundaries[i-1]);assert.equal(layerAtDepth(p,(p.boundaries[i-1]+p.boundaries[i])/2*p.thickness),i);}
    for(const angle of [-.8,0,.8]){const a=sectionPoint(p,angle,0),b=sectionPoint(p,angle,p.thickness);assert.ok(Math.abs(dist(a,b)-p.thickness)<1e-10);}
  }
  assert.ok(CORTEX_PROFILES.m1.thickness>CORTEX_PROFILES.s1.thickness);
  assert.ok(CORTEX_PROFILES.m1.boundaries[4]-CORTEX_PROFILES.m1.boundaries[3]<CORTEX_PROFILES.s1.boundaries[4]-CORTEX_PROFILES.s1.boundaries[3]);
});

test('cortical somata do not overlap and layer VI is connected to separated white-matter cylinders',()=>{
  for(const id of ['m1','s1']){
    const sample=createCorticalSample(id),{profile:p,cells}=sample;assert.deepEqual(sample,createCorticalSample(id));
    for(let i=0;i<cells.length;i++){
      const c=cells[i];assert.equal(layerAtDepth(p,c.depth),c.layer);
      for(let j=0;j<i;j++)assert.ok(dist(c.soma,cells[j].soma)>c.radius+cells[j].radius);
      const axon=c.paths.find(path=>path.role==='axon');assert.deepEqual(axon.points[0],c.soma);
      if(c.continuation){assert.ok(c.layer===6||id==='m1'&&c.layer===5);assert.deepEqual(axon.points.at(-1),c.continuation.point);assert.equal(c.continuation.kind,'continuation-port');}
    }
    const deep=cells.filter(c=>c.layer===6&&c.continuation);assert.ok(deep.length>30);
    for(const below of [0,.2,.6,1.2,2.4])for(let i=0;i<deep.length;i++)for(let j=0;j<i;j++){
      assert.ok(dist(projectionPoint(p,deep[i].theta,below,deep[i].soma[2]),projectionPoint(p,deep[j].theta,below,deep[j].soma[2]))>deep[i].axonRadiusMm+deep[j].axonRadiusMm,'No converging common white-matter funnel');
    }
  }
});

test('moving route cells into cortical layers preserves every graph endpoint and original identity',()=>{
  const original=createAtlasModel(),updated=placeCorticalRouteCells(original),map=new Map(updated.cells.map(c=>[c.id,c]));
  assert.equal(updated.cells.length,306);assert.equal(updated.routes.length,78);assert.deepEqual(updated.cells.map(c=>c.id),original.cells.map(c=>c.id));
  for(const route of updated.routes)for(const edge of route.connections){const target=map.get(edge.to),source=map.get(edge.from);assert.deepEqual(edge.at,target.soma);assert.ok(source.branches.some(b=>dist(b.points.at(-1),target.soma)<1e-9));}
  for(const c of updated.cells.filter(c=>c.region==='cortex'))assert.equal(c.corticalLayer,c.type==='m1'?5:4);
  assert.notDeepEqual(updated.cells.find(c=>c.type==='m1').soma,original.cells.find(c=>c.type==='m1').soma);
});

test('H01 pack includes two physically scaled references from all six source layers',()=>{
  assert.deepEqual(zlib.gunzipSync(fs.readFileSync('public/assets/finger-pathway-atlas/v4/h01/reference-neurites.json.gz')),raw);
  assert.equal(h01.templates.length,12);assert.deepEqual(h01.swcPositionScaleNm,[32,32,33]);assert.equal(h01.swcRadiusScaleNm,1);assert.equal(h01.units,'mm');
  for(let layer=1;layer<=6;layer++)assert.equal(h01.templates.filter(t=>t.layer===layer).length,2);
  for(const t of h01.templates){assert.match(t.sourceRegion,/temporal/);assert.match(t.sourceSha256,/^[a-f0-9]{64}$/);assert.ok(t.axonPort);assert.ok(t.somaAxesMm.every(x=>x>.002&&x<.025),'Reject spurious tiny/giant somata from isolated classifier labels');assert.ok(t.paths.some(p=>p.points.some(q=>dist(q,t.axonPort)<1e-7)),'Source axon connection point must survive simplification');for(const p of t.paths){assert.equal(p.points.length,p.radii.length);assert.ok(p.radii.every(r=>r>0&&r<.04));assert.ok(p.points.every(q=>q.every(Number.isFinite)));}}
});

test('both cortical scenes use real cylinder meshes and H01 replaces duplicate procedural arbors',()=>{
  for(const id of ['m1','s1']){
    const v=createCorticalScene(id);attachH01References(v,h01);
    assert.equal(v.h01Metadata.length,12);assert.equal(v.layers.children.filter(c=>c.name.startsWith('Layer ')).length,6);
    const references=v.sample.cells.filter(c=>c.h01Reference);assert.equal(references.length,12);
    for(const c of references){assert.ok(!v.dendrites.userData.owners.includes(c.id));assert.ok(!v.axons.userData.owners.includes(c.id));assert.ok(v.h01Group.children[0].userData.owners.includes(c.id));if(c.layer===6)assert.ok(c.continuation.sourcePort);}
    v.scene.traverse(o=>{assert.ok(!o.isLine&&!o.isLineSegments);if(o.geometry)assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));});
    assert.ok(v.axons.isInstancedMesh);assert.ok(v.axons.geometry.getAttribute('tubeRadius'));
  }
});

test('cylinder axes, endpoints and physical radii stay correct with display padding',()=>{
  const segments=[{a:[1,2,3],b:[5,7,11],radius:.0007,cellId:'example'}],mesh=createTubeBatch(segments),m=new T.Matrix4();mesh.getMatrixAt(0,m);
  const a=new T.Vector3(0,-.5,0).applyMatrix4(m),b=new T.Vector3(0,.5,0).applyMatrix4(m);
  assert.ok(dist(a.toArray(),segments[0].a)<1e-6);assert.ok(dist(b.toArray(),segments[0].b)<1e-6);
  mesh.userData.setMinimumRadius(.02);assert.deepEqual(mesh.userData.radiiMm,[.0007]);
  const shader={uniforms:{},vertexShader:'#include <begin_vertex>'};mesh.material.onBeforeCompile(shader);assert.equal(shader.uniforms.tubeMinimumRadius.value,.02);assert.match(shader.vertexShader,/max\(tubeRadius, tubeMinimumRadius\)/);
});


test('cylinder picking respects physical/display radius and translated placement',()=>{
  const mesh=createTubeBatch([{a:[0,0,0],b:[0,1,0],radius:.01,cellId:'thin'}]);
  const ray=new T.Raycaster(new T.Vector3(.5,.5,1),new T.Vector3(0,0,-1));
  assert.equal(ray.intersectObject(mesh).length,0,'Must not pick the unscaled unit cylinder');
  mesh.userData.setMinimumRadius(.6);assert.equal(ray.intersectObject(mesh).length,1);
  mesh.userData.setMinimumRadius(0);mesh.position.x=2;mesh.updateMatrixWorld(true);ray.ray.origin.set(2,.5,1);
  const hit=ray.intersectObject(mesh)[0];assert.equal(hit.instanceId,0);assert.ok(Math.abs(hit.distance-.99)<1e-8);
});
