/*
 * Equipment Register asset adapter, pinned to site revision fcf3c7d.
 * Positions and cameras refer to the loaded glTF scene, in metres, +Y up.
 * Rotation is XYZ Euler radians. nodeOps use named GLTF nodes, with positions in
 * those nodes' own units (do not rescale their positions after loading).
 * Authored interpolants between register landmarks are dry teaching views;
 * they are not real collision-tested trajectories, settings or process results.
 */
const zero=[0,0,0], pi=Math.PI;
const freeze=x=>{
 if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}
 return x;
};
export const CLEANROOM_MODEL_VERSION='1.0.0';
export const CLEANROOM_LOADER=freeze({threeUrl:'/vendor/three/three.module.js',threeRevision:'182',loaderImport:'three/addons/loaders/GLTFLoader.js',mode:'Use Astro bundling or a same-version, locally bundled loader.'});
const source=id=>'/simulations/equipment/'+id+'/simulator/';
const part=(t,position,phase,{rotation=zero,seated=false}={})=>({t,position,rotation,phase,seated,visible:true});
const change=(name,property,keyframes)=>({name,property,keyframes});
const round=(nominalMm,acceptedMm,poses,extra={})=>({shape:'round',nominalMm,acceptedMm,poses,...extra});
const face=(size)=>size===150?0:pi/6;
function slotPaths(size){
 const isBig=size===150,x=isBig?.132:-.177,pz=isBig?-.094:-.089,r=[0,face(size),0];
 const start=isBig?[x,.0164,pz]:[x,.0084,.125], dest=[x,.0284,pz];
 return [
  part(0,start,isBig?'Dry: cassette B01 datum':'Dry: 100 mm staging tray',{rotation:r,seated:true}),
  part(.25,isBig?[x,.0164,.055]:[x,.078,.125],'Withdraw clear of starting support',{rotation:r}),
  part(.48,[-.002,.077,.064],'Transport via the virtual wand datum',{rotation:r}),
  part(.72,[x,.0284,.067],'Align at the cassette opening',{rotation:r}),
  part(.91,dest,isBig?'Seated in slot B02':'Seated in slot A02',{rotation:r,seated:true}),
  part(1,dest,isBig?'Seated in slot B02':'Seated in slot A02',{rotation:r,seated:true})
 ];
}
const curated={
 '16-11':{
  title:'Wafer custody and cassettes',camera:{eye:[.51,.37,.62],target:[0,.027,.025]},
  handling:'native-landmarks',hideNodes:['Pose_W100_01','Pose_W150_01'],
  wafer:round(150,[100,150],slotPaths(150),{poseSets:{100:slotPaths(100),150:slotPaths(150)},thicknessMm:.675}),
  limit:'Original Register cassette and carrier assets. The A/B slots accept different diameter classes. Dry identity and orientation only; the lifted path is illustrative.',
  evidence:['/equipment/16-11/handling.mjs','/equipment/16-11/vr-station.json'],
 },
 '02-07':{
  title:'Laurell WS-650Mz spin coater',camera:{eye:[.42,.54,.54],target:[.02,.235,.025]},
  handling:'native-landmarks',hideNodes:['wafer'],nodeTracks:[change('lid_pivot','rotation',[[0,zero],[.18,[-75*pi/180,0,0]],[.72,[-75*pi/180,0,0]],[1,zero]])],
  wafer:round(150,[50,75,100,125,150],[
   part(0,[0,.36,.265],'Wafer outside the spin bowl'),
   part(.23,[0,.365,.16],'Lid raised; approach over the bowl'),
   part(.43,[0,.353,0],'Centered above the vacuum chuck'),
   part(.72,[0,.245,0],'Lowered onto the virtual chuck',{seated:true}),
   part(1,[0,.245,0],'On the chuck under the lid',{seated:true})
  ],{rangeMm:[50,150],thicknessMm:.675}),
  limit:'Named Register spin chamber and hinge. This is centered dry handling only; spin thickness requires the separate calibrated witness and is not established here.',
  evidence:['/equipment/02-07/solver.mjs'],
 },
 '02-08':{
  title:'Cee 200CBX coater and hotplate',camera:{eye:[.58,.57,.68],target:[.025,.247,-.025]},
  handling:'native-landmarks',hideNodes:['spin_wafer','spin_wafer_mark','bake_wafer'],
  nodeTracks:[
   change('spin_lid','rotation',[[0,zero],[.2,[-1.31,0,0]],[.82,[-1.31,0,0]],[1,zero]]),
   change('bake_lid','rotation',[[0,zero],[.47,zero],[.62,[-1.31,0,0]],[1,[-1.31,0,0]]])
  ],
  wafer:round(100,[100,125],[
   part(0,[.176,.343,.225],'Approach the cold spin bay'),
   part(.30,[.176,.348,-.048],'Hover above the spin chuck'),
   part(.49,[.176,.264,-.048],'At the modeled spin chuck',{seated:true}),
   part(.65,[.09,.367,-.045],'Dry transfer between bays'),
   part(.82,[-.17,.367,-.035],'Above the hotplate; no heating modeled here'),
   part(1,[-.17,.2888625,-.035],'On the modeled hotplate',{seated:true})
  ],{thicknessMm:.725}),
  limit:'The 100/125 mm original Register geometry is re-used. This shows a single virtual specimen pose, not the station’s two-wafer thermal experiment or a production bake.',
  evidence:['/equipment/02-08/solver.mjs'],
 },
 '02-01':{
  title:'SUSS MA/BA6 Gen4 contact aligner',camera:{eye:[.79,1.52,1.22],target:[.01,1.035,.20]},
  handling:'native-landmarks',hideNodes:['wafer','wafer_mark_h-20','wafer_mark_v-20','wafer_mark_h20','wafer_mark_v20','guard','optical_head'],
  nodeTracks:[change('transport','position',[[0,[0,1.045,.11]],[.18,[0,1.045,.27]],[.62,[0,1.045,.27]],[1,[0,1.045,.11]]])],
  wafer:round(150,[150],[
   part(0,[0,1.153,.565],'From the front of the alignment station'),
   part(.23,[0,1.145,.444],'Drawer extended'),
   part(.42,[0,1.142,.27],'Above the selected wafer chuck'),
   part(.62,[0,1.0838,.27],'Seated on the extended drawer',{seated:true}),
   part(1,[0,1.0838,.11],'Drawer returned to the teaching aligner',{seated:true})
  ],{thicknessMm:.675}),
  limit:'Reuses the register’s 150 mm round configuration, physical-scale load slide and cutaway. No alignment, contact photolithography or developed critical dimension is implied.',
  evidence:['/equipment/02-01/solver.mjs'],
 },
 '02-03':{
  title:'Heidelberg Instruments MLA 150',camera:{eye:[.67,1.54,1.38],target:[-.10,1.16,.26]},
  handling:'native-landmarks',hideNodes:['coupon','small_coupon_adjustment_aid'],
  nodeTracks:[
   change('loading_window','position',[[0,zero],[.19,[0,-.72,0]],[.85,[0,-.72,0]],[1,zero]]),
   change('stage','position',[[0,[-.1,0,.075]],[.20,[-.1,0,.195]],[.61,[-.1,0,.195]],[.86,[-.1,0,.075]],[1,[-.1,0,.075]]])
  ],
  wafer:{shape:'square',nominalMm:10,acceptedMm:[6,10,20,50,100,150],rangeMm:[6,150],thicknessMm:.5,thicknessRangeMm:[.1,6.3],poses:[
   part(0,[-.10,1.187,.81],'Square coupon outside the load window'),
   part(.23,[-.10,1.185,.69],'Loading window down; stage moved forward'),
   part(.46,[-.10,1.175,.195],'Coupon positioned over the vacuum chuck'),
   part(.61,[-.10,1.14125,.195],'Seated on the forward chuck',{seated:true}),
   part(.86,[-.10,1.14125,.075],'Stage returned inside the cabinet',{seated:true}),
   part(1,[-.10,1.14125,.075],'On the chuck; dry playback only',{seated:true})
  ]},
  limit:'Square coupon only in the selected register model. Its 6–150 mm carrier range is an educational input. Written field, actual holder and real feature size remain separate.',
  evidence:['/equipment/02-03/solver.mjs'],
 },
 '02-10':{
  title:'SUSS Delta12AQ spin-spray developer',camera:{eye:[.77,1.46,1.38],target:[-.18,1.00,.08]},
  handling:'native-landmarks',hideNodes:['sample_wafer','bay_roof','door_glazing','spray_indicator'],
  nodeTracks:[
   change('loading_door','position',[[0,[0,0,.315]],[.23,[0,.44,.315]],[.49,[0,.44,.315]],[.63,[0,0,.315]],[1,[0,0,.315]]])
  ],
  wafer:round(150,[150],[
   part(0,[-.428,.974,.49],'150 mm wafer approaches the cassette bay'),
   part(.25,[-.428,.977,.245],'Loading access open'),
   part(.43,[-.428,.95,.007],'In the input cassette',{seated:true}),
   part(.58,[-.428,.95,.007],'Bay closed for a dry transfer',{seated:true}),
   part(.75,[-.304,.995,.0085],'Illustrated cassette-to-chuck transfer'),
   part(.92,[-.18,.9493375,.010],'On the center chuck',{seated:true}),
   part(1,[-.18,.9493375,.010],'Developer chuck; no chemistry in this view',{seated:true})
  ],{thicknessMm:.675}),
  limit:'The animated Register viewer fixes the cassette at 150 mm even though the standalone solver lists more sizes. Spray chemistry and developed output are not enacted in this dry view.',
  evidence:['/equipment/02-10/solver.mjs','/equipment/02-10/example-input.json'],
 },
 '02-11':{
  title:'SUSS ACS200 Gen3 dry transfer',camera:{eye:[.98,1.56,1.86],target:[-.035,1.075,.17]},
  handling:'native-landmarks',hideNodes:['DRY_W01','DRY_W02','DRY_W03','INSPECTION_COVER'],
  nodeTracks:[change('TRANSFER_ARM','position',[[0,[0,1.062,-.122]],[.34,[0,1.062,-.122]],[.52,[0,1.062,.018]],[.76,[0,1.062,.018]],[1,[0,1.062,-.122]]])],
  wafer:round(200,[200],[
   part(0,[-.572,1.0544,.51],'Approach the 200 mm cassette'),
   part(.22,[-.572,1.0544,.30],'In original slot CAS-A/01',{seated:true}),
   part(.38,[-.572,1.0624,.49],'Withdraw from virtual cassette'),
   part(.62,[0,1.0624,.018],'At the named transfer-arm waypoint'),
   part(.84,[.483,1.0544,-.012],'At the named dry chuck CH-200',{seated:true}),
   part(1,[.483,1.0544,-.012],'Dry chuck seat; no film revision',{seated:true})
  ],{thicknessMm:.8}),
  limit:'Use the register’s named 200 mm cassette, arm and chuck. Continuous movement between poses is not robot kinematics. No coating tool operation or deposited film is inferred.',
  evidence:['/equipment/02-11/xr.json','/equipment/02-11/example-batch.json'],
 },
 '03-01':{
  title:'Temescal BJD 1800 and inert witness carrier',camera:{eye:[.73,1.59,1.23],target:[.32,1.015,.03]},
  handling:'detached-witness',hideNodes:['witness'],
  nodeTracks:[change('display_cover','position',[[0,[.34,.958,-.07]],[.21,[.34,1.258,-.07]],[1,[.34,1.258,-.07]]])],
  wafer:round(100,[100],[
   part(0,[.34,1.26,.30],'Outside the original dry carrier display'),
   part(.52,[.34,1.05,.048],'Above the inert witness pocket'),
   part(.86,[.34,.979,.048],'On the detached witness carrier',{seated:true}),
   part(1,[.34,.979,.048],'Detached witness only; not the evaporation chamber',{seated:true})
  ],{thicknessMm:5}),
  limit:'The open display and carrier are the site-authored off-tool geometry and shadowing witness. The wafer does not enter an evaporation chamber and no material is deposited.',
  evidence:['/equipment/03-01/interactions.json'],
 },
 '03-03':{
  title:'Kurt J. Lesker PVD 75',camera:{eye:[.27,1.58,1.38],target:[-.28,1.31,.22]},
  handling:'native-landmarks',hideNodes:['sample_wafer'],
  nodeTracks:[change('door_pivot','rotation',[[0,zero],[.2,[0,-1.9,0]],[.82,[0,-1.9,0]],[1,zero]])],
  wafer:round(100,[50,75,100,125,150,200,203.2],[
   part(0,[-.28,1.28,.675],'Witness disc outside the dry chamber'),
   part(.24,[-.28,1.28,.46],'Chamber door open; specimen face down',{rotation:[pi,0,0]}),
   part(.49,[-.28,1.29,.18],'Into the original chamber opening',{rotation:[pi,0,0]}),
   part(.66,[-.28,1.31,.04],'Below the top-mounted witness holder',{rotation:[pi,0,0]}),
   part(.82,[-.28,1.378,.04],'Placed under the stage',{rotation:[pi,0,0],seated:true}),
   part(1,[-.28,1.378,.04],'Under the modeled stage; no live deposition',{rotation:[pi,0,0],seated:true})
  ],{rangeMm:[1,203.2],thicknessMm:3}),
  limit:'Existing chamber door, inverted witness stage and sample anchor. Size is a display envelope, not evidence of a real holder, target or rate-map coverage.',
  evidence:['/equipment/03-03/pvd75.gltf'],
 },
 '03-05':{
  title:'Savannah S100 and detached dry alignment gauge',camera:{eye:[.77,1.14,.77],target:[.43,.79,.12]},
  handling:'detached-witness',hideNodes:['dummy'],
  wafer:round(100,[100],[
   part(0,[.421,.915,.36],'Approach the detached gauge'),
   part(.49,[.421,.896,.134],'Centered above the external gauge'),
   part(.89,[.421,.763,.134],'In the external dry gauge',{seated:true}),
   part(1,[.421,.763,.134],'Gauge only; no ALD chamber access',{seated:true})
  ],{thicknessMm:4}),
  limit:'The 112 mm detached ring is a teaching prop and is not a chamber dimension. The displayed centered 100 mm witness does not establish a wafer holder or an ALD process.',
  evidence:['/equipment/03-05/interactions.json'],
 },
 '04-02':{
  title:'Oxford PlasmaLab 100 · 100 mm ICP witness',camera:{eye:[-.73,1.72,1.25],target:[-.23,1.23,.04]},
  handling:'native-landmarks',hideNodes:['Wafer_carriage','Process_chamber_shell','ICP_source_cover','Cover_handle','Viewport_rim','Viewport_glass','Caution_plate','Grounded_process_vessel','Dielectric_source_tube','Plasma_schematic'],
  nodeTracks:[change('Load_lid_pivot','rotation',[[0,zero],[.16,[-100*pi/180,0,0]],[.52,[-100*pi/180,0,0]],[.70,zero],[1,zero]]),change('Load_lid_pivot','visible',[[0,true],[.70,false],[1,false]])],
  wafer:round(100,[100],[
   part(0,[-.525,1.29,.43],'100 mm disc outside the load-lock'),
   part(.24,[-.525,1.268,.155],'Load lid swung open'),
   part(.41,[-.525,1.255,-.015],'Over the load-lock tray'),
   part(.52,[-.525,1.206,-.015],'Seated in the load-lock',{seated:true}),
   part(.70,[-.525,1.206,-.015],'Load-lock closed, shown in cutaway',{seated:true}),
   part(.87,[-.245,1.222,-.015],'Transfer through the inspection cutaway'),
   part(1,[.032,1.229,-.015],'On the 100 mm teaching electrode',{seated:true})
  ],{thicknessMm:.525}),
  limit:'The native model provides 100 mm load-lock and chamber anchors only. After closing, the lid is hidden as a display cutaway so transfer remains visible. This is the 100 mm ZEP/Si/SiO₂ example, not a 150/200 mm product process.',
  evidence:['/equipment/04-02/oxford-icp180.gltf'],
 },
 '04-03':{
  title:'Oxford PlasmaPro 100 Cobra 300 · silicon DRIE witness',camera:{eye:[.95,1.9,1.61],target:[0,1.155,.31]},
  handling:'native-landmarks',hideNodes:['wafer_150mm','source_cover'],
  nodeTracks:[
   change('lid_pivot','rotation',[[0,zero],[.17,[-pi*.44,0,0]],[.47,[-pi*.44,0,0]],[.65,zero],[1,zero]]),
   change('carrier','position',[[0,[0,1.066,.605]],[.67,[0,1.066,.605]],[.91,[0,1.16,.02]],[1,[0,1.16,.02]]]),
   change('transfer_gate','visible',[[0,true],[.66,false],[1,false]])
  ],
  wafer:round(150,[150],[
   part(0,[0,1.231,1.005],'150 mm wafer outside the Cobra load-lock'),
   part(.20,[0,1.226,.864],'Load-lock raised'),
   part(.34,[0,1.20,.605],'Above the native carrier plate'),
   part(.47,[0,1.075,.605],'On the native load-lock carrier',{seated:true}),
   part(.67,[0,1.075,.605],'Lid closed; transfer begins',{seated:true}),
   part(.91,[0,1.169,.02],'Carrier arrived at the teaching chuck',{seated:true}),
   part(1,[0,1.169,.02],'On the 150 mm straight-trench witness fixture',{seated:true})
  ],{thicknessMm:.675}),
  limit:'Reuse the 150 mm register clamp/load-lock model. The 200 mm Neuropixels wafer does not fit this model; the isolated-trench witness is not through-release.',
  evidence:['/equipment/04-03/example.json','/equipment/04-03/output-schema.json']
 },
};

