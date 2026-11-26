"""Summarize the exported Envisu C2300 GLB with glTF node/world matrices in metres."""
import struct,json,numpy as np
from scipy.spatial.transform import Rotation
from pathlib import Path
d=Path(__file__).resolve().parents[3]/'public/equipment/15-10';p=d/'envisu-c2300.glb';raw=p.read_bytes();l=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+l]);bin=raw[28+l:];mins=[];maxs=[];bounds={};tris=0
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
n='Offline_column_tab';lo,hi=bounds[n];out['interaction'][n]={'action':'next','label':'Change the column on the unrelated art card','boundsMinM':lo.round(6).tolist(),'boundsMaxM':hi.round(6).tolist()}
for key,prefix,target in [('Cart','Cart_',[787,1549,559]),('Head','Head_',[80,170,230])]:
 t=[v for k,v in bounds.items() if k.startswith(prefix)];out['model'+key+'M']=(np.max([v[1] for v in t],axis=0)-np.min([v[0] for v in t],axis=0)).round(6).tolist();out['cited'+key+'Mm']=target
out['actualDeviceActions']=0;out['imageIndependent']=True
(d/'vr.json').write_text(json.dumps(out,indent=2)+'\n');print(out)
