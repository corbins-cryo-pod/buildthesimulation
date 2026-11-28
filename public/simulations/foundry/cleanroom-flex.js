/* Physical traveler overrides. Each row advances one named workpiece; settings
 * are reported dimensions, conceptual selection, or virtual controls, not recipes.
 * Register links denote candidate classes unless an original model is specified. */
const F='fabrication', I='inspection', H='handoff', T='test';
const ecog='Tolstosheeva et al., Sensors 15:832–854 (2015), doi:10.3390/s150100832';
const pt='Tchoe et al., Sci Transl Med 14:eabj1441 (2022), doi:10.1126/scitranslmed.abj1441';
const mesh='Schuhmann et al., JoVE 137:58003 (2018), doi:10.3791/58003';
const mesh32='Schuhmann et al., Nano Lett 17:5836–5842 (2017), doi:10.1021/acs.nanolett.7b03081';
const neuro='Khodagholy et al., Nat Neurosci 18:310–315 (2015), doi:10.1038/nn.3905';
const oect='Khodagholy et al., Nat Commun 4:1575 (2013), doi:10.1038/ncomms2573';
const clear='Park et al., Nat Commun 5:5258 (2014), doi:10.1038/ncomms6258';
const delft='Alvarez de Eulate et al., Adv Sci 13:e17524 (2026), doi:10.1002/advs.202517524';

