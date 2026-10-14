"""Import the supplied V3 atlas and comparison packet without changing geometry.

Usage: python scripts/import-finger-atlas.py atlas.html comparisons.zip
Requires Pillow for gallery thumbnails. Originals are retained byte for byte.
"""
import base64
import hashlib
import io
import json
from pathlib import Path
import re
import sys
import zipfile
from PIL import Image

root = Path(__file__).resolve().parents[1]
assets = root / 'public/assets/finger-pathway-atlas/v3'
assets.mkdir(parents=True, exist_ok=True)
viewer = root / 'public/simulations/finger-pathway-atlas/viewer/index.html'
viewer.parent.mkdir(parents=True, exist_ok=True)
original = Path(sys.argv[1]).read_bytes()
html = original.decode()
matches = list(re.finditer(r'<script([^>]*)>(.*?)</script>', html, re.S))
assert len(matches) == 7, 'Unexpected atlas packaging; inspect before importing'
names = ['engine.js', None, None, 'membrane.js', 'specimens.js', 'viewer.js', 'atlas-navigation.js']
replacements = []
payload = base64.b64decode(matches[2][2].strip())
def write_parts(content, name):
    paths = []
    for number, start in enumerate(range(0, len(content), 8_000_000), 1):
        path = f'{name}.part-{number}.bin'
        (assets / path).write_bytes(content[start:start + 8_000_000])
        paths.append(path)
    return paths

anatomy_parts = write_parts(payload, 'anatomy.json.gz')
offline_parts = write_parts(original, 'Finger_Pathway_Atlas_v3.html')
(assets / 'anatomy.json.gz').unlink(missing_ok=True)
(assets / 'Finger_Pathway_Atlas_v3.html').unlink(missing_ok=True)
previews = json.loads(matches[1][2])
for key, uri in previews.items():
    mime, encoded = uri.split(',', 1)
    assert mime == 'data:image/png;base64'
    (assets / f'preview-{key}.png').write_bytes(base64.b64decode(encoded))
    previews[key] = f'/assets/finger-pathway-atlas/v3/preview-{key}.png'

old_loader = "const bytes=Uint8Array.from(atob($('packed').textContent.trim()),c=>c.charCodeAt(0));\n const data=JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());$('packed').remove();"
new_loader = """$('loadStatus').textContent='Loading anatomical data (16 MB)…';
 if(typeof DecompressionStream==='undefined')throw new Error('This browser cannot decompress the atlas data. Try a current browser.');
 const parts=await Promise.all([1,2].map(async part=>{
  const response=await fetch('/assets/finger-pathway-atlas/v3/anatomy.json.gz.part-'+part+'.bin');
  if(!response.ok)throw new Error('Anatomical data request failed ('+response.status+'). Reload to retry.');
  return response.arrayBuffer();
 }));
 const data=JSON.parse(await new Response(new Blob(parts).stream().pipeThrough(new DecompressionStream('gzip'))).text());"""
for i, match in enumerate(matches):
    if i == 1:
        replacement = '<script id="previews" type="application/json">' + json.dumps(previews) + '</script>'
    elif i == 2:
        replacement = ''
    else:
        code = match[2]
        if i == 5:
            assert old_loader in code
            code = code.replace(old_loader, new_loader)
        (assets / names[i]).write_text(code)
        replacement = f'<script src="/assets/finger-pathway-atlas/v3/{names[i]}"></script>'
    replacements.append((match.start(), match.end(), replacement))
for start, end, replacement in reversed(replacements):
    html = html[:start] + replacement + html[end:]
html = html.replace('<meta name="viewport"', '<meta name="robots" content="noindex"><meta name="viewport"', 1)
html = html.replace('<button id="modelCard">', '<a class="site-link" href="/simulations/finger-pathway-atlas/references/" target="_top">Reference images</a><button id="modelCard">', 1)
html = html.replace('</style>', '.site-link{color:var(--sens);font-size:10px;text-decoration:none;border:1px solid var(--border);padding:6px 9px;border-radius:3px}.site-link:focus-visible{outline:2px solid var(--sens)}@media(max-width:760px){.site-link{display:none}}\n</style>', 1)
viewer.write_text(html)

with zipfile.ZipFile(sys.argv[2]) as packet:
    prefix = 'Finger_Pathway_Comparison/'
    manifest = json.loads(packet.read(prefix + 'comparison_manifest.json'))
    for entry in packet.infolist():
        rel = entry.filename.removeprefix(prefix)
        if not rel or entry.is_dir():
            continue
        assert rel.startswith(('reference_figures/', 'plates/')) or '/' not in rel
        dest = assets / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(packet.read(entry))
    region_map = {'meissner':'tip', 'merkel':'tip', 'pacinian':'tip', 'free':'tip', 'nerve':'nerve', 'drg':'drg', 'spinal':'spinal', 'medulla':'medulla', 'thalamus':'thalamus', 'cortex':'cortex', 'cell':'cell', 'cell0':'cell', 'nmj':'nmj', 'spindle':'proprio', 'golgi':'proprio'}
    for comparison in manifest['comparisons']:
        plate = assets / comparison['plate_file']
        thumbnail = f"thumbnails/{comparison['number']:02d}.webp"
        (assets / 'thumbnails').mkdir(exist_ok=True)
        with Image.open(plate) as image:
            image.thumbnail((960, 656))
            image.save(assets / thumbnail, 'WEBP', quality=85, method=6)
        comparison['thumbnail_file'] = thumbnail
        comparison['region'] = region_map[comparison['model'].split('_')[0]]
    data_dir = root / 'src/data'
    (data_dir / 'finger-atlas-comparisons.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

checksums = {str(file.relative_to(assets)): hashlib.sha256(file.read_bytes()).hexdigest() for file in sorted(assets.rglob('*')) if file.is_file() and file.name != 'asset-integrity.json'}
(assets / 'asset-integrity.json').write_text(json.dumps({'original_html_sha256':hashlib.sha256(original).hexdigest(), 'anatomy_parts':anatomy_parts, 'offline_parts':offline_parts, 'files':checksums}, indent=2) + '\n')
print(f'Imported {len(manifest["comparisons"])} plates, {manifest["unique_reference_figures"]} original figures, and {len(payload):,} bytes of unchanged compressed geometry.')
