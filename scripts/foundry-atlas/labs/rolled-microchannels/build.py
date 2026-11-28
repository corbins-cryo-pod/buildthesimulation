from pathlib import Path
p=Path(__file__).resolve().parent
page=(p/'template.html').read_text()
for key,name in [('__STYLE__','style.css'),('__ENGINE__','engine.cjs'),('__APP__','app.js')]:
    page=page.replace(key,(p/name).read_text())
assert not any(k in page for k in ['__STYLE__','__ENGINE__','__APP__'])
(p/'index.html').write_text(page)
