/* Tool Fit Bench: finite, evidence-bound comparisons; no machine commands. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ToolFit=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const version='1.0.0', W='within', O='outside', U='unknown';
const labels={within:'Within compared gates',outside:'Outside this configuration',unknown:'Not established'};
const jobs={
 optical:'Optical lithography: field, carrier and feature',dry:'Dry wafer handling',spin:'Apply a resist coating',
 deep:'Silicon DRIE: trench or release',eis:'Acquire impedance with an instrument',plate:'Deposit an electrode by electroplating',
 bond:'Aligned wafer-to-wafer bonding',seam:'Inspect a package seam path',leak:'Review a calibrated leak trace',qualify:'Establish that a physical package is hermetic'
};
const base={job:'optical',shape:'square',size:178,width:12,height:8,feature:2,pattern:'isolated',method:'either',material:'si',end:'trench',align:'unknown'};
const presets=[
 {id:'panel',label:'PtNR glass: local layout on a large panel',a:'02-03',b:'02-01',state:{},note:'A nominal 178 mm square carrier does not imply a 178 mm written footprint. Check both, and keep the chuck separate.'},
 {id:'fullpanel',label:'Same glass, edge-to-edge square field',a:'02-03',b:'02-01',state:{width:178,height:178},note:'Here the layout itself really is larger than the writer’s standard field. An optional larger field is not installed by assumption.'},
 {id:'dense',label:'Mode II: 1.0 µm dense lines and spaces',a:'02-03',b:'02-01',state:{size:10,width:.5,height:.2,feature:1,pattern:'dense'},note:'An isolated printed feature and a dense line/space pair have different documented limits. The input is each line width and each gap, not their sum.'},
 {id:'fixture',label:'150 mm disc presented to a 200 mm dry dock',a:'02-11',b:'02-03',state:{job:'dry',shape:'round',size:150},note:'The dry cassette/chuck at 02-11 is configured for a 200 mm disc. The product family name is not a fixture change.'},
 {id:'coat',label:'Dry handling versus a virtual spin-coat map',a:'02-11',b:'02-07',state:{job:'spin'},note:'Transferring a wafer in a coating platform does not create a new film revision.'},
 {id:'probe',label:'Neuropixels: incoming 200 mm silicon wafer',a:'04-03',b:'04-02',state:{job:'deep',shape:'round',size:200},note:'A six-inch silicon DRIE witness is not a tooling solution for the full incoming wafer. The 100 mm ICP calibration is a different experiment.'},
 {id:'trench',label:'150 mm silicon: dry etch versus a blade saw',a:'04-03',b:'04-07',state:{job:'deep',shape:'round',size:150},note:'A calibrated isolated trench is not a prediction of complete device release; a dicing blade is not a deep plasma etcher.'},
 {id:'plate',label:'Electrode coating: potentiostat versus test cell',a:'09-01',b:'09-12',state:{job:'plate'},note:'A current source and a three-electrode fixture are not a documented plating line. Change the question to impedance acquisition to see the difference.'},
 {id:'bond',label:'Silicon bonding: bonder versus placement tool',a:'04-12',b:'08-04',state:{job:'bond',shape:'round',size:100,align:'evg610'},note:'The 100 mm example with the companion EVG610 comes from one named facility. It is not a specification for every EVG501 or access to one.'},
 {id:'seal',label:'Seal integrity: seam reviewer versus leak replay',a:'08-08',b:'08-09',state:{job:'qualify'},note:'A complete path and a simulated detector reading are separate pieces of evidence. Neither tests the package in your hand.'}
];
const expectedOps={'02-01':'contact-litho','02-03':'direct-litho','02-07':'coat','02-11':'handle','04-02':'rie','04-03':'drie','04-07':'dice','04-12':'wafer-bond','08-04':'flip-chip','08-08':'seam-weld','08-09':'leak','08-10':'encapsulate','09-01':'echem','09-12':'electrical-fixture'};
const operations={optical:['contact-litho','direct-litho','stepper'],dry:['handle'],spin:['coat'],deep:['drie','rie','dice'],eis:['echem'],plate:[],bond:['wafer-bond','flip-chip'],seam:['seam-weld'],leak:['leak'],qualify:[]};
function num(v){if(typeof v==='string'&&!/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(v.trim()))return null;
 if(typeof v!=='number'&&typeof v!=='string')return null;const n=Number(v);return Number.isFinite(n)&&n>0?n:null;}
function check(shape,d,fields){const missing=[];for(const f of fields){if(f==='shape'){if(!['square','round'].includes(shape))missing.push('sample shape');}else if(!num(d[f]))missing.push(f+' (positive finite number)');}return missing;}
const included=(v,...l)=>l.includes(v);
function collate(gates){return {status:gates.some(g=>g.status===O)?O:gates.some(g=>g.status===U)||!gates.length?U:W,gates};}
function evidence(record,tag){
 const src=record.sources||[];if(tag==='sim'||!tag)return [tag||'register'];
 if(tag==='register'||tag==='geometry')return [tag];return src.includes(tag)?[tag]:['register'];
}
function evaluate(db,id,d){
 const r=db.records.find(x=>x.id===id);let reference=[],virtual=[];
 const gate=(t,status,title,reason,src)=>t.push({status,title,reason,sourceIds:r?evidence(r,src):[]});
 const ref=(s,t,x,src)=>gate(reference,s,t,x,src), sim=(s,t,x)=>gate(virtual,s,t,x,'sim');
 const unknown=(msg)=>{ref(U,'Evidence boundary',msg,'register');sim(U,'No established comparison',msg);};
 const finish=()=>({toolId:id,job:d?.job||null,reference:collate(reference),virtual:collate(virtual),physicalResult:'Not evaluated',publicAvailability:'Not evaluated'});
 if(!r){unknown('No equipment record with this ID.');return finish();}
 if(!d||!Object.hasOwn(jobs,d.job)){unknown('No rule was defined for this question.');return finish();}
 if(expectedOps[id]&&!r.operations.includes(expectedOps[id])){unknown('The dictionary no longer matches the rule. Recheck the source before comparing.');return finish();}
 const size=num(d.size),width=num(d.width),height=num(d.height),feature=num(d.feature),square=d.shape==='square';
 const fields=d.job==='optical'?['shape','size','width','height','feature']:included(d.job,'dry','deep','bond')?['shape','size']:[];
 const invalid=check(d.shape,d,fields);
 if(d.job==='optical'&&(!included(d.method,'either','direct','contact')||!included(d.pattern,'isolated','dense')))invalid.push('optical method or feature type');
 if(d.job==='deep'&&(!included(d.end,'trench','release')||!included(d.material,'si','iii-v','unknown')))invalid.push('material or end state');
 if(d.job==='bond'&&!included(d.align,'evg610','unknown','other'))invalid.push('companion aligner');
 if(invalid.length){unknown('Enter a valid '+invalid.join(', ')+'. No assessment was made.');return finish();}
 if(d.job==='optical'&&included(id,'02-01','02-03')){
   const direct=id==='02-03',key=direct?'HEIDELBERG-MLA':'NIST-GEN4';
   const method=direct?'direct':'contact', right=d.method==='either'||d.method===method;
   ref(right?W:O,'Exposure method',direct?'02-03 is direct write, 405 nm, Mode II. It does not install Mode I.':'02-01 is the NIST-referenced contact/proximity mask aligner, not maskless direct write.',key);
   sim(right?W:O,'Exposure method',direct?'Two adjacent commanded-dose stripes.':'Rigid alignment plus a local contact/proximity dose map.');
   const diag=Math.hypot(width,height),fits=square?Math.max(width,height)<=size:diag<=size;
   ref(fits?W:O,'Layout on the sample',square?'A centered rectangular footprint must not exceed either side of the square sample.':'For a centered rectangle with all four corners occupied, its diagonal must not exceed the disc diameter.','geometry');
   sim(fits?W:O,'Layout on the sample',fits?'The entered footprint is geometrically inside the specified sample.':'The requested rectangle does not fit the entered sample.');
   if(direct){
     const lim=d.pattern==='dense'?1.2:1;
     ref(feature>=lim?W:O,'Mode II feature rule',d.pattern==='dense'?'Mode II specifies each dense line and each adjacent space at 1.2 µm minimum, not a 1.2 µm pitch.':'Mode II specifies 1.0 µm minimum feature size. This is not a resist/process guarantee.',key);
     ref(width<=150&&height<=150?W:O,'Standard writing field','Compare the written width and height with 150 × 150 mm. The optional 200 × 200 mm field is not selected.',key);
     ref(U,'Installed holder','The written-field limit does not determine fixture fit. Confirm the actual chuck, shape, thickness and edge constraints for this carrier.','register');
     sim(square&&size>=6&&size<=150?W:O,'Model carrier','The local teaching model accepts a square coupon 6–150 mm on a side; it does not represent every supported physical carrier.');
     sim(width<=1&&height<=.5?W:O,'Full layout in the modeled window','Maximum local two-stripe window: 1.0 mm along x and 0.5 mm along y. A smaller area can be a witness for a larger design, not the entire design.');
   }else{
     if(d.pattern==='dense')ref(U,'Dense line/space limit','NIST reports 1 µm print resolution, not a separate dense-line/space limit for this case.',key);
     else ref(feature>=1?W:O,'Printed feature','The documented NIST configuration reports 1 µm print resolution.',key);
     const diaLimit=square?U:(size>150?O:([75,100,150].includes(size)?W:U));
     ref(diaLimit,'Substrate/chuck',square?'NIST lists small pieces and round wafers, not a maximum supported square panel. Confirm the actual holder; the 178 mm mask specification is not a substrate specification.':'NIST lists 75, 100 and 150 mm wafers. A diameter above 150 mm is outside this installation; another intermediate diameter needs a tooling record.',key);
     ref(diag<=150?W:O,'Circular illumination','For this centered rectangular pattern, compare its corner-to-corner diagonal with the 150 mm illuminated diameter.',key);
     sim(!square&&size===150?W:O,'Model carrier','The local simulator fixes a 150 mm circular wafer. Mask size is not substrate size.');
     sim(width<=1.28&&height<=1.28?W:O,'Full layout in the modeled window','Only a 1.28 × 1.28 mm region is rasterized, not the whole wafer.');
   }
   sim(U,'Printed critical dimension','A commanded or latent dose map is not a measured developed feature. This model does not validate the entered critical dimension.');
 }else if(d.job==='dry'&&id==='02-11'){
   ref(U,'Specific physical dock','Platform tooling varies. The 200 mm dock is the configuration selected by the virtual register, not evidence of hardware access or its actual fitted cassette.','register');
   sim(!square&&size===200?W:O,'Dry dock geometry','The model matches only a 200 mm round disc to this cassette/chuck; no fixture change or film change is simulated.');
 }else if(d.job==='spin'&&included(id,'02-11','02-07')){
   ref(W,'Registered operation','The equipment dictionary maps this station to resist coating. This identifies a role, not a lot-specific material, chuck or process qualification.','register');
   sim(id==='02-07'?W:O,'Virtual output',id==='02-07'?'02-07 calculates a bounded AZ 1512 example map; an arbitrary formulation or material is not asserted.':'02-11 moves dry IDs between poses and produces no deposited film.');
 }else if(d.job==='deep'&&included(id,'04-03','04-02','04-07')){
   if(id==='04-03'){
     const material=d.material==='unknown'?U:d.material==='si'?W:O;
     ref(material,'Etch family',d.material==='iii-v'?'Other Cobra installations do process III–V. That does not transfer a III–V process into this selected silicon configuration.':'The selected silicon DRIE configuration must not be conflated with differently equipped Cobra chambers.',d.material==='iii-v'?'UCSB-COBRA-III-V':'MCR-COBRA-SI');
     ref(!square&&size===150?W:O,'Selected carrier','Compare with the specific six-inch-class (150 mm nominal) silicon-wafer reference, not a maximum across all Cobra variants.','sim');
     ref(d.end==='release'?U:W,'End state',d.end==='release'?'A through-release includes stop layers, carriers and final separation; this register does not establish a complete release process.':'Isolated trench formation is the documented operation; process depth and outcome are not checked.','register');
     sim(material,'Material','Only silicon is modeled. Unknown material is not silently treated as silicon.');
     sim(!square&&size===150?W:O,'Fixture','The model input is exactly a 150 mm round wafer.');
     sim(d.end==='trench'?W:O,'Trench is not release','The engine models one isolated trench with supplied calibration; full breakthrough/release is outside its accepted geometry.');
   }else if(id==='04-02'){
     ref(U,'ICP is not a DRIE process record','The register identifies an ICP/RIE station. It does not establish the requested Bosch deep-etch process for this configuration.','register');
     sim(!square&&size===100?W:O,'Fixture','This experiment fixes a 100 mm circular wafer.');
     sim(O,'Different experiment','The bounded ZEP/Si/SiO₂ ICP profile is not the requested deep Bosch trench or release model.');
   }else{
     ref(O,'Different operation','04-07 is a blade dicing saw, not a deep plasma etcher. Separation as an end goal does not make these mechanisms interchangeable.','register');
     sim(O,'Different experiment','04-07 reviews a printed grid. It does not simulate Bosch etching or physical singulation.');
   }
 }else if(included(d.job,'plate','eis')&&included(id,'09-01','09-12')){
   const meter=id==='09-01';
   if(d.job==='plate'){
     ref(U,'Deposition line not established',meter?'EIS capability does not establish a plating bath, compatible fixture, material process or qualified deposition line.':'This passive test-cell record establishes no deposition protocol or plated-material acceptance.','register');
     sim(O,'No deposition',meter?'The simulated passive-cell EIS/CV output is not a deposited electrode.':'The model calculates a passive fixture/circuit; it does not deposit a coating.');
   }else{
     ref(meter?W:O,'Instrument versus cell',meter?'Gamry documents EIS on the Reference 600+. A compatible cell and fixture are still needed.':'A three-electrode fixture is not a standalone impedance acquisition instrument.',meter?'GAMRY-600':'register');
     sim(meter?W:O,'Impedance instrument',meter?'09-01 calculates an ideal passive circuit. This compares the instrument role, not a measured device spectrum.':'The cell can supply circuit data and a synthetic response, but is not the standalone acquisition instrument in this comparison.');
   }
 }else if(d.job==='bond'&&included(id,'04-12','08-04')){
   if(id==='04-12'){
     ref(square?U:size>100?O:W,'Named facility configuration','AggieFab lists wafers to 100 mm and smaller pieces; an arbitrary shaped part or unlisted fixture still needs confirmation. No family-wide limit is implied.','AGGIE-EVG');
     ref(d.align==='evg610'?W:U,'Alignment handoff',d.align==='evg610'?'AggieFab explicitly names its EVG610 companion aligner. This does not verify the actual alignment of a sample.':'AggieFab names its EVG610. No adapter or transfer alignment has been established for this selection.','AGGIE-EVG');
     sim(O,'No wafer bond is modeled','The EVG501 register simulator displays a separate area drawing. It does not produce aligned or joined wafers.');
   }else{
     ref(U,'Different documented role','A flip-chip placement record does not establish the requested aligned wafer-to-wafer bond.','register');
     sim(O,'Dry placement only','Fiducial alignment and pad overlap do not form a wafer bond.');
   }
 }else if(included(d.job,'seam','leak','qualify')&&included(id,'08-08','08-09','08-10','04-12')){
   if(d.job==='qualify'){
     ref(U,'No package test evidence','No identified physical package, test conditions, acceptance criterion or traceable test result was supplied.','register');
     sim(O,'No physical certification','A perimeter outline, synthetic leak trace, deposited-volume proxy or bonding exhibit cannot certify a physical seal.');
   }else if(id==='08-08'&&d.job==='seam'){ref(U,'Model not locked','The welding workstation model is pending; a path review is not a report of a physical weld.','register');sim(W,'Seam-path review','08-08 checks a passive perimeter drawing for coverage. Real weld formation and leaks are not observed.');}
   else if(id==='08-09'&&d.job==='leak'){ref(W,'Registered role','08-09 is the registered helium leak detector, distinct from seam creation. No physical sample result follows.','register');sim(W,'Trace review','The HLT160 model replays a synthetic trace with blank and uncertainty. It does not test a physical package.');}
   else{ref(U,'Different registered role','This record is not evidence for the requested comparison.','register');sim(O,'Different virtual output',r.simulationScope+'; this does not produce the requested output.');}
 }else{
   const overlaps=(operations[d.job]||[]).some(x=>r.operations.includes(x));
   unknown(overlaps?'The broad operation family overlaps, but no source-specific gate for this tool and request has been encoded.':'No documented rule connects this tool to this request. Absence of a rule is not evidence that every configuration is impossible.');
 }
 return finish();
}
function jobState(id){const p=presets.find(p=>p.id===id);return p?{...base,...p.state}:null;}
return {version,labels,jobs,base,presets,expectedOps,jobState,evaluate};
});
