import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Matrix4,Quaternion,Vector3} from 'three';
import {action,blank,tilesFor,evaluate} from '../public/equipment/07-13/solver.mjs';
const d=new URL('../public/equipment/07-13/',import.meta.url),get=k=>readFileSync(new URL(k,d)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,d),JSON.stringify(v,null,2)+'\n');
const raw=get('worthington-ls6000-static.glb'),g=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12))),n=k=>g.nodes.find(q=>q.name===k);
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






const dims=envelope('instrument_anchor'),ex=action(blank(),{type:'inspect'}).report;
const a=evaluate('separate'),b=evaluate('touching'),c=evaluate('overlap'),d0=evaluate('outside');
const rejects=fn=>{try{fn();return false}catch{return true}};
const actual={'diameter-x':dims[0],'diameter-z':dims[2],height:dims[1],
 'separate-union':a.occupiedMm2,'touching-union':b.occupiedMm2,'overlap-union':c.occupiedMm2,'overlap-area':c.pairs[0].overlapAreaMm2,
 'outside-margin':d0.clearances[1].signedMinMm,'touch-not-overlap':b.pairs[0].relation==='touching'&&b.pairs[0].overlapAreaMm2===0,
 'case-ids-stable':JSON.stringify(a.tiles.map(t=>t.id))===JSON.stringify(d0.tiles.map(t=>t.id)),
 'unsupported-action-rejected':rejects(()=>action(blank(),{type:'open-lid'}))};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):actual[c.id]===c.expected)?'PASS':'FAIL'}));
const metrics={bytes:raw.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0),instrumentXYZM:dims};
const proof={schema:'bts.detached-art-layout.verification.v1',metrics,cases,scope:'Closed LS6000 outline and disconnected art-board arithmetic. No apparatus, real storage, use, or headset verification.'};
if(process.argv.includes('--write-proof')){
 put('verification.json',proof);put('layout-example.json',ex);
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'07-13',asset:'/equipment/07-13/worthington-ls6000-static.glb',scale:'glTF meters, +Y up, +Z operator. Poster frame is authored millimeters.',metrics,scope:'Unrelated desktop views only; no headset.',nodes:[{node:'detached_packing_switch',label:'Switch fixed abstract poster layout',action:{type:'cycle'},boundsM:[.098,.019,.043]},{node:'packing_display_anchor',label:'Detached drawing texture',boundsM:[.328,.222]}]});
}
test('Closed silhouette and known separated, tangent, overlapping and outside art arrangements',()=>{
 for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));assert.deepEqual(read('verification.json'),proof);
 assert.deepEqual([a.label,b.label,c.label,d0.label],['separate','touching','overlap','outside']);
 for(const k of ['closed_external_barrel_shoulders','fixed_blue_external_cap','stationary_side_carry_handle','detached_packing_switch','packing_display_anchor'])assert.ok(n(k));
});
test('Immutable artwork, consistent unique IDs, toggle and output scope without equipment operation',()=>{
 assert.deepEqual(ex,read('layout-example.json'));let s=action(blank(),{type:'inspect'});
 s=action(action(s,{type:'cycle'}),{type:'inspect'});assert.equal(s.report.revision,2);assert.ok(Object.isFrozen(tilesFor(s.mode)[1].min));
 assert.deepEqual(s.report.tiles.map(t=>t.id),['ART-A','ART-B','ART-C']);assert.throws(()=>action(s,{type:'select',payload:'rack'}),/fixed/);
 assert.deepEqual(action(s,{type:'reset'}),blank());
});
