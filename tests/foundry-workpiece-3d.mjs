import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../public/vendor/three/three.module.js';
import {makeSection,makeWorkpiece} from '../public/simulations/foundry/cleanroom-workpiece-3d.js';
import {stageForLab} from '../public/simulations/foundry/cleanroom-data.js';

const eps = 2e-8;
const near=(a,b,reason)=>assert.ok(Math.abs(a-b)<eps,reason??`${a} ≠ ${b}`);
function using(make, fn) {
  const specimen=make(THREE);
  try { return fn(specimen); } finally { specimen.dispose(); }
}
function scene(specimen) {
  specimen.group.updateMatrixWorld(true);
  const visible=new Map();
  specimen.group.traverseVisible(o=>{ if(o.geometry&&o.name)visible.set(o.name,o); });
  return visible;
}
function bounds(o) {
  if(o.isInstancedMesh&&!o.boundingBox)o.computeBoundingBox();
  if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
  return (o.isInstancedMesh?o.boundingBox:o.geometry.boundingBox).clone().applyMatrix4(o.matrixWorld);
}
function snapshot(specimen) {
  return Array.from(scene(specimen),([name,o])=>[name,o.uuid,o.geometry.uuid,[...o.matrixWorld.elements]]);
}
function stage(slug,i,progress,explode=0) {
  const s=stageForLab(slug,i);
  return {shape:s.workpieceShape,sizeMm:s.sizeMm,outgoingShape:s.outgoingShape,
    before:s.before,after:s.after,effect:s.effect,progress,explode,
    authored:{...s.surfaceFeatures,face:s.processFace}};
}
const soi=Object.freeze({shape:'wafer',sizeMm:150,effect:'etch',before:'SOI wafer with unpatterned SiNₓ',after:'Same wafer with known openings',
  progress:.97,authored:{stack:'soi',substrate:'silicon',beforeFeature:'insulating-film',beforeMaterial:'nitride',afterFeature:'openings',afterMaterial:'nitride'}});
const named=Object.freeze({body:'Solid silicon body',box:'Buried oxide witness within the silicon',device:'Silicon device layer over buried oxide',film:'Upper surface with actual opening voids'});

test('separates only the present material layers; explode affects Y only and returns to the exact default pose',()=>using(makeSection,s=>{
  const id=s.group.uuid, base=s.update(soi);
  assert.deepEqual(base.layers,['Silicon handle','Buried oxide (BOX)','Silicon device layer','Nitride film with openings']);
  assert.equal(base.layerCount,4);assert.equal(base.exploded,0);assert.equal(base.canExplode,true);
  const baseline=snapshot(s), original=scene(s);
  const dims=Object.values(named).map(n=>bounds(original.get(n)));
  s.update({...soi,explode:0});assert.deepEqual(snapshot(s),baseline);
  const layerStorage=base.layers;
  const half=s.update({...soi,explode:.5});assert.equal(half.exploded,.5);assert.strictEqual(half.layers,layerStorage);
  const halfHeights=Object.values(named).map(n=>bounds(scene(s).get(n)).min.y);
  const expanded=s.update({...soi,explode:1});assert.equal(expanded.exploded,1);
  assert.equal(expanded.activeFeature,'openings');assert.equal(s.group.uuid,id);
  const changed=scene(s);
  for(const [i,n] of Object.values(named).entries()){
    const after=bounds(changed.get(n));
    for(const a of ['x','z'])for(const edge of ['min','max'])near(after[edge][a],dims[i][edge][a]);
    near((after.min.y-dims[i].min.y)/2,halfHeights[i]-dims[i].min.y);
    near(after.max.y-after.min.y,dims[i].max.y-dims[i].min.y);
    if(i)assert.ok(after.min.y>dims[i].min.y);
    else near(after.min.y,0,'The silicon body stays seated');
  }
  const openFilm=changed.get(named.film);
  const ray=new THREE.Raycaster(new THREE.Vector3(0,.14,-.14*.172),new THREE.Vector3(0,-1,0));
  assert.equal(ray.intersectObject(openFilm).length,0,'Aperture remains a true void');
  ray.ray.origin.set(.07,.14,0);assert.ok(ray.intersectObject(openFilm).length>0);
  s.update({...soi,explode:-3});assert.deepEqual(snapshot(s),baseline);
  assert.equal(s.update({...soi,explode:99}).exploded,1);
  assert.equal(s.update({...soi,explode:Infinity}).exploded,0);
  const inComing=s.update({...soi,progress:.21,explode:1});
  assert.equal(inComing.activeFeature,'film');assert.equal(inComing.layers.at(-1),'Nitride film');
  assert.ok(!scene(s).has(named.film));
}));

