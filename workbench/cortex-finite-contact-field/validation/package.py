"""Make a complete source/data archive, inventory and SHA-256 checksums.

Default output is work/finite-contact-field-1.0.0.zip, deliberately outside
the inventory. No remote upload, website modification or deployment occurs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

ROOT=Path(__file__).resolve().parents[1]
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--output',type=Path,default=ROOT/'work/finite-contact-field-1.0.0.zip')
    args=parser.parse_args()
    excluded={'work','__pycache__','.venv','.git'}
    files=[]
    for p in sorted(ROOT.rglob('*')):
        rel=p.relative_to(ROOT)
        if not p.is_file() or any(part in excluded for part in rel.parts):continue
        if str(rel).startswith('artifacts/reference/'):continue
        if p.name in {'FILE_MANIFEST.json','SHA256SUMS'} or p.suffix=='.pyc':continue
        files.append(p)
    inventory={'schema':'finite-contact-file-inventory/1.0','packageVersion':'1.0.0','algorithm':'SHA-256','exclusions':'The inventory and SHA256SUMS do not list themselves recursively. SHA256SUMS includes FILE_MANIFEST.json; the separate archive checksum covers all ZIP bytes. Work caches, stale smoke artifacts and bytecode are excluded.','files':[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)} for p in files]}
    manifest=ROOT/'FILE_MANIFEST.json'
    manifest.write_text(json.dumps(inventory,indent=2)+'\n')
    files.append(manifest)
    sums=ROOT/'SHA256SUMS'
    sums.write_text(''.join(f'{digest(p)}  {p.relative_to(ROOT).as_posix()}\n' for p in sorted(files)))
    files.append(sums)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(args.output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
        for p in sorted(files):archive.write(p,'finite-contact-field/'+p.relative_to(ROOT).as_posix())
    checksum=digest(args.output)
    args.output.with_suffix('.zip.sha256').write_text(f'{checksum}  {args.output.name}\n')
    print(json.dumps({'archive':str(args.output),'bytes':args.output.stat().st_size,'sha256':checksum,'files':len(files)},indent=2))

if __name__=='__main__':main()
