'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),F=require('./engine.cjs');
const htmlPath=process.argv[2]||path.join(__dirname,'../../../../public/simulations/foundry/tool-fit/index.html'),datapath=process.argv[3]||path.join(__dirname,'../../../../src/data/foundry-atlas/lanes/equipment.json');
const html=fs.readFileSync(htmlPath,'utf8'),db=JSON.parse(html.match(/<script id="equipment-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);let n=0;
const c=(x,y,s)=>{assert.deepEqual(x,y,s);n++;},base=F.base;
c(crypto.createHash('sha256').update(fs.readFileSync(datapath)).digest('hex'),db.dictionarySha256,'dictionary hash');
const source=JSON.parse(fs.readFileSync(datapath,'utf8'));c(db.records.length,199);c(db.records.map(x=>x.id),source.records.map(x=>x.id));
for(const [id,op] of Object.entries(F.expectedOps))c(db.records.find(r=>r.id===id).operations.includes(op),true,id);
const W='within',O='outside',U='unknown';
function ev(id,d){return F.evaluate(db,id,{...base,...d});}
function gate(id,d,layer,title,want){const r=ev(id,d);const g=r[layer].gates.find(x=>x.title===title);c(g?.status,want,[id,layer,title,JSON.stringify(d)].join(' '));}
function pair(id,d,ref,sim){const v=ev(id,d);c([v.reference.status,v.virtual.status],[ref,sim],id+': '+JSON.stringify(d));}
gate('02-03',{pattern:'isolated',feature:1},'reference','Mode II feature rule',W);
gate('02-03',{pattern:'isolated',feature:.999},'reference','Mode II feature rule',O);
gate('02-03',{pattern:'dense',feature:1},'reference','Mode II feature rule',O);
gate('02-03',{pattern:'dense',feature:1.2},'reference','Mode II feature rule',W);
gate('02-03',{size:178,width:150,height:150},'reference','Standard writing field',W);
gate('02-03',{size:178,width:150.01,height:20},'reference','Standard writing field',O);
gate('02-03',{size:178,width:15,height:20},'reference','Installed holder',U);
gate('02-03',{size:178,width:15,height:20},'virtual','Model carrier',O);
gate('02-03',{size:150,width:1,height:.5},'virtual','Full layout in the modeled window',W);
gate('02-03',{size:150,width:1,height:.501},'virtual','Full layout in the modeled window',O);
gate('02-01',{shape:'round',size:150,width:90,height:120},'reference','Circular illumination',W);
gate('02-01',{shape:'round',size:150,width:90,height:121},'reference','Circular illumination',O);
gate('02-01',{shape:'square',size:178,width:.5,height:.5},'reference','Substrate/chuck',U);
gate('02-01',{shape:'round',size:125},'reference','Substrate/chuck',U);
gate('02-01',{shape:'round',size:200},'reference','Substrate/chuck',O);
gate('02-01',{shape:'round',size:100},'reference','Substrate/chuck',W);
gate('02-01',{shape:'round',size:150,pattern:'dense',feature:1},'reference','Dense line/space limit',U);
gate('02-01',{shape:'round',size:150,width:12,height:8},'virtual','Full layout in the modeled window',O);
gate('02-01',{shape:'round',size:150,width:.1,height:.1},'virtual','Printed critical dimension',U);
pair('02-11',{job:'dry',shape:'round',size:200},U,W);pair('02-11',{job:'dry',shape:'round',size:150},U,O);pair('02-11',{job:'dry',shape:'square',size:200},U,O);
pair('02-11',{job:'spin'},W,O);pair('02-07',{job:'spin'},W,W);
pair('04-03',{job:'deep',shape:'round',size:200},O,O);
pair('04-03',{job:'deep',shape:'round',size:150,end:'trench'},W,W);
pair('04-03',{job:'deep',shape:'round',size:150,end:'release'},U,O);
pair('04-03',{job:'deep',shape:'round',size:150,material:'unknown'},U,U);
pair('04-03',{job:'deep',shape:'round',size:150,material:'iii-v'},O,O);
pair('04-02',{job:'deep',shape:'round',size:100},U,O);pair('04-07',{job:'deep'},O,O);
pair('09-01',{job:'eis'},W,W);pair('09-12',{job:'eis'},O,O);
pair('09-01',{job:'plate'},U,O);pair('09-12',{job:'plate'},U,O);
pair('04-12',{job:'bond',shape:'round',size:100,align:'evg610'},W,O);pair('04-12',{job:'bond',shape:'round',size:100,align:'other'},U,O);pair('04-12',{job:'bond',shape:'round',size:200,align:'evg610'},O,O);
pair('08-04',{job:'bond'},U,O);pair('08-08',{job:'seam'},U,W);pair('08-09',{job:'leak'},W,W);
for(const id of ['08-08','08-09','08-10','04-12'])pair(id,{job:'qualify'},U,O);
for(const bad of [null,'',false,'not a number','Infinity',NaN,-1,0])pair('02-03',{width:bad},U,U);
pair('99-99',{},U,U);pair('01-01',{job:'nonsense'},U,U);pair('02-06',{job:'optical'},U,U);pair('14-01',{job:'spin'},U,U);
function drill(){
 let pairs=0,fullyUnknown=0;
 for(const d of F.presets)for(const r of db.records){
  const result=ev(r.id,F.jobState(d.id));assert(result.reference.gates.length&&result.virtual.gates.length);
  for(const layer of [result.reference,result.virtual]){
   assert([W,O,U].includes(layer.status));for(const g of layer.gates){assert(g.reason.length>4&&g.title.length>0);for(const k of g.sourceIds){assert(['geometry','register','sim'].includes(k)||db.sources[k],k);}}
  }
  assert.equal(result.physicalResult,'Not evaluated');assert.equal(result.publicAvailability,'Not evaluated');
  if(!Object.hasOwn(F.expectedOps,r.id))assert.deepEqual([result.reference.status,result.virtual.status],[U,U]);
  if(result.reference.status===U&&result.virtual.status===U)fullyUnknown++;pairs++;
 }
 return {pairs,fullyUnknown};
}
const recheck=drill();console.log(JSON.stringify({assertions:n,presetStationComparisons:recheck.pairs,fullyUnknown:recheck.fullyUnknown,selectableTools:db.records.length,reviewedStationIds:Object.keys(F.expectedOps).length},null,2));
