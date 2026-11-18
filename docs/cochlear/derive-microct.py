"""Build the F07 atlas from the unmodified F07.zip, doi:10.5281/zenodo.3355272.
Usage: python docs/cochlear/derive-microct.py /path/to/F07
Requires numpy, scipy, nibabel, VTK, Pillow.
"""
import json, sys
from pathlib import Path
import nibabel as nib
import numpy as np
from scipy import ndimage as nd
from PIL import Image
import vtk
from vtk.util.numpy_support import numpy_to_vtk, vtk_to_numpy

src = Path(sys.argv[1])
out = Path(__file__).resolve().parents[2]/'public/assets/cochlear/microct'
out.mkdir(exist_ok=True, parents=True)
desc = json.loads((src/'F07_DESC.json').read_text())
c = desc['COORD']
# Scene x points across the basal plane, y toward the apex, z toward the viewer.
basis = np.array([c['XAXIS'], c['ZAXIS'], -np.array(c['YAXIS'])])
u, _, v = np.linalg.svd(basis)
basis = u@v
origin = np.array(c['ORIGIN'])
pitch = .0607
start = np.array([-5.8,-3.4,-5.8])
dims = (192,144,192)
grid = np.indices(dims[::-1],dtype='float32')[::-1]
xyz = start[:,None,None,None]+pitch*grid
ras = np.einsum('ji,jabc->iabc',basis,xyz)+origin[:,None,None,None]

def sample(name,order):
    img = nib.load(src/'uCT'/('F07_uCT_'+name+'.nii'))
    inv = np.linalg.inv(img.affine)
    coords = np.einsum('ij,jabc->iabc',inv[:3,:3],ras)+inv[:3,3,None,None,None]
    return nd.map_coordinates(np.asarray(img.dataobj),coords,order=order,mode='constant',cval=0 if order==0 else -2000)

raw = sample('RAW',1).astype('float32')
mask = sample('LABELS',0)>0
distance = nd.distance_transform_edt(~mask)*pitch
# Keep bone within a dissected envelope, preserving actual low-density pores.
envelope = (1.0-distance)/pitch
density = (nd.gaussian_filter(raw,.55)-1050)/550
bone = np.minimum(envelope, density)
# Taper the virtual dissection away at the rectangular crop limits.
for i in range(3):
    bone = np.minimum(bone,np.minimum(grid[i]-1,dims[i]-2-grid[i]))
def mesh(field,name,budget):
    image = vtk.vtkImageData()
    image.SetDimensions(*field.shape[::-1]);image.SetOrigin(*start);image.SetSpacing(*[pitch]*3)
    image.GetPointData().SetScalars(numpy_to_vtk(np.ascontiguousarray(field,'float32').ravel(),deep=True))
    iso=vtk.vtkFlyingEdges3D();iso.SetInputData(image);iso.SetValue(0,0);iso.Update()
    dec=vtk.vtkQuadricDecimation();dec.SetInputConnection(iso.GetOutputPort());dec.SetTargetReduction(max(0,1-budget/iso.GetOutput().GetNumberOfCells()));dec.Update()
    geom=dec.GetOutput();points=vtk_to_numpy(geom.GetPoints().GetData())
    coords=((points-start)/pitch).T[::-1]
    intensity=nd.map_coordinates(raw,coords,order=1)
    tint=np.clip((intensity+300)/4400,0,1)
    color=(np.array([146,122,99])+tint[:,None]*[105,111,112]).astype('uint8')
    if name=='cast': color[:]=[123,181,178]
    rgb=numpy_to_vtk(color,deep=True);rgb.SetName('Scan');geom.GetPointData().SetScalars(rgb)
    w=vtk.vtkPLYWriter();w.SetInputData(geom);w.SetArrayName('Scan');w.SetFileTypeToBinary();w.SetFileName(str(out/(name+'.ply')));assert w.Write()
mesh(bone,'bone',54000)
mesh(np.minimum(bone,-xyz[2]/pitch),'section',57000)
field=nd.gaussian_filter(mask.astype('float32'),.65)-.5
for i in range(3): field=np.minimum(field,np.minimum(grid[i]-1,dims[i]-2-grid[i]))
mesh(field,'cast',36000)
# Aligned native-pitch sections. R holds intensity; G holds the segmentation edge.
tiles=Image.new('RGB',(192*8,144*8))
for i in range(63):
    z=round(-start[2]/pitch)+2*(i-31)
    val=np.uint8(255*np.clip((raw[z]+1400)/5400,0,1))
    edge=mask[z]^nd.binary_erosion(mask[z])
    tiles.paste(Image.fromarray(np.stack([val,255*edge.astype('uint8'),val],axis=2)[::-1]),(192*(i%8),144*(i//8)))
tiles.save(out/'sections.png',optimize=True)
