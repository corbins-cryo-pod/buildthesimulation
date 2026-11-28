#!/usr/bin/env python3
"""Assemble the curated foundry capability dictionary from a pinned equipment register.
Use: python build.py [REGISTER_DIR] [OUTPUT_JSON]. No network or external modules needed.
"""
from pathlib import Path
import hashlib, json, re, sys
from collections import Counter
from urllib.parse import urlsplit
here=Path(__file__).resolve().parent
register=Path(sys.argv[1]) if len(sys.argv)>1 else here.parent/'equipment-source'
out=Path(sys.argv[2]) if len(sys.argv)>2 else here.parents[1]/'lanes'/'equipment.json'
sha='83724fcb47c3d6ea6265ad3d09f8fa6157e322f3'
base='/simulations/equipment/'
def load(p): return json.loads(p.read_bytes())
def rows(path):
    return [[i.strip() for i in ln.split('|')] for ln in path.read_text().splitlines() if ln.strip()]
def file_sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def check(b,msg):
    if not b: raise ValueError(msg)
ops={}
for key,role,label,gate in rows(here/'operations.tsv'):
    check(key not in ops,key);ops[key]={'role':role,'label':label,'witness':gate}
rzn={'M':'Bounded teaching model','I':'Inspection or replay only','E':'Exhibit only','S':'Support or custody only'}
rzdefs={'M':'At least one task-related numerical, geometric or logical transformation is modeled. The record specifies exactly which, including cases limited to eligibility or dry placement. No production recipe, measured output, calibration or operating machine is implied.','I':'A relevant fixed map, dry geometry or recorded signal can be inspected; the nominal physical operation is not simulated.','E':'Documentary exterior, detached graphic or unrelated calibration cue. No executable foundry operation or instrument measurement.','S':'Tracks files, fixture placement, virtual services or specimen identity. It can support a route but does not make or qualify the device.'}
bindings={}
for key,st,k,lim in rows(here/'bindings.tsv'):
    check(key not in bindings and st in rzn,(key,st)); oo=k.split(',')
    check(set(oo) <= ops.keys(),f'{key}: bad op')
    bindings[key]=(st,oo,lim)
