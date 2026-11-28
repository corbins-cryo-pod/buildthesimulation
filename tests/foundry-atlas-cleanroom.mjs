import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import '../scripts/foundry-atlas/atlas-cleanroom.js';
import '../scripts/foundry-atlas/atlas-player.js';
const {makePlan}=globalThis.AtlasWorkflowPlayer;
const {makeScenes}=globalThis.AtlasCleanroomScenes;
const html=readFileSync(new URL('../public/simulations/foundry/atlas/index.html',import.meta.url),'utf8');
const data=JSON.parse(html.match(/<script type="application\/json" id="atlas-data">([\s\S]*?)<\/script>/)[1]);
const routes=new Map(data.profiles.map(x=>[x.id,x])),tools=new Map(data.equipment.map(x=>[x.id,x]));
const all=(p,v)=>makeScenes(p,v,makePlan(p,v).steps,k=>tools.get(k));
const route=(id,branch)=>{const p=routes.get(id);return all(p,p.variants.find(v=>v.id===branch));};
const ids=item=>item.stations.map(s=>s.equipmentId||'boundary');
const shots=(id,branch)=>route(id,branch).flatMap(x=>x.stations);

test('every atlas stage retains its branch scope and uses only actual, explicitly cited register candidates',()=>{
 let n=0,boundaries=0;
 for(const p of data.profiles)for(const v of [undefined,...p.variants]){
  const stages=all(p,v),scope=p.id+'/'+(v?.id||'baseline');
  if(v?.status==='incompatible'||p.evidence==='out-of-scope')assert.deepEqual(stages,[],scope);
  for(const item of stages){
   assert.equal(item.step,p.steps[item.index],scope);
   if(v&&item.step.only?.length)assert.ok(item.step.only.includes(v.id),scope);
   assert.ok(item.stations.length,scope);
   for(const s of item.stations){
    n++;
    assert.ok(['fabrication','inspection','handoff','test','unknown'].includes(s.kind),scope);
    assert.ok(s.operation&&s.machine&&s.before&&s.after&&s.specimen&&s.evidence&&s.transferFrom,scope);
    assert.ok(s.settings.every(pair=>typeof pair[0]==='string'&&typeof pair[1]==='string'),scope);
    if(s.equipmentId){
     assert.ok(tools.has(s.equipmentId),scope);
     assert.ok(item.step.tools.includes(s.equipmentId),scope);
    }
    if(item.step.status==='external'||item.kind==='boundary'){assert.equal(s.kind,'unknown',scope);boundaries++;}
    if(s.kind==='unknown'){assert.equal(s.equipmentId,undefined,scope);assert.equal(s.effect,'none',scope);assert.equal(s.nonphysical,true,scope);}
   }
  }
 }
 assert.ok(n>1200,n);assert.ok(boundaries>200,boundaries);
});

test('Neuropixels 1.0 never routes 200 mm product wafers into local stations; 100 mm and 150 mm scenes restart with independent holders',()=>{
 assert.deepEqual(route('si-np1','dummy'),[]);
 for(const branch of ['production','paper']){
  const p=route('si-np1',branch);
  for(const step of [1,2,4,5]){
   const stage=p.find(x=>x.index===step-1).stations[0];
   assert.equal(stage.equipmentId,undefined);
   assert.match(stage.specimen,/200 mm/);
  }
  const independent=p.find(x=>x.index===5).stations.filter(s=>s.equipmentId==='04-02'||s.equipmentId==='04-03');
  assert.deepEqual(independent.map(s=>[s.equipmentId,s.workpieceShape,s.sizeMm,s.independent]),[['04-02','wafer',100,true],['04-03','wafer',150,true]]);
  assert.ok(independent.every(s=>s.transferFrom.includes('no physical transfer')));
  const small=p.find(x=>x.index===2).stations;
  assert.ok(small.every(s=>s.workpieceShape==='die'));
  assert.match(JSON.stringify(p[2]),branch==='paper'?/70 × 20/:/70 × 24/);
  assert.doesNotMatch(JSON.stringify(p[5]),/Selected probe geometry/);
 }
});

test('PtNRGrid preserves its two same-intent Cr/Au passes, protected scale and off-carrier dealloy ordering',()=>{
 const p=route('flex-ptnr','wide');
 assert.deepEqual(route('flex-ptnr','panel'),[]);
 assert.equal(p[0].stations[0].kind,'unknown');
 assert.match(p[0].stations[0].specimen,/180 mm/);
 assert.deepEqual(ids(p[1]),['02-03','03-01','04-06','02-03','03-01','04-06']);
 const writer=p[1].stations.filter(s=>s.equipmentId==='02-03');
 assert.deepEqual(writer.map(s=>s.sizeMm),[10,10]);
 assert.ok(writer.every(s=>s.workpieceShape==='die'));
 const done=p[4].stations;
 assert.match(done[1].operation,/Release/);assert.equal(done[1].outgoingShape,'film');
 assert.match(done[2].operation,/silver/);assert.match(done[2].after,/Porous Pt-rich/);
 assert.match(JSON.stringify(done),/2,048-site grid/);
 assert.notEqual(p[0].stations[0].specimen,writer[0].specimen);
});

test('manual B/C/parallel tracks and passive versus OECT never share a forbidden station sequence',()=>{
 const p=(r,v)=>route(r,v).map(x=>x.index+1),b='tolstosheeva-connector-coupons';
 assert.deepEqual(p(b,'b'),[1,3,4]);
 assert.deepEqual(p(b,'c'),[2,3,4]);
 assert.deepEqual(p(b,'tri'),[5]);
 assert.equal(shots(b,'b').some(s=>s.equipmentId==='04-01'),false);
 assert.equal(shots(b,'c').some(s=>s.equipmentId==='04-01'),true);
 assert.equal(shots(b,'tri').length,1);
 assert.deepEqual(p('flex-neurogrid','active'),[6]);
 assert.ok(shots('flex-neurogrid','passive').every(s=>!s.specimen.includes('OECT coupon')));
 assert.match(shots('flex-neurogrid','active')[0].specimen,/source\/drain\/gate/);
});

test('ranked fallback declines an unsupported manufacturing assignment instead of turning a microscope into an etcher',()=>{
 const r=globalThis.AtlasCleanroomScenes.candidate;
 const s=r({title:'Open the polymer contact sites',detail:'Remove the polymer locally at metal site windows.',tools:['02-12']},'remove');
 assert.equal(s.effect,'measure');assert.equal(s.kind,'inspection');assert.equal(s.unmapped,true);
 const design=r({title:'Define the pad map',detail:'Compare connectivity',tools:['01-01','05-07']},'layout');
 assert.equal(design.id,'01-01');
 assert.ok(shots('si-np2','four').find(s=>s.equipmentId==='01-01').nonphysical);
});
