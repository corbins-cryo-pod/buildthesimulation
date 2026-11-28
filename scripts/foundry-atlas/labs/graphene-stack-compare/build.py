#!/usr/bin/env python3
import argparse,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parent
SRC=ROOT/'src'
def build(repo=None,out=None):
    if repo:
        eq={}
        for p in sorted((repo/'src/data/equipment/zones').glob('*.json')):
            for q in json.loads(p.read_text()):eq[q['id']]={k:q[k] for k in ('name','model')}
        assert len(eq)>=180
    else:eq=json.loads((SRC/'equipment.snapshot.json').read_text())
    engine=(SRC/'engine.js').read_text()
    used=sorted(set(re.findall(r"'(\d\d-\d\d)'",engine)))
    eq={i:eq[i]for i in used}
    if repo:(SRC/'equipment.snapshot.json').write_text(json.dumps(eq,ensure_ascii=False,indent=2)+'\n')
    html=(SRC/'template.html').read_text()
    for name,p in {'CSS':'style.css','ENGINE':'engine.js','VISUAL':'visual.js','APP':'app.js'}.items():
        content=(SRC/p).read_text()
        assert '</script' not in content.lower()
        html=html.replace('@@'+name+'@@',content)
    html=html.replace('@@EQUIPMENT@@',json.dumps(eq,ensure_ascii=False).replace('<','\\u003c'))
    assert '@@' not in html
    dest=out or ROOT/'release/index.html';dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(html);return dest
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--repo',type=Path);p.add_argument('--out',type=Path);a=p.parse_args()
    print(build(a.repo,a.out))
