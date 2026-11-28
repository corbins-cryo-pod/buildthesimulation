from pathlib import Path
from hashlib import sha256
base = Path(__file__).resolve().parent
src = base / 'src'
p = (src / 'template.html').read_text(encoding='utf-8')
for token,name in {'CSS':'style.css','EVIDENCE':'evidence.cjs','ENGINE':'engine.cjs','UI':'ui.js'}.items():
    stamp = f'/*__{token}__*/'
    assert p.count(stamp)==1
    inline = (src/name).read_text(encoding='utf-8')
    if token != 'CSS':
        assert '</script' not in inline.lower()
    p=p.replace(stamp,inline)
blob=p.encode('utf-8')
(base/'index.html').write_bytes(blob)
print(f'Build: {len(blob):,} bytes, sha256 {sha256(blob).hexdigest()}')
