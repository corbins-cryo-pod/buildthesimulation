"""Build both uploaded engines as independent static apps, without npm dependencies."""
from pathlib import Path
import subprocess, shutil
ROOT = Path(__file__).resolve().parents[1]
for slug,cmd,entry in [
 ('neuron-growth-v3',['python3','build.py'],'neuron-engine-v3.html'),
 ('neurotissue-v4',['node','tools/build.js'],'index.html')]:
 source=ROOT/'labs'/slug
 subprocess.run(cmd,cwd=source,check=True)
 target=ROOT/'public'/'labs'/slug
 target.mkdir(parents=True,exist_ok=True)
 shutil.copyfile(source/'dist'/entry,target/'index.html')
 for name in ['runs','library-manifest.json']:
  src=source/'dist'/name
  if src.is_dir(): shutil.copytree(src,target/name,dirs_exist_ok=True)
  elif src.is_file(): shutil.copyfile(src,target/name)
 print(slug, '->',target)

review=ROOT/'public/labs/growth-review'
review.mkdir(parents=True,exist_ok=True)
for name in ['REVIEW.md','verification.json','browser-verification.json']:
 source=ROOT/'docs/neural-growth'/name
 if source.is_file(): shutil.copyfile(source,review/name)
