import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Matrix4,Quaternion,Vector3} from 'three';
import {action,blank,art,shape} from '../public/equipment/15-03/solver.mjs';
const d=new URL('../public/equipment/15-03/',import.meta.url),get=k=>readFileSync(new URL(k,d)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,d),JSON.stringify(v,null,2)+'\n');
const raw=get('catwalk-xt-107-static.glb'),g=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12))),n=k=>g.nodes.find(q=>q.name===k);
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









const dims=envelope('instrument_anchor'),ex=action(blank(),{type:'inspect'}).report,a=shape('rectangle'),b=shape('diamond'),c=shape('collinear');
const rejects=fn=>{try{fn();return false}catch{return true}};
const actual={length:dims[0],depth:dims[2],height:dims[1],'rectangle-area':a.areaMm2,'rectangle-perimeter':a.perimeterMm,
 'diamond-area':b.areaMm2,'diamond-centroid-x':b.centroidMm[0],'diamond-centroid-y':b.centroidMm[1],
 'collinear-zero':c.areaMm2,'collinear-no-centroid':c.centroidMm===null&&c.perimeterMm===null,
 'source-immutable':ex.verticesMm===art.rectangle.verticesMm&&ex.verticesMm.every(Object.isFrozen),
 'unsupported-command-rejected':rejects(()=>action(blank(),{type:'track'}))};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):actual[c.id]===c.expected)?'PASS':'FAIL'}));
const metrics={bytes:raw.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0),instrumentXYZM:dims};
const proof={schema:'bts.detached-geometric-stamp.verification.v1',metrics,cases,scope:'Nominal equipment envelope and independent authored polygon geometry only, not real data or operation.'};
if(process.argv.includes('--write-proof')){
 put('verification.json',proof);put('mark-example.json',ex);
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'15-03',asset:'/equipment/15-03/catwalk-xt-107-static.glb',scale:'glTF meters, +Y up, +Z operator. Detached graph uses unrelated paper mm.',metrics,scope:'Passive detached graphic and selection only; no headset tested.',nodes:[{node:'separate_stamp_cycle_badge',label:'Cycle detached geometric marks',action:{type:'cycle'},boundsM:[.101,.017,.046]},{node:'ink_card_display_anchor',label:'Unrelated drawing display',boundsM:[.341,.233]}]});
}
test('Metric appearance envelope and independent rectangle/diamond/collinear arithmetic',()=>{
 for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));assert.deepEqual(read('verification.json'),proof);
 assert.deepEqual(a.centroidMm,[0,0]);assert.equal(b.status,'filled-polygon');assert.equal(c.status,'no-area');
 for(const k of ['lower_platform_outer_plate','stationary_upper_dark_shroud','solid_upper_panel_center','separate_stamp_cycle_badge','ink_card_display_anchor'])assert.ok(n(k));
});
test('Stable geometry IDs, detached view changes, exported lineage and disallowed device input',()=>{
 assert.deepEqual(ex,read('mark-example.json'));let s=action(blank(),{type:'inspect'});
 s=action(action(s,{type:'cycle'}),{type:'inspect'});assert.equal(s.report.revision,2);assert.equal(s.report.markId,'INK-DIAMOND-B');
 assert.equal(s.report.units.coordinates,'mm');assert.throws(()=>action(s,{type:'select',payload:'video'}),/fixed/);assert.deepEqual(action(s,{type:'reset'}),blank());
});
