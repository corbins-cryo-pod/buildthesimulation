"""Verify authored mesh through independent GLB parsing: count and all contact centers."""
import json,math,struct,sys
from pathlib import Path
p=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parents[1]/'model/PtNRGrid-Square-Reference.glb'
r=p.read_bytes()
magic,v,n=struct.unpack_from('<4s2I',r,0);assert magic==b'glTF' and v==2 and n==len(r)
l,t=struct.unpack_from('<I4s',r,12);assert t==b'JSON';d=json.loads(r[20:20+l]);ll,tt=struct.unpack_from('<I4s',r,20+l);assert tt==b'BIN\x00'
start=28+l;verts=[];bounds=None
def vecs(ac):
 a=d['accessors'][ac];b=d['bufferViews'][a['bufferView']];assert a['type']=='VEC3' and a['componentType']==5126
 begin=start+b.get('byteOffset',0)+a.get('byteOffset',0);s=b.get('byteStride',12)
 return [struct.unpack_from('<3f',r,begin+s*i) for i in range(a['count'])]
for no in d['nodes']:
 name=no.get('name','')
 if 'mesh' not in no:continue
 m=d['meshes'][no['mesh']]['primitives'][0];ac=m['attributes']['POSITION'];v=vecs(ac)
 if name.startswith('Pt contact faces'):
  row=int(name[-2:])-1
  assert no['extras']['count']==32
  assert len({tuple(round(x,11) for x in b) for b in v})==32*17
  ys={round(p[1],10) for p in v};assert ys=={.0000046},ys
  for c in range(32):
   x=(c-15.5)*.001;y=(row-15.5)*.001 # Blender x/y/z -> glTF x/z/-y 
   rec=[(xx,zz) for xx,_,zz in v if abs(xx-x)<.000018 and abs(zz-y)<.000018]
   assert any(math.hypot(xx-x,zz-y)<1e-9 for xx,zz in rec)
   assert len(rec)==17
   assert abs((max(z[0] for z in rec)-min(z[0] for z in rec))-.00003)<2e-9
   verts.append((row,c))
 elif name.startswith('Parylene C'):
  bounds=[[min(q[i] for q in v),max(q[i] for q in v)] for i in range(3)]
assert len(verts)==len(set(verts))==1024
assert bounds is not None and all(abs(a-b)<1e-8 for a,b in zip(sum(bounds,[]),[-.016,.016,0,.0000066,-.016,.016])),bounds
assert not any('glass carrier' in x.get('name','').lower() for x in d['nodes'])
print(json.dumps({'status':'PASS','contacts':len(verts),'diameter_um':30,'site_recess_um':2,'GLB_crop_bounds_m':bounds,'vertices_units':'meter'},indent=2))
