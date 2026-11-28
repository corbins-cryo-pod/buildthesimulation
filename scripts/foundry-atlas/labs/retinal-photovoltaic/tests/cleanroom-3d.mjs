/** Run: node --test scripts/foundry-atlas/labs/retinal-photovoltaic/tests/cleanroom-3d.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import M from '../src/engine.cjs';
import E from '../src/evidence.cjs';
import {makeRetinaWorkpiece} from '../../../../../public/simulations/foundry/cleanroom-retinal-3d.js';
const slug='retinal-photovoltaic-foundry';
function fixture(size=140,{section=false,fault='nominal',target=1}={}){
  const model=makeRetinaWorkpiece(T,{section}),dataset={...M.cfg,size,fault,target,coupon:M.coupon(size)};
  const update=(id,p=1,extra={})=>model.update({profile:slug,phaseId:'pv-'+id,branch:'wang',dataset,progress:p,...extra});
  const solid=(k)=>model.group.children[0].children.find(o=>o.userData.pvPart===k);
  const ray=(k,x,z)=>{model.group.updateMatrixWorld(true);
    const g=solid(k);if(!g?.visible)return false;
    const scale=(section?20:1)*1e-6;
    const r=new T.Raycaster(new T.Vector3(x*scale,300*scale,z*scale),new T.Vector3(0,-1,0));
    return r.intersectObject(g,false).length>0;
  };return {model,dataset,update,solid,ray};
}
test('uses selected native corpus exclusively; unknown and closed branches are empty',()=>{
  const f=fixture();
  assert.ok(f.update('soi'));
  for(const e of [{profile:'elsewhere'},{branch:'prima'},{branch:undefined},{dataset:{...f.dataset,route:'other'}},{dataset:{...f.dataset,mode:'bench'}},{phaseId:'pv-unpublished'},{dataset:{}},{dataset:{...f.dataset,size:91}},{dataset:{...f.dataset,target:10}}]){
    assert.equal(f.update('soi',1,e),null);assert.equal(f.model.group.visible,false);
  }
  f.model.dispose();
});
test('all 13 progress endpoints chain without jumps and without optical/stimulation output',()=>{
  for(const size of [70,140,280]){const f=fixture(size);let prev=null;
    for(const stage of E.stages){
      const a=f.update(stage.id,0),b=f.update(stage.id,.57);
      assert.equal(a.activeFeature,b.activeFeature);assert.equal(a.processFraction,0);
      if(prev)for(const k of ['activeFeature','etchedDepthUm','overburdenPresent','carrierAttached','releaseResult','externalTrench','internalFillPresent'])assert.equal(a[k],prev[k],stage.id+': '+k);
      assert.ok(f.update(stage.id,.69).processFraction>0);prev=f.update(stage.id,1);
      assert.equal(prev.processFraction,1);assert.equal(prev.nativeSiteCount,7);assert.equal(prev.substrateThicknessMm,.03);assert.equal(prev.centerDiameterUm,E.sizes[size].activeUm);
      assert.ok(!('optical' in prev)&&!('stimulation' in prev));
    }
    assert.equal(prev.releaseResult,'clear'); assert.equal(prev.shape,'die');f.model.dispose();
  }
});
test('vertical rays resolve etched void, filled interior, selective exterior, vias and released support',()=>{
  const f=fixture(),w=140,gapX=(w+5)/2,inner=[.2,24],bulk=[21,17];
  f.update('soi');assert.ok(f.ray('outerSi',gapX,0));assert.ok(f.ray('innerSi',...inner));
  f.update('drie',.69);assert.ok(Math.abs(f.solid('outerSi').scale.y-15)<.001);
  f.update('drie');assert.ok(f.ray('wafer',...bulk));assert.ok(!f.ray('wafer',...inner));
  assert.ok(!f.ray('wafer',gapX,0));assert.ok(f.ray('boxGap',gapX,0));assert.ok(!f.ray('outerSi',gapX,0));
  f.update('fill');assert.ok(f.ray('outerFill',gapX-.1,0));assert.ok(f.ray('innerFill',...inner));assert.ok(f.ray('cap',...bulk));
  f.update('cmp');assert.ok(!f.ray('cap',...bulk));assert.ok(f.ray('outerFill',gapX-.1,0));
  f.update('reopen');assert.ok(!f.ray('outerFill',gapX-.1,0));assert.ok(f.ray('innerFill',...inner));assert.ok(f.ray('boxGap',gapX,0));assert.ok(f.ray('handle',gapX,0));
  assert.ok(!f.ray('nitride',0,0),'a real second-via opening exists');
  assert.ok(f.ray('nitride',9,-16),'adjacent passivation is present');
  f.update('electrode');assert.ok(f.ray('irCenter',0,0));assert.ok(!f.ray('irRing',0,0));assert.ok(f.ray('irRing',w*.415,0));assert.ok(!f.ray('irCenter',w*.415,0));
  f.update('release');assert.ok(!f.ray('handle',gapX,0));assert.ok(!f.ray('boxGap',gapX,0));assert.ok(f.ray('boxSi',...bulk));assert.ok(f.ray('innerFill',...inner));f.model.dispose();
});
test('fault selection is restricted to the configured C–N edge, not blanket film or fixture optics',()=>{
  for(const fault of ['trench','stringer','oxide','shade','leakage'])for(const target of [1,3,6]){
    const f=fixture(70,{fault,target}),m=f.update('release'),q=f.dataset.coupon.pixels[target];
    if(['trench','stringer','oxide'].includes(fault)){
      assert.equal(m.syntheticFaultEdge,'C–N'+target);assert.equal(m.releaseResult,'obstructed');
      assert.ok(f.ray('defect',q.x*.5,q.y*.5));assert.ok(!f.ray('defect',-q.x*.5,-q.y*.5));
    }else{assert.equal(m.syntheticFaultEdge,null);assert.equal(m.releaseResult,'clear')}
    f.model.dispose();
  }
});
test('section clips real solids, makes no per-tick meshes, and disposes all geometry and materials',()=>{
  const f=fixture(280,{section:true});f.update('release');const parts=f.model.group.children[0].children;
  const before=parts.map(o=>o.uuid),ma=new Set(parts.map(o=>o.material));let gd=0,md=0;
  for(const x of parts){x.geometry.addEventListener('dispose',()=>gd++);assert.ok(x.geometry.boundingBox.max.z<=28.001)}
  for(const m of ma)m.addEventListener('dispose',()=>md++);
  for(const s of E.stages)for(const p of [0,.62,1])f.update(s.id,p);
  assert.deepEqual(parts.map(o=>o.uuid),before);f.model.dispose();assert.equal(gd,before.length);assert.equal(md,ma.size);
});

test('fault-oriented cut exposes the actual selected edge at all six azimuths',()=>{
  for(const fault of ['trench','stringer','oxide'])for(const target of [1,2,3,4,5,6]){
    const f=fixture(140,{section:true,fault,target}),state=f.update('release');
    assert.equal(state.syntheticFaultEdge,'C–N'+target);
    assert.ok(f.ray('defect',72.5,0),'oriented defect is on the section');
    assert.equal(f.solid('defect').userData.syntheticMaterial,{trench:'unetched silicon',stringer:'metal',oxide:'insulating BOX'}[fault]);
    f.model.dispose();assert.equal(f.update('release'),null);
  }
});