function lane(specimen, start, rows) {
  let before=start;
  return rows.map(([effect,machine,equipmentId,operation,after,settings,evidence,kind=F])=>{
    const phase={effect,machine,equipmentId,operation,before,after,settings,specimen,evidence,kind};
    before=after;
    return phase;
  });
}
const E=lane('Bremen flex-rigid ECoG · one tracked field on a three-up Si wafer',
  'Incoming unpatterned silicon wafer; no released or electrically active structures.', [
  ['measure','Carrier inspection and CAD registration','16-11','Assign the selected field and its front/back registration reference.','One array field is assigned on the three-up, still-solid silicon carrier.',[['Carrier','101.6 mm diameter × 380 µm'],['Field geometry','Three arrays; schematic placement in lab']],ecog+' · Fig. 6 and §2.2',I],
  ['pattern','SÜSS MA6 mask aligner → oxide opening','02-01','Define the backside mask that separates future release zones from silicon protected for the island.','Oxide map delineates the flex window and protected island. Silicon still supports the whole field.',[['Oxide','750 nm reported'],['Target','Backside oxide, not bulk silicon']],ecog+' · Fig. 3A and §2.2'],
  ['coat','Spin coater and film-cure station (class)','02-07','Build the front-side lower PI blanket while preserving the backside reference.','A 5 µm bottom polyimide film covers the supported front face.',[['Polymer','PI'],['Nominal lower film','5 µm']],ecog+' · Fig. 3A and §2.2'],
  ['none','Mask/etch cell for tapered PI windows (class)','04-02','Choose oxide-backed rigid landings or retain PI for the comparison specimen. The taper belongs only to the rigid route.','The chosen pad landing is established; contact metal has not been deposited.',[['Specimen C','Open lower PI to Si/SiO₂'],['Specimen B','Retain lower PI'],['Profile witness','~20° in the paper’s partial-section example']],ecog+' · Figs. 3B, 8C and 11'],
  ['deposit','Thin-film sputter chamber (class)','03-03','Create continuous Ti/Au metallurgy before any conductor has its own electrical identity.','Blanket Ti/Au covers the front PI and follows the selected pad landings.',[['Adhesion film','Ti 20 nm'],['Conductor','Au 300 nm']],ecog+' · Fig. 3C and §2.2'],
  ['deposit','Selective Au plating cell (external capability)',null,'Thicken the electrode and pad metal locally while preserving thin film for routing.','Localized gold is added to the site and pad regions; the surrounding sheet is not yet isolated.',[['Nominal added Au','2.5 µm in §2.2'],['Scope','Electrode and pad windows only']],ecog+' · Fig. 3C, Fig. 8B and §2.2'],
  ['etch','Conductor mask and pattern-transfer bench','02-01','Isolate the 124 sensing nets and four routes to one reference; form three parallel crosses at each pad transition.','Patterned nets and their branch witnesses are present on a wafer-supported flex stack.',[['Nominal route width','15 µm'],['Pad branches','3 per transition'],['Virtual fault','0–3 broken branches at one selected sensing pad']],ecog+' · Figs. 1, 7 and 8B'],
  ['coat','Spin coater and PI encapsulation station (class)','02-07','Cover the patterned wiring with the second PI film. A buried metal disk is not yet an exposed electrode.','Upper PI encapsulates the wiring; the supported film is still closed at the contacts.',[['Upper PI','5 µm'],['Nominal PI pair','10 µm']],ecog+' · Fig. 3D and §2.2'],
  ['etch','ICP pattern-transfer chamber (class)','04-02','Create the full-depth outer contour, radial cuts and split tail, keeping retention straps intact.','The outlined flex is defined through both PI layers and remains tethered on the wafer.',[['Pattern depth class','Through both PI films'],['Do not remove','Retention straps and intended channels']],ecog+' · Figs. 1B and 3D'],
  ['etch','Electrode/pad opening etch (ICP class)','04-02','Open the upper PI over sites and pads independently of the deeper outline. Area faults mask metal rather than resizing the underlying disk.','Defined site and pad apertures expose their intended metal; the routes remain encapsulated.',[['Pattern depth class','Upper film only'],['Virtual aperture','0–100% of target exposed'],['Distinct witness','Pad opening ≈520 × 160 µm']],ecog+' · Figs. 3D and 8A'],
  ['etch','STS ICP deep silicon etch (documented class)',null,'Recess the silicon from the backside only in the selected release regions. Do not call the region free yet.','A thinned underside remains beneath the flex; the protected island retains full thickness.',[['Incoming Si','380 µm'],['Reported first recess','≈300 µm'],['Nominal remaining Si','≈80 µm (difference)']],ecog+' · Fig. 3E and §2.2'],
  ['etch','Supported DRIE breakthrough → oxide clearance',null,'Temporarily support the front side, clear remaining silicon and oxide under flex, and retain the monolithic silicon island.','The flex spans a cleared backside window; straps still tether it and silicon remains under the package.',[['Island footprint','24 × 7.5 mm'],['Thickness basis','380 µm retained in model; ≈400 µm island description']],ecog+' · Figs. 2, 3F and 6'],
  ['assemble','FINEPLACER precision placement / joint inspection','08-04','Land four connectors on the island, preserving 32 positions per connector. Compare rigid-landing and PI-supported open-joint witnesses.','Four packaged banks sit on the retained island; joint faults follow the selected teaching scenario.',[['Original placement tool','FINEPLACER pico ma; register 08-04 is lambda A7'],['Connector','4 × 32 Omnetics NPD A71350-001'],['Reported opens per bank','Rigid 0–3; PI-backed 15–27']],ecog+' · Figs. 9 and 11; §§2.3, 3.3',H],
  ['release','Encapsulation and supported strap separation bench','12-01','Protect connector bases, then separate the retention straps without removing the rigid island or coating the sensing field.','One freestanding flex-rigid assembly leaves the carrier with its protected connector bases.',[['Sequence reference','Assembly narrative §2.3'],['Disposition','Island travels with the array; carrier stays behind']],ecog+' · Figs. 3G and 10A; §2.3',H],
  ['assemble','Reference-fold inspection fixture','12-01','Reorient the perforated reference onto the reverse of the flexible field while retaining its four routed connections.','The folded assembly has 124 recording faces and one common reference with four separate paths.',[['Reference area','2.5 mm² reported'],['Reference topology','1 electrode, 4 wires, not 4 sensing sites']],ecog+' · Figs. 1C/E, 7 and 10B',H],
  ['measure','External-reference EIS cell and synthetic reader','09-01','Check contact paths with external reference, then acquire synthetic output with bank-local or surviving shared reference.','The virtual lot has a continuity ledger, complex impedance spectra and synthetic recording output.',[['EIS range','1 Hz–100 kHz'],['Fitted parameters','Table 1 means by diameter'],['Independent check','Fig. 13 markers not forced to agree with the ideal circuit']],ecog+' · Fig. 4, Figs. 12–13 and Table 1; synthetic output',T],
]);
const P=lane('PtNRGrid · selected array configuration on one large glass panel',
  'Incoming glass support; no PI, parylene or alloy on the panel.', [
  ['measure','Panel transfer and fit review','16-11','Freeze the array form factor. Check the carrier, chuck and written extent independently before any registered move.','A chosen configuration and carrier are recorded; full-panel mount and pattern qualification are still open.',[['Carrier','177.8 × 177.8 × 1.524 mm glass'],['Candidate MLA 150 field','150 × 150 mm; field is not a chuck limit']],pt+' · Fig. 1 and Supplement §§1.1–1.3',I],
  ['coat','Surface/release-interface bench (class)','04-06','Prepare the glass and mark the sacrificial release interface separately from structural parylene.','Glass carries the sacrificial Micro-90 release coating; there is no permanent film yet.',[['Release interface','Micro-90'],['Glass disposition','Temporary support']],pt+' · Supplement §1.1'],
  ['deposit','Parylene-C deposition chamber','03-08','Add the lower structural parylene onto the temporary release coating. Keep the source’s distinct thickness statements.','Lower parylene is continuous on the release-coated glass support.',[['Bottom film, article','3.5 µm nominal'],['Bottom deposition, supplement','3.7 µm']],pt+' · Fig. 1 and Supplement §1.1'],
  ['pattern','Maskless exposure station · compatibility pending','02-03','Register the first route artwork before metal deposition; the drawing uses witness lines rather than published production artwork.','The first route pattern is defined in resist on the supported parylene.',[['Witness trace','4 µm width'],['Witness gap','6 µm'],['Carrier mounting','Unqualified in register']],pt+' · Supplement §1.1'],
  ['deposit','Cr/Au deposition and lift-off cluster','03-01','Create the first continuous metal route where artwork A calls for it. Retain the first-pass break condition as a separate observation.','Patterned Cr/Au pass A remains on lower parylene; pass B does not exist yet.',[['Cr','10 nm per pass'],['Au','250 nm per pass']],pt+' · Supplement §1.1'],
  ['pattern','Second maskless alignment · same intended nets','02-03','Register artwork B over A without creating a dielectric crossover or a new independent routing layer.','Repeat route artwork is aligned to pass A; overlap is evaluable but the second metal is not yet present.',[['Overlay','Virtual lateral offset'],['Pairing','Repeated metal on the same intended nets']],pt+' · Supplement §1.1'],
  ['deposit','Cr/Au deposition and lift-off cluster','03-01','Build pass B and test whether it bridges a first-pass interruption locally, rather than counting every duplicate trace as a separate channel.','Two registered Cr/Au passes can share overlap junctions; a cut through both remains open.',[['Cr/Au','10/250 nm per pass'],['Witness','Single versus aligned double interruption']],pt+' · Supplement §1.1'],
  ['pattern','Contact-pattern exposure station','02-03','Open the distinct electrode artwork at the route ends; do not reuse routing or relief-hole shapes for this operation.','Resist defines site disks at intended leads; neither alloy nor titanium cap is present.',[['Contact diameter','30 µm nominal'],['Pattern class','Site openings, not perfusion holes']],pt+' · Fig. 1 and Supplement §1.2'],
  ['deposit','Qualified Pt–Ag co-sputter and Ti-cap chamber',null,'Put Pt–Ag alloy at the site and protect it with the Ti cap. Co-deposition is not two sequential pure-metal layers.','Ti-capped Pt–Ag contacts sit on the routed parylene; the nanorod surface has not been formed.',[['Required capability','Simultaneous Pt–Ag co-sputter'],['Cap','50 nm Ti in supplement']],pt+' · Supplement §1.2; candidate chambers do not qualify this configuration'],
  ['deposit','Parylene-C deposition chamber','03-08','Cover metal routes and the capped alloy with upper insulation; leave exposure to a later station.','Upper parylene covers the supported device; wet contacts are still closed.',[['Top parylene','3.1 µm reported'],['Cap identity','Protective Ti remains below polymer']],pt+' · Fig. 1 and Supplement §1.2'],
  ['deposit','Hard-mask patterning and thin-film chamber','03-03','Define the independent Ti mask above passivation. Track site, relief and boundary openings as three different functions.','Patterned Ti hard mask marks intended vias, relief holes and outline above the upper polymer.',[['Ti mask','50 nm'],['Distinct targets','Contact / perfusion relief / perimeter']],pt+' · Supplement §1.2'],
  ['etch','Oxygen polymer pattern transfer (RIE class)','04-01','Open the specified parylene targets. A site reaches its cap; a through-hole or perimeter can reach glass.','Sites can expose protective caps; relief/perimeter openings are defined through the laminate. Glass still supports it.',[['Virtual checks','Window opens; relief is not electrical'],['Scope','No etch-rate or selectivity model']],pt+' · Supplement §1.2'],
  ['etch','Stress-relief and Ti strip, qualified film handling','04-06','Clear temporary titanium after the reported stress-relief stage. Do not mistake exposed alloy for its final nanorod morphology.','Temporary titanium hard mask and accessible site caps are gone; exposed contact material is still Pt–Ag alloy.',[['Removed','Ti mask and opened caps'],['Remain','Glass, polymer and Pt–Ag']],pt+' · Supplement §§1.2–1.3'],
  ['release','Wet-release fixture and transfer handling','04-06','Separate the flexible film from glass through the sacrificial interface. The original conductive materials stay in the released film.','Flexible alloy-contact film is detached; glass and the release interface no longer support it.',[['Release medium class','Water release as reported'],['Handling constraint','Full panel larger than listed write field']],pt+' · Supplement §1.3',H],
  ['etch','Qualified selective dealloy station (external)',null,'Remove silver selectively from the exposed alloy to form the platinum-rich surface. Preserve the distinction between surface change and a route break.','The detached film has exposed platinum-rich contacts or a marked incomplete-surface fault.',[['Surface target','Pt-rich nanorods'],['Nominal recess','≈2 µm from surrounding film'],['Virtual fault','Effective-area proxy, not chemistry']],pt+' · Fig. 1 and Supplement §1.3'],
  ['assemble','Aligned extender bonding (qualified fixture)','08-10','Join released film pads to a custom extender with the reported silver-epoxy interconnect. Inspect alignment and missing bonds separately.','The flexible film is connected to its extender in the model; logical pin identity must still be checked.',[['Bond medium','Silver epoxy'],['Fixture','Custom extender PCB; unreleased pin map']],pt+' · Supplement §1.4',H],
  ['assemble','LGA mating and Intan readout (source system)','16-13','Mate the extender to the reader and retain the hypothetical fault groups as logical teaching constructs.','The film, bonded extender and connector form a virtual readout assembly with labeled logical outputs.',[['Mechanical interface','LGA1155-style'],['Reader in source','Intan RHD2164'],['Fault groups','64 logical connections, illustrative']],pt+' · Supplement §§1.4, 1.6–1.7',H],
  ['measure','Dry continuity, isolation and mapping station','05-07','Trace the current paths through both metal passes, bond and mated output. A crossed map can conduct and still fail.','The assembled specimen has a dry netlist observation; wet access remains a separate question.',[['Inspect separately','Open / shared net / swapped output'],['Scope','Synthetic graph, not electrical probing through passivation']],pt+' · Supplement equipment context; virtual diagnostic',I],
  ['measure','Inert impedance cell and channel-ledger export','09-12','Compare virtual passive EIS with distinct published benchmarks. Keep vent blockage, unexposed contacts and dry opens separate.','The specimen has a virtual all-site ledger and selected RC spectrum; no measured time series is implied.',[['Source benchmark','1 kHz, configuration-specific'],['Output','Synthetic complex impedance and logical continuity']],pt+' · Fig. 1, Supplement §§1.6–1.7; virtual readout',T],
]);
const M=lane('Four-mask SU-8/Au/Pt mesh · selected population',
  'Incoming sacrificial silicon carrier; no release metal or permanent film.',[
  ['measure','CAD/mask bench and carrier inspection','01-01','Register the mesh, stem and pad field in one coordinate system. Choose a reported population before tracking nets.','The incoming silicon support and selected 32-position fixture scheme are logged.',[['Population','32 sites or 16 populated / 32 positions'],['Artwork','Reconstructed, not recovered production masks']],mesh+' · §1; '+mesh32+' · Figs. 1–3',I],
  ['deposit','Sacrificial-film evaporation (class)','03-02','Place temporary nickel beneath the future polymer. Ni and Si do not serve as signal conductors.','Silicon carries a continuous temporary Ni release layer.',[['Film','Temporary Ni'],['Role','Release interface, not pad metal']],mesh+' · §1 and Fig. 2'],
  ['pattern','Mask M1 · lower SU-8 pattern','02-01','Create the lower mechanical rails and braces, then carry the same stem and pad supports into the next mask.','Patterned SU-8 lower mesh covers the temporary nickel; the open cells and braces contain no metal routing yet.',[['Mask','Mechanical foundation'],['Geometry witness','Rails, open cells, braces and pad supports']],mesh+' · §1 and Fig. 2'],
  ['deposit','Mask M2 · gold lift-off cluster','03-02','Define Cr/Au leads and I/O on top of lower SU-8. A brace can tie two rails mechanically without shorting their tracks.','Independent gold nets extend from intended contact landings to the I/O pads on supported polymer.',[['Metal','Cr/Au'],['Witness','Porous pad and continuous seat share one terminal']],mesh+' · §1 and Fig. 2; '+mesh32+' · Fig. 1'],
  ['deposit','Mask M3 · platinum site lift-off','03-01','Place a Pt face on its own gold trace. A disk that misses the landing can look complete but is electrically isolated.','Individual Cr/Pt site disks overlap their intended gold landing in the nominal case.',[['Diameter','20 µm on the 32-site specimen'],['Virtual witness','Local Pt-to-Au registration']],mesh+' · §1 and Fig. 2; '+mesh32+' · Figs. 2–3'],
  ['pattern','Mask M4 · upper SU-8 pattern','02-01','Close insulation over the interconnects while leaving designated Pt faces and connector pads exposed.','The four patterned levels form a supported mesh; the remaining surface openings can be inspected independently of continuity.',[['Mask','Upper insulation and apertures'],['Virtual fault','Reduced site exposure, not missing gold']],mesh+' · §1 and Fig. 2'],
  ['release','Sacrificial-interface release and transfer','04-06','Separate silicon and nickel from the patterned mesh and retain the full polymer/metal structure.','The released mesh has no Si or release Ni; its polymer rails, gold traces and Pt pads remain.',[['Removed','Temporary carrier and Ni'],['Not equivalent to','Contour dicing']],mesh+' · §1 and Fig. 2',H],
  ['assemble','Inert ZIF contact fixture','16-13','Register the planar I/O field to connector pins and close the illustrated fixture only on aligned pads.','Mesh pads sit in the virtual ZIF fixture; pad/pin overlap, latch state and orientation can be inspected.',[['Reported witness','400 µm pad; ~100 µm pin; 500 µm pitch'],['Virtual controls','Shift, seating and label orientation']],mesh32+' · Figs. 2–3',H],
  ['measure','Manual probe / continuity graph','05-07','Check the site–pad–pin path, isolate shared nets and separate label swaps from electrical opens.','The mounted mesh has a dry map; intentionally empty positions do not count as failures.',[['Test class','Open / bridge / reversal'],['Published contact witness','~3 Ω, distinct from wet impedance']],mesh32+' · Fig. 3; synthetic map',I],
  ['measure','Electrochemical cell and synthetic signal bench','09-01','Evaluate electrolyte-facing contacts only where windows and dry routes both survive.','The mounted mesh has synthetic impedance and output; absent measurement is not zero signal.',[['Wet benchmark','~1.3 MΩ at −80° at 1 kHz; 32-site mean'],['Fixture distinction','Wet contact impedance is not pin resistance']],mesh32+' · Fig. 3; model recording',T],
]);
const N=lane('NeuroGrid · passive 2015 surface array witness',
  'Incoming support and a passive array design; no built transistor or implanted setup.',[
  ['measure','Passive mask and carrier inspection','01-01','Assign 256 passive site identities in the document’s 10 µm contact and 30 µm spacing class. Do not reserve a gate on the film.','The selected passive reference coupon has a site map and incoming support; no metal has been formed.',[['Documented population','256 sites'],['Site geometry','10 × 10 µm; 30 µm spacing'],['Position map','Centered teaching lattice']],neuro+' · Fig. 1 and Online Methods',I],
  ['deposit','Parylene-C deposition and temporary handling','03-08','Retain adhesion where intended and distinguish the release boundary from the structural lower film.','A nominal 2 µm base parylene film sits on the temporary support.',[['Film','2 µm parylene C'],['Carrier','Temporary; no Si active circuitry']],neuro+' · Online Methods'],
  ['deposit','GCA projection pattern and evaporated metal (source class)','02-06','Pattern isolated site-to-pad conductors underneath the future insulation. The register ASML is not the paper’s stepper.','The lower film now supports separate Ti/Pt/Au nets at the intended contact landings.',[['Metal','Ti/Pt/Au 10/150/50 nm'],['Original projection class','GCA i-line; register equipment only analogous']],neuro+' · Online Methods'],
  ['deposit','Parylene passivation and contact-window transfer','03-08','Protect the leads and inspect which intended site windows coincide with the future passive interface.','The passivated film distinguishes buried leads from designated recording openings.',[['Finished thickness','≈4 µm'],['Interconnect position','Near neutral plane, described at ≈2 µm depth']],neuro+' · Fig. 1 and Supplementary Fig. 1'],
  ['coat','Passive conducting-polymer interface station','02-07','Finish the PEDOT:PSS recording faces. The polymer exchanges charge at a passive site; it does not form a transistor channel.','PEDOT:PSS is at the designated surface sites; buried metal is distinct from exposed polymer.',[['Exposed face','PEDOT:PSS'],['Fault classes','Blocked site vs exposed interconnect']],neuro+' · Fig. 1 and Online Methods'],
  ['release','Film release and inert holder','12-01','Separate the thin-film coupon from its support and assign the external measurement reference independently of the device leads.','Freestanding passive array coupon is supported by the virtual holder, ready for electrical inspection.',[['Bench reference','Separate bath measurement reference'],['Pinout','Original full fixture not recovered']],neuro+' · architecture; virtual fixture',H],
  ['measure','Manual probe / passive continuity and isolation','05-07','Keep a bridged neighboring net, a severed line and a covered site separate. A dry intact path does not certify wet access.','The passive coupon has a dry path and isolation result; no fitted wet result is implied.',[['Graph','Site to logical pad, with independent neighboring nets'],['Conditions','Open / shared net / intact']],neuro+' · virtual dry diagnostic',I],
  ['measure','Inert small-signal EIS cell','09-01','Measure the passive RC witness only for an exposed isolated site with a valid external reference.','The passive coupon produces synthetic impedance or a missing-data reason; no transfer or gain calculation is used.',[['Output','Complex impedance'],['Circuit basis','Teaching coefficient assumptions, not a raw-data fit']],neuro+' · passive architecture; synthetic test',T],
]);
const O=lane('Khodagholy et al. · 2013 OECT single-device witness',
  'Incoming support and active OECT design; not the 2015 passive NeuroGrid.',[
  ['measure','Active-device CAD and coupon definition','01-01','Choose the single transistor witness from the separately reported active probe architecture. Record companion passive contacts without counting them as transistors.','Active device features and terminals are booked on the incoming support; no gate or channel conducts yet.',[['Reference probe','17 OECTs and eight passive companions'],['Model scope','One active witness']],oect+' · Fig. 1 and Methods',I],
  ['deposit','Parylene-C lower-film deposition','03-08','Form the flexible insulating base and reserve the eventual wet/dry boundary.','Nominal 2 µm bottom parylene supports later active terminals.',[['Bottom film','2 µm parylene C'],['Handling support','Not an active substrate']],oect+' · Fig. 1 and Methods'],
  ['deposit','Ti/Au terminal patterning station','03-01','Produce separate source and drain terminals. A direct metallic bridge now would bypass the eventual polymer channel.','Two metal terminals are on the lower film across the intended channel gap.',[['Terminal film','Ti/Au 5/100 nm'],['Isolation gate','No direct source–drain metal bridge']],oect+' · Fig. 1 and Methods'],
  ['coat','Conducting-polymer channel patterning','02-07','Bridge the source and drain with the reported PEDOT:PSS channel geometry, not with a second layer of gold.','The active polymer channel contacts both terminals; its eventual electrolyte interface is a distinct gate boundary.',[['Channel','6 × 15 µm'],['Polymer legend','200 nm PEDOT:PSS']],oect+' · Fig. 1 legend and Methods'],
  ['etch','Passivation and channel aperture','04-01','Insulate wires through the wet/dry boundary but leave the active polymer available for ionic exchange.','Upper parylene covers the leads; the intended channel has an aperture, unless the virtual cover fault blocks it.',[['Upper parylene','2 µm nominal'],['Separate checks','Channel exposed; metal lead covered']],oect+' · Fig. 1 and Methods'],
  ['assemble','Dry terminal fixture and external bath gate','09-12','Bring source and drain to dry pads while treating the bath gate as a separate electrode, not an on-film metallic jumper.','The OECT witness now has dry source/drain connections and an independent virtual bath gate.',[['Gate','External stainless-steel gate in the source in-vitro setup'],['Three terminals','S, D and the ionic G boundary']],oect+' · Fig. 2 and Methods',H],
  ['measure','Parameter analyzer / dry and gate-isolation audit','09-02','Check whether current travels through the intended polymer or a metal bypass; check leakage and gate availability separately.','The virtual OECT has labeled path and leak results; a conductive drain alone does not establish transistor action.',[['Inspect separately','S/D open, bridge, covered channel, gate loss or leak'],['Qualification','Verify independent instrument channels']],oect+' · architecture; virtual diagnostic',I],
  ['measure','Independent-bias parameter analyzer · virtual transfer','09-02','Sweep the simulated gate with fixed negative drain bias. A functioning p-type witness reduces absolute drain current at more positive gate voltage.','Synthetic transfer, transconductance and separate leakage are reported for the OECT witness.',[['Output','Signed I_D, dI_D/dV_G, gate leakage'],['Source fixture','Dual SourceMeter; single 2450 is not equivalent']],oect+' · Fig. 2; simulated rather than reproduced',T],
]);
const C=lane('CLEAR CL-04 · transfer stack on temporarily supported parylene',
  'Incoming blank silicon support. Carbon will be transferred rather than grown on this workpiece.',[
  ['measure','Temporary silicon receiving and layout bench','16-11','Assign the transparent-film route and record which substrate must leave the specimen before optical inspection.','Temporary silicon has been assigned to the CLEAR coupon and remains an opaque support.',[['Substrate','Silicon, removed later'],['Reference device','16 sites; one-path virtual coupon']],clear+' · Fig. 1, Methods and Supplement S5',I],
  ['deposit','Parylene-C deposition station','03-08','Create the lower flexible film on the temporary silicon. It remains in the released optical stack.','The incoming silicon supports a continuous lower parylene film.',[['Lower parylene C','15 µm reported'],['Role','Permanent dielectric; temporary silicon below']],clear+' · Methods and Supplement S5'],
  ['deposit','Thin-metal lithography and evaporation station','03-01','Form Cr/Au inner routing and pad terminals. Carbon, not bare metal, will define the future site face.','Supported parylene carries patterned Cr/Au contacts and leads; no graphene sheets have been transferred.',[['Adhesion / routing film','10 nm Cr / 200 nm Au'],['Functional separation','Metal terminal vs carbon contact']],clear+' · Methods and Supplement S5'],
  ...[1,2,3,4].map(i=>['transfer-film','Donor monolayer transfer fixture (external qualified capability)',null,'Log transfer '+i+' from a separately grown donor and check which paths actually survive. A logged sheet is not a measured local layer.',i+' of four donor transfers are logged over the supported lower film and terminals.',[['Donor','Separate CVD monolayer'],['Count after station',i+' / 4 transfers'],['Virtual defect','Interrupted sheet; truly shared endpoints only unless ideal ties specified']],clear+' · Fig. 1, Methods and Supplement S5']),
  ['etch','Protective oxide and carbon pattern-transfer bench','04-01','Protect the stacked carbon while defining the active face and routing. Oxide is a temporary process layer, not the final contact material.','Patterned carbon lies beneath temporary protective oxide on the still-supported coupon.',[['Protective cap','30 nm SiO₂ reported'],['Separate material','Carbon itself is not etched into a silicon structure']],clear+' · Methods and Supplement S5'],
  ['deposit','Parylene passivation and opening transfer','03-08','Apply upper insulation and define sites, pads and outline; the site window still exposes the sacrificial oxide first.','The supported patterned laminate has top insulation and openings, with protective oxide still present at the carbon face.',[['Upper parylene','10 µm reported'],['Aperture distinction','Open polymer does not yet mean exposed carbon']],clear+' · Methods and Supplement S5'],
  ['release','Flexible-film transfer and release support','04-06','Separate the laminate from silicon without classifying an opaque support as part of the final optical path.','The patterned flexible specimen is released; oxide still protects the contact.',[['Released material','Parylene/metal/stacked carbon'],['Removed','Temporary silicon']],clear+' · Methods and Supplement S5',H],
  ['etch','Local sacrificial-oxide clearance station','04-06','Clear the temporary oxide at the open contact after release while preserving encapsulation over the leads.','Freestanding CLEAR coupon presents an exposed carbon aperture and insulated wiring.',[['Removed at contact','Protective oxide'],['Virtual issue','Shifted openings may only expose part of the intended carbon face']],clear+' · Methods and Supplement S5'],
  ['measure','Tail fixture, dry resistance and optical-witness review','05-07','Attach the modeled readout and compare dry continuity separately from the source’s material-level optical benchmark.','CLEAR coupon has continuity and aperture evidence, compared against independent source witnesses rather than measured site transmission.',[['Optical reference','~90% at 470 and 570 nm on a separate film witness'],['Sheet-resistance reference','152→76 Ω/□ for one→four layers']],clear+' · Figs. 2e–f; virtual coupon result',T],
]);
const D=lane('Delft DL-ML · direct growth on retained fused silica',
  'Incoming transparent fused silica, retained throughout the device process; no donor transfer occurs on it.',[
  ['measure','Rigid substrate and artwork acceptance','16-11','Select a documented site diameter on the separate direct-growth coupon. Record that the transparent substrate stays in the assembly.','The selected Delft coupon retains its incoming fused-silica support and a declared contact diameter.',[['Substrate','Fused silica, retained'],['Documented site diameters','10 / 30 / 50 µm']],delft+' · §2.1, Fig. 1 and §4.1',I],
  ['deposit','Sputtered Mo pattern and temporary back marker','03-03','Define the front growth catalyst and separate the temporary rear marker used for tool detection from front conduction.','Patterned front Mo and a temporary rear Ti marker are present on the same fused-silica carrier.',[['Front Mo','50 nm reported'],['Rear marker','Temporary Ti; non-electrical']],delft+' · §4.1 and Supplement S2'],
  ['etch','Back-marker strip and front-mask inspection','04-06','Remove the temporary rear marker before growth; verify the patterned Mo catalyst remains on the front.','Rear marker is gone; the original fused silica and patterned front Mo are retained.',[['Removed','Rear marker only'],['Retained ahead of growth','Patterned Mo catalyst']],delft+' · §4.1 and Supplement S2'],
  ['deposit','High-temperature catalytic graphene CVD (external)',null,'Grow multilayer carbon directly on patterned Mo; do not substitute donor graphene transfer or a dielectric PECVD process.','Turbostratic multilayer carbon directly covers the patterned catalyst on rigid silica.',[['Source route','On-chip catalytic growth; no donor transfer'],['Layer count','Not resolved locally']],delft+' · §2.1, Fig. 1 and §4.1; specialized class'],
  ['deposit','Sacrificial cap patterned over future contacts','03-01','Shield the future carbon contact with the reported Ti/Al cap during subsequent fabrication.','The grown contact remains on Mo and is locally protected by its sacrificial Ti/Al cap.',[['Cap','10 nm Ti / 100 nm Al'],['Function','Temporary protection, not device face']],delft+' · §4.1 and Supplement S2'],
  ['deposit','Outer routing lithography and rear clamp metal','03-01','Form outer Ti/Au leads and pads, and add the distinct rear tool-clamp film. Keep these separate from the buried internal Mo path.','Outer Ti/Au, inner graphene/Mo and a temporary back clamp layer all coexist on retained silica.',[['Outer terminal','Ti/Au'],['Rear Ti','Separate clamp film, not the removed marker']],delft+' · Fig. 1 and §4.1'],
  ['deposit','Parylene-C passivation chamber','03-08','Cover the inner bilayer and outer gold wiring without relabeling Mo or Ti/Al as passivation.','Patterned conductors are underneath continuous top parylene; contact cap remains buried until opening.',[['Passivation','1–2 µm parylene C reported'],['Distinct inner route','Graphene/Mo underneath']],delft+' · Fig. 1 and §4.1'],
  ['etch','Pad and contact openings (ICP class)','04-02','Open contact and pad access in the parylene. A newly opened contact lands on the protective cap rather than immediately exposing graphene.','Passivation openings are formed; the protected carbon face is not yet finished.',[['Pattern targets','Pad and site apertures'],['Contact stop','Sacrificial Ti/Al cap']],delft+' · §4.1 and Supplement S2'],
  ['dice','Dicing and rigid-die transfer','04-07','Separate the coupon at its perimeter while preserving fused silica beneath carbon and pads.','The diced coupon leaves its panel perimeter but still has its rigid fused-silica substrate.',[['Handoff','Rigid die, not a released film'],['Retention','Silica stays in the electrical/optical stack']],delft+' · §4.1 and Supplement S2',H],
  ['etch','Sacrificial cap and clamp-film clearance','04-06','Strip both temporary layers from their designated locations; exposed dark carbon can still have underlying Mo.','The temporary cap and rear clamp film are cleared. Mo remains under the carbon where not yet removed.',[['Removed','Contact Ti/Al cap and backside clamp film'],['Still present','Mo pattern beneath graphene']],delft+' · §4.1 and Supplement S2'],
  ['etch','Localized catalyst clearance at the face','04-06','Remove catalyst at the opened electrode face only. Do not remove the protected Mo intentionally retained under the inner route.','The open aperture is nominally Mo-free, while the covered inner route remains a conductive graphene/Mo bilayer.',[['Virtual fault','Residual-Mo fraction interrupts the clear area'],['Check separately','Dry electrical path vs transparent aperture']],delft+' · Fig. 1 and §4.1'],
  ['measure','PCB handoff and independent optical/wet-boundary review','05-07','Map the wired coupon and audit dry continuity, carbon window and separate Raman/transmission witnesses without treating them as local stack thickness measurements.','The rigid Delft coupon has a virtual continuity and aperture report; source optical data refer to a separate specimen.',[['Optical witness','47.5% at 550 nm on separate graphene/glass witness'],['Raman witness','D, G and 2D bands support multilayer assignment']],delft+' · Figs. 2a–b and §4.2; virtual coupon result',T],
]);
// Per-boundary custody: the object being processed can change from substrate
// to separated film/die to assembly. Never carry a panel diameter onto a film
// or interpret the written area of a tool as evidence of mount compatibility.
function forms(steps,changes){
  const at=(i)=>changes.filter(([from])=>from<=i).at(-1);
  for(const [i,s] of steps.entries()){
    const [,name,shape,sizeMm]=at(i);
    const [,outName,outShape]=at(i+1);
    Object.assign(s,{specimen:name,workpieceShape:shape,afterSpecimen:outName,outgoingShape:outShape});
    if(sizeMm!==undefined)s.sizeMm=sizeMm;
  }
}
forms(E,[
  [0,'Bremen · selected field on the three-up silicon wafer','wafer',101.6],
  [14,'Bremen · released flex-rigid ECoG with its retained silicon island and connectors','assembly'],
]);
forms(P,[
  [0,'PtNRGrid · selected array on its square glass panel','panel',177.8],
  [14,'PtNRGrid · released parylene array and its Pt–Ag/Pt recording sites','film'],
  [16,'PtNRGrid · released array attached to the extender','assembly'],
]);
forms(M,[
  [0,'Mesh · selected mesh field on the reference 3-inch silicon wafer','wafer',76.2],
  [7,'Mesh · released SU-8/Au/Pt net and contact tail','film'],
  [8,'Mesh · same mesh held by its ZIF contact fixture','assembly'],
]);
forms(N,[
  [0,'NeuroGrid · selected passive coupon on temporary support (format unspecified)','panel'],
  [6,'NeuroGrid · released passive film; electrode sites and insulated traces retained','film'],
]);
forms(O,[
  [0,'OECT · single-device coupon on schematic support (format unspecified)','panel'],
  [6,'OECT · polymer-device witness in the dry-terminal / external-gate fixture','assembly'],
]);
forms(C,[
  [0,'CLEAR · selected parylene device field on 4-inch silicon','wafer',101.6],
  [10,'CLEAR · released parylene / graphene laminate, without the silicon','film'],
  [12,'CLEAR · same flexible laminate in its virtual tail fixture','assembly'],
]);
forms(D,[
  [0,'Delft · selected direct-growth field on 4-inch fused silica','wafer',101.6],
  [9,'Delft · separated rigid fused-silica die with its grown carbon','die'],
  [12,'Delft · same rigid silica die in the mapped board assembly','assembly'],
]);
M[0].settings.push(['Reference wafer','3 in Si, Fig. 3B (inch-to-mm conversion is nominal, not chuck qualification)']);
C[0].settings.push(['Reference wafer','4 in Si, Park et al., Results; held only until laminate release']);
D[0].settings.push(['Reference wafer','4 in fused silica, Fig. 1c; substrate retained after dicing']);
// Complete panel handling, packaging of a tethered wafer, and temporary
// support dimensions are not qualified by nominal wafer diameter alone.
for(const s of P.slice(0,14))s.allowModelMotion=false;
for(const s of [E[11],E[12],E[13],...N.slice(0,6),...O.slice(0,6)])s.allowModelMotion=false;

