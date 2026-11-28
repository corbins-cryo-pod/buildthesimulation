#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dir=path.dirname(fileURLToPath(import.meta.url)), cli=new Map();
if(process.argv.length%2!==0)throw Error('Pass --repo path, --lanes path, and/or --out path.');
for(let n=2;n<process.argv.length;n+=2){if(!['--repo','--lanes','--out'].includes(process.argv[n]))throw Error('Unknown option '+process.argv[n]);cli.set(...process.argv.slice(n,n+2));}
const repo=path.resolve(cli.get('--repo')||path.join(dir,'../../../foundry-atlas-site'));
const lanes=path.resolve(cli.get('--lanes')||path.join(dir,'../../lanes'));
const out=path.resolve(cli.get('--out')||path.join(dir,'index.html'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const orderless=v=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,orderless(v[k])])):Array.isArray(v)?v.map(orderless):v;
const payloadHash=v=>hash(JSON.stringify(orderless(v)));
const json=(f)=>JSON.parse(fs.readFileSync(f,'utf8'));
const publicAt=f=>path.join(repo,'public/equipment',f);
const plainAt=f=>path.join(repo,f);
const fixture=(f)=>json(publicAt(f));
const imported=(p)=>import(pathToFileURL(p).href);
const equipmentPath=path.join(lanes,'equipment.json'), eq=json(equipmentPath);
const ops={'02-01':'contact-litho','02-03':'direct-litho','02-10':'develop','02-11':'handle','04-03':'drie','04-07':'dice','08-01':'ball-bond','08-04':'flip-chip','08-08':'seam-weld','08-09':'leak','10-01':'wave','10-02':'acquire','16-11':'traceability'};
const equipment=Object.fromEntries(Object.entries(ops).map(([k,o])=>{
 const r=eq.records.find(q=>q.id===k);assert(r&&r.operations.includes(o),'Dictionary drift '+k);
 return [k,Object.fromEntries(['id','name','model','url','simulatorUrl','simulationScope','realization','limits','sources'].map(s=>[s,r[s]]))];
}));
const profiles={};
for(const [f,profileIds] of Object.entries({'silicon.json':['si-np1','si-utah'],'flex.json':['flex-ptnr'],'root.json':['scope-lensless-spad','tolstosheeva-flex-rigid']})){
 const list=json(path.join(lanes,f)).profiles;
 for(const id of profileIds){const p=list.find(q=>q.id===id);assert(p,'Missing atlas profile '+id);profiles[id]={id,title:p.title,steps:p.steps.map((s,i)=>({number:i+1,title:s.title,tools:s.tools}))};}
}
const evidence={};
function link(id){return 'https://buildthesimulation.com'+equipment[id].simulatorUrl;}
function siteSource(key,id,file,title,sourcePath='public/equipment/'+id+'/'+file){
 const where=plainAt(sourcePath),href=sourcePath.startsWith('public/')?'https://buildthesimulation.com/'+sourcePath.substring(7):link(id);
 evidence[key]={title,href,station:id,sha256:hash(fs.readFileSync(where))};
}
const assetList={
 dry:['02-11','example-batch.json','02-11 dry queue export'],
 carrier:['16-11','example-custody.json','16-11 dry custody and carrier-rejection export'],
 poster:['04-07','poster-example.json','04-07 detached printed-grid report'],
 trench:['04-03','simulator.astro','04-03 selected fixture and isolated-trench contract','src/pages/simulations/equipment/04-03/simulator.astro'],
 developer:['02-10','solver.mjs','02-10 development model and validation'],
 contact:['02-01','example-result.json','02-01 latent optical dose export'],
 direct:['02-03','example-exposure.json','02-03 commanded exposure export'],
 writer:['02-03','simulator.astro','02-03 modeled field and square sample contract','src/pages/simulations/equipment/02-03/simulator.astro'],
 placement:['08-04','example-placement.json','08-04 dry placement export'],
 placementMath:['08-04','solver.mjs','08-04 geometry-only placement model'],
 seam:['08-08','example-result.json','08-08 complete seam-layout export'],
 leak:['08-09','example-low.json','08-09 low-reference synthetic leak replay'],
 leakModel:['08-09','leak-replay.mjs','08-09 synthetic fixture truth and replay'],
 graph:['08-01','example-assembly.json','08-01 simulated wire connection graph'],
 amp:['10-01','primary-example.json','10-01 simulated primary-output waveform'],
 deliveredAmp:['10-02','multiclamp-input.json','10-02 example input imported from 10-01'],
 adc:['10-02','adc.mjs','10-02 ideal ADC software contract and model']
};
for(const [k,args] of Object.entries(assetList))siteSource(k,...args);
for(const [k,src,id] of [['mla','HEIDELBERG-MLA','02-03'],['nist','NIST-GEN4','02-01']]){
 const s=eq.sources[src];assert(s&&equipment[id].sources.includes(src));evidence[k]={title:s.title,href:s.url,station:id};
}
const fixtureSpecs={
 dry:{file:'02-11/example-batch.json',schema:'bts.dry-wafer-ledger.v1'},
 carrier:{file:'16-11/example-custody.json',schema:'buildthesimulation.wafer-custody.v1'},
 poster:{file:'04-07/poster-example.json',schema:'bts.detached-dot-grid-inspection.v1'},
 direct:{file:'02-03/example-exposure.json',schema:'bts.mla150.exposure.v1'},
 contact:{file:'02-01/example-result.json',schema:'bts.lithography.latent-dose.v1'},
 placement:{file:'08-04/example-placement.json',schema:'bts.flip-chip.placement.v1'},
 seam:{file:'08-08/example-result.json',schema:'bts.package-seam-fit.v1'},
 leak:{file:'08-09/example-low.json',schema:'bts.helium-leak-replay.v1'},
 graph:{file:'08-01/example-assembly.json',schema:'bts.bond-assembly.v1'},
 amp:{file:'10-01/primary-example.json',schema:'bts.analog-waveform.v1'},
 deliveredAmp:{file:'10-02/multiclamp-input.json',schema:'bts.analog-waveform.v1'}
};
const full=Object.fromEntries(Object.entries(fixtureSpecs).map(([k,s])=>{const o=fixture(s.file);assert.equal(o.schema,s.schema,k);return [k,o];}));
const ad=await imported(publicAt('10-02/adc.mjs')), de=await imported(publicAt('02-10/solver.mjs')), fp=await imported(publicAt('08-04/solver.mjs')), dr=await imported(plainAt('src/lib/equipment/04-03/solver.mjs')), le=await imported(publicAt('08-09/leak-replay.mjs'));
const catches=(fn,re)=>{try{fn();}catch(e){assert.match(String(e.message),re);return e.message;}assert.fail('Expected an explicit downstream rejection.');};
assert.deepEqual(full.amp,full.deliveredAmp,'MultiClamp example no longer equals intended ADC input');
const developed=de.develop(full.contact,de.defaults()), volts=ad.acquire({...ad.state(),input:full.amp});
assert.equal(developed.parentRevision,full.contact.revision);assert.equal(developed.sampleId,full.contact.sampleId);
assert.equal(developed.revision,full.contact.revision+1);assert.equal(developed.grid.open.length,full.contact.grid.values.length);assert(developed.metrics.openCells>0);
assert.equal(volts.parentRevision,full.amp.revision);assert.equal(volts.sampleId,full.amp.sampleId);
assert.equal(volts.revision,full.amp.revision+1);assert.equal(volts.channels[0].samples.length,full.amp.channels[0].samples.length);
assert.equal(volts.channels[0].terminal,'AI0');assert(volts.channels[0].overload.every(x=>x===0));
const directRejected=catches(()=>de.develop(full.direct,de.defaults()),/Expected bts\.lithography\.latent-dose\.v1/);
const aliased={...full.direct,schema:full.contact.schema};
const renamedRejected=catches(()=>de.develop(aliased,de.defaults()),/Full circular wafer required/);
const graphRejected=catches(()=>ad.validate(full.graph),/Expected bts\.analog-waveform\.v1/);
const wrongUnits={...full.amp,channels:full.amp.channels.map(x=>({...x,unit:'mV'}))};
const unitRejected=catches(()=>ad.validate(wrongUnits),/require unique IDs, volts, equal lengths and finite samples/);
const wafer200Rejected=catches(()=>dr.simulate({...dr.defaults,waferMm:200}),/waferMm outside educational model range/);
assert.equal(dr.simulate({...dr.defaults,waferMm:150}).inputs.waferMm,150);
function place(defect){
 let s=fp.initial();
 for(const [type,payload] of [['configure',{...fp.defaultPose,defect}],['align'],['optics'],['arm'],['record']])s=fp.action(s,{type,payload});
 return s.placement;
}
const nominal=place(false);
assert.deepEqual(place(true),full.placement);assert.equal(nominal.connections.filter(x=>x.status==='geometric-pass').length,5);
const lowReplayed=le.replay({...le.initial(),blank:le.blank()});
assert.deepEqual(lowReplayed,full.leak);
const records={};
function record(key,title,kind,obj,evidenceIds,make){records[key]={id:key,title,kind,schema:obj.schema,recordSha256:payloadHash(obj),sources:evidenceIds,fields:make(obj)};}
function named(record,id){const w=record.wafers.find(w=>w.id===id);assert(w);return w;}
record('dry200','Dry 200 mm wafer return','wafer-custody',full.dry,['dry'],x=>({id:named(x,'DRY-W01').id,revision:named(x,'DRY-W01').dryRevision,revisionMeaning:'dry transfer only',waferMm:named(x,'DRY-W01').diameterMm,status:named(x,'DRY-W01').status,position:named(x,'DRY-W01').location,fixture:x.fixture.chuck}));
record('custody150','Dry 150 mm wafer in a cassette','wafer-custody',full.carrier,['carrier'],x=>({id:named(x,'W150-01').id,revision:x.ledgerRevision,revisionMeaning:'custody ledger, not material revision',waferMm:named(x,'W150-01').diameterMm,status:'at storage location',position:named(x,'W150-01').siteId,fixture:null}));
record('poster','Printed-grid inspection','detached-grid',full.poster,['poster'],x=>({id:x.posterId,revision:x.revision,spanMm:x.vector.lengthMm,units:x.units}));
record('direct','MLA two-stripe writer export','commanded-dose',full.direct,['direct'],x=>({id:x.sampleId,revision:x.revision,unit:x.grid.units,shape:'Square coupon',sizeMm:x.job.coupon_mm,nx:x.grid.nx,ny:x.grid.ny,frame:x.coordinateFrame.origin}));
record('contact','MA/BA6 aligner export','latent-dose',full.contact,['contact'],x=>({id:x.sampleId,revision:x.revision,unit:x.grid.unit,shape:'Round wafer',sizeMm:x.sample.diameterMm,nx:x.grid.nx,ny:x.grid.ny,frame:x.grid.frame}));
record('rename','Same MLA export, type name changed','commanded-dose',aliased,['direct','developer'],x=>({...records.direct.fields,syntheticEdit:'Only the top-level schema label was edited; no fields, geometry or semantics changed.'}));
const projectPlacement=p=>({...p.sample,revision:p.revision,passing:p.connections.filter(c=>c.status==='geometric-pass').length,total:p.connections.length,failed:p.connections.filter(c=>c.status!=='geometric-pass').map(c=>c.bumpId),bondState:p.bondState});
record('placed4','Fiducial fit with one missing pad','dry-placement',full.placement,['placement'],projectPlacement);
record('placed5','Ideal five-pad overlap','dry-placement',nominal,['placementMath'],projectPlacement);
record('seam','Complete virtual perimeter','seam-layout',full.seam,['seam'],x=>({id:x.sampleId,revision:x.revision,complete:x.complete,percent:x.percent,state:x.state,physicalMeasurement:x.provenance.physicalMeasurement,measuredRate:x.leakTest.measuredRate}));
record('leak','Low synthetic detector reference','synthetic-leak',full.leak,['leak','leakModel'],x=>({id:x.packageId,revision:x.packageRevision,source:x.source,estimate:x.estimatedPaM3S,reference:x.fixture.nominalPaM3S,decision:x.decision,unit:x.units.rate,points:x.samples.length}));
record('wiregraph','Wire-bond continuity graph','connectivity-graph',full.graph,['graph'],x=>({id:x.sampleId,revision:x.revision,edges:x.graph.edges,shorts:x.shorts.length,source:x.source}));
const projectVolts=x=>({id:x.sampleId,revision:x.revision,channels:x.channels.length,unit:x.channels[0].unit,points:x.channels[0].samples.length,dtS:x.dtS,t0S:x.t0S,source:x.provenance.type});
record('volts','MultiClamp primary-output waveform','analog-waveform',full.amp,['amp','deliveredAmp'],projectVolts);
record('wrongUnit','Same numbers, unit changed to mV','analog-waveform',wrongUnits,['amp','adc'],x=>({...projectVolts(x),syntheticEdit:'Only the unit label was edited; no unit conversion was performed.'}));
const panelSource='Generated design-envelope exercise. Dimensions are assumptions, not a published mask, foundry recipe or an inspected carrier.';
function panel(id,title,sideMm,widthMm,heightMm,lineUm,spaceUm,thicknessMm){
 const o={schema:'bts.teaching.pattern-envelope.v1',sideMm,widthMm,heightMm,lineUm,spaceUm,thicknessMm,source:panelSource};
 record(id,title,'planning-envelope',o,['mla','writer'],q=>({...q,id:'Planning fixture',revision:0}));
}
panel('smallRegion','178 mm glass, 12 × 8 mm local footprint',178,12,8,1.2,1.2,null);
panel('wholePanel','178 mm glass, entire panel written',178,178,178,1.2,1.2,null);
panel('narrowSpace','Coupon: 1.4 µm line, 1.0 µm space',10,.7,.4,1.4,1,null);
panel('boundary','150 mm writing exactly at standard limit',150,150,150,1.2,1.2,null);
panel('tinyRegion','10 mm coupon and two-stripe sized footprint',10,1,.5,1.2,1.2,.5);
const proofs={
 developer:{schema:developed.schema,id:developed.sampleId,inputRevision:developed.parentRevision,outputRevision:developed.revision,points:developed.grid.open.length,openCells:developed.metrics.openCells,source:['contact','developer']},
 adc:{schema:volts.schema,id:volts.sampleId,inputRevision:volts.parentRevision,outputRevision:volts.revision,terminal:volts.channels[0].terminal,points:volts.channels[0].codes.length,source:['amp','deliveredAmp','adc']},
 directRejected,renamedRejected,graphRejected,unitRejected,wafer200Rejected
};
const data={dictionary:{repository:eq.snapshot.repo,commit:eq.snapshot.commit,date:eq.snapshot.checked,sha256:hash(fs.readFileSync(equipmentPath))},equipment,profiles,records,evidence,proofs};
const text=(f)=>fs.readFileSync(path.join(dir,f),'utf8');let html=text('page.html');
const inserts={'@@STYLE@@':text('style.css'),'@@ENGINE@@':text('engine.cjs'),'@@UI@@':text('ui.js'),'@@DATA@@':JSON.stringify(data).replaceAll('<','\\u003c').replaceAll('&','\\u0026')};
for(const [k,v] of Object.entries(inserts)){assert.equal(html.split(k).length,2);html=html.replace(k,()=>v);}
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,html);
console.log(JSON.stringify({records:Object.keys(records).length,stations:Object.keys(equipment).length,atlasProfiles:Object.keys(profiles).length,softwareImports:2,provenDirectRejections:5,htmlBytes:Buffer.byteLength(html),sha256:hash(html)}));
