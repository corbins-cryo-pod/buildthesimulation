/* PtNRGrid foundry: pure, deterministic, offline educational process and diagnostic model. */
((global)=>{
'use strict';
const main='https://iebl.ucsd.edu/sites/default/files/iebl/2022-05/Human%20Brain%20Mapping%20with%20Multi%20Thousand%20Channels_0.pdf';
const sources={
 paper:{title:'Tchoe et al. · article and Figure 1',url:main+'#page=2',note:'Science Translational Medicine 14, eabj1441 (2022). Figure 1 and Results report carrier, four sizes, finished film, contact geometry, and 1 kHz benchmarks; Figure 3 confirms the 32 × 32 square.'},
 small:{title:'Tchoe et al. · Figure 2',url:main+'#page=3',note:'1,024-channel 4.8 × 4.8 mm small research array. Figure 1B gives 150 µm pitch and approximately 5 × 5 mm coverage.'},
 process:{title:'Tchoe et al. · Supplement §§1.1–1.3',url:main+'#page=15',note:'Exact glass and release coating, two repeated Cr/Au cycles, Pt–Ag and Ti cap, hard mask and oxygen patterning, strip, water release, then dealloy. Main text reports 3.5 µm lower parylene; this supplement says 3.7 µm deposited.'},
 fixture:{title:'Tchoe et al. · Supplement §§1.4 and 1.6–1.7',url:main+'#page=16',note:'Passive mold comparison; custom silver-epoxy extender bond, LGA connector and Intan RHD2164 acquisition. Register tools are analogues unless explicitly matched.'},
 ganji:{title:'Ganji et al. · porous Pt nanorod development (2019)',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC7174248/',note:'Figure 1 and Methods illustrate morphology and selective removal of silver from the alloy. The authors’ smaller-array process does not substitute for Tchoe’s later panel sequence.'},
 mla:{title:'Heidelberg Instruments · MLA 150',url:'https://heidelberg-instruments.com/wp-content/uploads/2025/02/Fact-Sheet-MLA150.pdf',note:'The standard spec is 150 × 150 mm maximum exposure and up to a 6-inch square substrate; it also lists separately equipped 200 mm and 8-inch options. Those do not establish the installed configuration of the register or the UCSD fixture.'}
};
const carriers={glass:{width:177.8,height:177.8,thickness:1.524,nominal:180},registeredField:150};
const physical={ptSiteUm:30,ptRecessUm:2,bottomMainUm:3.5,bottomSIUm:3.7,topParyleneUm:3.1,auNmPerPass:250,crNmPerPass:10,tiCapNm:50,tiMaskNm:50,traceUm:4,spaceUm:6};
const configs={
 square:{id:'square',title:'Square · 1,024 sites',figure:'Fig. 1C / Fig. 3',count:1024,cols:32,rows:32,pitch:1,width:32,height:32,holes:.5,axes:'documented regular grid',geometry:'32 × 32 at 1 mm; origin is centered and inferred. Pitch, contact diameter and dimensions are published; full outside outline/pads/holes are not.',eis:{mean:11,sd:2,yieldUpper:99.4},source:'paper'},
 narrow:{id:'narrow',title:'Narrow · 1,024 sites',figure:'Fig. 1E',count:1024,cols:16,rows:64,pitch:.2,width:3,height:13,holes:null,axes:'schematic assumed lattice',geometry:'The paper reports 1,024 sites, 0.2 mm pitch and about 3 × 13 mm coverage. The displayed 16 × 64 centers are an explicit inferred lattice, not a recovered site arrangement; coordinate export is withheld.',eis:null,source:'paper'},
 wide:{id:'wide',title:'Wide · 2,048 sites',figure:'Fig. 1D / Fig. 3G',count:2048,cols:46,rows:45,pitch:1.8,width:80,height:80,holes:.9,axes:'logical index only',geometry:'The paper reports 2,048 sites at 1.8 mm and about 80 × 80 mm. The inspection map is a logical index field only. No physical coordinates, edge fill or 2,048-channel pin map are asserted.',eis:{mean:8,sd:4,yieldUpper:95.2},source:'paper'},
 small:{id:'small',title:'Fine-pitch · 1,024 sites',figure:'Fig. 1B / Fig. 2A',count:1024,cols:32,rows:32,pitch:.15,width:4.8,height:4.8,holes:null,axes:'schematic assumed lattice',geometry:'Figures 1B and 2A report 150 µm pitch, roughly 5 × 5 mm, and a 1,024-site 4.8 × 4.8 mm version. Display reconstructs a regular 32 × 32 lattice; no physical coordinates are exported.',eis:null,source:'small'}
};
const mk=(title,chapter,desc,check,tools,src,basis='Published sequence')=>({title,chapter,desc,check,tools:tools.split(' ').filter(Boolean),src:src.split(' ').filter(Boolean),basis});
const stages=[
 mk('Freeze the configuration','Panel','Pick the documented form factor. Load a virtual soda-lime glass panel, 177.8 × 177.8 × 1.524 mm in the supplement, summarized as about 180 × 180 mm in the article. Do not equate this full glass panel with a 150 × 150 mm registered write field.','Record carrier size, independently known pattern extent, and mount qualification separately. The simulation does not require the physical tool to fit.','01-01 02-03 16-11','paper process mla'),
 mk('Prepare the release interface','Panel','Surface preparation precedes a Micro-90 sacrificial release film. The glass is temporary: it is neither silicon nor part of the finished array.','Mark the glass/release/film interfaces. A missing release layer is not a broken conductor.','03-12 02-07 04-06','process'),
 mk('Deposit lower parylene C','Panel','The main paper gives a nominal 3.5 µm bottom film. The process supplement describes 3.7 µm deposited at this step. Both give a 3.1 µm upper film; keep the thickness statements separate.','Compare both source values; the released device is summarized as 6.6 µm in the main paper. A local trace ridge is not a new total film measurement.','03-08 05-01 05-04','paper process'),
 mk('Expose route artwork A','Two metal passes','First maskless exposure defines nominal 4 µm routes at 6 µm spacing; the actual route artwork is unavailable. This window shows parallel test lines, not production tracks.','Check the expected lines in an overlay witness. Do not treat a published trace width as the grid spacing.','02-03 02-08 02-12','process'),
 mk('Build route metal A','Two metal passes','One Cr/Au deposition and lift-off produces the first route pattern. Supplement §1.1 gives 10 nm Cr and 250 nm Au per pass.','Test the first conductor pass independently. An interruption in A can be covered by B only where both passes overlap.','03-01 04-06 05-07','process'),
 mk('Register route artwork B','Two metal passes','Repeat the exposure in register over the first intent. The second exposure is not a separate net layer: there is no dielectric between A and B and no crossover via between these two passes.','Review B offset relative to the 4 µm witness width. Touch width is a geometric assumption, not a qualified lithography window.','02-03 02-12 05-02','process'),
 mk('Build route metal B','Two metal passes','The second Cr/Au pass repeats the lithography, deposition and lift-off. Authors used this double-patterning to reduce the chance a particle breaks a thin route.','Compare single-pass opens, complementary breaks, and a cut across both passes. Both intact traces do not guarantee a correct connector.','03-01 04-06 05-07','process'),
 mk('Define the site openings in resist','Contacts','A different artwork targets the nominal 30 µm circular alloy disks at the ends of the routes. The perfusion holes are not sites, and their future locations do not enter this mask.','Ensure each site disk belongs to one intended net. Neither the pads nor perfusion holes are counted as channels.','02-03 02-08 02-12','paper process'),
 mk('Co-deposit Pt–Ag and retain Ti caps','Contacts','The authors use simultaneous Pt and Ag sputtering for the alloy at each site, then a thin protective titanium cap. This is neither sequential Pt/Ag sheets nor a finished platinum-nanorod contact.','Require a validated two-target deposition arrangement to make actual coupons. A general target holder or a bright disk does not establish alloy composition.','03-03 13-01','process ganji'),
 mk('Deposit upper parylene C','Passivate','Treat the interface for adhesion, then conformally passivate the connecting metal and alloy disks with a nominal 3.1 µm film. The cap and the upper film are different materials.','At this station the disk exists beneath insulation. Dry route continuity is compatible with an unexposed wet contact.','03-12 03-08 05-04','paper process'),
 mk('Pattern the separate Ti etch mask','Passivate','An overlying Ti hard mask defines openings for electrical contacts, perfusion holes and the perimeter. The independent mask is not the route A or B artwork.','Label contact, fluid relief and boundary openings separately. Check the contact overlay and hole keep-outs in a test section.','02-03 03-03 02-12','process'),
 mk('Etch vias, relief holes and outline','Passivate','The supplement describes pattern transfer into the titanium then oxygen plasma etching into parylene. Electrical windows reach the alloy cap; relief openings and intended outline reach glass.','A plugged contact mask remains an insulated site. A perfusion hole remains nonconductive. The display does not calculate etch selectivity.','04-01 05-02 13-01','process'),
 mk('Stress relief and strip titanium','Release','After stress relief, the report strips the titanium hard mask and Pt–Ag caps and rinses. Follow the material states without prescribing a chemical recipe.','Verify the display identifies alloy visible at defined openings before release. Strip and release do not make nanorods.','06-11 04-06 02-12','process'),
 mk('Release the film from glass','Release','Water release removes the sacrificial interface and leaves a flexible film; the carrier stays behind. The alloy remains alloy at this point.','Inspect the virtual state for detached film, intact tracks, windows and no conductive glass.','04-06 12-01','process'),
 mk('Selectively dealloy released contacts','Release','Selective removal of silver from the exposed Pt–Ag leaves the platinum-rich nanorod surface, recessed approximately 2 µm below the surrounding film. The shape shown is a teaching symbol, not a simulated etch profile.','An incomplete or occluded site differs from a conductor break. No chemistry setting, composition, surface-area or etch-rate prediction is issued.','04-06 13-01','paper process ganji'),
 mk('Bond the flex to its extender','Interconnect','The published build uses stenciled silver epoxy, precision alignment and compression onto a custom extender PCB. The mechanical coupon and logical pin ledger do not recover the manufactured artwork.','Check pad isolation and one connected net per logical terminal; a connection can go to the wrong pad without becoming open.','08-10 12-01 05-07','fixture'),
 mk('Mate connector and assign a readout','Interconnect','The publication uses LGA1155-style connector mating and custom boards to fan signals into Intan RHD2164 electronics. The 1,024-channel acquisition example is not an RHS configuration or proof that one unit reads 2,048 at once.','Check all logical indices and distinguish modeled 64-connection fault groups from the unreleased PCB pinout.','16-13 05-07 10-09','fixture paper'),
 mk('Dry net and cross-connect inspection','Bench','Build an explicit graph through pass A, pass B, epoxy pads and logical outputs. Inspect continuity, isolation and ordering before interpreting any wet measurement.','An intact line with a swapped output fails mapping. Two sites in one connected component fail isolation. A virtual dry net is not a probe measurement through passivation.','05-07 09-04 09-06','fixture','Virtual diagnostic'),
 mk('Inspect the inert cell and export','Bench','Use an educational passive equivalent circuit for the selected contact, resistance of the wire witness and symbolic vent openings. Compare the separate measured benchmarks, not measured traces or clinical yield.','Output a synthetic all-site ledger and selected RC spectrum. A different impedance curve, a blocked window and a failed dry net are different diagnostics.','09-01 09-12 14-10','paper fixture ganji','Virtual diagnostic')
];
const defects={
 none:{label:'Nominal process',at:-1,notes:'No staged fault. This is an ideal reference network, not a yield expectation.'},
 first:{label:'Particle break · pass A only',at:4,notes:'Interrupt the middle span in A. A properly registered B pass bridges it after deposition.'},
 crossed:{label:'Separate breaks · A and B',at:6,notes:'Interrupt different spans in each pass. Overlap junctions let current change passes. Without overlap the paths do not rescue each other.'},
 through:{label:'Aligned cut · passes A and B',at:6,notes:'Break both passes in the same span. Neither deposited film can bridge the shared cut.'},
 bridge:{label:'Cross-net metal bridge',at:6,notes:'Connect the selected net to its neighboring example index. This intentionally tests isolation, not actual mask adjacency.'},
 cover:{label:'Blocked recording window',at:11,notes:'The site remains covered after the via step. Good dry electrical routing does not create a wet exposed surface.'},
 alloy:{label:'Incomplete dealloy · one site',at:14,notes:'Lower the selected contact’s effective-area proxy. There is no predicted chemistry, Ag fraction, etch time or electrochemical validation.'},
 bond:{label:'Missing extender bond · one site',at:15,notes:'Break the film-to-extender connection. The film route remains continuous all the way to its own pad.'},
 swap:{label:'Adjacent logical outputs swapped',at:16,notes:'Exchange the selected and adjacent outputs. Both remain conductive but fail the expected ordering.'},
 bank:{label:'Connector group unseated · 64 logical nets',at:16,notes:'Disconnect the selected 64-index group at the mating boundary. This evaluates a synthetic connector map, not an as-built pin bank.'}
};
const stagesLast=stages.length-1;
const clamp=(x,l,h)=>Math.max(l,Math.min(h,x));
const q=(n,d=3)=>Number(n.toFixed(d));
const id=(i)=>'S'+String(i+1).padStart(4,'0');
const pin=(i)=>'Q'+String(i+1).padStart(4,'0');
function resolveOptions(opts={}){
 const c=configs[opts.config]||configs.square;const num=(x,d)=>Number.isFinite(Number(x))?Number(x):d;return {cfg:c,stage:clamp(Math.round(num(opts.stage,0)),0,stagesLast),focus:clamp(Math.round(num(opts.focus,0)),0,c.count-1),overlay:clamp(num(opts.overlay,0),-4,4),defect:defects[opts.defect]?opts.defect:'none',thick:opts.thick==='supplement'?'supplement':'main',length:clamp(num(opts.length,120),100,170)};
}
function position(c,i){
 const row=Math.floor(i/c.cols),col=i%c.cols;
 if(c.id==='wide')return {row,col,x:null,y:null};
 return {row,col,x:q((col-(c.cols-1)/2)*c.pitch,6),y:q(((c.rows-1)/2-row)*c.pitch,6)};
}
function carrierCheck(w=177.8,h=177.8,pw=null,ph=null) {
 const positive=(n)=>typeof n==='number' && isFinite(n) && n>0;
 if(!positive(w)||!positive(h))throw new RangeError('Carrier dimensions must be positive.');
 const field=carriers.registeredField,pattern=[pw,ph].every(positive)?(Math.max(pw,ph)<=field?'dimensionally within field':'exceeds registered field'):'unknown pattern extent';
 return {carrierMm:[w,h],registeredFieldMm:[field,field],carrierOverField:Math.max(w,h)>field,carrierMount:'unverified; field is not the carrier/chuck specification',pattern,canQualify:false};
}
function union(n){
 const p=Int32Array.from({length:n},(_,i)=>i),size=new Uint16Array(n).fill(1);
 function find(a){while(p[a]!==a){p[a]=p[p[a]];a=p[a]}return a}
 function link(a,b){a=find(a);b=find(b);if(a===b)return;if(size[a]<size[b])[a,b]=[b,a];p[b]=a;size[a]+=size[b]}
 return {find,link};
}
function solve(opts={}){
 const o=resolveOptions(opts),{cfg:c,stage:t,focus:f,defect,length,overlay}=o;
 const n=c.count, base=f-f%64,adj=(f%c.cols===c.cols-1||f===n-1)?f-1:f+1,active=t>=defects[defect].at&&defect!=='none';
 const hasA=t>=4,hasB=t>=6,hasSite=t>=8,hasVia=t>=11,capStripped=t>=12,hasRelease=t>=13,hasNR=t>=14,hasEpoxy=t>=15,hasSocket=t>=16,hasDry=t>=17,hasWet=t>=18;
 const overlap=Math.max(0,physical.traceUm-Math.abs(overlay)),touch=hasB&&overlap>0;
 // Labels: 0 contact, 1 film pad, 2 extender pad, 3 reader; 4–7 A nodes, 8–11 B nodes.
 const N=12,g=union(N*n),segments=[],rootSites=new Map,rootReads=new Map;
 const oneSpan=2.44e-8*(length/1000)/(physical.traceUm*1e-6*physical.auNmPerPass*1e-9)/3;
 const k=(i,s)=>N*i+s;
 const spot=i=>active&&i===f;
 for(let i=0;i<n;i++){
  const cutsA=[],cutsB=[];
  if(spot(i)&&defect==='first')cutsA.push(1);
  if(spot(i)&&defect==='crossed'){cutsA.push(0);cutsB.push(2)}
  if(spot(i)&&defect==='through'){cutsA.push(1);cutsB.push(1)}
  const A=[0,1,2].map(j=>hasA&&!cutsA.includes(j)),B=[0,1,2].map(j=>hasB&&!cutsB.includes(j));
  for(let j=0;j<3;j++){if(A[j])g.link(k(i,4+j),k(i,5+j));if(B[j])g.link(k(i,8+j),k(i,9+j))}
  if(touch)for(let j=0;j<=3;j++)g.link(k(i,4+j),k(i,8+j));
  if(hasA)g.link(k(i,7),k(i,1));
  if(hasSite&&hasA)g.link(k(i,0),k(i,4));
  if(hasEpoxy&&!(spot(i)&&defect==='bond'))g.link(k(i,1),k(i,2));
  let qidx=i;
  if(active&&defect==='swap'){if(i===f)qidx=adj;else if(i===adj)qidx=f}
  if(hasSocket&&!(active&&defect==='bank'&&i>=base&&i<base+64))g.link(k(i,2),k(qidx,3));
  segments.push({A,B});
 }
 if(hasA&&active&&defect==='bridge')g.link(k(f,5),k(adj,5));
 for(let i=0;i<n;i++){
  if(hasSite){const r=g.find(k(i,0));if(!rootSites.has(r))rootSites.set(r,[]);rootSites.get(r).push(i)}
  if(hasSocket){const r=g.find(k(i,3));if(!rootReads.has(r))rootReads.set(r,[]);rootReads.get(r).push(i)}
 }
 const totals={film:0,connected:0,correct:0,open:0,bridged:0,swapped:0,wet:0,covered:0,limited:0,formed:0};
 const res=Array.from({length:n},(_,i)=>{
  const {A,B}=segments[i],r=g.find(k(i,0)),p=position(c,i),pads=rootReads.get(r)||[],met=rootSites.get(r)||[],closed=hasSite&&g.find(k(i,1))===r,goodBond=closed&&hasEpoxy&&g.find(k(i,2))===r;
  const ex=hasVia&&!(spot(i)&&defect==='cover'),bare=ex&&capStripped&&hasSite;
  let finish=hasSite?(hasNR&&bare?(spot(i)&&defect==='alloy'?'partial Pt-rich':'Pt-rich'):(bare?'Pt–Ag alloy':capStripped&&!ex?'Ti-capped Pt–Ag under film':'Ti-capped Pt–Ag')):'Not formed';
  const isBridge=met.length>1||pads.length>1,isSwap=pads.length===1&&pads[0]!==i,connected=pads.length>0,correct=connected&&!isSwap&&!isBridge,usable=hasWet&&correct&&bare;
  let dry=!hasDry?'Not inspected':isBridge?'Short / cross-net':!connected?'Open':isSwap?'Mis-mapped':'Mapped';
  let wet=!hasWet?'Not inspected':!correct?'Invalid dry map':!bare?'Blocked':finish==='partial Pt-rich'?'Incomplete dealloy':'Synthetic spectrum';
  let wire=0;for(let j=0;j<3;j++){const num=Number(A[j])+Number(touch&&B[j]);wire+=num?oneSpan/num:Infinity}
  const wireOhm=closed&&isFinite(wire)&&!isBridge?q(wire,3):null;
  if(closed)totals.film++;if(hasDry&&connected)totals.connected++;if(hasDry&&correct)totals.correct++;if(hasDry&&isBridge)totals.bridged++;if(hasDry&&isSwap&&!isBridge)totals.swapped++;if(hasDry&&!connected&&!isBridge)totals.open++;
  if(usable)totals.wet++;if(hasWet&&correct&&!bare)totals.covered++;if(hasWet&&correct&&finish==='partial Pt-rich')totals.limited++;if(finish==='Pt-rich')totals.formed++;
  return {i,id:id(i),...p,outputIds:pads.map(pin),routingClosed:hasA&&g.find(k(i,4))===g.find(k(i,7)),filmPath:closed,extender:goodBond,wetWindow:bare,finish,dry,wet,wholeMapReady:hasDry,eisReady:usable,wireOhm,A,B,shortWith:met.filter(j=>i!==j).map(id)};
 });
 return {...o,hasA,hasB,hasSite,hasVia,capStripped,hasRelease,hasNR,hasEpoxy,hasSocket,hasDry,hasWet,overlap,touch,n,totals,res,affected:active?f:null,adjacent:adj,bankStart:base,thicknessUm:q((o.thick==='main'?physical.bottomMainUm:physical.bottomSIUm)+physical.topParyleneUm,2)};
}
function spectrum(row,frequencies=[10,20,50,100,150,220,330,470,680,1000,1500,2200,3300,4700,6800,10000,15000,20000,50000,100000]){
 if(!row?.eisReady||row.wireOhm===null)return [];
 const fArea=row.finish==='partial Pt-rich'?.28:row.finish==='Pt–Ag alloy'?.14:1;const rct=40000/fArea,c=14e-9*fArea,rs=550+row.wireOhm;
 return frequencies.map(freq=>{if(!isFinite(freq)||freq<=0)throw new RangeError('Positive frequency required.');const t=2*Math.PI*freq*rct*c,den=1+t*t,re=rs+rct/den,im=-rct*t/den;return {freq,realOhm:q(re),imagOhm:q(im),magOhm:q(Math.hypot(re,im)),phaseDeg:q(Math.atan2(im,re)*180/Math.PI)}});
}
function csv(model){
 if(!model.hasDry)throw new Error('Finish dry inspection before exporting a channel ledger.');
 const h=['site_id','logical_row','logical_col','center_x_mm_main_figure_reference_only','center_y_mm_main_figure_reference_only','virtual_output','dry','window_open','contact_finish','wet','estimated_witness_wire_ohm','synthetic_Z_1k_ohm','basis'];
 const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
 return [h.join(','),...model.res.map(r=>[r.id,r.row+1,r.col+1,model.cfg.id==='square'?r.x:null,model.cfg.id==='square'?r.y:null,r.outputIds.join(';'),r.dry,r.wetWindow,r.finish,r.wet,r.wireOhm,spectrum(r,[1000])[0]?.magOhm,'virtual graph; not native pinout, mask or data'].map(quote).join(','))].join('\r\n')+'\r\n';
}
function report(model,site=model.focus){
 const r=model.res[clamp(Number(site)||0,0,model.n-1)],c=model.cfg;return {schema:'ptnrgrid-teaching-report/1',kind:'synthetic bench model, not a physical process validation',configuration:{id:c.id,figure:c.figure,count:c.count,nominalPitchMm:c.pitch,coverageMm:[c.width,c.height],geometryBasis:c.axes,visualGeometry:c.geometry,benchmark:c.eis},
 carrier:carrierCheck(),physicalReference:physical,virtualOptions:{stage:model.stage,selectedSite:r.id,defectSite:model.defect==='none'?null:id(model.focus),defect:model.defect,overlayUm:model.overlay,witnessLengthMm:model.length,thicknessSource:model.thick},checkCounts:model.totals,selectedSite:{...r,x:c.id==='square'?r.x:null,y:c.id==='square'?r.y:null},syntheticSpectrum:spectrum(r),process:stages.map((s,i)=>({index:i+1,title:s.title,completed:i<=model.stage,basis:s.basis,sourceIds:s.src,equipmentCandidates:s.tools})),sources,
 limits:['No mask, GDS, device pinout, nanorod morphology, plating chemistry, sensor output, yield model or clinical compatibility.','Witness resistivity and capacitance are assumed bench parameters. Tissue model and electrical stimulation are not implemented.','LGA logical groups, holes, carrier placement and assembly are explanatory schematics.']};
}
const toolNames={'01-01':'CAD workstation','02-03':'MLA 150 · 150 mm field reference','02-07':'Spin coater','02-08':'Coat/bake system','02-12':'Inspection microscope','03-01':'E-beam evaporator','03-03':'Sputter system · co-deposition unverified','03-08':'Parylene Labcoter','03-12':'Plasma surface treatment','04-01':'RIE','04-06':'Wet processing reference','05-01':'Stylus profilometer','05-02':'Optical profilometer','05-04':'Ellipsometer','05-07':'Probe station','06-11':'Convection oven','08-10':'Dispensing / encapsulation','09-01':'Potentiostat','09-04':'Oscilloscope','09-06':'Signal generator','09-12':'Inert electrochemical cell','10-09':'Intan comparator · not the RHD build','12-01':'Stereo microscope','13-01':'SEM','14-10':'Flex test rig','16-11':'Carrier handling','16-13':'Connector references'};
const api={sources,stages,configs,carriers,physical,defects,toolNames,stagesLast,solve,position,carrierCheck,spectrum,csv,report,id,pin};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else global.PtFoundry=api;
})(globalThis);
