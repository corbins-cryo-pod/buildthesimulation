from pathlib import Path
import base64
R=Path(__file__).resolve().parents[1]
s=(R/'source/viewer.template.html').read_text()
for tag,file in [('STUDY','neuropixels-blueprint-study.glb'),('REFERENCE','neuropixels-reference-assembly.glb'),('DETAIL','neuropixels-electrode-detail.glb')]:
 s=s.replace('@@'+tag+'@@',base64.b64encode((R/'models'/file).read_bytes()).decode())
img=R/'drawings/neuropixels-engineering-sheet.png'
if img.exists():s=s.replace('@@SHEET@@',base64.b64encode(img.read_bytes()).decode())
(R/'neuropixels-3d-viewer.html').write_text(s)
print('HTML bytes:',(R/'neuropixels-3d-viewer.html').stat().st_size)