primarychecks={
'NIST-GEN4':('NIST NanoFab: SUSS MA/BA6 Gen4 mask aligner','https://www.nist.gov/laboratories/tools-instruments/nanofab-tool-suss-microtec-maba6-gen4-mask-aligner','The named installation reports front/backside alignment, 1 µm print resolution and pieces through 150 mm wafers. This is a facility configuration, not a universal or virtual-process assurance.'),
'HEIDELBERG-MLA':('Heidelberg Instruments: MLA 150, Technical Data by write mode','https://heidelberg-instruments.com/product/mla150/','The modes have different feature and line/space limits; only one mode can be installed. Mode II lists 1 µm minimum feature and 1.2 µm minimum lines/spaces.'),
'UTAH-PDS2010':('University of Utah Nanofab: PDS 2010 Parylene Coater, SOP scope','https://www.nanofab.utah.edu/wp-content/uploads/2022/11/Parylene-Deposition-SOP.pdf','Section 1 identifies the SCS PDS 2010 at that facility as a parylene deposition instrument. It does not establish the capabilities of the virtual dry-offset exercise.'),
'MCR-COBRA-SI':('University of Manchester: PlasmaPro 100 Cobra 300 installation','https://research.manchester.ac.uk/en/equipments/oxford-instruments-plasmapro-100-cobra-300-reactive-ion-etcher-ri-2/','A named installation specializes in silicon etching. Comparison to the UCSB configuration shows why chamber hardware and supported materials matter.'),
'UCSB-COBRA-III-V':('UC Santa Barbara Nanofab: Oxford ICP Etcher, tool description','https://wiki.nanofab.ucsb.edu/wiki/Oxford_ICP_Etcher_%28PlasmaPro_100_Cobra%29','Same tool family, a different installation intended for III–V epitaxies and ALE. This is counterevidence to freely substituting family-name matches.'),
'EVG-501':('EV Group: EVG501 permanent wafer bonding system','https://www.evgroup.com/products/bonding/permanent-bonding-systems/evg501','Manufacturer describes supported bonding families and chuck/alignment options; this is no guarantee of an installed fixture, alignment program or sealed part.'),
'AGGIE-EVG':('Texas A&M AggieFab: installed EVG 501 and companion aligner','https://aggiefab.tamu.edu/equipment/evg-501-wafer-bonder/','The facility describes alignment with a compatible separate EVG 610. Do not mark arbitrary aligner-to-bonder handoffs verified.'),
'GAMRY-600':('Gamry Instruments: Reference 600+ legacy device','https://www.gamry.com/support-2/legacy-devices/reference-600plus-legacy','The model supports electrochemical impedance spectroscopy. The Atlas notes a passive virtual circuit, not verified electrode material, plated microstructure or biological performance.')
}
used_checks={'02-01':['NIST-GEN4'],'02-03':['HEIDELBERG-MLA'],'03-08':['UTAH-PDS2010'],'04-03':['MCR-COBRA-SI','UCSB-COBRA-III-V'],'04-12':['EVG-501','AGGIE-EVG'],'09-01':['GAMRY-600']}
builtfix={
'01-05':'Synthetic event timing and labeled-event summaries; no new acquisition or spike sorting.',
'03-02':'Read-only comparison of fixed mirror-coupon and blank maps; no evaporation model.',
'16-11':'Dry 100 mm wafer transfer and undersized-carrier rejection; specimen ID and orientation preserved.',
'16-14':'Boolean seating and removal of blind fixture markers on two independent paths; no physical service network.'}
sources=load(register/'sources.json')
for k,v in sources.items():v['origin']='Register citation; may refer to a facility or product family rather than the exact tool.'
for i,(title,url,note) in primarychecks.items(): sources[i]={'title':title,'url':url,'note':note,'origin':'Primary source directly checked for this atlas.'}
zones=load(register/'zones.json');zname={z['id']:z['name'] for z in zones}
rs=sum([load(f) for f in sorted((register/'zones').glob('*.json'))],[])
check(len(rs)==len(bindings)==199 and {r['id'] for r in rs}==set(bindings),'Register ID drift: reconcile the curated bindings.')
recs=[]
for r in sorted(rs,key=lambda r:r['id']):
    i=r['id']; st,opt,lim=bindings[i]; z=i[:2]; record_url=base+i+'/'
    src=list(r['sources'])
    for j,(name,u) in enumerate(r.get('related',[])):
        if u.startswith('https://'):
            ref=i+'-ref-'+str(j+1)
            sources[ref]={'title':name,'url':u,'origin':'External related link in the equipment register; see original for scope.'}
            src.append(ref)
    src+=used_checks.get(i,[])
    check(set(src)<=set(sources),f'{i} missing source(s)')
    roles=list(dict.fromkeys(ops[x]['role'] for x in opt))
    recs.append(dict(id=i,name=r['name'],model=r['model'],zoneId=z,zone=zname[z],url=record_url,simulatorUrl=r['simulator'],evidenceGrade=r['evidence'],roles=roles,operations=opt,realization=rzn[st],realizationCode=st,simulationScope=builtfix.get(i,r['simulationStatus']),limits=[lim],sources=src))
