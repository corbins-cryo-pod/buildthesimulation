#!/usr/bin/env python3
"""Build a dependency-free HTML bench from an explicit foundry equipment dictionary."""
from pathlib import Path
import argparse, hashlib, json, re
here=Path(__file__).resolve().parent
def compact(v):return json.dumps(v,separators=(',',':'),ensure_ascii=False).replace('<','\\u003c').replace('&','\\u0026')
def build(source,out):
 raw=Path(source).read_bytes();d=json.loads(raw);records=d['records']
 ids=[r['id'] for r in records]
 assert len(ids)==len(set(ids)) and all(re.fullmatch(r'\d\d-\d\d',i) for i in ids)
 keys=['id','name','model','zone','zoneId','operations','realization','simulationScope','limits','url','simulatorUrl','sources']
 rs=[{k:r[k] for k in keys} for r in records]
 used={'NIST-GEN4','HEIDELBERG-MLA','MCR-COBRA-SI','UCSB-COBRA-III-V','GAMRY-600','AGGIE-EVG','EVG-501'}
 assert all(k in d['sources'] for k in used)
 for r in rs:assert all(o in d['operations'] for o in r['operations']) and all(s in d['sources'] for s in r['sources'])
 data={'snapshot':{k:d['snapshot'][k] for k in ['repo','commit','checked']},'dictionarySha256':hashlib.sha256(raw).hexdigest(),'sources':{k:{s:d['sources'][k][s] for s in ['title','url']} for k in sorted(used)},'records':rs,'operations':{k:v['label'] for k,v in d['operations'].items()}}
 template=(here/'page.html').read_text();parts={'@@DATA@@':compact(data),'@@ENGINE@@':(here/'engine.cjs').read_text(),'@@UI@@':(here/'ui.js').read_text(),'@@PLAY@@':(here.parent/'bench-play.js').read_text(),'@@STYLE@@':(here/'style.css').read_text()}
 for k,v in parts.items():
  assert template.count(k)==1;template=template.replace(k,v)
 Path(out).parent.mkdir(parents=True,exist_ok=True);Path(out).write_text(template);print(f'{len(rs)} equipment records · {Path(out).stat().st_size} bytes · equipment SHA-256 {data["dictionarySha256"]}')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('equipment',nargs='?',type=Path,default=here.parents[3]/'src/data/foundry-atlas/lanes/equipment.json');p.add_argument('output',nargs='?',type=Path,default=here/'index.html');args=p.parse_args();build(args.equipment,args.output)
