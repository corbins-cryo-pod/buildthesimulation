"""Independent geometric checks against the original selected OpenEar PLYs."""
from pathlib import Path
import json
import numpy as np
from scipy.spatial import cKDTree
import trimesh
import argparse
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--root-dir', type=Path, default=Path(__file__).resolve().parents[2])
parser.add_argument('--cache-dir', type=Path, default=Path('/tmp/cochlear-anatomy-research'))
args = parser.parse_args()
ROOT, WORK = args.root_dir.resolve(), args.cache_dir.resolve()
atlas=json.loads((ROOT/'public/assets/cochlear/openear-zeta-atlas.json').read_text())
reference=json.loads((ROOT/'src/lib/cochlear/atlas-reference.json').read_text())
def distances_to_mesh(mesh,points):
    triangles=np.asarray(mesh.triangles)
    centers=triangles.mean(axis=1)
    tree=cKDTree(centers)
    max_radius=np.linalg.norm(triangles-centers[:,None],axis=2).max()
    values=[]
    for point in points:
        _,k=tree.query(point)
        candidate=trimesh.triangles.closest_point(triangles[k:k+1],point[None])[0]
        upper=np.linalg.norm(candidate-point)
        indices=tree.query_ball_point(point,upper+max_radius+1e-12)
        closest=trimesh.triangles.closest_point(triangles[indices],np.broadcast_to(point,(len(indices),3)))
        values.append(float(np.linalg.norm(closest-point,axis=1).min()))
    return np.array(values)
def stats(values):
    return {'meanMm':float(np.mean(values)),'rmsMm':float(np.sqrt(np.mean(values**2))),'p95Mm':float(np.quantile(values,.95)),'maximumSampledMm':float(np.max(values))}
def winding(mesh,points):
    triangles=np.asarray(mesh.triangles)
    result=[]
    for point in points:
        a,b,c=np.moveaxis(triangles-point,1,0)
        la,lb,lc=np.linalg.norm(a,axis=1),np.linalg.norm(b,axis=1),np.linalg.norm(c,axis=1)
        numerator=np.einsum('ij,ij->i',a,np.cross(b,c))
        denominator=la*lb*lc+np.einsum('ij,ij->i',a,b)*lc+np.einsum('ij,ij->i',b,c)*la+np.einsum('ij,ij->i',c,a)*lb
        result.append(float(np.sum(2*np.arctan2(numerator,denominator))/(4*np.pi)))
    return np.array(result)
result={'description':'Derivation checks for the OpenEar ZETA display asset, not clinical validation. Distances are exact point-to-triangle minima for an area-weighted random surface sample, not a full Hausdorff bound.','sampleSeed':24520,'surfaceSamplesPerDirection':1500,'meshes':[]}
for item in atlas['meshes']:
    original=trimesh.load_mesh(WORK/(item['id']+'.ply'),process=False)
    simplified=trimesh.Trimesh(vertices=np.array(item['positions']).reshape(-1,3),faces=np.array(item['indices']).reshape(-1,3),process=False)
    from_original,_=trimesh.sample.sample_surface(original,1500,seed=24520)
    from_simplified,_=trimesh.sample.sample_surface(simplified,1500,seed=24520)
    forward=distances_to_mesh(simplified,from_original)
    backward=distances_to_mesh(original,from_simplified)
    record={'id':item['id'],'originalTriangles':len(original.faces),'displayTriangles':len(simplified.faces),'originalWatertight':bool(original.is_watertight),'displayWatertight':bool(simplified.is_watertight),'originalBoundsMm':original.bounds.tolist(),'displayBoundsMm':simplified.bounds.tolist(),'maximumBoundDifferenceMm':float(np.max(np.abs(original.bounds-simplified.bounds))),'originalVolumeMm3':float(original.volume),'displayVolumeMm3':float(simplified.volume),'relativeVolumeChangePercent':float(100*(simplified.volume/original.volume-1)),'originalToDisplayDistance':stats(forward),'displayToOriginalDistance':stats(backward)}
    result['meshes'].append(record)
    print(json.dumps(record),flush=True)
    if item['id']=='scala-tympani':st=original
points=np.array(reference['centerline']['nativePoints'])
dense=np.vstack([points[i]+np.linspace(0,1,11,endpoint=False)[:,None]*(points[i+1]-points[i]) for i in range(len(points)-1)]+[points[-1:]])
w=winding(st,dense)
distance=distances_to_mesh(st,dense)
result['centerline']={'lengthMm':reference['centerline']['lengthMm'],'storedPoints':len(points),'testedPolylineSamples':len(dense),'allInsideOriginalST':bool(np.all(np.abs(w)>.5)),'minimumAbsoluteWindingNumber':float(np.min(np.abs(w))),'maximumAbsoluteWindingNumber':float(np.max(np.abs(w))),'minimumDistanceToOriginalSTSurfaceMm':float(distance.min()),'medianDistanceToOriginalSTSurfaceMm':float(np.median(distance)),'storedMinimumSurfaceClearanceMm':float(min(reference['centerline']['clearanceMm'])),'storedMinimumConservativeClearanceMm':float(min(reference['centerline']['conservativeClearanceMm'])),'storedMinimumVoxelClearanceMm':float(min(reference['centerline']['voxelClearanceMm'])),'method':'Signed solid-angle winding number on the original closed 15,996-triangle ST mesh; 11 uniformly spaced samples per one of the 180 centreline segments and final endpoint. Exact sampled point-to-triangle distance. Finite sampling does not prove all possible interpolants are contained.'}
m=np.array(reference['nativeToDisplayRowMajor']).reshape(4,4)
result['rigidTransform']={'rotationDeterminant':float(np.linalg.det(m[:3,:3])),'maximumOrthonormalResidual':float(np.abs(m[:3,:3]@m[:3,:3].T-np.eye(3)).max()),'maximumCenterlineTransformResidualMm':float(np.abs(points@m[:3,:3].T+m[:3,3]-np.array(reference['centerline']['displayPoints'])).max())}
(ROOT/'docs/cochlear/anatomy-validation.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'centerline':result['centerline'],'rigidTransform':result['rigidTransform']}),flush=True)