gaps=[
('cmos-supply','CMOS and ASIC front end','No device-specific CMOS PDK, released masks, characterized standard cells, transistor fab line, proprietary test program or MPW allocation follows from the register. Treat an incoming processed wafer or known-good die as an external dependency; model post-CMOS work separately.',['01-01','02-03','02-06','09-02']),
('wafer-supply','Starting wafers and material certificates','Silicon, SOI, glass, foil, specialty semiconductor, prepared carriers and measured incoming layer stacks are input lots. The catalog does not grow single-crystal substrates or certify incoming material.',['16-11','05-04']),
('specialty-growth','Specialized growth, doping and oxidation','No dedicated crystal growth, III–V epitaxy, qualified ion implantation, custom dopant profile or foundry-specific thermal oxidation line is verified. ALD, PECVD, etch, and furnace listings do not imply these operations.',['03-05','03-07','03-09','03-11','04-02']),
('functional-film','Device-specific coatings, contacts and plating','A noble-metal target, electroplating/electropolymerization cell, qualified porous electrode, adhesion stack, catalyst or nanopattern may be unlisted. Use a sourced external module when the material and witness lack evidence. An EIS instrument does not document a deposited electrode.',['03-01','03-03','09-01','09-12']),
('package','Precision housings, feedthroughs and seal qualification','Machined titanium shells, glass/ceramic-to-metal feedthroughs, brazing/metallization, getters and qualified joining may be supplier items. Geometric fit, conformal polymer, leak replay and a real hermetic joint are different claims.',['04-11','04-12','08-08','08-09','08-10']),
('wire-mechanics','Drawn filaments, braid, stents and precision forming','Implant wire drawing/insulation, braiding, nitinol tube laser processing and shape-setting, laser-cut stiffeners, micromolding and validated fixture tolerances are not established by a generic bonder, enclosed laser or oven.',['04-10','06-05','06-06','08-01','03-09']),
('interconnect','Multilayer boards, flex, connectors and hybrid assemblies','The PCB example is a single-layer geometry check. Through plating, laser microvias, multilayer rigid-flex lamination, ACF, custom connector pins and tested feedthrough assemblies may need a supplier or a separate qualified line.',['08-02','08-04','08-11','16-13']),
('photonic-supply','Emitters, waveguides and optical fibers','A UV writer and optical bench do not grow LED/laser epitaxy, draw a fiber, make an electro-optic material, package an optical die or establish waveguide propagation loss. Require tested incoming parts and a calibrated wavelength-specific fixture.',['02-03','08-05','11-02','11-05','11-10']),
('active-system','Power, telemetry and finished electronics','Battery cells, ICs, custom analog front ends, rectifiers, telemetry firmware, programming and EMI/EMC qualification are not fabricated by virtual signal, power or network-analyzer stations.',['08-11','08-12','09-08','09-09','16-02']),
('facility','Configuration, cleanliness and process matching','Equipment family is not installation evidence. Match substrate/wafer diameter, fixture, process temperature, compatible materials and contamination segregation; track accepted incoming and outgoing revisions and local calibration.',['02-01','02-03','03-03','04-03','16-04','16-11']),
('qualification','Independent acceptance and quality','The register documents virtual instruments and witnesses, not hardware ownership, a reserved facility, cleanroom certification, traceable test results, sterility, lifetime, reliability or approval for human use. Stop at simulated or bench acceptance.',['08-09','14-10','14-11','16-05']),
('inert-only','Living or clinical components','For biohybrid or regenerative catalog concepts, consider only passive scaffolds, fixtures, material identification and electrical bench checks. Do not force living components, surgical deployment or clinical testing through the process graph.',['06-01','06-10','09-01','10-14'])]
for i,label,note,nearby in gaps:check(set(nearby)<=set(bindings),i)
source_files=[register/'zones.json',register/'sources.json',*sorted((register/'zones').glob('*.json'))]
d=dict(schemaVersion='1.0',snapshot=dict(repo='corbins-cryo-pod/buildthesimulation',commit=sha,path='src/data/equipment/',checked='2026-11-28',hashes={str(p.relative_to(register)):file_sha(p) for p in source_files}),scope='Virtual-equipment crosswalk. An operation name describes a physical tool family that could be considered; the separate realization field says what the existing simulator does. A possible tool match is not a compatible process, actual possession, production qualification, functional handoff or medical validation. The source, process stack, equipment configuration, incoming state and witness must all be checked.',statusDefinitions={rzn[k]:v for k,v in rzdefs.items()},evidenceGrades={'A':'Specific documentation identified in the register; not measured process validation.','B':'Product family or research installation identified; a specific configuration can still be open.','C':'Custom or provisional candidate; no exact manufacturer configuration should be inferred.'},operations=ops,gaps=[dict(id=i,title=label,description=note,nearbyEquipmentNotEquivalent=n) for i,label,note,n in gaps],zones=zones,sources=sources,records=recs)
out.parent.mkdir(parents=True,exist_ok=True); tmp=out.with_suffix('.in-progress');tmp.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');tmp.replace(out)
print(len(recs),len(ops),len(zones),len(gaps),len(sources));print(dict(Counter(x['realization'] for x in recs)))
