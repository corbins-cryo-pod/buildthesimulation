/* Dual-route passive-electrode / OECT teaching model. */
((global)=>{
'use strict';
const docs={
 passive:{title:'Khodagholy et al. · NeuroGrid (2015)',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC4308485/',doi:'10.1038/nn.3905',scope:'Figure 1, Results and Online Methods, Probe fabrication and characterization. Establishes passive 256-contact geometry, 4 µm encapsulated film, metal stack and polymer recording surface.'},
 oect:{title:'Khodagholy et al. · organic electrochemical transistors (2013)',url:'https://www.nature.com/articles/ncomms2573.pdf',doi:'10.1038/ncomms2573',scope:'Figures 1 and 2, Structure and Methods. Establishes separate Au terminals, PEDOT:PSS channel, patterned parylene passivation, and an external electrode immersed in electrolyte as gate.'},
 elements:{title:'Khodagholy et al. · high-transconductance OECTs (2013)',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC3717497/',doi:'10.1038/ncomms3133',scope:'Figure 1 and device physics support the distinction between ionic gating and electron/hole conduction; not a source for this model’s numerical constants.'}
};
const tools={'01-01':'Mask / CAD reference','02-02':'MJB3 aligner · not MJB4','02-06':'Projection stepper · not GCA','02-07':'Spin coater','02-12':'Reflectance microscope','03-01':'E-beam evaporation','03-08':'SCS Labcoter 2 reference','04-01':'RIE operation class','04-06':'Wet bench reference','05-01':'Profilometer','05-07':'Manual probe station','08-10':'Adhesive dispensing reference','09-01':'Potentiostat','09-02':'Parameter analyzer · independently verify SMU count','09-03':'Single SMU · not the dual instrument','09-12':'Inert cell reference','12-01':'Stereo microscope','16-11':'Carrier handling','16-13':'Connector references'};
const mk=(title,desc,check,equipment,basis='Published architecture')=>({title,desc,check,equipment:equipment.split(' ').filter(Boolean),basis});
const passive=[
 mk('Define the passive array and film','The 2015 paper describes a 256-site version with 10 × 10 µm sites, reported 30 µm separation and a finished film about 4 µm thick. The centered 16 × 16 patch treats spacing as center pitch. Full outline, tails, pins and routing artwork are not recovered.','Count 256 physical contacts; the bath reference is an external measurement reference, not an additional recording site.','01-01 16-11'),
 mk('Form the lower parylene carrier film','The Online Methods describe 2 µm of parylene C and contrasting adhesion and anti-adhesion interfaces. The actual substrate holder, layer-specific treatment and release tolerances are not specified in this teaching route.','Keep temporary carrier, release interface and finished polymer separate. No silicon-device circuitry is implied.','03-08 05-01 16-11'),
 mk('Pattern the site-to-pad conductor','Projection lithography, metal deposition and lift-off produce the local Ti/Pt/Au stack (10/150/50 nm in Methods). Authors name a GCA i-line stepper and a CVC evaporator; our tools are analogous classes only.','Each contact gets one isolated conductor. A connector pin, metal trace and exposed PEDOT:PSS surface are not the same object.','02-06 03-01 05-07'),
 mk('Encapsulate the conductor and define the window','The published thin film encapsulates metal with parylene or PEDOT:PSS and locates the metal near its mechanical neutral plane. The remaining nominal film thickness in the drawing is an explanatory split, not an additional measurement.','An intended window sits over the polymer-coated site only. Insulated feedthrough regions keep the metal out of the bench liquid.','03-08 04-01 02-12'),
 mk('Complete the PEDOT:PSS site','The mixed-conducting polymer is the exposed surface of a passive electrode, not a gate-controlled channel. Trace and bonding pad overlap are schematic; the sequence tracks material states rather than reproducing mask and process specifications.','An exposed square maps to one lead. A covered electrode, exposed interconnect and an open trace are different failure modes.','02-07 02-12 05-07'),
 mk('Release and label a film coupon','The adhesion contrast and released thin film are described by the authors; this stage represents the completed handoff without claiming cartridge, release or cable details.','Retain insulated traces after release. Associate fabricated site, pad and virtual output IDs only where the model explicitly defines them.','04-06 12-01 16-13','Process reconstruction'),
 mk('Check dry continuity and isolation','Inspect the virtual conductor graph and external reference separately. A neighboring-net bridge is not two good signals, even if each terminal conducts. This is logical inspection, not a measurement through the passivation.','Pull apart open, covered, shorted, reference-open and leakage cases before interpreting an AC measurement.','05-07 02-12 16-13','Synthetic check'),
 mk('Run inert small-signal impedance','A passive site can be represented by series resistance plus a parallel RC interface in an inert cell. Frequency, magnitude and phase are reported, but there is no gate voltage, transconductance or amplification here.','Report modeled |Z| and phase only for isolated, wet, connected contacts with a reference. No measured sample or device-level acceptance limit is presented.','09-01 09-12','Synthetic check')
];
const oect=[
 mk('Define a different research architecture','The 2013 probe is a separate platform, with 17 OECTs and eight 12 × 12 µm passive electrodes. Each transistor has a 6 µm channel length and 15 µm width. This bench selects one transistor, not the complete connector.','Label source, drain, conducting polymer channel and a separate electrolyte gate. Eight passive sites are not eight extra gate terminals.','01-01 16-11'),
 mk('Form the parylene substrate','Figure 1 and Methods use a nominal 2 µm lower parylene C film. The handling carrier and its release geometry are not reconstructed in this view.','Do not reuse the NeuroGrid mask or the Pt-containing metal stack. Similar substrate materials do not imply an interchangeable process.','03-08 05-01'),
 mk('Pattern separate source and drain leads','The paper reports contact lithography and 5 nm Ti / 100 nm Au. The two metal leads remain separate across the gap where the channel will be formed; no on-film Au gate is assumed.','Verify a gap between source and drain metal before the polymer bridge. The published SUSS MJB4 is not the register MJB3.','02-02 03-01 02-12'),
 mk('Place a polymer bridge, not a single pad','The PEDOT:PSS patch contacts both terminals and forms a 6 × 15 µm channel. Its shape in the plate illustrates a conduction path across an otherwise insulating gap, not an exact mask drawing. Figure 1 uses a nominal 200 nm PEDOT:PSS figure legend.','Only this bridge provides the intended electronic path. A direct S–D metal short bypasses gating.','02-07 02-12 05-07'),
 mk('Insulate the feedthrough and open the channel','The 2 µm upper parylene separates the bath from the gold wiring while the polymer channel exchanges ions with the bath. “Feedthrough” here means the flat insulated lead crossing the wet/dry boundary, not a hermetic metal/ceramic package.','The channel window must leave the gold under parylene or polymer. Covering the window stops ionic control without necessarily breaking dry conduction.','03-08 04-01 02-12'),
 mk('Expose dry pads and separate the bath gate','The probe has dry connector pads. The published in vitro gate is a separate metal electrode in the electrolyte, not a deposited gate under the polymer. Layouts and connector pinout are not reproduced.','Keep the gate electric lead separate from the two dry film leads. The electrolyte is an ionic path to the channel, not a metallic G–D jumper.','16-13 09-12','Architecture handoff'),
 mk('Inspect dry path and gate isolation','Source and drain can conduct through PEDOT:PSS while a gate path fails. A breach at an insulated lead creates a separate drain-to-bath leakage mechanism. Test this only in the teaching graph.','Distinguish S/D open, loss of ionic coupling, exposed lead and a direct bypass; an apparent drain current alone is not a functional transistor.','05-07 09-02 09-03','Synthetic check'),
 mk('Sweep the virtual p-type transfer','Set source to zero in the model. At fixed negative drain voltage, increasing the virtual positive gate voltage depletes this p-type channel and reduces absolute drain current. Signed I_D remains negative and moves toward zero.','Display signed I_D in µA, dI_D/dV_G in µS, and modeled gate leakage in nA. Fig. 2 used a dual SourceMeter; the register’s single 2450 is not its equivalent.','09-02 09-03 09-12','Synthetic check')
];
const modes={
 passive:{label:'NeuroGrid · passive (2015)',route:passive,source:'passive',description:'One electrode, one insulated route and a separate bath reference. Passive AC impedance, not gain.',geometry:{sites:256,rows:16,columns:16,pitchUm:30,siteUm:10,finishedFilmUm:4,nominalLowerUm:2,metalStackNm:[['Ti',10],['Pt',150],['Au',50]],reference:'external bath reference',basis:'centered regular lattice inferred from Figure 1; no recovered routing'}},
 oect:{label:'PEDOT:PSS OECT · active (2013)',route:oect,source:'oect',description:'Source/drain span a polymer channel with a third, spatially separate electrode in the bath. One transistor witness is simulated.',geometry:{transistors:17,passiveCompanionElectrodes:8,companionElectrodeUm:12,channelLengthUm:6,channelWidthUm:15,nominalBottomUm:2,nominalTopUm:2,channelLegendNm:200,metalStackNm:[['Ti',5],['Au',100]],gate:'external stainless-steel gate from the published in-vitro architecture',basis:'no actual full-array artwork or acquisition map'}}
};
const faults={
 passive:{
  nominal:{label:'Clean passive witness',note:'All 256 synthetic site traces remain isolated and individually mapped.',at:0},
  open:{label:'Open conductor',note:'One selected metal trace has no path to its labeled output, though its polymer may be exposed.',at:2},
  cover:{label:'Blocked recording window',note:'The selected dry trace remains continuous. No expected electrolyte-to-site interface is open.',at:3},
  short:{label:'Neighbor bridge',note:'Two adjacent logical nets are merged; both fail electrical isolation.',at:2},
  breach:{label:'Insulation defect · large apparent contact',note:'An exposed interconnect lowers the apparent impedance of the simple bench witness; that is a defect, not a better electrode.',at:3},
  reference:{label:'External reference disconnected',note:'All device traces remain. The bench cannot infer impedance without the modeled measurement reference.',at:7}
 },
 oect:{
  nominal:{label:'Clean gated witness',note:'Channels are insulated except for the polymer area; gate changes drain current through the electrolyte.',at:0},
  source:{label:'Source lead open',note:'No intended drain current path. Gate excitation is represented only as an independent ionic boundary.',at:2},
  drain:{label:'Drain lead open',note:'No intended drain current path. An isolated lead cannot amplify.',at:2},
  covered:{label:'Channel window covered',note:'Dry output path is intact, but the gate cannot modulate the covered channel in the simplified model.',at:4},
  gate:{label:'Bath gate disconnected',note:'The channel is exposed, but the unconnected bath-gate drive cannot set a gate potential. The bench witness holds a constant ungated conductance.',at:5},
  leakage:{label:'Feedthrough insulation breach',note:'A separate virtual bath-to-lead path appears. A transfer may still look active, but the leakage witness flags isolation.',at:4},
  bridge:{label:'Source/drain metal bridge',note:'A dominant ohmic path bypasses the channel. The teaching model shows a flat current curve at fixed bias, not gain.',at:2}
 }
};
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const q=(x,n=5)=>+x.toFixed(n);
const finite=(v,d)=>typeof v==='number'&&Number.isFinite(v)?v:d;
const id=i=>'E'+String(i+1).padStart(3,'0');
const frequencies=[10,20,50,100,150,220,330,470,680,1000,1500,2200,3300,4700,6800,10000,15000,20000,50000,100000];
function passiveZ(row,freq=frequencies){
 if(!row?.spectrumReady)return [];
 const k=row.leakage?3.2:1,R=410000/k,C=1.8e-9*k,Rs=1200;
 return freq.map(f=>{if(!Number.isFinite(f)||f<=0)throw new RangeError('Frequency must be positive');const a=2*Math.PI*f*R*C,b=1+a*a,re=Rs+R/b,im=-R*a/b;return {fHz:f,realOhm:q(re),imagOhm:q(im),absOhm:q(Math.hypot(re,im)),phaseDeg:q(Math.atan2(im,re)*180/Math.PI)}});
}
function psolve(stage,i,defect,loc){
 const available=stage>=2,hasWindow=stage>=4,ready=stage>=7,active=stage>=faults.passive[defect].at;
 const adj=loc%16===15?loc-1:loc+1,reference=!(active&&defect==='reference');
 const rows=Array.from({length:256},(_,n)=>{
  const x=(n%16-7.5)*30,y=(7.5-Math.floor(n/16))*30;
  const open=active&&defect==='open'&&n===loc,short=active&&defect==='short'&&(n===loc||n===adj),leakage=active&&defect==='breach'&&n===loc,blocked=active&&defect==='cover'&&n===loc;
  const trace=available&&!open,windowOpen=hasWindow&&!blocked;
  const spectrumReady=ready&&trace&&windowOpen&&reference&&!short;
  return {id:id(n),index:n,centerUm:[x,y],trace,windowOpen,short,leakage,
   logicalOutputs:!trace?[]:short?[id(Math.min(loc,adj)),id(Math.max(loc,adj))]:[id(n)],
   dry:stage<6?'Not inspected':open?'Open trace':short?'Shorted': 'Mapped',
   wet:stage<7?'Not inspected':!reference?'Missing reference':!trace?'Missing trace':short?'Shared net':!windowOpen?'Blocked window':leakage?'Leaky insulation':'Isolated contact',
   spectrumReady};
 });
 return {rows,selected:rows[i],ref:reference,counts:{film:256,goodRoutes:rows.filter(r=>r.dry==='Mapped').length,open:rows.filter(r=>r.dry==='Open trace').length,short:rows.filter(r=>r.dry==='Shorted').length,valid:rows.filter(r=>r.spectrumReady&&!r.leakage).length,abnormalSpectrum:rows.filter(r=>r.spectrumReady&&r.leakage).length}};
}
const params={lowUs:20,rangeUs:320,midV:.33,widthV:.073,healthyGateNS:5,breachGateNS:560,shortUs:1350};
function osolve(stage,fault,vg,vd){
 const active=stage>=faults.oect[fault].at;
 const problem=k=>active&&fault===k;
 const hasLeads=stage>=2,polymer=stage>=3,windowOpen=stage>=4&&!problem('covered'),gate=stage>=5&&!problem('gate');
 const drive=windowOpen&&gate,source=hasLeads&&!problem('source'),drain=hasLeads&&!problem('drain'),path=source&&drain&&(polymer||problem('bridge'));
 const leakage=problem('leakage'),bridge=problem('bridge');
 const ready=stage>=7,inspected=stage>=6,code=!inspected?'Not inspected':!path?'Open S–D path':bridge?'Metal bypass':leakage?'Feedthrough leak':!gate?'Gate disconnected':!windowOpen?'Channel covered':'Isolated gated channel';
 const sweepPoint=(g)=>{
  const z=1/(1+Math.exp(((drive?g:0)-params.midV)/params.widthV));
  const cond=!path?0:bridge?params.shortUs:params.lowUs+params.rangeUs*z;
  const iD=vd*cond; // V × µS = µA, signed drain-current convention.
  const gm=path&&drive&&!bridge?-vd*params.rangeUs*z*(1-z)/params.widthV:0;
  const iG=gate?g*(leakage?params.breachGateNS:windowOpen?params.healthyGateNS:0):0;
  return {vG:g,vD:vd,iDuA:q(iD),gmUS:q(gm),iGnA:q(iG)};
 };
 const sweep=ready?Array.from({length:61},(_,i)=>sweepPoint(q(i/100,2))):[];
 return {sources:{s:source,d:drain,g:gate},windowOpen,polymer,path,drive,leakage,bridge,status:code,sweep,selected:ready?sweepPoint(vg):null};
}
function solve(opts={}){
 const mode=opts.mode==='oect'?'oect':'passive',stage=clamp(Math.round(finite(opts.stage,0)),0,7);
 const fault=Object.hasOwn(faults[mode],opts.fault)?opts.fault:'nominal';
 const inspect=clamp(Math.round(finite(opts.inspect,137)),0,255),location=clamp(Math.round(finite(opts.location,137)),0,255);
 const vG=clamp(finite(opts.vG,.35),0,.6),vD=clamp(finite(opts.vD,-.4),-.5,0);
 const result=mode==='passive'?psolve(stage,inspect,fault,location):osolve(stage,fault,vG,vD);
 return {mode,stage,fault,inspect,location,vG,vD,result};
}
function report(m){
 const p=modes[m.mode],data=m.mode==='passive'?{counts:m.result.counts,referenceConnected:m.result.ref,selected:m.result.selected,syntheticImpedance:passiveZ(m.result.selected)}:{diagnostics:{status:m.result.status,polymerChannel:m.result.polymer,windowOpen:m.result.windowOpen,isolatedGate:m.result.drive,pathSD:m.result.path,feedthroughLeakage:m.result.leakage},selected:m.result.selected,syntheticTransfer:m.result.sweep,modelConstants:params};
 return {schema:'neurogrid-oect-bench/1',mode:m.mode,stage:m.stage+1,geometry:p.geometry,source:docs[p.source],secondarySources:m.mode==='oect'?[docs.elements]:[],modelNotice:'Synthetic inert-bench educational comparison, not measured data, fabrication instructions, pinout, or a medical device.',fault:m.fault,...(m.mode==='passive'?{faultSite:m.fault==='reference'||m.fault==='nominal'?null:id(m.location)}:{voltages:{VG:m.vG,VD:m.vD,VS:0},publishedFigure2Benchmark:{drainBiasV:-.4,peakGmUS:900,peakVG:.42,relationship:'Literature datum only, not fitted to this simulated sweep'}}),...data};
}
function csv(m){
 if(m.stage<7)throw new Error('Complete the inert bench before export.');
 if(m.mode==='oect')return 'synthetic_gate_V,synthetic_drain_V,signed_synthetic_drain_uA,derivative_uS,synthetic_gate_nA\n'+m.result.sweep.map(z=>[z.vG,z.vD,z.iDuA,z.gmUS,z.iGnA].join(',')).join('\n')+'\n';
 return 'synthetic_site_id,inferred_center_x_um,inferred_center_y_um,logical_outputs,dry_graph,wet_window,measurement_status,synthetic_abs_Z_1k_ohm,synthetic_phase_1k_deg\n'+m.result.rows.map(r=>{const z=passiveZ(r,[1000])[0];return [r.id,...r.centerUm,r.logicalOutputs.join(';'),r.dry,r.windowOpen,r.wet,z?.absOhm??'',z?.phaseDeg??''].join(',')}).join('\n')+'\n';
}
const api={docs,tools,modes,faults,params,solve,passiveZ,report,csv};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else global.NGBench=api;
})(globalThis);