// One currently published Register model per equipment ID; lookup never guesses another asset.
const register={
 "01-01":["/equipment/01-01/mask-console.glb","CAD/mask workstation","Bounded teaching model","Verified restricted GDSII round trip and planar trace continuity"],
 "01-02":["/equipment/01-02/workstation.glb","Multiphysics workstation","Bounded teaching model","First pass: verified uniform slab electrical model"],
 "01-03":["/equipment/01-03/p7-rtx6000.glb","GPU visualization node","Support or custody only","Deterministic synthetic FIFO, allocation and multiresolution budget"],
 "01-04":["/equipment/01-04/connectomics-console.glb","Connectomics console","Support or custody only","Synthetic two-tile two-scale seam, labels and exact world coordinates verified"],
 "01-05":["/equipment/01-05/analysis-console.glb","Neural data analysis console","Inspection or replay only","Synthetic event timing and labeled-event summaries; no new acquisition or spike sorting."],
 "01-06":["/equipment/01-06/rack.glb","Data infrastructure","Support or custody only","Virtual fit, power budget and archive/restore"],
 "01-07":["/equipment/01-07/drafting-table.glb","Engineering drafting table","Bounded teaching model","1:1 planar drawing / specimen overlay with vertex-anchored dimensions"],
 "02-01":["/equipment/02-01/ma6-gen4.glb","Contact mask aligner","Bounded teaching model","Rigid two-mark alignment and ideal contact / Gaussian proximity dose; analytic checks passed"],
 "02-02":["/equipment/02-02/mjb3.glb","Manual mask aligner","Bounded teaching model","Ideal hard-contact dose and overlay; eight analytic/contract test bodies passed"],
 "02-03":["/equipment/02-03/mla150.gltf","Maskless laser writer","Bounded teaching model","Two-stripe commanded dose model; analytic acceptance checks passed"],
 "02-04":["/equipment/02-04/dwl2000.glb","Photomask pattern generator","Inspection or replay only","Dry two-mark rigid preview and type/tone preservation; no exposure"],
 "02-05":["/equipment/02-05/ebpg5200.gltf","Electron-beam lithography","Bounded teaching model","Analytic exposure model; verification fixtures"],
 "02-06":["/equipment/02-06/pas5500.glb","Optical projection stepper","Bounded teaching model","Geometric projection and overlay; analytic checks passed"],
 "02-07":["/equipment/02-07/laurell.gltf","Spin coater","Bounded teaching model","Graph-calibrated AZ 1512 solver; numerical checks passed; spatial map illustrative"],
 "02-08":["/equipment/02-08/cee-200cbx.glb","Coat/bake system","Bounded teaching model","Paired pre-bake maps, bounded user-point calibration, independent thermal histories and numerical verification; no experimental validation"],
 "02-09":["/equipment/02-09/yes310ta.glb","Vapor prime oven","Bounded teaching model","Surface event model v1.1; 41 reference checks executed"],
 "02-10":["/equipment/02-10/delta12aq.glb","Automated resist developer","Bounded teaching model","Ideal threshold, Mack finite-rate contrast and dose-to-clear inversion; 20 analytic checks passed; uncalibrated"],
 "02-11":["/equipment/02-11/acs200.glb","Automated coater","Inspection or replay only","Verified dry handling identity, cancellation and fixture-size rejection (no coating)"],
 "02-12":["/equipment/02-12/lv100nd.glb","Inspection microscope","Bounded teaching model","Synthetic reflected image with calibrated FOV, objective, focus and pitch verification"],
 "03-01":["/equipment/03-01/bjd-1800-witness.glb","Electron-beam evaporation","Inspection or replay only","First pass: passive carrier fit and geometric optical shadow analogy; deposition out of scope"],
 "03-02":["/equipment/03-02/auto-306-display.glb","Thermal evaporation","Inspection or replay only","Read-only comparison of fixed mirror-coupon and blank maps; no evaporation model."],
 "03-03":["/equipment/03-03/pvd75.gltf","Magnetron sputtering","Bounded teaching model","Numerical witness map · verified synthetic cases"],
 "03-04":["/equipment/03-04/discovery635.glb","Sputter system","Inspection or replay only","Passive inert fit and read-only layer inspection"],
 "03-05":["/equipment/03-05/savannah-s100.glb","Atomic layer deposition","Inspection or replay only","First pass: dry circular fit verified; process model out of scope"],
 "03-06":["/equipment/03-06/fiji-g2-static.glb","Plasma-enhanced ALD","Exhibit only","Static inert-gauge example verified only; no film or process simulation"],
 "03-07":["/equipment/03-07/oxford80plus.glb","PECVD","Inspection or replay only","View-only dry fit and static fictional reference maps; no plasma process"],
 "03-08":["/equipment/03-08/labcoter2.glb","Parylene coating","Inspection or replay only","Verified read-only normal offsets and contact-mask geometry; no deposition"],
 "03-09":["/equipment/03-09/mini-mite-display.glb","Polymer cure / anneal furnace","Inspection or replay only","Inert centered-clearance check verified; thermal model not implemented"],
 "03-10":["/equipment/03-10/vulcan-3-1750.glb","High-temperature box furnace","Inspection or replay only","First pass: empty tray geometry verified; thermal treatment out of scope"],
 "03-11":["/equipment/03-11/rtp600xp.glb","Rapid thermal processing","Inspection or replay only","Non-operational dry carrier lateral clearance only"],
 "03-12":["/equipment/03-12/pdc32g2-static.glb","Plasma surface treatment","Exhibit only","Invented exterior footprint gauge only; no treatment simulation"],
 "04-01":[null,"Reactive ion etcher","Bounded teaching model","Analytical fixtures passed"],
 "04-02":["/equipment/04-02/oxford-icp180.gltf","ICP reactive ion etcher","Bounded teaching model","Implemented · single published power pair / imported calibration; empirical holdout pending"],
 "04-03":["/equipment/04-03/cobra.gltf","Deep silicon etcher","Bounded teaching model","Numerical fixture verified"],
 "04-04":["/equipment/04-04/nanoquest.glb","Ion milling","Bounded teaching model","Analytical reference verified"],
 "04-05":["/equipment/04-05/diener-nano.glb","Plasma asher","Exhibit only","Passive paper footprint comparison; no material treatment model"],
 "04-06":["/equipment/04-06/wet-bench.glb","Wet processing","Exhibit only","Static dry enclosure and independent footprint diagram"],
 "04-07":["/equipment/04-07/dad321-static.glb","Wafer dicing","Inspection or replay only","First pass: detached printed-grid inspection only; material separation acceptance deferred"],
 "04-08":["/equipment/04-08/disco-dag810.glb","Wafer grinding","Inspection or replay only","First pass: detached drawing readout; material processing out of scope"],
 "04-09":["/equipment/04-09/poli500.glb","Chemical mechanical polishing","Inspection or replay only","Verified read-only inert radial geometry; no polishing or removal field"],
 "04-10":["/equipment/04-10/protolaser-r4.glb","Picosecond micromachining (candidate)","Inspection or replay only","Read-only preprinted chart widths; no kerf or thermal model"],
 "04-11":["/equipment/04-11/minimill-gx-static.glb","Micro milling","Exhibit only","First pass: detached immutable circle CAD reading only; machining acceptance deferred"],
 "04-12":["/equipment/04-12/evg501.glb","Wafer bonding","Exhibit only","Dormant reference and detached unit-square comparison"],
 "05-01":["/equipment/05-01/dektakxt.glb","Stylus profilometer","Bounded teaching model","Verified traceable-height witness, forward/reverse scans and rigid stylus envelope"],
 "05-02":["/equipment/05-02/contour-gt-k.glb","Optical profilometer","Bounded teaching model","Verified ideal coherence scan and masks"],
 "05-03":["/equipment/05-03/dimension-icon.glb","Atomic force microscope","Bounded teaching model","Verified synthetic rigid-surface AFM raster; ideal hemisphere only"],
 "05-04":["/equipment/05-04/alpha-se.glb","Spectroscopic ellipsometer","Bounded teaching model","Independent Fresnel and film thickness checks; ambiguity profiles"],
 "05-05":["/equipment/05-05/f40.glb","Reflectometer","Bounded teaching model","Calibrated single-film reflectance and bounded inverse fit with ambiguity rejection"],
 "05-06":["/equipment/05-06/resmap-178.glb","Four-point probe","Bounded teaching model","Infinite and NBS circular sheet corrections; reversal and maps"],
 "05-07":["/equipment/05-07/summit-11000b.glb","Probe station","Bounded teaching model","Passive contact geometry, current limiting and I–V verified"],
 "05-08":["/equipment/05-08/dsa100b.glb","Contact angle goniometer","Bounded teaching model","Calibrated circular silhouette fit · analytic and image benchmarks verified"],
 "05-09":["/equipment/05-09/versaprobe-ii.glb","X-ray photoelectron spectrometer","Bounded teaching model","Verified isolated reference-line fit"],
 "05-10":["/equipment/05-10/labram-hr-evolution.glb","Raman microscope","Bounded teaching model","Verified analytical shift, linewidth and oriented silicon/polystyrene peak-area maps"],
 "05-11":["/equipment/05-11/nicolet-is50.glb","FTIR spectrometer","Bounded teaching model","Synthetic OPD/FFT with independent ratio and spectral tests"],
 "05-12":["/equipment/05-12/dmax-b.glb","X-ray diffractometer","Bounded teaching model","Synthetic Bragg peak profile and Gaussian width fit; published Si spacing comparison"],
 "06-01":["/equipment/06-01/gt2-documentary.glb","Two-photon polymerization","Inspection or replay only","Read-only detached geometry ruler; no manufacturing model"],
 "06-02":["/equipment/06-02/bio-x6-gen3.glb","Extrusion bioprinter","Exhibit only","Independent fixed signed-ruler illustration only; no fabrication or device operation"],
 "06-03":["/equipment/06-03/cellink-lumen-x-gen3.glb","Light-based bioprinter","Exhibit only","First pass: detached abstract readout; fabrication outside scope"],
 "06-04":["/equipment/06-04/form4-static.glb","High-resolution resin printer","Inspection or replay only","First pass: passive detached clearance only; actual production acceptance deferred"],
 "06-05":["/equipment/06-05/ne200.glb","Aligned fiber electrospinner","Exhibit only","Dormant exterior and detached equal-area rectangle exercise"],
 "06-06":["/equipment/06-06/ns-lab.glb","Wire electrospinning","Exhibit only","Detached abstract drawing ruler only; no process model"],
 "06-07":["/equipment/06-07/mfcs-ez-dormant.glb","Pressure/flow controller","Exhibit only","Detached inert drafting comparison; no flow or control model"],
 "06-08":["/equipment/06-08/fluigent-flow-ez.glb","Modular pressure controller","Exhibit only","First pass: immutable detached drawing; hydraulic operation outside scope"],
 "06-09":["/equipment/06-09/ne1000-chassis.glb","Syringe pump","Exhibit only","Detached inert rectangle comparison; no pump operation or delivery"],
 "06-10":["/equipment/06-10/dry-table.glb","Soft-lithography casting station","Inspection or replay only","Static furniture and detached geometric footprint check"],
 "06-11":["/equipment/06-11/of-12g.glb","Convection curing oven","Exhibit only","Detached synthetic projection exercise only; no heating or cure model"],
 "06-12":["/equipment/06-12/microtester-g2.glb","Microindentation","Bounded teaching model","Verified ideal dry spring contact and beam compensation; no creep model"],
 "07-01":["/equipment/07-01/cabinet.glb","Biosafety cabinet","Inspection or replay only","Discrete sash-position and sample-occupancy replay; warning intervals verified"],
 "07-02":["/equipment/07-02/geometry/heracell-vios-160i.glb","CO2 / tri-gas incubator","Bounded teaching model","Published chamber CO₂ and temperature replays, verified occupancy clipping and illustrative exchange model"],
 "07-03":["/equipment/07-03/microscope.glb","Routine inverted microscope","Bounded teaching model","Calibrated camera ROI, micrometer pitch measurement, phase contrast approximation and single-channel epi-fluorescence"],
 "07-04":["/equipment/07-04/echo-cellcyte-gen2.glb","Time-lapse live cell imager","Inspection or replay only","First pass: immutable inert image dimensions; acquisition and time tracking outside scope"],
 "07-05":["/equipment/07-05/incucyte-s3.glb","Live cell imager","Exhibit only","Detached static nonbiological graphic review only; no acquisition or growth"],
 "07-06":["/equipment/07-06/eppendorf-5810r-static.glb","Refrigerated centrifuge","Exhibit only","First pass: independent immutable planar statics diagrams; original operational acceptance deferred"],
 "07-07":["/equipment/07-07/countess-3-fl.glb","Cell counter","Exhibit only","Dormant cabinet and separate geometric badge-count diagrams"],
 "07-08":["/equipment/07-08/octo-documentary.glb","Tissue dissociator","Exhibit only","Detached static shape comparison; no specimen workflows"],
 "07-09":["/equipment/07-09/lonza-core-x.glb","Electroporation","Exhibit only","Detached fixed abstract drawing comparison only; no instrument workflow"],
 "07-10":["/equipment/07-10/bd-facsaria-ii.glb","Flow cytometer / sorter","Exhibit only","First pass: detached immutable triangle only; acquisition and population selection excluded"],
 "07-11":["/equipment/07-11/spectramax-i3x.glb","Plate reader","Exhibit only","Detached static arbitrary-unit figure only; no instrument measurements"],
 "07-12":["/equipment/07-12/quantstudio3.glb","PCR instrument","Exhibit only","Dormant chassis and independent fixed geometry annotations"],
 "07-13":["/equipment/07-13/worthington-ls6000-static.glb","Cryogenic cell storage","Exhibit only","First pass: unrelated fixed abstract artwork diagram; original storage acceptance deferred"],
 "07-14":["/equipment/07-14/tsx60086a-documentary.glb","Ultra-low freezer","Exhibit only","Detached fixed geometry; no thermal, alarm or inventory model"],
 "07-15":["/equipment/07-15/synthecon-rccs4d.glb","Perfusion bioreactor","Exhibit only","Detached abstract polygon-area exhibit verified; no instrument operation, culture or transport behavior modeled"],
 "08-01":["/equipment/08-01/west-bond-7700e.glb","Manual ball bonder","Bounded teaching model","Ordered ball/stitch loop, footprint and network verification"],
 "08-02":["/equipment/08-02/ks-4523d.glb","Manual wedge bonder","Bounded teaching model","Verified ribbon clearance and footprints"],
 "08-03":["/equipment/08-03/bondtec-5630i.glb","Automatic wire bonder","Bounded teaching model","Verified pad transform, fixture intersection and accepted-only net edges"],
 "08-04":["/equipment/08-04/fineplacer-lambda.glb","Precision flip-chip bonder","Bounded teaching model","Rigid fiducial alignment and circular pad overlap verified; dry placement only"],
 "08-05":["/equipment/08-05/fl300.glb","Optoelectronic die bonder","Bounded teaching model","Verified symmetric passive mode overlap and geometric pad eligibility"],
 "08-06":["/equipment/08-06/dage-4000.glb","Bond pull / shear tester","Bounded teaching model","Unit-aware synthetic force replay with labeled failure and pre/post revision"],
 "08-07":["/equipment/08-07/evg810.glb","Plasma activation","Bounded teaching model","Face-specific activation eligibility logic; no physical process simulation"],
 "08-08":["/equipment/08-08/amada-wl-300a.glb","Hermetic package welding","Inspection or replay only","Verified passive perimeter-fit review"],
 "08-09":["/equipment/08-09/hlt160.glb","Helium leak detector","Bounded teaching model","Synthetic calibrated flow replay, blank and uncertainty decision"],
 "08-10":["/equipment/08-10/ultimus-v.glb","Dispensing / encapsulation","Bounded teaching model","Verified virtual-volume integration and exposed contact preservation; no chemistry"],
 "08-11":["/equipment/08-11/protomat-s104.glb","PCB prototype fabrication","Inspection or replay only","Single-layer inert copper connectivity and local clearance verified"],
 "08-12":["/equipment/08-12/dde-bench.glb","Rework and soldering","Bounded teaching model","Virtual polarized two-pin replacement and net-graph validation"],
 "09-01":["/equipment/09-01/reference-600-plus.glb","Potentiostat / galvanostat","Bounded teaching model","Verified ideal passive-cell EIS/CV"],
 "09-02":["/equipment/09-02/b1500a.glb","Semiconductor analyzer","Bounded teaching model","Independently checked resistor compliance and ideal capacitor C–V"],
 "09-03":["/equipment/09-03/keithley-2450.glb","Source measure unit","Bounded teaching model","Verified ideal DC model"],
 "09-04":["/equipment/09-04/mso64b.glb","Digital oscilloscope","Bounded teaching model","Single-channel sampled acquisition · analytic fixtures"],
 "09-05":["/equipment/09-05/465b.glb","Analog aesthetic oscilloscope","Bounded teaching model","Numerically verified analog A sweep, trigger, probe scaling and screen clipping"],
 "09-06":["/equipment/09-06/33622a.glb","Waveform generator","Bounded teaching model","Numerically verified Thevenin source and load; time-series/marker output"],
 "09-07":["/equipment/09-07/e4980a.glb","Precision LCR meter","Bounded teaching model","Numerically verified passive AC impedance; explicit series and shunt fixture correction"],
 "09-08":["/equipment/09-08/n5247b.glb","RF network analyzer","Bounded teaching model","Verified passive scattering and transmission THRU response; not instrument-validated"],
 "09-09":["/equipment/09-09/e36313a.glb","Precision power supply","Bounded teaching model","Steady-state CV/CC, isolated resistive loads, local and remote sense"],
 "09-10":["/equipment/09-10/sr560.glb","Low-noise preamplifier","Bounded teaching model","Numerically verified ideal gain, filter, source and termination model"],
 "09-11":["/equipment/09-11/sr860.glb","Lock-in amplifier","Bounded teaching model","RMS dual-phase classic RC solver · analytic fixtures verified"],
 "09-12":["/equipment/09-12/cell-fixture.glb","Electrochemical test cell","Bounded teaching model","Passive three-terminal slab and optional RC · analytic cases verified"],
 "10-01":["/equipment/10-01/multiclamp.glb","Whole-cell patch amplifier","Bounded teaching model","Verified passive current- and voltage-clamp experiment; not hardware-validated"],
 "10-02":["/equipment/10-02/digidata-1550b.glb","Digitizer","Bounded teaching model","Ideal ADC, ramp and MultiClamp waveform verified analytically"],
 "10-03":["/equipment/10-03/axopatch-200b.glb","Single-channel amplifier","Bounded teaching model","Verified inert conductance steps through ideal Bessel output chain"],
 "10-04":["/equipment/10-04/epc10.glb","Patch clamp alternate","Bounded teaching model","Shared passive electronic clamp adapter"],
 "10-05":["/equipment/10-05/slicescope-optical.glb","Upright slice microscope","Bounded teaching model","Verified inert marked-plane optics and coordinate recovery"],
 "10-06":["/equipment/10-06/p1000.glb","Micropipette puller","Inspection or replay only","Dry solid gauge geometry only; no instrument operation"],
 "10-07":["/equipment/10-07/sutter-mp285.glb","Motorized micromanipulator","Bounded teaching model","First pass: verified inert coordinate transform and bounded virtual travel"],
 "10-08":["/equipment/10-08/bv10d-static.glb","Microelectrode beveler","Exhibit only","Fictitious facet annotation only; no fabrication or resistance simulation"],
 "10-09":["/equipment/10-09/intan-rhs-m4200.glb","Multichannel stim/record","Inspection or replay only","First pass: verified read-only synthetic alignment; stimulation outside scope"],
 "10-10":["/equipment/10-10/open-ephys-gen3-display.glb","Open acquisition system","Bounded teaching model","Verified synthetic counter gaps and marker alignment"],
 "10-11":["/equipment/10-11/maxone.glb","High-density CMOS MEA","Inspection or replay only","Verified ideal passive site selection and synthetic marker playback; no stimulation"],
 "10-12":["/equipment/10-12/maxtwo.glb","Multiwell HD-MEA","Inspection or replay only","Passive coordinate picks and independent immutable synthetic traces"],
 "10-13":["/models/neuropixels-engineering/models/neuropixels-shank.glb","High-density silicon probe","Inspection or replay only","Synthetic site-index replay on pinned 1.0 map"],
 "10-14":["/equipment/10-14/dry-fixture.glb","Peripheral nerve recording bath","Inspection or replay only","Dry inert block fit and detached label inspection only; no physiological model"],
 "10-15":["/equipment/10-15/am2100.glb","Isolated pulse stimulator","Exhibit only","Passive shape/label matching only; pulse-delivery test unsupported"],
 "10-16":["/equipment/10-16/vt1200s-reference.glb","Vibrating tissue slicer","Inspection or replay only","Verified inert rectangular fit and landmark geometry only; original slicing acceptance not implemented"],
 "11-01":["/equipment/11-01/doric-ledd1.glb","Optical LED driver","Exhibit only","Detached unitless arithmetic only; no light or drive model"],
 "11-02":["/equipment/11-02/doric-closed.glb","Laser diode module","Exhibit only","Detached abstract shapes inspection only; no source operation or signals"],
 "11-03":["/equipment/11-03/otpg4.glb","Optogenetics pulse generator","Exhibit only","Inactive enclosure and detached coordinate readout"],
 "11-04":["/equipment/11-04/doric-nc500-static.glb","Fiber photometry console","Exhibit only","First pass: detached authored coordinate-card comparison; original sensing acceptance deferred"],
 "11-05":["/equipment/11-05/pm100d-console.glb","Fiber power meter","Exhibit only","Detached synthetic unit conversion; no sensor or optical calibration"],
 "11-06":["/equipment/11-06/sciencedesk-sdpm7590.glb","Optical breadboard and mounts","Bounded teaching model","Verified 25 mm lattice snapping and axis-aligned base fit, clearance and 3D overlap; no beam or vibration model"],
 "11-07":["/equipment/11-07/thorlabs-closed.glb","Fiber LED excitation","Exhibit only","Separate immutable unit conversion only; no beam, drive or coupling"],
 "11-08":["/equipment/11-08/orca-v3.glb","High-speed fluorescence camera","Exhibit only","Inert camera and physically separate fixed graphic ruler"],
 "11-09":["/equipment/11-09/monaco-1035.glb","Holographic stimulation optics","Exhibit only","Detached fixed rectangle exhibit; no optics or device model"],
 "11-10":["/equipment/11-10/fixture-concept-static.glb","MicroLED optoelectrode station","Exhibit only","First pass: detached ideal passive series card only; original optical acceptance deferred"],
 "12-01":["/equipment/12-01/zeiss-discovery-v12.glb","Stereo dissecting microscope","Bounded teaching model","First pass: verified scale and ideal stereo disparity direction"],
 "12-02":["/equipment/12-02/nikon-ti2-optical.glb","Inverted research microscope","Bounded teaching model","Inert 10×/20× reticle pitch and calibrated FOV verified"],
 "12-03":["/equipment/12-03/lsm980-static.glb","Laser scanning confocal","Inspection or replay only","Synthetic analytic plane inspection and width checks only; no hardware acquisition"],
 "12-04":["/equipment/12-04/stellaris8.glb","STED super-resolution","Inspection or replay only","Read-only synthetic width comparison"],
 "12-05":["/equipment/12-05/csu-w1-tie.glb","Spinning-disk confocal","Inspection or replay only","Static instrument and offline synthetic grid registration"],
 "12-06":["/equipment/12-06/lsm980-nlo-display.glb","Two-photon microscope","Inspection or replay only","Verified passive inert XY/XZ stack; no excitation model"],
 "12-07":["/equipment/12-07/lightsheet7.glb","Light-sheet microscope","Inspection or replay only","Verified offline synthetic inert plane coordinates and scale only; no acquisition or registration"],
 "12-08":["/equipment/12-08/lattice-lightsheet-7.glb","Lattice light-sheet","Inspection or replay only","First pass: synthetic stack viewer only; acquisition and bleaching outside scope"],
 "12-09":["/equipment/12-09/elyra7-static.glb","Structured illumination","Inspection or replay only","First pass: passive staged synthetic grating comparison and Fourier inspection; original SIM acceptance deferred"],
 "12-10":["/equipment/12-10/vs200.glb","Automated slide scanner","Inspection or replay only","Read-only synthetic tile registration"],
 "12-11":["/equipment/12-11/lmd7.glb","Laser microdissection","Exhibit only","Dormant instrument; independent fictional polygon area board"],
 "13-01":["/equipment/13-01/zeiss-geminisem-560.glb","Field-emission SEM","Inspection or replay only","First pass: verified synthetic grating pitch; SEM operation outside scope"],
 "13-02":["/equipment/13-02/crossbeam550.glb","FIB-SEM","Inspection or replay only","Verified locked synthetic 2D geometry inspection only; no acquisition, milling, or volume reconstruction"],
 "13-03":["/equipment/13-03/hydra-cx-display.glb","Plasma FIB-SEM","Inspection or replay only","Verified inert cavity section viewer; no removal model"],
 "13-04":["/equipment/13-04/volumescope2-static.glb","Serial block-face SEM","Inspection or replay only","First pass: passive preauthored synthetic geometry labels, volume and gap; acquisition and registration deferred"],
 "13-05":["/equipment/13-05/jem1400plus.glb","TEM","Inspection or replay only","Dormant exterior and read-only offline lattice pitch comparison"],
 "13-06":["/equipment/13-06/glacios2.glb","Cryo-TEM","Inspection or replay only","Read-only synthetic image archive; index, scale and orientation verified"],
 "13-07":["/equipment/13-07/leica-uc7.glb","Ultramicrotome","Inspection or replay only","Verified passive synthetic fiducial measurement invariant to display zoom; no sectioning"],
 "13-08":["/equipment/13-08/leica-em-ice-static.glb","High-pressure freezer","Exhibit only","First pass: detached inert outline annotation only; preservation acceptance deferred"],
 "13-09":["/equipment/13-09/leica-em-afs2.glb","Freeze substitution unit","Exhibit only","First pass: synthetic drawing annotations only; processing outside scope"],
 "13-10":["/equipment/13-10/ace600-closed.glb","High vacuum coater","Inspection or replay only","Passive immutable synthetic coupon geometry; 13 checks"],
 "13-11":["/equipment/13-11/cpd300.glb","Critical-point dryer","Exhibit only","Dormant cabinet and detached abstract ratio diagram"],
 "13-12":["/equipment/13-12/pelco-easiglow-91000.glb","Glow discharge cleaner","Exhibit only","First pass: immutable inert drawing reviews; treatment outside scope"],
 "13-13":["/equipment/13-13/cm3050s.glb","Cryostat","Inspection or replay only","Verified passive oblique-coordinate diagram only; no physical sample or cutting"],
 "13-14":["/equipment/13-14/hm325a-static.glb","Rotary microtome","Inspection or replay only","First pass: detached generic CAD draft inspection only; section generation deferred"],
 "13-15":["/equipment/13-15/skyscan1272.glb","Micro-CT","Inspection or replay only","Read-only inert slice ruler; center spacing and missing-plane handling checked"],
 "14-01":["/equipment/14-01/instron-5944.glb","Universal micro-tester","Bounded teaching model","Verified ideal coupon and range flags"],
 "14-02":["/equipment/14-02/instron-5969.glb","Universal test frame","Bounded teaching model","Verified ideal three-point flexure"],
 "14-03":["/equipment/14-03/dhr2.glb","Rheometer","Bounded teaching model","Verified Newtonian and single-mode Maxwell frequency sweeps"],
 "14-04":["/equipment/14-04/mcr302.glb","Rheometer / tribometer","Bounded teaching model","Verified constant kinetic friction, sinusoidal rotation, signed force and torque"],
 "14-05":["/equipment/14-05/piuma.glb","Nanoindentation system","Bounded teaching model","Two inert Hertz sites and independent force–deflection reference"],
 "14-06":["/equipment/14-06/q800.glb","Dynamic mechanical analyzer","Bounded teaching model","Inert harmonic replay and viscoelastic frequency/temperature response · analytic checks"],
 "14-07":["/equipment/14-07/q50.glb","Thermogravimetric analyzer","Bounded teaching model","Verified synthetic gross/net tare and blank correction"],
 "14-08":["/equipment/14-08/q20.glb","Differential scanning calorimeter","Bounded teaching model","Synthetic differential heat-flow scan, baseline subtraction and transition integration"],
 "14-09":["/equipment/14-09/e95.glb","Infrared thermal camera","Bounded teaching model","Band-integrated surface radiometry on a synthetic reference plate"],
 "14-10":["/equipment/14-10/cyclic-bend.glb","Cyclic bend / fatigue fixture","Bounded teaching model","Working synthetic cyclic-fatigue example; checkpoint and cycle-100 open verified"],
 "14-11":["/equipment/14-11/soak-witness.glb","Accelerated soak bench","Bounded teaching model","Verified package/contact/frequency-specific relative impedance drift; no lifetime extrapolation"],
 "14-12":["/equipment/14-12/espec-sh-262.glb","Environmental chamber","Bounded teaching model","Verified lumped inert thermal response"],
 "15-01":["/equipment/15-01/kopf940-outline.glb","Stereotaxic frame","Exhibit only","Detached triangle illustration; no positioning model"],
 "15-02":["/equipment/15-02/smz25.glb","Surgical stereo microscope","Exhibit only","Dormant instrument and independent fixed-chart scaling"],
 "15-03":["/equipment/15-03/catwalk-xt-107-static.glb","Gait analysis","Exhibit only","First pass: unrelated abstract polygon mark inspection; original gait acceptance deferred"],
 "15-04":["/equipment/15-04/waypoint-console.glb","Behavior tracking","Exhibit only","Verified fixed nonbiological geometric waypoint inspection and missing-data gaps; no video, tracking, acquisition or behavior analysis"],
 "15-05":["/equipment/15-05/biospec-closed.glb","Preclinical MRI","Exhibit only","Authored geometric card only"],
 "15-06":["/equipment/15-06/skyscan1276.glb","Micro-CT scanner","Exhibit only","Detached synthetic shape and annotation archive; no scanning or registration"],
 "15-07":["/equipment/15-07/vevo3100-console.glb","High-frequency ultrasound","Exhibit only","Detached static graphic ruler; no acquisition or exposure"],
 "15-08":["/equipment/15-08/iconeus-one-lower-cart.glb","Functional ultrasound","Exhibit only","Independent authored width comparison verified; no physical, imaging, acquisition or biological model"],
 "15-09":["/equipment/15-09/ivis-spectrum-static.glb","Optical bioluminescence imager","Exhibit only","First pass: detached fixed grayscale-code examples only; original imaging acceptance deferred"],
 "15-10":["/equipment/15-10/envisu-c2300.glb","Retinal OCT","Exhibit only","Dormant exhibit and detached graphic scale with missing-mark guard"],
 "15-11":["/equipment/15-11/e3-colordome.glb","Retinal electrophysiology","Exhibit only","Detached synthetic pattern comparison"],
 "15-12":["/equipment/15-12/rz6-ra4pa-exteriors.glb","Auditory electrophysiology","Inspection or replay only","Verified offline synthetic peak index; no stimulation or acquisition"],
 "15-13":["/equipment/15-13/detached-locator.glb","Cochlear implant research interface","Inspection or replay only","Passive geometric fit only; research workflow not represented"],
 "15-14":["/equipment/15-14/concept-cabinet-dry-gauge.glb","Retinal prosthesis bench","Inspection or replay only","Verified detached dry geometric clearances only; no retinal, electrical, optical, or operating model"],
 "16-01":["/equipment/16-01/optical-table.glb","Vibration-isolation table","Bounded teaching model","Fixture snap and analytic vertical isolation"],
 "16-02":["/equipment/16-02/shielded-bench.glb","Shielded enclosure","Bounded teaching model","Illustrative near-field pickup factor and linked fixture state"],
 "16-03":["/equipment/16-03/steel-bench.glb","Precision laboratory bench","Support or custody only","Verified static slot fit, occupancy and drawer-relative identity/pose"],
 "16-04":["/equipment/16-04/iq7000.glb","Ultrapure water system","Support or custody only","Verified synthetic lot-preserving volume ledger and inverse resistivity units"],
 "16-05":["/equipment/16-05/3870ea-tray-gauge.glb","Autoclave","Inspection or replay only","First pass: verified empty carrier fit; operating cycle out of scope"],
 "16-06":["/equipment/16-06/ae100.glb","Precision balance","Bounded teaching model","Deterministic tare, gross capacity, rounding and synthetic gain verified"],
 "16-07":["/equipment/16-07/isotemp-gpd05.glb","Water bath","Bounded teaching model","Inert held/relaxing bath histories with verified one-time-constant response"],
 "16-08":["/equipment/16-08/research-plus.glb","Liquid handling","Inspection or replay only","Dry tip fit, nominal motion and atomic dry inventory accounting"],
 "16-09":["/equipment/16-09/ika-hs7.glb","Hotplate / stirrer","Bounded teaching model","Inert equilibrium and analytic heat-transfer phantom"],
 "16-10":["/equipment/16-10/bransonic-1800.glb","Ultrasonic cleaner","Inspection or replay only","First pass: dry geometry and interrupted mock log verified"],
 "16-11":["/equipment/16-11/handling-station.glb","Cleanroom sample handling","Support or custody only","Dry 100 mm wafer transfer and undersized-carrier rejection; specimen ID and orientation preserved."],
 "16-12":["/equipment/16-12/sample-ware.glb","General lab sample ware","Support or custody only","Inert dry displacement, capacity and preserved identities through pose changes"],
 "16-13":["/equipment/16-13/connector-bench.glb","Cable and connector library","Bounded teaching model","First pass: passive BNC compatibility and routed pulse verified"],
 "16-14":["/equipment/16-14/blind-fixture.glb","Vacuum/gas service props","Support or custody only","Boolean seating and removal of blind fixture markers on two independent paths; no physical service network."],
 "16-15":["/equipment/16-15/lab-support.glb","Storage, safety & lighting","Support or custody only","Verified persistent case slot, drawer pose and independent task illumination"],
};

