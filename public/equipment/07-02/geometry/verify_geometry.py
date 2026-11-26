"""Read and check the exported GLB independently of Blender. Python 3 + numpy."""
import json
import struct
from pathlib import Path

import numpy as np

raw = Path(__file__).with_name("heracell-vios-160i.glb").read_bytes()
magic, version, size, json_size, kind = struct.unpack_from("<4sIII4s", raw)
assert (magic, version, size, kind) == (b"glTF", 2, len(raw), b"JSON")
doc = json.loads(raw[20:20 + json_size])
blob = memoryview(raw)[28 + json_size:]
nodes = doc['nodes']
names = {n['name']: i for i, n in enumerate(nodes)}
extents = {}


def transform(node):
    assert 'matrix' not in node
    x,y,z,w = node.get('rotation',(0,0,0,1))
    rotation = [[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
                [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
                [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]]
    matrix = np.eye(4)
    matrix[:3,:3] = np.array(rotation) @ np.diag(node.get('scale',(1,1,1)))
    matrix[:3,3] = node.get('translation',(0,0,0))
    return matrix


def read_node(index, parent):
    n = nodes[index]
    world = parent @ transform(n)
    if 'mesh' in n:
        coords = []
        for p in doc['meshes'][n['mesh']]['primitives']:
            a = doc['accessors'][p['attributes']['POSITION']]
            assert a['type'] == 'VEC3' and a['componentType'] == 5126
            v = doc['bufferViews'][a['bufferView']]
            offset = v.get('byteOffset',0) + a.get('byteOffset',0)
            vertices = np.ndarray((a['count'],3), dtype='<f4', buffer=blob,
                                  offset=offset, strides=(v.get('byteStride',12),4))
            coords.append((vertices @ world[:3,:3].T + world[:3,3])*1000)
        points = np.concatenate(coords)
        extents[n['name']] = (points.min(axis=0),points.max(axis=0))
    for child in n.get('children', []):
        read_node(child, world)


for root in doc['scenes'][doc.get('scene',0)]['nodes']:
    read_node(root, np.eye(4))


def check(label, actual, expected, tolerance):
    values = np.array(actual)
    print(f'{label}: {np.round(values,3)}; expected {expected} ± {tolerance} mm')
    assert np.all(np.abs(values-np.array(expected)) <= tolerance)


bounds = np.array(list(extents.values()))
check("Closed exterior W H D", bounds[:,1].max(axis=0)-bounds[:,0].min(axis=0),
      (637,905,790), .5)
check("Inner width height depth", [
    extents['ChamberSide+1'][0][0] - extents['ChamberSide-1'][1][0],
    extents['ChamberCeiling'][0][1] - extents['ReservoirFloor'][1][1],
    290 - extents['ChamberRearWall'][1][2]], (470,607,576), .1)
# Front surround face supplies the chamber entrance datum used above.
check("Entry z", extents['FrontEnclosure'][1][2], 290, .1)
assert extents['RearVentSlots'][0][2] < extents['RearServiceBox'][0][2]
assert extents['RearIDPlate'][0][2] < extents['RearServiceBox'][0][2]
for n in ('Shelf1','Shelf2','Shelf3'):
    low, high = extents[n]
    check(n+" W D", (high-low)[[0,2]], (423,465), .1)
for moving, attached in [('OuterDoorPivot','OuterDoorPanel'),('GlassDoorPivot','SingleGlassPanel')]:
    assert names[attached] in nodes[names[moving]]['children']
assert names['DisplayFace'] in nodes[names['OuterDoorPivot']]['children']
print('Door-link hierarchy: PASS')
