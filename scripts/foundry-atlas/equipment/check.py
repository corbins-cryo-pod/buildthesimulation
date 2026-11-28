#!/usr/bin/env python3
"""Fail closed on missing IDs, sources, train/recipe conflation or a stale input."""
import hashlib, json, re, sys, tempfile, subprocess
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse
h=Path(__file__).resolve().parent
src=Path(sys.argv[1]) if len(sys.argv)>1 else h.parent/'equipment-source'
out=Path(sys.argv[2]) if len(sys.argv)>2 else h.parents[1]/'lanes'/'equipment.json'
d=json.loads(out.read_bytes())
rs=d['records']; lookup={r['id']:r for r in rs}
assert list(lookup)==sorted({r['id'] for r in rs}) and len(rs)==len(lookup)==199
assert len(d['snapshot']['hashes'])==18
for k,v in d['snapshot']['hashes'].items(): assert hashlib.sha256((src/k).read_bytes()).hexdigest()==v
original=[r for p in sorted((src/'zones').glob('*.json')) for r in json.loads(p.read_bytes())]
assert {r['id'] for r in original}==set(lookup)
assert len(d['zones'])==16
for r in original:
    q = lookup[r['id']];assert q['name']==r['name'] and q['model']==r['model'] and q['evidenceGrade']==r['evidence']
    assert q['simulatorUrl']==r['simulator']
    assert q['url']==f"/simulations/equipment/{r['id']}/" and q['simulatorUrl'].startswith(q['url'])
    assert q['limits'] and q['simulationScope'] != 'Built' and q['realization'] in d['statusDefinitions']
    assert q['evidenceGrade'] in d['evidenceGrades']
    assert q['zoneId']==r['id'][:2]
    assert q['operations'] and set(q['operations'])<=d['operations'].keys()
    assert set(r['sources'])<=set(q['sources'])<=d['sources'].keys()
    assert re.fullmatch('[0-9]{2}-[0-9]{2}',r['id'])
assert all(re.fullmatch('[a-z][a-z0-9-]*',op) and v['witness'] and v['label'] for op,v in d['operations'].items())
for g in d['gaps']:assert g['description'] and set(g['nearbyEquipmentNotEquivalent'])<=set(lookup)
for s in d['sources'].values():
    p=urlparse(s['url']);assert p.scheme in {'https','http'} and p.netloc and s['title']
assert Counter(r['realizationCode'] for r in rs)=={'M':83,'I':55,'E':52,'S':9}
assert all(lookup[i]['realizationCode'] in ('I','E') for i in ('03-01','03-02','03-05','03-06','03-07','03-08','04-07','04-12','08-08','11-05','16-05'))
assert 'drie' in lookup['04-03']['operations'] and lookup['04-03']['realizationCode']=='M'
assert 'echem' in lookup['09-01']['operations'] and 'plating' not in d['operations']
assert '1.2' in lookup['02-03']['limits'][0] and 'Mode II' in lookup['02-03']['limits'][0]
with tempfile.TemporaryDirectory() as tmp:
    second=Path(tmp)/'equipment.json'
    subprocess.run([sys.executable,str(h/'build.py'),str(src),str(second)],check=True,capture_output=True)
    assert second.read_bytes()==out.read_bytes()
print('PASS: 199 stable IDs; 199 names, models and simulator URLs match source; 199 unique curated coverage decisions; 18 upstream file hashes; exact source, operation and zone joins; 12 explicit gaps; dry-only and Mode II fixtures; byte-identical regeneration.')
