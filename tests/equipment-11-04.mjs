import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Matrix4,Quaternion,Vector3} from 'three';
import {action,blank,points as originals,view} from '../public/equipment/11-04/solver.mjs';
const d=new URL('../public/equipment/11-04/',import.meta.url),get=k=>readFileSync(new URL(k,d)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,d),JSON.stringify(v,null,2)+'\n');
const raw=get('doric-nc500-static.glb'),g=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12))),n=k=>g.nodes.find(q=>q.name===k);
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







const consoleDims=envelope('console_documentary_root'),cubeDims=envelope('mini_cube_documentary_root'),ex=action(blank(),{type:'inspect'}).report;
const a=view('original'),b=view('ccw'),c=view('cw'),rejects=fn=>{try{fn();return false}catch{return true}};
const actual={'console-width':consoleDims[0],'console-depth':consoleDims[2],'console-height':consoleDims[1],
 'cube-width-with-tabs':cubeDims[0],'cube-depth':cubeDims[2],'cube-height':cubeDims[1],
 'normal-length':a.pairLengthMm,'ccw-vector-x':b.vectorMm[0],'cw-vector-y':c.vectorMm[1],
 'length-invariant':a.pairLengthMm===b.pairLengthMm&&b.pairLengthMm===c.pairLengthMm,
 'unsupported-command-rejected':rejects(()=>action(blank(),{type:'acquire'}))};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):actual[c.id]===c.expected)?'PASS':'FAIL'}));
const metrics={bytes:raw.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0),consoleXYZM:consoleDims,cubeXYZM:cubeDims};
const proof={schema:'bts.detached-coordinate-card.verification.v1',metrics,cases,scope:'Closed Doric enclosures and independent fixed geometry card. No hardware or headset test.'};
if(process.argv.includes('--write-proof')){
 put('verification.json',proof);put('coordinates-example.json',ex);
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'11-04',asset:'/equipment/11-04/doric-nc500-static.glb',scale:'glTF meters, +Y up, +Z operator. Detached card uses unrelated authored mm coordinates.',metrics,scope:'Detached coordinates view only. No headset tested.',nodes:[{node:'detached_card_switch',label:'Cycle fixed card drawing views',action:{type:'cycle'},boundsM:[.055,.014,.026]},{node:'coordinate_display_anchor',label:'Independent coordinate display texture',boundsM:[.151,.103]}]});
}
test('Independent nominal metric cases and sign of cardinal page rotation',()=>{
 for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));assert.deepEqual(read('verification.json'),proof);
 assert.deepEqual(a.vectorMm,[18,9]);assert.deepEqual(b.vectorMm,[-9,18]);assert.deepEqual(c.vectorMm,[9,-18]);
 assert.equal(g.nodes.filter(n=>n.name.startsWith('nc500_permanent_blind_cap')).length,24);
 for(const k of ['nc500_primary_case','ilfmc4_case_body','ilfmc4_stationary_rear_fin','detached_card_switch','coordinate_display_anchor'])assert.ok(n(k));
});
test('Passive switch does not edit the source coordinates and report remains identifiable',()=>{
 assert.deepEqual(ex,read('coordinates-example.json'));let s=action(blank(),{type:'inspect'});s=action(action(s,{type:'cycle'}),{type:'inspect'});
 assert.equal(s.report.revision,2);assert.equal(s.report.plot[1].xyMm,originals[1].xyMm);assert.ok(Object.isFrozen(originals[1].xyMm));
 assert.throws(()=>action(s,{type:'select',payload:'unknown'}),/fixed/);assert.deepEqual(action(s,{type:'reset'}),blank());
});