// Local, magnified material/topography witnesses. Independent face history
// prevents (for example) back marker removal from erasing front-side catalyst.
// Reopening a site is not equivalent to stripping all the circuit insulation.
const w=(feature,material,face='front')=>({feature,material,face});
function surfaces(steps,startMaterial,substrate,changes,releaseBoundary=Infinity){
  const faces={front:['blank',startMaterial],back:['blank',startMaterial]};
  for(const [i,s] of steps.entries()){
    const {feature,material,face='front',...local}=changes[i]||{};
    const [beforeFeature,beforeMaterial]=faces[face];
    const afterFeature=feature??beforeFeature,afterMaterial=material??beforeMaterial;
    s.processFace=face;
    s.surfaceFeatures={substrate:i<releaseBoundary?substrate:'polymer',
      ...local,beforeFeature,beforeMaterial,afterFeature,afterMaterial};
    faces[face]=[afterFeature,afterMaterial];
  }
}
surfaces(E,'silicon','silicon',{
  1:w('openings','oxide','back'), 2:w('insulating-film','polymer'),
  // Stage 3 is genuinely branched. The default makes no claim about etching.
  4:w('blanket-film','gold'), 5:w('site-faces','gold'), 6:w('metal-traces','gold'),
  7:w('insulating-film','polymer'), 8:w('openings','polymer'), 9:w('openings','polymer'),
  10:w('back-trenches','silicon','back'), 11:w('openings','oxide','back'), // Thermal oxide after Si breakthrough, not an SOI BOX.
},14);
E[3].branches={
  rigid:{effect:'etch',operation:'Open tapered windows through the lower polyimide at Type C pad landings. The future joints land on rigid Si/SiO₂.',
    after:'Type C: tapered lower-PI windows expose the rigid oxide-backed pad landings; no metal has been deposited.',
    surfaceFeatures:{...E[3].surfaceFeatures,afterFeature:'openings',afterMaterial:'polymer'}},
  poly:{effect:'none',equipmentId:null,machine:'Type B material retention · no window etch',
    operation:'Retain lower polyimide under Type B pads. Do not etch a Type C taper into this comparison specimen.',
    after:'Type B: the lower PI still covers the pad landings; no metal has been deposited.',
    surfaceFeatures:{...E[3].surfaceFeatures,afterFeature:'insulating-film',afterMaterial:'polymer'}},
};
E[4].branches={
  rigid:{before:E[3].branches.rigid.after,surfaceFeatures:{...E[4].surfaceFeatures,beforeFeature:'openings'}},
  poly:{before:E[3].branches.poly.after},
};
surfaces(P,'glass','glass',{
  1:w('blanket-film','dielectric'), 2:w('insulating-film','polymer'),
  3:w('resist-image','resist'), 4:w('metal-traces','gold'),
  5:w('resist-image','resist'), 6:w('metal-traces','gold'),
  7:w('resist-image','resist'), 8:w('site-faces','metal'), // Ti-capped Pt–Ag.
  9:w('insulating-film','polymer'), 10:w('openings','metal'), // Separate Ti mask.
  11:w('openings','polymer'), 12:w('site-faces','metal'), // Cleared Ti; still Pt–Ag.
  14:w('site-faces','platinum'), // Dealloy on the released film, not on its glass.
},14);
// Glass dimensions describe the incoming whole panel, not released parylene.
for(const s of P.slice(0,14))s.surfaceFeatures.thicknessMm=1.524;
P[13].surfaceFeatures.outgoingSubstrate='polymer';
// Bremen published 380 µm start; after backside recess thickness is local,
// so no single nominal thickness should stand in for the etched flex window.
for(const s of E.slice(0,10))s.surfaceFeatures.thicknessMm=.380;
surfaces(M,'silicon','silicon',{
  1:w('blanket-film','metal'), 2:w('openings','polymer'),
  3:w('metal-traces','gold'), 4:w('site-faces','platinum'), 5:w('openings','polymer'),
},7);
// Carrier formats in these native teaching routes are deliberately unspecified.
// The rectangular view is a local support/coupon, not a claim about a whole wafer.
surfaces(N,'substrate','substrate',{
  1:w('insulating-film','polymer'), 2:w('metal-traces','gold'),
  3:w('openings','polymer'), 4:w('site-faces','polymer'),
},6);
surfaces(O,'substrate','substrate',{
  1:w('insulating-film','polymer'), 2:w('metal-traces','gold'),
  3:w('conductive-pattern','polymer'), 4:w('openings','polymer'),
},6);
surfaces(C,'silicon','silicon',{
  1:w('insulating-film','polymer'), 2:w('metal-traces','gold'),
  3:w('blanket-film','carbon'), 4:w('blanket-film','carbon'),
  5:w('blanket-film','carbon'), 6:w('blanket-film','carbon'),
  7:w('openings','oxide'), 8:w('openings','polymer'),
  10:w('site-faces','carbon'),
},10);
surfaces(D,'glass','glass',{
  1:w('metal-traces','metal'), 2:w('blank','glass','back'), 3:w('conductive-pattern','carbon'),
  4:w('site-faces','metal'), 5:w('metal-traces','gold'), 6:w('insulating-film','polymer'),
  7:w('openings','polymer'), 9:w('site-faces','carbon'), 10:w('site-faces','carbon'),
});
// Besides the front operation the authors placed two *different* temporary Ti
// films on the back. Do not use the retained front Mo path as their evidence.
// Explicit custody prevents a text heuristic from turning a fixture/board
// back into a loose film when later test records stop mentioning its package.
for(const [lane,start,assemblyType] of [[E,12,'flex-rigid'],[P,15,'flex-extender'],
  [M,7,'zif-fixture'],[O,5,'terminal-fixture'],[C,11,'tail-fixture'],[D,11,'pcb']])
  for(const phase of lane.slice(start))phase.surfaceFeatures.assemblyType=assemblyType;
