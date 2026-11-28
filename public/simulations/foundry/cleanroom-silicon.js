import {artwork64D} from './cleanroom-64d-artwork.js';
/*
 * Native stage order, not a factory recipe. Numbers explicitly called "model defaults"
 * come from the existing standalone controls and do not represent live slider values.
 * Sources already linked in the labs:
 *   Majeed (imec), 3D & Systems Summit, slide 11:
 *   https://www.semi.org/sites/semi.org/files/2025-06/08_Bivragh%20Majeed.pdf#page=11
 *   Jun et al. Nature (2017), Fig. 1 and Extended Data Table 1:
 *   https://pmc.ncbi.nlm.nih.gov/articles/PMC5955206/
 *   Lakunina et al. Nat Methods (2026), Methods, Design and fabrication:
 *   https://doi.org/10.1038/s41592-026-03076-z
 *   Yang et al. J Neural Eng (2020), §§2.2–2.5 and Fig. 6:
 *   https://pmc.ncbi.nlm.nih.gov/articles/PMC7227378/
 *   Masmanidis Lab 2017 reticles / Gerbers / maps at pinned source revision:
 *   https://github.com/sotmasman/Silicon-microprobes/tree/4bb0c3a7a4114be53866ccf2aaddf6b134ccc897
 *   Jones et al., historical glass–silicon array; Utah patent Figs. 6–9:
 *   https://pubmed.ncbi.nlm.nih.gov/1510294/ ; https://patents.google.com/patent/US5215088A/en
 *   Wendelken et al., Slant hardware: https://doi.org/10.1186/s12984-017-0320-4
 *   Blackrock ranges: https://blackrockneurotech.com/products/slant-array/
 *   Neuropixels public family/layout and software format: https://www.neuropixelscentral.org/technology
 *   https://billkarsh.github.io/SpikeGLX/help/imroTables/
 */
const fabrication = 'fabrication';
const inspection = 'inspection';
const handoff = 'handoff';
const test = 'test';

const imec = 'Public boundary: imec/Majeed, slide 11. ';
const feol = 'Authored front-end witness. imec/Majeed slide 11 starts with finished foundry CMOS; ';
const yang = 'Yang et al., ';
const historical = 'Historical geometry: Jones et al. (1992) and US5215088A';
const built = (fields) => fields.map(([label,value]) => [label, value + ' (model default)']);
// Explicit process class: an etched metal pattern is removal, not exposure
// or deposition. Never classify a step from a verb in its explanatory prose.
const st = (machine, equipmentId, kind, effect, operation, settings, evidence) =>
  ({machine,equipmentId,kind,effect,operation,settings,evidence});
const flow = (specimen, states, steps, revisions) => {
  const describe = (i) => revisions ? 'r' + revisions[i] + ' · ' + states[i] : states[i];
  return steps.map((step,i) => ({...step,specimen,before:describe(i),after:describe(i+1)}));
};
const revs = (n) => Array.from({length:n+1},(_,i)=>i);

