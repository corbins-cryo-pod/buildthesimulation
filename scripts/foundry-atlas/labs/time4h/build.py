from pathlib import Path
root=Path(__file__).resolve().parent
page=(root/'template.html').read_text()
for token,file in [('__STYLE__','style.css'),('__ENGINE__','engine.cjs'),('__APP__','app.js')]: page=page.replace(token,(root/file).read_text())
(root/'index.html').write_text(page)
