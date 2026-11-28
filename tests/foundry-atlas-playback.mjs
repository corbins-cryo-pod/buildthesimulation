import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import '../scripts/foundry-atlas/atlas-player.js';
const {makePlan,classify}=globalThis.AtlasWorkflowPlayer;
const html=readFileSync(new URL('../public/simulations/foundry/atlas/index.html',import.meta.url),'utf8');
const payload=JSON.parse(html.match(/<script type="application\/json" id="atlas-data">([\s\S]*?)<\/script>/)[1]);
const steps=p=>p.steps.map((x,i)=>({x,i}));
const branches=p=>[undefined,...p.variants];
test('all catalog routes and named branches are mapped to a valid play sequence or an explicit evidence boundary',()=>{
 let plans=0;
 for(const p of payload.profiles)for(const v of branches(p)){
  const r=makePlan(p,v),here=p.id+'/'+(v?.id||'baseline');
  plans++;
  assert(['sequence','branch','boundary'].includes(r.kind),here);
  assert.ok(r.message,here);
  if(!p.steps.length||p.evidence==='out-of-scope'||v?.status==='incompatible'){
   assert.equal(r.kind,'boundary',here);assert.deepEqual(r.steps,[],here);continue;
  }
  if(v){
   const indices=steps(p).filter(({x})=>!x.only?.length||x.only.includes(v.id)).map(({i})=>i);
   assert.deepEqual(r.steps.map(x=>x.index),indices,here);
   assert.equal(r.kind,indices.length?'sequence':'boundary',here);
  }else if(p.steps.some(x=>x.only?.length)){
   assert.ok(r.steps.every(x=>!x.step.only?.length),here);
   if(r.kind==='branch'){assert.notEqual(r.suggested.status,'incompatible',here);assert.ok(p.variants.includes(r.suggested),here);assert.equal(makePlan(p,r.suggested).kind,'sequence',here);}
  }else {assert.deepEqual(r.steps.map(x=>x.index),steps(p).map(({i})=>i),here);}
 }
 assert.equal(plans,payload.profiles.length+payload.profiles.reduce((n,p)=>n+p.variants.length,0));
});
test('known handoffs select appropriate diagram families; proprietary/external boundary wins over action words',()=>{
 for(const [title,status,expected] of [
  ['Accept completed commercial stack','external','boundary'],['Lay out the passive grid','documented','layout'],
  ['Inspect a serpentine coupon','reference','inspect'],['Do not reproduce high pressure lock','reference','boundary'],
  ['Deposit lower parylene','documented','coat'],['Pattern metal leads','documented','expose'],
  ['Open via and perfusion windows','documented','remove'],['Release the temporary substrate','reference','release'],
  ['Bond the flex tail','documented','bond'],['Receive incoming carrier','reference','prepare'],['Independent transfer to next station','reference','handoff'],
 ])assert.equal(classify({title,status}),expected,title);
});
test('every external operation is always a boundary, with original stage index and evidence intact',()=>{
 let boundaries=0;
 for(const p of payload.profiles)for(const v of branches(p)){
  const seq=makePlan(p,v);
  for(const q of seq.steps){assert.equal(q.step,p.steps[q.index]);if(q.step.status==='external'){assert.equal(q.kind,'boundary');boundaries++;}}
 }
 assert.ok(boundaries>0);
});
test('generated atlas includes the source-aware player',()=>{
 assert.ok(html.includes('window.AtlasWorkflowPlayer.create'));
 assert.ok(html.includes('id="workflow-play"'));
 assert.ok(html.includes('prefers-reduced-motion: reduce'));
});