test('a cleared BOX removes part of the existing BOX slab; trench infill is not a new separate layer',()=>using(makeSection,s=>{
  const before=s.update(stage('masmanidis-64d-foundry',10,.2,1));
  assert.equal(before.layerCount,3);assert.equal(before.activeFeature,'trenches');
  const after=s.update(stage('masmanidis-64d-foundry',10,1,1));
  assert.equal(after.layerCount,3);assert.equal(after.activeFeature,'box-clear');
  assert.match(after.layers[1],/opened locally/);
  const visible=scene(s),box=visible.get(named.box);
  const ray=new THREE.Raycaster(new THREE.Vector3(0,.14,-.086*.172),new THREE.Vector3(0,-1,0));
  assert.equal(ray.intersectObject(box).length,0,'Openings must be in the real BOX witness geometry');
  assert.ok(!visible.has(named.film),'There is no duplicate surface oxide layer');
  assert.ok(visible.has(named.body));
  const glass=s.update(stage('utah-array-fabrication',1,1,1));
  assert.equal(glass.activeFeature,'filled-trenches');assert.equal(glass.layerCount,1);assert.equal(glass.exploded,0);
  let infillVisible=false;
  s.group.traverseVisible(o=>{ if(o.name==='Material filling only the back trench voids')infillVisible=true; });
  assert.equal(infillVisible,true);
}));

test('blank, unsupported and nonphysical records do not acquire an exploded stack',()=>using(makeSection,s=>{
  for(const args of [{shape:'wafer',before:'Fixture box'},{shape:'panel',authored:{substrate:'glass',beforeFeature:'blank'}},
     {shape:'wafer',before:'Undefined input specimen',after:'Undefined result',effect:'deposit',progress:.97}]) {
    s.update(args);const initial=snapshot(s);
    const meta=s.update({...args,explode:1});assert.equal(meta.exploded,0);assert.equal(meta.layerCount,1);
    assert.equal(meta.canExplode,false);assert.deepEqual(snapshot(s),initial);
  }
  const digital=s.update(stage('neuropixels-family',2,1,1));
  assert.equal(digital.layerCount,0);assert.equal(digital.exploded,0);assert.equal(s.group.visible,false);
}));

test('physical wafer geometry, notch and world attachment unaffected by inspection parameter',()=>using(makeWorkpiece,w=>{
  const a=w.update(soi);assert.equal(a.diameterMm,150);
  const body=scene(w).get(named.body),b=bounds(body),original=snapshot(w);
  assert.ok(body.geometry.attributes.position.array.includes(Math.fround(.4915)),'Native notch remains geometry');
  near(b.min.x,-.075);near(b.max.x,.075);near(b.min.y,0);
  const meta=w.update({...soi,explode:1});assert.equal(meta.exploded,0);assert.deepEqual(snapshot(w),original);
  const proxy=w.update({shape:'panel'});assert.equal(proxy.widthMm,30);assert.equal(proxy.authoredWidthMm,undefined);
  assert.match(proxy.scaleNote,/display proxies/);
  const documented=w.update({shape:'panel',sizeMm:177.8});assert.equal(documented.authoredWidthMm,177.8);assert.equal(documented.widthMm,177.8);
}));

