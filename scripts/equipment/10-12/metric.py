"""Summarize the exported MaxTwo GLB with glTF node/world matrices in metres."""
import struct,json,numpy as np
from scipy.spatial.transform import Rotation
from pathlib import Path
d=Path(__file__).resolve().parents[3]/'public/equipment/10-12';p=d/'maxtwo.glb';raw=p.read_bytes();l=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+l]);bin=raw[28+l:];mins=[];maxs=[];bounds={};tris=0
parents={ci:ni for ni,node in enumerate(g['nodes']) for ci in node.get('children',[])}
def transform(i):
 n=g['nodes'][i];mat=Rotation.from_quat(n.get('rotation',[0,0,0,1])).as_matrix()@np.diag(n.get('scale',[1,1,1]));tr=np.array(n.get('translation',[0,0,0]))
 if i in parents:
  m,t=transform(parents[i]);return m@mat,m@tr+t
 return mat,tr
for i,n in enumerate(g['nodes']):
 if 'mesh' not in n:continue
 M,tr=transform(i);V=[]
 for pr in g['meshes'][n['mesh']]['primitives']:
  a=g['accessors'][pr['attributes']['POSITION']];v=g['bufferViews'][a['bufferView']];v0=np.frombuffer(bin,dtype='<f4',count=a['count']*3,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,3);V.extend(v0@M.T+tr);tris+=g['accessors'][pr['indices']]['count']//3
 vv=np.array(V);lo=vv.min(axis=0);hi=vv.max(axis=0);mins.append(lo);maxs.append(hi);bounds[n['name']]=(lo,hi)
out={'units':'m','axes':'+X local right, +Y vertical, +Z toward operator','sizeM':(np.max(maxs,axis=0)-np.min(mins,axis=0)).round(6).tolist(),'meshes':len(g['meshes']),'triangles':tris,'bytes':len(raw),'interaction':{}}
for n,action in [('Drawer_face_select','drawer')]+[(p+'_'+i,'select') for p in ['Well','Inert_target'] for i in ['A1','A2','A3','B1','B2','B3']]:
 lo,hi=bounds[n];out['interaction'][n]={'action':action,'boundsMinM':lo.round(6).tolist(),'boundsMaxM':hi.round(6).tolist()}
out['drawer']={'node':'Dry_plate_drawer','nominalVisualDeltaM':[0,0,.153],'note':'Dry view only; travel not documented'};out['plateNominalMm']=[85.8,16.1,127.8]
(d/'vr.json').write_text(json.dumps(out,indent=2)+'\n');print(out)
