import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Matrix4,Quaternion,Vector3} from 'three';
import {action,blank,readings,tiles} from '../public/equipment/13-08/solver.mjs';
const d=new URL('../public/equipment/13-08/',import.meta.url),get=k=>readFileSync(new URL(k,d)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,d),JSON.stringify(v,null,2)+'\n');
const raw=get('leica-em-ice-static.glb'),g=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12))),n=k=>g.nodes.find(q=>q.name===k);
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
const dims=envelope('instrument_anchor'),a=readings('TILE-A'),b=readings('TILE-B');
const ex=action(blank(),{type:'annotate'}).report,reject=f=>{try{f();return false}catch{return true}};
const actual={width:dims[0],height:dims[1],depth:dims[2],'card-a':a.diagonalMm,'card-b':b.diagonalMm,
 'card-a-edge':a.edgesMm[0],'card-b-edge':b.edgesMm[0],'keeps-corners':ex.cornersMm===tiles['TILE-A'].cornersMm,
 'interior-stays-unknown':ex.unobservedInterior===null,'wrong-object-rejected':reject(()=>readings('equipment')),
 'physical-action-rejected':reject(()=>action(blank(),{type:'operate'}))};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):actual[c.id]===c.expected)?'PASS':'FAIL'}));
const metrics={bytes:raw.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0),instrumentXYZM:dims};
const proof={schema:'bts.detached-outline-annotation.verification.v1',metrics,cases,scope:'Nominal outer envelope and synthetic corner arithmetic only. No model fit against measured internals, pressure or process validation.'};
if(process.argv.includes('--write-proof')){
 put('verification.json',proof);put('outline-example.json',ex);
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'13-08',asset:'/equipment/13-08/leica-em-ice-static.glb',scale:'glTF meters, +Y up, +Z operator; detached outline uses separate, authored mm coordinates.',metrics,scope:'Detached-exhibit view action only, no headset tested.',nodes:[{node:'detached_display_badge',label:'Switch detached exhibit tile',action:{type:'cycle'},boundsM:[.100,.025,.053]},{node:'detached_tile_a',label:'Detached example A',boundsM:[.060,.010,.080]},{node:'detached_tile_b',label:'Detached example B',boundsM:[.120,.010,.050]}]});
}
test('Documented exterior envelope, independent Pythagorean triples, immutable outline and denied operation',()=>{
 for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));assert.deepEqual(read('verification.json'),proof);
 for(const k of ['upper_left_tall_shroud','closed_red_exterior_cover','inactive_screen_glass','detached_display_badge'])assert.ok(n(k));
 assert.deepEqual(a.edgesMm,[60,80,60,80]);assert.deepEqual(b.edgesMm,[120,50,120,50]);
});
test('Selection, separate annotation parent revisions and unknown interior',()=>{
 assert.deepEqual(ex,read('outline-example.json'));let s=action(blank(),{type:'annotate'});
 s=action(action(s,{type:'cycle'}),{type:'annotate'});assert.equal(s.report.parentAnnotation,null);assert.equal(s.report.diagonalMm,130);
 s=action(action(s,{type:'cycle'}),{type:'annotate'});assert.equal(s.report.parentAnnotation,ex.revision);assert.equal(s.report.unobservedInterior,null);
 assert.throws(()=>action(s,{type:'select',payload:'leica'}),/exhibit/);assert.deepEqual(action(s,{type:'reset'}),blank());
});
