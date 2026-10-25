"""Extract licensed OpenEar meshes and derive a registered display centreline.

Reproducible display-asset derivation. No patient inference or electrical computation is performed.
"""
import io, json, hashlib, urllib.request, zipfile
from pathlib import Path
import numpy as np
from scipy import ndimage
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import dijkstra, connected_components
from scipy.spatial import cKDTree
from scipy.interpolate import PchipInterpolator
import trimesh
from skimage.morphology import skeletonize

import argparse
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--root-dir', type=Path, default=Path(__file__).resolve().parents[2])
parser.add_argument('--cache-dir', type=Path, default=Path('/tmp/cochlear-anatomy-research'))
args = parser.parse_args()
ROOT, WORK = args.root_dir.resolve(), args.cache_dir.resolve()
OUT = ROOT / 'public/assets/cochlear'
WORK.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
URL = 'https://zenodo.org/api/records/1473724/files/ZETA.zip/content'
ZIP_SIZE = 3868308936
MEMBERS = {
    'scala-tympani': '07_3D_Models/01_Scala Tympani.ply',
    'scala-vestibuli-vestibular-labyrinth': '07_3D_Models/02_Scala Vestibuli.ply',
    'cochleovestibular-nerve': '07_3D_Models/08_Cochleovestibular Nerve.ply',
}

class RemoteFile(io.RawIOBase):
    def __init__(self): self.pos, self.total = 0, 0
    def seekable(self): return True
    def seek(self, offset, whence=0):
        self.pos = offset if whence == 0 else self.pos + offset if whence == 1 else ZIP_SIZE + offset
        return self.pos
    def tell(self): return self.pos
    def read(self, n=-1):
        n = min(ZIP_SIZE-self.pos if n < 0 else n, ZIP_SIZE-self.pos)
        if n <= 0: return b''
        if n > 16000000: raise RuntimeError('Unexpected large range')
        request = urllib.request.Request(URL, headers={'Range': f'bytes={self.pos}-{self.pos+n-1}'})
        with urllib.request.urlopen(request, timeout=45) as response:
            if response.status != 206: raise RuntimeError('Server did not honor byte range')
            result = response.read(n)
        self.pos += len(result); self.total += len(result)
        return result

source = {
    'title': 'The OpenEar library of 3D models of the human temporal bone based on computed tomography and micro-slicing',
    'authors': 'Sieber D, Erfurt P, John S, Ribeiro dos Santos G, Schurzig D, Sørensen MS, Lenarz T',
    'articleDoi': '10.1038/sdata.2018.297',
    'datasetDoi': '10.5281/zenodo.1473724',
    'datasetUrl': 'https://zenodo.org/records/1473724',
    'specimen': 'ZETA',
    'license': 'CC BY 4.0',
    'licenseUrl': 'https://creativecommons.org/licenses/by/4.0/',
    'archive': 'ZETA.zip',
    'archiveMd5AsPublished': '66fc062426086d2757e837593fd548e5',
    'archiveMd5Verified': False,
    'downloadMethod': 'HTTP byte ranges; ZIP central directory and selected members only; member CRC verified by Python zipfile',
}
mesh_data = {}
def exact_distances_to_mesh(mesh, points):
    triangles = np.asarray(mesh.triangles)
    centers = triangles.mean(axis=1)
    tree = cKDTree(centers)
    max_radius = np.linalg.norm(triangles-centers[:,None], axis=2).max()
    result = []
    for point in points:
        _, k = tree.query(point)
        candidate = trimesh.triangles.closest_point(triangles[k:k+1], point[None])[0]
        upper = np.linalg.norm(candidate-point)
        ids = tree.query_ball_point(point, upper+max_radius+1e-12)
        closest = trimesh.triangles.closest_point(triangles[ids], np.broadcast_to(point,(len(ids),3)))
        result.append(float(np.linalg.norm(closest-point,axis=1).min()))
    return np.array(result)
if all((WORK / (key+'.ply')).exists() for key in MEMBERS):
    pass
else:
    remote = RemoteFile()
    with zipfile.ZipFile(remote) as archive:
        for key, member in MEMBERS.items():
            payload = archive.read(member)
            (WORK / (key+'.ply')).write_bytes(payload)
    print('Bytes transferred:', remote.total, flush=True)
for key, member in MEMBERS.items():
    payload = (WORK / (key+'.ply')).read_bytes()
    mesh = trimesh.load_mesh(io.BytesIO(payload), file_type='ply', process=False)
    mesh_data[key] = mesh
    print(key, len(mesh.vertices), len(mesh.faces), 'watertight', mesh.is_watertight, flush=True)

