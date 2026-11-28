#!/usr/bin/env python3
"""Build a snapshot from site catalog Markdown, equipment register and reviewed lane JSON."""
import argparse
import collections
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlsplit
import yaml

STATUS = {'documented','partial','reference','proprietary','out-of-scope'}
STEP_STATUS = {'documented','reference','external'}
VARIANT_STATUS = STEP_STATUS | {'incompatible'}
# Combined display status chooses the strongest evidence applicable to at least one route.
ORDER = ['documented','partial','reference','proprietary','out-of-scope','queued']
FAMILIES = dict(intracortical='Intracortical',ecog='Cortical surface',pni='Peripheral nerve',scs='Spinal',dbs='Deep brain',cochlear='Cochlear',endovascular='Endovascular',retinal='Retinal',sensing='Sensing',brainstem='Brainstem',other='Other')

def read(p):
    return json.loads(p.read_text())

def need(ok, msg):
    if not ok: raise ValueError(msg)

def external(u):
    return isinstance(u,str) and urlsplit(u).scheme == 'https' and bool(urlsplit(u).netloc)

def asserttext(v, what):
    need(isinstance(v,str) and bool(v.strip()), f'Missing {what}')

def strings(v, what):
    need(isinstance(v,list), f'Expected list, {what}')
    for a in v: asserttext(a,what)

def unique(rows, key, what):
    vals=[r[key] for r in rows]
    need(len(set(vals))==len(vals),f'Duplicate {what}: {[k for k,n in collections.Counter(vals).items() if n>1]}')

def catalog(repo):
    devices=[]
    for file in sorted((repo/'src/content/designs').iterdir()):
        if file.suffix not in ('.md','.mdx'): continue
        d=yaml.safe_load(file.read_text().split('---',2)[1])
        if d.get('draft'): continue
        devices.append(dict(slug=file.stem,title=re.sub(r'^\d+\s*[-—]\s*','',d['title']),code=d.get('device_id',''),family=FAMILIES[d['interface_class']],url=f'/devices/{file.stem}/',description=d.get('description',''),profileIds=[],status='queued',_order=d.get('order',9999)))
    unique(devices,'slug','catalog slug')
    return sorted(devices,key=lambda r:(r.pop('_order'),r['slug']))

def load_equipment(repo, files):
    base=repo/'src/data/equipment'
    zones={z['id']:z['name'] for z in read(base/'zones.json')}
    equipment={r['id']:dict(id=r['id'],name=f"{r['name']} · {r['model']}",url=f"/simulations/equipment/{r['id']}/",zone=zones[r['id'][:2]],capabilities=[r['purpose']],limitations=['Register model only. This entry does not establish equipment access or a qualified process.']) for f in sorted((base/'zones').glob('*.json')) for r in read(f)}
    p=files/'equipment.json'
    if p.exists():
        d=read(p)
        rec=d.get('records',[])
        if isinstance(rec,dict): rec=list(rec.values())
        unique(rec,'id','equipment lane ID')
        need({r['id'] for r in rec}==set(equipment),'Equipment lane does not exactly match register IDs')
        op=d.get('operations',{})
        for r in rec:
            e=equipment[r['id']]
            caps=r.get('operations',[])
            limits=r.get('limits',[])
            status=r.get('realization','')
            labels=[(op.get(x,{}) or {}).get('label',x.replace('-',' ')) for x in caps]
            e['capabilities'] += labels
            if isinstance(status,str) and status: e['realization']=status
            if r.get('simulatorUrl') and r['simulatorUrl'].startswith('/simulations/'): e['simulatorUrl']=r['simulatorUrl']
            e['limitations'] += limits
    return equipment

def profiles_from(lanes):
    profiles=[]
    for p in sorted(lanes.glob('*.json')):
        if p.name=='equipment.json': continue
        d=read(p)
        rs=d.get('profiles') if isinstance(d,dict) else d
        need(isinstance(rs,list),f'{p.name}: invalid profiles')
        profiles+=rs
    unique(profiles,'id','profile ID')
    return profiles

