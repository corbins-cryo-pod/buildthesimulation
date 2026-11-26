import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {acceptance,action,blank,exportLedger,gross,quantize,sample} from '../public/equipment/16-06/solver.mjs';
const dir=new URL('../public/equipment/16-06/',import.meta.url),get=k=>readFileSync(new URL(k,dir)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,dir),JSON.stringify(v,null,2)+'\n');
const accepted=acceptance(),result=exportLedger(accepted.state),s=accepted.state;
const apply=(s,...steps)=>steps.reduce((s,y)=>typeof y==='string'?action(s,{type:y}):action(s,{type:y[0],payload:y[1]}),s);
const calibrated=apply(blank(),['gain',300],'settle','calibrate','door',['weight',100],'door','settle');
const badDraft=apply(blank(),'door','vessel','settle'),seeded=apply(blank(),['noise',{enabled:true,seed:88}]);
const g=get('ae100.glb'),meta=JSON.parse(g.toString('utf8',20,20+g.readUInt32LE(12))),node=k=>meta.nodes.find(n=>n.name===k);
const bounds=name=>{
 const m=meta.meshes[node(name).mesh].primitives.map(p=>meta.accessors[p.attributes.POSITION]);
 return [0,1,2].map(i=>Math.max(...m.map(a=>a.max[i]))-Math.min(...m.map(a=>a.min[i])));
};
const reject=f=>{try{f();return false}catch{return true}};
const actual={
 'gross-vessel':accepted.before.nominalGrossG,'tare-zero':accepted.zero.displayG,'after-addition':accepted.after.displayG,'gross-after-addition':accepted.after.nominalGrossG,
 'half-step-positive':quantize(.00005),'half-step-negative':quantize(-.00005),
 'inclusive-109-g':sample({...s,weightG:107}).status,'overload-despite-tare':sample({...s,weightG:108}).status,
 'draft-interlock':badDraft.measurement.status==='draft-open'&&reject(()=>action(badDraft,{type:'tare'})),
 'one-point-gain-check':calibrated.measurement.displayG,
 'seeded-trace-exact-replay':JSON.stringify(sample(seeded))===JSON.stringify(sample({...seeded})),
 'pan-diameter':bounds('weighing_pan')[0]
};
const metrics={bytes:g.length,triangles:meta.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+meta.accessors[p.indices].count/3,0),draws:meta.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+meta.meshes[n.mesh].primitives.length,0),housingNominalM:[bounds('housing_envelope_base')[0],node('front_rear_top_rail').translation[1]+bounds('front_rear_top_rail')[1]/2,bounds('housing_envelope_base')[2]],panDiameterM:bounds('weighing_pan')[0]};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):actual[c.id]===c.expected)?'PASS':'FAIL'}));
const proof={schema:'bts.balance.verification.v1',metrics,cases,scope:'Analytic and synthetic-only virtual weighing. No metrological calibration, experimental accuracy, physical instrument, or headset validation.'};
if(process.argv.includes('--write-proof')){
 put('verification.json',proof);put('example-readings.json',result);
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'16-06',asset:'/equipment/16-06/ae100.glb',scale:'glTF 1 unit = 1 m, +Y up, +Z toward operator',metrics,implementation:'DOM and pointer share action(state, action). No physical headset test.',nodes:[
  {node:'door_handle',label:'Slide the right draft shield',action:{type:'door'},boundsM:[.010,.036,.014],parent:'right_draft_door',travelM:[0,0,-.132],travelInferred:true},
  {node:'tare_bar',label:'Store currently valid reading as tare',action:{type:'tare'},widthM:.153},
  {node:'calibrate_handle',label:'Apply a synthetic one-point calibration',action:{type:'calibrate'},widthM:.017},
  {node:'display_texture_anchor',label:'Live balance image',widthM:.148}
 ]});
}
test('Locked masses, quantization, gross capacity, calibration and dimensional anchors',()=>{
 assert.deepEqual(proof,read('verification.json'));for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));
 for(const [i,n] of [.205,.290,.410].entries())assert.ok(Math.abs(metrics.housingNominalM[i]-n)<1e-6);
 assert.deepEqual(read('example-readings.json'),result);
 assert.equal(s.ledger[0].displayG,0);assert.equal(s.ledger[1].displayG,5);assert.equal(s.ledger[1].parentRevision,1);
 assert.equal(calibrated.calibrationId,'AE100-SYNTHETIC-100G-R1');
});
test('Door/loading/rejection path, optional noise and reading revisions',()=>{
 assert.throws(()=>action(blank(),{type:'vessel'}),/Open/);assert.throws(()=>action(blank(),{type:'tare'}),/settle/);
 assert.throws(()=>action(s,{type:'calibrate'}),/empty/);assert.notDeepEqual(sample(seeded).trace,sample({...seeded,seed:89}).trace);
 const first=apply(blank(),'door','vessel','door','settle','tare');assert.equal(gross(first),2);
 const empty=apply(first,'door','unload','door','settle');assert.equal(empty.measurement.displayG,-2);
 for(const k of ['tare_bar','door_handle','calibrate_handle','display_texture_anchor'])assert.ok(node(k));
});