# Use the medial curve of the measured ST lumen. The voxel skeleton is a
# display registration, not a segmentation of the organ of Corti or neural paths.
st = mesh_data['scala-tympani']
pitch = .075
voxels = st.voxelized(pitch).fill()
occupancy = voxels.matrix
distance = ndimage.distance_transform_edt(occupancy) * pitch
skel = skeletonize(occupancy, method='lee')
indices = np.argwhere(skel)
world = voxels.indices_to_points(indices)
tree = cKDTree(indices)
pairs = tree.query_pairs(np.sqrt(3)+.01, output_type='ndarray')
weights = np.linalg.norm(world[pairs[:,0]]-world[pairs[:,1]], axis=1)
graph = csr_matrix((np.tile(weights, 2), (np.r_[pairs[:,0], pairs[:,1]], np.r_[pairs[:,1], pairs[:,0]])), shape=(len(indices),len(indices)))
_, components = connected_components(graph)
largest = np.argmax(np.bincount(components))
keep = np.flatnonzero(components == largest)
graph, indices, world = graph[keep][:,keep], indices[keep], world[keep]
first = int(np.argmax(dijkstra(graph, indices=0)))
dist, predecessor = dijkstra(graph, indices=first, return_predecessors=True)
last = int(np.argmax(dist))
path_ids = [last]
while path_ids[-1] != first: path_ids.append(int(predecessor[path_ids[-1]]))
path_ids = np.array(path_ids[::-1])
curve = world[path_ids]
clearance = distance[tuple(indices[path_ids].T)]
# Basal ST is wider than the apical end in this sample. Use a run of samples
# rather than either cap voxel to choose orientation.
if np.mean(clearance[:max(5,len(clearance)//8)]) < np.mean(clearance[-max(5,len(clearance)//8):]):
    curve, clearance = curve[::-1], clearance[::-1]
curve = ndimage.gaussian_filter1d(curve, 1.5, axis=0, mode='nearest')
arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(curve,axis=0),axis=1))]
sample_arc = np.linspace(0, arc[-1], 181)
curve = np.column_stack([PchipInterpolator(arc,curve[:,k])(sample_arc) for k in range(3)])
clearance = np.interp(sample_arc, arc, clearance)

# A rigid PCA orientation, with +Y toward the apical end, preserves all native
# mesh registration, distances, scale and handedness. +X points toward the base.
mean = st.vertices.mean(axis=0)
_, vectors = np.linalg.eigh(np.cov((st.vertices-mean).T))
y_axis = vectors[:,0]
if np.dot(curve[-1]-curve[0], y_axis) < 0: y_axis *= -1
x_axis = curve[0]-mean; x_axis -= y_axis*np.dot(x_axis,y_axis); x_axis /= np.linalg.norm(x_axis)
z_axis = np.cross(x_axis,y_axis); z_axis /= np.linalg.norm(z_axis)
x_axis = np.cross(y_axis,z_axis)
rotation = np.vstack([x_axis,y_axis,z_axis])
rotated_st = (st.vertices-mean) @ rotation.T
offset = (rotated_st.min(axis=0)+rotated_st.max(axis=0))/2
origin = mean + rotation.T @ offset
matrix = np.eye(4); matrix[:3,:3] = rotation; matrix[:3,3] = -rotation@origin
display_curve = (curve-origin)@rotation.T
if np.linalg.det(rotation) < .999: raise RuntimeError('Display frame lost handedness')
voxel_coordinates = trimesh.transform_points(curve, np.linalg.inv(voxels.transform))
clearance = ndimage.map_coordinates(distance, voxel_coordinates.T, order=1, mode='nearest')
voxel_clearance = clearance.copy()
clearance = exact_distances_to_mesh(st, curve)
segment_lengths = np.linalg.norm(np.diff(curve,axis=0),axis=1)
adjacent_length = np.maximum(np.r_[segment_lengths[0],segment_lengths],np.r_[segment_lengths,segment_lengths[-1]])
conservative_clearance = np.maximum(0, clearance-.5*adjacent_length-.00002)
tangents = np.gradient(display_curve, axis=0)
tangents /= np.linalg.norm(tangents, axis=1)[:,None]
# Estimate a visual modiolar axis from the innermost third of the registered
# spiral. This is explicitly a display-frame estimate, not a segmented modiolus.
axis = np.mean(display_curve[-60:],axis=0)
inward = np.column_stack([axis[0]-display_curve[:,0],np.zeros(len(curve)),axis[2]-display_curve[:,2]])
inward -= tangents*np.sum(inward*tangents,axis=1)[:,None]
inward /= np.linalg.norm(inward,axis=1)[:,None]
superior = np.cross(tangents,inward)
superior *= np.where(superior[:,1]>=0,1,-1)[:,None]

# Conservative simplification preserves native millimetres. Keep original
# checksums and native source bounds to make the derivation inspectable.
atlas_meshes=[]
targets={'scala-tympani':8500,'scala-vestibuli-vestibular-labyrinth':9500,'cochleovestibular-nerve':4500}
for key, original in mesh_data.items():
    simplified = original.simplify_quadric_decimation(face_count=targets[key], aggression=5)
    payload = (WORK/(key+'.ply')).read_bytes()
    entry={
        'id':key, 'sourceMember':MEMBERS[key], 'sourceMemberSha256':hashlib.sha256(payload).hexdigest(),
        'originalVertexCount':len(original.vertices), 'originalTriangleCount':len(original.faces),
        'sourceBoundsMm':np.round(original.bounds,6).tolist(),
        'positions':np.round(simplified.vertices.reshape(-1),5).tolist(),
        'indices':simplified.faces.reshape(-1).astype(int).tolist(),
    }
    atlas_meshes.append(entry)
    print(key, 'display triangles', len(simplified.faces), flush=True)

