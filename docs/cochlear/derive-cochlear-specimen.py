"""Build registered, cropped cochlear specimen surfaces from OpenEar ZETA.

Usage: python docs/cochlear/derive-cochlear-specimen.py /path/to/Segmentation.seg.nrrd
Input is 06_Segmentation/Segmentation.seg.nrrd from doi:10.5281/zenodo.1473724.
The output PLY vertices use the atlas display frame in millimetres.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path

import numpy as np
from scipy import ndimage
from scipy.spatial import cKDTree
import vtk
from vtk.util.numpy_support import numpy_to_vtk, vtk_to_numpy

ROOT = Path(__file__).resolve().parents[2]
PITCH = .125
SOURCE_HASH = '623e4a93c002200a322ffe8550dd4e8d9d2c7830085642c8685426056167f48a'
START = np.array([250, 185, 248])
END = np.array([362, 296, 366])
reference = json.loads((ROOT/'src/lib/cochlear/atlas-reference.json').read_text())
transform = np.array(reference['nativeToDisplayRowMajor']).reshape(4, 4)
line = reference['centerline']


def read_crop(path):
    if hashlib.sha256(path.read_bytes()).hexdigest() != SOURCE_HASH:
        raise ValueError('Expected the original ZETA segmentation member.')
    with path.open('rb') as stream:
        header = {}
        while (line_bytes := stream.readline().strip()):
            key, separator, value = line_bytes.decode().partition(':')
            if separator:
                header[key] = value.lstrip('= ')
        assert header['space'] == 'right-anterior-superior'
        assert header['sizes'] == '13 641 579 475'
        assert [header[f'Segment{i}_Name'] for i in (0, 1, 8)] == ['Scala Tympani', 'Scala Vestibuli', 'Bone']
        origin = np.fromstring(header['space origin'].strip('()'), sep=',') + START * PITCH
        slices = []
        with gzip.GzipFile(fileobj=stream) as volume:
            for k in range(END[2]):
                plane = np.frombuffer(volume.read(641*579*13), dtype=np.uint8).reshape(579, 641, 13)
                if k >= START[2]:
                    slices.append(plane[START[1]:END[1], START[0]:END[0], :][:, :, [0, 1, 8]])
    return np.stack(slices).astype(bool), origin


def largest_component(mask):
    labels, count = ndimage.label(mask, structure=np.ones((3, 3, 3)))
    if not count:
        raise ValueError('Empty specimen mask')
    return labels == (1 + np.argmax(np.bincount(labels.ravel())[1:]))


def surface(field, origin, budget, path):
    volume = vtk.vtkImageData()
    volume.SetDimensions(*field.shape[::-1])
    volume.SetOrigin(*origin)
    volume.SetSpacing(PITCH, PITCH, PITCH)
    volume.GetPointData().SetScalars(numpy_to_vtk(np.ascontiguousarray(field, dtype='float32').ravel(), deep=True))
    contour = vtk.vtkFlyingEdges3D()
    contour.SetInputData(volume)
    contour.SetValue(0, .5)
    contour.ComputeNormalsOff()
    contour.Update()
    decimate = vtk.vtkDecimatePro()
    decimate.SetInputConnection(contour.GetOutputPort())
    decimate.PreserveTopologyOn()
    decimate.SplittingOff()
    edges = vtk.vtkFeatureEdges()
    edges.FeatureEdgesOff()
    edges.ManifoldEdgesOff()
    edges.SetInputConnection(decimate.GetOutputPort())
    original_count = contour.GetOutput().GetNumberOfCells()
    while True:
        decimate.SetTargetReduction(max(0, 1-budget/original_count))
        edges.Update()
        if edges.GetOutput().GetNumberOfCells() == 0:
            break
        if budget >= original_count:
            raise ValueError(f'Open or nonmanifold source surface: {path.name}')
        # Protect narrow bony partitions or cut faces from edge collapses.
        budget = min(original_count, round(budget*1.18))
    mesh = decimate.GetOutput()
    points = vtk_to_numpy(mesh.GetPoints().GetData())
    if path.name.startswith('bone'):
        # Bake low-frequency ambient occlusion from nearby segmented surfaces.
        # The tint changes shading only. Values are stored as sRGB PLY colors.
        ijk = ((points-origin)/PITCH).T[::-1]
        gradient = np.stack(np.gradient(field), axis=0)
        normals = -np.column_stack([ndimage.map_coordinates(g, ijk, order=1) for g in gradient[::-1]])
        normals /= np.maximum(1e-8, np.linalg.norm(normals,axis=1,keepdims=True))
        right = np.cross(normals,[0.,0.,1.])
        vertical = np.linalg.norm(right,axis=1)<.15
        right[vertical] = np.cross(normals[vertical], [1.,0.,0.])
        right /= np.maximum(1e-8,np.linalg.norm(right,axis=1,keepdims=True))
        up = np.cross(normals,right)
        occlusion = np.zeros(len(points))
        for angle in np.arange(8)*np.pi/4:
            direction = .45*normals + .89*(np.cos(angle)*right + np.sin(angle)*up)
            for radius in (.40, .85, 1.30):
                probe = ijk + (radius/PITCH)*direction.T[::-1]
                occlusion += np.clip(ndimage.map_coordinates(field,probe,order=1),0,1)/24
        shade = np.clip(1-.62*occlusion, .66, 1)
        srgb = np.rint(255*(1.055*shade**(1/2.4)-.055)).astype('uint8')
        rgb = numpy_to_vtk(np.repeat(srgb[:, None],3,axis=1),deep=True)
        rgb.SetName('CavityShade')
        mesh.GetPointData().SetScalars(rgb)
    points[:] = points @ transform[:3,:3].T + transform[:3,3]
    points_vtk = mesh.GetPoints()
    points_vtk.Modified()
    mesh.Modified()
    writer = vtk.vtkPLYWriter()
    writer.SetFileName(str(path))
    writer.SetFileTypeToBinary()
    writer.SetArrayName('CavityShade')
    writer.SetInputData(mesh)
    assert writer.Write() == 1
    print(path.name, mesh.GetNumberOfPoints(), 'vertices,', mesh.GetNumberOfCells(), 'triangles')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('segmentation', type=Path)
    args = parser.parse_args()
    masks, origin = read_crop(args.segmentation)
    st, sv_all, bone = np.moveaxis(masks, -1, 0)
    points = np.asarray(line['nativePoints'])
    ijk = np.round((points-origin)/PITCH).astype(int).T[::-1]
    assert st[tuple(ijk)].all() and not bone[tuple(ijk)].any()
    assert not (st & bone).any()

    # The deposited SV label includes the vestibule and semicircular canals.
    # Limit the crop by ST proximity and the local basal-entry tangent plane.
    voxels = np.argwhere(sv_all)
    native = origin + voxels[:, ::-1]*PITCH
    display = native @ transform[:3, :3].T + transform[:3, 3]
    dist, nearest = cKDTree(line['displayPoints']).query(display)
    entry = line['entryFrame']
    before_entry = (display-entry['position']) @ entry['tangent']
    keep = (dist < np.maximum(1.30, 2*np.asarray(line['clearanceMm'])[nearest]+.72))
    keep &= (nearest > 24) | (before_entry > -.25)
    sv = np.zeros_like(st)
    sv[tuple(voxels[keep].T)] = True
    sv = largest_component(sv)

    # This virtual dissection follows the surrounding measured bone. Its
    # exterior is a display crop within 0.68 mm of the two lumen labels.
    around = ndimage.distance_transform_edt(~(st|sv), sampling=PITCH)
    # Round narrow gaps in the crop to retain the interscalar walls and
    # central bone wherever present in the source label.
    crop = ndimage.grey_closing(-around,size=(9,9,9))
    margin = ndimage.gaussian_filter(crop,.90)+.68
    capsule = largest_component(bone & (margin >= 0))
    assert not (capsule & (st|sv)).any()

    grid = np.indices(st.shape, dtype=np.float32)[::-1]
    # A plane through the estimated modiolar axis opens successive turns.
    normal = np.array([.12, 0, 1.])
    normal /= np.linalg.norm(normal)
    anchor = np.asarray(line['estimatedModiolarAxisPoint'])
    native_normal = transform[:3, :3].T @ normal
    distance = np.einsum('i,izyx->zyx', native_normal, grid)*PITCH + normal @ (transform[:3,:3] @ origin + transform[:3,3] - anchor)
    # Intersect continuous fields before marching cubes for a flat cut face.
    half_space = .5-distance/PITCH
    output = ROOT/'public/assets/cochlear/specimen'
    output.mkdir(parents=True, exist_ok=True)
    for label, mask, full_budget, section_budget in [
        ('bone', capsule, 14500, 10500), ('vestibuli', sv, 6700, 4000), ('tympani', st, 0, 4300)
    ]:
        field = ndimage.gaussian_filter(mask.astype(np.float32), sigma=.64)
        if label == 'bone':
            bone_field = ndimage.gaussian_filter(bone.astype(np.float32),sigma=.64)
            field = np.minimum(bone_field,.5+margin/PITCH)
            field[~ndimage.binary_dilation(capsule,iterations=2)] = 0
        if full_budget:
            surface(field, origin, full_budget, output/(label+'.ply'))
        surface(np.minimum(field, half_space), origin, section_budget, output/(label+'-section.ply'))


if __name__ == '__main__':
    main()
