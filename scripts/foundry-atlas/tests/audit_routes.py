#!/usr/bin/env python3
"""Cross-lane foundry/branch regression checks, independent of route generators.
Accept a directory of lane JSONs or the assembled app data JSON. This checks accuracy
of representative route bindings, not end-to-end empirical manufacturing validation.
"""
from pathlib import Path
import sys,json
p=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parents[3]/'src/data/foundry-atlas/lanes'
if p.is_dir(): ps=[q for f in sorted(p.glob('*.json')) for q in json.loads(f.read_text()).get('profiles',[])]
else:ps=json.loads(p.read_text())['profiles']
idx={q['id']:q for q in ps}
def step(prof,term):
 v=[s for s in idx[prof]['steps'] if term.lower() in s['title'].lower()]
 assert len(v)==1,(prof,term,'matched',len(v))
 return v[0]
def allow(prof,term,variant):
 s=step(prof,term)
 return not s.get('only') or variant in s['only']
def ids(prof,title):
 return set(step(prof,title)['tools'])
checks=[
('MOTE separation: DRIE, not blade saw',lambda: '04-03' in ids('mote-pvled-cmos','Encapsulate and separate') and '04-07' not in ids('mote-pvled-cmos','Encapsulate and separate')),
('SCOPe: metal evaporation plus optical lithography, not an electron-beam litho writer',lambda: {'03-01','02-01'}<=ids('scope-lensless-spad','Pattern optics') and '02-05' not in ids('scope-lensless-spad','Pattern optics')),
('Dong cuff: passive parylene and e-beam Ti/Au rather than sputtering',lambda: {'03-08','03-01'}<=ids('dong-soft-cuff','Represent active') and '03-03' not in ids('dong-soft-cuff','Represent active')),
('Tolstosheeva: a retained rigid Si interposer, not replacement PCB manufacture',lambda:'04-03' in ids('tolstosheeva-flex-rigid','rigid interface') and '08-11' not in ids('tolstosheeva-flex-rigid','rigid interface')),
('BISC: die-first step does not run on a wafer branch',lambda: not allow('si-bisc','Coupon path:','wafer')),
('BISC: wafer-first step does not run on a die branch',lambda: not allow('si-bisc','Wafer path:','coupon')),
('BISC: full-wafer exposure cannot be silently routed to 150 mm 02-01',lambda: step('si-bisc','Full-wafer front photolithography')['status']=='external' and '02-01' not in ids('si-bisc','Full-wafer front photolithography')),
('Retina: predecessor diode fabrication does not apply to commercial PRIMA',lambda: not allow('systems-photovoltaic','Define and isolate diode islands','prima')),
('Retina: bought PRIMA die does not apply to Wang research flow',lambda: not allow('systems-photovoltaic','Receive the PRIMA','wang')),
('Mesh: four-mask metal route does not imply fabrication of the nanowire alternative',lambda: not allow('flex-mesh-four-mask','Define the electrode level','nanowire')),
('Mesh: external nanowire flow does not run on the metal branch',lambda: not allow('flex-mesh-four-mask','Transfer to a semiconductor branch','metal')),
('PtNRs: branch preserves alloy/dealloying, not electroplating',lambda: '03-03' in ids('flex-ptnr','Locate alloy') and '04-06' in ids('flex-ptnr','Release before final dealloying') and '09-01' not in ids('flex-ptnr','Locate alloy')),
('Off-the-shelf LED does not require epitaxial donor processing',lambda: not allow('transfer-microled-foil','Start with','coupon')),
('Wired strip does not acquire the RF power/rectifier dependency',lambda: not allow('transfer-microled-foil','Join the RF','strip-wired')),
('Neuropixels 1.0 procedure declares 100 and 150 mm witness constraint',lambda: all(x in ' '.join(s['detail'] for s in idx['si-np1']['steps']) for x in ('100 mm','150 mm','200 mm')))]
failed=[]
for title,fn in checks:
 try: v=fn()
 except (AssertionError,KeyError,IndexError) as e:v=False;print('  DETAIL',str(e))
 print(('PASS' if v else 'FAIL'),title)
 if not v:failed.append(title)
if failed:sys.exit(1)
