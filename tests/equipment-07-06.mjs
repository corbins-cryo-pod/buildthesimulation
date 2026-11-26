import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Matrix4,Quaternion,Vector3} from 'three';
import {action,blank,coordinatesM,evaluate} from '../public/equipment/07-06/solver.mjs';
const d=new URL('../public/equipment/07-06/',import.meta.url),get=k=>readFileSync(new URL(k,d)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,d),JSON.stringify(v,null,2)+'\n');
const raw=get('eppendorf-5810r-static.glb'),g=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12))),n=k=>g.nodes.find(q=>q.name===k);
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





const dims=envelope('instrument_anchor'),ex=action(blank(),{type:'inspect'}).report,a=evaluate('zero'),b=evaluate('nonzero');
const support=g.nodes.filter(o=>o.name.startsWith('stationary_foot')).map(o=>{
 const boxes=g.meshes[o.mesh].primitives.map(p=>g.accessors[p.attributes.POSITION]);
 return [Math.min(...boxes.map(v=>v.min[2]))+o.translation[2],Math.max(...boxes.map(v=>v.max[2]))+o.translation[2]];
});
const supportDepth=Math.max(...support.map(q=>q[1]))-Math.min(...support.map(q=>q[0]));
const rejects=fn=>{try{fn();return false}catch{return true}};
const actual={width:dims[0],height:dims[1],depth:dims[2],'support-footprint-depth':supportDepth,
 'left-moment':a.points[0].signedMomentNm,'right-moment':a.points[1].signedMomentNm,'balanced-net':a.netMomentNm,'offset-net':b.netMomentNm,
 'offset-sign':b.classification==='counterclockwise-net','keeps-drawing-frame':ex.positionsM===coordinatesM&&b.points.every((p,i)=>p.xM===coordinatesM[i]),
 'unsupported-command-rejected':rejects(()=>action(blank(),{type:'spin'}))};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):actual[c.id]===c.expected)?'PASS':'FAIL'}));
const metrics={bytes:raw.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0),instrumentXYZM:dims,nominalSupportDepthM:supportDepth};
const proof={schema:'bts.detached-static-moment-inspection.verification.v1',metrics,cases,scope:'Closed documentary exterior and independent static drawing only; no internal or experimental data.'};
if(process.argv.includes('--write-proof')){
 put('verification.json',proof);put('diagram-example.json',ex);
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'07-06',asset:'/equipment/07-06/eppendorf-5810r-static.glb',scale:'glTF meters, +Y up, +Z operator. Statics card has independent coordinates.',metrics,scope:'Detached display action only. No immersive headset tested.',nodes:[{node:'detached_statics_badge',label:'Switch the detached static moment drawing',action:{type:'cycle'},boundsM:[.078,.015,.038]},{node:'detached_statics_screen_anchor',label:'Independent teaching screen texture',boundsM:[.275,.188]}]});
}
test('Metric closed enclosure, support footprint, signed static zero and nonzero values',()=>{
 for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));assert.deepEqual(read('verification.json'),proof);
 assert.equal(support.length,4);assert.equal(a.classification,'zero-net');
 for(const k of ['closed_left_lid_opaque','console_display_blank','right_lower_refrigerated_variant_shell','detached_statics_badge','detached_statics_screen_anchor'])assert.ok(n(k));
});
test('Detached switch, unchanged positions, export revision and refused machine operations',()=>{
 assert.deepEqual(ex,read('diagram-example.json'));let s=action(blank(),{type:'inspect'});
 s=action(action(s,{type:'cycle'}),{type:'inspect'});assert.equal(s.report.revision,2);assert.deepEqual(s.report.positionsM,[-.4,.3]);assert.equal(s.report.units.moment,'N·m');
 assert.throws(()=>action(s,{type:'select',payload:'rotor'}),/immutable/);assert.deepEqual(action(s,{type:'reset'}),blank());
});
