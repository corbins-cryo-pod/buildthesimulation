/* Digital Process Handoff Bench; finite evidence gate evaluator. */
(function(root,factory){const v=factory();if(typeof module==='object'&&module.exports)module.exports=v;else root.Handoff=v;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const version='1.0.0', M='match', X='incompatible', U='unknown';
const labels={match:'Matches this demand',incompatible:'Incompatible as supplied',unknown:'Not established'};
const cases=[
 {id:'carrier',number:'01',name:'Wafer → fixture',prompt:'A wafer comes back from a dry transfer. Can the next tool actually receive it?',insight:'A 200 mm disc does not become a 150 mm wafer when the job is captured in JSON. A cutting carrier and a storage slot are different. The saw model offers no evidence of cutting.',profiles:['si-np1','si-utah'],artifactIds:['dry200','custody150','poster'],demandIds:['drie','saw-fit','saw-output']},
 {id:'panel',number:'02',name:'Panel → writing field',prompt:'A layout sits on a large glass panel. Which limit constrains the handoff?',insight:'Check the carrier separately from the patterned extent. Dense line width and clear gap are independent. A rated reference limit is not a developed critical dimension.',profiles:['flex-ptnr'],artifactIds:['smallRegion','wholePanel','narrowSpace','boundary','tinyRegion'],demandIds:['reference-field','local-window']},
 {id:'develop',number:'03',name:'Dose map → develop',prompt:'Two optical tools emit a dose map. Do they emit the same record?',insight:'The working handoff preserves substrate shape, grid frame, units, ID and revision. Renaming the schema does not fix the shape or transform the grid.',profiles:['flex-ptnr'],artifactIds:['direct','contact','rename'],demandIds:['developer']},
 {id:'placement',number:'04',name:'Placed die → joint',prompt:'The pads line up after placement. What did the experiment actually establish?',insight:'The documented flip-chip example predicts pad overlap. Even perfect overlap supplies neither electrical continuity nor physical bonding or a sealed joint.',profiles:['scope-lensless-spad','tolstosheeva-flex-rigid'],artifactIds:['placed4','placed5'],demandIds:['geometry','attachment','sealed-assembly']},
 {id:'seal',number:'05',name:'Seam path → leak record',prompt:'The seam path is complete; a reference trace passes. Is this package now tested?',insight:'The perimeter draft, the synthetic detector standard and the physical package are three different evidence objects. A passing standard does not follow a different package by proximity.',profiles:[],artifactIds:['seam','leak'],demandIds:['layout','standard','named-package']},
 {id:'record',number:'06',name:'Connected net → recording',prompt:'A continuity graph has an edge. Does the acquisition model have a signal?',insight:'Connectivity, a finite time series and an end-to-end mapped recording path are different. A correct synthetic voltage file proves software transfer, not live acquisition.',profiles:['si-np1','tolstosheeva-flex-rigid'],artifactIds:['wiregraph','volts','wrongUnit'],demandIds:['adc','graph','recording']}
];
const demands={
 drie:{title:'Enter the 150 mm DRIE witness',station:'04-03',type:'Masked silicon trench input',contract:['150 mm round silicon','Sample + mask/stack + model calibration','Named tool revision'],sources:['trench']},
 'saw-fit':{title:'Establish fit on the cutting carrier',station:'04-07',type:'Cutting carrier fit record',contract:['Wafer ID + diameter','Identified separate cutting carrier','Fixture limits and mounting record'],sources:['poster']},
 'saw-output':{title:'Return individually identified cut pieces',station:'04-07',type:'Wafer singulation receipt',contract:['Parent wafer and mounted carrier','Traceable separated dies','A cutting output, not printed marks'],sources:['poster']},
 'reference-field':{title:'Use the standard Mode II reference',station:'02-03',type:'Field and carrier preflight',contract:['Standard 150 × 150 mm optical field','Dense line and gap ≥ 1.2 µm each','Actual carrier fit remains separate'],sources:['mla']},
 'local-window':{title:'Represent the complete area in the local writer model',station:'02-03',type:'Two-stripe geometry-only check',contract:['Square coupon 6–150 mm','Substrate thickness 0.1–6.3 mm','Local width ≤1 mm, height ≤0.5 mm'],sources:['writer','mla']},
 developer:{title:'Load the downstream Delta12AQ model',station:'02-10',type:'Revisioned latent optical dose grid',contract:['bts.lithography.latent-dose.v1','Round wafer and wafer-centered mJ/cm² grid','Preserved sample ID and revision'],sources:['developer']},
 geometry:{title:'Accept five-pad dry placement geometry',station:'08-04',type:'Geometric placement result',contract:['Five individually matched pads','All geometric statuses pass','No assertion of bonding'],sources:['placementMath']},
 attachment:{title:'Accept a physically attached joint',station:'external',type:'Joint formation and continuity record',contract:['Traceable die and carrier','Formed joint evidence','Continuity / joint integrity measurements'],sources:['placementMath']},
 'sealed-assembly':{title:'Accept a physically sealed assembly',station:'08-08',type:'Sealed package record',contract:['Package identity and revision','Actual sealed package','Separate package-specific leak evidence'],sources:['placementMath','seam']},
 layout:{title:'Accept a complete virtual perimeter',station:'08-08',type:'Seam layout inspection',contract:['Same synthetic package example','Closed 100% layout','No welding or measured leak claim'],sources:['seam']},
 standard:{title:'Replay the named low synthetic standard',station:'08-09',type:'Synthetic detector reference',contract:['VIRTUAL-STD-LOW, rev 1','Synthetic blank + calibration + time series','Decision for the reference alone'],sources:['leak','leakModel']},
 'named-package':{title:'Accept a physical leak result for the laid-out package',station:'08-09',type:'Package-specific physical measurement',contract:['inert-package-rect-01, rev 1','Measured result for the same package','Traceable calibration and acceptance'],sources:['seam','leak']},
 adc:{title:'Load synthetic analog volts into the ADC',station:'10-02',type:'Clocked analog waveform file',contract:['bts.analog-waveform.v1','Unique channel IDs and values in V','Positive time step and stable parent revision'],sources:['adc']},
 graph:{title:'Read the isolated dry continuity graph',station:'08-01',type:'Synthetic connectivity graph',contract:['Named specimen','Pad endpoints and connectivity','No voltage or real continuity claim'],sources:['graph']},
 recording:{title:'Establish an end-to-end recording path',station:'external',type:'Device-to-output acquisition evidence',contract:['Electrode/site → pin → channel map','Timebase and source trace','Identity and acceptance at output'],sources:['graph','amp','adc']}
};
function can(t,name,reason,sources=[]){return {status:t,gate:name,reason,sources};}
const n=x=>typeof x==='number'&&Number.isFinite(x);
const mm=x=>n(x)?x+' mm':'unrecorded', um=x=>n(x)?x+' µm':'unrecorded';
function prove(data,c,a,d){
 const cs=cases.find(x=>x.id===c),r=data.records[a],req=demands[d],p=data.proofs;
 const valid=Boolean(cs&&r&&req&&cs.artifactIds.includes(a)&&cs.demandIds.includes(d));
 const complete=(g)=>({valid,caseId:c,artifactId:a,demandId:d,mode:'digital-only',status:g.some(x=>x.status===X)?X:g.some(x=>x.status===U)||!g.length?U:M,gates:g,notImplied:['Physical fabrication','Equipment ownership or access','Process qualification','Device performance or clinical suitability']});
 if(!valid)return complete([can(U,'Unsupported combination','The lab has no reviewed contract for this artifact and demand.')]);
 const f=r.fields,wafer=r.kind==='wafer-custody';
 let g=[];
 const yes=(t,s,refs)=>g.push(can(M,t,s,refs));
 const no=(t,s,refs)=>g.push(can(X,t,s,refs));
 const ask=(t,s,refs)=>g.push(can(U,t,s,refs));
 const report=(ok,t,s,refs)=> (ok?yes:no)(t,s,refs);
 switch(d){
 case 'drie':
   if(!wafer){no('Physical class','A detached printed-grid report is not a round silicon wafer record.',['poster','trench']);}
   else{
    yes('Dry identity',f.id+' is a '+mm(f.waferMm)+' wafer in the supplied custody record. The handoff reports neither an etch nor a coating.',r.sources);
    if(f.waferMm===150)yes('Selected diameter','This record meets the exact 150 mm geometry of the isolated-trench example.',['trench']);
    else no('Selected diameter',mm(f.waferMm)+' cannot satisfy the fixed 150 mm model. The 200 mm control is rejected by the actual solver.',['trench','dry']);
   }
   ask('Stack and receiving record','A custody record does not establish the masked silicon stack or calibration for this virtual witness. No direct custody-to-DRIE adapter was shown.',['trench']);
   break;
 case 'saw-fit':
   if(wafer){
    yes('Identity and diameter',f.id+' is recorded at '+f.position+' and measures '+mm(f.waferMm)+' in its dry record. This is not a cutting carrier.',r.sources);
    ask('Mounting carrier','An identified cutting carrier, its supported geometry and a mounting record are absent. The saw exhibit does not establish them.',['poster']);
    ask('Workpiece frame','No shared cutting datum between the custody record and the saw’s detached poster was shown.',['poster']);
   }else{
    no('Artifact role','The grid carries poster coordinates, not a wafer or fixture mount. Its millimetres do not turn it into a carrier drawing.',['poster']);
    ask('Qualified mounting record','No traceable cutting carrier or mounted workpiece is represented.',['poster']);
   }
   break;
 case 'saw-output':
   no('Virtual output scope','04-07 exports a detached printed-grid inspection, not separated parts. The selected simulator has no material-separation operation.',['poster']);
   ask('Traceable children','The required list of child dies with parent wafer and revisions is not present. No physical saw performance is inferred.',['poster']);
   break;
 case 'reference-field':
 case 'local-window':{
   const virtual=d==='local-window',side=f.sideMm,w=f.widthMm,h=f.heightMm,line=f.lineUm,gap=f.spaceUm;
   report(w<=side&&h<=side,'Drawing on substrate',mm(w)+' × '+mm(h)+' is compared with the '+mm(side)+' side of the square design envelope.',r.sources);
   if(virtual){
    report(side>=6&&side<=150,'Virtual specimen','The square sample variable admits 6–150 mm. This exercise does not identify a physical chuck.',['writer']);
    if(f.thicknessMm===null)ask('Modeled thickness','The input needs a thickness in the 0.1–6.3 mm virtual range; this envelope does not supply it.',['writer']);
    else report(f.thicknessMm>=.1&&f.thicknessMm<=6.3,'Modeled thickness',mm(f.thicknessMm)+' against a virtual range of 0.1–6.3 mm.',['writer']);
    report(w<=1&&h<=.5,'Local two-stripe extent',mm(w)+' × '+mm(h)+' against a maximum modeled width of 1.0 mm and height of 0.5 mm. This checks extent only, not the sampled pattern.',['writer']);
   }else{
    report(w<=150&&h<=150,'Standard written field',mm(w)+' × '+mm(h)+' against the documented 150 × 150 mm field. The optional 200 mm field is not selected.',['mla']);
    report(line>=1.2,'Dense line width',um(line)+' against a 1.2 µm Mode II minimum for each dense line.',['mla']);
    report(gap>=1.2,'Dense spacing',um(gap)+' against a separate 1.2 µm minimum for each space. It is not combined pitch.',['mla']);
    ask('Installed holder','Published exposure size is not the support envelope. No specific holder, thickness/edge constraint or fixture lock is established from these planning figures.',['writer','mla']);
   }
   break;}
 case 'developer':{
   const target='bts.lithography.latent-dose.v1';report(r.schema===target,'Input schema',r.schema===target?'The type text matches the declared importer. Payload requirements are checked independently.':p.directRejected,['developer',...r.sources]);
   if(a==='contact'){
    yes('Wafer, grid and units','The published 150 mm round-wafer example has an '+f.nx+' × '+f.ny+' wafer-centered grid in mJ/cm².',['contact','developer']);
    yes('Actual virtual receipt','The downstream solver retained '+p.developer.id+' and advanced revision '+p.developer.inputRevision+' → '+p.developer.outputRevision+'. It produced '+p.developer.points.toLocaleString('en-US')+' modeled cells ('+p.developer.openCells+' open), not a developed wafer.',['contact','developer']);
   }else{
    no('Required specimen',a==='rename'?p.renamedRejected:'This export is a '+mm(f.sizeMm)+' square, not a full circular wafer with the required geometry fields.',['direct','developer']);
    no('Coordinate/data contract','MLA encodes commanded dose on its local u/v write window; the downstream model requires the wafer-centered x/y grid and values in its shape. Relabeling does not transform the coordinates.',['direct','developer']);
   }
   break;}
 case 'geometry':
   yes('Scoped record','The export is an identified dry-placement report for die '+f.dieId+' and carrier '+f.carrierId+'.',r.sources);
   report(f.passing===f.total&&f.total===5,'Pad geometry',f.passing+' of '+f.total+' geometrical checks pass'+(f.failed.length?'; missing overlap at pad '+f.failed.join(', '):' on this synthetic fixture')+'.',r.sources);
   break;
 case 'attachment':
 case 'sealed-assembly':
   yes('Tracked geometry',f.passing+' of '+f.total+' dry pad checks pass. This does not establish a joint.',r.sources);
   no('Material state',d==='attachment'?'The emitted state is placement only; it does not attach anything.':'The emitted state is placement only, not a welded or sealed package.',r.sources);
   ask('Independent acceptance',d==='attachment'?'There is no joint-formation or measured continuity/integrity witness for these parts.':'The separate seam tool produces a drawing only. No same-package leak witness or qualified seal is provided.',req.sources);
   break;
 case 'layout':
   report(r.kind==='seam-layout','Typed receipt',r.kind==='seam-layout'?'The station returns a revisioned layout inspection.':'A calibrated reference trace is not a seam layout.',r.sources);
   if(r.kind==='seam-layout')report(f.complete&&f.percent===100,'Layout completeness',f.percent+'% of the example perimeter is covered. The reported state remains layout-inspected-not-welded.',['seam']);
   break;
 case 'standard':
   if(r.kind==='synthetic-leak'){
    yes('Fixture lineage',f.id+' rev '+f.revision+' is the named synthetic reference. It is not a package measurement.',['leak']);
    report(f.decision==='pass','Recorded decision','The exported simulated decision is '+f.decision+' from '+f.points+' time points, with a synthetic blank and fixture uncertainty.',['leak','leakModel']);
   }else{
    no('Record type and fixture','A seam layout contains neither the named reference standard nor its time series, blank and calibration.',['seam','leak']);
   }
   break;
 case 'named-package':
   if(r.kind==='seam-layout'){
    yes('Package design identity',f.id+' rev '+f.revision+' identifies the laid-out example only.',['seam']);
    no('Measurement class','The report explicitly says “layout inspected, not welded” and has no measured leak value.',['seam']);
   }else{
    no('Package lineage',f.id+' rev '+f.revision+' is a different specimen from inert-package-rect-01 rev 1. Matching revision numbers are not matching identity.',['seam','leak']);
    no('Measurement class','The detector reference is simulated. Its pass decision cannot be promoted to a physical package test.',['leak','leakModel']);
   }
   ask('Physical acceptance','No traceable measurement of the same identified package and process state is supplied.',['leak']);
   break;
 case 'graph':
   if(r.kind==='connectivity-graph'){
    yes('Graph identity',f.id+' rev '+f.revision+' has '+f.edges.length+' simulated mapped edge and '+f.shorts+' simulated short flags.',['graph']);
    yes('Scope','This requests continuity topology only, not measured conductance, sampled voltage or a recording.',['graph']);
   }else no('Wrong artifact class','A clocked voltage trace is not a pad-to-pad connectivity graph.',['amp','graph']);
   break;
 case 'adc':
   report(r.kind==='analog-waveform','Input schema',r.kind==='analog-waveform'?'The top-level type matches the ADC waveform importer.':p.graphRejected,['adc',...r.sources]);
   if(a==='volts'){
    yes('Voltage and clock',f.channels+' voltage channel, '+f.points+' points at Δt = '+f.dtS+' s.',['amp','adc']);
    yes('Actual virtual receipt',p.adc.id+' passed through the modeled '+p.adc.terminal+' input; revision '+p.adc.inputRevision+' → '+p.adc.outputRevision+' produced '+p.adc.points+' signed codes.',['amp','deliveredAmp','adc']);
   }else if(a==='wrongUnit'){
    no('Voltage units',p.unitRejected+' This counterfactual merely replaces the unit text with mV.',['adc']);
   }else{
    no('No voltage or time base','Edges and pad IDs are not voltage samples; the continuity export has no sample clock.',['graph','adc']);
   }
   break;
 case 'recording':
   if(r.kind==='connectivity-graph'){
    yes('Dry topology','The graph establishes idealized connectivity only.',['graph']);
    no('Signal content','The graph contains no time series or converted recording samples.',['graph','adc']);
   }else if(a==='wrongUnit'){
    no('Signal content',p.unitRejected,['adc']);
   }else yes('Synthetic input','A simulated amplifier sample and timing are present. This does not present a measured device input.',['amp','adc']);
   ask('End-to-end mapping','No shared electrode/site, fixture pin, acquisition channel and acceptance record closes this path. A test waveform does not certify an end-to-end recording.',['graph','amp','adc']);
   break;
 }
 return complete(g);
}
return {version,labels,cases,demands,prove};
});