const np1 = flow('The selected Neuropixels 1.0 teaching die, carried from its wafer field to acquisition.', [
  'Authored 200 mm SOI wafer and reticle layout; no die committed.',
  'One complete reticle field is selected and its die identity is recorded.',
  'Selected die carries a printed isolation-mask witness; the silicon is unchanged.',
  'Isolation trenches are cut in the model; residual mask and depth are recorded.',
  'The trenches contain modeled dielectric plus an overburden above the wafer field.',
  'The isolation field is planarized in the model; remaining oxide and dishing are saved.',
  'Gate-image dimensions on the surviving active region have been measured virtually.',
  'The normalized activation and transistor witnesses have been evaluated.',
  'A modeled six-level interconnect record carries line and via continuity forward.',
  'The interconnect stack carries the stress-compensation film witness.',
  'Electrode-window openings are printed and aligned against the modeled contact lands.',
  'Via accessibility is calculated at the same contact lands.',
  'TiN contact area, thickness and access are recorded for the same die.',
  'Electrode protection and bond-window access are recorded on the finished front stack.',
  'Frontside silicon edge trenches define the selected shank boundary.',
  'The supported workpiece carries a modeled backside thickness profile.',
  'Opposing etches have been compared and the model records release clearance and shank geometry.',
  'The same die is evaluated alongside the rest of the simulated wafer; geometry and access flags are carried forward.',
  'The released die is recorded as an attached virtual probe on a flex/headstage interface.',
  'A site-to-readout map is committed on the attached virtual probe.',
  'Same-seed process and ideal-control AP/LFP traces and the native run ZIP are available.'
], [
  st('SOI wafer intake and reticle selection', '16-11', handoff, 'handoff',
    'Select a complete modeled die. Preserve that identifier at every later station.',
    [['Wafer format','200 mm reference'],['Die selector','Use a complete field; edge fields are not accepted']],
    imec+'The real incoming item for post-CMOS processing is an already fabricated 130 nm wafer. This simulator starts farther upstream on an authored blank to show front-end concepts.'),
  st('Projection lithography witness · external foundry step', '02-06', fabrication, 'pattern',
    'Preview how relative exposure, blur and registration shift change the isolation image, then commit the cleared mask footprint.',
    built([['Relative exposure','1.00×'],['Blur σ','0.50 µm'],['Overlay offset','0 µm']]),
    feol+'the reticle and resist settings are neither the device masks nor a qualified run on the registered stepper.'),
  st('Silicon trench etch witness · external foundry step', '04-02', fabrication, 'etch',
    'Apply the printed opening to the virtual silicon and track how etch exposure and selectivity consume the mask.',
    built([['Relative etch exposure','1.00×'],['Si-to-resist selectivity','6:1']]),
    feol+'the registered 04-02 model is a 100 mm witness, not a 200 mm foundry handoff.'),
  st('Dielectric trench-fill witness · external foundry step', '', fabrication, 'fill',
    'Fill the simulated trench before calculating field overburden; compare fill at reduced coverage.',
    built([['Relative deposition','1.00×'],['Step coverage','0.85']]),
    feol+'no actual dielectric deposition method, gas recipe or equipment binding is established here.'),
  st('CMP planarization witness · external foundry step', '04-09', fabrication, 'polish',
    'Use the existing removal proxy to compare remaining field dielectric against local dishing.',
    built([['Relative pressure','1.00×'],['Relative speed','1.00×'],['Relative polish exposure','1.00×']]),
    feol+'the modeled pressure, speed and passes are dimensionless, and the registered polisher is an analogy only.'),
  st('Gate lithography witness · external foundry step', '02-06', fabrication, 'pattern',
    'Image the authored gate on the completed isolation field and compare printed width with the target witness.',
    built([['Relative exposure','1.00×'],['Gate witness blur','0.35 µm'],['Gate overlay','0 µm']]),
    feol+'this representative gate is not the vendor’s mask pitch or transistor geometry.'),
  st('Thermal budget / junction activation proxy', '', fabrication, 'heat',
    'Change the normalized thermal input and observe the modeled diffusion and current response without claiming a real doping operation.',
    built([['Relative thermal budget','1.00×']]).concat([['Witness','Normalized diffusion and MOS response']]),
    feol+'no implant dose, anneal schedule, junction profile or calibrated TCAD is supplied.'),
  st('Six-level interconnect witness · external CMOS', '', handoff, 'handoff',
    'Carry line-width and via-coverage changes through six schematic interconnect levels before post-CMOS processing.',
    built([['Metal width factor','1.00×'],['Via coverage factor','0.90']]).concat([['Reference architecture','Six aluminum metal levels']]),
    'Lakunina et al., Methods, identify the unchanged 130 nm SOI recording IC and six aluminum metal levels. The schematic resistances do not recover the actual process kit or layer stack.'),
  st('Film-stress witness · external 200 mm module', '', fabrication, 'deposit',
    'Record the modeled compensation film and its signed contribution to shank curvature.',
    built([['Relative film thickness','1.00×'],['Film stress balance factor','1.00×']]),
    imec+'Stress compensation and via formation are identified. No thickness, stress target, material stack or registered 200 mm deposition compatibility is implied.'),
  st('Contact-window lithography witness', '02-06', fabrication, 'pattern',
    'Overlay the two-site teaching image on the contact lands; keep the photoimage separate from an open via.',
    built([['Relative exposure','1.00×'],['Blur σ','0.65 µm'],['Overlay offset','0 µm']]),
    imec+'Electrode patterning is documented as a module; the exposure values, two-site witness and linked register model are not production settings.'),
  st('Contact via etch witness · external 200 mm module', '04-02', fabrication, 'etch',
    'Test whether the dielectric clears where the contact mask opens. A local shadow can disable one site without failing every channel.',
    built([['Relative etch exposure','1.00×'],['Oxide-to-mask selectivity','5:1'],['Local shadow at site 800','0']]),
    imec+'Via formation is public at module level; the registered 100 mm ICP model is not a 200 mm wafer etcher or a calibrated recipe.'),
  st('TiN contact interface witness', '03-03', fabrication, 'deposit',
    'Apply the modeled contact thickness only at accessible openings and record the exposed area.',
    built([['Relative TiN thickness','1.00×'],['Recess coverage','0.90']]).concat([['Architecture','960 physical sites for the 1.0 switchable configuration']]),
    'Jun et al. Fig. 1 documents porous TiN sites. A sputter cabinet is a class comparison; its installed target, approved process and resulting porosity are unverified.'),
  st('Frontside protection and bond-pad access witness', '', fabrication, 'coat',
    'Carry the protected electrode array forward and check whether the distinct bond windows remain accessible.',
    built([['Protection thickness factor','1.00×'],['Window-opening factor','1.00×']]),
    imec+'Protection and bond opening are separate public modules. The grouped simulator witness does not identify the passivation stack or chemistry.'),
  st('Frontside deep-silicon etch · external 200 mm module', '04-03', fabrication, 'etch',
    'Compare the two edge trenches and resulting shank width without removing the still-supported die from the wafer.',
    built([['Relative front removal','1.00×'],['Lateral-to-vertical ratio','0.035']]),
    imec+'The frontside deep silicon cut is public. The linked 150 mm DRIE fixture is a size-incompatible analogy, not the production station.'),
  st('Supported backside grinding witness', '04-08', fabrication, 'grind',
    'Retain a virtual support while comparing the three local thickness readings after bulk removal.',
    built([['Relative bulk removal','1.00×'],['Thickness gradient','2 µm']]).concat([['Starting profile','500 µm in this authored wafer model']]),
    imec+'Backside grinding is a public module. The carrier, force, wheel and remaining-thickness acceptance limits are not specified.'),
  st('Backside deep-etch release witness', '04-03', fabrication, 'etch',
    'Compare the remaining backside silicon against the front edge trench and flag whether the two removals actually meet.',
    built([['Relative back removal','1.00×'],['Backside uniformity factor','0.98']]),
    imec+'Backside grinding and etch are distinct operations. The registered 150 mm fixture cannot take the source 200 mm wafer.'),
  st('Virtual wafer probe and sort', '05-07', inspection, 'measure',
    'Sweep the committed settings across the model wafer and keep mechanical and electrical failures separately attributable.',
    [['Selection','Same committed die and prior process settings'],['Report','Geometry, bow, continuity and site access']],
    'Simulator-authored wafer sweep, not measured production yield. The register probe station is a 200 mm class reference; this software does not prove its contact-map compatibility.'),
  st('Virtual singulation and flex attach', '04-07', handoff, 'assemble',
    'Retain the selected die while combining the separation, attachment and electrical-continuity checks represented by this stage.',
    built([['Bond contact factor','0.95']]).concat([['Handoff','Released die → virtual flex/headstage']]),
    'Jun et al. Fig. 1 shows the probe/flex/headstage. The dicing link is a station reference, not evidence of the vendor singulation, bonding or package fixtures.'),
  st('Neuropixels 1.0 address selection', '10-13', test, 'measure',
    'Apply the current bank choice; distinguish physical contacts, concurrent readouts and a reference slot.',
    [['Bank selector','Proximal, distal, middle or distributed'],['Capacity','384 simultaneous paths out of 960 physical sites']],
    'Jun et al. Fig. 1 and SpikeGLX table documentation establish the selection architecture. The app map is a virtual witness, not a hardware configuration export.'),
  st('Synthetic AP/LFP acquisition and matched control', '01-05', test, 'measure',
    'Capture the process model and same-seed ideal control; read channel metrics and download the real simulation archive.',
    [['Capture choices','120, 240 or 480 ms'],['Sampling','AP 30 kHz · LFP 2.5 kHz'],['Synthetic seed','Use the current integer seed']],
    'Jun et al., Extended Data Table 1, supports the sampling rates. The recorded voltages and modeled faults here are synthetic; no tissue, hardware or production data is captured.')
], revs(20));

