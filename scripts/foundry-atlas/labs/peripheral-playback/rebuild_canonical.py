#!/usr/bin/env python3
"""Rebuild four current canonical lab bundles in an isolated directory, then apply Play.

The older Dong cuff is a standalone-only release. Supply its unlocked (pre-Play)
standalone HTML explicitly after the site's public artifact has been patched.
"""
import argparse, json, hashlib, shutil, subprocess, sys, tempfile
from pathlib import Path
from inject_play import bundled, slugs
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('repo',type=Path)
parser.add_argument('destination',type=Path)
parser.add_argument('--cuff-baseline',type=Path)
p=parser.parse_args()
src=p.repo.resolve()/'scripts/foundry-atlas/labs'
public=p.repo.resolve()/'public/simulations'
p.destination.mkdir(parents=True,exist_ok=True)
dest=p.destination.resolve()
assert not dest.is_relative_to(public), 'Stage canonical bytes in a separate directory first'
mapping={
 'self-closing-cuff-foundry':None,
 'stentrode-foundry':'stentrode',
 'time-4h-foundry':'time4h',
 'rolled-microchannels-foundry':'rolled-microchannels',
 'retinal-photovoltaic-foundry':'retinal-photovoltaic'
}
immutable={}
def d(b):return hashlib.sha256(b).hexdigest()
with tempfile.TemporaryDirectory(prefix='bts-foundry-play-') as tmp:
 for slug, folder in mapping.items():
  if folder:
   scratch=Path(tmp)/folder
   shutil.copytree(src/folder,scratch,ignore=shutil.ignore_patterns('node_modules','__pycache__','index.html'))
   subprocess.run([sys.executable, str(scratch/'build.py')],check=True,cwd=scratch)
   prior=(scratch/'index.html').read_bytes()
  else:
   prior=(p.cuff_baseline or public/slug/'index.html').read_bytes()
  after=bundled(prior.decode('utf-8'),slugs[slug]).encode('utf-8')
  current=(public/slug/'index.html').read_bytes()
  path=dest/slug/'index.html';path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(after)
  immutable[slug]={'canonical_base_sha256':d(prior),'current_public_sha256':d(current),
   'canonical_base_is_current_public':prior==current,'generated_sha256':d(after),
   'generated_is_current_public':current==after,'bytes':len(after)}
(dest/'canonical-manifest.json').write_text(json.dumps(immutable,indent=2)+'\n')
print(json.dumps(immutable,indent=2))
