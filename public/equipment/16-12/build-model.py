"""Original dry-reference sample ware kit. Plate footprint and center pattern cite SLAS and Thermo sample drawing; all other sizes designed, not measured. Blender -b -t 1 -P build-model.py. GLB metres +Y up +Z operator."""
import bpy,math,os
from mathutils import Vector
from pathlib import Path
bpy.ops.wm.read_factory_settings(use_empty=True)
out=Path(__file__).resolve().parent
s=bpy.context.scene;s.unit_settings.system='METRIC'
def m(n,rgb,metal=0):
 a=bpy.data.materials.new(n);a.diffuse_color=(*rgb,1);a.use_nodes=True;p=a.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=a.diffuse_color;p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.38;return a
def finish(n,mat):
 o=bpy.context.object;o.name=n;o.data.materials.append(mat);return o
def p(x):return tuple(v*.001 for v in x)
def b(n,pos,dim,mat,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p(pos));o=finish(n,mat);o.dimensions=p(dim);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  q=o.modifiers.new('Fillet','BEVEL');q.width=bevel*.001;q.segments=3;q=o.modifiers.new('Normals','WEIGHTED_NORMAL')
 return o
def cyl(n,pos,diam,depth,mat,axis='Y'):
 rot={'X':(0,math.pi/2,0),'Y':(math.pi/2,0,0),'Z':(0,0,0)}[axis]
 bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=diam*.0005,depth=depth*.001,location=p(pos),rotation=rot);return finish(n,mat)
def tube(n,pts,diam,mat):
 c=bpy.data.curves.new(n,'CURVE');c.dimensions='3D';c.resolution_u=8;c.bevel_resolution=2;c.bevel_depth=diam*.0005
 sp=c.splines.new('BEZIER');sp.bezier_points.add(len(pts)-1)
 for v,pt in zip(sp.bezier_points,pts):v.co=p(pt);v.handle_left_type=v.handle_right_type='AUTO'
 o=bpy.data.objects.new(n,c);s.collection.objects.link(o);c.materials.append(mat);return o
def text(n,label,x,y,z,size,mat,back=False):
 c=bpy.data.curves.new(n,'FONT');c.body=label;c.size=size*.001;c.align_x='CENTER';c.align_y='CENTER';c.resolution_u=2;o=bpy.data.objects.new(n,c);s.collection.objects.link(o);o.location=p((x,y,z));o.rotation_euler=(math.pi/2,0,math.pi if back else 0);c.materials.append(mat);return o
tray=m('Beige work surface',(.65,.67,.60));skirt=m('Milk polypropylene',(.82,.85,.79));rack=m('Harbor blue rack',(.092,.27,.36));holes=m('Deep rack pockets',(.048,.10,.13));glass=m('Clear translucent wall',(.67,.87,.87));glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.38
tube_mat=m('Translucent tube wall',(.70,.85,.85));tube_mat.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.62
green=m('Receiver lid',(.13,.44,.36));och=m('Orange cap',(.65,.20,.09));label=m('Paper label',(.81,.77,.58));printink=m('Silk print',(.09,.18,.20));sil=m('Cap silver',(.61,.65,.64),.60)
def vessel(n,rings,ma,N=32):
 vv=[];ff=[]
 for r,z in rings:
  for i in range(N):
   t=2*math.pi*i/N;vv.append(p((r*math.cos(t),r*math.sin(t),z)))
 for q in range(len(rings)-1):
  for i in range(N):ff.append((q*N+i,q*N+(i+1)%N,(q+1)*N+(i+1)%N,(q+1)*N+i))
 ff.extend([tuple(reversed(range(N))),tuple((len(rings)-1)*N+i for i in range(N))]);mesh=bpy.data.meshes.new(n);mesh.from_pydata(vv,[],ff);mesh.update();o=bpy.data.objects.new(n,mesh);s.collection.objects.link(o);mesh.materials.append(ma)
 for face in mesh.polygons:face.use_smooth=len(face.vertices)==4
 return o