const ucla = flow('One selected Masmanidis 64D wafer field and its extracted die; 64 physical site identities persist through assembly.',[
  'The 2017 reticle-derived 64D design and modeled 150 mm SOI wafer are ready.',
  'One complete reticle field is selected on the 21 µm device-layer wafer.',
  'The selected field has its modeled bottom nitride, insulating the later conductor from the device silicon.',
  'The bottom nitride has a blanket Ti/Au/Ti stack above it.',
  'The blanket conductor is patterned into the layout’s traces, sites and pads.',
  'A modeled top nitride film covers the metal traces and uncut openings.',
  'The top nitride carries the printed electrode and pad-window mask.',
  'The model has checked which electrode and pad windows clear through the top nitride.',
  'The published outline is transferred through the device silicon; the handle and BOX still support the probe.',
  'The patterned SOI workpiece is temporarily supported front-side down on a carrier.',
  'The handle silicon is removed toward the buried oxide stop on the supported wafer.',
  'The exposed BOX is cleared in the chosen region; the device still relies on its temporary carrier.',
  'The same probe is released and screened for modeled residue or structural defects.',
  'The released probe has been placed on the 64-channel PCB, before electrical bonding.',
  'Site, bond pad, board pin and selected amplifier map form the virtual electrical chain.',
  'The bond region has a modeled encapsulation layer; tip windows remain the sensing interfaces.',
  'The virtual gold treatment has updated exposed-site impedance without changing path identity.',
  'Each of the 64 paths has a modeled continuity, bridge, area and impedance assessment.',
  'The process and same-seed ideal traces are recorded and native ZIP export is available.'
],[
  st('Reticle layout and SOI wafer selection', '01-01', handoff, 'handoff',
    'Load the 2017-source reticle witness, choose a complete field and keep its ID through subsequent model checkpoints.',
    [['Wafer / field','150 mm wafer · 22 × 22 mm reticle'],['SOI device silicon','21 µm'],['Field selector','Complete field only']],
    yang+'§2.2 and the pinned UCLA design repository establish the format and active layer. The app’s reticle occupancy map is modeled.'),
  st('Lower silicon-nitride deposition witness', '03-07', fabrication, 'deposit',
    'Add the bottom dielectric underneath the conductor and compare relative deposition before metal is transferred.',
    [['Source material','Low-stress SiNₓ, approximately 400 nm in §2.2'],...built([['Relative deposition','1.00×']])],
    yang+'§2.2 identifies the nitride thickness and sequence; the PECVD cabinet is a register analogy, not the authors’ approved tool recipe.'),
  st('Tri-layer metallization witness', '03-01', fabrication, 'deposit',
    'Add the Ti/Au/Ti film represented by the app and preserve the Au thickness in the downstream resistance estimate.',
    [['Published film stack','10 nm Ti / 100 nm Au / 10 nm Ti'],...built([['Relative thickness','1.00×']])],
    yang+'§2.2 documents the stack. The evaporation station is a deposition-class reference, not an identified foundry instrument.'),
  st('Pattern the open reticle’s metal using plasma etch', '04-01', fabrication, 'etch',
    'Transfer the source trace geometry and compare the gap between traces against local neck loss on CH32.',
    built([['Metal edge bias','0 µm'],['Local neck loss at CH32','0 µm']]),
    yang+'§2.2 distinguishes plasma-patterned nitride/metal from DRIE silicon. The layout is source-derived; edge-bias and fault inputs are authored.'),
  st('Upper silicon-nitride deposition witness', '03-07', fabrication, 'deposit',
    'Cover the patterned traces with the modeled upper dielectric; leave the recording and bonding windows unopened at this step.',
    [['Source material','Low-stress SiNₓ'],...built([['Relative deposition','1.00×']])],
    yang+'§2.2 documents the dielectric–metal stack. The simulator does not establish film stress, chemistry or production tolerances.'),
  st('Electrode and bond-opening lithography', '02-01', fabrication, 'pattern',
    'Register the published openings to the existing metal artwork; inspect blur, relative exposure and overlay before any dielectric removal.',
    built([['X/Z overlay','0 / 0 µm'],['Gaussian blur σ','0.65 µm'],['Relative dose','1.00×']]),
    yang+'§2.2 and the UCLA opening mask support the target geometry. The register aligner is a UV-lithography analogy; the four model inputs are not its settings.'),
  st('Nitride window plasma-etch witness', '04-01', fabrication, 'etch',
    'Compare depth removed with the upper dielectric thickness. An under-cleared window can leave a trace intact but insulated at the site.',
    built([['Relative etch depth','1.00×']]).concat([['Input','Printed recording and pad openings']]),
    yang+'§2.2 documents plasma patterning; no recipe transfers to the reference chamber.'),
  st('Frontside device-layer deep etch', '04-03', fabrication, 'etch',
    'Transfer the extracted outline into the 21 µm top silicon and compare opening depth and lateral material loss.',
    [['Source device layer','21 µm'],...built([['Relative front etch','1.00×'],['Side loss per edge','0.50 µm']])],
    yang+'§2.2 uses DRIE to form vertical sidewalls and chisel-like tips. Register hardware is a deep-etch analogy, not a lot process qualification.'),
  st('Temporary frontside support / carrier handoff', '16-11', handoff, 'transfer',
    'Turn the patterned workpiece face-down on its virtual carrier and preserve which face must be exposed for handle removal.',
    built([['Support coverage','0.95']]).concat([['Orientation','Patterned face on carrier']]),
    yang+'§2.2 uses a water-soluble temporary mount. This is not a claim of permanent wafer-to-wafer bonding or an EVG bonder recipe.'),
  st('Backside handle removal to the oxide stop', '04-03', fabrication, 'etch',
    'Remove modeled handle silicon only through the backside opening while retaining the BOX stop and device layer.',
    built([['Relative handle removal','1.00×']]).concat([['Stop layer','Buried oxide (BOX)']]),
    yang+'§2.2 reports backside DRIE to BOX. The handle thickness used in the witness was authored, not published as a wafer specification.'),
  st('Buried-oxide clear and supported handoff', '04-01', fabrication, 'etch',
    'Clear the exposed BOX with the existing relative-removal witness. Do not call the probe detached from the carrier at this stage.',
    built([['Relative BOX clear','1.00×']]).concat([['Input','Carrier-supported device at the BOX stop']]),
    yang+'§2.2 uses a reactive ion etch to remove BOX. Carrier release is a later handoff; this register link does not qualify the actual etch.'),
  st('Released probe optical sort', '02-12', inspection, 'measure',
    'Check whether the probe has detached from the temporary support and inspect modeled residues or probe-shape defects before board mounting.',
    built([['Release completeness','1.00×']]).concat([['Inspection','Broken shaft, edge chip or residue']]),
    yang+'§2.3 describes dissolving the temporary mount followed by separate individual optical inspection. The microscope is a reference for the inspection only.'),
  st('64-channel board attachment witness', '', handoff, 'assemble',
    'Align the released probe on the 64-channel board and record die attachment. The source describes an epoxy die attach on the connector-equipped PCB; electrical wire bonds are made at the next station.',
    built([['Die offset','0 µm']]).concat([['Input board','Source-backed 64-channel PCB']]),
    yang+'§2.4 describes connector soldering, epoxy die attachment and then wire bonding. The pinned Gerbers establish the board artwork; the modeled offset does not qualify a die bonder or soldering process.'),
  st('Wire-bond and connector-face mapping witness', '08-02', fabrication, 'assemble',
    'Connect each pad to its corresponding board pin; compare top and bottom connector mappings without renumbering physical sites.',
    built([['Relative bond contact','0.95'],['Local CH32 bond defect','0']]).concat([['Connector face','Top or bottom Intan 128-channel map']]),
    yang+'§2.4 and the published maps identify the C3316 amplifier. The register wedge bonder is a class reference; this is not an Intan RHS hardware or bonding recipe claim.'),
  st('Bond encapsulation witness', '08-10', fabrication, 'coat',
    'Cover the wire and bond region in the model and observe how low coverage becomes a separate leakage/noise flag.',
    built([['Coverage factor','0.95']]).concat([['Keep clear','Probe’s exposed recording windows']]),
    yang+'§2.5 uses epoxy over bond wires. The virtual dispenser comparison does not establish a cure schedule or reliable seal.'),
  st('Gold electroplating and impedance witness', '09-01', fabrication, 'deposit',
    'Update the estimated impedance of accessible sites with the model’s progress curve; keep bond or trace continuity independent.',
    built([['Relative plating progress','1.00']]).concat([['Published calibration anchors','4.8 → 0.2 MΩ group means']]),
    yang+'§2.5 and Fig. 6 report those pre/post group means using an Intan C3180. The Gamry reference is not that system or a transferable plating program.'),
  st('All-path electrical QC', '05-07', inspection, 'measure',
    'Inspect all 64 mappings for opens or bridges, then examine site area and estimated impedance as separate outcomes.',
    [['Coverage','64 physical paths'],['Classification','Open, bridged, leak and impedance kept distinct']],
    'Model QC on source-derived routing. A registered probe station only illustrates continuity checks; its electrical contact method is not the source plating or assembled-headstage test.'),
  st('Synthetic bench acquisition and report', '01-05', test, 'measure',
    'Record process and ideal same-seed traces through the current mapped outputs. Open the native archive to inspect channel provenance.',
    [['Fixture size','3,600 frames × 64 paths per run'],['Model sampling','30 kHz · 120 ms'],['Synthetic seed','Use the current integer seed']],
    'Synthetic bench output, not Yang et al.’s experimental acquisition. The passive 64D probe requires external amplification; the virtual console does not claim an attached amplifier.')
],revs(18));

