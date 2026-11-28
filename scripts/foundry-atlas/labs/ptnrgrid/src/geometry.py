"""Build an editable, true-scale representative *crop*, not an actual production layout.

Usage (Blender 4.x):
  blender -b --python src/geometry.py -- /absolute/output/directory

Coordinates are in meters. The nominal finished film in Tchoe et al. Fig. 1, plus
the reported 32 × 32 regular grid, nominal 30 µm site diameter and ~2 µm recess,
are geometric anchors. Window diameter is modeled equal to the contact diameter;
the exact etch profile is not known. No perfusion, tail, adhesive or trace masks.
"""
import bpy,math,json,sys
from pathlib import Path
from mathutils import Quaternion

dest=Path(sys.argv[sys.argv.index('--')+1]).resolve();dest.mkdir(exist_ok=True,parents=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene;sc.unit_settings.system='METRIC';sc.unit_settings.length_unit='MILLIMETERS'
def collection(name):
 c=bpy.data.collections.new(name);sc.collection.children.link(c);return c
device=collection('01 · Published geometry anchors / reconstructed crop')
carrier=collection('02 · Temporary glass carrier / not released film')
carrier.hide_render=True;carrier.hide_viewport=True
def mat(name,color,metal=0,rough=.6):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 return m
par=mat('Parylene C · opaque visual proxy',(.73,.43,.142))
pt=mat('Pt-rich contact face · no nanorod tessellation',(.71,.79,.73),.76,.44)
glass=mat('Glass · visual proxy',(.06,.43,.35))
def add(name,vs,fs,ma,group):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vs,[],fs);mesh.update()
 o=bpy.data.objects.new(name,mesh);group.objects.link(o);o.data.materials.append(ma);return o
n=32;s=16;p=.001;a=p/2;r=.000015;z=6.6e-6;d=z-2e-6
points=[(math.cos(2*math.pi*j/s),math.sin(2*math.pi*j/s)) for j in range(s)]
v=[];f=[]
for row in range(n):
 cv=[];cf=[]
 for col in range(n):
  cx=(col-(n-1)/2)*p;cy=((n-1)/2-row)*p
  start=len(v)
  for x,y in points:
   radius=a/max(abs(x),abs(y))
   v.append((cx+x*radius,cy+y*radius,z))
  v.extend((cx+r*x,cy+r*y,z) for x,y in points)
  v.extend((cx+r*x,cy+r*y,d) for x,y in points)
  for i in range(s):
   j=(i+1)%s
   f.append((start+i,start+j,start+s+j,start+s+i))
   f.append((start+s+i,start+s+j,start+2*s+j,start+2*s+i))
  t=len(cv);cv.append((cx,cy,d));cv.extend((cx+r*x,cy+r*y,d) for x,y in points)
  cf.extend((t,t+1+i,t+1+(i+1)%s) for i in range(s))
 o=add('Pt contact faces · R%02d'%(row+1),cv,cf,pt,device)
 o['count']=32;o['diameter_um']=30.;o['center_indexing']='row-first, nonnative'
 o['electrical_properties']='unknown; simulated wiring not in this file'
sq=[(-.016,-.016),(.016,-.016),(.016,.016),(-.016,.016)]
start=len(v)
v.extend((x,y,zz) for zz in [0,z] for x,y in sq)
f.append(tuple(start+i for i in [3,2,1,0]))
for i in range(4):j=(i+1)%4;f.append((start+i,start+j,start+4+j,start+4+i))
film=add('Parylene C · 32 mm square crop with 1024 schematic openings',v,f,par,device)
film['footprint_mm']='32 x 32 (centered illustrative crop; no outline recovery)'
film['finished_film_um']=6.6;film['recess_um']=2.;film['unmodeled']='Trace patterns; actual outline; perfusion holes; package; electrical mapping.'
q=[(-.0889,-.0889),(.0889,-.0889),(.0889,.0889),(-.0889,.0889)]
ob=add('7-inch temporary glass carrier',[(x,y,z1) for z1 in [-.001524,0] for x,y in q],
 [(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],glass,carrier)
ob['bounds_mm']='177.8 × 177.8 × 1.524 ; Tchoe Supplement §1.1'
sc['source']='Tchoe et al. Fig. 1C; Fig. 3B; Supplement §1.1'
sc['description']='Reconstructed recording patch only. Not a manufacturing layout, physical implant or electrical model.'
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   space=area.spaces.active;space.clip_start=1e-6;space.clip_end=30;space.region_3d.view_distance=.047
   # Face-on for seeing the full arranged patch. Center exactly on its origin.
   space.region_3d.view_location=(0,0,0);space.region_3d.view_rotation=Quaternion((1,0,0,0));space.region_3d.view_perspective='ORTHO';space.shading.color_type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(dest/'PtNRGrid-Square-Reference.blend'))
for o in device.objects:o.select_set(True)
bpy.context.view_layer.objects.active=film
bpy.ops.export_scene.gltf(filepath=str(dest/'PtNRGrid-Square-Reference.glb'),export_format='GLB',use_selection=True,export_extras=True)
checks={'objects':len(device.objects),'sites':sum(o.get('count',0) for o in device.objects),'unit':'meter','materials':len({o.data.materials[0].name for o in device.objects}),'filmBoundsM':list(film.dimensions)}
assert checks['sites']==1024 and checks['objects']==33 and list(film.dimensions)[:2]==[film.dimensions[0]]*2
(dest/'mesh-build.json').write_text(json.dumps(checks,indent=2)+'\n')
