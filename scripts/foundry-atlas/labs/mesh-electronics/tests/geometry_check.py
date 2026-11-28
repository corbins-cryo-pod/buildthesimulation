#!/usr/bin/env python3
"""Read the exported GLB metadata and independently verify units, layer and device counts."""
from pathlib import Path
import json,struct
R=Path(__file__).resolve().parents[1]
src=json.loads((R/'model/geometry.json').read_text())
glb=(R/'release/Mesh-Electronics-Released-32.glb').read_bytes()
magic,ver,total=struct.unpack_from('<4sII',glb,0);assert magic==b'glTF' and ver==2 and total==len(glb)
n,typ=struct.unpack_from('<I4s',glb,12);assert typ==b'JSON'
g=json.loads(glb[20:20+n])
shapes=src['configurations']['full']['shapes']
expected={s['id']:k for k in ('lower','gold','platinum','upper') for s in shapes[k]}
nodes={z.get('extras',{}).get('feature'):z for z in g['nodes'] if 'mesh' in z}
assert set(nodes)==set(expected)
a=[]
for fid,node in nodes.items():
    assert node['extras']['layer']==expected[fid]
    assert node['extras']['dimension_basis'].startswith('model in meters')
    assert node.get('scale') is None and node.get('rotation') is None # Object geometry uses no scale or rotation.
    transforms=node.get('translation',[0,0,0])
    for primitive in g['meshes'][node['mesh']]['primitives']:
        bounds=g['accessors'][primitive['attributes']['POSITION']]
        a.append(([b+c for b,c in zip(bounds['min'],transforms)],[b+c for b,c in zip(bounds['max'],transforms)]))
    if fid.startswith('pt-site-'):
        b=g['accessors'][g['meshes'][node['mesh']]['primitives'][0]['attributes']['POSITION']]
        assert abs((b['max'][0]-b['min'][0])-20e-6)<1e-9
        assert abs((b['max'][1]-b['min'][1])-53e-9)<1e-11 # glTF Y is up
bounds=tuple((min(p[0][i]for p in a),max(p[1][i]for p in a))for i in range(3))
assert .037<bounds[0][1]-bounds[0][0]<.039
assert .00217<bounds[2][1]-bounds[2][0]<.0022
assert abs((bounds[1][1]-bounds[1][0])-.983e-6)<1e-10
assert len([n for n in expected if expected[n]=='platinum'])==32
assert len([n for n in expected if n.startswith('upper-island')])==32
for n in range(1,33):
    assert nodes[f'pt-site-{n}']['extras']['teaching_net_id']==str(n)
print(len(nodes),'separate features, 32 Pt sites, 32 labeled top openings, no carrier/Ni or fixture in released GLB')
print('Envelope mm:',[round((hi-lo)*1000,6)for lo,hi in bounds],'; GLB Y up')
