import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Matrix4,Quaternion,Vector3} from 'three';
import {action,blank,drawing,inspect} from '../public/equipment/13-14/solver.mjs';
const d=new URL('../public/equipment/13-14/',import.meta.url),get=k=>readFileSync(new URL(k,d)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,d),JSON.stringify(v,null,2)+'\n');
const raw=get('hm325a-static.glb'),g=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12))),n=k=>g.nodes.find(q=>q.name===k);
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

const dims=envelope('instrument_anchor'),a=inspect('draft-a'),b=inspect('draft-b'),ex=action(blank(),{type:'inspect'}).report;
const rejects=fn=>{try{fn();return false}catch{return true}};
const actual={width:dims[0],height:dims[1],depth:dims[2],diagonal:a.diagonalPrMm,area:a.areaMm2,perimeter:a.perimeterMm,
 'translation-x':b.shiftMm[0],'translation-y':b.shiftMm[1],'area-invariant':b.rigidTranslation&&b.areaMm2===a.areaMm2,
 'display-labels-stable':drawing('draft-a').pointIds.join()==='P,Q,R'&&drawing('draft-b').pointIds.join()==='P,Q,R',
 'physical-action-rejected':rejects(()=>action(blank(),{type:'operate'}))};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):actual[c.id]===c.expected)?'PASS':'FAIL'}));
const metrics={bytes:raw.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0),instrumentXYZM:dims};
const proof={schema:'bts.detached-drafting-inspection.verification.v1',metrics,cases,scope:'Nominal stationary exterior and independently authored plane geometry only.'};
if(process.argv.includes('--write-proof')){
 put('verification.json',proof);put('diagram-example.json',ex);
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'13-14',asset:'/equipment/13-14/hm325a-static.glb',scale:'glTF meters, +Y up, +Z operator. Drawing coordinates are unrelated authored millimeters.',metrics,scope:'Detached passive diagram controls, no headset tested.',nodes:[{node:'detached_diagram_badge',label:'Switch separate fixed diagram',action:{type:'cycle'},boundsM:[.081,.027,.045]},{node:'detached_diagram_screen_anchor',label:'Detached display texture',boundsM:[.210,.150]}]});
}
test('Published enclosure, fixed triangle length/area and translated point IDs',()=>{
 for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));assert.deepEqual(read('verification.json'),proof);
 assert.deepEqual(a.edgesMm,[80,60,100]);assert.deepEqual(b.edgesMm,a.edgesMm);
 for(const k of ['static_main_wheel','solid_oversized_protective_shroud','front_outer_tray_rounded_lip','detached_diagram_badge','detached_diagram_screen_anchor'])assert.ok(n(k));
});
test('Switch views without editing, immutable vertices, live output and disabled operation',()=>{
 assert.deepEqual(ex,read('diagram-example.json'));let s=action(blank(),{type:'inspect'});
 s=action(action(s,{type:'cycle'}),{type:'inspect'});assert.deepEqual(s.report.shiftMm,[-32,26]);
 assert.equal(s.report.revision,2);assert.equal(s.report.verticesMm,drawing('draft-b').verticesMm);
 assert.throws(()=>action(s,{type:'select',payload:'unknown'}),/fixed detached/);
 assert.throws(()=>action(s,{type:'edit-vertices'}),/passive/);assert.deepEqual(action(s,{type:'reset'}),blank());
});
