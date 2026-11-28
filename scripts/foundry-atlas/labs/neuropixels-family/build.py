"""Bundle the source routing bench with its idempotent native playback wrapper."""
from pathlib import Path
from runpy import run_path

p=Path(__file__).resolve().parent
out=(p/'src/template.html').read_text(encoding='utf-8')
for marker,filename in [('STYLE','bench.css'),('ENGINE','engine.js'),('UI','interface.js')]:
 token=f'/*INLINE_{marker}*/'
 assert out.count(token)==1,token
 out=out.replace(token,(p/'src'/filename).read_text(encoding='utf-8'))
inject=run_path(str(p.parent/'silicon-playback/build.py'))['inject']
(p/'index.html').write_bytes(inject(out.encode('utf-8'),'neuropixels-family'))