def parent(obj,g,xyz):obj.parent=g;obj.location=p(xyz);return obj
def group(n,xyz):
 o=bpy.data.objects.new(n,None);s.collection.objects.link(o);o.location=p(xyz);return o
b('Indexing_work_surface',(0,0,-4),(400,275,8),tray,4)
for zz in [-55,13]:b('Transport_track_'+str(zz),(73,zz,-.2),(200,5,.3),sil,.1)
pose=group('Plate_rack_pose',(34,-20,0))
for x in [-65,65]:parent(b('Rack_side_'+str(x),(0,0,0),(5,94,14),rack,1),pose,(x,0,6.5))
for y in [-45,45]:parent(b('Rack_end_'+str(y),(0,0,0),(126,5,14),rack,1),pose,(0,y,6.5))
parent(b('Rack_floor',(0,0,0),(130,94,3),rack,1),pose,(0,0,1.5))
plate=group('Plate_96_container',(0,0,6));plate.parent=pose
parent(b('Plate_footprint_base',(0,0,0),(127.76,85.48,1.15),skirt,.25),plate,(0,0,.575))
for x in [-62.88,62.88]:parent(b('Plate_short_wall_'+str(x),(0,0,0),(2,81.48,8),skirt,.3),plate,(x,0,4.8))
for y in [-41.74,41.74]:parent(b('Plate_long_wall_'+str(y),(0,0,0),(127.76,2,8),skirt,.3),plate,(0,y,4.8))
cup=vessel('WELL_A1',[(3.42,0),(3.58,1),(3.62,8.71),(3.58,9),(3.10,9),(3.10,1.0),(2.65,.52),(.001,.52)],skirt,28)
for q in range(8):
 for k in range(12):
  n='WELL_'+chr(65+q)+str(k+1)
  o=cup if q==k==0 else cup.copy();o.name=n
  if o is not cup:s.collection.objects.link(o)
  parent(o,plate,(-49.5+9*k,-31.5+9*q,1.05))
for k in range(12):
 o=text('Column_'+str(k+1),str(k+1),0,0,0,2.6,printink);parent(o,plate,(-49.5+9*k,-39,8.9));o.rotation_euler=(0,0,0)
for k in range(8):
 o=text('Row_'+str(k),chr(65+k),0,0,0,3,printink);parent(o,plate,(-58,-31.5+9*k,8.9));o.rotation_euler=(0,0,0)
parent(b('96_plate_lid',(0,0,0),(127.76,85.48,3),glass,1.2),pose,(0,89,2.5))
# Empty inert vessels in dedicated rack and loose covered dish.
b('Tube_rack',(-125,-39,11),(80,56,22),rack,4)
for i,(x,y) in enumerate([(-145,-50),(-119,-50),(-145,-26),(-119,-26)]):
 cyl('Tube_rack_recess_'+str(i),(x,y,22.2),15,1,holes,'Z')
 o=vessel('Tube_'+str(i),[(4,1),(6,8),(6.1,41),(5.85,42),(5.1,42),(5.0,9),(.001,3)],tube_mat,24);o.location=p((x,y,22))
 cyl('Tube_cap_'+str(i),(x,y,65.6),14,6,green if i%2 else och,'Z')
b('Vial_design_label',(-94,-34,28),(1.5,16,18),label,1)
o=vessel('Glass_vial',[(6.7,0),(7.2,1),(7.6,26),(5.5,33),(5.4,36),(4.25,36),(4.2,32),(6.6,25),(6.3,2),(.001,1.8)],glass,32);o.location=p((-92,-38,2))
cyl('Vial_removable_cap',(-92,-38,40),13,7,sil,'Z')
o=vessel('Dry_clear_dish',[(30,0),(32,1),(32,7),(31,8),(30.3,8),(30,1.0),(.001,1.0)],glass,64);o.location=p((-107,70,1))
o=vessel('Dry_dish_lid',[(31.9,0),(33,1),(33,4),(32,5),(.001,5)],glass,64);o.location=p((-101,67,8))
for o in list(s.objects):
 if o.type in {'FONT','CURVE'}:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'sample-ware.glb'),export_format='GLB',export_apply=True)
