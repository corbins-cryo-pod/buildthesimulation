import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Matrix4,Quaternion,Vector3} from 'three';
import {action,blank,analyze,snapshot} from '../public/equipment/15-09/solver.mjs';
const d=new URL('../public/equipment/15-09/',import.meta.url),get=k=>readFileSync(new URL(k,d)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,d),JSON.stringify(v,null,2)+'\n');
const raw=get('ivis-spectrum-static.glb'),g=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12))),n=k=>g.nodes.find(q=>q.name===k);
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










const dims=envelope('instrument_anchor'),ex=action(blank(),{type:'inspect'}).report,a=analyze('stripe'),b=analyze('reordered'),c=analyze('endpoints'),d0=analyze('flat');
const rejects=fn=>{try{fn();return false}catch{return true}};
const actual={width:dims[0],height:dims[1],depth:dims[2],'stripe-mean':a.meanCode,'stripe-std':a.popStdCode,'bin-32':a.histogram[32],
 'permutation-invariant':JSON.stringify(a.histogram)===JSON.stringify(b.histogram)&&snapshot('stripe')[0]!==snapshot('reordered')[0],
 'endpoint-mean':c.meanCode,'endpoint-count':c.lowEndpointPixels+c.highEndpointPixels,'flat-std':d0.popStdCode,'authored-shape':a.pixelCount,
 'unsupported-command-rejected':rejects(()=>action(blank(),{type:'acquire'}))};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):actual[c.id]===c.expected)?'PASS':'FAIL'}));
const metrics={bytes:raw.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0),instrumentXYZM:dims};
const proof={schema:'bts.detached-digital-code-pattern.verification.v1',metrics,cases,scope:'Classic cabinet outline and unrelated invented grayscale integer arrays; no optical instrumentation or measured data.'};
if(process.argv.includes('--write-proof')){
 put('verification.json',proof);put('pattern-example.json',ex);
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'15-09',asset:'/equipment/15-09/ivis-spectrum-static.glb',scale:'glTF meters, +Y up, +Z operator. Detached image codes have no physical units.',metrics,scope:'Detached image display only, no headset tested.',nodes:[{node:'standalone_pattern_switch',label:'Cycle fixed detached digital images',action:{type:'cycle'},boundsM:[.094,.017,.043]},{node:'intensity_view_anchor',label:'Independent synthetic pattern monitor texture',boundsM:[.375,.242]}]});
}
test('Documented exterior envelope, equal-area digital stripe values, reorder/flat/endpoint cases',()=>{
 for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));assert.deepEqual(read('verification.json'),proof);
 assert.deepEqual([c.lowEndpointPixels,c.highEndpointPixels],[512,512]);assert.equal(d0.histogram[117],1536);
 for(const k of ['closed_nonopening_front_door','sealed_external_camera_profile_dome','fixed_front_silver_handle','standalone_pattern_switch','intensity_view_anchor'])assert.ok(n(k));
});
test('Immutable authored images, selections, exported shape, metadata, and disallowed real actions',()=>{
 assert.deepEqual(ex,read('pattern-example.json'));let s=action(blank(),{type:'inspect'});
 s=action(action(s,{type:'select',payload:'endpoints'}),{type:'inspect'});assert.equal(s.report.revision,2);
 assert.equal(s.report.pixels.length,1536);assert.equal(s.report.histogram.length,256);assert.deepEqual(s.report.shape,[48,32]);assert.match(s.report.provenance,/synthetic/i);
 assert.throws(()=>action(s,{type:'select',payload:'unknown'}),/fixed/);assert.deepEqual(action(s,{type:'reset'}),blank());
});
