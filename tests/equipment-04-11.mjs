import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Matrix4,Quaternion,Vector3} from 'three';
import {action,blank,circle,markers,measure} from '../public/equipment/04-11/solver.mjs';
const d=new URL('../public/equipment/04-11/',import.meta.url),get=k=>readFileSync(new URL(k,d)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,d),JSON.stringify(v,null,2)+'\n');
const raw=get('minimill-gx-static.glb'),g=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12))),n=k=>g.nodes.find(q=>q.name===k);
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



const dims=envelope('instrument_anchor'),ex=action(blank(),{type:'inspect'}).report,a=measure('nominal'),b=measure('offset');
const rejects=fn=>{try{fn();return false}catch{return true}};
const actual={width:dims[0],height:dims[1],depth:dims[2],'center-x':a.centerMm[0],'center-y':a.centerMm[1],radius:a.radiusMm,
 'nominal-residual':a.radialResidualMm,'offset-residual':b.radialResidualMm,'immutable-references':ex.referencePointsMm===markers&&markers.every(Object.isFrozen),
 'degenerate-rejected':rejects(()=>circle([[0,0],[1,1],[2,2]])),'physical-action-rejected':rejects(()=>action(blank(),{type:'operate'}))};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):actual[c.id]===c.expected)?'PASS':'FAIL'}));
const metrics={bytes:raw.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0),instrumentXYZM:dims};
const proof={schema:'bts.detached-circle-inspection.verification.v1',metrics,cases,scope:'Stationary free-standing OEM shell and a detached immutable math diagram only.'};
if(process.argv.includes('--write-proof')){
 put('verification.json',proof);put('circle-example.json',ex);
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'04-11',asset:'/equipment/04-11/minimill-gx-static.glb',scale:'glTF meters, +Y up, +Z operator. Diagram coordinates are independent authored millimeters.',metrics,scope:'Detached display only. Headset not tested.',nodes:[{node:'detached_diagram_switch',label:'Switch known sample drawing',action:{type:'cycle'},boundsM:[.106,.024,.053]},{node:'circle_display_anchor',label:'Detached live teaching texture',boundsM:[.366,.244]}]});
}
test('Metric shell, predetermined circle center/radius, outlier and invalid geometry',()=>{
 for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));assert.deepEqual(read('verification.json'),proof);
 assert.deepEqual(a.centerMm,b.centerMm);assert.equal(b.heldOutRadiusMm,53);
 for(const k of ['fixed_opaque_front_leaf','closed_opaque_side_panel','closed_static_handle','detached_diagram_switch','circle_display_anchor'])assert.ok(n(k));
});
test('Passive switch, immutable independent output and revision',()=>{
 assert.deepEqual(ex,read('circle-example.json'));let s=action(blank(),{type:'inspect'});
 s=action(action(s,{type:'cycle'}),{type:'inspect'});assert.equal(s.report.radialResidualMm,3);assert.equal(s.report.revision,2);
 assert.deepEqual(s.report.referencePointIds,['A','B','C']);assert.equal(s.report.coordinateFrame.units,'mm');
 assert.throws(()=>action(s,{type:'select',payload:'external-file'}),/authored/);assert.deepEqual(action(s,{type:'reset'}),blank());
});
