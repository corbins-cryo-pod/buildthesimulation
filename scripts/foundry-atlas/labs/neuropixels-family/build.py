from pathlib import Path
p=Path(__file__).resolve().parent
out=(p/'src/template.html').read_text()
for marker,filename in [('STYLE','bench.css'),('ENGINE','engine.js'),('UI','interface.js')]:
 token=f'/*INLINE_{marker}*/';assert out.count(token)==1
 out=out.replace(token,(p/'src'/filename).read_text())
(p/'index.html').write_text(out)
