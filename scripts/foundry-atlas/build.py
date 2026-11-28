#!/usr/bin/env python3
"""Render a self-contained HTML atlas. No third-party dependencies or network calls."""
from pathlib import Path
import argparse,json
p=argparse.ArgumentParser()
p.add_argument('data',type=Path);p.add_argument('output',type=Path)
args=p.parse_args()
root=Path(__file__).resolve().parent
payload=json.loads(args.data.read_text(encoding='utf8'))
for k in ('meta','devices','profiles','equipment'):
    if k not in payload: raise ValueError(f'missing atlas key: {k}')
doc=(root/'atlas.template.html').read_text()
blocks = {
    '__ATLAS_STYLES__': ['atlas.css', 'atlas-player.css'],
    '__ATLAS_SCRIPT__': ['atlas-player.js', 'atlas.js'],
}
for token, paths in blocks.items():
    if doc.count(token)!=1: raise ValueError(f'bad marker: {token}')
    doc=doc.replace(token,'\n'.join((root/path).read_text(encoding='utf8') for path in paths))
if doc.count('__FOUNDRY_DATA__')!=1:raise ValueError('bad data marker')
raw=json.dumps(payload,ensure_ascii=False,separators=(',',':'),allow_nan=False).replace('&','\\u0026').replace('<','\\u003c').replace('>','\\u003e').replace('\u2028','\\u2028').replace('\u2029','\\u2029')
args.output.parent.mkdir(parents=True,exist_ok=True)
args.output.write_text(doc.replace('__FOUNDRY_DATA__',raw),encoding='utf8')
print(f'{args.output.name}: {args.output.stat().st_size:,} bytes / {len(payload["devices"])} devices / {len(payload["profiles"])} routes / {len(payload["equipment"])} instruments')
