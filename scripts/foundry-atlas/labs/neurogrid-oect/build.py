#!/usr/bin/env python3
"""Build self-contained offline lab from plain sources."""
from pathlib import Path
import sys
root=Path(__file__).resolve().parent
doc=(root/'src/index.html').read_text()
for label,file in [('__ENGINE__','engine.js'),('__APP__','ui.js'),('__STYLE__','style.css')]:
    assert doc.count(label)==1
    doc=doc.replace(label,(root/'src'/file).read_text())
out=Path(sys.argv[1]) if len(sys.argv)>1 else root/'dist/index.html'
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(doc)
print(out,len(doc.encode()))
