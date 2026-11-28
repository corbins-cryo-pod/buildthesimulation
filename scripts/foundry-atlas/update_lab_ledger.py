#!/usr/bin/env python3
"""Update the digest of every lab or bench advertised in the Foundry hub."""
import hashlib
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[2]
ledger = root / 'src/data/foundry-atlas/lab-releases.json'
entries = json.loads(ledger.read_text())
hub = (root / 'src/pages/simulations/foundry/index.astro').read_text()
urls = re.findall(r"""\blink\s*:\s*['"](/simulations/(?:[a-z0-9-]+/)+)['"]""", hub)
assert urls and len(set(urls)) == len(urls), 'missing or duplicate Foundry links'
by_url = {entry['url']: entry for entry in entries.values()}
assert set(by_url) <= set(urls) and len(by_url) == len(entries), 'unexpected ledger entries'
for url in urls:
    path = root / 'public' / url.strip('/') / 'index.html'
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if url not in by_url:
        key = url.split('/')[-2]
        assert key not in entries, key
        by_url[url] = entries[key] = {'url': url, 'sha256': '', 'profiles': []}
    by_url[url]['sha256'] = digest
ledger.write_text(json.dumps(entries, indent=2) + '\n')
print(f'Updated digests for {len(urls)} Foundry labs and benches.')