reference={
    'schema':'cochlear-anatomy-reference-v1','specimen':'OpenEar ZETA','units':'mm',
    'nativeFrame':'Original shared OpenEar ZETA PLY frame; axes retained, anatomical RAS/LPS interpretation not asserted',
    'displayFrame':'Right-handed millimetres; rigid PCA rotation; +Y toward apical ST endpoint',
    'nativeToDisplayRowMajor':np.round(matrix,9).reshape(-1).tolist(),
    'source':source,
    'centerline':{
        'method':'0.075 mm filled ST voxelization, Lee medial skeleton, longest weighted skeleton path, local Gaussian smoothing sigma=1.5 voxels, PCHIP resampling',
        'role':'Derived scala tympani lumen display registration; not organ-of-Corti place map, electrode insertion model or electrical field geometry',
        'voxelPitchMm':pitch,
        'lengthMm':float(sample_arc[-1]),
        'polylineChordLengthMm':float(np.linalg.norm(np.diff(np.round(curve,5),axis=0),axis=1).sum()),
        'arcSamplingNote':'The smoothed source-curve arc parameter is 22.247394 mm; the 181-point piecewise-linear display chord sum is 22.232031 mm (0.069% difference). No Cartesian scaling is applied.',
        'arcMm':np.round(sample_arc,5).tolist(),
        'referencePlaceMm':np.round(35*sample_arc/sample_arc[-1],5).tolist(),
        'referencePlaceMapping':'Normalized visual mapping only: referencePlaceMm = 35 * arcMm / centerline.lengthMm',
        'nativePoints':np.round(curve,5).tolist(),
        'displayPoints':np.round(display_curve,5).tolist(),
        'clearanceMm':np.round(clearance,5).tolist(),
        'clearanceMeaning':'Exact distance from each stored native centreline point to triangles of the original ST surface, rounded to 0.00001 mm. Sampled geometric clearance, not a surgical safety margin.',
        'voxelClearanceMm':np.round(voxel_clearance,5).tolist(),
        'conservativeClearanceMm':np.round(conservative_clearance,5).tolist(),
        'conservativeClearanceMeaning':'Sampled surface distance minus half the larger adjacent polyline-segment length and 0.00002 mm rounding allowance; a 1-Lipschitz lower bound for linearly interpolated centreline points. Does not model tissue deformation or surgical safety.',
        'tangents':np.round(tangents,7).tolist(),
        'inwardNormals':np.round(inward,7).tolist(),
        'superiorNormals':np.round(superior,7).tolist(),
        'frameMethod':'Tangents of derived curve; inward vectors toward centroid of innermost third projected normal to tangent; superior normal chosen toward +Y. Display estimate, not measured modiolar segmentation.',
        'estimatedModiolarAxisPoint':np.round(axis,5).tolist(),
        'entryFrame':{'position':np.round(display_curve[0],5).tolist(),'tangent':np.round(tangents[0],7).tolist(),'inward':np.round(inward[0],7).tolist(),'superior':np.round(superior[0],7).tolist()},
    },
    'limitations':[
        'One cadaveric specimen; no population or individual patient claim.',
        'Scala vestibuli source member includes vestibule and semicircular labyrinth; display can crop it around the ST while preserving coordinates.',
        'Membranes, organ of Corti, cells, modiolus and neural microstructure are procedural anatomical reconstructions, not segmented in this asset.',
        'Measured 3D anatomy does not alter the existing unrolled homogeneous electrical solver.',
    ],
}
atlas={'schema':'cochlear-anatomy-atlas-v1','units':'mm','coordinateFrame':'native','nativeToDisplayRowMajor':reference['nativeToDisplayRowMajor'],'source':source,'meshes':atlas_meshes}
(OUT/'openear-zeta-atlas.json').write_text(json.dumps(atlas,separators=(',',':'))+'\n')
(ROOT/'src/lib/cochlear/atlas-reference.json').write_text(json.dumps(reference,separators=(',',':'))+'\n')
(WORK/'reference-readable.json').write_text(json.dumps(reference,indent=2)+'\n')
np.savez(WORK/'derived.npz',centerline=curve,display_centerline=display_curve,arc=sample_arc,rotation=rotation,origin=origin,clearance=clearance)
print(json.dumps({'arcLengthMm':float(sample_arc[-1]),'displayBounds':np.round((st.vertices-origin)@rotation.T,3).min(axis=0).tolist()+np.round((st.vertices-origin)@rotation.T,3).max(axis=0).tolist(),'centerlineNativeEndpoints':[curve[0].tolist(),curve[-1].tolist()],'atlasBytes':(OUT/'openear-zeta-atlas.json').stat().st_size}),flush=True)
