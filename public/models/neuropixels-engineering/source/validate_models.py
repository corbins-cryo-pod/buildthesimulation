"""Independent file-level, geometry and nominal-dimension assertions.
Run after build_model.py and build_cad.py. Reports exactly what has been tested.
"""
from pathlib import Path
import json,struct,csv,hashlib
import numpy as np
import trimesh
R=Path(__file__).resolve().parents[1]
checks=[]
def check(name,ok,details=None):
 checks.append({'test':name,'passed':bool(ok),'details':details});
 if not ok:raise AssertionError(name+' '+str(details))
def parse(p):
 d=p.read_bytes();magic,version,total=struct.unpack_from('<III',d)
 check(p.name+' valid GLB header',magic==0x46546c67 and version==2 and total==len(d))
 jlen,jtype=struct.unpack_from('<II',d,12);j=json.loads(d[20:20+jlen]);off=20+jlen
 blen,btype=struct.unpack_from('<II',d,off);binary=d[off+8:off+8+blen]
 check(p.name+' binary length',len(binary)==blen and btype==0x004e4942)
 return j,binary

def a(j,b,i):
 ac=j['accessors'][i];v=j['bufferViews'][ac['bufferView']];count=ac['count'];k={'VEC3':3,'VEC2':2,'SCALAR':1}[ac['type']]
 typ={5126:'<f4',5125:'<u4'}[ac['componentType']];return np.frombuffer(b,dtype=typ,count=count*k,offset=v.get('byteOffset',0)+ac.get('byteOffset',0)).reshape(count,k)

with (R/'electrode-coordinates.csv').open() as f:rows=list(csv.DictReader(f))
x=np.array([float(r['x_um']) for r in rows]);y=np.array([float(r['y_um']) for r in rows])
check('Exactly 960 distinct recording-site centres',len(rows)==960 and len(set(zip(x,y)))==960)
uy=np.unique(y);ux=np.unique(x)
check('Exactly 480 two-site rows',len(uy)==480 and all(np.count_nonzero(np.isclose(y,v,atol=1e-7))==2 for v in uy))
check('Four columns, 16 um lateral spacing',len(ux)==4 and np.allclose(np.diff(ux),16))
check('20 um longitudinal row spacing',np.allclose(np.diff(uy),20))
check('12 um footprints remain inside 70 um shank',np.all(np.abs(x)+6<=35))
check('Sites lie proximal to 175 um tip and below 10 mm base',np.min(y-6)>=175 and np.max(y+6)<=10000)
check('First site origin is explicitly marked assumed',json.loads((R/'specification.json').read_text())['reconstruction_assumptions']['first_site_center_from_tip_mm']==.2)
check('Checkerboard alternates correctly',all(np.allclose(x[2*r:2*r+2],[-24,8] if r%2==0 else [-8,24]) for r in range(480)))
for p in sorted((R/'models').glob('*.glb')):
 j,b=parse(p)
 check(p.name+' standard physical metre scale',j['nodes'][0]['scale']==[.001,.001,.001])
 bad=[];total=0
 for mi,m in enumerate(j['meshes']):
  for pr in m['primitives']:
   v=a(j,b,pr['attributes']['POSITION']);n=a(j,b,pr['attributes']['NORMAL']);uv=a(j,b,pr['attributes']['TEXCOORD_0']);idx=a(j,b,pr['indices']).ravel();total+=len(idx)//3
   if not (np.isfinite(v).all() and np.isfinite(n).all() and np.isfinite(uv).all() and idx.max()<len(v) and len(idx)%3==0 and np.allclose(np.linalg.norm(n,axis=1),1,atol=1e-4)):bad.append(mi)
 check(p.name+' finite geometry / unit normals / index bounds',not bad,{'unique_triangles':total,'invalid_meshes':bad})
 for bv in j['bufferViews']:check(p.name+' buffer view in range',bv.get('byteOffset',0)+bv['byteLength']<=len(b))
 if 'detail' not in p.name:
  site_nodes=[n for n in j['nodes'] if 'site_id' in n.get('extras',{})]
  check(p.name+' contains all 960 site instances',len(site_nodes)==960)
  ids=[n['extras']['site_id'] for n in site_nodes];check(p.name+' unique site ids',sorted(ids)==list(range(960)))
  m=j['meshes'][site_nodes[0]['mesh']]['primitives'][0];v=a(j,b,m['attributes']['POSITION'])
  check(p.name+' 12 x 12 um mesh footprint',np.allclose(np.ptp(v,axis=0)[:2],[.012,.012],rtol=1e-6))
 # Independent trimesh glTF parser catches malformed accessors, textures and scene graph issues.
 scene=trimesh.load(p,force='scene',process=False)
 check(p.name+' independent trimesh import',len(scene.geometry)>0 and np.isfinite(scene.bounds).all(),{'extent_in_metres':scene.extents.tolist()})
# Shared shank exterior closes into the nominal prism.
j,b=parse(R/'models/neuropixels-shank.glb');verts=[];faces=[];offset=0
for m in j['meshes']:
 if m['name'].startswith('Shank '):
  pr=m['primitives'][0];vv=a(j,b,pr['attributes']['POSITION']);ff=a(j,b,pr['indices']).reshape(-1,3);verts.append(vv);faces.append(ff+offset);offset+=len(vv)
mesh=trimesh.Trimesh(vertices=np.vstack(verts),faces=np.vstack(faces),process=True)
check('Assembled shank surface is watertight',mesh.is_watertight)
check('Mesh shank bounds 0.070 x 10 x 0.024 mm',np.allclose(mesh.extents,[.070,10,.024],rtol=1e-6),mesh.extents.tolist())
check('Mesh shank volume matches polygon analytic volume',np.isclose(mesh.volume,.016653,rtol=1e-6),float(mesh.volume))
cad=json.loads((R/'validation/cad-checks.json').read_text())
check('STEP solid valid before and after round trip',cad['cad_shank_valid'] and cad['round_trip_valid'])
check('STEP bounds agree with mesh',np.allclose(cad['bbox_mm'],mesh.extents,rtol=1e-6))
# Compact report: aggregate repetitive range checks.
rangechecks=[c for c in checks if 'buffer view in range' in c['test']]
summary=[c for c in checks if 'buffer view in range' not in c['test']]
summary.append({'test':'All GLB buffer-view bounds','passed':all(c['passed'] for c in rangechecks),'details':{'buffer_views_checked':len(rangechecks)}})
report={'status':'PASS','assertions_passed':len(checks),'summary_tests':len(summary),'checks':summary,'scope':'Software geometry and file consistency, not biological/electrochemical/manufacturing validation.'}
(R/'validation/model-validation.json').write_text(json.dumps(report,indent=2))
print('PASS',len(checks),'assertions;',len(summary),'summary tests')
