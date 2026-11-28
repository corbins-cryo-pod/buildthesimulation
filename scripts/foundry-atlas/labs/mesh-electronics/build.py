#!/usr/bin/env python3
"""Embed the isolated lab in one browseable, offline file."""
import argparse, json
from pathlib import Path
HOME=Path(__file__).resolve().parent
SRC=HOME/'src'

def build(dest:Path, repo:Path):
    tools={}
    for p in sorted((repo/'src/data/equipment/zones').glob('*.json')):
        for r in json.loads(p.read_text()):
            tools[r['id']]={k:r[k] for k in ('name','model')}
    assert len(tools)>=180, 'A current equipment register is needed to build the instrument links'
    needed=set()
    for line in (SRC/'engine.js').read_text().splitlines():
        if 'tools:' in line:
            import re
            needed.update(re.findall(r"'(\d\d-\d\d)'",line.split('tools:')[1]))
    assert needed.issubset(tools),f'Missing equipment: {needed-set(tools)}'
    s=(SRC/'template.html').read_text()
    assets={'CSS':'style.css','ENGINE':'engine.js','VIEW':'view.js','APP':'app.js'}
    for symbol,path in assets.items():
        content=(SRC/path).read_text()
        assert '</script' not in content.lower(),path
        s=s.replace('@@'+symbol+'@@',content)
    s=s.replace('@@EQUIPMENT@@',json.dumps({i:tools[i] for i in sorted(needed)},ensure_ascii=False).replace('<','\\u003c'))
    assert '@@' not in s
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(s)
    return dest

if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--repo',type=Path,default=Path('lab_phase3/site-main'));a.add_argument('--out',type=Path,default=HOME/'release/index.html')
    n=a.parse_args(); print(build(n.out,n.repo))