const utah = flow('The same authored 10 × 10 Utah teaching workpiece, preserving all 100 symbolic site IDs.',[
  'Archived silicon blank; no face relief committed.',
  'The rear relief has been committed and released on the same workpiece.',
  'The committed rear relief contains the exact virtual flush-fill regions.',
  'The front geometry now contains the authored posts; the underside and fill are carried forward.',
  'The rounded-tip reference profile is committed; all lower silicon and virtual glass are retained.',
  'Both faces are labeled and the symbolic map has been inspected and released. The native chain and exact inspection are ready.'
],[
  st('D01 teaching clamp · rear geometry', '04-07', fabrication, 'dice',
    'Flip to the rear face, seat and clamp the blank, register the virtual datum, then preview and commit the authored relief before transfer.',
    [['Required face','Rear'],['Sequence','Seat → clamp → register → preview → commit → release'],['Workpiece frame','4,200 µm, authored']],
    historical+' Figs. 6–9 supply context only. DISCO 04-07 is the room location reference; the lab does not run a production saw.'),
  st('D02 fill and plane comparator', '04-09', fabrication, 'fill',
    'Review the partial-fill proposal, then compare and keep the flush plane. Verify and release the committed fill packet.',
    [['Candidate views','Partial fill and flush plane'],['Finish criterion','Exact model occupancy and level']],
    historical+' Figs. 6–7 distinguish the rear grooves and dielectric. The polisher is a station analogy; no real glass reflow or polishing recipe is modeled.'),
  st('D01 teaching clamp · front geometry', '04-07', fabrication, 'dice',
    'Reseat the same workpiece on its front face, register the datum and compare the opposing front relief before release.',
    [['Required face','Front'],['Checkpoint','Reuse the r2 fill and the original site identities']],
    historical+' Figs. 8–9 distinguish the front geometry from rear isolation. The displayed cuts are authored geometry, not a blade path, feed or spindle setting.'),
  st('D03 profile comparator · optional stylus witness', '05-01', inspection, 'measure',
    'Compare rough and rounded profiles on the original site centers, then verify and release the rounded geometry without removing lower glass.',
    [['Views','Rough / taper'],['Separate DektakXT witness','Up to 1,000 µm native vertical range; no substitute for full modeled span']],
    'Bhandari et al. (2010) distinguish rough dicing from shaped profiles. D03 compares authored shapes; the optional local stylus calculation is not the shaping tool.'),
  st('D04–D05 symbolic face and map inspector', '01-01', inspection, 'measure',
    'Inspect both faces, commit the labels, build the symbolic pad-to-destination map and finalize the native inspection.',
    [['Intermediate release','r5 face labels'],['Final payload','r6 inspection · 100 symbolic associations · 0 physical lead edges']],
    'The bench expressly models visual labels and logical associations. It does not make conductors, produce a vendor pin map, verify electrical isolation or record signals.')
],[0,1,2,3,4,6]);