test('64D stages retain GDS die on PCB, form actual-center wire loops, then encapsulate and plate only the sites',()=>using(makeSection,s=>{
  const release=s.update(stage('masmanidis-64d-foundry',11,1));
  assert.equal(release.shape,'die');assert.equal(release.nativeApertureCount,64);
  assert.equal(release.layers.includes('Buried oxide (BOX)'),false,'Released die must not retain an SOI wafer handle stack');
  const attach=s.update(stage('masmanidis-64d-foundry',12,1));
  assert.equal(attach.assemblyType,'pcb');assert.equal(attach.boardOutlineAuthored,true);
  assert.equal(attach.nativeBondPadCount,64);assert.equal(attach.bondWireCount,0);
  assert.deepEqual(attach.layers,['PCB carrier','Mounted silicon die']);
  const arcName='Wire loops · actual die pads, assumed PCB landings';
  const epiName='Local wire-bond encapsulant · illustrative relief';
  const padName='Source die bond-pad positions · marker widths illustrative';
  const mountName='Mounted native outline';
  assert.ok(!scene(s).has(arcName));
  const mounted=bounds(scene(s).get(mountName)),board=bounds(scene(s).get('Circuit carrier'));
  const separated=s.update(stage('masmanidis-64d-foundry',12,1,1));
  assert.equal(separated.exploded,1);assert.equal(separated.canExplode,true);
  near(bounds(scene(s).get('Circuit carrier')).max.y,board.max.y);
  assert.ok(bounds(scene(s).get(mountName)).min.y>mounted.min.y);
  assert.equal(s.update(stage('masmanidis-64d-foundry',13,.33,1)).bondWireCount,0);
  const blocked=stage('masmanidis-64d-foundry',13,1);
  blocked.authored.verified=false;
  assert.equal(s.update(blocked).bondWireCount,0,'A blocked fixture cannot advance the bond milestone');
  const bonded=s.update(stage('masmanidis-64d-foundry',13,1,1));
  assert.equal(bonded.assemblyState.bonded,true);assert.equal(bonded.bondWireCount,64);
  assert.equal(bonded.exploded,0);assert.equal(bonded.canExplode,false);
  assert.match(bonded.explodeBlockedReason,/stay connected/);
  assert.match(bonded.bondLandingEvidence,/illustrative/);
  const m=scene(s),arcs=m.get(arcName),pads=m.get(padName);
  assert.equal(arcs.geometry.drawRange.count,64*10*2);
  assert.ok(!m.has(epiName));
  const pad0=new THREE.Matrix4();pads.getMatrixAt(0,pad0);
  const padCenter=new THREE.Vector3(0,.5,0).applyMatrix4(pad0).applyMatrix4(pads.matrixWorld);
  const arc0=new THREE.Vector3().fromBufferAttribute(arcs.geometry.getAttribute('position'),0).applyMatrix4(arcs.matrixWorld);
  near(padCenter.distanceTo(arc0),0,'First wire starts at the exact source pad marker');
  const land0=new THREE.Vector3().fromBufferAttribute(arcs.geometry.getAttribute('position'),19).applyMatrix4(arcs.matrixWorld);
  near(land0.y,board.max.y,'Wire ends on the board, not suspended over it');
  const beforePlating=scene(s).get('Mounted native site centers').material.color.getHex();
  assert.equal(s.update(stage('masmanidis-64d-foundry',14,1)).assemblyState.encapsulated,true);
  assert.ok(scene(s).has(epiName));
  assert.equal(s.update(stage('masmanidis-64d-foundry',15,.18)).assemblyState.plated,false);
  assert.equal(s.update(stage('masmanidis-64d-foundry',15,1)).assemblyState.plated,true);
  const final=scene(s);
  assert.notEqual(final.get('Mounted native site centers').material.color.getHex(),beforePlating);
  const pX=bounds(final.get(epiName)),sites=bounds(final.get('Mounted native site centers'));
  assert.ok(pX.max.x<sites.min.x,'The encapsulant does not cover the remote recording surface');
  assert.equal(s.update(stage('masmanidis-64d-foundry',17,1)).nativeApertureCount,64);
  assert.ok(scene(s).has(arcName));assert.ok(scene(s).has(epiName));
  assert.equal(s.update(stage('masmanidis-64d-foundry',12,.1)).shape,'die');
  assert.ok(!scene(s).has(arcName),'Rewinding returns to the incoming die, without later wires');
}));

test('NP1 finished probe remains mounted without requiring the prose to say PCB or flex',()=>{
  for(const fn of [makeWorkpiece,makeSection])using(fn,w=>{
    for(const i of [17,18,19]){
      const record=w.update(stage('neuropixels-foundry',i,1));
      assert.equal(record.assemblyType,'flex-headstage');assert.equal(record.nativeSiteCount,960);
      assert.equal(record.nativeApertureCount,960);assert.equal(record.mountedDieThicknessUm,24);
      assert.equal(record.boardOutlineAuthored,false);
      assert.ok(scene(w).has('Mounted native outline'));
    }
    const a=w.update(stage('neuropixels-foundry',17,.18));
    assert.equal(a.shape,'wafer');assert.notEqual(a.substrateThicknessMm,.024);
    assert.ok(!scene(w).has('Mounted native outline'));
  });
});