const fallbackCamera={eye:[2.3,1.7,3],target:[0,.75,0],autoFit:true};
const noWafer={shape:'none',nominalMm:null,acceptedMm:[],poses:[]};
const modelEntries=Object.entries(register).map(([id,[assetUrl,stationName,realization,registerScope]])=>{
 const k=curated[id],kind=assetUrl?'register-asset':'schematic';
 return [id,freeze({
  id,title:k?.title||stationName,kind,assetUrl,assetScale:1,assetRotation:zero,assetOffset:zero,
  stationName,realization,registerScope,sourceUrl:source(id),camera:k?.camera||fallbackCamera,
  handling:k?.handling||'display-only',hideNodes:k?.hideNodes||[],wafer:k?.wafer||noWafer,nodeTracks:k?.nodeTracks||[],
  evidence:k?.evidence||[],
  limit:k?.limit||(assetUrl?'Original Register display. No cross-station wafer receiver or movement has been verified for this view.':'No reusable on-site asset in this entry. Schematic only, with no supported wafer seat.')
 })];
});
export const CLEANROOM_MODELS=freeze(Object.fromEntries(modelEntries));
export const CLEANROOM_MODEL_SUMMARY=freeze({
 register:Object.keys(CLEANROOM_MODELS).length,actualAssets:modelEntries.filter(([,m])=>m.kind==='register-asset').length,supportedPaths:Object.keys(curated).length,
 nativePaths:Object.values(curated).filter(x=>x.handling==='native-landmarks').length,detachedWitnessPaths:Object.values(curated).filter(x=>x.handling==='detached-witness').length
});
export function getCleanroomModel(id){
 return typeof id==='string'&&Object.hasOwn(CLEANROOM_MODELS,id)?CLEANROOM_MODELS[id]:null;
}
function modelFor(x){return typeof x==='string'?getCleanroomModel(x):x}
const numeric=x=>{const n=typeof x==='number'?x:typeof x==='string'&&/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(x.trim())?Number(x):NaN;return Number.isFinite(n)?n:null;};
function declaredShape(x){
 switch(x){case 'round':case 'disc':case 'disk':case 'circle':case 'circular':case 'wafer':return 'round';case 'square':case 'square-coupon':return 'square';default:return x;}
}
export function checkCleanroomFit(model,specimen){
 model=modelFor(model);
 const w=model?.wafer;
 if(!Array.isArray(w?.poses)||!w.poses.length)return {status:'unknown',reason:model?.limit||'This station is not present in the Register.',shape:null,sizeMm:null};
 const defaultWitness=specimen==null;
 const explicit=defaultWitness?{}:typeof specimen==='number'?{diameterMm:specimen}:specimen;
 const shape=defaultWitness?w.shape:declaredShape(explicit?.shape||((explicit?.diameterMm!==undefined||explicit?.waferMm!==undefined)?'round':null));
 const size=defaultWitness?w.nominalMm:numeric(typeof specimen==='number'?specimen:shape==='square'?(explicit?.sizeMm??explicit?.sideMm??(explicit?.widthMm===explicit?.heightMm?(explicit?.widthMm??explicit?.diameterMm):null)):(explicit?.diameterMm??explicit?.waferMm??explicit?.sizeMm));
 if(explicit?.allowMotion===false)return {status:'unknown',reason:'This workflow stage is reference-only; it does not authorize a virtual seat.',shape,sizeMm:size};
 if(shape&&shape!==w.shape)return {status:'incompatible',reason:'The active fixture is '+w.shape+'; the selected specimen is '+shape+'. It does not seat.',shape,sizeMm:size};
 if(!shape||size===null||!(size>0))return {status:'unknown',reason:'No valid specimen shape and size were declared for this fixture.',shape:shape||null,sizeMm:size};
 const right=w.rangeMm?size>=w.rangeMm[0]&&size<=w.rangeMm[1]:w.acceptedMm.includes(size);
 const expected=w.rangeMm?w.rangeMm.join('–'):w.acceptedMm.join(' or ');
 if(!right)return {status:'incompatible',reason:size+' mm does not meet the '+expected+' mm selected virtual fixture.',shape,sizeMm:size};
 const thicknessMm=numeric(explicit.thicknessMm);
 if(explicit.thicknessMm!==undefined&&!(thicknessMm>0)){
  return {status:'unknown',reason:'The declared specimen thickness is not a valid positive number.',shape,sizeMm:size};
 }
 if(w.thicknessRangeMm&&thicknessMm!==null&&(thicknessMm<w.thicknessRangeMm[0]||thicknessMm>w.thicknessRangeMm[1])){
  return {status:'incompatible',reason:'The thickness does not meet the selected '+w.thicknessRangeMm.join('–')+' mm virtual range.',shape,sizeMm:size};
 }
 return {status:'match',reason:model.handling==='detached-witness'?'Fits an external dry witness, not the process chamber.':'Matches the named display fixture only, not the physical process.',shape,sizeMm:size,thicknessMm:thicknessMm??w.thicknessMm??.675,defaultWitness};
}
const clamp=t=>Math.max(0,Math.min(1,Number.isFinite(t)?t:0));
const lerp=(a,b,u)=>a.map((x,i)=>x+(b[i]-x)*u);
function span(s,t,key){
 const i=s.findIndex(f=>key(f)>t);
 const b=i<0?s.at(-1):s[i],a=i<=0?(i<0?b:s[0]):s[i-1];
 const u=a===b?0:(t-key(a))/(key(b)-key(a));
 return [a,b,u*u*(3-2*u)];
}
function buildNodeOps(model,t){
 const out=new Map();
 for(const q of model.nodeTracks){
  const [a,b,u]=span(q.keyframes,t,k=>k[0]);
  const value=Array.isArray(a[1])?lerp(a[1],b[1],u):a[1];
  if(!out.has(q.name))out.set(q.name,{name:q.name});
  out.get(q.name)[q.property]=value;
 }
 return [...out.values()];
}
export function sampleCleanroomPose(model,progress,specimen){
 model=modelFor(model);
 const fit=checkCleanroomFit(model,specimen),t=clamp(progress);
 if(fit.status!=='match')return {status:fit.status,fit,position:[0,0,0],rotation:[0,0,0],visible:false,seated:false,phase:fit.reason,nodeOps:[],progress:t};
 const poses=model.wafer.poseSets?.[fit.sizeMm]||model.wafer.poses;
 const [a,b,u]=span(poses,t,k=>k.t);
 return {status:fit.status,fit,position:lerp(a.position,b.position,u),rotation:lerp(a.rotation,b.rotation,u),visible:a.visible!==false,seated:a.seated&&b.seated||a.seated&&u===0,phase:a.phase,nodeOps:buildNodeOps(model,t),progress:t};
}