const slant = flow('One selected neighbor boundary on the 10 × 10 inert teaching coupon. Tip grades are separate from cut alignment.',[
  'Matched silicon-and-glass geometry parameters are selected; the section begins as uncut silicon.',
  'A rear-side datum and uncut section have been established.',
  'The selected rear opening is shown before any fill is added.',
  'The same rear opening contains virtual glass beneath still-continuous upper silicon.',
  'The opposing front opening is placed against the rear groove in the same section.',
  'The boundary has been classified by lateral overlap, worst depth margin and retained glass.',
  'The optional Boolean path result is ready under the selected assumptions; geometry remains separate from electrical identity.'
],[
  st('Wafer handling and cut datum witness', '16-11', handoff, 'handoff',
    'Start from the section intersecting the selected neighbor pair. Keep the uniform and graded tip choices separate from the uncut base.',
    [['Nominal pitch / span','400 µm pitch · 3,600 µm center span'],['Slant height evidence','Approx. 0.75–1.50 mm study; 0.50–1.50 mm vendor overview']],
    'Wendelken et al. (2017) and the Blackrock Slant page describe the layout and different endpoint ranges. Modeled intermediate row heights are not measured device values.'),
  st('Rear isolation-groove geometry', '04-07', fabrication, 'dice',
    'Open the single rectangular rear witness on its own datum. Do not treat the figure as a blade profile or a programmed saw path.',
    [['Model inputs','Rear opening width and rear groove depth'],['Location','Selected rear cut, relative to the coupon origin']],
    'Historical Utah patent Fig. 6 shows a rear grid before fill. The registered dicing saw is a geometry-class reference; this section supplies no operating settings.'),
  st('Rear dielectric fill geometry', '', fabrication, 'fill',
    'Represent glass occupying the same rear groove and verify that the silicon still spans the upper section until the front cut arrives.',
    [['Representation','Rectangular glass occupancy'],['Unmodeled','Glass formulation, reflow, voids and material strength']],
    'US5215088A Fig. 7 and Jones et al. support glass isolation for the historical geometry. No commercial ceramic composition or local reflow station is inferred.'),
  st('Opposing front-cut registration witness', '04-07', fabrication, 'dice',
    'Bring the front opening into the same section. Keep within-face pitch, opposing-face shift and the floor position separate.',
    [['Model inputs','Front opening and front floor from rear datum'],['Registration inputs','X/Y pitch change, translation and optional floor drift']],
    'US5215088A Figs. 8–9 show the distinct front-side cuts. The simulated midspan profile is not a machining model or a production Slant schedule.'),
  st('Section overlap and retained-glass inspection', '05-02', inspection, 'measure',
    'Inspect lateral and worst along-edge depth margins separately; flag tangency, a residual silicon web and a rear-plane breach as distinct outcomes.',
    [['Scope','180 interior neighbor boundaries'],['Readout','Signed overlap · retained glass cap · candidate web']],
    'Model-derived rectangular geometry. Optical profiling is a register reference; the witness does not determine material strength, insulation resistance or a factory acceptance tolerance.'),
  st('Inert Boolean continuity fixture', '05-07', test, 'measure',
    'Trace the selected open or bridge faults under the assumed graph. A rear-plane breach alone does not add a conductive edge.',
    [['Scope','100 symbolic nodes · 96 virtual outputs · four parked corners'],['Export','Boundary CSV and optional virtual-output CSV/JSON']],
    'Synthetic path identity only. A possible silicon web can be included as a graph edge, but no physical resistance, tissue signal or package pinout is inferred.')
]);

