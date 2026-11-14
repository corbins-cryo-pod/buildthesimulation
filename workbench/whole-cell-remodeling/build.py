"""Build the public, media-free Whole-Cell Remodeling page from explicit sources."""
from pathlib import Path
import re
HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
html = (HERE / 'src/template.html').read_text()
for key, name in [('__ENGINE__', 'engine.js'), ('__RENDERER__', 'renderer.js'), ('__IMPORT__', 'import.js'), ('__APP__', 'app.js')]:
    assert html.count(key) == 1, f'Missing or repeated source placeholder: {key}'
    html = html.replace(key, (HERE / 'src' / name).read_text())
for forbidden in [r'data:video', r'<video\b', r'reference\.mp4', r'referenceToggle', r'referenceVideo', r'__REFERENCE', r'Compare recording', r'Recording 2026']:
    assert not re.search(forbidden, html, re.I), f'Private comparison material must not be published: {forbidden}'
assert not re.search(r'__[A-Z_]+__', html), 'Unresolved source placeholder'
output = REPO / 'public/simulations/whole-cell-remodeling/index.html'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(html)
print(f'Built {output.relative_to(REPO)} ({output.stat().st_size} bytes)')
