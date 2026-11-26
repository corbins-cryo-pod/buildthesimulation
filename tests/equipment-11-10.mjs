import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Matrix4,Quaternion,Vector3} from 'three';
import {action,blank,resistors,solve} from '../public/equipment/11-10/solver.mjs';
const d=new URL('../public/equipment/11-10/',import.meta.url),get=k=>readFileSync(new URL(k,d)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,d),JSON.stringify(v,null,2)+'\n');
const raw=get('fixture-concept-static.glb'),g=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12))),n=k=>g.nodes.find(q=>q.name===k);
function envelope(anchor){
 const b=new Box3();
 function scan(o,m){
  const global=m.clone().multiply(o.matrix?new Matrix4().fromArray(o.matrix):new Matrix4().compose(
   new Vector3(...(o.translation??[0,0,0])),new Quaternion(...(o.rotation??[0,0,0,1])),new Vector3(...(o.scale??[1,1,1]))));
  if(o.mesh!==undefined)for(const p of g.meshes[o.mesh].primitives){
   const a=g.accessors[p.attributes.POSITION];b.union(new Box3(new Vector3(...a.min),new Vector3(...a.max)).applyMatrix4(global));
  }
  for(const i of o.children??[])scan(g.nodes[i],global);
 }
 scan(n(anchor),new Matrix4());return b.getSize(new Vector3()).toArray();
}








const dims=envelope('proposed_fixture_anchor'),ex=action(blank(),{type:'inspect'}).report,a=solve('complete'),b=solve('gap');
const rejects=fn=>{try{fn();return false}catch{return true}};
const actual={width:dims[0],height:dims[1],depth:dims[2],'normal-total':a.equivalentOhm,'normal-current':a.currentMicroamp,
 'voltage-a':a.resistiveDrops[0].dropV,'voltage-b':a.resistiveDrops[1].dropV,'closed-drop-sum':a.resistiveDrops.reduce((p,r)=>p+r.dropV,0),
 'open-current':b.currentMicroamp,'open-gap-voltage':b.gapDropV,'open-resistance-is-not-zero':b.equivalentOhm===null,
 'physical-command-rejected':rejects(()=>action(blank(),{type:'activate-fixture'}))};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):actual[c.id]===c.expected)?'PASS':'FAIL'}));
const metrics={bytes:raw.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0),proposedFixtureXYZM:dims};
const proof={schema:'bts.detached-ideal-series-card.verification.v1',metrics,cases,scope:'Original nominal fixture geometry and independent ideal arithmetic, not measured or operational hardware.'};
if(process.argv.includes('--write-proof')){
 put('verification.json',proof);put('card-example.json',ex);
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'11-10',asset:'/equipment/11-10/fixture-concept-static.glb',scale:'glTF meters, +Y up, +Z operator. Detached card uses normalized synthetic SI values and no geometry-to-hardware link.',metrics,scope:'Independent desktop/card only, no headset tested.',nodes:[{node:'detached_card_select_badge',label:'Switch fixed passive circuit-card snapshots',action:{type:'cycle'},boundsM:[.066,.014,.028]},{node:'circuit_card_display_anchor',label:'Standalone teaching display texture',boundsM:[.168,.111]}]});
}
test('Proposed hull plus independent Ohm law, closed conservation and ideal open gap',()=>{
 for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));assert.deepEqual(read('verification.json'),proof);
 assert.deepEqual(b.resistiveDrops.map(r=>r.dropV),[0,0]);assert.equal(b.state,'open-series');
 for(const k of ['nominal_baseplate','fixed_upper_bridge_shroud','sealed_central_cover','circuit_card_display_anchor','detached_card_select_badge'])assert.ok(n(k));
});
test('Passive snapshot, unchanged source IDs and export revision, or invalid request',()=>{
 assert.deepEqual(ex,read('card-example.json'));let s=action(blank(),{type:'inspect'});
 s=action(action(s,{type:'cycle'}),{type:'inspect'});assert.equal(s.report.revision,2);
 assert.deepEqual(s.report.resistiveDrops.map(r=>r.id),resistors.map(r=>r.id));assert.equal(s.report.units.current,'µA');
 assert.throws(()=>action(s,{type:'select',payload:'device'}),/fixed/);assert.deepEqual(action(s,{type:'reset'}),blank());
});
