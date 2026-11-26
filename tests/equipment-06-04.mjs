import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Matrix4,Quaternion,Vector3} from 'three';
import {action,blank,clearance,windowMm,objectMm} from '../public/equipment/06-04/solver.mjs';
const d=new URL('../public/equipment/06-04/',import.meta.url),get=k=>readFileSync(new URL(k,d)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,d),JSON.stringify(v,null,2)+'\n');
const raw=get('form4-static.glb'),g=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12))),n=k=>g.nodes.find(q=>q.name===k);
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




const dims=envelope('instrument_anchor'),ex=action(blank(),{type:'inspect'}).report, a=clearance('centered'),b=clearance('tangent'),c=clearance('offset');
const rejects=fn=>{try{fn();return false}catch{return true}};
const actual={width:dims[0],height:dims[1],depth:dims[2],'left-centered':a.faces[0].minusMm,'right-tangent':b.faces[0].plusMm,
 'right-offset':c.faces[0].plusMm,'unchanged-depth':c.faces[1].plusMm,'unchanged-height':c.faces[2].plusMm,
 'combined-gap':c.faces[0].minusMm+c.faces[0].plusMm,'classifies-three-states':JSON.stringify([a.status,b.status,c.status])==='["inside","touching","outside"]',
 'physical-action-rejected':rejects(()=>action(blank(),{type:'print'}))};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):actual[c.id]===c.expected)?'PASS':'FAIL'}));
const metrics={bytes:raw.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0),instrumentXYZM:dims};
const proof={schema:'bts.detached-clearance-demo.verification.v1',metrics,cases,scope:'Nominal stationary closed exterior and independent authored box clearance, not Form 4 build capacity or operation.'};
if(process.argv.includes('--write-proof')){
 put('verification.json',proof);put('clearance-example.json',ex);
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'06-04',asset:'/equipment/06-04/form4-static.glb',scale:'glTF meters, +Y up, +Z operator. Independent teaching display mm logical axes X width, Y depth, Z height.',metrics,scope:'Detached position-display action, not printer control. No headset tested.',nodes:[{node:'detached_position_switch',label:'Cycle detached block display positions',action:{type:'cycle'},boundsM:[.079,.016,.039]},{node:'detached_demo_block',label:'Passive block driven exclusively by display state',boundsM:[.106,.088,.072],translationXOffsetM:[0,.014]}]});
}
test('Metric closed envelope, analytic margins and zero/negative distinction',()=>{
 for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));assert.deepEqual(read('verification.json'),proof);
 assert.deepEqual(a.faces.map(f=>f.plusMm),[11,12,16]);assert.deepEqual(c.faces.map(f=>f.minusMm),[25,12,16]);
 for(const k of ['closed_orange_outer_hood','blank_front_touchscreen','dark_rear_main_shroud','detached_position_switch','detached_demo_block'])assert.ok(n(k));
});
test('Passive position switch, stable objects/units, export revision and rejected real control',()=>{
 assert.deepEqual(ex,read('clearance-example.json'));let s=action(blank(),{type:'inspect'});
 s=action(action(s,{type:'cycle'}),{type:'inspect'});assert.equal(s.report.minimumMm,0);assert.equal(s.report.revision,2);
 assert.deepEqual(s.report.windowMm,windowMm);assert.deepEqual(s.report.objectMm,objectMm);assert.equal(s.report.units,'mm');
 assert.throws(()=>action(s,{type:'select',payload:'outside-actual-printer'}),/preauthored/);
 assert.deepEqual(action(s,{type:'reset'}),blank());
});
