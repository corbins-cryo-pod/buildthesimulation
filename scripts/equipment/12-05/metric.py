"""Summarize the exported CSU-W1 GLB with glTF node/world matrices in metres."""
import struct,json,numpy as np
from scipy.spatial.transform import Rotation
from pathlib import Path
d=Path(__file__).resolve().parents[3]/'public/equipment/12-05';p=d/'csu-w1-tie.glb';raw=p.read_bytes();l=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+l]);bin=raw[28+l:];mins=[];maxs=[];bounds={};tris=0
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
for i,id in enumerate(['lower','middle','upper']):
 n=f'Synthetic_plane_card_{i}'; lo,hi=bounds[n];out['interaction'][n]={'action':'plane','id':id,'label':f'View {id} synthetic plane','boundsMinM':lo.round(6).tolist(),'boundsMaxM':hi.round(6).tolist()}
lo,hi=bounds['T1_vintage_conformal_shell']
out['measuredT1ShellM']=(hi-lo).round(6).tolist();out['documentedOriginalT1EnvelopeMm']=[480,252,327]
t1=[v for k,v in bounds.items() if k.startswith("T1_")];out["modeledT1AssemblyM"]=(np.max([v[1] for v in t1],axis=0)-np.min([v[0] for v in t1],axis=0)).round(6).tolist()
out['limits']='Static exterior. Actions target the separate offline card reader, not the microscope.'
(d/'vr.json').write_text(json.dumps(out,indent=2)+'\n'); print(out)
