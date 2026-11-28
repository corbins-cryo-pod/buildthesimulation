/* Translate atlas handoffs into versioned register-model teaching scenes.
 * Explicit multi-station examples preserve published ordering and reset independent
 * witnesses. Other handoffs use one compatible register-role illustration, not a
 * sequence inferred from a list of candidate instruments. */
((root)=>{
'use strict';
const list=x=>Array.isArray(x)?x:[];
const text=x=>typeof x==='string'?x.trim():'';
const fit=(s,n=150)=>s.length>n?(s.slice(0,n-1).replace(/\s+\S*$/,'')+'…'):s;
const first=s=>text(s).split(/(?<=[.!?])\s+(?=[A-Z0-9])/)[0]||'';
const boundary='External or undisclosed · no modeled operation.';
const process='Register model comparison · not a qualified tool, holder, or recipe.';
const specs=Object.freeze({
 coupon:'Local silicon witness coupon; no full-wafer processing',
 flex:'Flex film on a temporary carrier',
 foil:'Released thin flex film',
 package:'Packaged die or connected flex assembly',
 layout:'Digital layout, not a physical wafer',
 bench:'Inert wired bench specimen',
 wet:'Inert coupon in a bench cell',
 panel:'Local flex witness on glass, not the 180 mm research carrier',
 mesh:'Mesh witness on sacrificial silicon carrier',
 meshfree:'Released polymer mesh with wires',
 silicon:'Silicon wafer or die on a holder (schematic)',
 plate:'Representative dielectric-supported die'
});
const S=(id,effect,operation,before,after,program,specimen,opts={})=>({id,effect,operation,before,after,program,specimen,...opts});
const W=(id,effect,operation,before,after,program,specimen,opts={})=>S(id,effect,operation,before,after,program,specimen,{reset:'Independent witness; no physical transfer from the preceding demonstration',...opts});
const B=(operation,before,after,specimen)=>S('','none',operation,before,after,'',specimen,{kind:'unknown'});
const D=(operation,before,after,program)=>S('01-01','handoff',operation,before,after,program,specs.layout,{kind:'handoff'});
const T=(id,operation,state,program,specimen=specs.bench)=>S(id,'measure',operation,state,state,program,specimen,{kind:'test'});
const M=(id,operation,state,program,specimen)=>S(id,'measure',operation,state,state,program,specimen,{kind:'inspection'});

const ptnrPasses=[1,2].flatMap((p)=>[
 S('02-03','pattern','Write the same lead intent: pass '+p,p===1?'Prepared parylene witness with fresh resist':'First Cr/Au lead pass; fresh resist on the same lead intent','Latent lead pattern, pass '+p,['Artwork','Same Cr/Au leads and alignment; not a second wiring level'],specs.panel),
 S('03-01','deposit','Add Cr/Au lead metal: pass '+p,'Witness with patterned resist','Cr/Au over the witness and sacrificial resist',['Layer selection','Cr adhesion / Au conductor; no virtual chamber recipe'],specs.panel),
 S('04-06','etch','Remove the sacrificial pattern: pass '+p,'Witness with metal over patterned resist',p===1?'First retained Cr/Au leads':'Reinforced same-level Cr/Au leads',['End condition','Metal retained on intended leads only; verify after both passes'],specs.panel),
]);

const reviewed={
 'si-np1':{
  'Accept completed foundry electronics':[B('Receive externally fabricated 130 nm CMOS','External 200 mm CMOS wafer','Supplied transistor/interconnect stack, not locally made','External 200 mm foundry wafer; not loaded into a register machine')],
  'Balance stress and open vias':[B('Hold the 200 mm stress-compensation and via module outside the local register','Supplied 200 mm CMOS wafer','Published sequence: stress balanced, then vias opened; local execution not shown','External 200 mm foundry wafer; 04-02 demonstrates 100 mm only')],
  'Define and protect electrode sites':[
   W('02-06','pattern','Register an electrode window on a local site witness','Local prepared witness with via target','Site window registered to its via target',['Pattern intent','Overlap the recording window to the corresponding via'],specs.coupon),
   S('03-03','deposit','Represent the TiN recording surface on the local witness','Registered opening over the local witness','TiN recording-site witness; production protective stack not inferred',['Film identity','TiN recording site, not an integrated CMOS flow'],specs.coupon),
   M('02-12','Inspect window-to-via registration','TiN site on a local witness; no stack change',['Inspect','Site-window alignment and protection boundary'],specs.coupon)],
  'Open pad windows and deep-etch front side':[B('Show the front-side 200 mm process boundary','External protected CMOS wafer','Published pads and front outline operation; no local processing shown','External 200 mm foundry wafer; listed etchers do not represent this size')],
  'Thin and finish from the backside':[B('Show the external backside finish','External front-patterned CMOS wafer','External thinned shank, with selected branch geometry','External 200 mm foundry wafer; not routed through the smaller register fixture')],
  'Exercise a separately sized witness, not the 200 mm wafer':[
   W('03-07','deposit','Compare a separate dielectric film witness','Independent chamber-compatible film witness','Schematic film witness; not a Neuropixels layer recipe',['Test intent','A film deposition example, separate from shank release'],specs.coupon),
   W('04-02','etch','Open a separate 100 mm witness','Independent 100 mm register-model input','Illustrated window after etch, not a production 200 mm via',['Modeled holder','100 mm fixture; no physical transfer to 04-03'],'Independent 100 mm round etch witness',{shape:'wafer',size:100}),
   W('04-03','etch','Compare outline etch on a separate 150 mm witness','Independent 150 mm register-model input','Illustrated deep opening; no fabricated shank claim',['Modeled holder','150 mm fixture; not the 100 mm etch witness'],'Independent 150 mm round deep-etch witness',{shape:'wafer',size:150}),
   W('04-08','dice','Illustrate thinning on its own mounted witness','Separate supported grinding witness','Thinning comparison witness; no production wafer entered',['End condition','Compare before/after thickness; do not substitute for release'],specs.coupon),
   W('05-02','measure','Inspect thickness and bow on a comparison witness','Separate metrology witness','Same witness; dimensions and bow are reported separately',['Readout','Thickness and bow; not a qualification record'],specs.coupon)],
  'Package and protect the base':[
   S('08-02','assemble','Illustrate wire bonding on a separate die and rigid-flex package','Supplied die witness and matching board/flex','Bench assembly with die connections; exact product package is external',['Setup witness','Route each wire to its paired board termination'],specs.package,{reset:'Separate supplied die; no package made from the local fabrication witnesses'}),
   S('08-10','assemble','Illustrate protection of the light-sensitive base','Bonded die witness','Protected base witness with access to its interface',['Protection boundary','Protect the base; retain access and compare dark / illuminated blank'],specs.package)],
  'Verify selected sites with a known input':[
   T('09-06','Use a known electrical source on an inert package fixture','Connected inert package fixture; geometry unchanged',['Input','Synthetic known signal; distinguish one disabled site from a whole channel']),
   T('01-05','Read the selected-site mapping','Synthetic time-series record; no physical loading',['Selection limit','960 physical sites; 384 selected channels'],'Digital acquisition record')],
 },
 'si-np2':{
  'Choose the shank mask family and map':[D('Set the selected shank map','Unassigned layout definition','Single- or four-shank layout with its assigned site map',['Geometry from study','12 µm aligned TiN squares and 15 µm row spacing'])],
  'Accept the 130 nm custom wafer':[B('Receive supplied switching and readout electronics','External custom CMOS line','Incoming qualified-by-supplier component; no local FEOL or BEOL simulated','External 130 nm CMOS wafer')],
  'Define sites, compensate bow and release shanks':[
   W('05-02','measure','Compare the shape of a separate alpha-family witness','Independent outline and planarity witness','Planarity readout; the order of fabrication is not established',['Comparison anchor','70 × 24 µm cross-section and <100 µm deflection per shank'],'Separate silicon-shank geometry witness')],
  'Attach die to the alpha rigid-flex':[
   S('08-10','assemble','Illustrate attachment of the die witness to a rigid PCB','Supplied die witness and matching rigid-flex','Die held on the PCB; ribbon remains separate',['Assembly intent','Secure the die base; do not coat the shanks'],specs.package,{reset:'New local package witness; not made by the preceding metrology station'}),
   S('08-02','assemble','Map bonds from the die base to the board','Mounted die witness on the rigid-flex','Connected single- or four-shank package witness',['Connection map','Keep die fanout and physical shanks separate'],specs.package)],
  'Exercise a valid selection against a dummy input':[
   T('09-06','Apply a known dummy input to the package fixture','Connected package witness; no geometry change',['Input','Known synthetic test signal, not a neural trace']),
   T('01-05','Check the selected stream budget','Synthetic sampled records; no physical loading',['Alpha readout','384 full-band streams, 30 ksample/s, 14-bit alpha digitization'],'Digital acquisition record')],
 },
 'flex-ptnr':{
  'Prepare a temporary panel':[
   B('Keep the full 180 mm glass carrier outside this unverified route','Published 180 mm glass carrier','No claimed full-panel tool fit or transfer','180 mm source carrier; not inserted into the 150 mm writer'),
   W('03-08','deposit','Illustrate the lower parylene support on reduced glass','Reduced prepared glass witness with release interface','Lower parylene support on local glass witness',['Film identity','Lower support layer; paper carrier and effective written area remain distinct'],specs.panel)],
  'Pattern long routes twice':ptnrPasses,
  'Locate alloy disks':[
   S('02-03','pattern','Register the site-level pattern','Local parylene witness with reinforced Cr/Au leads','Registered site openings over the assigned traces',['Artwork intent','Keep site openings over their own conductors'],specs.panel),
   S('03-03','deposit','Illustrate the co-deposited site alloy','Site mask and representative Cr/Pt base','Pt–Ag alloy at intended sites; not yet porous',['Composition intent','Pt–Ag co-deposition; independent sources must be verified separately'],specs.panel)],
  'Passivate and cut windows':[
   S('03-08','deposit','Coat the witness with upper parylene','Schematic alloy disks and Cr/Au interconnect','Upper barrier covers routes and sites before opening',['Layer','Upper protective parylene'],specs.panel),
   S('02-03','pattern','Define the window and perforation pattern','Upper parylene with separate patterning layer','Hard-mask intent registered to sites, perforations and outline',['Artwork roles','Contact windows, relief holes, outline; no production masks'],specs.panel),
   S('04-01','etch','Open the upper film where intended','Registered mask over upper parylene','Site windows and separate relief openings in the passivation',['End condition','Keep long fan-out insulated outside intended openings'],specs.panel)],
  'Release before final dealloying':[
   S('04-06','clean','Remove the temporary hard-mask material','Opened flex still supported on glass','Opened alloy sites with hard-mask/cap removal distinct from dealloying',['Stop point','Temporary mask cleared; alloy has not been dealloyed'],specs.panel),
   S('04-06','handoff','Release the patterned flex in water','Opened flex still on its glass carrier','Free parylene film; Pt–Ag remains at the sites',['Sequence gate','Release off glass before the final selective step'],specs.panel,{shape:'die',outgoingShape:'film',afterSpecimen:'Released flexible film'}),
   S('04-06','etch','Represent selective removal of silver from Pt–Ag','Released parylene with exposed Pt–Ag sites','Porous Pt-rich site state; residue and morphology not predicted',['End condition','Compare material states without estimating alloy composition from color'],specs.foil),
   M('13-01','Inspect the changed site morphology','Released film with porous Pt-rich sites; unchanged during inspection',['Inspect','Site morphology separately from conductor continuity'],specs.foil)],
  'Bond extender and measure':[
   S('08-10','assemble','Register the flex with the conductive-epoxy board pattern','Released Pt-rich flex and separate extender PCB','Extender attached to the mapped flex termination',['Registration target','Pair each mapped flex tail with its PCB termination'],specs.package),
   T('09-01','Compare mapped contacts in the bench cell','Connected flex on an inert bench fixture',['Readout','Use impedance to assess contact; keep dry continuity separate'],specs.wet)],
  'Check conformity on an inert shape':[
   W('12-01','measure','Compare perforated and unperforated films on a mold','Separate perforated and unperforated conformability witnesses','Observed contact-area comparison; no physical or electrical qualification',['Inspect','Fluid/air gaps versus electrical continuity'],'Pair of inert-film mold witnesses')],
 },
 'flex-mesh-four-mask':{
  'Specify cell, stem and I/O regions':[D('Separate four fabrication intents','Unassigned layout','Lower struts, routes/I/O, sites and upper struts mapped to one layout',['Layout output','Four named layers and a contact-to-pad mapping'])],
  'Coat the removable carrier':[
   S('03-02','deposit','Represent the sacrificial nickel support','Silicon carrier witness','Sacrificial Ni on silicon',['Layer selection','Sacrificial Ni; confirm approved material separately'],specs.mesh),
   S('02-07','coat','Apply the lower photosensitive SU-8 layer','Ni-coated silicon carrier witness','Lower SU-8 film above the sacrificial Ni',['Layer ID','Lower structural struts; no spin speed inferred'],specs.mesh)],
  'Expose lower struts and wire the mesh':[
   S('02-01','pattern','Expose the lower strut geometry','Lower SU-8 on carrier','Lower support strut pattern',['Pattern layer','Lower structure; retain true open cells'],specs.mesh),
   S('03-02','deposit','Illustrate adhesion metal and gold on supported traces','Lower struts with wire-level pattern prepared','Adhesion metal and gold over wire-level pattern',['Layer selection','Adhesion layer / Au; preserve route-to-I/O identity'],specs.mesh),
   S('04-06','etch','Clear sacrificial resist around the intended routes','Metal over the prepared resist and wire pattern','Retained gold traces and I/O stem',['End condition','Wire remains within supported lower strut and reaches intended pad'],specs.mesh)],
  'Define the electrode level':[
   S('02-01','pattern','Align the separate electrode pattern','Wired lower struts on carrier','Electrode openings overlap their assigned trace necks',['Pattern layer','Third mask: separately addressable electrodes'],specs.mesh),
   S('03-01','deposit','Illustrate Cr/Pt electrode film','Electrode pattern prepared on the wired mesh','Cr/Pt over patterned site openings',['Layer selection','Cr/Pt contacts, not a blanket continuous array'],specs.mesh),
   S('04-06','etch','Expose the retained individual contacts after lift-off','Cr/Pt over patterned resist and sites','Separate Cr/Pt contacts connected to their own traces',['End condition','Isolated contacts still overlap their intended interconnect'],specs.mesh)],
  'Seal struts and expose interfaces':[
   S('02-07','coat','Apply the upper structural layer','Metal on lower struts, with defined contacts','Upper SU-8 covers the witness before patterning',['Layer ID','Upper structural SU-8'],specs.mesh),
   S('02-01','pattern','Define upper struts and leave device apertures','Upper SU-8 on the wired carrier','Patterned upper struts with open electrode and I/O windows',['Pattern layer','Upper support; no polymer across open cells'],specs.mesh),
   S('16-09','heat','Illustrate the final consolidation step','Patterned upper/lower structural layers','Bound strut layers with contact and pad access preserved',['Process intent','Preserve the two mating structural layers; temperature not programmed'],specs.mesh)],
  'Release and capture the I/O':[
   S('03-12','clean','Represent the pre-release surface treatment','Finished mesh held on sacrificial Ni carrier','Pre-release prepared mesh; no material dimensions inferred',['Sequence','Before removal of the sacrificial metal'],specs.mesh),
   S('04-06','etch','Remove the sacrificial support; recover the released mesh','Mesh supported by sacrificial metal','Free polymer mesh with embedded conductors',['Stop point','Released mesh; the register is not a chemical protocol'],specs.mesh,{shape:'wafer',outgoingShape:'film',afterSpecimen:specs.meshfree}),
   S('16-13','assemble','Register the I/O tail with a connector','Free mesh with accessible I/O tail','Connected mesh witness with mapped termination',['Connection intent','Tail-to-connector registration and mapped continuity'],specs.package,{kind:'handoff'})],
  'Score a bench surrogate':[
   T('05-07','Check contact-to-pad registration','Connected mesh on an inert bench fixture',['Readout','One intact route per intended contact–pad pair']),
   T('09-01','Compare site impedance independently of wire continuity','Same bench mesh specimen; no layer change',['Readout','Electrode interface separate from interconnect fault'],specs.wet)],
 },
 'flex-neurogrid':{
  'Lay out the passive grid':[D('Map the 2015 passive grid to its output pads','Initial passive design','Electrical routes, openings and bond pads distinguished',['Device geometry','256 passive sites; no OECT gain or transistor gates'])],
  'Establish support and metal plane':[
   S('03-08','deposit','Coat lower parylene-C on the carrier','Prepared support carrier','Lower parylene-C insulation',['Layer selection','Lower carrier film'],specs.flex),
   S('02-06','pattern','Register the metal routing pattern','Lower parylene with patterned-layer preparation','Aligned trace and pad pattern',['Pattern intent','Gold routing not equivalent to sensing areas'],specs.flex),
   S('03-01','deposit','Illustrate Pt/Au metal on the wire-level pattern','Lower film with trace and pad pattern','Pt/Au conductor deposition witness',['Layer selection','Pt/Au conductor level'],specs.flex),
   S('04-06','etch','Reveal retained traces after lift-off','Metal over the prepared wire-level pattern','Embedded routing plane with separated pads',['End condition','Continuous wire paths with no short between neighbors'],specs.flex)],
  'Open the polymer-facing sites':[
   S('03-08','deposit','Illustrate upper parylene insulation','Lower film with isolated Pt/Au traces','Upper parylene seals the routing before openings',['Layer selection','Upper permanent parylene barrier'],specs.flex),
   S('02-06','pattern','Register the sensing and backend openings','Upper parylene with patterned-layer preparation','Registered aperture intent',['Pattern intent','Electrode and pad access distinct from insulated traces'],specs.flex),
   S('04-01','etch','Open only the intended sensing interfaces','Patterned upper parylene','Defined contact apertures; main traces remain insulated',['End condition','Keep adjacent gold routing out of the window'],specs.flex)],
  'Form and condition PEDOT:PSS':[
   S('02-07','coat','Illustrate the polymer recording interface','Apertures over insulated routing','PEDOT:PSS added at the intended openings',['Layer selection','A polymer conductor, not an electroplated metal'],specs.flex),
   S('16-09','heat','Represent the thermal treatment as a distinct process stage','Patterned PEDOT:PSS on flex witness','Thermally treated polymer state; conditions not inferred',['Process intent','Thermal treatment before aqueous conditioning'],specs.flex),
   S('04-06','clean','Illustrate the aqueous conditioning handoff','Thermally treated polymer interface','Conditioned sensing windows on supported film',['End condition','Inspect registration and check electrolyte impedance separately'],specs.flex)],
  'Separate film and connect':[
   M('12-01','Inspect the released film and exposed tail','Released flexible article presented for inspection',['Check','Observe apertures and buckled or broken leads'],specs.foil),
   S('16-13','assemble','Map backend pads to the bench readout','Released passive flex with exposed tail','Connected passive array; not a transistor',['Test intent','Pad-to-terminal map and interconnect leakage'],specs.package,{kind:'handoff'})],
  'Compare against an active cell':[
   W('09-02','measure','Run a separate OECT transfer-curve comparison','Inert active coupon with source, drain, channel and independent gate','A transfer readout, not a change to the passive array',['Sweep concept','Gate bias → drain-current response; no device-specific bias assumed'],'Separate OECT source/drain/gate coupon; not NeuroGrid')],
 },
 'tolstosheeva-connector-coupons':{
  'Keep polyimide at connector pads':[
   M('02-12','Inspect the retained Type B pad interface','Type B coupon with unchanged polymer beneath the connector pads',['Selected pad interface','Retained polyimide; the extra Fig. 3B exposure and etch are omitted'],specs.plate)],
  'Clear polyimide at connector pads':[
   S('02-01','pattern','Register the Type C pad-window artwork','C coupon on retained silicon with polyimide above oxide','Window pattern located over the connector pads',['Pattern intent','Open the C pad-region window; retain the silicon base'],specs.plate),
   S('04-01','etch','Illustrate clearing polyimide to the oxide landing surface','Patterned polyimide over silicon-oxide landing','Oxide exposed locally beneath connector pads; silicon retained',['Stop point','Oxide landing surface, not removal of the retained silicon'],specs.plate),
   M('05-02','Inspect the pad-window witness','Type C coupon with exposed oxide landing',['Inspect','Window surface and geometry; taper separate from redundant traces'],specs.plate)],
  'Align and attach four fine-pitch connectors':[
   S('08-04','assemble','Compare connector alignment in the FINEPLACER lambda dry model','Selected B or C coupon and four separate connectors','Dry registration witness, not a joined specimen',['Register analogy','Source used FINEPLACER pico ma; dry lambda model does not validate joints'],specs.plate),
   B('Keep joining conditions separate from dry registration','Dry aligned comparison witness','Externally joined specimens used for the original measurement','Published joined connector coupon; actual mounting and thermal profile not simulated')],
  'Compare measured connector opens':[
   W('05-07','measure','Illustrate a dry continuity test on the assembled coupon','Independent assembled connector witness','Same inserted specimen with discrete opens / shorts report',['Published comparison','Type B: 15–27 opens; Type C: 0–3 of each 32-pin connector'],'Independent connected inert coupon')],
  'Check three parallel subpaths':[
   W('05-07','measure','Probe a separate parallel-trace coupon','Common endpoints with three independent parallel branches','Same coupon; conduction depends on remaining paths and endpoint health',['Fault input','One or two branch opens may pass; all three or a common-end failure fails'],'Independent parallel-trace coupon; not Type B or C')],
 },
 'si-utah':{
  'Register wafer faces and array coordinates':[D('Check pad and needle coordinate origins','Independent face and pad coordinates','Mirrored backside/needle-side transform checked',['Layout check','Use an asymmetric marker to verify the two flips'])],
  'Cut or pattern the root isolation grid':[
   S('04-07','dice','Represent the backside isolation cuts','Flat silicon witness with registered backside','Backside isolation grooves, not yet needle columns',['Cut family','Root isolation first; distinct from the deeper front cuts'],specs.silicon)],
  'Fill the grid with insulating glass and expose the roots':[
   B('Respect the external insulating-glass fill','Back-cut silicon with root grooves','Source glass/silicon composite; actual filling setup is not qualified here','External glass-fill handoff; no register chamber qualification'),
   S('04-09','etch','Compare finishing on a separate glass-filled coupon','Separate glass-filled silicon witness','Planar pad-side witness with visible isolated roots',['End condition','Expose intended root planes without connecting adjacent islands'],specs.silicon,{reset:'Start from a supplied glass-filled coupon, not a simulated local fill'}),
   M('13-01','Inspect the isolation cross-section','Glass-filled silicon witness after finishing',['Inspect','Continuity of fill versus conductive bridges or voids'],specs.silicon)],
  'Register backside metal and the front height envelope':[
   S('02-01','pattern','Register the pad pattern over isolated islands','Backside witness with planar isolated root islands','Pad layout confined to individual isolated islands',['Pattern intent','Pad must not bridge adjacent root islands'],specs.silicon),
   S('03-01','deposit','Illustrate pad-side metal addition','Backside pattern registered over isolated islands','Separated pad footprints; front-shank height remains a separate specification',['Material state','Backside metal for pads; no proprietary composition or fixture inferred'],specs.silicon)],
  'Saw columns, then shape tips':[
   S('04-07','dice','Cut the front-side post array in orthogonal orientations','Front-side silicon witness with isolated roots and pads','Orthogonal cuts leave blunt posts on isolated roots',['Cut pattern','Column family and row height law only for the selected branch'],specs.silicon),
   S('04-06','etch','Illustrate tapering after sawing','Blunt posts on isolated roots','Tapered needle posts, with no inferred tip radius or rates',['Inspect','Tip and root geometry differ; compare center and edge separately'],'Silicon die with protruding posts on a witness carrier')],
  'Metallize, insulate and expose active tips':[
   S('03-03','deposit','Represent the separate tip conductor','Tapered needle witness','Needle conductor present; sidewalls still distinct',['Layer intent','Conductor must not substitute for the sidewall insulator'],'Silicon needle die on a witness carrier'),
   S('03-08','deposit','Represent dielectric coverage of the needle surface','Needle die with conductive tip material','Covered tip and sidewalls before selective opening',['Layer intent','Electrical isolation between the sidewall and active tip'],'Silicon needle die on a witness carrier'),
   S('04-01','etch','Illustrate opening the intended tip area','Dielectric-covered needle witness','Tip-only interface with insulated sidewalls',['End condition','Measure opening separately from sidewall breaches'],'Silicon needle die on a witness carrier')],
  'Map package leads and electrically screen':[
   S('08-02','assemble','Illustrate bonding to the known pin map','Finished die witness and package terminals','Packaged die witness with mapped leads',['Connection intent','Physical row/column distinct from package pin'],specs.package),
   T('09-01','Compare contact screening against the bench map','Connected inert package witness',['Readout','Opens, leakage, impedance and mapped count separate'],specs.wet)],
 },
};

/* Assign a register role, not an undocumented serial path. Physical register IDs
 * 10-13 and 16-13 are specimen/connectivity references, not process machines. */
const roles={};
function role(effect,kind,ids){for(const id of ids.split(' '))roles[id]={effect,kind};}
role('handoff','handoff','01-01 01-02 10-13 11-06 16-02 16-03 16-11 16-13');
role('measure','test','01-05 06-07 09-01 09-02 09-03 09-04 09-06 09-07 09-08 09-10 09-12 10-09 10-10 11-01 11-02 11-05 11-08 11-10 14-01 14-10 14-11 15-05 15-08 15-13 15-14');
role('measure','inspection','02-12 05-01 05-02 05-04 05-05 05-06 05-07 05-10 05-12 10-07 12-01 13-01 13-02 13-05 13-15 14-09');
role('pattern','fabrication','02-01 02-03 02-06 06-01 06-04');
role('coat','fabrication','02-07 02-08 06-10');
role('deposit','fabrication','03-01 03-02 03-03 03-05 03-07 03-08');
role('heat','fabrication','03-09 06-11 16-09');
role('clean','fabrication','03-12 04-05 04-06 16-07');
role('etch','fabrication','04-01 04-02 04-03 04-09');
role('dice','fabrication','04-07 04-08 04-11 08-11');
role('assemble','fabrication','04-12 08-01 08-02 08-04 08-05 08-08 08-10 08-12');
role('measure','inspection','08-06 08-09');
const matter=[
 [/\b(?:TiN|titanium nitride)\b/i,'TiN'],[/\bparylene(?:-C)?\b/i,'parylene'],[/\bpolyimide\b|\bPI\b/,'polyimide'],[/\bSU[-‑ ]?8\b/i,'SU-8'],[/\b(?:Au|gold)\b/i,'gold'],[/\b(?:Pt|platinum)\b/i,'platinum'],[/\b(?:PEDOT:PSS|PEDOT)\b/i,'PEDOT:PSS'],[/\bgraphene\b/i,'graphene'],[/\b(?:silicone|PDMS)\b/i,'silicone'],[/\b(?:photoresist|resist)\b/i,'resist'],[/\boxide\b/i,'oxide'],[/\b(?:elastomer|hydrogel)\b/i,'compliant film']
];
const programs={
 handoff:['Handoff to check','Registration, part identity and compatibility'],
 pattern:['Pattern setup','Select the intended artwork and alignment target; artwork is not reconstructed'],
 coat:['Coating setup','Select the intended film and its coverage; spin/cure settings not inferred'],
 deposit:['Film setup','Select the intended layer/material and protected regions; film settings not inferred'],
 heat:['Thermal intent','Use a distinct heat-treatment stage; conditions are not established for this register model'],
 clean:['Treatment intent','Keep cleaning, activation, wet processing and removal endpoints distinct'],
 etch:['Removal intent','Mark openings and the layer to retain; no etch chemistry, rate or endpoint value inferred'],
 dice:['Cut/finish intent','Track cut alignment or surface endpoint on the model fixture; no operating parameter inferred'],
 assemble:['Assembly setup','Mate the specified surfaces and record registration before testing'],
 measure:['Readout setup','Choose the observation and check it independently of fabrication'],
};
function wanted(title,detail,shape){
 const s=title.toLowerCase();const d=detail.toLowerCase();
 if(shape==='boundary')return ['none'];
 if(/^(?:clear |unmask|define exposure apertures|define (?:the |a )?(?:etch|opening))/i.test(s))return ['etch','clean','pattern','measure'];
 if(/^(?:tile .*exposure|photoform|create a .* map on)/.test(s))return ['pattern','handoff'];
 if(shape==='layout'||/^(?:draft|keep a (?:coordinate|pin)|set coordinates|track (?:mapping|revision)|lock sku)/.test(s))return ['handoff','pattern','measure'];
 if(/^(?:polish|sand|thin|grind|cut|saw|dice|mill|trim|shape|sharpen|slice|split|machin)/.test(s))return ['dice','etch','clean','measure'];
 if(/^(?:clean|condition|activate|treat|rinse|soak|strip|release|peel|recover|separate (?:film|carrier|sheet)|sacrificial)/.test(s)||shape==='release')return ['clean','etch','handoff','measure'];
 if(/^(?:form|plate|grow|build|fabricate|make|create|deposit|coat|cast|spin|oxidize|passivat|insulat|metalli[sz]|add|apply)/.test(s)){
  if(/cast|coat|spin|film on/.test(s))return ['coat','deposit','heat','assemble','etch'];
  if(/electro(?:plate|form|deposit)|electrochemical plate|plating/.test(s+' '+d.slice(0,135)))return ['deposit','coat','assemble'];
  if(/deposit|c[o-]*sputter|evaporat|metal|passivat|trace|conductor|encapsul/.test(s))return ['deposit','coat','pattern','etch','assemble','clean'];
  if(/mold|jacket|film|base|polymer|hydrogel|insulat/.test(s))return ['coat','deposit','dice','heat','assemble','clean'];
  if(/test|inspect|verify/.test(s))return ['measure'];
 }
 if(/^(?:attach|assemble|align|package|connect|join|mount|secure|integrate|encapsulate|bond|seal|terminate|fold|roll|wrap|weld|splice|seat|reflow|glue|pot|interface|place and secure|transfer and contact)/.test(s)||shape==='bond')return ['assemble','heat','handoff','measure','coat'];
 if(/^(?:cure|anneal|heat|bake)/.test(s))return ['heat','coat','deposit','assemble'];
 if(/^(?:select and test|exercise|test|verify|check|inspect|measure|compare|simulate|probe|score|screen|assay|map (?:electrical|and test|the .* assembly|connectivity|optical)|audit|validate|capture a trace|monitor|read|trace|bench|recheck|calibrat|apply .*\b(?:signal|load)|run .* comparison|acquire|close .* (?:loop|test)|scan or hold)/.test(s)||shape==='inspect')return ['measure'];
 if(/^(?:open|etch|dealloy|ablate|remove|develop|uncover)/.test(s)||shape==='remove')return ['etch','clean','dice'];
 if(/^(?:expose|write|photoform|lithograph)/.test(s)||shape==='expose')return ['pattern','deposit','etch','coat','clean'];
 if(shape==='coat')return ['deposit','coat','heat','clean'];
 if(shape==='prepare')return ['clean','handoff','coat','deposit','measure'];
 if(/^(?:coupon path|finish|reconstruct shank)/.test(s))return ['dice','etch','measure','clean','assemble'];
 if(/^(?:bias the laminate|make .*curv)/.test(s))return ['coat','heat','assemble','measure'];
 if(/^(?:build .*sacrificial|place .*fanout|route or omit)/.test(s))return ['pattern','deposit','coat','heat'];
 if(/plasma|strip|release|wet etch|rinse/.test(d.slice(0,125)))return ['clean','etch','coat','measure'];
 if(/sputter|evaporat|deposit|deposition/.test(d.slice(0,125)))return ['deposit','pattern','coat'];
 if(/connect|package|mount|attach/.test(d.slice(0,125)))return ['assemble','handoff','measure'];
 if(/route|traces?|mask|artwork|align/.test(d.slice(0,125)))return ['pattern','deposit','handoff','measure'];
 return [];
}
function candidate(step,shape){
 const intent=wanted(step.title,step.detail,shape);
 const ids=list(step.tools).filter(id=>roles[id]&&id!=='10-13');
 const title=step.title.toLowerCase();
 const contextual=id=>id==='09-01'&&/^(?:electroplate|plate|electroform|electrodeposit)\b/.test(title)?{effect:'deposit',kind:'fabrication'}:roles[id];
 const reviewOnly=()=>{
  const inspect=ids.find(id=>roles[id].kind==='inspection');
  if(inspect)return {id:inspect,effect:'measure',kind:'inspection',unmapped:true};
  const station=ids[0];
  return {id:station||'',effect:'handoff',kind:'handoff',unmapped:true};
 };
 if(!intent.length)return reviewOnly();
 let lead=null,top=-Infinity;
 for(const [i,id] of ids.entries()){
  const r=contextual(id),at=intent.indexOf(r.effect); if(at<0)continue;
  let score=50-7*at-i;
  if(r.kind==='inspection'&&/^(?:measure|inspect|check)\b/.test(title))score+=3;
  if(id==='12-01'&&/^(?:electrical|test|exercise|impedance|probe|screen|check (?:continuity|impedance))\b/.test(title))score-=8;
  if(id==='01-01'&&shape==='layout')score+=15;
  if(id==='16-13'&&/connector|terminal|cabl/.test(title))score+=3;
  if(score>top){top=score;lead={id,...r};}
 }
 return lead||reviewOnly();
}
function specimenFor(profile,step,r){
 const f=(profile.family+' '+profile.title).toLowerCase(),s=(step.title+' '+first(step.detail)).toLowerCase();
 if(r.id==='01-01'||r.id==='01-02')return specs.layout;
 if(r.id==='01-05')return 'Digital signal record, not a loaded wafer';
 if(r.id==='09-01'||r.id==='09-12')return specs.wet;
 if(r.kind==='test'||/\bpackage|wire bond|pcb|headstage|connector|harness\b/.test(s))return specs.bench;
 if(/\b(filament|microwire|fib[er]+|drawn wire|wire bundle|draw|microlead|life|dime|neurotassel)\b/.test(f))return 'Inert fiber or wire witness on a support fixture';
 if(/\bcuff\b|stent|lead package/.test(f))return 'Inert cuff, scaffold or lead witness on an appropriate fixture';
 if(/foil|array|mesh|flex|polymer|film|optoelectr/.test(f)&&!/^si-np/.test(profile.id))return /\b(?:release|peel)\b/.test(s)?specs.foil:specs.flex;
 if(/\bcm[a-z]+|silicon|wafer|die\b/.test(f+' '+s))return specs.silicon;
 return 'Representative inert specimen or teaching fixture';
}
function states(effect,material,shape){
 const m=material?material+' ':'';
 switch(effect){
 case 'pattern':return ['Unpatterned resist or design witness','Registered pattern intent; no material removal shown'];
 case 'coat':return ['Representative prepared surface','New '+m+'coating on the teaching witness'];
 case 'deposit':return ['Representative prepared workpiece','Added '+m+'film where intended on the witness'];
 case 'heat':return ['Representative article prior to heat treatment','Distinct thermal-treatment state; no geometry or temperature inferred'];
 case 'clean':return shape==='release'?['Film resting on carrier','Released film as a distinct reference state']:['Witness before surface treatment','Treated surface; no chemical recipe or tolerance inferred'];
 case 'etch':return ['Representative film or substrate before the opening','Material removed in the intended region; exact geometry not recovered'];
 case 'dice':return ['Representative uncut or unfinished substrate','Cut/thinned comparison witness; exact dimensions not inferred'];
 case 'assemble':return ['Separate specimen and mating components','Joined or aligned comparison witness; no production package claim'];
 case 'measure':return ['Representative witness in test-ready state','Specimen unchanged; inspection or bench readout is distinct from fabrication'];
 default:return ['Existing specimen, design record or supplied part','Recorded handoff; no unsupported material change'];
 }
}
function fallback(profile,step,shape){
 if(shape==='boundary'||step.status==='external')return [B(step.title,'Published input or supplier handoff','Not executed in this player. No new material state is inferred.','External or unknown specimen; not loaded')];
 const r=candidate(step,shape);
 // With more than one mentioned material the text may describe the
 // substrate rather than the added film. Keep the visual generic in that case.
 const named=matter.filter(([re])=>re.test(step.title+' '+first(step.detail)));
 const material=named.length===1?named[0][1]:'';
 const [before,after]=states(r.effect,material,shape);
 const p=programs[r.effect]||programs.handoff;
 const settings=r.unmapped
  ? [['Model scope',r.id?(r.kind==='inspection'?'Inspect a finished witness only; the fabrication or joint is not modeled':'Register candidate shown for context; mechanism not assigned'):'No register machine is assigned'],['Route instruction',fit(first(step.detail),123)]]
  : [p,['Route instruction',fit(first(step.detail),123)]];
 const operation=r.unmapped&&r.id?(r.kind==='inspection'?'Inspect an already prepared witness for this handoff':'Review the model candidate and handoff'):step.title;
 return [S(r.id,r.effect,operation,before,after,settings,specimenFor(profile,step,r),{kind:r.kind,comparison:true,...(/^compare|separate|independent witness/.test(step.title.toLowerCase())&&/\b(?:independent|separate|different)\b/.test(step.detail.toLowerCase().slice(0,110))?{reset:'Separate comparison; do not infer a physical transfer'}:{})})];
}
const name=e=>text(e?.name).split(' · ')[0]||'';
function branchProgram(profile,variant,item){
 if(!variant)return [];
 if(profile.id==='si-np1'&&item.index!==5)return [['Selected probe geometry',variant.id==='paper'?'2017 study: 70 × 20 µm shank section':'Production reference: 70 × 24 µm shank section']];
 if(profile.id==='si-np2')return [['Selected site map',variant.id==='four'?'Four shanks, 5,120 physical sites; 384 concurrent':'Single shank, 1,280 physical sites; 384 concurrent']];
 if(profile.id==='flex-ptnr'&&item.index>=1)return [['Published site layout',variant.label]];
 if(profile.id==='tolstosheeva-connector-coupons'&&item.index===3)return [['Expected direction',variant.id==='b'?'Published Type B results: higher open count':'Published Type C results: lower open count']];
 return [];
}
function sceneFor(profile,variant,item,record,lookup,prev){
 const id=record.id,step=item.step;
 const known=id&&list(step.tools).includes(id)&&lookup(id);
 const kind=record.kind||(id?roles[id]?.kind:'handoff')||'handoff';
 const machine=kind==='unknown'?'External process boundary':known?text(known.name):'Unassigned operation / handoff';
 const operation=record.operation;
 const raw=record.program||[];
 const program=Array.isArray(raw[0])?raw:raw.length?[raw]:[];
 const digital=record.specimen===specs.layout||id==='01-05';
 const shape=record.shape||(record.specimen===specs.panel?'die':record.specimen===specs.coupon?'die':record.specimen===specs.package?'assembly':record.specimen===specs.mesh?'wafer':undefined);
 const dimension=record.size||(id==='02-03'&&record.specimen===specs.panel?10:undefined);
 const settings=kind==='unknown'?[['Execution','Held outside the local simulation']]:[
  ...program.filter(p=>text(p[1])),...branchProgram(profile,variant,item),
  ...(id==='02-03'&&record.specimen===specs.panel?[['Demo footprint','10 mm square local witness; not the research panel or mask extent']]:[]),
  ...((kind==='fabrication'&&!record.comparison)?[['Machine parameters','Not established for this register configuration']]:[])
 ];
 const cross=prev?.kind==='unknown'?'New local witness or supplied part after boundary; no continuous transfer claimed':prev?.kind==='handoff'&&!prev.equipmentId?'After a documentation handoff; no physical transfer claimed':prev?.specimen===specs.layout||prev?.equipmentId==='01-05'?'After digital preparation; load a separate physical witness':prev?.stationLabel||'Start on a suitably supported witness';
 return {
  machine,equipmentId:known?id:undefined,equipmentUrl:known?text(known.simulatorUrl||known.url):'',
  stationLabel:kind==='unknown'?'Evidence boundary':known?(name(known)||id):'Handoff without a station',
  operation,before:record.before,after:record.after,settings,specimen:record.specimen,
  workpieceShape:shape,outgoingShape:record.outgoingShape,afterSpecimen:record.afterSpecimen,sizeMm:dimension,
  context:'atlas',nonphysical:digital||kind==='unknown',
  evidence:kind==='unknown'?boundary:step.status==='documented'?'Source describes the route; '+process.toLowerCase():'Reference or inferred comparison; '+process.toLowerCase(),
  transferFrom:kind==='unknown'?'Literature or supplier handoff; no local machine operation':record.reset||cross,
  kind,effect:record.effect,
  independent:Boolean(record.reset)
 };
}
function makeScenes(profile,variant,items,lookup=()=>undefined){
 let previous;
 return items.map(item=>{
  const step=item.step,key=item.kind;
  const named=reviewed[profile.id]?.[step.title];
  const curated=(key!=='boundary'||named?.every(s=>s.kind==='unknown'))?named:null;
  // An atlas evidence edit must never turn an obsolete station reference into a
  // new tool: if a reviewed row cites a removed ID the verified default is used.
  const records=curated&&curated.every(s=>!s.id||list(step.tools).includes(s.id))?curated:fallback(profile,step,key);
  const stations=records.map(record=>{
   const scene=sceneFor(profile,variant,item,record,lookup,previous);
   previous=scene;
   return scene;
  });
  return {...item,stations};
 });
}
const api={makeScenes,candidate};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AtlasCleanroomScenes=api;
})(globalThis);
