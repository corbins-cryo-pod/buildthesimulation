from pathlib import Path
p=Path(__file__).resolve().parent;s=p/'src'
html=(s/'page.html').read_text()
for tag,f in [('CSS','style.css'),('ENGINE','engine.cjs'),('UI','ui.js')]:
 assert html.count('%%'+tag+'%%')==1
 html=html.replace('%%'+tag+'%%',(s/f).read_text())
(p/'index.html').write_text(html)