const routing = flow('The currently selected Neuropixels revision and routing configuration; no physical specimen is connected.',[
  'The bench has the existing probe, preset and fault selections.',
  'The selected revision and its physical site/readout counts are identified.',
  'The current allocation has been checked only against the rules supported for that revision.',
  'The current synthetic fault and address have been identified without changing the selection.',
  'The virtual fixture has compared expected and returned words under the selected fault.',
  'The digital identity result, missing and mismatched counts, and native exports are ready.'
],[
  st('Probe revision and geometry reference', '10-13', handoff, 'none',
    'Identify the currently selected probe before reading either site counts or simultaneous channel capacity.',
    [['Model selector','Use the current 1.0, 2.0, Ultra, NHP, Quad Base, NXT or Opto configuration'],['Physical connection','None']],
    'Neuropixels Central and the version-specific papers identify each architecture. The equipment entry is a 1.0/2.0 reference, not connected hardware or a source of unpublished switch tables.'),
  st('Revision-specific allocation validator', '01-05', inspection, 'none',
    'Apply the authored site or count checks. Visible layout evidence and a within-bounds-only result are not equivalent.',
    [['Input','Current bank, site/window, or per-shank count'],['Limit','Quad Base uses four independent groups; NXT count checks do not certify site routing']],
    'Jun, Steinmetz, Ye, imec and published SpikeGLX references support distinct limits. The lab does not validate vendor-ready electrical addresses across all revisions.'),
  st('Virtual fault selector', '01-05', test, 'none',
    'Read the active fault and its physical or virtual address. Do not switch inputs or assume all output IDs represent hardware ADCs.',
    [['Fault family','Site, output lane, shank, swapped tags or common link'],['Address rule','A site fault needs exposed physical site IDs']],
    'This is an authored digital fixture. The fault types model identity and missing-data logic, not a predicted cause or severity of a hardware failure.'),
  st('Digital identity loopback', '01-05', test, 'none',
    'Run the existing loopback on the selected inputs and compare returned words; a swapped pair can preserve the packet count.',
    [['Specimen','The existing selection and fault only'],['Signals','18-bit synthetic identity tags']],
    'Authored check on the model. No biological recording, hardware bus programming, or claim of physically acquired voltage.'),
  st('Synthetic output and export verification', '01-05', inspection, 'none',
    'Distinguish correct, missing and mismatched digital words; export the actual result from this run.',
    [['Results','Expected, received, missing, wrong tag'],['Native export','CSV tags or JSON run record']],
    'Synthetic provenance is retained in the export. A fixture slot is not an IMRO or calibrated per-electrode measurement.')
]);

// Use the form on each side of each checkpoint, not guesses from layer names.
const wafer = (name,sizeMm) => ({name,shape:'wafer',sizeMm});
const die = (name) => ({name,shape:'die'});
const assembly = (name) => ({name,shape:'assembly'});
const virtual = (name) => ({name,shape:'none'});
const carry = (steps,boundaries) => {
  if (boundaries.length !== steps.length + 1) throw new Error('Specimen sequence does not match native stage count');
  for (const [i,step] of steps.entries()) {
    const a = boundaries[i], b = boundaries[i+1];
    step.specimen = a.name;
    step.afterSpecimen = b.name;
    if (a.shape) step.workpieceShape = a.shape;
    if (b.shape) step.outgoingShape = b.shape;
    if (Number.isFinite(a.sizeMm)) step.sizeMm = a.sizeMm;
  }
};