def assemble(repo,lanes,revision,updated,source_revision=None):
    devices=catalog(repo)
    device_index={d['slug']:d for d in devices}
    equipment=load_equipment(repo,lanes)
    profiles=profiles_from(lanes)
    profile_keys={p['id']:p for p in profiles}
    lab_ledger=repo/'src/data/foundry-atlas/lab-releases.json'
    labs=read(lab_ledger) if lab_ledger.exists() else {}
    if labs:
        for key,entry in labs.items():
            path=entry['url']
            need(bool(re.fullmatch(r'/simulations/[a-z0-9-]+(?:/[a-z0-9-]+)*/',path)), f'{key}: bad lab url')
            artifact=repo/'public'/path.strip('/')/'index.html'
            need(artifact.exists() and hashlib.sha256(artifact.read_bytes()).hexdigest()==entry['sha256'], f'{key}: lab digest mismatch')
            for pid in entry['profiles']:
                need(pid in profile_keys, f'{key}: missing target profile {pid}')
                profile=profile_keys[pid]
                if not profile.get('lab'): profile['lab']=path
                elif profile['lab']!=path:
                    profile.setdefault('extraLabs',[]).append({'url':path,'title':entry.get('title',key)})
    for p in profiles:
        k=p['id']
        need(re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',k),f'Invalid profile ID {k}')
        for f in ('title','family','summary'): asserttext(p.get(f),f'{k}.{f}')
        need(p['evidence'] in STATUS,f'{k}: invalid evidence')
        strings(p['devices'],f'{k}.devices')
        need(len(set(p['devices']))==len(p['devices']),f'{k}: duplicate device slug')
        for slug in p['devices']:
            need(slug in device_index,f'{k}: nonpublic or unknown slug {slug}')
            device_index[slug]['profileIds'].append(k)
        strings(p['gaps'],f'{k}.gaps')
        need(p['gaps'],f'{k}: document open limitations')
        unique(p['sources'],'id',f'{k} sources')
        need(p['sources'] or p['evidence']=='out-of-scope',f'{k}: no primary sources')
        for s in p['sources']:
            for f in ('id','title','note'): asserttext(s.get(f),f'{k}.sources.{f}')
            need(external(s['url']),f'{k}: source URL must use HTTPS')
        source_ids={s['id'] for s in p['sources']}
        unique(p['variants'],'id',f'{k} variants')
        variant_ids={v['id'] for v in p['variants']}
        for v in p['variants']:
            for f in ('id','label','description'): asserttext(v.get(f),f'{k}.variants.{f}')
            need(v['status'] in VARIANT_STATUS,f'{k}: invalid variant status')
        need(p['steps'] or p['evidence'] in {'out-of-scope','proprietary'},f'{k}: missing steps')
        for s in p['steps']:
            for f in ('title','detail','check'): asserttext(s.get(f),f'{k}.steps.{f}')
            need(s['status'] in STEP_STATUS,f'{k}: invalid step status')
            strings(s['tools'],f'{k}.steps.tools')
            need(set(s['tools'])<=set(equipment),f'{k}: unknown equipment {set(s["tools"])-set(equipment)}')
            need(set(s.get('varies',[]))<=variant_ids,f'{k}: unknown step variant')
            need(set(s.get('only',[]))<=variant_ids,f'{k}: unknown step applicability')
            need(set(s.get('sourceIds',[]))<=source_ids,f'{k}: unknown step source')
        if p.get('lab'): need(p['lab'].startswith('/simulations/'),f'{k}: external lab')
    profile_index={p['id']:p for p in profiles}
    for d in devices:
        if d['profileIds']:
            d['profileIds'].sort(key=lambda k:(ORDER.index(profile_index[k]['evidence']),k))
            d['status']=profile_index[d['profileIds'][0]]['evidence']
    counts=collections.Counter(d['status'] for d in devices)
    return dict(meta=dict(revision=revision,updated=updated,sourceRevision=source_revision,toolFitUrl=labs.get('tool-fit',{}).get('url'),processHandoffUrl=labs.get('process-handoff',{}).get('url'),overview='A catalog-wide index of virtual and bench-reference process routes, documented branches, equipment matches and missing capabilities. A mapped register ID is not a physical tool reservation, a qualified recipe or proof that an entire device can be fabricated. Queued entries are listed explicitly.',counts={k:counts[k] for k in ORDER}),devices=devices,profiles=profiles,equipment=list(equipment.values()))

if __name__=='__main__':
    a=argparse.ArgumentParser()
    a.add_argument('--repo',type=Path,required=True)
    a.add_argument('--lanes',type=Path,required=True)
    a.add_argument('--revision',required=True)
    a.add_argument('--updated',required=True)
    a.add_argument('--source-revision')
    a.add_argument('--output',type=Path,required=True)
    n=a.parse_args()
    data=assemble(n.repo,n.lanes,n.revision,n.updated,n.source_revision)
    n.output.parent.mkdir(parents=True,exist_ok=True)
    n.output.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
    print(f"{len(data['devices'])} public entries, {len(data['profiles'])} profiles, {len(data['equipment'])} equipment entries, {sum(len(p['variants']) for p in data['profiles'])} variants  |  {data['meta']['counts']}")
