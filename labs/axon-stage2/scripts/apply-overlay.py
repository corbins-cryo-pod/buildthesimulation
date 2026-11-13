"""Apply additive Stage2 files to a local checked-out Stage1 tree. Never commits or pushes."""
from pathlib import Path
import argparse,subprocess,hashlib,shutil,sys
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('repository',type=Path);parser.add_argument('--apply',action='store_true',help='Actually copy files; default is dry run')
a=parser.parse_args();repo=a.repository.resolve();root=Path(__file__).resolve().parents[1]
source=repo/'src/lib/axon-interface/mrg.mjs'
if not source.is_file():sys.exit('The Stage1 axon source is absent. Check out feature/axon-resolution-stage1 or the reviewed commit first.')
content=source.read_bytes();blob=hashlib.sha1(b'blob '+str(len(content)).encode()+b'\0'+content).hexdigest()
if blob!='ac67aa7789a316b8aeddb7ff968bf8c735227a79':sys.exit('Stage1 membrane source differs from the pinned baseline. Rebase/review explicitly; no files were copied.')
files=[]
for src in (root/'overlay').rglob('*'):
    if not src.is_file():continue
    relative=src.relative_to(root/'overlay');dest=repo/relative
    if not dest.resolve().is_relative_to(repo):sys.exit('Destination symlink escapes repository.')
    if dest.exists():
        if dest.is_file() and dest.read_bytes()==src.read_bytes():continue
        sys.exit(f'Refusing to overwrite existing nonidentical file: {relative}')
    files.append((src,dest))
for src,dest in files:print(('ADD ' if a.apply else 'WOULD ADD ')+str(dest.relative_to(repo)))
if not a.apply:print('Dry run only. Add --apply to copy. No commit, push or deployment is performed.');sys.exit(0)
created=[]
try:
    for src,dest in files:dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dest);created.append(dest)
except Exception:
    for dest in reversed(created):dest.unlink()
    raise
print(f'Copied {len(created)} new files. Stage1 sources unchanged. Full Astro build remains required in your repository.')
