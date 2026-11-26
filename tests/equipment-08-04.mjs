import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {action,circleOverlap,csv,defaultPose,fit,initial,inverse,map,observation} from '../public/equipment/08-04/solver.mjs';
const dir=new URL('../public/equipment/08-04/',import.meta.url),get=k=>readFileSync(new URL(k,dir)),read=k=>JSON.parse(get(k)),write=(k,v)=>writeFileSync(new URL(k,dir),JSON.stringify(v,null,2)+'\n');
const reject=f=>{try{f();return false}catch{return true}};
const geom=get('fineplacer-lambda.glb'),gl=JSON.parse(geom.toString('utf8',20,20+geom.readUInt32LE(12))),node=k=>gl.nodes.find(n=>n.name===k);
const dims=k=>{const a=gl.accessors[gl.meshes[node(k).mesh].primitives[0].attributes.POSITION];return a.max.map((x,i)=>x-a.min[i])};
const mat=observation(defaultPose,true),defect=mat.connections.at(-1);
const record=()=>['align','optics','arm','record'].reduce((s,type)=>action(s,{type}),initial());
const example=record().placement;
const actual={
 'observed-theta':mat.measured.deg,
 'inverse-x':mat.correction.xUm,
 'inverse-y':mat.correction.yUm,
 'registered-good-bumps':mat.connections.filter(p=>p.status==='geometric-pass').length,
 'defective-bump-overlap':defect.overlapFraction,
 'defect-distance':defect.distanceUm,
 'repaired-bumps':observation({...defaultPose,defect:false},true).connections.filter(p=>p.status==='geometric-pass').length,
 'equal-circle-lens':circleOverlap(1,1,1),
 'base-width':dims('baseplate')[0],
 'base-depth':dims('baseplate')[2],
 'coincident-fiducials-rejected':reject(()=>fit([{id:'1',xUm:0,yUm:0},{id:'2',xUm:0,yUm:0}],[{id:'1',xUm:1,yUm:4},{id:'2',xUm:2,yUm:3}])),
 'optics-interlock':reject(()=>action(initial(),{type:'arm'}))
};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(c.expected-actual[c.id])<=c.tolerance:c.expected===actual[c.id])?'PASS':'FAIL'}));
const metrics={sizeBytes:geom.length,triangles:gl.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+gl.accessors[p.indices].count/3,0),draws:gl.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+gl.meshes[n.mesh].primitives.length,0),baseGltfXyzM:dims('baseplate'),controllerGltfXyzM:dims('controller_case')};
const proof={schema:'bts.flip-chip.verification.v1',metrics,cases,scope:'Rigid analytic geometry and interlock logic only. No measured A7 precision, heat, force, physical bond, electrical continuity or headset data.'};
if(process.argv.includes('--write-proof')){
 write('verification.json',proof);write('example-placement.json',example);
 write('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'08-04',asset:'/equipment/08-04/fineplacer-lambda.glb',scale:'1 glTF unit = 1 m; +Y up, +Z toward operator',metrics,dispatch:'DOM-independent action(state, action); desktop picks same action as buttons; immersive frontend not tested',items:[
  {node:'optics_toggle',label:'Park or restore optical carriage',action:{type:'optics'},diameterM:.034,travelMm:113,inferred:true},
  {node:'arm_toggle',label:'Swing arm to dry placement or lift',action:{type:'arm'},diameterM:.026,requires:'opticsParked'},
  {node:'placer_arm',axis:[1,0,0],pivotM:[0,.175,-.096],travelDeg:[0,90]},
  {node:'carrier_stage',scale:'m; output asset frame +Y up'}
 ]});
}
test('Locked rigid transform, circular overlap, optical interlock and base GLB',()=>{
 assert.deepEqual(proof,read('verification.json'));for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));
 for(const [i,k] of [.29,.143,.31].entries())assert.ok(Math.abs(metrics.controllerGltfXyzM[i]-k)<1e-6);
 const h=node('optical_carriage').translation[1]+node('camera_top_cable_gland').translation[1]+.010;
 assert.ok(Math.abs(h-.700)<1e-6);
 for(const key of ['optics_toggle','arm_toggle','placer_arm','carrier_stage'])assert.ok(node(key));
 assert.ok(Math.abs(mat.correction.deg+2)<1e-10);assert.ok(mat.correction.rmsUm<1e-9);
 const p={xUm:57,yUm:-29},t={xUm:120,yUm:-55,deg:2};assert.ok(Math.abs(map(map(p,t),inverse(t)).xUm-p.xUm)<1e-9);
});
test('Dry placement workflow and output keep sample labels, rejection and revisions',()=>{
 let s=initial();assert.throws(()=>action(s,{type:'record'}),/Align/);s=action(s,{type:'optics'});
 assert.throws(()=>action(s,{type:'align'}),/Return/);s=action(s,{type:'arm'});
 assert.throws(()=>action(s,{type:'optics'}),/Raise/);assert.throws(()=>action(s,{type:'record'}),/Align/);
 s=record();assert.deepEqual(example,read('example-placement.json'));assert.equal(s.placement.connections.at(-1).status,'no-overlap');
 assert.match(csv(s.placement),/BTS-08-04-SYN-DIE,BTS-08-04-SYN-CARRIER,registration-coupon-r1,1,E,E/);
 s=action(s,{type:'record'});assert.equal(s.placement.parentRevision,1);
 assert.throws(()=>observation({...defaultPose,deg:7}),/±5/);
});