const npWafer = (name) => wafer(name,200);
carry(np1,[
  npWafer('Modeled 200 mm SOI blank; no field committed yet'),
  npWafer('Selected reticle field on the modeled 200 mm SOI wafer'),
  npWafer('Same field on SOI with the printed isolation witness'),
  npWafer('Same field on SOI with virtual isolation trenches'),
  npWafer('Same field on SOI with modeled filled trenches and field overburden'),
  npWafer('Same field on SOI with its planarized isolation witness'),
  npWafer('Same field on SOI with the gate image witness'),
  npWafer('Same field on SOI with the modeled transistor regions'),
  npWafer('Same selected field on the reference CMOS wafer'),
  npWafer('Selected wafer field carrying the stress-compensation witness'),
  npWafer('Selected wafer field carrying the printed electrode windows'),
  npWafer('Selected wafer field with modeled via access'),
  npWafer('Selected wafer field with modeled TiN recording sites'),
  npWafer('Selected wafer field with contact protection and bond openings'),
  npWafer('Selected wafer field with frontside edge trenches'),
  npWafer('Same wafer with virtual support and backside thickness map'),
  npWafer('Same wafer with the shank outline released in the model, before die separation'),
  npWafer('Same wafer with its selected die and virtual probe-sort record'),
  assembly('Selected singulated die on a modeled flex/headstage interface'),
  assembly('Attached modeled probe with its committed address bank'),
  assembly('Same virtual probe assembly with its synthetic traces and native archive'),
]);

const uclaWafer = (name) => wafer(name,150);
carry(ucla,[
  uclaWafer('Modeled 150 mm SOI wafer and the 2017 reticle artwork'),
  uclaWafer('Selected 64D field on the 150 mm SOI wafer'),
  uclaWafer('Same wafer field with lower SiNₓ insulation'),
  uclaWafer('Same wafer field with the blanket Ti/Au/Ti stack'),
  uclaWafer('Same wafer field with patterned sites, traces and bond pads'),
  uclaWafer('Same wafer field with upper SiNₓ insulation'),
  uclaWafer('Same wafer field with the printed tip and pad opening mask'),
  uclaWafer('Same wafer field with patterned tip and pad openings'),
  uclaWafer('Same wafer field with the silicon outline defined through the device layer'),
  uclaWafer('Same 150 mm device wafer on temporary front-side support; carrier size unspecified'),
  uclaWafer('Same supported device wafer with handle removed to the BOX stop in the model'),
  uclaWafer('Same device wafer with BOX cleared, still on the temporary carrier'),
  die('Released and optically screened 64D silicon probe die from the same field'),
  assembly('Same 64D die on its source-backed PCB; not yet wire-bonded'),
  assembly('Same 64D die and PCB with virtual wire bonds and connector pin map'),
  assembly('Same bonded 64D board assembly with a modeled protective encapsulant'),
  assembly('Same 64D board assembly with an exposed-site gold-treatment witness'),
  assembly('Same 64D board assembly with the 64-path QC record'),
  assembly('Same 64D board assembly with the synthetic bench file and control'),
]);

carry(utah,[
  die('Archived square Utah teaching blank'),
  die('Same square workpiece with committed rear relief'),
  die('Same square workpiece with virtual flush glass retained in rear relief'),
  die('Same square workpiece, now with front posts and unchanged rear fill'),
  die('Same square workpiece with rounded post profiles and unchanged lower materials'),
  die('Same labeled Utah geometry with symbolic associations; no physical leads'),
]);

carry(slant,[
  die('One selected boundary on the uncut teaching coupon'),
  die('Same uncut coupon and reference datum'),
  die('Same coupon section with its modeled rear opening'),
  die('Same coupon section with virtual glass in the rear opening'),
  die('Same coupon section with opposing front cut and rear dielectric'),
  die('Same coupon section with its signed overlap and retained-glass record'),
  die('Same coupon section with optional synthetic continuity and export'),
]);

carry(routing,[
  virtual('Selected probe and settings; no physical specimen'),
  virtual('Existing revision and its visible site/readout counts'),
  virtual('Existing selection with its revision-specific allocation verdict'),
  virtual('Same selection with the current virtual fault address'),
  virtual('Same selection with its synthetic loopback trace'),
  virtual('Same selection with the digital identity record; no connected hardware'),
]);

// Surface witnesses are localized, not an invented full-die stack or mask set.
// State is remembered independently on each physical face. Looking at the back
// must not turn an intact front pattern into a freshly deposited backside film.
function surfaces(steps,base,changes) {
  const seen={front:['blank','silicon'],back:['blank','silicon']};
  for(const [i,step] of steps.entries()){
    const {face='front',feature,material,...props}=changes[i]||{};
    const [beforeFeature,beforeMaterial]=seen[face];
    const afterFeature=feature??beforeFeature, afterMaterial=material??beforeMaterial;
    step.processFace=face;
    step.surfaceFeatures={...base,...props,beforeFeature,beforeMaterial,afterFeature,afterMaterial};
    seen[face]=[afterFeature,afterMaterial];
  }
}
const witness=(feature,material,face='front')=>({feature,material,face});
const back={face:'back'};
// Reuse the native Masmanidis lab's flattened 2017 reticle witness instead
// of guessing a probe silhouette. Coordinates are in µm in its local X/Z frame;
// site order is CH1…64, not sorted by position. 64 opening centers match the
// MATLAB design, while calling this the short-shaft family remains an inference.
// Source SHA256 6280f2dab658c92e365e71d5bc9341f1b327fbdbd8b4d559208b42638ec653cf.
// Retain one shared artwork object across every station, not a per-frame copy.
const mask64D=artwork64D;
surfaces(ucla,{stack:'soi',substrate:'silicon',deviceLayerUm:21,...mask64D},{
  1:witness('insulating-film','nitride'),  // Bottom dielectric, before any routing metal.
  2:witness('blanket-film','metal'),      // Outer surface is Ti, not exposed Au.
  3:witness('metal-traces','metal'),      // Subtractive Ti/Au/Ti transfer, not lift-off.
  4:witness('insulating-film','nitride'), // Conductor is covered, windows not yet opened.
  5:witness('resist-image','resist'),
  6:witness('openings','nitride'),        // Open only upper nitride over sites and pads.
  7:witness('front-trenches','silicon'),  // Etch device Si to BOX; not a free-standing die.
  8:back,                                 // Face-down temporary support exposes the back.
  9:witness('back-trenches','silicon','back'),
  10:witness('box-clear','oxide','back'),
  // Screen the released probe on its front again. The mount was dissolved at a
  // separate boundary; the inspection microscope did not clear BOX or debond it.
  11:witness('openings','nitride'),
  14:witness('insulating-film','polymer'), // Local epoxy at wire bonds, not a site blanket.
  15:witness('site-faces','gold'),         // Selected exposed sites, not the cured epoxy.
});
for(const [i,s] of ucla.entries())s.surfaceFeatures.reticleStage64D=i;
ucla[11].inspectionChangesShape=true; // Source combines separate release + optical screen.
ucla[11].surfaceFeatures.outgoingProfile='shank';
ucla[11].surfaceFeatures.outgoingSizeMm=6.989287; // Tip to opposite die edge.
ucla[12].surfaceFeatures.profile='shank';
for(const [i,region] of [[13,'Bond pads to PCB'],[14,'Bond wire region only'],[15,'Recording faces only']])
  ucla[i].surfaceFeatures.region=region;