// Incoming donor monolayers are transfers (neither direct growth nor CVD of
// this specimen); counts are transfer events, not verified local layer counts.
for(let i=3;i<=6;i++)Object.assign(C[i].surfaceFeatures,{donorLayersBefore:i-3,donorLayersAfter:i-2});
C[9].surfaceFeatures.outgoingSubstrate='polymer';
M[6].surfaceFeatures.outgoingSubstrate='polymer';
N[5].surfaceFeatures.outgoingSubstrate='polymer';
O[5].surfaceFeatures.outgoingSubstrate='polymer';
D[8].surfaceFeatures.outgoingSubstrate='glass';
D[2].surfaceFeatures.beforeFeature='blanket-film';D[2].surfaceFeatures.beforeMaterial='metal';
D[9].settings.push(['Also removed','Back Ti clamp layer, not the initial marker (already removed before CVD)']);

function compare(specimen, leftKey,left,rightKey,right,simultaneous=false){
  return left.map((a,i)=>{
    const b=right[i];
    const la=leftKey==='clear'?'CLEAR':'NeuroGrid',lb=rightKey==='delft'?'Delft':'OECT';
    const prefix=(x,y)=>simultaneous?la+': '+x+' '+lb+': '+y:x;
    return {
      // Never turn a two-sample overview into one fictitious substrate/job.
      ...(simultaneous?{effect:'none',workpieceShape:'none',outgoingShape:'none'}:a),
      machine:simultaneous?(a.machine===b.machine?a.machine:la+' / '+lb+' stations'):a.machine,
      equipmentId:!simultaneous||a.equipmentId===b.equipmentId?a.equipmentId:null,
      operation:prefix(a.operation,b.operation),
      before:prefix(a.before,b.before), after:prefix(a.after,b.after),
      settings:simultaneous?[...a.settings.map(([k,v])=>[la+' · '+k,v]),...b.settings.map(([k,v])=>[lb+' · '+k,v])]:a.settings,
      specimen:simultaneous?specimen:a.specimen,
      afterSpecimen:simultaneous?specimen:a.afterSpecimen,
      evidence:simultaneous?a.evidence+' | '+b.evidence:a.evidence,kind:simultaneous?(a.kind===b.kind?a.kind:H):a.kind,
      branches:{[leftKey]:a,[rightKey]:b},
    };
  });
}
export default {
  'flex-rigid-ecog-foundry':E,
  'ptnrgrid-foundry':P,
  'mesh-electronics-foundry':M,
  'neurogrid-oect-foundry':compare('NeuroGrid / OECT · choose one architecture','passive',N,'oect',O),
  'graphene-stack-compare':compare('Independent CLEAR and Delft coupons · do not merge substrates','clear',C,'delft',D,true),
};
