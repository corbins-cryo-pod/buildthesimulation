import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {action,initial,inspect,parse,rectGap} from '../public/equipment/08-11/solver.mjs';
const base=new URL('../public/equipment/08-11/',import.meta.url),get=k=>readFileSync(new URL(k,base)),read=k=>JSON.parse(get(k)),write=(k,v)=>writeFileSync(new URL(k,base),JSON.stringify(v,null,2)+'\n');
const sample=read('example-artwork.json'),example=inspect(sample,.8),change=(i,c,value)=>{const p=structuredClone(sample);p.rectangles[i].boundsMm[c]=value;return p};
const b=get('protomat-s104.glb'),g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))),node=n=>g.nodes.find(q=>q.name===n),bbox=n=>g.meshes[node(n).mesh].primitives.map(p=>g.accessors[p.attributes.POSITION]),axis=(accessors,i)=>Math.max(...accessors.map(a=>a.max[i]))-Math.min(...accessors.map(a=>a.min[i]));const bboxCase=[0,1,2].map(i=>axis(bbox('case_outer'),i));
const reject=f=>{try{f();return false}catch{return true}};
const actual={
 'isolated-intended-a':example.components[0]?.intendedNetIds[0],
 'separate-connected-islands':example.components.length,
 'cross-net-gap':example.crossNetPairs[0]?.clearanceMm,
 'oversize-gauge-blocked':example.crossNetPairs[0]?.status,
 'smaller-gauge-pass':inspect(sample,.25).crossNetPairs[0]?.status,
 'tangent-gauge-no-margin':inspect(sample,.35).crossNetPairs[0]?.status,
 'introduced-bridge-shorts-islands':inspect(change(3,0,43.5),.8).netChecks.every(n=>n.status==='short'),
 'broken-trace-opens-intended-net':inspect(change(1,0,17),.8).netChecks[0].status==='open',
 'diagonal-3-4-5':rectGap([0,0,1,1],[4,5,7,7]),
 'non-top-layer-rejected':reject(()=>parse({...sample,layer:'bottom-copper'})),
 'metric-width':bboxCase[0],
 'metric-depth':bboxCase[2],
};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(c.expected-actual[c.id])<=(c.tolerance??0):c.expected===actual[c.id])?'PASS':'FAIL'}));
const metrics={bytes:b.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0),caseEnvelopeM:[bboxCase[0],node('acoustic_hood').translation[1]+Math.max(...bbox('hood_glazing').map(a=>a.max[1])),bboxCase[2]]};
const proof={schema:'bts.pcb-inspection.verification.v1',metrics,cases,scope:'Exact geometry and ideal connectivity for inert rectangular coupon; no milling, hardware, headset or empirical validation.'};
if(process.argv.includes('--write-proof')){
 write('verification.json',proof);write('example-report.json',example);
 write('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'08-11',asset:'/equipment/08-11/protomat-s104.glb',scale:'glTF 1 unit = 1 m, +Y up, +Z toward operator',metrics,implementation:'Desktop pick and buttons use DOM-independent actions. No XR runtime validation.',nodes:[
  {node:'hood_handle',label:'Open or close display hood',action:{type:'hood'},boundsM:[.278,.021,.028]},
  {node:'inspect_target',label:'Measure layout clearance without machine motion',action:{type:'inspect'},diameterM:.032},
  {node:'acoustic_hood',pivotM:[0,.197,-.352],axis:[1,0,0],visualDegrees:[-44.6907,0],inferred:true},
  {node:'coupon_anchor',coordinateFrame:'3D center of board; report uses lower left corner in mm'}
 ]});
}
test('Locked analytical clearance, ideal connectivity and nominal asset geometry',()=>{
 assert.deepEqual(read('verification.json'),proof);for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));assert.ok(Math.abs(metrics.caseEnvelopeM[1]-.56)<1e-6);
 assert.equal(g.nodes.filter(n=>/^rack_slot_/.test(n.name)).length,20);
 for(const name of ['hood_handle','inspect_target','coupon_anchor','stationary_spindle','vacuum_platen'])assert.ok(node(name));
});
test('Inert input/export provenance and stable interactions',()=>{
 let s=initial(sample);s=action(s,{type:'hood'});assert.equal(s.hoodOpen,true);s=action(s,{type:'inspect'});
 assert.deepEqual(s.report,read('example-report.json'));assert.deepEqual(s.report.asDesignedArtwork,sample);assert.deepEqual(s.report.components[0].padIds,['A1','A2']);assert.equal(s.report.parentRevision,null);
 s=action(s,{type:'diameter',payload:.25});assert.equal(s.report,null);s=action(s,{type:'inspect'});assert.equal(s.report.parentRevision,1);assert.equal(s.report.crossNetPairs[0].status,'width-available');
 assert.throws(()=>action(s,{type:'diameter',payload:.049}),/0.05/);assert.throws(()=>parse({...sample,nets:[sample.nets[0],{id:'X',padIds:['DOES_NOT_EXIST','B1']}]}),/known/);
});