Object.assign(ucla[15].surfaceFeatures,{beforeFeature:'site-faces',beforeMaterial:'metal'});
// A placed die on this PCB has no electrical bond wires. The source's epoxy
// die attach, subsequent wire bonds, bond-region encapsulant, and separate
// electrode-surface gold treatment are ordered and shown independently.
const board64=(attached,bonded=false,encapsulated=false,plated=false)=>({attached,bonded,encapsulated,plated});
const stages64=[board64(false),board64(true),board64(true,true),
  board64(true,true,true),board64(true,true,true,true)];
for(let i=12;i<ucla.length;i++)Object.assign(ucla[i].surfaceFeatures,{
  assemblyType:'pcb',assemblyBefore:stages64[Math.min(i-12,4)],assemblyAfter:stages64[Math.min(i-11,4)],
});
// The source specifies the device wafer but not the mounted carrier's size,
// retention or chuck. A bare 150 mm wafer fit cannot qualify the mounted stack.
for(const i of [8,9,10,11]){
  ucla[i].allowModelMotion=false;
  Object.assign(ucla[i].surfaceFeatures,{carrierBefore:i!==8,carrierAfter:i!==11});
}
// Same nominal 1.0 shank and four-column stagger as the standalone native
// foundry viewer. The outline of the 175 µm tip and first center at 209 µm
// are authored witness choices, not proprietary reticle coordinates. Keep
// these separate from the engineering-package viewer's different origin.
const nativeShankNP1={
  outlineUm:[[35,0],[70,175],[70,10000],[0,10000],[0,175]],
  sitesUm:Array.from({length:960},(_,id)=>{
    const row=Math.floor(id/2);
    return [(row%2?11:27)+32*(id%2),209+20*row];
  }),
  siteOpeningUm:[12,12],shankThicknessUm:24, // Final shank, not undisclosed starting SOI device-layer thickness.
};
surfaces(np1,{stack:'soi',substrate:'silicon',...nativeShankNP1},{
  1:witness('resist-image','resist'), 2:witness('front-trenches','silicon'),
  3:witness('filled-trenches','dielectric'), 4:witness('filled-trenches','dielectric'),
  5:witness('resist-image','resist'),
  // 7 is an external finished-CMOS handoff. No deposition run is staged here.
  7:witness('metal-traces','metal'),
  8:witness('insulating-film','dielectric'), // Stress film composition undisclosed.
  9:witness('resist-image','resist'), 10:witness('openings','dielectric'),
  11:witness('site-faces','tin'), 12:witness('openings','dielectric'),
  13:witness('front-trenches','silicon'), 14:back, 15:witness('back-trenches','silicon','back'),
});
Object.assign(np1[6].surfaceFeatures,{beforeFeature:'blank',afterFeature:'blank',region:'Normalized transistor witness, no resist anneal shown'});
for(const i of [14,15]) np1[i].allowModelMotion=false; // Support/chuck not established.
for(const step of np1.slice(17))step.surfaceFeatures.assemblyType='flex-headstage';
surfaces(utah,{stack:'bulk',substrate:'silicon',profile:'utah-square'},{
  0:witness('back-trenches','silicon','back'),
  1:witness('glass-filled-trenches','glass','back'),
  2:witness('front-trenches','silicon'),
});
surfaces(slant,{stack:'bulk',substrate:'silicon',profile:'utah-square'},{
  0:back, 1:witness('back-trenches','silicon','back'),
  2:witness('glass-filled-trenches','glass','back'), 3:witness('front-trenches','silicon'),
});
// D01 explicitly defines its square frame as 4,200 µm. This is the archived
// teaching blank's width, not a vendor Utah-die dimension. Slant's 3,600 µm
// center span is not a coupon width; it deliberately does not inherit this size.
for(const [i,step] of utah.entries()){step.sizeMm=4.2;step.surfaceFeatures.utahStage=i;}
// A geometry comparator or a reference fixture does not imply a qualified saw.
for(const step of [...utah,...slant])step.allowModelMotion=false;

export default {
  'utah-array-fabrication': utah,
  'neuropixels-foundry': np1,
  'masmanidis-64d-foundry': ucla,
  'neuropixels-family': routing,
  'utah-slant-compare': slant
};
