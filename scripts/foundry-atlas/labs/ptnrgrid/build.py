#!/usr/bin/env python3
"""Build the lab as one HTML file, with no asset or library fetches."""
from pathlib import Path
import sys
root=Path(__file__).resolve().parent
src=root/'src'
doc=(src/'index.html').read_text()
for mark,text in {
    '__CSS__':(src/'style.css').read_text(),
    '__ENGINE__':(src/'engine.js').read_text(),
    '__SCRIPT__':(src/'scene.js').read_text()+'\n'+(src/'lab.js').read_text()
}.items():
    if doc.count(mark)!=1:raise ValueError(mark)
    doc=doc.replace(mark,text)
where=Path(sys.argv[1]) if len(sys.argv)>1 else root/'dist/index.html'
where.parent.mkdir(parents=True,exist_ok=True)
where.write_text(doc)
print(f'{where}: {where.stat().st_size:,} bytes')
