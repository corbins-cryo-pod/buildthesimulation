import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Matrix4,Quaternion,Vector3} from 'three';
import {action,blank,dot,markerDistance,poster} from '../public/equipment/04-07/solver.mjs';
const d=new URL('../public/equipment/04-07/',import.meta.url),get=k=>readFileSync(new URL(k,d)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,d),JSON.stringify(v,null,2)+'\n');
const raw=get('dad321-static.glb'),g=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12))),n=k=>g.nodes.find(q=>q.name===k);
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


const dims=envelope('instrument_anchor'),ex=action(blank(),{type:'inspect'}).report, vector=markerDistance(),[a,b]=vector.markers,edge=dot([8,6]);
const rejects=fn=>{try{fn();return false}catch{return true}};
const actual={width:dims[0],height:dims[1],depth:dims[2],'marker-a-x':a.centerMm[0],'marker-a-y':a.centerMm[1],
 'marker-b-x':b.centerMm[0],'marker-b-y':b.centerMm[1],distance:vector.lengthMm,
 'edge-extent':edge.centerMm[0]===94&&edge.centerMm[1]===78,
 'outside-rejected':rejects(()=>dot([9,0])),'physical-action-rejected':rejects(()=>action(blank(),{type:'operate'}))};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):actual[c.id]===c.expected)?'PASS':'FAIL'}));
const metrics={bytes:raw.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0),instrumentXYZM:dims};
const proof={schema:'bts.detached-dot-grid-inspection.verification.v1',metrics,cases,scope:'Nominal sealed enclosure and detached fictitious poster only; no tool paths or processing.'};
if(process.argv.includes('--write-proof')){
 put('verification.json',proof);put('poster-example.json',ex);
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'04-07',asset:'/equipment/04-07/dad321-static.glb',scale:'glTF meters, +Y up, +Z operator. Poster uses unrelated authored millimeter centers.',metrics,scope:'Detached display action only. No headset tested.',nodes:[{node:'detached_poster_badge',label:'Switch between the two marked poster dots',action:{type:'cycle'},boundsM:[.103,.024,.051]},{node:'poster_display_anchor',label:'Separate poster display texture',boundsM:[.352,.235]}]});
}
test('Nominal sealed cabinet separate from beacon, known printed grid and unsimulated physical operations',()=>{
 for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));assert.deepEqual(read('verification.json'),proof);
 assert.deepEqual(vector.deltaMm,[70,44]);assert.ok(n('external_stack_beacon_inferred'));
 for(const k of ['opaque_replaced_window','sealed_right_opaque_cover','blank_display_recess','detached_poster_badge','poster_display_anchor'])assert.ok(n(k));
});
test('Passive selection/revision, distinct unmarked point and emitted units',()=>{
 assert.deepEqual(ex,read('poster-example.json'));
 let s=action(blank(),{type:'inspect'});s=action(action(s,{type:'cycle'}),{type:'inspect'});
 assert.equal(s.report.selected.marker,'B');assert.equal(s.report.units,'mm');assert.equal(s.report.revision,2);
 s=action(s,{type:'pick',payload:[0,0]});assert.equal(dot(s.index).marker,null);assert.deepEqual(dot(s.index).centerMm,poster.datumMm);
 assert.throws(()=>action(s,{type:'pick',payload:[8,7]}),/No dot/);
});
